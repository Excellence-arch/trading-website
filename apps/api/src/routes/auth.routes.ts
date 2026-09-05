import { Router, Response } from 'express';
import { AuthService, AuthenticatedRequest } from '../auth/auth-service.js';
import { prisma } from '../db/prisma.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name are required' });
      return;
    }
    const result = await AuthService.register(email, password, name);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Login failed' });
  }
});

authRouter.get('/me', AuthService.requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        settings: true,
        watchlists: { include: { items: { orderBy: { sortOrder: 'asc' } } } },
      },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      settings: user.settings,
      watchlists: user.watchlists,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

authRouter.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});
