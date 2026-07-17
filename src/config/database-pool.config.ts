export const DEFAULT_DB_POOL_SIZE = 10;
export const MAX_DB_POOL_SIZE = 20;
export const DB_POOL_IDLE_TIMEOUT_MS = 30_000;
export const DB_POOL_CONNECTION_TIMEOUT_MS = 5_000;
export const DB_SLOW_QUERY_WARNING_MS = 1_000;
export const DEFAULT_DB_POOL_SATURATION_CHECK_INTERVAL_MS = 30_000;

type EnvSource = Record<string, string | undefined>;

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getDatabasePoolSize(env: EnvSource = process.env): number {
  return Math.min(
    parsePositiveInteger(env.DB_POOL_SIZE, DEFAULT_DB_POOL_SIZE),
    MAX_DB_POOL_SIZE,
  );
}

export function getDatabasePoolMonitorIntervalMs(
  env: EnvSource = process.env,
): number {
  return parsePositiveInteger(
    env.DB_POOL_SATURATION_CHECK_INTERVAL_MS,
    DEFAULT_DB_POOL_SATURATION_CHECK_INTERVAL_MS,
  );
}

export function createPostgresPoolOptions(env: EnvSource = process.env): {
  max: number;
  poolSize: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
} {
  const poolSize = getDatabasePoolSize(env);

  return {
    max: poolSize,
    poolSize,
    idleTimeoutMillis: DB_POOL_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: DB_POOL_CONNECTION_TIMEOUT_MS,
  };
}
