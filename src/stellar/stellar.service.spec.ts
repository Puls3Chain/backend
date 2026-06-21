/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { StellarService } from './stellar.service';
import { ConfigService } from '@nestjs/config';

jest.mock('@stellar/stellar-sdk', () => {
  const mockLoadAccount = jest.fn();
  const mockTransactionCall = jest.fn();
  const mockGetBalance = jest.fn();
  const mockGetTip = jest.fn();
  const mockGetTipCount = jest.fn();

  return {
    Horizon: {
      Server: jest.fn().mockImplementation(() => ({
        loadAccount: mockLoadAccount,
        transactions: jest.fn().mockReturnValue({
          transaction: jest.fn().mockReturnValue({
            call: mockTransactionCall,
          }),
        }),
      })),
    },
    rpc: {
      Server: jest.fn().mockImplementation(() => ({})),
    },
    contract: {
      Client: {
        from: jest.fn().mockResolvedValue({
          get_balance: mockGetBalance,
          get_tip: mockGetTip,
          get_tip_count: mockGetTipCount,
        }),
      },
    },
    Networks: {
      TESTNET: 'TESTNET',
      PUBLIC: 'PUBLIC',
    },
  };
});

describe('StellarService', () => {
  let service: StellarService;
  let mockContractClient: {
    get_balance: jest.Mock;
    get_tip: jest.Mock;
    get_tip_count: jest.Mock;
  };

  const createMockAccount = (): Record<string, unknown> => ({
    balances: [
      {
        asset_type: 'native',
        balance: '100.0000000',
      },
      {
        asset_type: 'credit_alphanum4',
        asset_code: 'USDC',
        asset_issuer:
          'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
        balance: '50.0000000',
      },
    ],
    sequenceNumber: jest.fn().mockReturnValue('123456789'),
    subentry_count: 2,
  });

  const createMockTx = (): Record<string, unknown> => ({
    source_account: 'GSOURCE...',
    operations: [
      {
        to: 'GDEST...',
        amount: '10.0000000',
        asset_type: 'native',
      },
    ],
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'STELLAR_NODE_URL')
                return 'https://horizon-testnet.stellar.org';
              if (key === 'STELLAR_SOROBAN_URL')
                return 'https://soroban-testnet.stellar.org';
              if (key === 'STELLAR_NETWORK') return 'TESTNET';
              if (key === 'STELLAR_CONTRACT_ID')
                return 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
    service.onModuleInit();

    mockContractClient = {
      get_balance: jest.fn(),
      get_tip: jest.fn(),
      get_tip_count: jest.fn(),
    };

    const stellarSdk = await import('@stellar/stellar-sdk');
    (stellarSdk.contract.Client.from as jest.Mock).mockResolvedValue(
      mockContractClient,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAccountBalance', () => {
    it('should return balances for a valid address', async () => {
      (service as any).server.loadAccount.mockResolvedValue(
        createMockAccount(),
      );

      const result = await service.getAccountBalance(
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      );

      expect(result.balances).toHaveLength(2);
      expect(result.balances[0]).toEqual({
        asset: 'XLM',
        balance: '100.0000000',
      });
      expect(result.balances[1].asset).toContain('USDC');
    });

    it('should return empty balances on error', async () => {
      (service as any).server.loadAccount.mockRejectedValue(
        new Error('Account not found'),
      );

      const result = await service.getAccountBalance('GINVALID...');
      expect(result.balances).toEqual([]);
    });
  });

  describe('getAccountInfo', () => {
    it('should return account info for a valid address', async () => {
      (service as any).server.loadAccount.mockResolvedValue(
        createMockAccount(),
      );

      const result = await service.getAccountInfo(
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      );

      expect(result.exists).toBe(true);
      expect(result.sequenceNumber).toBe('123456789');
      expect(result.subentryCount).toBe(2);
      expect(result.network).toBe('TESTNET');
    });

    it('should return exists: false on error', async () => {
      (service as any).server.loadAccount.mockRejectedValue(
        new Error('Account not found'),
      );

      const result = await service.getAccountInfo('GINVALID...');
      expect(result.exists).toBe(false);
    });
  });

  describe('verifyPayment', () => {
    it('should verify a valid transaction', async () => {
      // Mock the transaction call
      const txBuilder = (service as any).server.transactions();
      txBuilder
        .transaction('valid-tx-hash')
        .call.mockResolvedValue(createMockTx());

      const result = await service.verifyPayment('valid-tx-hash');

      expect(result.verified).toBe(true);
      expect(result.from).toBe('GSOURCE...');
      expect(result.amount).toBe(10);
      expect(result.asset).toBe('XLM');
    });

    it('should return verified: false on error', async () => {
      const txBuilder = (service as any).server.transactions();
      txBuilder
        .transaction('invalid-hash')
        .call.mockRejectedValue(new Error('Transaction not found'));

      const result = await service.verifyPayment('invalid-hash');
      expect(result.verified).toBe(false);
    });
  });

  describe('verifyTipOnContract', () => {
    it('should verify a valid contract tip record', async () => {
      mockContractClient.get_balance.mockResolvedValue({ result: 100 });
      mockContractClient.get_tip_count.mockResolvedValue({ result: 1 });
      mockContractClient.get_tip.mockResolvedValue({
        result: {
          exists: true,
          from: 'GSOURCE...',
          to: 'GRECEIVER...',
          amount: 10,
          timestamp: '2026-06-22T12:00:00.000Z',
        },
      });

      const result = await service.verifyTipOnContract('GRECEIVER...', 0);

      expect(result.exists).toBe(true);
      expect(result.from).toBe('GSOURCE...');
      expect(result.to).toBe('GRECEIVER...');
      expect(result.amount).toBe(10);
      expect(result.timestamp).toBe('2026-06-22T12:00:00.000Z');
    });

    it('should return exists: false when the contract call fails', async () => {
      const stellarSdk = await import('@stellar/stellar-sdk');
      (stellarSdk.contract.Client.from as jest.Mock).mockRejectedValueOnce(
        new Error('RPC unavailable'),
      );

      const result = await service.verifyTipOnContract('GRECEIVER...', 0);
      expect(result.exists).toBe(false);
    });
  });
});
