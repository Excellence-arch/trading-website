import { describe, it, expect } from 'vitest';
import {
  calculateRiskAmount,
  calculatePriceRisk,
  calculatePositionSize,
  calculateProfitLoss,
  calculateRMultiple,
  calculateFees,
  calculateNetProfitLoss,
  calculateDrawdown,
  calculateWinRate,
  calculateProfitFactor,
  calculateExpectancy,
} from '../src/index.js';

describe('Financial Calculations Library', () => {
  describe('calculateRiskAmount', () => {
    it('calculates 1% risk on $10,000 correctly as $100', () => {
      expect(calculateRiskAmount(10000, 1)).toBe(100);
    });

    it('calculates 2.5% risk on $25,000 correctly as $625', () => {
      expect(calculateRiskAmount(25000, 2.5)).toBe(625);
    });

    it('returns 0 for negative or zero balances', () => {
      expect(calculateRiskAmount(0, 1)).toBe(0);
      expect(calculateRiskAmount(-500, 2)).toBe(0);
    });
  });

  describe('calculatePriceRisk', () => {
    it('calculates Long price risk correctly', () => {
      expect(calculatePriceRisk(100000, 98000, 'LONG')).toBe(2000);
    });

    it('throws when Long stop loss is above entry', () => {
      expect(() => calculatePriceRisk(100000, 101000, 'LONG')).toThrow();
    });

    it('calculates Short price risk correctly', () => {
      expect(calculatePriceRisk(100000, 102000, 'SHORT')).toBe(2000);
    });

    it('throws when Short stop loss is below entry', () => {
      expect(() => calculatePriceRisk(100000, 99000, 'SHORT')).toThrow();
    });
  });

  describe('calculatePositionSize', () => {
    it('calculates correct position size matching prompt example', () => {
      // Prompt example: Account $10,000, Risk 1%, Entry $100,000, SL $98,000 -> Risk $100, Price risk $2,000/BTC, Size 0.05 BTC
      const result = calculatePositionSize({
        accountBalance: 10000,
        riskPercentage: 1,
        entryPrice: 100000,
        stopLossPrice: 98000,
        takeProfitPrice: 106000,
      });

      expect(result.maxRiskAmount).toBe(100);
      expect(result.positionSize).toBe(0.05);
      expect(result.notionalValue).toBe(5000);
      expect(result.potentialLoss).toBe(100);
      expect(result.potentialProfit).toBe(300);
      expect(result.riskRewardRatio).toBe(3);
    });
  });

  describe('calculateProfitLoss', () => {
    it('calculates Long profit correctly', () => {
      const result = calculateProfitLoss({
        direction: 'LONG',
        entryPrice: 104500,
        exitPrice: 107500,
        quantity: 0.1,
        feeRatePercentage: 0,
      });
      expect(result.grossPnl).toBe(300);
      expect(result.netPnl).toBe(300);
    });

    it('calculates Short profit correctly', () => {
      const result = calculateProfitLoss({
        direction: 'SHORT',
        entryPrice: 3000,
        exitPrice: 2700,
        quantity: 2,
        feeRatePercentage: 0,
      });
      expect(result.grossPnl).toBe(600);
      expect(result.netPnl).toBe(600);
    });

    it('subtracts fees correctly on both entry and exit legs', () => {
      const result = calculateProfitLoss({
        direction: 'LONG',
        entryPrice: 100000,
        exitPrice: 105000,
        quantity: 1,
        feeRatePercentage: 0.1, // 0.1% fee
      });
      // Notional entry = 100000, Notional exit = 105000. Total notional = 205000.
      // Fees = 205000 * 0.001 = 205.
      // Gross = 5000. Net = 5000 - 205 = 4795.
      expect(result.fees).toBe(205);
      expect(result.grossPnl).toBe(5000);
      expect(result.netPnl).toBe(4795);
    });
  });

  describe('calculateRMultiple', () => {
    it('calculates +3R for Long correctly', () => {
      const r = calculateRMultiple({
        direction: 'LONG',
        entryPrice: 100,
        stopLossPrice: 90, // Risk = 10
        exitPrice: 130, // Gain = 30 -> 3R
      });
      expect(r).toBe(3);
    });

    it('calculates -1R for Long stopped out', () => {
      const r = calculateRMultiple({
        direction: 'LONG',
        entryPrice: 100,
        stopLossPrice: 95,
        exitPrice: 95,
      });
      expect(r).toBe(-1);
    });

    it('calculates +2.5R for Short correctly', () => {
      const r = calculateRMultiple({
        direction: 'SHORT',
        entryPrice: 200,
        stopLossPrice: 210, // Risk = 10
        exitPrice: 175, // Gain = 25 -> 2.5R
      });
      expect(r).toBe(2.5);
    });
  });

  describe('calculateDrawdown', () => {
    it('calculates max dollar and percentage drawdown', () => {
      const equity = [10000, 12000, 11000, 9000, 13000, 12500];
      // Peak 12000, trough 9000 -> Max drawdown = 3000. % = 3000/12000 = 25%.
      const dd = calculateDrawdown(equity);
      expect(dd.maxDrawdown).toBe(3000);
      expect(dd.maxDrawdownPercent).toBe(25);
    });
  });

  describe('calculateWinRate, Profit Factor & Expectancy', () => {
    it('computes metrics on mixed trades correctly', () => {
      const pnls = [300, 150, -100, -100, 450]; // 3 wins (900 total), 2 losses (200 total)
      const wr = calculateWinRate(pnls);
      expect(wr.totalTrades).toBe(5);
      expect(wr.winningTrades).toBe(3);
      expect(wr.losingTrades).toBe(2);
      expect(wr.winRate).toBe(60);

      const pf = calculateProfitFactor(pnls);
      expect(pf).toBe(4.5); // 900 / 200 = 4.5

      const exp = calculateExpectancy(pnls);
      // Avg Win = 900/3 = 300. Avg Loss = 200/2 = 100.
      // Expectancy = (0.6 * 300) - (0.4 * 100) = 180 - 40 = 140.
      expect(exp.averageWin).toBe(300);
      expect(exp.averageLoss).toBe(100);
      expect(exp.expectancy).toBe(140);
    });
  });
});
