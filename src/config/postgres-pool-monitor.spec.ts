import type { LoggerService } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import {
  getPostgresPoolStats,
  isPostgresPoolSaturated,
  logPostgresPoolSaturation,
  startPostgresPoolSaturationMonitor,
} from './postgres-pool-monitor';

function dataSourceWithPool(pool: unknown): DataSource {
  return {
    driver: {
      master: pool,
    },
  } as unknown as DataSource;
}

describe('postgres pool monitor', () => {
  it('reads pg pool stats from the TypeORM postgres driver', () => {
    expect(
      getPostgresPoolStats(
        dataSourceWithPool({
          options: { max: 10 },
          totalCount: 7,
          idleCount: 3,
          waitingCount: 0,
        }),
      ),
    ).toEqual({
      max: 10,
      totalCount: 7,
      idleCount: 3,
      waitingCount: 0,
    });
  });

  it('returns null when the postgres driver has no pool', () => {
    expect(getPostgresPoolStats({ driver: {} } as unknown as DataSource)).toBe(
      null,
    );
  });

  it('treats queued waiters as saturation', () => {
    expect(
      isPostgresPoolSaturated({
        max: 10,
        totalCount: 8,
        idleCount: 1,
        waitingCount: 2,
      }),
    ).toBe(true);
  });

  it('treats a full busy pool as saturation', () => {
    expect(
      isPostgresPoolSaturated({
        max: 10,
        totalCount: 10,
        idleCount: 0,
        waitingCount: 0,
      }),
    ).toBe(true);
  });

  it('does not warn when there is idle capacity', () => {
    const warn = jest.fn();
    const logger = { warn } as unknown as LoggerService;

    const warned = logPostgresPoolSaturation(
      dataSourceWithPool({
        options: { max: 10 },
        totalCount: 5,
        idleCount: 2,
        waitingCount: 0,
      }),
      logger,
    );

    expect(warned).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it('logs a warn-level event with pool stats when saturated', () => {
    const warn = jest.fn();
    const logger = { warn } as unknown as LoggerService;

    const warned = logPostgresPoolSaturation(
      dataSourceWithPool({
        options: { max: 10 },
        totalCount: 10,
        idleCount: 0,
        waitingCount: 1,
      }),
      logger,
    );

    expect(warned).toBe(true);
    expect(warn).toHaveBeenCalledWith(
      'PostgreSQL connection pool saturation detected',
      'DatabasePool',
      {
        max: 10,
        totalCount: 10,
        idleCount: 0,
        waitingCount: 1,
      },
    );
  });

  it('starts a recurring saturation monitor', () => {
    jest.useFakeTimers();

    const warn = jest.fn();
    const logger = { warn } as unknown as LoggerService;
    const timer = startPostgresPoolSaturationMonitor(
      dataSourceWithPool({
        options: { max: 10 },
        totalCount: 10,
        idleCount: 0,
        waitingCount: 1,
      }),
      logger,
      1000,
    );

    expect(warn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);

    expect(warn).toHaveBeenCalledTimes(2);

    clearInterval(timer);
    jest.useRealTimers();
  });
});
