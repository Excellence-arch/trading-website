import http from 'http';
import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { WebSocketGateway } from './ws/gateway.js';
import { authRouter } from './routes/auth.routes.js';
import { marketRouter } from './routes/market.routes.js';
import { watchlistRouter } from './routes/watchlist.routes.js';
import { tradeRouter } from './routes/trade.routes.js';
import { analyticsRouter } from './routes/analytics.routes.js';
import { paperRouter } from './routes/paper.routes.js';
import { replayRouter } from './routes/replay.routes.js';
import { aiRouter } from './routes/ai.routes.js';
import { drawingRouter } from './routes/drawing.routes.js';
import { strategyRouter } from './routes/strategy.routes.js';

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime(),
    nodeEnv: config.nodeEnv,
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/market', marketRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/trades', tradeRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/paper', paperRouter);
app.use('/api/replay', replayRouter);
app.use('/api/ai', aiRouter);
app.use('/api/drawings', drawingRouter);
app.use('/api/strategies', strategyRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Create HTTP Server & WebSocket Gateway
const server = http.createServer(app);
const wsGateway = new WebSocketGateway(server);

server.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Crypto Trading Terminal API running on port ${config.port}`);
  console.log(`📡 WebSocket Gateway ready at ws://localhost:${config.port}/ws`);
  console.log(`💾 Database: ${config.databaseUrl.startsWith('file:') ? 'SQLite (Zero-Docker local)' : 'PostgreSQL'}`);
  console.log(`=======================================================`);
});

export { app, server, wsGateway };
