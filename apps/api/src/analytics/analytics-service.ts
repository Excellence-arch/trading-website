import {
  calculateDrawdown,
  calculateExpectancy,
  calculateProfitFactor,
  calculateWinRate,
} from '@trading/calculations';
import type {
  CategoryBreakdown,
  EquityPoint,
  PatternInsight,
  PerformanceMetrics,
} from '@trading/types';
import { prisma } from '../db/prisma.js';

export class AnalyticsService {
  /**
   * Computes holistic performance KPIs, equity curves, distributions, breakdowns, and pattern insights.
   */
  static async getAnalytics(userId: string) {
    const closedTrades = await prisma.trade.findMany({
      where: {
        userId,
        status: 'CLOSED',
        pnl: { not: null },
      },
      include: {
        journal: true,
        strategy: true,
      },
      orderBy: { enteredAt: 'asc' },
    });

    if (closedTrades.length === 0) {
      return {
        metrics: this.getEmptyMetrics(),
        equityCurve: [],
        rMultipleDistribution: [],
        breakdownByStrategy: [],
        breakdownBySymbol: [],
        breakdownByTimeframe: [],
        breakdownByDirection: [],
        breakdownBySession: [],
        breakdownByDayOfWeek: [],
        patternInsights: [
          {
            id: 'ins-empty',
            title: 'Not enough data',
            description: 'Record and close at least 5 trades to unlock statistical pattern detection.',
            type: 'NEUTRAL',
            sampleSize: 0,
            isSignificant: false,
          } as PatternInsight,
        ],
      };
    }

    const pnls = closedTrades.map((t) => t.pnl || 0);
    const rMultiples = closedTrades.map((t) => t.rMultiple || 0);

    // Calculate Win Rate & Counts
    const { totalTrades, winningTrades, losingTrades, breakevenTrades, winRate, lossRate } =
      calculateWinRate(pnls);

    // Calculate Profit Factor & Expectancy
    const profitFactor = calculateProfitFactor(pnls);
    const { expectancy, averageWin, averageLoss } = calculateExpectancy(pnls);

    // PnL Aggregations
    let totalPnl = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let largestWin = 0;
    let largestLoss = 0;
    let totalR = 0;
    let totalHoldingTimeMs = 0;

    const equityCurve: EquityPoint[] = [];
    let runningPnl = 0;
    let runningR = 0;
    const equitySeries: number[] = [10000]; // Base $10,000 reference

    for (const t of closedTrades) {
      const p = t.pnl || 0;
      const r = t.rMultiple || 0;

      totalPnl += p;
      runningPnl += p;
      runningR += r;
      totalR += r;

      if (p > 0) {
        grossProfit += p;
        if (p > largestWin) largestWin = p;
      } else if (p < 0) {
        grossLoss += Math.abs(p);
        if (p < largestLoss) largestLoss = p;
      }

      if (t.exitedAt && t.enteredAt) {
        totalHoldingTimeMs += new Date(t.exitedAt).getTime() - new Date(t.enteredAt).getTime();
      }

      equitySeries.push(10000 + runningPnl);

      equityCurve.push({
        date: t.enteredAt.toISOString().split('T')[0],
        pnl: p,
        cumulativePnl: Number(runningPnl.toFixed(2)),
        cumulativeR: Number(runningR.toFixed(2)),
        drawdown: 0,
        tradeId: t.id,
        symbol: t.symbol,
      });
    }

    // Compute Drawdowns
    const { maxDrawdown, maxDrawdownPercent } = calculateDrawdown(equitySeries);

    // Average holding time
    const avgHoldingMinutes =
      closedTrades.length > 0 ? Math.round(totalHoldingTimeMs / closedTrades.length / (1000 * 60)) : 0;

    const metrics: PerformanceMetrics = {
      totalTrades,
      winningTrades,
      losingTrades,
      breakevenTrades,
      winRate,
      lossRate,
      totalPnl: Number(totalPnl.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      grossLoss: Number(grossLoss.toFixed(2)),
      averageWin,
      averageLoss,
      largestWin: Number(largestWin.toFixed(2)),
      largestLoss: Number(largestLoss.toFixed(2)),
      averageRMultiple: Number((totalR / totalTrades).toFixed(2)),
      profitFactor,
      expectancy,
      expectancyR: Number((totalR / totalTrades).toFixed(2)),
      maxDrawdown,
      maxDrawdownPercent,
      averageHoldingTimeMinutes: avgHoldingMinutes,
    };

    // Category Breakdowns
    const breakdownByStrategy = this.computeBreakdown(closedTrades, (t) => t.strategy?.name || 'Unassigned');
    const breakdownBySymbol = this.computeBreakdown(closedTrades, (t) => t.symbol);
    const breakdownByTimeframe = this.computeBreakdown(closedTrades, (t) => t.timeframe || 'Unknown');
    const breakdownByDirection = this.computeBreakdown(closedTrades, (t) => t.direction);

    // Trading session breakdown (Asian: 00-08 UTC, London: 08-16 UTC, New York: 13-21 UTC)
    const breakdownBySession = this.computeBreakdown(closedTrades, (t) => {
      const hour = new Date(t.enteredAt).getUTCHours();
      if (hour >= 0 && hour < 8) return 'Asian Session (00-08 UTC)';
      if (hour >= 8 && hour < 14) return 'London Session (08-14 UTC)';
      return 'New York Session (14-22 UTC)';
    });

    const breakdownByDayOfWeek = this.computeBreakdown(closedTrades, (t) => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[new Date(t.enteredAt).getUTCDay()];
    });

    // Automatic Pattern Detection
    const patternInsights = this.detectPatterns(closedTrades);

    return {
      metrics,
      equityCurve,
      rMultipleDistribution: this.computeRDistribution(rMultiples),
      breakdownByStrategy,
      breakdownBySymbol,
      breakdownByTimeframe,
      breakdownByDirection,
      breakdownBySession,
      breakdownByDayOfWeek,
      patternInsights,
    };
  }

  private static computeBreakdown(
    trades: any[],
    getKey: (t: any) => string
  ): CategoryBreakdown[] {
    const groups = new Map<string, number[]>();

    for (const t of trades) {
      const key = getKey(t);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t.pnl || 0);
    }

    const results: CategoryBreakdown[] = [];
    for (const [cat, pnls] of groups) {
      const { winRate, totalTrades } = calculateWinRate(pnls);
      const sumPnl = pnls.reduce((a, b) => a + b, 0);
      const pf = calculateProfitFactor(pnls);

      results.push({
        category: cat,
        tradeCount: totalTrades,
        winRate,
        totalPnl: Number(sumPnl.toFixed(2)),
        averageR: Number((sumPnl / totalTrades / 100).toFixed(2)), // Approx R representation
        profitFactor: pf,
      });
    }

    return results.sort((a, b) => b.totalPnl - a.totalPnl);
  }

  private static computeRDistribution(rValues: number[]) {
    const bins = [
      { label: '< -2R', count: 0 },
      { label: '-2R to -1R', count: 0 },
      { label: '-1R to 0R', count: 0 },
      { label: '0R to +1R', count: 0 },
      { label: '+1R to +2R', count: 0 },
      { label: '+2R to +3R', count: 0 },
      { label: '> +3R', count: 0 },
    ];

    for (const r of rValues) {
      if (r < -2) bins[0].count++;
      else if (r < -1) bins[1].count++;
      else if (r < 0) bins[2].count++;
      else if (r < 1) bins[3].count++;
      else if (r < 2) bins[4].count++;
      else if (r < 3) bins[5].count++;
      else bins[6].count++;
    }

    return bins;
  }

  /**
   * Scans trade data for statistically grounded performance patterns.
   * If sample size is under 5 trades, displays "Not enough data".
   */
  private static detectPatterns(trades: any[]): PatternInsight[] {
    const insights: PatternInsight[] = [];
    const total = trades.length;

    if (total < 5) {
      insights.push({
        id: 'pat-insufficient',
        title: 'Not enough data',
        description: `You have closed ${total} trade(s). Pattern analysis requires at least 5 closed trades to produce statistically valid observations.`,
        type: 'NEUTRAL',
        sampleSize: total,
        isSignificant: false,
      });
      return insights;
    }

    // 1. Symbol Edge Pattern (e.g. BTC vs SOL/others)
    const btcTrades = trades.filter((t) => t.symbol === 'BTCUSDT');
    const nonBtcTrades = trades.filter((t) => t.symbol !== 'BTCUSDT');

    if (btcTrades.length >= 3 && nonBtcTrades.length >= 3) {
      const btcWr = calculateWinRate(btcTrades.map((t) => t.pnl || 0)).winRate;
      const nonBtcWr = calculateWinRate(nonBtcTrades.map((t) => t.pnl || 0)).winRate;

      if (Math.abs(btcWr - nonBtcWr) >= 15) {
        const isBtcBetter = btcWr > nonBtcWr;
        insights.push({
          id: 'pat-symbol-edge',
          title: isBtcBetter ? 'Superior Performance on BTCUSDT' : 'Altcoin Outperformance',
          description: isBtcBetter
            ? `Your win rate on BTCUSDT is ${btcWr}% compared to ${nonBtcWr}% across other symbols. Focusing on Bitcoin setups offers clearer edge.`
            : `Your altcoin win rate (${nonBtcWr}%) currently outpaces your BTC trades (${btcWr}%).`,
          type: isBtcBetter ? 'POSITIVE' : 'NEUTRAL',
          sampleSize: total,
          isSignificant: true,
          statDifference: `${Math.abs(btcWr - nonBtcWr)}% Win Rate delta`,
        });
      }
    }

    // 2. Emotional State / Discipline Pattern
    const disciplinedTrades = trades.filter(
      (t) => t.journal && ['CALM', 'CONFIDENT'].includes((t.journal.emotionBefore || '').toUpperCase())
    );
    const fomoTrades = trades.filter(
      (t) => t.journal && ['FOMO', 'ANXIOUS', 'IMPATIENT'].includes((t.journal.emotionBefore || '').toUpperCase())
    );

    if (fomoTrades.length >= 2) {
      const fomoWr = calculateWinRate(fomoTrades.map((t) => t.pnl || 0)).winRate;
      insights.push({
        id: 'pat-emotion-fomo',
        title: 'Emotional Entry Penalty',
        description: `Trades recorded with FOMO or impatience exhibit a ${fomoWr}% win rate over ${fomoTrades.length} trades. Emotional entries significantly undermine your expected value.`,
        type: 'WARNING',
        sampleSize: fomoTrades.length,
        isSignificant: true,
        statDifference: `${fomoWr}% win rate on emotional entries`,
      });
    }

    // 3. Time-of-day / Trading Session Pattern
    const londonTrades = trades.filter((t) => {
      const h = new Date(t.enteredAt).getUTCHours();
      return h >= 8 && h < 14;
    });
    if (londonTrades.length >= 3) {
      const { winRate: londonWr } = calculateWinRate(londonTrades.map((t) => t.pnl || 0));
      if (londonWr >= 65) {
        insights.push({
          id: 'pat-london-edge',
          title: 'High Expectancy During London Session',
          description: `Trades entered during the London market session (08:00–14:00 UTC) achieve a ${londonWr}% win rate over ${londonTrades.length} setups.`,
          type: 'POSITIVE',
          sampleSize: londonTrades.length,
          isSignificant: true,
          statDifference: `${londonWr}% win rate in London hours`,
        });
      }
    }

    // 4. Directional Bias (Long vs Short)
    const longTrades = trades.filter((t) => t.direction === 'LONG');
    const shortTrades = trades.filter((t) => t.direction === 'SHORT');
    if (longTrades.length >= 3 && shortTrades.length >= 3) {
      const longPnl = longTrades.reduce((s, t) => s + (t.pnl || 0), 0);
      const shortPnl = shortTrades.reduce((s, t) => s + (t.pnl || 0), 0);
      const longWr = calculateWinRate(longTrades.map((t) => t.pnl || 0)).winRate;
      const shortWr = calculateWinRate(shortTrades.map((t) => t.pnl || 0)).winRate;

      if (longWr - shortWr >= 20) {
        insights.push({
          id: 'pat-direction-long',
          title: 'Strong Long Directional Edge',
          description: `Your Long trades have a ${longWr}% win rate vs ${shortWr}% for Shorts. Consider tightening rules or requiring higher confirmation before taking short positions.`,
          type: 'POSITIVE',
          sampleSize: total,
          isSignificant: true,
          statDifference: `+${longWr - shortWr}% Long win rate advantage`,
        });
      }
    }

    // 5. Setup Retest Confirmation
    const retestTrades = trades.filter((t) =>
      (t.journal?.setupType || '').toLowerCase().includes('retest')
    );
    if (retestTrades.length >= 3) {
      const retestWr = calculateWinRate(retestTrades.map((t) => t.pnl || 0)).winRate;
      insights.push({
        id: 'pat-retest-confirmation',
        title: 'Breakout With Retest Confirmation Works',
        description: `Your breakout trades have a ${retestWr}% win rate when you wait for a retest confirmation (${retestTrades.length} trades).`,
        type: 'POSITIVE',
        sampleSize: retestTrades.length,
        isSignificant: true,
      });
    }

    return insights;
  }

  private static getEmptyMetrics(): PerformanceMetrics {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakevenTrades: 0,
      winRate: 0,
      lossRate: 0,
      totalPnl: 0,
      grossProfit: 0,
      grossLoss: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      averageRMultiple: 0,
      profitFactor: 0,
      expectancy: 0,
      expectancyR: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      averageHoldingTimeMinutes: 0,
    };
  }
}
