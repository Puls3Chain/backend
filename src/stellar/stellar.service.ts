import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { contract, Horizon, Networks, rpc } from '@stellar/stellar-sdk';

export interface ContractTipVerificationResult {
  exists: boolean;
  from: string;
  to: string;
  amount: number;
  timestamp: string | null;
}

type ContractClient = Awaited<ReturnType<typeof contract.Client.from>>;

@Injectable()
export class StellarService implements OnModuleInit {
  private readonly logger = new Logger(StellarService.name);
  private server: Horizon.Server;
  private sorobanServer: rpc.Server;
  private contractClient: ContractClient | null = null;
  private network: string;
  private networkPassphrase: string;
  private sorobanRpcUrl: string;
  private contractId: string | null;

  constructor(private configService: ConfigService) {}

  onModuleInit(): void {
    const serverUrl =
      this.configService.get<string>('STELLAR_NODE_URL') ||
      'https://horizon-testnet.stellar.org';
    this.sorobanRpcUrl =
      this.configService.get<string>('STELLAR_SOROBAN_URL') ||
      'https://soroban-testnet.stellar.org';
    this.network =
      this.configService.get<string>('STELLAR_NETWORK') || 'TESTNET';
    this.networkPassphrase =
      this.network === 'PUBLIC' ? Networks.PUBLIC : Networks.TESTNET;
    this.contractId =
      this.configService.get<string>('STELLAR_CONTRACT_ID') || null;
    this.server = new Horizon.Server(serverUrl);
    this.sorobanServer = new rpc.Server(this.sorobanRpcUrl, {
      allowHttp: this.sorobanRpcUrl.startsWith('http://'),
    });
    this.logger.log(
      `Stellar SDK initialized — connected to ${this.network} at ${serverUrl} and Soroban RPC at ${this.sorobanRpcUrl}`,
    );
  }

  private async getContractClient(): Promise<ContractClient> {
    if (!this.contractId) {
      throw new Error('STELLAR_CONTRACT_ID is not configured');
    }

    if (!this.contractClient) {
      this.contractClient = await contract.Client.from({
        contractId: this.contractId,
        rpcUrl: this.sorobanRpcUrl,
        networkPassphrase: this.networkPassphrase,
        allowHttp: this.sorobanRpcUrl.startsWith('http://'),
        server: this.sorobanServer,
        publicKey: undefined,
      });
    }

    return this.contractClient;
  }

  private extractResult<T>(response: unknown): T | null {
    if (response && typeof response === 'object' && 'result' in response) {
      return (response as { result?: T }).result ?? null;
    }

    return (response as T) ?? null;
  }

  private stringifyScalar(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    if (
      typeof value === 'number' ||
      typeof value === 'bigint' ||
      typeof value === 'boolean'
    ) {
      return String(value);
    }

    return '';
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : this.stringifyScalar(error) || 'Unknown error';
  }

  private toFiniteNumber(value: unknown): number {
    const parsed =
      typeof value === 'number'
        ? value
        : typeof value === 'bigint'
          ? Number(value)
          : Number.parseFloat(this.stringifyScalar(value));

    return Number.isFinite(parsed) ? parsed : 0;
  }

  private normalizeTimestamp(value: unknown): string | null {
    const raw = this.stringifyScalar(value);
    if (!raw) {
      return null;
    }

    const timestamp = new Date(raw);
    return Number.isNaN(timestamp.getTime()) ? raw : timestamp.toISOString();
  }

  private normalizeContractTip(value: unknown): ContractTipVerificationResult {
    if (Array.isArray(value)) {
      const tipValues = value as readonly unknown[];
      const from = tipValues[0];
      const to = tipValues[1];
      const amount = tipValues[2];
      const timestamp = tipValues[3];

      return {
        exists: true,
        from: this.stringifyScalar(from),
        to: this.stringifyScalar(to),
        amount: this.toFiniteNumber(amount),
        timestamp: this.normalizeTimestamp(timestamp),
      };
    }

    if (value && typeof value === 'object') {
      const tip = value as Record<string, unknown>;

      return {
        exists: tip.exists !== false,
        from: this.stringifyScalar(tip.from ?? tip.senderWallet),
        to: this.stringifyScalar(tip.to ?? tip.receiverWallet),
        amount: this.toFiniteNumber(tip.amount),
        timestamp: this.normalizeTimestamp(tip.timestamp ?? tip.createdAt),
      };
    }

    return {
      exists: false,
      from: '',
      to: '',
      amount: 0,
      timestamp: null,
    };
  }

  async verifyTipOnContract(
    creatorAddress: string,
    tipIndex: number,
  ): Promise<ContractTipVerificationResult> {
    try {
      const client = await this.getContractClient();
      const contractAny = client as unknown as Record<
        string,
        (...args: Array<Record<string, unknown>>) => Promise<unknown>
      >;

      const [balanceResponse, tipCountResponse, tipResponse] =
        await Promise.all([
          contractAny.get_balance({ creatorAddress }),
          contractAny.get_tip_count({ creatorAddress }),
          contractAny.get_tip({ creatorAddress, tipIndex }),
        ]);

      const balance = this.toFiniteNumber(this.extractResult(balanceResponse));
      const tipCount = this.toFiniteNumber(
        this.extractResult(tipCountResponse),
      );
      const tip = this.normalizeContractTip(this.extractResult(tipResponse));

      return {
        exists:
          tip.exists &&
          tipIndex >= 0 &&
          tipIndex < tipCount &&
          balance >= 0 &&
          tip.amount >= 0,
        from: tip.from,
        to: tip.to,
        amount: tip.amount,
        timestamp: tip.timestamp,
      };
    } catch (error: unknown) {
      const message = this.getErrorMessage(error);
      this.logger.error(
        `Failed to verify tip on contract for ${creatorAddress} at index ${tipIndex}: ${message}`,
      );

      return {
        exists: false,
        from: '',
        to: '',
        amount: 0,
        timestamp: null,
      };
    }
  }

  async verifyPayment(transactionHash: string): Promise<{
    verified: boolean;
    from?: string;
    to?: string;
    amount?: number;
    asset?: string;
    timestamp?: string;
  }> {
    try {
      const tx = await this.server
        .transactions()
        .transaction(transactionHash)
        .call();

      if (!tx) {
        return { verified: false };
      }

      // Access SDK response fields with type assertion (external Stellar SDK)
      /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
      const txAny = tx as any;
      const operation = txAny.operations?.[0];
      const from = this.stringifyScalar(txAny.source_account);
      let to = '';
      let amount = 0;
      let asset = 'XLM';
      const timestamp =
        this.stringifyScalar(txAny.created_at ?? txAny.createdAt) || undefined;

      if (operation) {
        to = this.stringifyScalar(operation.to ?? operation.destination);
        amount = parseFloat(
          this.stringifyScalar(
            operation.amount ?? operation.starting_balance,
          ) || '0',
        );
        if (operation.asset_type === 'credit_alphanum4') {
          asset = `${operation.asset_code}:${operation.asset_issuer}`;
        }
      }
      /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

      return {
        verified: true,
        from,
        to,
        amount,
        asset,
        timestamp,
      };
    } catch (error: unknown) {
      const message = this.getErrorMessage(error);
      this.logger.error(
        `Failed to verify transaction ${transactionHash}: ${message}`,
      );
      return { verified: false };
    }
  }

  async getAccountBalance(walletAddress: string): Promise<{
    balances: Array<{ asset: string; balance: string }>;
  }> {
    try {
      const account = await this.server.loadAccount(walletAddress);
      const balances = account.balances.map((b) => {
        if (b.asset_type === 'native') {
          return { asset: 'XLM', balance: b.balance };
        }
        // Access credit/issuer fields with type assertion for Stellar SDK union type
        /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
        const credit = b as any;
        return {
          asset: `${credit.asset_code}:${credit.asset_issuer}`,
          balance: credit.balance,
        };
        /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
      });

      return { balances };
    } catch (error: unknown) {
      const message = this.getErrorMessage(error);
      this.logger.error(
        `Failed to fetch balance for ${walletAddress}: ${message}`,
      );
      return { balances: [] };
    }
  }

  async getAccountInfo(walletAddress: string): Promise<{
    address: string;
    exists: boolean;
    sequenceNumber: string | null;
    subentryCount: number;
    network: string;
  }> {
    try {
      const account = await this.server.loadAccount(walletAddress);
      // Access SDK response fields with type assertion (external Stellar SDK)
      /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
      const accountAny = account as any;
      return {
        address: walletAddress,
        exists: true,
        sequenceNumber: account.sequenceNumber(),
        subentryCount: accountAny.subentry_count || 0,
        /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
        network: this.network,
      };
    } catch (error: unknown) {
      const message = this.getErrorMessage(error);
      this.logger.error(
        `Failed to fetch account info for ${walletAddress}: ${message}`,
      );
      return {
        address: walletAddress,
        exists: false,
        sequenceNumber: null,
        subentryCount: 0,
        network: this.network,
      };
    }
  }
}
