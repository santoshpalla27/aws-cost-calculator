import { createClient } from 'redis';
import { logger } from '../utils/logger';

export class RedisCache {
  private client: any;
  private connected: boolean = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://redis:6379',
    });

    this.client.on('error', (err: any) => {
      logger.error('Redis Client Error', err);
      this.connected = false;
    });

    this.client.on('connect', () => {
      logger.info('Redis Client Connected');
      this.connected = true;
    });

    this.connect();
  }

  private async connect() {
    try {
      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.connected) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttl: number = 3600): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.setEx(key, ttl, value);
    } catch (error) {
      logger.error('Redis SET error:', error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Redis DEL error:', error);
    }
  }
}