import { Router, Response } from 'express';
import { AuthService, AuthenticatedRequest } from '../auth/auth-service.js';
import { prisma } from '../db/prisma.js';

export const watchlistRouter = Router();

watchlistRouter.use(AuthService.requireAuth);

watchlistRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    let watchlist = await prisma.watchlist.findFirst({
      where: { userId: req.user!.userId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!watchlist) {
      watchlist = await prisma.watchlist.create({
        data: {
          userId: req.user!.userId,
          name: 'My Watchlist',
          items: {
            create: [
              { symbol: 'BTCUSDT', sortOrder: 0 },
              { symbol: 'ETHUSDT', sortOrder: 1 },
              { symbol: 'SOLUSDT', sortOrder: 2 },
              { symbol: 'BNBUSDT', sortOrder: 3 },
              { symbol: 'XRPUSDT', sortOrder: 4 },
            ],
          },
        },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      });
    }

    res.json(watchlist);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

watchlistRouter.post('/item', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { symbol } = req.body;
    if (!symbol) {
      res.status(400).json({ error: 'Symbol is required' });
      return;
    }

    const watchlist = await prisma.watchlist.findFirst({
      where: { userId: req.user!.userId },
      include: { items: true },
    });

    if (!watchlist) {
      res.status(404).json({ error: 'Watchlist not found' });
      return;
    }

    const upper = symbol.toUpperCase();
    const existing = watchlist.items.find((i) => i.symbol === upper);
    if (existing) {
      res.json(existing);
      return;
    }

    const item = await prisma.watchlistItem.create({
      data: {
        watchlistId: watchlist.id,
        symbol: upper,
        sortOrder: watchlist.items.length,
      },
    });

    res.status(201).json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

watchlistRouter.delete('/item/:symbol', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const symbol = (req.params.symbol as string).toUpperCase();
    const watchlist = await prisma.watchlist.findFirst({
      where: { userId: req.user!.userId },
    });
    if (!watchlist) {
      res.status(404).json({ error: 'Watchlist not found' });
      return;
    }

    await prisma.watchlistItem.deleteMany({
      where: { watchlistId: watchlist.id, symbol },
    });

    res.json({ success: true, symbol });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
