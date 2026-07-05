import type { LoggerService } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { getDatabasePoolMonitorIntervalMs } from './database-pool.config';

export interface PostgresPoolStats {
  max: number;
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

interface PoolOptionsLike {
  max?: unknown;
  poolSize?: unknown;
}

interface PgPoolLike {
  options?: PoolOptionsLike;
  totalCount?: unknown;
  idleCount?: unknown;
  waitingCount?: unknown;
}

interface DataSourceDriverLike {
  master?: unknown;
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function getPostgresPoolStats(
  dataSource: DataSource,
): PostgresPoolStats | null {
  const driver = (dataSource as unknown as { driver?: DataSourceDriverLike })
    .driver;
  const pool = driver?.master as PgPoolLike | undefined;

  if (!pool) return null;

  const max = toNumber(pool.options?.max, toNumber(pool.options?.poolSize));
  const totalCount = toNumber(pool.totalCount);
  const idleCount = toNumber(pool.idleCount);
  const waitingCount = toNumber(pool.waitingCount);

  return {
    max,
    totalCount,
    idleCount,
    waitingCount,
  };
}

export function isPostgresPoolSaturated(stats: PostgresPoolStats): boolean {
  return (
    stats.waitingCount > 0 ||
    (stats.max > 0 && stats.totalCount >= stats.max && stats.idleCount === 0)
  );
}

export function logPostgresPoolSaturation(
  dataSource: DataSource,
  logger: LoggerService,
): boolean {
  const stats = getPostgresPoolStats(dataSource);

  if (!stats || !isPostgresPoolSaturated(stats)) {
    return false;
  }

  logger.warn(
    'PostgreSQL connection pool saturation detected',
    'DatabasePool',
    {
      max: stats.max,
      totalCount: stats.totalCount,
      idleCount: stats.idleCount,
      waitingCount: stats.waitingCount,
    },
  );

  return true;
}

export function startPostgresPoolSaturationMonitor(
  dataSource: DataSource,
  logger: LoggerService,
  intervalMs = getDatabasePoolMonitorIntervalMs(),
): NodeJS.Timeout {
  logPostgresPoolSaturation(dataSource, logger);

  const timer = setInterval(() => {
    logPostgresPoolSaturation(dataSource, logger);
  }, intervalMs);

  timer.unref();

  return timer;
}
