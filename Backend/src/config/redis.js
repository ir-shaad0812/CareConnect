// ============================================
// REDIS CONFIG
// Shared Redis/BullMQ connection options
// ============================================

import config from './index.js';

const buildRedisConnection = () => {
  if (config.redis.url) {
    const parsed = new URL(config.redis.url);
    const dbFromUrl = parsed.pathname?.replace('/', '');

    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 6379,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      db: dbFromUrl ? parseInt(dbFromUrl, 10) || 0 : 0,
      tls: parsed.protocol === 'rediss:' ? {} : undefined,
      maxRetriesPerRequest: null,
    };
  }

  return {
    host: config.redis.host,
    port: config.redis.port,
    username: config.redis.username || undefined,
    password: config.redis.password || undefined,
    db: config.redis.db,
    tls: config.redis.tls ? {} : undefined,
    maxRetriesPerRequest: null,
  };
};

export const redisConnection = buildRedisConnection();

export default redisConnection;
