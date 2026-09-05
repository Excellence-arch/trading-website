import { Router, Response } from 'express';
import { AuthService, AuthenticatedRequest } from '../auth/auth-service.js';
import { AIService } from '../ai/ai-service.js';

export const aiRouter = Router();

aiRouter.use(AuthService.requireAuth);

aiRouter.post('/trade-review/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const review = await AIService.reviewTrade(req.params.id as string, req.user!.userId);
    res.json(review);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

aiRouter.post('/coach', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { question } = req.body;
    if (!question) {
      res.status(400).json({ error: 'Question is required' });
      return;
    }
    const result = await AIService.queryCoach(req.user!.userId, question);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
