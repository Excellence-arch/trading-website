import { Router, Response } from 'express';
import { AuthService, AuthenticatedRequest } from '../auth/auth-service.js';
import { ReplayService } from '../replay/replay-service.js';
import type { Timeframe } from '@trading/types';

export const replayRouter = Router();

replayRouter.get('/candles', async (req, res) => {
  try {
    const symbol = (req.query.symbol as string) || 'BTCUSDT';
    const timeframe = (req.query.timeframe as Timeframe) || '1h';
    const startDate = req.query.startDate as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 300;

    const candles = await ReplayService.getReplaySessionCandles(symbol, timeframe, startDate, limit);
    res.json(candles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

replayRouter.post('/trade', AuthService.requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const trade = await ReplayService.saveReplayTrade(req.user!.userId, req.body);
    res.status(201).json(trade);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
