import { Router, Response } from 'express';
import { AuthService, AuthenticatedRequest } from '../auth/auth-service.js';
import { AnalyticsService } from '../analytics/analytics-service.js';

export const analyticsRouter = Router();

analyticsRouter.use(AuthService.requireAuth);

analyticsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await AnalyticsService.getAnalytics(req.user!.userId);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
