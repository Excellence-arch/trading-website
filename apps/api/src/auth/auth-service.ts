import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.js';
import { config } from '../config/index.js';

export interface AuthPayload {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export class AuthService {
  static async register(email: string, password: string, name: string) {
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        settings: {
          create: {
            defaultRiskPercent: 1.0,
            defaultTimeframe: '1h',
            currency: 'USD',
            timezone: 'UTC',
            demoMode: false,
          },
        },
        paperAccount: {
          create: {
            balance: 10000.0,
            equity: 10000.0,
            initialBalance: 10000.0,
          },
        },
        watchlists: {
          create: {
            name: 'Default Watchlist',
            items: {
              create: [
                { symbol: 'BTCUSDT', sortOrder: 0 },
                { symbol: 'ETHUSDT', sortOrder: 1 },
                { symbol: 'SOLUSDT', sortOrder: 2 },
                { symbol: 'BNBUSDT', sortOrder: 3 },
                { symbol: 'XRPUSDT', sortOrder: 4 },
                { symbol: 'DOGEUSDT', sortOrder: 5 },
              ],
            },
          },
        },
        strategies: {
          create: [
            { name: 'Breakout & Retest', description: 'Trading key horizontal level breakouts with volume confirmation', color: '#10b981' },
            { name: 'Trend Pullback', description: 'Entering on EMA 20/50 bounces in strong trending markets', color: '#3b82f6' },
            { name: 'Support / Resistance Reversal', description: 'Reversal setups near major multi-touch support/resistance zones', color: '#f59e0b' },
          ],
        },
      },
      include: {
        settings: true,
        watchlists: { include: { items: true } },
      },
    });

    const token = this.generateToken(user.id, user.email);
    return {
      user: { id: user.id, email: user.email, name: user.name },
      token,
    };
  }

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { settings: true },
    });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid email or password');
    }

    const token = this.generateToken(user.id, user.email);
    return {
      user: { id: user.id, email: user.email, name: user.name, settings: user.settings },
      token,
    };
  }

  static generateToken(userId: string, email: string): string {
    return jwt.sign({ userId, email }, config.jwtSecret, {
      expiresIn: '7d',
    });
  }

  static verifyToken(token: string): AuthPayload {
    return jwt.verify(token, config.jwtSecret) as AuthPayload;
  }

  static requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.headers.authorization;
      const cookieToken = req.cookies?.token;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookieToken;

      if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const payload = AuthService.verifyToken(token);
      req.user = payload;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  // Optional authentication: attaches user if token is valid, but allows guest access
  static optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.headers.authorization;
      const cookieToken = req.cookies?.token;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookieToken;

      if (token) {
        req.user = AuthService.verifyToken(token);
      }
    } catch {
      // ignore invalid token for optional auth
    }
    next();
  }
}
