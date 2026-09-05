'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  DollarSign,
  Heart,
  Smile,
  Sparkles,
  Tag,
  Target,
  X,
} from 'lucide-react';
import type { TradeDirection } from '@trading/types';
import { calculateProfitLoss, calculateRMultiple } from '@trading/calculations';
import { ApiClient } from '../../lib/api';
import { formatNumber, formatPercent, formatPrice, formatRMultiple } from '../../lib/utils';

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    symbol: string;
    direction: TradeDirection;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    exitPrice?: number;
    quantity: number;
    leverage?: number;
    chartSnapshot?: string;
  } | null;
  onTradeSaved?: () => void;
}

export function JournalModal({
  isOpen,
  onClose,
  initialData,
  onTradeSaved,
}: JournalModalProps) {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [direction, setDirection] = useState<TradeDirection>('LONG');
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [stopLoss, setStopLoss] = useState<number>(0);
  const [takeProfit, setTakeProfit] = useState<number>(0);
  const [exitPrice, setExitPrice] = useState<number | undefined>(undefined);
  const [quantity, setQuantity] = useState<number>(0.1);
  const [leverage, setLeverage] = useState<number>(1);

  // Journal details
  const [strategies, setStrategies] = useState<any[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
  const [setupType, setSetupType] = useState<string>('Breakout & Retest');
  const [reasonForEntry, setReasonForEntry] = useState<string>('');
  const [marketCondition, setMarketCondition] = useState<string>('TRENDING');
  const [emotionBefore, setEmotionBefore] = useState<string>('CONFIDENT');
  const [emotionDuring, setEmotionDuring] = useState<string>('CALM');
  const [emotionAfter, setEmotionAfter] = useState<string>('SATISFIED');
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [lessons, setLessons] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const availableMistakes = [
    'Early Entry / No Confirmation',
    'Chased Price (FOMO)',
    'Moved Stop Loss Further',
    'Exited Too Early',
    'Oversized Position',
    'Fought High Timeframe Trend',
    'Revenge Traded',
    'Poor Risk/Reward (< 1:2)',
  ];

  useEffect(() => {
    if (isOpen) {
      ApiClient.getStrategies()
        .then((strats) => {
          if (Array.isArray(strats)) {
            setStrategies(strats);
            if (strats.length > 0 && !selectedStrategyId) {
              setSelectedStrategyId(strats[0].id);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setSymbol(initialData.symbol);
      setDirection(initialData.direction);
      setEntryPrice(initialData.entryPrice);
      setStopLoss(initialData.stopLoss);
      setTakeProfit(initialData.takeProfit);
      setExitPrice(initialData.exitPrice || initialData.takeProfit); // default exit at target if closed
      setQuantity(initialData.quantity || 0.1);
      setLeverage(initialData.leverage || 1);
    }
  }, [initialData]);

  if (!isOpen) return null;

  // Real-time automatic metrics generation
  let pnl = 0;
  let rMultiple = 0;
  let returnPct = 0;
  const isClosed = exitPrice !== undefined && exitPrice > 0;

  try {
    if (entryPrice > 0 && isClosed && exitPrice) {
      const res = calculateProfitLoss({
        direction,
        entryPrice,
        exitPrice,
        quantity,
        leverage,
        feeRatePercentage: 0.05,
      });
      pnl = res.netPnl;
      returnPct = res.returnPercentage;

      rMultiple = calculateRMultiple({
        direction,
        entryPrice,
        stopLossPrice: stopLoss,
        exitPrice,
      });
    }
  } catch {
    // calculation fallback
  }

  const toggleMistake = (m: string) => {
    if (mistakes.includes(m)) {
      setMistakes(mistakes.filter((x) => x !== m));
    } else {
      setMistakes([...mistakes, m]);
    }
  };

  const handleSave = async () => {
    if (entryPrice <= 0 || stopLoss <= 0 || quantity <= 0) {
      setErrorMsg('Please enter valid trade prices and quantity');
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);

    try {
      await ApiClient.createTrade({
        symbol,
        direction,
        entryPrice,
        stopLoss,
        takeProfit,
        exitPrice: isClosed ? exitPrice : undefined,
        quantity,
        leverage,
        strategyId: selectedStrategyId || undefined,
        setupType,
        reasonForEntry,
        marketCondition,
        emotionBefore,
        emotionDuring,
        emotionAfter,
        mistakes,
        lessons,
        notes,
        chartSnapshot: initialData?.chartSnapshot,
      });

      onTradeSaved?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save trade to journal');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface border border-border-strong rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 select-none">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-brand/20 text-brand flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Record & Auto-Journal Trade</h2>
              <p className="text-[11px] text-slate-400">
                Automatically computes P&L, R-Multiple, holding statistics and logs setup psychology.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-surface-elevated transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs font-sans">
          {/* Automatic Results Banner */}
          {isClosed && (
            <div className="p-3 bg-surface-subtle border border-border rounded-lg grid grid-cols-4 gap-2 text-center font-mono">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-sans">Trade Result</span>
                <span className={`text-sm font-bold ${pnl >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                  {pnl >= 0 ? '+' : ''}${formatNumber(pnl, 2)}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-sans">R Multiple</span>
                <span className={`text-sm font-bold ${rMultiple >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                  {formatRMultiple(rMultiple)}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-sans">Return (ROE)</span>
                <span className={`text-sm font-bold ${returnPct >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                  {formatPercent(returnPct)}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-sans">Outcome</span>
                <span
                  className={`text-xs font-bold mt-0.5 px-2 py-0.5 rounded self-center ${
                    pnl >= 0 ? 'bg-bullish/20 text-bullish' : 'bg-bearish/20 text-bearish'
                  }`}
                >
                  {pnl >= 0 ? 'WIN' : 'LOSS'}
                </span>
              </div>
            </div>
          )}

          {/* Trade Parameters (Readonly / Editable) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-sans block mb-1">Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="w-full bg-surface-subtle border border-border rounded px-2.5 py-1.5 text-white font-bold text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-sans block mb-1">Direction</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as TradeDirection)}
                className="w-full bg-surface-subtle border border-border rounded px-2.5 py-1.5 text-white font-bold text-xs"
              >
                <option value="LONG">LONG</option>
                <option value="SHORT">SHORT</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-sans block mb-1">Entry Price</label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-subtle border border-border rounded px-2.5 py-1.5 text-white text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-sans block mb-1">Exit Price</label>
              <input
                type="number"
                step="any"
                value={exitPrice || ''}
                placeholder="Leave blank if open"
                onChange={(e) => setExitPrice(parseFloat(e.target.value) || undefined)}
                className="w-full bg-surface-subtle border border-border rounded px-2.5 py-1.5 text-white text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] text-red-400 uppercase font-sans block mb-1">Stop Loss</label>
              <input
                type="number"
                step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-subtle border border-red-500/30 rounded px-2.5 py-1.5 text-white text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] text-emerald-400 uppercase font-sans block mb-1">Take Profit</label>
              <input
                type="number"
                step="any"
                value={takeProfit}
                onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-subtle border border-emerald-500/30 rounded px-2.5 py-1.5 text-white text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-sans block mb-1">Quantity</label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-subtle border border-border rounded px-2.5 py-1.5 text-white text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-sans block mb-1">Leverage</label>
              <input
                type="number"
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-surface-subtle border border-border rounded px-2.5 py-1.5 text-white text-xs"
              />
            </div>
          </div>

          {/* Strategy & Setup Section */}
          <div className="pt-2 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-300 font-semibold block mb-1">Strategy</label>
              <select
                value={selectedStrategyId}
                onChange={(e) => setSelectedStrategyId(e.target.value)}
                className="w-full bg-surface-subtle border border-border rounded px-3 py-2 text-white focus:outline-none focus:border-brand"
              >
                <option value="">-- Select Strategy --</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-300 font-semibold block mb-1">Setup Type</label>
              <input
                type="text"
                value={setupType}
                placeholder="e.g. 1h Retest, Double Bottom, 20 EMA Pullback"
                onChange={(e) => setSetupType(e.target.value)}
                className="w-full bg-surface-subtle border border-border rounded px-3 py-2 text-white focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          {/* Market Condition & Psychology Section */}
          <div className="pt-2 border-t border-border">
            <h3 className="text-xs font-bold text-slate-200 mb-2">Trader Psychology & Market State</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Market Condition</label>
                <select
                  value={marketCondition}
                  onChange={(e) => setMarketCondition(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded px-2 py-1.5 text-slate-200"
                >
                  <option value="TRENDING">Trending</option>
                  <option value="RANGING">Ranging</option>
                  <option value="VOLATILE">High Volatility</option>
                  <option value="COMPRESSED">Compressed</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Emotion Before</label>
                <select
                  value={emotionBefore}
                  onChange={(e) => setEmotionBefore(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded px-2 py-1.5 text-slate-200"
                >
                  <option value="CONFIDENT">Confident</option>
                  <option value="CALM">Calm</option>
                  <option value="FOMO">FOMO / Anxious</option>
                  <option value="IMPATIENT">Impatient</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Emotion During</label>
                <select
                  value={emotionDuring}
                  onChange={(e) => setEmotionDuring(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded px-2 py-1.5 text-slate-200"
                >
                  <option value="CALM">Calm / Patient</option>
                  <option value="NERVOUS">Nervous</option>
                  <option value="GREEDY">Greedy</option>
                  <option value="DISCIPLINED">Disciplined</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Emotion After</label>
                <select
                  value={emotionAfter}
                  onChange={(e) => setEmotionAfter(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded px-2 py-1.5 text-slate-200"
                >
                  <option value="SATISFIED">Satisfied</option>
                  <option value="REGRETFUL">Regretful</option>
                  <option value="DISAPPOINTED">Disappointed</option>
                  <option value="RELIEVED">Relieved</option>
                </select>
              </div>
            </div>
          </div>

          {/* Mistakes Checklist */}
          <div className="pt-2 border-t border-border">
            <label className="text-[11px] text-slate-300 font-semibold block mb-1.5">
              Execution Mistakes (Check if applicable)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {availableMistakes.map((m) => {
                const isSelected = mistakes.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMistake(m)}
                    className={`p-2 rounded text-[11px] text-left border transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-red-500/15 border-red-500/40 text-red-300 font-medium'
                        : 'bg-surface-subtle border-border text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{m}</span>
                    {isSelected && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes & Lessons */}
          <div className="pt-2 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-300 font-semibold block mb-1">Reason For Entry</label>
              <textarea
                rows={2}
                value={reasonForEntry}
                placeholder="What triggered this entry? (Confluence, liquidity grab...)"
                onChange={(e) => setReasonForEntry(e.target.value)}
                className="w-full bg-surface-subtle border border-border rounded p-2 text-white focus:outline-none focus:border-brand text-xs resize-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-300 font-semibold block mb-1">Lessons & Takeaways</label>
              <textarea
                rows={2}
                value={lessons}
                placeholder="What did you learn from this execution?"
                onChange={(e) => setLessons(e.target.value)}
                className="w-full bg-surface-subtle border border-border rounded p-2 text-white focus:outline-none focus:border-brand text-xs resize-none"
              />
            </div>
          </div>

          {/* Freeform Notes */}
          <div>
            <label className="text-[11px] text-slate-300 font-semibold block mb-1">Additional Trade Notes</label>
            <textarea
              rows={2}
              value={notes}
              placeholder="Any comments, trailing stop adjustments, market context..."
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-surface-subtle border border-border rounded p-2 text-white focus:outline-none focus:border-brand text-xs resize-none"
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-surface-subtle flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-xs text-slate-400 hover:text-white hover:bg-surface transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-brand hover:bg-brand-hover text-white px-5 py-2 rounded text-xs font-bold shadow-lg shadow-brand/20 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaving ? 'Saving Trade...' : 'Save to Journal'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
