import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { faker } from '@faker-js/faker';
import { DataSource } from 'typeorm';
import {
  Notification,
  NotificationType,
} from '../src/entities/notification.entity';
import { Tip, TipAsset, TipStatus } from '../src/entities/tip.entity';
import { AuthMethod, User, UserRole } from '../src/entities/user.entity';
import { RefreshToken } from '../src/entities/refresh-token.entity';

dotenv.config();

const DEFAULT_CREATORS = 50;
const DEFAULT_EMAIL_CREATORS = 30;
const DEFAULT_TIPS = 500;
const DEFAULT_NOTIFICATIONS = 200;
const SEED = 74;
const USDC_ISSUER =
  process.env.USDC_ISSUER ||
  'GBBD47IFWMR5EIVXX4S7N7GCCJH7OOWBXVO6E3XEFZQFL5JEBVJY6HCO';
const DEMO_PASSWORD_HASH =
  '$2b$10$w0My8T1jG2joSKILu1fayeOTN42n0r2sZE0NuVcjkPdnqxKknlUta';

type SeedCounts = {
  creators: number;
  emailCreators: number;
  stellarCreators: number;
  tips: number;
  notifications: number;
};

type SeededCreator = User & {
  tipWalletAddress: string;
};

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'stellartip',
  entities: [User, Tip, Notification, RefreshToken],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: false,
});

function readScale(): number {
  const rawScale = process.env.SEED_SCALE || '1';
  const scale = Number(rawScale);

  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error(
      `SEED_SCALE must be a positive number. Received: ${rawScale}`,
    );
  }

  return scale;
}

function getCounts(scale: number): SeedCounts {
  const creators = Math.max(1, Math.round(DEFAULT_CREATORS * scale));
  const emailCreators = Math.min(
    creators,
    Math.round(DEFAULT_EMAIL_CREATORS * scale),
  );

  return {
    creators,
    emailCreators,
    stellarCreators: creators - emailCreators,
    tips: Math.max(1, Math.round(DEFAULT_TIPS * scale)),
    notifications: Math.max(1, Math.round(DEFAULT_NOTIFICATIONS * scale)),
  };
}

function createWalletAddress(index: number): string {
  return `G${faker.string.alphanumeric({ length: 55, casing: 'upper' })}${index
    .toString(36)
    .toUpperCase()
    .padStart(4, '0')}`.slice(0, 56);
}

function createPastDate(maxDaysAgo: number): Date {
  const now = Date.now();
  const daysAgo = faker.number.int({ min: 0, max: maxDaysAgo });
  const secondsIntoDay = faker.number.int({ min: 0, max: 86_399 });

  return new Date(now - (daysAgo * 86_400 + secondsIntoDay) * 1_000);
}

function createUsername(index: number): string {
  return `${faker.internet
    .username()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')}_${index}`;
}

async function resetTables(): Promise<void> {
  await dataSource.query(
    'TRUNCATE TABLE "notifications", "tips", "refresh_tokens", "users" RESTART IDENTITY CASCADE',
  );
}

async function seedCreators(counts: SeedCounts): Promise<SeededCreator[]> {
  const userRepository = dataSource.getRepository(User);
  const creators: SeededCreator[] = [];

  for (let index = 0; index < counts.creators; index += 1) {
    const isEmailCreator = index < counts.emailCreators;
    const displayName = faker.person.fullName();
    const tipWalletAddress = createWalletAddress(index);

    const creator = new User() as SeededCreator;

    creator.username = createUsername(index);
    creator.displayName = displayName;
    creator.bio = faker.person.bio();
    creator.avatarUrl = faker.image.avatar();
    creator.socialLinks = {
      twitter: `https://x.com/${faker.internet.username()}`,
      github: `https://github.com/${faker.internet.username()}`,
      website: faker.internet.url(),
    };
    creator.authMethod = isEmailCreator ? AuthMethod.EMAIL : AuthMethod.STELLAR;
    creator.role = UserRole.USER;
    creator.isActive = true;

    creator.tipWalletAddress = tipWalletAddress;

    if (isEmailCreator) {
      creator.email = faker.internet.email({ firstName: displayName });
      creator.password = DEMO_PASSWORD_HASH;
    } else {
      creator.walletAddress = tipWalletAddress;
    }

    creators.push(creator);
  }

  return userRepository.save(creators);
}

async function seedTips(
  creators: SeededCreator[],
  tipCount: number,
): Promise<Tip[]> {
  const tipRepository = dataSource.getRepository(Tip);
  const xlmTipCount = Math.round(tipCount * 0.7);
  const tips: Tip[] = [];

  for (let index = 0; index < tipCount; index += 1) {
    const creator = faker.helpers.arrayElement(creators);
    const possibleSupporters = creators.filter(
      (user) => user.id !== creator.id,
    );
    const supporter =
      possibleSupporters.length > 0 &&
      faker.datatype.boolean({ probability: 0.65 })
        ? faker.helpers.arrayElement(possibleSupporters)
        : null;
    const asset = index < xlmTipCount ? TipAsset.XLM : TipAsset.USDC;
    const status = faker.helpers.weightedArrayElement([
      { weight: 78, value: TipStatus.COMPLETED },
      { weight: 17, value: TipStatus.PENDING },
      { weight: 5, value: TipStatus.FAILED },
    ]);

    const tip = new Tip();

    tip.creatorId = creator.id;
    tip.supporterId = supporter?.id || null;
    tip.senderWallet =
      supporter?.tipWalletAddress || createWalletAddress(index + 10_000);
    tip.receiverWallet = creator.tipWalletAddress;
    tip.amount = faker.number.float({ min: 0.5, max: 250, fractionDigits: 7 });
    tip.asset = asset;
    tip.assetIssuer = asset === TipAsset.USDC ? USDC_ISSUER : null;
    tip.transactionHash = `seed_tx_${index.toString().padStart(4, '0')}_${faker.string.hexadecimal({ length: 24, prefix: '' })}`;
    tip.status = status;
    tip.createdAt = createPastDate(90);

    if (faker.datatype.boolean({ probability: 0.55 })) {
      tip.message = faker.lorem.sentence({ min: 6, max: 16 });
    }

    tips.push(tip);
  }

  return tipRepository.save(tips);
}

async function seedNotifications(
  creators: SeededCreator[],
  tips: Tip[],
  notificationCount: number,
): Promise<Notification[]> {
  const notificationRepository = dataSource.getRepository(Notification);
  const notifications: Notification[] = [];

  for (let index = 0; index < notificationCount; index += 1) {
    const tip = faker.helpers.arrayElement(tips);
    const creator = creators.find((user) => user.id === tip.creatorId);

    if (!creator) {
      throw new Error(`Unable to find creator for tip ${tip.id}`);
    }

    notifications.push(
      notificationRepository.create({
        userId: creator.id,
        type: NotificationType.TIP_RECEIVED,
        title: 'New tip received',
        message: `${faker.person.firstName()} sent you ${Number(tip.amount).toFixed(2)} ${tip.asset}.`,
        isRead: faker.datatype.boolean({ probability: 0.55 }),
        metadata: {
          tipId: tip.id,
          asset: tip.asset,
          amount: tip.amount,
          transactionHash: tip.transactionHash,
        },
        createdAt: tip.createdAt,
      }),
    );
  }

  return notificationRepository.save(notifications);
}

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.log('Refusing to seed database when NODE_ENV=production.');
    return;
  }

  const scale = readScale();
  const counts = getCounts(scale);

  faker.seed(SEED);

  await dataSource.initialize();
  await resetTables();

  const creators = await seedCreators(counts);
  const tips = await seedTips(creators, counts.tips);
  const notifications = await seedNotifications(
    creators,
    tips,
    counts.notifications,
  );

  await dataSource.destroy();

  console.log(
    `Seed complete: ${creators.length} creators (${counts.emailCreators} email, ${counts.stellarCreators} Stellar), ${tips.length} tips, ${notifications.length} notifications.`,
  );
}

seed().catch(async (error: unknown) => {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }

  console.error(error);
  process.exit(1);
});
