import { Logger } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { Socket } from 'net';
import { URL } from 'url';

class RedisCommandConnection {
  private socket?: Socket;
  private buffer = Buffer.alloc(0);
  private readonly host: string;
  private readonly port: number;
  private readonly password?: string;
  private readonly database?: string;

  constructor(redisUrl: string) {
    const parsed = new URL(redisUrl);
    this.host = parsed.hostname || 'localhost';
    this.port = Number(parsed.port || 6379);
    this.password = parsed.password
      ? decodeURIComponent(parsed.password)
      : undefined;
    this.database =
      parsed.pathname && parsed.pathname !== '/'
        ? parsed.pathname.slice(1)
        : undefined;
  }

  async command(args: Array<string | number>): Promise<unknown> {
    const socket = await this.getSocket();
    const payload = this.serialize(args);

    return new Promise((resolve, reject) => {
      const onData = (chunk: Buffer): void => {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        try {
          const parsed = this.parse(0);
          if (!parsed) {
            return;
          }
          socket.off('data', onData);
          socket.off('error', onError);
          this.buffer = this.buffer.subarray(parsed.offset);
          resolve(parsed.value);
        } catch (error) {
          socket.off('data', onData);
          socket.off('error', onError);
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      };
      const onError = (error: Error): void => {
        socket.off('data', onData);
        reject(error);
      };

      socket.on('data', onData);
      socket.once('error', onError);
      socket.write(payload, (error) => {
        if (error) {
          socket.off('data', onData);
          socket.off('error', onError);
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    });
  }

  private async getSocket(): Promise<Socket> {
    if (this.socket && !this.socket.destroyed) {
      return this.socket;
    }

    this.socket = await new Promise<Socket>((resolve, reject) => {
      const socket = new Socket();
      socket.once('error', reject);
      socket.connect(this.port, this.host, () => {
        socket.off('error', reject);
        socket.on('error', () => {
          this.socket?.destroy();
        });
        resolve(socket);
      });
    });

    if (this.password) {
      await this.command(['AUTH', this.password]);
    }
    if (this.database) {
      await this.command(['SELECT', this.database]);
    }

    return this.socket;
  }

  private serialize(args: Array<string | number>): string {
    return `*${args.length}\r\n${args
      .map((arg) => {
        const value = String(arg);
        return `$${Buffer.byteLength(value)}\r\n${value}\r\n`;
      })
      .join('')}`;
  }

  private parse(offset: number): { value: unknown; offset: number } | null {
    if (offset >= this.buffer.length) {
      return null;
    }

    const prefix = String.fromCharCode(this.buffer[offset]);
    const lineEnd = this.buffer.indexOf('\r\n', offset);
    if (lineEnd === -1) {
      return null;
    }
    const line = this.buffer.toString('utf8', offset + 1, lineEnd);
    const nextOffset = lineEnd + 2;

    if (prefix === '+') {
      return { value: line, offset: nextOffset };
    }
    if (prefix === '-') {
      throw new Error(line);
    }
    if (prefix === ':') {
      return { value: Number(line), offset: nextOffset };
    }
    if (prefix === '$') {
      const length = Number(line);
      if (length === -1) {
        return { value: null, offset: nextOffset };
      }
      const end = nextOffset + length;
      if (this.buffer.length < end + 2) {
        return null;
      }
      return {
        value: this.buffer.toString('utf8', nextOffset, end),
        offset: end + 2,
      };
    }
    if (prefix === '*') {
      const length = Number(line);
      const values: unknown[] = [];
      let currentOffset = nextOffset;
      for (let index = 0; index < length; index += 1) {
        const parsed = this.parse(currentOffset);
        if (!parsed) {
          return null;
        }
        values.push(parsed.value);
        currentOffset = parsed.offset;
      }
      return { value: values, offset: currentOffset };
    }

    throw new Error(`Unsupported Redis response prefix: ${prefix}`);
  }
}

export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private readonly connection: RedisCommandConnection;

  constructor(redisUrl: string) {
    this.connection = new RedisCommandConnection(redisUrl);
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): Promise<ThrottlerStorageRecord> {
    try {
      const result = (await this.connection.command([
        'EVAL',
        REDIS_THROTTLER_SCRIPT,
        2,
        `${key}:hits`,
        `${key}:blocked`,
        ttl,
        limit,
        blockDuration,
      ])) as number[];

      return {
        totalHits: result[0] ?? 0,
        timeToExpire: millisecondsToSeconds(result[1] ?? ttl),
        isBlocked: Boolean(result[2]),
        timeToBlockExpire: millisecondsToSeconds(result[3] ?? 0),
      };
    } catch (error) {
      this.logger.warn(
        `Redis rate limiter unavailable; allowing request: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        totalHits: 0,
        timeToExpire: millisecondsToSeconds(ttl),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }
}

const REDIS_THROTTLER_SCRIPT = `
local hitsKey = KEYS[1]
local blockKey = KEYS[2]
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blockDuration = tonumber(ARGV[3])

local blockTtl = redis.call('PTTL', blockKey)
if blockTtl > 0 then
  local currentHits = tonumber(redis.call('GET', hitsKey) or '0')
  local hitTtl = redis.call('PTTL', hitsKey)
  return { currentHits, hitTtl, 1, blockTtl }
end

local hits = redis.call('INCR', hitsKey)
if hits == 1 then
  redis.call('PEXPIRE', hitsKey, ttl)
end

local hitTtl = redis.call('PTTL', hitsKey)
if hits > limit then
  redis.call('SET', blockKey, '1', 'PX', blockDuration)
  return { hits, hitTtl, 1, blockDuration }
end

return { hits, hitTtl, 0, 0 }
`;

function millisecondsToSeconds(milliseconds: number): number {
  return Math.max(0, Math.ceil(milliseconds / 1000));
}
