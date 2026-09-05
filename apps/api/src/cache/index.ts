import Redis from 'ioredis';
import { config } from '../config/index.js';

interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  publish(channel: string, message: string): Promise<void>;
  subscribe(channel: string, handler: (message: string) => void): void;
}

class InMemoryCacheStore implements CacheStore {
  private memory = new Map<string, { value: unknown; expiresAt?: number }>();
  private subscribers = new Map<string, Set<(message: string) => void>>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memory.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.memory.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.memory.delete(key);
  }

  async publish(channel: string, message: string): Promise<void> {
    const handlers = this.subscribers.get(channel);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (err) {
          console.error(`Error in subscriber handler for channel ${channel}:`, err);
        }
      });
    }
  }

  subscribe(channel: string, handler: (message: string) => void): void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    this.subscribers.get(channel)!.add(handler);
  }
}

class RedisCacheStore implements CacheStore {
  private client: Redis;
  private pubClient: Redis;
  private subClient: Redis;
  private channelHandlers = new Map<string, Set<(message: string) => void>>();

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
    this.pubClient = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
    this.subClient = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });

    this.subClient.on('message', (channel, message) => {
      const handlers = this.channelHandlers.get(channel);
      if (handlers) {
        handlers.forEach((fn) => fn(message));
      }
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (err) {
      console.error('Redis set error:', err);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      console.error('Redis del error:', err);
    }
  }

  async publish(channel: string, message: string): Promise<void> {
    try {
      await this.pubClient.publish(channel, message);
    } catch (err) {
      console.error('Redis publish error:', err);
    }
  }

  subscribe(channel: string, handler: (message: string) => void): void {
    if (!this.channelHandlers.has(channel)) {
      this.channelHandlers.set(channel, new Set());
      this.subClient.subscribe(channel).catch(() => {});
    }
    this.channelHandlers.get(channel)!.add(handler);
  }
}

// Initialize cache store (with transparent fallback)
export const cache: CacheStore = config.redisUrl
  ? new RedisCacheStore(config.redisUrl)
  : new InMemoryCacheStore();
