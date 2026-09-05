import dotenv from 'dotenv';
import path from 'path';

// Load .env from root if available
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'crypto-terminal-super-secret-jwt-key-12345678',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  redisUrl: process.env.REDIS_URL || '',
  binanceApiUrl: process.env.BINANCE_API_URL || 'https://api.binance.com',
  binanceWsUrl: process.env.BINANCE_WS_URL || 'wss://stream.binance.com:9443/ws',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
  storageDriver: process.env.STORAGE_DRIVER || 'local',
  uploadDir: process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads'),
  defaultSymbols: [
    'BTCUSDT',
    'ETHUSDT',
    'SOLUSDT',
    'BNBUSDT',
    'XRPUSDT',
    'DOGEUSDT',
    'ADAUSDT',
    'AVAXUSDT',
    'LINKUSDT',
    'NEARUSDT',
  ],
  defaultTimeframes: [
    '1m',
    '3m',
    '5m',
    '15m',
    '30m',
    '1h',
    '2h',
    '4h',
    '6h',
    '12h',
    '1D',
    '1W',
  ],
};
