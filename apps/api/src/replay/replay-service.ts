import type { Candle, Timeframe, TradeDirection } from '@trading/types';
import { calculateProfitLoss, calculateRMultiple } from '@trading/calculations';
import { marketService } from '../market/market-service.js';
import { prisma } from '../db/prisma.js';

export class ReplayService {
  /**
   * Retrieves historical candles starting around the specified date for replay.
   */
  static async getReplaySessionCandles(
    symbol: string,
    timeframe: Timeframe = '1h',
    startDate?: string,
    limit: number = 300
  ): Promise<Candle[]> {
    // Get full candles from market service
    const candles = await marketService.getCandles(symbol, timeframe, limit);

    if (startDate) {
      const targetTime = new Date(startDate).getTime();
      // Filter or slice to ensure we have historical context leading up to that date
      const index = candles.findIndex((c) => c.timestamp >= targetTime);
      if (index !== -1) {
        return candles.slice(Math.max(0, index - 50));
      }
    }

    return candles;
  }

  /**
   * Saves a replay simulation trade tagged specifically with source='REPLAY'.
   */
  static async saveReplayTrade(
    userId: string,
    data: {
      symbol: string;
      direction: TradeDirection;
      entryPrice: number;
      exitPrice: number;
      stopLoss: number;
      takeProfit: number;
      quantity: number;
      timeframe?: Timeframe;
    }
  ) {
    const { symbol, direction, entryPrice, exitPrice, stopLoss, takeProfit, quantity, timeframe = '1h' } = data;

    const pnlRes = calculateProfitLoss({
      direction,
      entryPrice,
      exitPrice,
      quantity,
      feeRatePercentage: 0.05,
    });

    const rMultiple = calculateRMultiple({
      direction,
      entryPrice,
      stopLossPrice: stopLoss,
      exitPrice,
    });

    const trade = await prisma.trade.create({
      data: {
        userId,
        symbol: symbol.toUpperCase(),
        direction,
        entryPrice,
        exitPrice,
        stopLoss,
        takeProfit,
        quantity,
        fees: pnlRes.fees,
        pnl: pnlRes.netPnl,
        rMultiple,
        status: 'CLOSED',
        source: 'REPLAY',
        timeframe,
        enteredAt: new Date(),
        exitedAt: new Date(),
        journal: {
          create: {
            setupType: 'Historical Replay Practice',
            notes: `Simulated trade during historical chart replay. P&L: $${pnlRes.netPnl.toFixed(2)} (${rMultiple >= 0 ? '+' : ''}${rMultiple}R).`,
            mistakesJson: '[]',
          },
        },
      },
    });

    return trade;
  }
}
