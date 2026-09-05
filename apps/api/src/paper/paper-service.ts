import {
  calculateProfitLoss,
  calculateRMultiple,
} from '@trading/calculations';
import type { PaperAccount, PaperPosition, TradeDirection } from '@trading/types';
import { prisma } from '../db/prisma.js';
import { marketService } from '../market/market-service.js';

export class PaperService {
  static async getAccount(userId: string): Promise<PaperAccount> {
    let account = await prisma.paperAccount.findUnique({
      where: { userId },
      include: {
        positions: true,
      },
    });

    if (!account) {
      account = await prisma.paperAccount.create({
        data: {
          userId,
          balance: 10000.0,
          equity: 10000.0,
          initialBalance: 10000.0,
        },
        include: { positions: true },
      });
    }

    // Recompute live equity from open positions and latest market tickers
    let totalUnrealizedPnl = 0;
    const positions = account.positions;

    for (const pos of positions) {
      const ticker = await marketService.getTicker(pos.symbol);
      const currentPrice = ticker ? ticker.price : pos.currentPrice;

      const pnlRes = calculateProfitLoss({
        direction: pos.direction as TradeDirection,
        entryPrice: pos.entryPrice,
        exitPrice: currentPrice,
        quantity: pos.quantity,
        leverage: pos.leverage,
        feeRatePercentage: 0.05,
      });

      totalUnrealizedPnl += pnlRes.netPnl;

      // Update current price & unrealized in DB asynchronously
      prisma.paperPosition
        .update({
          where: { id: pos.id },
          data: {
            currentPrice,
            unrealizedPnl: pnlRes.netPnl,
          },
        })
        .catch(() => { });
    }

    const equity = Number((account.balance + totalUnrealizedPnl).toFixed(2));
    const realizedPnl = Number((equity - account.initialBalance).toFixed(2));

    return {
      id: account.id,
      userId: account.userId,
      balance: Number(account.balance.toFixed(2)),
      equity,
      initialBalance: account.initialBalance,
      unrealizedPnl: Number(totalUnrealizedPnl.toFixed(2)),
      realizedPnl,
      positionsCount: positions.length,
    };
  }

  static async getPositions(userId: string): Promise<PaperPosition[]> {
    const account = await prisma.paperAccount.findUnique({ where: { userId } });
    if (!account) return [];

    const positions = await prisma.paperPosition.findMany({
      where: { accountId: account.id },
      orderBy: { enteredAt: 'desc' },
    });

    const results: PaperPosition[] = [];
    for (const p of positions) {
      const ticker = await marketService.getTicker(p.symbol);
      const currentPrice = ticker ? ticker.price : p.currentPrice;

      const pnlRes = calculateProfitLoss({
        direction: p.direction as TradeDirection,
        entryPrice: p.entryPrice,
        exitPrice: currentPrice,
        quantity: p.quantity,
        leverage: p.leverage,
        feeRatePercentage: 0.05,
      });

      results.push({
        id: p.id,
        accountId: p.accountId,
        symbol: p.symbol,
        direction: p.direction as TradeDirection,
        entryPrice: p.entryPrice,
        currentPrice,
        quantity: p.quantity,
        stopLoss: p.stopLoss || undefined,
        takeProfit: p.takeProfit || undefined,
        leverage: p.leverage,
        margin: p.margin,
        unrealizedPnl: pnlRes.netPnl,
        unrealizedPnlPercent: pnlRes.returnPercentage,
        enteredAt: p.enteredAt.toISOString(),
      });
    }

    return results;
  }

  /**
   * Opens a simulated market position.
   */
  static async openPosition(
    userId: string,
    params: {
      symbol: string;
      direction: TradeDirection;
      quantity: number;
      stopLoss?: number;
      takeProfit?: number;
      leverage?: number;
    }
  ) {
    const { symbol, direction, quantity, stopLoss, takeProfit, leverage = 1 } = params;
    const account = await this.getAccount(userId);

    const ticker = await marketService.getTicker(symbol);
    if (!ticker) throw new Error(`Market ticker unavailable for ${symbol}`);

    const entryPrice = ticker.price;
    const notional = entryPrice * quantity;
    const marginRequired = notional / leverage;

    if (marginRequired > account.balance) {
      throw new Error(`Insufficient paper balance ($${account.balance.toFixed(2)}) for required margin ($${marginRequired.toFixed(2)})`);
    }

    // Default SL/TP if not provided
    const sl = stopLoss || (direction === 'LONG' ? entryPrice * 0.98 : entryPrice * 1.02);
    const tp = takeProfit || (direction === 'LONG' ? entryPrice * 1.06 : entryPrice * 0.94);

    const position = await prisma.paperPosition.create({
      data: {
        accountId: account.id,
        symbol: symbol.toUpperCase(),
        direction,
        entryPrice,
        currentPrice: entryPrice,
        quantity,
        stopLoss: sl,
        takeProfit: tp,
        leverage,
        margin: marginRequired,
        unrealizedPnl: 0,
      },
    });

    return position;
  }

  /**
   * Closes a paper position, updates account balance, and automatically writes the trade to the journal.
   */
  static async closePosition(userId: string, positionId: string) {
    const account = await prisma.paperAccount.findUnique({ where: { userId } });
    if (!account) throw new Error('Paper account not found');

    const pos = await prisma.paperPosition.findFirst({
      where: { id: positionId, accountId: account.id },
    });
    if (!pos) throw new Error('Position not found');

    const ticker = await marketService.getTicker(pos.symbol);
    const exitPrice = ticker ? ticker.price : pos.currentPrice;

    const pnlRes = calculateProfitLoss({
      direction: pos.direction as TradeDirection,
      entryPrice: pos.entryPrice,
      exitPrice,
      quantity: pos.quantity,
      leverage: pos.leverage,
      feeRatePercentage: 0.05,
    });

    const rMultiple = pos.stopLoss
      ? calculateRMultiple({
        direction: pos.direction as TradeDirection,
        entryPrice: pos.entryPrice,
        stopLossPrice: pos.stopLoss,
        exitPrice,
      })
      : 0;

    // Remove paper position & update balance
    await prisma.$transaction([
      prisma.paperPosition.delete({ where: { id: pos.id } }),
      prisma.paperAccount.update({
        where: { id: account.id },
        data: {
          balance: { increment: pnlRes.netPnl },
        },
      }),
    ]);

    // Automatically create Journal Entry for the paper trade
    const journaledTrade = await prisma.trade.create({
      data: {
        userId,
        symbol: pos.symbol,
        direction: pos.direction,
        entryPrice: pos.entryPrice,
        exitPrice,
        stopLoss: pos.stopLoss || pos.entryPrice * 0.98,
        takeProfit: pos.takeProfit || pos.entryPrice * 1.06,
        quantity: pos.quantity,
        leverage: pos.leverage,
        fees: pnlRes.fees,
        pnl: pnlRes.netPnl,
        rMultiple,
        status: 'CLOSED',
        source: 'PAPER',
        enteredAt: pos.enteredAt,
        exitedAt: new Date(),
        journal: {
          create: {
            setupType: 'Paper Simulation Trade',
            reasonForEntry: 'Simulated market practice',
            marketCondition: 'ACTIVE_SESSION',
            emotionBefore: 'CALM',
            emotionDuring: 'DISCIPLINED',
            emotionAfter: pnlRes.netPnl >= 0 ? 'SATISFIED' : 'RELIEVED',
            mistakesJson: '[]',
            lessons: 'Practiced position sizing and disciplined execution.',
            notes: `Closed simulated position with P&L of $${pnlRes.netPnl.toFixed(2)} (${rMultiple >= 0 ? '+' : ''}${rMultiple}R).`,
          },
        },
      },
      include: { journal: true },
    });

    return {
      success: true,
      closedPosition: pos,
      trade: journaledTrade,
      pnl: pnlRes.netPnl,
    };
  }

  /**
   * Resets the paper account back to $10,000.
   */
  static async resetAccount(userId: string, initialBalance = 10000.0) {
    const account = await prisma.paperAccount.findUnique({ where: { userId } });
    if (!account) throw new Error('Paper account not found');

    await prisma.$transaction([
      prisma.paperPosition.deleteMany({ where: { accountId: account.id } }),
      prisma.paperOrder.deleteMany({ where: { accountId: account.id } }),
      prisma.paperAccount.update({
        where: { id: account.id },
        data: {
          balance: initialBalance,
          equity: initialBalance,
          initialBalance,
        },
      }),
    ]);

    return { success: true, balance: initialBalance };
  }
}
