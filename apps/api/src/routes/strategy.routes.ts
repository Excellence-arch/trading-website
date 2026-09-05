import { Router, Response } from 'express';
import { AuthService, AuthenticatedRequest } from '../auth/auth-service.js';
import { prisma } from '../db/prisma.js';

export const strategyRouter = Router();

strategyRouter.use(AuthService.requireAuth);

strategyRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const strategies = await prisma.strategy.findMany({
      where: { userId: req.user!.userId },
      include: {
        trades: {
          select: { pnl: true, rMultiple: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = strategies.map((s) => {
      const closed = s.trades.filter((t) => t.status === 'CLOSED');
      const wins = closed.filter((t) => (t.pnl || 0) > 0);
      const totalPnl = closed.reduce((acc, t) => acc + (t.pnl || 0), 0);
      const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;

      return {
        id: s.id,
        name: s.name,
        description: s.description,
        color: s.color,
        tradeCount: s.trades.length,
        closedTradeCount: closed.length,
        winRate: Number(winRate.toFixed(1)),
        totalPnl: Number(totalPnl.toFixed(2)),
        createdAt: s.createdAt,
      };
    });

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

strategyRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, color } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Strategy name is required' });
      return;
    }
    const strategy = await prisma.strategy.create({
      data: {
        userId: req.user!.userId,
        name,
        description,
        color: color || '#3b82f6',
      },
    });
    res.status(201).json(strategy);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

strategyRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.strategy.deleteMany({
      where: { id: req.params.id as string, userId: req.user!.userId },
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
