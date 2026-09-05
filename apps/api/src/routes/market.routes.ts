import { Router } from 'express';
import type { Timeframe } from '@trading/types';
import { marketService } from '../market/market-service.js';

export const marketRouter = Router();

marketRouter.get('/symbols', async (req, res) => {
  try {
    const symbols = await marketService.getSupportedSymbols();
    res.json(symbols);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

marketRouter.get('/tickers', async (req, res) => {
  try {
    const tickers = await marketService.getAllTickers();
    res.json(tickers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

marketRouter.get('/ticker/:symbol', async (req, res) => {
  try {
    const ticker = await marketService.getTicker(req.params.symbol);
    if (!ticker) {
      res.status(404).json({ error: 'Ticker not found' });
      return;
    }
    res.json(ticker);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

marketRouter.get('/candles', async (req, res) => {
  try {
    const symbol = (req.query.symbol as string) || 'BTCUSDT';
    const timeframe = (req.query.timeframe as Timeframe) || '1h';
    const limit = req.query.limit ? Math.min(1000, parseInt(req.query.limit as string, 10)) : 1000;

    const candles = await marketService.getCandles(symbol, timeframe, limit);
    res.json(candles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

marketRouter.get('/status', (req, res) => {
  res.json({
    isDemo: marketService.isDemo,
    status: marketService.isDemo ? 'DEMO_MODE' : 'LIVE_BINANCE',
    timestamp: Date.now(),
  });
});

marketRouter.post('/demo-mode', (req, res) => {
  const { enabled } = req.body;
  marketService.setDemoMode(Boolean(enabled));
  res.json({ success: true, isDemo: marketService.isDemo });
});
