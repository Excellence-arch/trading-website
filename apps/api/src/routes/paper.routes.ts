import { Router, Response } from 'express';
import { AuthService, AuthenticatedRequest } from '../auth/auth-service.js';
import { PaperService } from '../paper/paper-service.js';

export const paperRouter = Router();

paperRouter.use(AuthService.requireAuth);

paperRouter.get('/account', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const account = await PaperService.getAccount(req.user!.userId);
    res.json(account);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

paperRouter.get('/positions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const positions = await PaperService.getPositions(req.user!.userId);
    res.json(positions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

paperRouter.post('/positions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { symbol, direction, quantity, stopLoss, takeProfit, leverage } = req.body;
    if (!symbol || !direction || !quantity) {
      res.status(400).json({ error: 'Symbol, direction, and quantity are required' });
      return;
    }
    const position = await PaperService.openPosition(req.user!.userId, {
      symbol,
      direction,
      quantity,
      stopLoss,
      takeProfit,
      leverage,
    });
    res.status(201).json(position);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

paperRouter.post('/positions/:id/close', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await PaperService.closePosition(req.user!.userId, req.params.id as string);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

paperRouter.post('/reset', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await PaperService.resetAccount(req.user!.userId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
