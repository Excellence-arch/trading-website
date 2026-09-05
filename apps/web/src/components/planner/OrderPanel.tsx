'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Coins,
  DollarSign,
  HelpCircle,
  Percent,
  ShieldAlert,
  Sparkles,
  Target,
} from 'lucide-react';
import type { TradeDirection } from '@trading/types';
import { calculatePositionSize } from '@trading/calculations';
import { useMarket } from '../../context/MarketContext';
import { formatNumber, formatPercent, formatPrice } from '../../lib/utils';
import { ApiClient } from '../../lib/api';

interface OrderPanelProps {
  onTradePlanChange?: (plan: {
    direction: TradeDirection;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    visible: boolean;
  }) => void;
  onOpenJournalModal: (tradeData: any) => void;
  onPositionOpened?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function OrderPanel({
  onTradePlanChange,
  onOpenJournalModal,
  onPositionOpened,
  isCollapsed = false,
  onToggleCollapse,
}: OrderPanelProps) {
  const { currentSymbol, currentTicker } = useMarket();

  // Inputs
  const [direction, setDirection] = useState<TradeDirection>('LONG');
  const [balance, setBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [stopLoss, setStopLoss] = useState<number>(0);
  const [takeProfit, setTakeProfit] = useState<number>(0);
  const [leverage, setLeverage] = useState<number>(1);
  const [feeRate, setFeeRate] = useState<number>(0.05);

  const [activeTab, setActiveTab] = useState<'planner' | 'calculator'>('planner');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Sync initial entry, SL, TP when symbol or ticker changes
  useEffect(() => {
    if (currentTicker && entryPrice === 0) {
      const price = currentTicker.price;
      setEntryPrice(price);
      if (direction === 'LONG') {
        setStopLoss(Number((price * 0.985).toFixed(2)));
        setTakeProfit(Number((price * 1.045).toFixed(2)));
      } else {
        setStopLoss(Number((price * 1.015).toFixed(2)));
        setTakeProfit(Number((price * 0.955).toFixed(2)));
      }
    }
  }, [currentTicker, direction, entryPrice]);

  // Notify chart of planner overlay lines
  useEffect(() => {
    if (entryPrice > 0 && stopLoss > 0 && takeProfit > 0) {
      onTradePlanChange?.({
        direction,
        entryPrice,
        stopLoss,
        takeProfit,
        visible: true,
      });
    }
  }, [direction, entryPrice, stopLoss, takeProfit, onTradePlanChange]);

  // Compute live calculations using pure decimal library
  let calcResult = null;
  try {
    if (balance > 0 && riskPercent > 0 && entryPrice > 0 && stopLoss > 0) {
      calcResult = calculatePositionSize({
        accountBalance: balance,
        riskPercentage: riskPercent,
        entryPrice,
        stopLossPrice: stopLoss,
        takeProfitPrice: takeProfit,
        leverage,
        feeRatePercentage: feeRate,
      });
    }
  } catch {
    calcResult = null;
  }

  // Handle direct paper trade execution
  const handlePlacePaperOrder = async () => {
    if (!calcResult || calcResult.positionSize <= 0) return;
    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      await ApiClient.openPaperPosition({
        symbol: currentSymbol,
        direction,
        quantity: calcResult.positionSize,
        stopLoss,
        takeProfit,
        leverage,
      });
      setFeedbackMessage('Paper position opened successfully!');
      onPositionOpened?.();
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Failed to open paper position');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open the detailed Journal modal
  const handleOpenJournal = () => {
    if (!calcResult) return;
    onOpenJournalModal({
      symbol: currentSymbol,
      direction,
      entryPrice,
      stopLoss,
      takeProfit,
      quantity: calcResult.positionSize,
      leverage,
      pnl: calcResult.potentialProfit,
      rMultiple: calcResult.riskRewardRatio,
    });
  };

  if (isCollapsed) {
    return (
      <div className="w-9 bg-surface border-l border-border flex flex-col items-center py-2 select-none h-full z-10 transition-all">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-surface-elevated rounded transition mb-3"
          title="Expand Order Planner"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <Target className="w-4 h-4 text-brand" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest [writing-mode:vertical-lr] rotate-180">
            Order Planner
          </span>
          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded mt-2">
            {direction}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-surface border-l border-border flex flex-col h-full select-none text-xs transition-all">
      {/* Header Tabs */}
      <div className="flex items-center border-b border-border bg-surface-subtle">
        <button
          onClick={() => setActiveTab('planner')}
          className={`flex-1 py-2.5 text-center font-bold tracking-wide transition flex items-center justify-center gap-1.5 ${
            activeTab === 'planner'
              ? 'text-white border-b-2 border-brand bg-surface'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Trade Planner</span>
        </button>

        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex-1 py-2.5 text-center font-bold tracking-wide transition flex items-center justify-center gap-1.5 ${
            activeTab === 'calculator'
              ? 'text-white border-b-2 border-brand bg-surface'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Position Sizer</span>
        </button>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-2 text-slate-400 hover:text-white hover:bg-surface-elevated transition border-l border-border"
            title="Collapse Order Planner"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono">
        {/* Direction Toggle: LONG vs SHORT */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-subtle border border-border rounded-lg">
          <button
            onClick={() => {
              setDirection('LONG');
              if (currentTicker) {
                setStopLoss(Number((currentTicker.price * 0.985).toFixed(2)));
                setTakeProfit(Number((currentTicker.price * 1.045).toFixed(2)));
              }
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-bold transition ${
              direction === 'LONG'
                ? 'bg-bullish text-white shadow-md shadow-bullish/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>LONG</span>
          </button>

          <button
            onClick={() => {
              setDirection('SHORT');
              if (currentTicker) {
                setStopLoss(Number((currentTicker.price * 1.015).toFixed(2)));
                setTakeProfit(Number((currentTicker.price * 0.955).toFixed(2)));
              }
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-bold transition ${
              direction === 'SHORT'
                ? 'bg-bearish text-white shadow-md shadow-bearish/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>SHORT</span>
          </button>
        </div>

        {/* Account Balance & Risk Input */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-sans font-semibold flex items-center gap-1 mb-1">
              <DollarSign className="w-3 h-3 text-slate-500" />
              <span>Balance</span>
            </label>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
              className="w-full bg-surface-subtle border border-border rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase font-sans font-semibold flex items-center gap-1 mb-1">
              <Percent className="w-3 h-3 text-slate-500" />
              <span>Risk %</span>
            </label>
            <input
              type="number"
              step="0.25"
              value={riskPercent}
              onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
              className="w-full bg-surface-subtle border border-border rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        {/* Entry Price */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-blue-400 uppercase font-sans font-semibold">Entry Price</label>
            {currentTicker && (
              <button
                onClick={() => setEntryPrice(currentTicker.price)}
                className="text-[10px] text-slate-400 hover:text-white underline font-sans"
              >
                Use Current (${currentTicker.price.toFixed(2)})
              </button>
            )}
          </div>
          <input
            type="number"
            step="any"
            value={entryPrice || ''}
            onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
            className="w-full bg-surface-subtle border border-blue-500/30 rounded px-2 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Stop Loss & Take Profit */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-red-400 uppercase font-sans font-semibold block mb-1">
              Stop Loss
            </label>
            <input
              type="number"
              step="any"
              value={stopLoss || ''}
              onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
              className="w-full bg-surface-subtle border border-red-500/30 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="text-[10px] text-emerald-400 uppercase font-sans font-semibold block mb-1">
              Take Profit
            </label>
            <input
              type="number"
              step="any"
              value={takeProfit || ''}
              onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
              className="w-full bg-surface-subtle border border-emerald-500/30 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Leverage & Fees (Shown in Calculator tab or expandable) */}
        {activeTab === 'calculator' && (
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-sans font-semibold block mb-1">
                Leverage
              </label>
              <select
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value, 10))}
                className="w-full bg-surface-subtle border border-border rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-brand"
              >
                <option value={1}>1x (Spot)</option>
                <option value={2}>2x</option>
                <option value={5}>5x</option>
                <option value={10}>10x</option>
                <option value={20}>20x</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-sans font-semibold block mb-1">
                Fee Rate %
              </label>
              <input
                type="number"
                step="0.01"
                value={feeRate}
                onChange={(e) => setFeeRate(parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-subtle border border-border rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-brand"
              />
            </div>
          </div>
        )}

        {/* Real-time Calculated Metrics Box */}
        {calcResult ? (
          <div className="bg-surface-subtle border border-border rounded-lg p-2.5 space-y-1.5 mt-2">
            <div className="flex items-center justify-between text-[11px] pb-1 border-b border-border/60">
              <span className="text-slate-400">Risk / Reward</span>
              <span className="font-bold text-white text-xs bg-brand/20 text-brand px-1.5 py-0.5 rounded">
                1 : {calcResult.riskRewardRatio}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Position Size</span>
              <span className="font-semibold text-white">
                {calcResult.positionSize} {currentSymbol.replace('USDT', '')}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Notional Value</span>
              <span className="text-slate-300">${formatNumber(calcResult.notionalValue)}</span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Max Dollar Risk</span>
              <span className="font-semibold text-bearish">-${formatNumber(calcResult.maxRiskAmount)}</span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Potential Profit</span>
              <span className="font-semibold text-bullish">+${formatNumber(calcResult.potentialProfit)}</span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Move to Stop / Target</span>
              <span className="text-slate-400">
                {calcResult.percentageMoveToStop}% / {calcResult.percentageMoveToTarget}%
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] pt-1 border-t border-border/40 text-slate-500">
              <span>Estimated Fees</span>
              <span>${formatNumber(calcResult.estimatedFees, 2)}</span>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-surface-subtle border border-border rounded-lg text-slate-500 text-center text-xs">
            Enter valid price parameters to compute sizing & risk/reward.
          </div>
        )}

        {/* Feedback Message */}
        {feedbackMessage && (
          <div className="p-2 rounded bg-brand/10 border border-brand/30 text-brand text-xs text-center font-sans font-semibold">
            {feedbackMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={handlePlacePaperOrder}
            disabled={!calcResult || isSubmitting}
            className={`w-full py-2.5 rounded-md font-sans font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-lg ${
              direction === 'LONG'
                ? 'bg-bullish hover:bg-bullish-hover text-white shadow-bullish/20'
                : 'bg-bearish hover:bg-bearish-hover text-white shadow-bearish/20'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Coins className="w-4 h-4" />
            <span>Place Paper {direction} Order</span>
          </button>

          <button
            onClick={handleOpenJournal}
            disabled={!calcResult}
            className="w-full bg-surface-elevated hover:bg-surface-hover border border-border-strong text-slate-200 font-sans font-semibold py-2 rounded-md text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
          >
            <BookOpen className="w-3.5 h-3.5 text-brand" />
            <span>Record to Trade Journal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
