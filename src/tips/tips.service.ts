import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Tip, TipStatus, TipAsset } from '../entities/tip.entity';
import { User } from '../entities/user.entity';
import { CreateTipDto } from './dto/create-tip.dto';
import { createClient, RedisClientType } from 'redis';
import {
  StellarService,
  ContractTipVerificationResult,
} from '../stellar/stellar.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface OnChainTipVerificationResult {
  tipId: string;
  tipIndex: number;
  horizon: {
    verified: boolean;
    from?: string;
    to?: string;
    amount?: number;
    asset?: string;
    timestamp?: string;
  };
  contract: ContractTipVerificationResult;
  matches: boolean;
}

export interface TipFilterOptions {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  asset?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

const ALLOWED_SORT_BY = ['createdAt', 'amount'];
const ALLOWED_SORT_ORDER = ['ASC', 'DESC'];

@Injectable()
export class TipsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TipsService.name);
  private readonly usdcIssuer: string | null;
  private readonly verificationCacheTtlMs = 60_000;
  private redisClient: RedisClientType | null = null;
  private readonly localVerificationCache = new Map<
    string,
    { expiresAt: number; payload: string }
  >();

  constructor(
    @InjectRepository(Tip)
    private tipsRepository: Repository<Tip>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private configService: ConfigService,
    private stellarService: StellarService,
    private notificationsService: NotificationsService,
  ) {
    this.usdcIssuer = this.configService.get<string>('USDC_ISSUER') || null;
  }

  async onModuleInit(): Promise<void> {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.logger.warn(
        'REDIS_URL is not configured; using in-memory verification cache',
      );
      return;
    }

    try {
      this.redisClient = createClient({ url: redisUrl });
      this.redisClient.on('error', (error) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Redis cache error: ${message}`);
      });
      await this.redisClient.connect();
      this.logger.log(
        'Redis cache initialized for on-chain verification results',
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Unable to connect to Redis cache: ${message}`);
      this.redisClient = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redisClient?.isOpen) {
      await this.redisClient.disconnect();
    }
  }

  private getVerificationCacheKey(tipId: string): string {
    return `tips:verify-onchain:${tipId}`;
  }

  private async readVerificationCache(
    tipId: string,
  ): Promise<OnChainTipVerificationResult | null> {
    const cacheKey = this.getVerificationCacheKey(tipId);

    if (this.redisClient?.isOpen) {
      const cached = await this.redisClient.get(cacheKey);
      return cached
        ? (JSON.parse(cached) as OnChainTipVerificationResult)
        : null;
    }

    const entry = this.localVerificationCache.get(cacheKey);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.localVerificationCache.delete(cacheKey);
      return null;
    }

    return JSON.parse(entry.payload) as OnChainTipVerificationResult;
  }

  private async writeVerificationCache(
    tipId: string,
    value: OnChainTipVerificationResult,
  ): Promise<void> {
    const cacheKey = this.getVerificationCacheKey(tipId);
    const payload = JSON.stringify(value);

    if (this.redisClient?.isOpen) {
      await this.redisClient.setEx(cacheKey, 60, payload);
      return;
    }

    this.localVerificationCache.set(cacheKey, {
      expiresAt: Date.now() + this.verificationCacheTtlMs,
      payload,
    });
  }

  private async getCreatorTipIndex(tip: Tip): Promise<number> {
    const creatorTips = await this.tipsRepository.find({
      where: { creatorId: tip.creatorId },
      order: { createdAt: 'ASC', id: 'ASC' },
    });

    return creatorTips.findIndex((candidate) => candidate.id === tip.id);
  }

  private buildFilterQuery(filterOptions: TipFilterOptions): {
    where: Record<string, unknown>;
    order: Record<string, string>;
    skip: number;
    take: number;
  } {
    const page = filterOptions.page || 1;
    const limit = filterOptions.limit || 20;

    if (page < 1) throw new BadRequestException('Page must be greater than 0');
    if (limit < 1 || limit > 100)
      throw new BadRequestException('Limit must be between 1 and 100');

    const sortBy = filterOptions.sortBy || 'createdAt';
    const sortOrder = filterOptions.sortOrder || 'DESC';

    if (!ALLOWED_SORT_BY.includes(sortBy)) {
      throw new BadRequestException(
        `Invalid sortBy: ${sortBy}. Allowed values: ${ALLOWED_SORT_BY.join(', ')}`,
      );
    }
    if (!ALLOWED_SORT_ORDER.includes(sortOrder)) {
      throw new BadRequestException(
        `Invalid sortOrder: ${sortOrder}. Allowed values: ${ALLOWED_SORT_ORDER.join(', ')}`,
      );
    }

    const query: Record<string, unknown> = {};

    // Date range filters
    if (filterOptions.startDate && filterOptions.endDate) {
      const startDate = new Date(filterOptions.startDate);
      const endDate = new Date(filterOptions.endDate);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid date format. Use ISO 8601.');
      }
      query.createdAt = Between(startDate, endDate);
    } else if (filterOptions.startDate) {
      const startDate = new Date(filterOptions.startDate);
      if (isNaN(startDate.getTime())) {
        throw new BadRequestException(
          'Invalid startDate format. Use ISO 8601.',
        );
      }
      query.createdAt = MoreThanOrEqual(startDate);
    } else if (filterOptions.endDate) {
      const endDate = new Date(filterOptions.endDate);
      if (isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid endDate format. Use ISO 8601.');
      }
      query.createdAt = LessThanOrEqual(endDate);
    }

    // Asset filter
    if (filterOptions.asset) {
      const normalizedAsset = filterOptions.asset.toUpperCase();
      if (!Object.values(TipAsset).includes(normalizedAsset as TipAsset)) {
        throw new BadRequestException(
          `Invalid asset: ${filterOptions.asset}. Supported: ${Object.values(TipAsset).join(', ')}`,
        );
      }
      query.asset = normalizedAsset;
    }

    // Amount range filters
    if (
      filterOptions.minAmount !== undefined &&
      filterOptions.maxAmount !== undefined
    ) {
      if (filterOptions.minAmount < 0 || filterOptions.maxAmount < 0) {
        throw new BadRequestException(
          'Amount filters must be greater than or equal to 0',
        );
      }
      query.amount = Between(filterOptions.minAmount, filterOptions.maxAmount);
    } else if (filterOptions.minAmount !== undefined) {
      if (filterOptions.minAmount < 0) {
        throw new BadRequestException(
          'minAmount must be greater than or equal to 0',
        );
      }
      query.amount = MoreThanOrEqual(filterOptions.minAmount);
    } else if (filterOptions.maxAmount !== undefined) {
      if (filterOptions.maxAmount < 0) {
        throw new BadRequestException(
          'maxAmount must be greater than or equal to 0',
        );
      }
      query.amount = LessThanOrEqual(filterOptions.maxAmount);
    }

    const order: Record<string, string> = {};
    order[sortBy] = sortOrder;

    return {
      where: query,
      order,
      skip: (page - 1) * limit,
      take: limit,
    };
  }

  private formatPaginatedResult(
    tips: Tip[],
    total: number,
    page: number,
    limit: number,
  ): {
    data: Tip[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  } {
    const totalPages = Math.ceil(total / limit);
    return {
      data: tips,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  async createTip(
    createTipDto: CreateTipDto,
    supporterId?: string,
  ): Promise<Tip> {
    const {
      receiverWallet,
      senderWallet,
      amount,
      message,
      asset,
      assetIssuer,
      transactionHash,
    } = createTipDto;

    const creator = await this.usersRepository.findOne({
      where: { walletAddress: receiverWallet },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found with this wallet address');
    }

    if (amount <= 0) {
      throw new BadRequestException('Tip amount must be greater than 0');
    }

    const tipAsset = (asset as TipAsset) || TipAsset.XLM;

    // Validate and process USDC asset
    if (tipAsset === TipAsset.USDC) {
      if (!this.usdcIssuer) {
        throw new BadRequestException(
          'USDC tipping is not configured. Please set the USDC_ISSUER environment variable.',
        );
      }
    }

    // Validate unsupported asset types
    if (!Object.values(TipAsset).includes(tipAsset)) {
      throw new BadRequestException(
        `Unsupported asset type: ${asset}. Supported asset types are: ${Object.values(TipAsset).join(', ')}`,
      );
    }

    const tip = new Tip();
    tip.creator = creator;
    tip.supporterId = supporterId || null;
    tip.senderWallet = senderWallet || '';
    tip.receiverWallet = receiverWallet;
    tip.amount = amount;
    tip.asset = tipAsset;
    tip.assetIssuer =
      tipAsset === TipAsset.USDC ? assetIssuer || this.usdcIssuer : null;
    tip.message = message || '';
    tip.transactionHash = transactionHash || '';
    tip.status = transactionHash ? TipStatus.COMPLETED : TipStatus.PENDING;

    return this.tipsRepository.save(tip);
  }

  async getTipById(id: string): Promise<Tip> {
    const tip = await this.tipsRepository.findOne({
      where: { id },
      relations: ['creator', 'supporter'],
    });

    if (!tip) {
      throw new NotFoundException('Tip not found');
    }

    return tip;
  }

  async getTipsByCreator(
    creatorId: string,
    filterOptions: TipFilterOptions = {},
  ): Promise<{
    data: Tip[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }> {
    const baseQuery = { creatorId };
    const { where, order, skip, take } = this.buildFilterQuery(filterOptions);

    const finalWhere = { ...baseQuery, ...where };

    // TypeORM findAndCount accepts broad where shapes
    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
    const [tips, total] = await this.tipsRepository.findAndCount({
      where: finalWhere as any,
      relations: ['supporter'],
      order: order,
      skip,
      take,
    });
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */

    return this.formatPaginatedResult(
      tips,
      total,
      filterOptions.page || 1,
      filterOptions.limit || 20,
    );
  }

  async getTipsBySupporter(
    supporterId: string,
    filterOptions: TipFilterOptions = {},
  ): Promise<{
    data: Tip[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }> {
    const { where, order, skip, take } = this.buildFilterQuery(filterOptions);
    const finalWhere = { supporterId, ...where };

    // TypeORM findAndCount accepts broad where shapes
    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
    const [tips, total] = await this.tipsRepository.findAndCount({
      where: finalWhere as any,
      relations: ['creator'],
      order: order,
      skip,
      take,
    });
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */

    return this.formatPaginatedResult(
      tips,
      total,
      filterOptions.page || 1,
      filterOptions.limit || 20,
    );
  }

  async getTipsByWallet(
    walletAddress: string,
    filterOptions: TipFilterOptions = {},
  ): Promise<{
    data: Tip[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }> {
    const {
      where: filterWhere,
      order,
      skip,
      take,
    } = this.buildFilterQuery(filterOptions);

    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
    const where: any[] = [
      {
        receiverWallet: walletAddress,
        ...filterWhere,
      },
      {
        senderWallet: walletAddress,
        ...filterWhere,
      },
    ];

    const [tips, total] = await this.tipsRepository.findAndCount({
      where: where as any,
      relations: ['creator', 'supporter'],
      order: order,
      skip,
      take,
    });
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */

    return this.formatPaginatedResult(
      tips,
      total,
      filterOptions.page || 1,
      filterOptions.limit || 20,
    );
  }

  async confirmTip(id: string, transactionHash: string): Promise<Tip> {
    const tip = await this.tipsRepository.findOne({ where: { id } });
    if (!tip) {
      throw new NotFoundException('Tip not found');
    }

    tip.transactionHash = transactionHash;
    tip.status = TipStatus.COMPLETED;
    return this.tipsRepository.save(tip);
  }

  async verifyTipOnChain(id: string): Promise<OnChainTipVerificationResult> {
    const cached = await this.readVerificationCache(id);
    if (cached) {
      return cached;
    }

    const tip = await this.tipsRepository.findOne({
      where: { id },
      relations: ['creator'],
    });

    if (!tip) {
      throw new NotFoundException('Tip not found');
    }

    const tipIndex = await this.getCreatorTipIndex(tip);
    if (tipIndex < 0) {
      throw new NotFoundException('Tip not found in creator history');
    }

    const creatorAddress = tip.creator?.walletAddress || tip.receiverWallet;
    const horizon = tip.transactionHash
      ? await this.stellarService.verifyPayment(tip.transactionHash)
      : { verified: false };
    const contract = await this.stellarService.verifyTipOnContract(
      creatorAddress,
      tipIndex,
    );

    const timestampMatch =
      !horizon.timestamp || !contract.timestamp
        ? true
        : new Date(horizon.timestamp).toISOString() ===
          new Date(contract.timestamp).toISOString();

    const matches =
      Boolean(horizon.verified) &&
      contract.exists &&
      horizon.from === tip.senderWallet &&
      horizon.to === tip.receiverWallet &&
      Number(horizon.amount ?? 0) === Number(tip.amount) &&
      timestampMatch &&
      contract.from === tip.senderWallet &&
      contract.to === tip.receiverWallet &&
      Number(contract.amount) === Number(tip.amount);

    const verification: OnChainTipVerificationResult = {
      tipId: tip.id,
      tipIndex,
      horizon,
      contract,
      matches,
    };

    if (!matches) {
      await this.notificationsService.notifyDiscrepancyDetected(tip.creatorId, {
        tipId: tip.id,
        tipIndex,
        creatorAddress,
        senderWallet: tip.senderWallet,
        receiverWallet: tip.receiverWallet,
        amount: tip.amount,
        asset: tip.asset,
        transactionHash: tip.transactionHash,
        horizon,
        contract,
      });
    }

    await this.writeVerificationCache(id, verification);
    return verification;
  }

  async getTipStats(creatorId: string): Promise<
    Array<{
      totalAmount: string;
      totalTips: string;
      asset: string;
      assetIssuer: string | null;
    }>
  > {
    // getRawMany() returns any from TypeORM; mapped to typed array

    const result: Array<Record<string, unknown>> = await this.tipsRepository
      .createQueryBuilder('tip')
      .select('COALESCE(SUM(tip.amount), 0)', 'totalAmount')
      .addSelect('COUNT(tip.id)', 'totalTips')
      .addSelect('tip.asset', 'asset')
      .addSelect('tip.assetIssuer', 'assetIssuer')
      .where('tip.creatorId = :creatorId', { creatorId })
      .andWhere('tip.status = :status', { status: TipStatus.COMPLETED })
      .groupBy('tip.asset')
      .addGroupBy('tip.assetIssuer')
      .getRawMany();

    return result.map((row) => {
      /* eslint-disable @typescript-eslint/no-base-to-string */
      const mapped = {
        totalAmount: String(row.totalAmount ?? '0'),
        totalTips: String(row.totalTips ?? '0'),
        asset: String(row.asset ?? 'XLM'),
        assetIssuer: row.assetIssuer ? String(row.assetIssuer) : null,
      };
      /* eslint-enable @typescript-eslint/no-base-to-string */
      return mapped;
    });
  }
}
