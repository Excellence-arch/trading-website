import { Router, Response } from 'express';
import { AuthService, AuthenticatedRequest } from '../auth/auth-service.js';
import { DrawingService } from '../drawings/drawing-service.js';

export const drawingRouter = Router();

drawingRouter.use(AuthService.requireAuth);

drawingRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || 'BTCUSDT';
    const timeframe = req.query.timeframe as any;
    const drawings = await DrawingService.getDrawings(req.user!.userId, symbol, timeframe);
    res.json(drawings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

drawingRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const drawing = await DrawingService.saveDrawing(req.user!.userId, req.body);
    res.status(201).json(drawing);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

drawingRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await DrawingService.deleteDrawing(req.params.id as string, req.user!.userId);
    res.json({ success });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
