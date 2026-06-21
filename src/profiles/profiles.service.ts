import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { User } from '../entities/user.entity';
import { Tip, TipStatus } from '../entities/tip.entity';
import { CreateProfileDto } from './dto/create-profile.dto';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Tip)
    private tipsRepository: Repository<Tip>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async getProfile(username: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { username, isActive: true },
      select: [
        'id',
        'username',
        'displayName',
        'bio',
        'avatarUrl',
        'walletAddress',
        'socialLinks',
        'createdAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('Profile not found');
    }

    return user;
  }

  async getProfileById(id: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { id, isActive: true },
      select: [
        'id',
        'username',
        'displayName',
        'bio',
        'avatarUrl',
        'walletAddress',
        'createdAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('Profile not found');
    }

    return user;
  }

  async getTippingInfo(username: string): Promise<Record<string, unknown>> {
    const user = await this.usersRepository.findOne({
      where: { username, isActive: true },
      select: [
        'id',
        'username',
        'displayName',
        'bio',
        'avatarUrl',
        'walletAddress',
        'createdAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('Profile not found');
    }

    // getRawOne() returns any from TypeORM; disable type checking for query builder results
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
    // Get total tips received
    const statsResult = await this.tipsRepository
      .createQueryBuilder('tip')
      .select('COALESCE(SUM(tip.amount), 0)', 'totalAmount')
      .addSelect('COUNT(tip.id)', 'totalTips')
      .where('tip.receiverWallet = :wallet', { wallet: user.walletAddress })
      .andWhere('tip.status = :status', { status: TipStatus.COMPLETED })
      .getRawOne();

    // Get top supporter
    const topSupporter = await this.tipsRepository
      .createQueryBuilder('tip')
      .select('tip.senderWallet', 'walletAddress')
      .addSelect('SUM(tip.amount)', 'totalAmount')
      .addSelect('COUNT(tip.id)', 'tipCount')
      .where('tip.receiverWallet = :wallet', { wallet: user.walletAddress })
      .andWhere('tip.status = :status', { status: TipStatus.COMPLETED })
      .andWhere('tip.senderWallet IS NOT NULL')
      .andWhere("tip.senderWallet != ''")
      .groupBy('tip.senderWallet')
      .orderBy('SUM(tip.amount)', 'DESC')
      .limit(1)
      .getRawOne();

    // Get recent tip messages (last 5, anonymous)
    const recentTips = await this.tipsRepository.find({
      where: {
        receiverWallet: user.walletAddress,
        status: TipStatus.COMPLETED,
      },
      select: ['amount', 'asset', 'message', 'createdAt', 'senderWallet'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      displayName: user.displayName,
      username: user.username,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      walletAddress: user.walletAddress || null,
      stats: {
        totalTipsReceived: parseInt(statsResult?.totalTips || '0', 10),
        totalAmountReceived: parseFloat(statsResult?.totalAmount || '0'),
      },
      topSupporter: topSupporter
        ? {
            walletAddress: topSupporter.walletAddress,
            totalAmount: parseFloat(topSupporter.totalAmount || '0'),
            tipCount: parseInt(topSupporter.tipCount || '0', 10),
          }
        : null,
      recentMessages: recentTips.map((tip) => ({
        amount: tip.amount,
        asset: tip.asset,
        message: tip.message || null,
        createdAt: tip.createdAt,
      })),
    };
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
  }

  async updateProfile(
    userId: string,
    updateDto: CreateProfileDto,
  ): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateDto.displayName) {
      user.displayName = updateDto.displayName;
    }
    if (updateDto.bio !== undefined) {
      user.bio = updateDto.bio;
    }
    if (updateDto.avatarUrl !== undefined) {
      user.avatarUrl = updateDto.avatarUrl;
    }

    const updatedUser = await this.usersRepository.save(user);

    // Invalidate cache for this user's profile
    await this.invalidateProfileCache(user.username);

    return updatedUser;
  }

  async updateWalletAddress(
    userId: string,
    walletAddress: string,
  ): Promise<User> {
    const existing = await this.usersRepository.findOne({
      where: { walletAddress },
    });
    if (existing && existing.id !== userId) {
      throw new ConflictException(
        'Wallet address already linked to another account',
      );
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.walletAddress = walletAddress;
    return this.usersRepository.save(user);
  }

  async uploadAvatar(
    userId: string,
    file: {
      mimetype: string;
      size: number;
      originalname: string;
      buffer: Buffer;
    },
  ): Promise<string> {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Allowed types: JPEG, PNG, WEBP`,
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete old avatar if it exists
    if (user.avatarUrl) {
      const oldPath = path.join(
        __dirname,
        '..',
        '..',
        '..',
        'uploads',
        'avatars',
        path.basename(user.avatarUrl),
      );
      try {
        fs.unlinkSync(oldPath);
      } catch {
        // File may not exist, ignore
      }
    }

    // Save new avatar
    const ext = file.originalname.split('.').pop() || 'png';
    const filename = `${crypto.randomUUID()}.${ext}`;
    const uploadDir = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'uploads',
      'avatars',
    );

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    fs.writeFileSync(path.join(uploadDir, filename), file.buffer);

    const avatarUrl = `/uploads/avatars/${filename}`;
    user.avatarUrl = avatarUrl;
    await this.usersRepository.save(user);

    // Invalidate cache for this user's profile
    await this.invalidateProfileCache(user.username);

    return avatarUrl;
  }

  async updateSocialLinks(
    userId: string,
    socialLinks: {
      twitter?: string;
      github?: string;
      youtube?: string;
      website?: string;
    },
  ): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate URLs
    const urlPattern = /^https:\/\//;
    const platforms = ['twitter', 'github', 'youtube', 'website'] as const;
    for (const platform of platforms) {
      const link = socialLinks[platform];
      if (link && !urlPattern.test(link)) {
        throw new BadRequestException(
          `Invalid ${platform} URL: must start with https://`,
        );
      }
    }

    user.socialLinks = socialLinks;
    return this.usersRepository.save(user);
  }

  async searchProfiles(query: string): Promise<User[]> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.isActive = :active', { active: true })
      .andWhere(
        '(user.username ILIKE :query OR user.displayName ILIKE :query)',
        { query: `%${query}%` },
      )
      .select([
        'user.id',
        'user.username',
        'user.displayName',
        'user.bio',
        'user.avatarUrl',
      ])
      .take(20)
      .getMany();
  }

  /**
   * Invalidate cache for a specific user's profile
   * This clears cached data for:
   * - Public profile endpoint
   * - Tipping info endpoint
   * - Search results (cleared by pattern)
   */
  private async invalidateProfileCache(username: string): Promise<void> {
    try {
      // Invalidate specific profile cache keys
      const profileKey = `GET /v1/profiles/${username}`;
      const tippingInfoKey = `GET /v1/profiles/${username}/tipping-info`;

      await this.cacheManager.del(profileKey);
      await this.cacheManager.del(tippingInfoKey);

      // Note: Search results cache will expire naturally based on TTL
      // For more aggressive invalidation, you could implement cache store iteration
    } catch (error) {
      // Log error but don't fail the operation if cache invalidation fails
      console.error(`Failed to invalidate cache for user ${username}:`, error);
    }
  }

  async getAnalytics(
    userId: string,
    period: string = '30d',
    asset?: string,
  ): Promise<{
    summary: {
      totalTipsReceived: number;
      totalAmountReceived: number;
      averageTipAmount: number;
      largestTipAmount: number;
    };
    byAsset: Array<{
      asset: string;
      totalAmount: number;
      tipCount: number;
    }>;
    timeSeries: Array<{
      date: string;
      count: number;
      totalAmount: number;
      asset: string;
    }>;
    topSupporters: Array<{
      walletAddress: string;
      totalAmount: number;
      tipCount: number;
      lastTipAt: Date | null;
    }>;
    period: string;
    generatedAt: string;
  }> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'walletAddress'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Calculate date range based on period
    let startDate: Date | undefined;
    if (period !== 'all') {
      const days = parseInt(period.replace('d', ''), 10);
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    // Summary: total tips, total amount, average, largest
    // TypeORM getRawOne/getRawMany return any from query builder
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const summaryResult = await this.tipsRepository
      .createQueryBuilder('tip')
      .select('COUNT(tip.id)', 'totalTips')
      .addSelect('COALESCE(SUM(tip.amount), 0)', 'totalAmount')
      .addSelect('COALESCE(AVG(tip.amount), 0)', 'averageAmount')
      .addSelect('COALESCE(MAX(tip.amount), 0)', 'largestAmount')
      .where('tip.receiverWallet = :wallet', {
        wallet: user.walletAddress,
      })
      .andWhere('tip.status = :status', { status: TipStatus.COMPLETED })
      .andWhere(
        startDate ? 'tip.createdAt >= :startDate' : '1=1',
        startDate ? { startDate } : {},
      )
      .andWhere(
        asset ? 'tip.asset = :asset' : '1=1',
        asset ? { asset: asset.toUpperCase() } : {},
      )
      .getRawOne();

    // By asset breakdown

    const byAssetResult = await this.tipsRepository
      .createQueryBuilder('tip')
      .select('tip.asset', 'asset')
      .addSelect('COALESCE(SUM(tip.amount), 0)', 'totalAmount')
      .addSelect('COUNT(tip.id)', 'tipCount')
      .where('tip.receiverWallet = :wallet', {
        wallet: user.walletAddress,
      })
      .andWhere('tip.status = :status', { status: TipStatus.COMPLETED })
      .andWhere(
        startDate ? 'tip.createdAt >= :startDate' : '1=1',
        startDate ? { startDate } : {},
      )
      .groupBy('tip.asset')
      .getRawMany();

    // Time series: daily breakdown for the period

    const timeSeriesResult = await this.tipsRepository
      .createQueryBuilder('tip')
      .select("DATE_TRUNC('day', tip.createdAt)", 'date')
      .addSelect('COUNT(tip.id)', 'count')
      .addSelect('COALESCE(SUM(tip.amount), 0)', 'totalAmount')
      .addSelect('tip.asset', 'asset')
      .where('tip.receiverWallet = :wallet', {
        wallet: user.walletAddress,
      })
      .andWhere('tip.status = :status', { status: TipStatus.COMPLETED })
      .andWhere(
        startDate ? 'tip.createdAt >= :startDate' : '1=1',
        startDate ? { startDate } : {},
      )
      .andWhere(
        asset ? 'tip.asset = :asset' : '1=1',
        asset ? { asset: asset.toUpperCase() } : {},
      )
      .groupBy("DATE_TRUNC('day', tip.createdAt)")
      .addGroupBy('tip.asset')
      .orderBy("DATE_TRUNC('day', tip.createdAt)", 'ASC')
      .getRawMany();

    // Top 5 supporters

    const topSupportersResult = await this.tipsRepository
      .createQueryBuilder('tip')
      .select('tip.senderWallet', 'walletAddress')
      .addSelect('COALESCE(SUM(tip.amount), 0)', 'totalAmount')
      .addSelect('COUNT(tip.id)', 'tipCount')
      .addSelect('MAX(tip.createdAt)', 'lastTipAt')
      .where('tip.receiverWallet = :wallet', {
        wallet: user.walletAddress,
      })
      .andWhere('tip.status = :status', { status: TipStatus.COMPLETED })
      .andWhere('tip.senderWallet IS NOT NULL')
      .andWhere("tip.senderWallet != ''")
      .andWhere(
        startDate ? 'tip.createdAt >= :startDate' : '1=1',
        startDate ? { startDate } : {},
      )
      .andWhere(
        asset ? 'tip.asset = :asset' : '1=1',
        asset ? { asset: asset.toUpperCase() } : {},
      )
      .groupBy('tip.senderWallet')
      .orderBy('SUM(tip.amount)', 'DESC')
      .limit(5)
      .getRawMany();

    // Safely extract raw query results with type assertions
    // TypeORM getRawOne/getRawMany return any; values need explicit string conversion
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-base-to-string */
    const summary = summaryResult || {};
    const byAsset: Array<{
      asset: string;
      totalAmount: number;
      tipCount: number;
    }> = (byAssetResult || []).map((row: Record<string, unknown>) => ({
      asset: String(row.asset || 'XLM'),
      totalAmount: parseFloat(String(row.totalAmount || '0')),
      tipCount: parseInt(String(row.tipCount || '0'), 10),
    }));

    const timeSeries: Array<{
      date: string;
      count: number;
      totalAmount: number;
      asset: string;
    }> = (timeSeriesResult || []).map((row: Record<string, unknown>) => ({
      date: String(row.date || ''),
      count: parseInt(String(row.count || '0'), 10),
      totalAmount: parseFloat(String(row.totalAmount || '0')),
      asset: String(row.asset || 'XLM'),
    }));

    const topSupporters: Array<{
      walletAddress: string;
      totalAmount: number;
      tipCount: number;
      lastTipAt: Date | null;
    }> = (topSupportersResult || []).map((row: Record<string, unknown>) => ({
      walletAddress: String(row.walletAddress || ''),
      totalAmount: parseFloat(String(row.totalAmount || '0')),
      tipCount: parseInt(String(row.tipCount || '0'), 10),
      lastTipAt: row.lastTipAt ? new Date(String(row.lastTipAt)) : null,
    }));

    const totalTips = parseInt(String(summary.totalTips || '0'), 10);
    const totalAmount = parseFloat(String(summary.totalAmount || '0'));
    const averageAmount = parseFloat(String(summary.averageAmount || '0'));
    const largestAmount = parseFloat(String(summary.largestAmount || '0'));
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-base-to-string */

    return {
      summary: {
        totalTipsReceived: totalTips,
        totalAmountReceived: totalAmount,
        averageTipAmount: Math.round(averageAmount * 10000000) / 10000000,
        largestTipAmount: largestAmount,
      },
      byAsset,
      timeSeries,
      topSupporters,
      period,
      generatedAt: new Date().toISOString(),
    };
  }
}
