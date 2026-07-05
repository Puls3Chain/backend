import {
  DB_POOL_CONNECTION_TIMEOUT_MS,
  DB_POOL_IDLE_TIMEOUT_MS,
  DEFAULT_DB_POOL_SATURATION_CHECK_INTERVAL_MS,
  DEFAULT_DB_POOL_SIZE,
  MAX_DB_POOL_SIZE,
  createPostgresPoolOptions,
  getDatabasePoolMonitorIntervalMs,
  getDatabasePoolSize,
} from './database-pool.config';

describe('database pool configuration', () => {
  it('uses the default pool size when DB_POOL_SIZE is not set', () => {
    expect(getDatabasePoolSize({})).toBe(DEFAULT_DB_POOL_SIZE);
  });

  it('uses a positive DB_POOL_SIZE value', () => {
    expect(getDatabasePoolSize({ DB_POOL_SIZE: '15' })).toBe(15);
  });

  it('caps DB_POOL_SIZE at the per-instance maximum', () => {
    expect(getDatabasePoolSize({ DB_POOL_SIZE: '99' })).toBe(MAX_DB_POOL_SIZE);
  });

  it('falls back for invalid DB_POOL_SIZE values', () => {
    expect(getDatabasePoolSize({ DB_POOL_SIZE: '0' })).toBe(
      DEFAULT_DB_POOL_SIZE,
    );
    expect(getDatabasePoolSize({ DB_POOL_SIZE: 'not-a-number' })).toBe(
      DEFAULT_DB_POOL_SIZE,
    );
  });

  it('builds explicit postgres pool options for TypeORM', () => {
    expect(createPostgresPoolOptions({ DB_POOL_SIZE: '12' })).toEqual({
      max: 12,
      poolSize: 12,
      idleTimeoutMillis: DB_POOL_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: DB_POOL_CONNECTION_TIMEOUT_MS,
    });
  });

  it('uses a configurable saturation monitor interval', () => {
    expect(getDatabasePoolMonitorIntervalMs({})).toBe(
      DEFAULT_DB_POOL_SATURATION_CHECK_INTERVAL_MS,
    );
    expect(
      getDatabasePoolMonitorIntervalMs({
        DB_POOL_SATURATION_CHECK_INTERVAL_MS: '5000',
      }),
    ).toBe(5000);
  });
});
