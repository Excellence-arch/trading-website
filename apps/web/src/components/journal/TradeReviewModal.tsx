'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  AlertTriangle,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { createChart, ColorType, IChartApi } from 'lightweight-charts';
import type { AITradeReview } from '@trading/types';
import { ApiClient } from '../../lib/api';
import { formatDateTime, formatNumber, formatPercent, formatPrice, formatRMultiple } from '../../lib/utils';

interface TradeReviewModalProps {
  tradeId: string | null;
  onClose: () => void;
}

export function TradeReviewModal({ tradeId, onClose }: TradeReviewModalProps) {
  const [trade, setTrade] = useState<any>(null);
  const [aiReview, setAiReview] = useState<AITradeReview | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'ai'>('overview');

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!tradeId) return;

    ApiClient.getTrade(tradeId)
      .then((t) => {
        setTrade(t);
        if (t.aiReview) {
          setAiReview({
            tradeId: t.id,
            summary: t.aiReview.summary,
            whatWasDoneWell: JSON.parse(t.aiReview.strengthsJson || '[]'),
            potentialMistakes: JSON.parse(t.aiReview.mistakesJson || '[]'),
            riskManagementAssessment: t.aiReview.riskManagementAssessment,
            entryQualityAssessment: t.aiReview.entryQualityAssessment,
            exitQualityAssessment: t.aiReview.exitQualityAssessment,
            psychologicalObservations: t.aiReview.psychologicalObservations,
            suggestionsForFuture: JSON.parse(t.aiReview.suggestionsJson || '[]'),
            disclaimer: 'Analysis for educational purposes only — not financial advice.',
            generatedAt: t.aiReview.generatedAt,
          });
        }
      })
      .catch(() => {});
  }, [tradeId]);

  // Render Historical Chart Around The Trade
  useEffect(() => {
    if (!trade || !chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0F131C' },
        textColor: '#94A3B8',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      rightPriceScale: { borderColor: '#1E293B' },
      timeScale: { borderColor: '#1E293B', timeVisible: true },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10B981',
      downColor: '#EF4444',
      borderUpColor: '#10B981',
      borderDownColor: '#EF4444',
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    // Fetch historical candles for this trade
    ApiClient.getCandles(trade.symbol, trade.timeframe || '1h', 150).then((candles) => {
      if (Array.isArray(candles) && candles.length > 0) {
        candleSeries.setData(
          candles.map((c) => ({
            time: Math.floor(c.timestamp / 1000) as any,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
        );

        // Add Markers for Entry, Exit, SL, TP
        const entryTime = Math.floor(new Date(trade.enteredAt).getTime() / 1000) as any;
        const exitTime = trade.exitedAt
          ? (Math.floor(new Date(trade.exitedAt).getTime() / 1000) as any)
          : undefined;

        const markers: any[] = [
          {
            time: entryTime,
            position: trade.direction === 'LONG' ? 'belowBar' : 'aboveBar',
            color: '#3B82F6',
            shape: trade.direction === 'LONG' ? 'arrowUp' : 'arrowDown',
            text: `ENTRY ${formatPrice(trade.entryPrice)}`,
          },
        ];

        if (exitTime && trade.exitPrice) {
          markers.push({
            time: exitTime,
            position: trade.direction === 'LONG' ? 'aboveBar' : 'belowBar',
            color: trade.pnl >= 0 ? '#10B981' : '#EF4444',
            shape: 'circle',
            text: `EXIT ${formatPrice(trade.exitPrice)} (${trade.pnl >= 0 ? '+' : ''}${trade.pnl}$)`,
          });
        }

        candleSeries.setMarkers(markers);
        chart.timeScale().fitContent();
      }
    });

    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [trade]);

  const handleTriggerAiReview = async () => {
    if (!tradeId) return;
    setLoadingAi(true);
    try {
      const review = await ApiClient.getAITradeReview(tradeId);
      setAiReview(review);
      setActiveTab('ai');
    } catch (err: any) {
      alert(err.message || 'Failed to generate AI review');
    } finally {
      setLoadingAi(false);
    }
  };

  if (!tradeId || !trade) return null;

  const isWin = (trade.pnl || 0) > 0;
  const mistakes: string[] = trade.journal?.mistakes || [];

  // Calculate holding time
  const holdingHours =
    trade.exitedAt && trade.enteredAt
      ? ((new Date(trade.exitedAt).getTime() - new Date(trade.enteredAt).getTime()) / 3600000).toFixed(1)
      : 'Open';

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface border border-border-strong rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden my-6 select-none font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm font-mono ${
                isWin
                  ? 'bg-bullish/20 text-bullish border border-bullish/30'
                  : 'bg-bearish/20 text-bearish border border-bearish/30'
              }`}
            >
              {trade.direction}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono">{trade.symbol}</h2>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                    isWin ? 'bg-bullish/20 text-bullish' : 'bg-bearish/20 text-bearish'
                  }`}
                >
                  {trade.pnl !== null ? `${trade.pnl >= 0 ? '+' : ''}$${formatNumber(trade.pnl, 2)}` : 'OPEN'}
                  {' '}({formatRMultiple(trade.rMultiple)})
                </span>
                <span className="text-[11px] text-slate-400 bg-surface-elevated px-2 py-0.5 rounded">
                  {trade.timeframe || '1h'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Entered: {formatDateTime(trade.enteredAt)}</span>
                <span>• Holding: {holdingHours} hrs</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerAiReview}
              disabled={loadingAi}
              className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-md transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{loadingAi ? 'Analyzing Trade...' : 'AI Trade Review'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-surface-elevated transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Nav Tabs */}
        <div className="flex border-b border-border bg-surface-subtle/50 px-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-brand text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Trade Overview & Chart
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'ai'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Coach Review</span>
            {aiReview && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[72vh] overflow-y-auto space-y-5 text-xs">
          {activeTab === 'overview' ? (
            <>
              {/* Historical Chart around the trade */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Market context around trade execution</span>
                  <span className="font-mono text-slate-500">Zoom & pan active</span>
                </div>
                <div className="h-60 w-full rounded-lg border border-border overflow-hidden relative">
                  <div ref={chartContainerRef} className="w-full h-full" />
                </div>
              </div>

              {/* Trade Execution Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="p-2.5 bg-surface-subtle border border-border rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-sans">Entry Price</span>
                  <p className="text-white font-bold mt-0.5">{formatPrice(trade.entryPrice)}</p>
                </div>

                <div className="p-2.5 bg-surface-subtle border border-border rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-sans">Exit Price</span>
                  <p className="text-white font-bold mt-0.5">
                    {trade.exitPrice ? formatPrice(trade.exitPrice) : 'Open'}
                  </p>
                </div>

                <div className="p-2.5 bg-surface-subtle border border-border rounded-lg">
                  <span className="text-[10px] text-red-400 uppercase font-sans">Stop Loss</span>
                  <p className="text-slate-200 font-bold mt-0.5">{formatPrice(trade.stopLoss)}</p>
                </div>

                <div className="p-2.5 bg-surface-subtle border border-border rounded-lg">
                  <span className="text-[10px] text-emerald-400 uppercase font-sans">Take Profit</span>
                  <p className="text-slate-200 font-bold mt-0.5">{formatPrice(trade.takeProfit)}</p>
                </div>

                <div className="p-2.5 bg-surface-subtle border border-border rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-sans">Position Size</span>
                  <p className="text-slate-200 font-bold mt-0.5">
                    {trade.quantity} ({trade.leverage}x)
                  </p>
                </div>

                <div className="p-2.5 bg-surface-subtle border border-border rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-sans">Total Fees</span>
                  <p className="text-slate-400 font-bold mt-0.5">${formatNumber(trade.fees || 0, 2)}</p>
                </div>

                <div className="p-2.5 bg-surface-subtle border border-border rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-sans">Net P&L</span>
                  <p className={`font-bold mt-0.5 ${isWin ? 'text-bullish' : 'text-bearish'}`}>
                    {trade.pnl >= 0 ? '+' : ''}${formatNumber(trade.pnl || 0, 2)}
                  </p>
                </div>

                <div className="p-2.5 bg-surface-subtle border border-border rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-sans">Realized R</span>
                  <p className={`font-bold mt-0.5 ${isWin ? 'text-bullish' : 'text-bearish'}`}>
                    {formatRMultiple(trade.rMultiple)}
                  </p>
                </div>
              </div>

              {/* Strategy & Setup Context */}
              <div className="p-4 bg-surface-subtle border border-border rounded-lg space-y-3">
                <h3 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-brand" />
                  <span>Strategy & Setup Classification</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400">Strategy</span>
                    <p className="text-white font-semibold mt-0.5">{trade.strategy?.name || 'Unassigned'}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400">Setup Pattern</span>
                    <p className="text-white font-semibold mt-0.5">{trade.journal?.setupType || 'Discretionary'}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400">Market Regime</span>
                    <p className="text-white font-semibold mt-0.5">{trade.journal?.marketCondition || 'Trending'}</p>
                  </div>
                </div>

                {trade.journal?.reasonForEntry && (
                  <div>
                    <span className="text-[10px] text-slate-400">Reason For Entry</span>
                    <p className="text-slate-200 mt-0.5 text-xs bg-surface p-2 rounded border border-border">
                      {trade.journal.reasonForEntry}
                    </p>
                  </div>
                )}
              </div>

              {/* Psychology & Mistakes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-surface-subtle border border-border rounded-lg space-y-2">
                  <h3 className="font-bold text-slate-200 text-xs">Psychological Mindset</h3>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="p-2 bg-surface rounded border border-border">
                      <span className="text-[10px] text-slate-400 block">Before</span>
                      <span className="font-bold text-white mt-1 block">{trade.journal?.emotionBefore || 'Neutral'}</span>
                    </div>
                    <div className="p-2 bg-surface rounded border border-border">
                      <span className="text-[10px] text-slate-400 block">During</span>
                      <span className="font-bold text-white mt-1 block">{trade.journal?.emotionDuring || 'Neutral'}</span>
                    </div>
                    <div className="p-2 bg-surface rounded border border-border">
                      <span className="text-[10px] text-slate-400 block">After</span>
                      <span className="font-bold text-white mt-1 block">{trade.journal?.emotionAfter || 'Neutral'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-surface-subtle border border-border rounded-lg space-y-2">
                  <h3 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Execution Errors</span>
                  </h3>
                  {mistakes.length === 0 ? (
                    <p className="text-slate-400 text-xs italic pt-1">
                      No mistakes recorded for this trade. Disciplined execution.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {mistakes.map((m) => (
                        <span
                          key={m}
                          className="bg-red-500/15 border border-red-500/30 text-red-300 px-2 py-0.5 rounded text-[10px] font-medium"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Lessons & Notes */}
              {(trade.journal?.lessons || trade.journal?.notes) && (
                <div className="p-4 bg-surface-subtle border border-border rounded-lg space-y-2">
                  {trade.journal?.lessons && (
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Key Lessons</span>
                      <p className="text-slate-200 mt-1">{trade.journal.lessons}</p>
                    </div>
                  )}

                  {trade.journal?.notes && (
                    <div className="pt-2 border-t border-border">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Trader Notes</span>
                      <p className="text-slate-200 mt-1">{trade.journal.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* AI Review Tab */
            <div className="space-y-4">
              {aiReview ? (
                <div className="space-y-4">
                  {/* Summary Box */}
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <h3 className="font-bold text-emerald-400 text-xs flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>AI Trade Summary</span>
                    </h3>
                    <p className="text-slate-200 text-xs leading-relaxed">{aiReview.summary}</p>
                  </div>

                  {/* Strengths & Mistakes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-surface-subtle border border-border space-y-2">
                      <h4 className="font-bold text-bullish text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>What Was Done Well</span>
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {aiReview.whatWasDoneWell.map((s, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-bullish">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-lg bg-surface-subtle border border-border space-y-2">
                      <h4 className="font-bold text-bearish text-xs flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Potential Weaknesses / Mistakes</span>
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {aiReview.potentialMistakes.map((m, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-bearish">•</span>
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Deep Diagnostics */}
                  <div className="p-4 rounded-lg bg-surface-subtle border border-border space-y-3">
                    <h4 className="font-bold text-white text-xs">Diagnostic Assessments</h4>

                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold">Risk Management</span>
                      <p className="text-slate-200 mt-0.5">{aiReview.riskManagementAssessment}</p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold">Entry Quality</span>
                      <p className="text-slate-200 mt-0.5">{aiReview.entryQualityAssessment}</p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold">Exit Quality</span>
                      <p className="text-slate-200 mt-0.5">{aiReview.exitQualityAssessment}</p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold">Psychological Observation</span>
                      <p className="text-slate-200 mt-0.5">{aiReview.psychologicalObservations}</p>
                    </div>
                  </div>

                  {/* Future Suggestions */}
                  {aiReview.suggestionsForFuture?.length > 0 && (
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 space-y-2">
                      <h4 className="font-bold text-blue-400 text-xs">Future Recommendations</h4>
                      <ul className="space-y-1 text-slate-200">
                        {aiReview.suggestionsForFuture.map((s, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-blue-400">→</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-500 italic text-center pt-2">
                    {aiReview.disclaimer}
                  </p>
                </div>
              ) : (
                <div className="py-12 text-center space-y-3">
                  <Bot className="w-10 h-10 text-slate-500 mx-auto" />
                  <h3 className="text-sm font-bold text-white">No AI Review Generated Yet</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Click the button below to generate an automated review evaluating risk-reward, entry execution, emotional bias, and historical patterns.
                  </p>
                  <button
                    onClick={handleTriggerAiReview}
                    disabled={loadingAi}
                    className="bg-brand hover:bg-brand-hover text-white px-5 py-2 rounded-md font-semibold text-xs transition shadow-lg inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{loadingAi ? 'Analyzing Trade...' : 'Generate AI Review'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
