import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const config: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'stellartip',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  migrationsTableName: 'typeorm_migrations',
  migrationsRun: isProduction,
  synchronize: !isProduction,
  logging: !isProduction,
  logger: 'advanced-console',
  autoLoadEntities: true,
  // See `src/config/data-source.ts` for the rationale. This keeps the
  // production bootstrap (`migrationsRun: isProduction`) consistent with
  // the CLI used by `npm run migration:run` and the Newman CI workflow,
  // so the opt-out on `AddPerformanceIndexes1750464000000` is honoured
  // in every code path that actually applies migrations.
  migrationsTransactionMode: 'each',
};

export default config;
