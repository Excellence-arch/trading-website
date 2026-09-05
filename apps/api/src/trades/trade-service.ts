import {
  calculateProfitLoss,
  calculateRMultiple,
  calculatePriceRisk,
} from '@trading/calculations';
import type { TradeDirection, TradeStatus, TradeSource, Timeframe } from '@trading/types';
import { prisma } from '../db/prisma.js';

export interface CreateTradeDTO {
  userId: string;
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  takeProfit: number;
  quantity: number;
  leverage?: number;
  status?: TradeStatus;
  source?: TradeSource;
  timeframe?: Timeframe;
  enteredAt?: string;
  exitedAt?: string;
  // Journal fields
  strategyId?: string;
  setupType?: string;
  reasonForEntry?: string;
  marketCondition?: string;
  emotionBefore?: string;
  emotionDuring?: string;
  emotionAfter?: string;
  mistakes?: string[];
  lessons?: string;
  notes?: string;
  chartSnapshot?: string;
}

export interface TradeFilterDTO {
  userId: string;
  symbol?: string;
  strategyId?: string;
  direction?: TradeDirection;
  status?: TradeStatus;
  outcome?: 'WIN' | 'LOSS' | 'BREAKEVEN';
  timeframe?: string;
  startDate?: string;
  endDate?: string;
  source?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'enteredAt' | 'pnl' | 'rMultiple' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export class TradeService {
  /**
   * Records a new trade, performs server-side recalculation of financial metrics,
   * and automatically creates the linked TradeJournal entry.
   */
  static async createTrade(dto: CreateTradeDTO) {
    const {
      userId,
      symbol,
      direction,
      entryPrice,
      exitPrice,
      stopLoss,
      takeProfit,
      quantity,
      leverage = 1,
      source = 'MANUAL',
      timeframe = '1h',
      enteredAt = new Date().toISOString(),
      exitedAt,
      strategyId,
      setupType,
      reasonForEntry,
      marketCondition,
      emotionBefore,
      emotionDuring,
      emotionAfter,
      mistakes = [],
      lessons,
      notes,
      chartSnapshot,
    } = dto;

    // Server-side validation of price inputs
    if (entryPrice <= 0 || stopLoss <= 0 || takeProfit <= 0 || quantity <= 0) {
      throw new Error('All trade prices and quantities must be positive numbers');
    }

    // Validate direction vs stop loss
    calculatePriceRisk(entryPrice, stopLoss, direction);

    // Calculate PnL and R-Multiple if exit price is provided
    let pnl: number | undefined;
    let rMultiple: number | undefined;
    let fees = 0;
    const isClosed = exitPrice !== undefined && exitPrice > 0;
    const status: TradeStatus = isClosed ? 'CLOSED' : 'OPEN';

    if (isClosed && exitPrice) {
      const pnlRes = calculateProfitLoss({
        direction,
        entryPrice,
        exitPrice,
        quantity,
        leverage,
        feeRatePercentage: 0.05,
      });
      pnl = pnlRes.netPnl;
      fees = pnlRes.fees;

      rMultiple = calculateRMultiple({
        direction,
        entryPrice,
        stopLossPrice: stopLoss,
        exitPrice,
      });
    }

    const trade = await prisma.trade.create({
      data: {
        userId,
        symbol: symbol.toUpperCase(),
        direction,
        entryPrice,
        exitPrice: isClosed ? exitPrice : null,
        stopLoss,
        takeProfit,
        quantity,
        leverage,
        fees,
        pnl,
        rMultiple,
        status,
        source,
        timeframe,
        enteredAt: new Date(enteredAt),
        exitedAt: exitedAt ? new Date(exitedAt) : isClosed ? new Date() : null,
        strategyId: strategyId || null,
        journal: {
          create: {
            setupType,
            reasonForEntry,
            marketCondition,
            emotionBefore,
            emotionDuring,
            emotionAfter,
            mistakesJson: JSON.stringify(mistakes),
            lessons,
            notes,
            chartSnapshot,
          },
        },
        executions: {
          create: [
            {
              side: direction === 'LONG' ? 'BUY' : 'SELL',
              price: entryPrice,
              quantity,
              fee: fees / 2,
              executedAt: new Date(enteredAt),
            },
            ...(isClosed && exitPrice
              ? [
                  {
                    side: direction === 'LONG' ? 'SELL' : 'BUY',
                    price: exitPrice,
                    quantity,
                    fee: fees / 2,
                    executedAt: exitedAt ? new Date(exitedAt) : new Date(),
                  },
                ]
              : []),
          ],
        },
      },
      include: {
        journal: true,
        strategy: true,
        executions: true,
        screenshots: true,
      },
    });

    return trade;
  }

  /**
   * Updates trade or closes an open trade with automatic PnL recalculation.
   */
  static async updateTrade(id: string, userId: string, data: Partial<CreateTradeDTO>) {
    const existing = await prisma.trade.findFirst({
      where: { id, userId },
      include: { journal: true },
    });
    if (!existing) throw new Error('Trade not found');

    const direction = (data.direction || existing.direction) as TradeDirection;
    const entryPrice = data.entryPrice !== undefined ? data.entryPrice : existing.entryPrice;
    const stopLoss = data.stopLoss !== undefined ? data.stopLoss : existing.stopLoss;
    const exitPrice = data.exitPrice !== undefined ? data.exitPrice : existing.exitPrice;
    const quantity = data.quantity !== undefined ? data.quantity : existing.quantity;
    const leverage = data.leverage !== undefined ? data.leverage : existing.leverage;

    let pnl = existing.pnl;
    let rMultiple = existing.rMultiple;
    let fees = existing.fees;
    let status = existing.status;

    if (exitPrice && exitPrice > 0) {
      status = 'CLOSED';
      const pnlRes = calculateProfitLoss({
        direction,
        entryPrice,
        exitPrice,
        quantity,
        leverage,
        feeRatePercentage: 0.05,
      });
      pnl = pnlRes.netPnl;
      fees = pnlRes.fees;
      rMultiple = calculateRMultiple({
        direction,
        entryPrice,
        stopLossPrice: stopLoss,
        exitPrice,
      });
    }

    const updated = await prisma.trade.update({
      where: { id },
      data: {
        symbol: data.symbol?.toUpperCase(),
        direction,
        entryPrice,
        exitPrice: exitPrice || null,
        stopLoss,
        takeProfit: data.takeProfit !== undefined ? data.takeProfit : existing.takeProfit,
        quantity,
        leverage,
        fees,
        pnl,
        rMultiple,
        status,
        strategyId: data.strategyId !== undefined ? data.strategyId : existing.strategyId,
        exitedAt: exitPrice && !existing.exitedAt ? new Date() : undefined,
        journal: {
          upsert: {
            create: {
              setupType: data.setupType,
              reasonForEntry: data.reasonForEntry,
              marketCondition: data.marketCondition,
              emotionBefore: data.emotionBefore,
              emotionDuring: data.emotionDuring,
              emotionAfter: data.emotionAfter,
              mistakesJson: JSON.stringify(data.mistakes || []),
              lessons: data.lessons,
              notes: data.notes,
              chartSnapshot: data.chartSnapshot,
            },
            update: {
              setupType: data.setupType,
              reasonForEntry: data.reasonForEntry,
              marketCondition: data.marketCondition,
              emotionBefore: data.emotionBefore,
              emotionDuring: data.emotionDuring,
              emotionAfter: data.emotionAfter,
              mistakesJson: data.mistakes ? JSON.stringify(data.mistakes) : undefined,
              lessons: data.lessons,
              notes: data.notes,
              chartSnapshot: data.chartSnapshot,
            },
          },
        },
      },
      include: {
        journal: true,
        strategy: true,
        screenshots: true,
      },
    });

    return updated;
  }

  /**
   * Queries trades with flexible multi-attribute filters, sorting, and pagination.
   */
  static async getTrades(filter: TradeFilterDTO) {
    const {
      userId,
      symbol,
      strategyId,
      direction,
      status,
      outcome,
      timeframe,
      startDate,
      endDate,
      source,
      search,
      page = 1,
      limit = 20,
      sortBy = 'enteredAt',
      sortOrder = 'desc',
    } = filter;

    const where: any = { userId };

    if (symbol) where.symbol = symbol.toUpperCase();
    if (strategyId) where.strategyId = strategyId;
    if (direction) where.direction = direction;
    if (status) where.status = status;
    if (timeframe) where.timeframe = timeframe;
    if (source) where.source = source;

    if (outcome === 'WIN') where.pnl = { gt: 0 };
    else if (outcome === 'LOSS') where.pnl = { lt: 0 };
    else if (outcome === 'BREAKEVEN') where.pnl = { equals: 0 };

    if (startDate || endDate) {
      where.enteredAt = {};
      if (startDate) where.enteredAt.gte = new Date(startDate);
      if (endDate) where.enteredAt.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { symbol: { contains: search } },
        { journal: { notes: { contains: search } } },
        { journal: { setupType: { contains: search } } },
        { journal: { reasonForEntry: { contains: search } } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      prisma.trade.count({ where }),
      prisma.trade.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          journal: true,
          strategy: true,
          screenshots: true,
        },
      }),
    ]);

    return {
      items: items.map((t) => ({
        ...t,
        journal: t.journal
          ? {
              ...t.journal,
              mistakes: JSON.parse(t.journal.mistakesJson || '[]'),
            }
          : null,
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves single trade review details.
   */
  static async getTradeById(id: string, userId: string) {
    const trade = await prisma.trade.findFirst({
      where: { id, userId },
      include: {
        journal: true,
        strategy: true,
        executions: true,
        screenshots: true,
        aiReview: true,
      },
    });
    if (!trade) return null;

    return {
      ...trade,
      journal: trade.journal
        ? {
            ...trade.journal,
            mistakes: JSON.parse(trade.journal.mistakesJson || '[]'),
          }
        : null,
    };
  }

  /**
   * Deletes a trade.
   */
  static async deleteTrade(id: string, userId: string) {
    const existing = await prisma.trade.findFirst({ where: { id, userId } });
    if (!existing) throw new Error('Trade not found');
    await prisma.trade.delete({ where: { id } });
    return { success: true };
  }
}
