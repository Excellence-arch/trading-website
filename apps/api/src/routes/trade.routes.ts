import { Router, Response } from 'express';
import { AuthService, AuthenticatedRequest } from '../auth/auth-service.js';
import { TradeService } from '../trades/trade-service.js';
import { prisma } from '../db/prisma.js';

export const tradeRouter = Router();

tradeRouter.use(AuthService.requireAuth);

tradeRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const trade = await TradeService.createTrade({
      ...req.body,
      userId: req.user!.userId,
    });
    res.status(201).json(trade);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

tradeRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const result = await TradeService.getTrades({
      userId: req.user!.userId,
      symbol: req.query.symbol as string,
      strategyId: req.query.strategyId as string,
      direction: req.query.direction as any,
      status: req.query.status as any,
      outcome: req.query.outcome as any,
      timeframe: req.query.timeframe as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      source: req.query.source as string,
      search: req.query.search as string,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any,
      page,
      limit,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

tradeRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const trade = await TradeService.getTradeById(req.params.id as string, req.user!.userId);
    if (!trade) {
      res.status(404).json({ error: 'Trade not found' });
      return;
    }
    res.json(trade);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

tradeRouter.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await TradeService.updateTrade(req.params.id as string, req.user!.userId, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

tradeRouter.delete('/clear-all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userTrades = await prisma.trade.findMany({
      where: { userId: req.user!.userId },
      select: { id: true },
    });
    const tradeIds = userTrades.map((t) => t.id);
    if (tradeIds.length > 0) {
      await prisma.tradeScreenshot.deleteMany({ where: { tradeId: { in: tradeIds } } });
      await prisma.tradeJournal.deleteMany({ where: { tradeId: { in: tradeIds } } });
      await prisma.tradeNote.deleteMany({ where: { tradeId: { in: tradeIds } } });
      await prisma.tradeTag.deleteMany({ where: { tradeId: { in: tradeIds } } });
      await prisma.tradeExecution.deleteMany({ where: { tradeId: { in: tradeIds } } });
      await prisma.aIReview.deleteMany({ where: { tradeId: { in: tradeIds } } });
      await prisma.trade.deleteMany({ where: { id: { in: tradeIds } } });
    }
    res.json({ message: 'All trades cleared', count: tradeIds.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

tradeRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await TradeService.deleteTrade(req.params.id as string, req.user!.userId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

tradeRouter.post('/:id/screenshots', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { url, type = 'SNAPSHOT', caption } = req.body;
    if (!url) {
      res.status(400).json({ error: 'Screenshot URL or base64 data required' });
      return;
    }

    const trade = await prisma.trade.findFirst({
      where: { id: req.params.id as string, userId: req.user!.userId },
    });
    if (!trade) {
      res.status(404).json({ error: 'Trade not found' });
      return;
    }

    const screenshot = await prisma.tradeScreenshot.create({
      data: {
        tradeId: trade.id,
        type,
        url,
        caption,
      },
    });

    res.status(201).json(screenshot);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
