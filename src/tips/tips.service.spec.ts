/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { TipsService } from './tips.service';
import { Tip, TipStatus, TipAsset } from '../entities/tip.entity';
import { User } from '../entities/user.entity';
import { StellarService } from '../stellar/stellar.service';
import { NotificationsService } from '../notifications/notifications.service';

const mockStellarService = {
  verifyPayment: jest.fn(),
  verifyTipOnContract: jest.fn(),
};

const mockNotificationsService = {
  notifyDiscrepancyDetected: jest.fn(),
};

describe('TipsService', () => {
  let service: TipsService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let tipsRepository: any;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let usersRepository: any;

  const mockTip: any = {
    id: 'tip-1',
    creatorId: 'user-1',
    supporterId: null,
    senderWallet: 'GSENDER...',
    receiverWallet: 'GRECEIVER...',
    amount: 100,
    asset: TipAsset.XLM,
    assetIssuer: null,
    message: 'Great work!',
    transactionHash: null,
    status: TipStatus.PENDING,
    createdAt: new Date(),
  };

  const mockCreator: any = {
    id: 'user-1',
    username: 'creator',
    walletAddress: 'GRECEIVER...',
    isActive: true,
  };

  const mockTipsRepository = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUsersRepository = {
    findOne: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'USDC_ISSUER')
        return 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5ZG34P662Q';
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TipsService,
        {
          provide: getRepositoryToken(Tip),
          useValue: mockTipsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: StellarService,
          useValue: mockStellarService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<TipsService>(TipsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTip', () => {
    it('should create a tip with valid data', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockCreator);
      mockTipsRepository.save.mockResolvedValue(mockTip);

      const result = await service.createTip({
        receiverWallet: 'GRECEIVER...',
        senderWallet: 'GSENDER...',
        amount: 100,
        message: 'Great work!',
      });

      expect(result).toEqual(mockTip);
      expect(mockTipsRepository.save).toHaveBeenCalled();
    });

    it('should throw on unknown receiver wallet', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createTip({
          receiverWallet: 'GUNKNOWN...',
          amount: 100,
        }),
      ).rejects.toThrow('Creator not found with this wallet address');
    });

    it('should throw on zero amount', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockCreator);

      await expect(
        service.createTip({
          receiverWallet: 'GRECEIVER...',
          amount: 0,
        }),
      ).rejects.toThrow('Tip amount must be greater than 0');
    });

    it('should create a USDC tip with valid issuer', async () => {
      const usdcTip = {
        ...mockTip,
        asset: TipAsset.USDC,
        assetIssuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5ZG34P662Q',
      };
      mockUsersRepository.findOne.mockResolvedValue(mockCreator);
      mockTipsRepository.save.mockResolvedValue(usdcTip);

      const result = await service.createTip({
        receiverWallet: 'GRECEIVER...',
        senderWallet: 'GSENDER...',
        amount: 50,
        asset: 'USDC',
      });

      expect(result.asset).toBe(TipAsset.USDC);
      expect(result.assetIssuer).toBe(
        'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5ZG34P662Q',
      );
    });

    it('should throw on unsupported asset type', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockCreator);

      await expect(
        service.createTip({
          receiverWallet: 'GRECEIVER...',
          amount: 100,
          asset: 'BTC',
        }),
      ).rejects.toThrow('Unsupported asset type: BTC');
    });

    it('should throw on USDC when issuer not configured', async () => {
      const noIssuerConfig = {
        get: jest.fn().mockReturnValue(null),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TipsService,
          {
            provide: getRepositoryToken(Tip),
            useValue: mockTipsRepository,
          },
          {
            provide: getRepositoryToken(User),
            useValue: mockUsersRepository,
          },
          {
            provide: ConfigService,
            useValue: noIssuerConfig,
          },
          {
            provide: StellarService,
            useValue: mockStellarService,
          },
          {
            provide: NotificationsService,
            useValue: mockNotificationsService,
          },
        ],
      }).compile();

      const serviceNoIssuer = module.get<TipsService>(TipsService);
      mockUsersRepository.findOne.mockResolvedValue(mockCreator);

      await expect(
        serviceNoIssuer.createTip({
          receiverWallet: 'GRECEIVER...',
          amount: 50,
          asset: 'USDC',
        }),
      ).rejects.toThrow('USDC tipping is not configured');
    });
  });

  describe('getTipById', () => {
    it('should return a tip by id', async () => {
      mockTipsRepository.findOne.mockResolvedValue(mockTip);

      const result = await service.getTipById('tip-1');
      expect(result).toEqual(mockTip);
    });

    it('should throw on missing tip', async () => {
      mockTipsRepository.findOne.mockResolvedValue(null);

      await expect(service.getTipById('invalid')).rejects.toThrow(
        'Tip not found',
      );
    });
  });

  describe('confirmTip', () => {
    it('should confirm a tip with transaction hash', async () => {
      mockTipsRepository.findOne.mockResolvedValue(mockTip);
      mockTipsRepository.save.mockResolvedValue({
        ...mockTip,
        transactionHash: 'tx-hash-123',
        status: TipStatus.COMPLETED,
      });

      const result = await service.confirmTip('tip-1', 'tx-hash-123');

      expect(result.status).toBe(TipStatus.COMPLETED);
      expect(result.transactionHash).toBe('tx-hash-123');
    });
  });

  describe('verifyTipOnChain', () => {
    it('should return a matched verification result and cache it', async () => {
      mockTipsRepository.findOne.mockResolvedValue({
        ...mockTip,
        creator: mockCreator,
        transactionHash: 'tx-hash-123',
      });
      mockTipsRepository.find.mockResolvedValue([mockTip]);
      mockStellarService.verifyPayment.mockResolvedValue({
        verified: true,
        from: 'GSENDER...',
        to: 'GRECEIVER...',
        amount: 100,
        asset: 'XLM',
        timestamp: '2026-06-22T12:00:00.000Z',
      });
      mockStellarService.verifyTipOnContract.mockResolvedValue({
        exists: true,
        from: 'GSENDER...',
        to: 'GRECEIVER...',
        amount: 100,
        timestamp: '2026-06-22T12:00:00.000Z',
      });

      const result = await service.verifyTipOnChain('tip-1');

      expect(result.matches).toBe(true);
      expect(result.tipIndex).toBe(0);
      expect(
        mockNotificationsService.notifyDiscrepancyDetected,
      ).not.toHaveBeenCalled();

      const cached = await service.verifyTipOnChain('tip-1');
      expect(cached.matches).toBe(true);
      expect(mockStellarService.verifyPayment).toHaveBeenCalledTimes(1);
      expect(mockStellarService.verifyTipOnContract).toHaveBeenCalledTimes(1);
    });

    it('should notify the creator when Horizon and contract data differ', async () => {
      mockTipsRepository.findOne.mockResolvedValue({
        ...mockTip,
        creator: mockCreator,
        transactionHash: 'tx-hash-123',
      });
      mockTipsRepository.find.mockResolvedValue([mockTip]);
      mockStellarService.verifyPayment.mockResolvedValue({
        verified: true,
        from: 'GSENDER...',
        to: 'GRECEIVER...',
        amount: 100,
        asset: 'XLM',
        timestamp: '2026-06-22T12:00:00.000Z',
      });
      mockStellarService.verifyTipOnContract.mockResolvedValue({
        exists: true,
        from: 'GOTHER...',
        to: 'GRECEIVER...',
        amount: 100,
        timestamp: '2026-06-22T12:00:00.000Z',
      });
      mockNotificationsService.notifyDiscrepancyDetected.mockResolvedValue(
        {} as never,
      );

      const result = await service.verifyTipOnChain('tip-1');

      expect(result.matches).toBe(false);
      expect(
        mockNotificationsService.notifyDiscrepancyDetected,
      ).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          tipId: 'tip-1',
          tipIndex: 0,
          senderWallet: 'GSENDER...',
        }),
      );
    });
  });
});
