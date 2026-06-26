import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'stellartip',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  // Wrap each migration in its own transaction by default so partial
  // failures roll back cleanly, while still letting individual migrations
  // opt out via `public readonly transaction = false` on the class.
  //
  // This is required by `AddPerformanceIndexes1750464000000`, which uses
  // `CREATE INDEX CONCURRENTLY` — Postgres refuses to run those inside a
  // transaction. Under TypeORM's default `migrationsTransactionMode: 'all'`
  // the per-class opt-out raises
  // `ForbiddenTransactionModeOverrideError` and the Newman CI job
  // (`postman-tests.yml` → `npm run migration:run`) aborts before the
  // requests are even exercised.
  migrationsTransactionMode: 'each',
});
