import { createHmac } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { App } from 'supertest/types';
import { StellarController } from '../src/stellar/stellar.controller';
import { StellarService } from '../src/stellar/stellar.service';
import {
  Tip,
  TipAsset,
  TipStatus,
  TipWithdrawalStatus,
} from '../src/entities/tip.entity';
import { User, AuthMethod, UserRole } from '../src/entities/user.entity';
import {
  Notification,
  NotificationType,
} from '../src/entities/notification.entity';
import { NotificationsService } from '../src/notifications/notifications.service';
import { TIP_EVENT, WITHDRAWAL_EVENT } from '../src/stellar/contract/events';

describe('Stellar contract webhook (e2e)', () => {
  jest.setTimeout(30000);

  let app: INestApplication<App>;
  let userRepository: Repository<User>;
  let tipRepository: Repository<Tip>;
  let notificationRepository: Repository<Notification>;

  const webhookSecret = 'test-webhook-secret';

  beforeAll(async () => {
    process.env.STELLAR_WEBHOOK_SECRET = webhookSecret;
    process.env.USDC_ISSUER =
      'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5ZG34P662Q';
    process.env.STELLAR_NODE_URL = 'https://horizon-testnet.stellar.org';
    process.env.STELLAR_SOROBAN_URL = 'https://soroban-testnet.stellar.org';
    process.env.STELLAR_NETWORK = 'TESTNET';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          dropSchema: true,
          synchronize: true,
          entities: [User, Tip, Notification],
        }),
        TypeOrmModule.forFeature([User, Tip, Notification]),
      ],
      controllers: [StellarController],
      providers: [StellarService, NotificationsService],
    }).compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    await app.init();

    userRepository = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    tipRepository = moduleRef.get<Repository<Tip>>(getRepositoryToken(Tip));
    notificationRepository = moduleRef.get<Repository<Notification>>(
      getRepositoryToken(Notification),
    );
  });

  beforeEach(async () => {
    await notificationRepository.clear();
    await tipRepository.clear();
    await userRepository.clear();

    await userRepository.save({
      username: 'creator',
      displayName: 'Creator',
      walletAddress: 'GCREATORWALLET',
      authMethod: AuthMethod.STELLAR,
      role: UserRole.USER,
      isActive: true,
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('accepts a valid signed tip event', async () => {
    const payload = {
      topic: TIP_EVENT,
      transactionHash: 'tx-hash-001',
      timestamp: new Date().toISOString(),
      data: {
        receiverWallet: 'GCREATORWALLET',
        senderWallet: 'GSUPPORTERWALLET',
        amount: '12.5',
        asset: 'XLM',
        message: 'Great stream',
      },
    };

    const response = await postSignedWebhook(payload).expect(200);

    expect(response.body).toEqual({ accepted: true, duplicate: false });

    const tips = await tipRepository.find();
    expect(tips).toHaveLength(1);
    expect(tips[0]).toMatchObject({
      transactionHash: 'tx-hash-001',
      senderWallet: 'GSUPPORTERWALLET',
      receiverWallet: 'GCREATORWALLET',
      amount: 12.5,
      asset: TipAsset.XLM,
      status: TipStatus.COMPLETED,
      withdrawalStatus: TipWithdrawalStatus.NONE,
    });

    const notifications = await notificationRepository.find();
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      type: NotificationType.TIP_RECEIVED,
      title: 'Tip Received',
    });
  });

  it('rejects an invalid signature', async () => {
    const payload = {
      topic: TIP_EVENT,
      transactionHash: 'tx-hash-002',
      timestamp: new Date().toISOString(),
      data: {
        receiverWallet: 'GCREATORWALLET',
        senderWallet: 'GSUPPORTERWALLET',
        amount: '5',
      },
    };

    await request(app.getHttpServer())
      .post('/stellar/contract/webhook')
      .set('content-type', 'application/json')
      .set('x-stellar-signature', 'not-valid')
      .send(JSON.stringify(payload))
      .expect(401);

    expect(await tipRepository.count()).toBe(0);
  });

  it('returns 200 for replayed events without re-processing', async () => {
    const payload = {
      topic: TIP_EVENT,
      transactionHash: 'tx-hash-003',
      timestamp: new Date().toISOString(),
      data: {
        receiverWallet: 'GCREATORWALLET',
        senderWallet: 'GSUPPORTERWALLET',
        amount: '3.5',
      },
    };

    await postSignedWebhook(payload).expect(200);
    const replayResponse = await postSignedWebhook(payload).expect(200);

    expect(replayResponse.body).toEqual({ accepted: true, duplicate: true });
    expect(await tipRepository.count()).toBe(1);
    expect(await notificationRepository.count()).toBe(1);
  });

  it('rejects stale events outside the replay window', async () => {
    const payload = {
      topic: TIP_EVENT,
      transactionHash: 'tx-hash-004',
      timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
      data: {
        receiverWallet: 'GCREATORWALLET',
        senderWallet: 'GSUPPORTERWALLET',
        amount: '8',
      },
    };

    await postSignedWebhook(payload).expect(401);
    expect(await tipRepository.count()).toBe(0);
  });

  it('updates linked tip withdrawal status for withdrawal events', async () => {
    const creator = await userRepository.findOneByOrFail({
      walletAddress: 'GCREATORWALLET',
    });

    await tipRepository.save({
      creator,
      creatorId: creator.id,
      supporterId: null,
      senderWallet: 'GSUPPORTERWALLET',
      receiverWallet: 'GCREATORWALLET',
      amount: 10,
      asset: TipAsset.XLM,
      assetIssuer: null,
      message: 'Initial tip',
      transactionHash: 'tip-tx-001',
      status: TipStatus.COMPLETED,
      withdrawalStatus: TipWithdrawalStatus.NONE,
      withdrawalTransactionHash: null,
    });

    const payload = {
      topic: WITHDRAWAL_EVENT,
      transactionHash: 'withdrawal-tx-001',
      timestamp: new Date().toISOString(),
      data: {
        tipTransactionHash: 'tip-tx-001',
        status: 'completed',
      },
    };

    await postSignedWebhook(payload).expect(200);

    const updatedTip = await tipRepository.findOneByOrFail({
      transactionHash: 'tip-tx-001',
    });
    expect(updatedTip.withdrawalStatus).toBe(TipWithdrawalStatus.COMPLETED);
    expect(updatedTip.withdrawalTransactionHash).toBe('withdrawal-tx-001');
  });

  function postSignedWebhook(payload: Record<string, unknown>): request.Test {
    const rawBody = JSON.stringify(payload);
    const signature = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    return request(app.getHttpServer())
      .post('/stellar/contract/webhook')
      .set('content-type', 'application/json')
      .set('x-stellar-signature', signature)
      .send(rawBody);
  }
});
