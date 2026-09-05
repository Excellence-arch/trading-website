'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  FastForward,
  History,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { createChart, ColorType, IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import type { Candle, Timeframe } from '@trading/types';
import { TopNav } from '../../components/terminal/TopNav';
import { ApiClient } from '../../lib/api';
import { formatDateTime, formatNumber, formatPrice, formatRMultiple } from '../../lib/utils';

export default function ReplayPage() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [fullCandles, setFullCandles] = useState<Candle[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1); // 1x, 2x, 5x, 10x
  const [isLoading, setIsLoading] = useState(true);

  // Replay simulated trade state
  const [replayPosition, setReplayPosition] = useState<{
    direction: 'LONG' | 'SHORT';
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    startIndex: number;
  } | null>(null);
  const [replayResult, setReplayResult] = useState<string | null>(null);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0B0E14' },
        textColor: '#94A3B8',
        fontSize: 11,
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

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

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
  }, []);

  // 2. Fetch full historical candle dataset
  useEffect(() => {
    setIsLoading(true);
    setIsPlaying(false);
    ApiClient.getReplayCandles(symbol, timeframe, undefined, 200)
      .then((data) => {
        if (Array.isArray(data) && data.length > 50) {
          setFullCandles(data);
          // Start replay at candle #40, hiding the rest
          const startIdx = Math.min(50, Math.floor(data.length / 2));
          setCurrentIndex(startIdx);
          renderCandlesUpToIndex(data, startIdx);
        }
      })
      .finally(() => setIsLoading(false));
  }, [symbol, timeframe]);

  const renderCandlesUpToIndex = (all: Candle[], idx: number) => {
    if (!candleSeriesRef.current || all.length === 0) return;
    const slice = all.slice(0, idx + 1).map((c) => ({
      time: Math.floor(c.timestamp / 1000) as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeriesRef.current.setData(slice);
  };

  // Step Forward
  const stepForward = () => {
    if (currentIndex < fullCandles.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      renderCandlesUpToIndex(fullCandles, nextIdx);
      checkReplayTrade(fullCandles[nextIdx]);
    } else {
      setIsPlaying(false);
    }
  };

  // Check if simulated trade hit TP or SL
  const checkReplayTrade = (candle: Candle) => {
    if (!replayPosition) return;

    const { direction, entryPrice, stopLoss, takeProfit } = replayPosition;
    let hit = false;
    let resultMsg = '';

    if (direction === 'LONG') {
      if (candle.low <= stopLoss) {
        hit = true;
        resultMsg = `STOP LOSS HIT at $${stopLoss} (-1.0R loss).`;
      } else if (candle.high >= takeProfit) {
        hit = true;
        const r = ((takeProfit - entryPrice) / (entryPrice - stopLoss)).toFixed(2);
        resultMsg = `TAKE PROFIT HIT at $${takeProfit} (+${r}R WIN!).`;
      }
    } else {
      if (candle.high >= stopLoss) {
        hit = true;
        resultMsg = `STOP LOSS HIT at $${stopLoss} (-1.0R loss).`;
      } else if (candle.low <= takeProfit) {
        hit = true;
        const r = ((entryPrice - takeProfit) / (stopLoss - entryPrice)).toFixed(2);
        resultMsg = `TAKE PROFIT HIT at $${takeProfit} (+${r}R WIN!).`;
      }
    }

    if (hit) {
      setReplayResult(resultMsg);
      setReplayPosition(null);
    }
  };

  // Play / Pause timer
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(100, 1000 / speed);
      playTimerRef.current = setInterval(() => {
        stepForward();
      }, intervalMs);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, speed, currentIndex, fullCandles]);

  // Place Replay Trade
  const handlePlaceReplayTrade = (dir: 'LONG' | 'SHORT') => {
    if (fullCandles.length === 0 || currentIndex >= fullCandles.length) return;
    const currentCandle = fullCandles[currentIndex];
    const entry = currentCandle.close;

    const sl = dir === 'LONG' ? Number((entry * 0.985).toFixed(2)) : Number((entry * 1.015).toFixed(2));
    const tp = dir === 'LONG' ? Number((entry * 1.045).toFixed(2)) : Number((entry * 1.045).toFixed(2));

    setReplayPosition({
      direction: dir,
      entryPrice: entry,
      stopLoss: sl,
      takeProfit: tp,
      startIndex: currentIndex,
    });
    setReplayResult(null);
  };

  const currentCandle = fullCandles[currentIndex];

  return (
    <div className="flex flex-col h-screen w-screen bg-background select-none font-sans text-xs overflow-hidden">
      <TopNav />

      {/* Replay Control Bar */}
      <div className="h-12 bg-surface border-b border-border flex items-center justify-between px-4">
        {/* Left: Symbol & Timeframe */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-brand font-bold">
            <History className="w-4 h-4" />
            <span>Market Replay Simulator</span>
          </div>

          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-surface-subtle border border-border rounded px-2.5 py-1 text-white font-mono font-bold"
          >
            <option value="BTCUSDT">BTCUSDT</option>
            <option value="ETHUSDT">ETHUSDT</option>
            <option value="SOLUSDT">SOLUSDT</option>
          </select>

          <div className="flex items-center gap-1">
            {(['15m', '1h', '4h', '1D'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 rounded font-mono ${
                  timeframe === tf ? 'bg-brand text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCurrentIndex(40);
              renderCandlesUpToIndex(fullCandles, 40);
              setReplayPosition(null);
              setReplayResult(null);
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-surface-elevated transition"
            title="Reset Replay"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-full font-bold transition ${
              isPlaying
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                : 'bg-brand text-white shadow-lg shadow-brand/20'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
          </button>

          <button
            onClick={stepForward}
            disabled={isPlaying}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-surface-elevated transition disabled:opacity-40"
            title="Step 1 Candle Forward"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Speed selector */}
          <div className="flex items-center gap-1 bg-surface-subtle border border-border rounded p-0.5 ml-2 font-mono text-[11px]">
            {[1, 2, 5, 10].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-1.5 py-0.5 rounded ${
                  speed === s ? 'bg-brand text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Right: Progress indicator */}
        <div className="font-mono text-slate-400 text-[11px]">
          Candle {currentIndex + 1} / {fullCandles.length}
        </div>
      </div>

      {/* Main Area: Chart + Replay Action Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chart Canvas */}
        <div className="flex-1 relative h-full">
          <div ref={chartContainerRef} className="w-full h-full" />
        </div>

        {/* Right Action Panel */}
        <div className="w-72 bg-surface border-l border-border p-4 space-y-4 font-mono select-none">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
            Simulator Position
          </h3>

          {currentCandle && (
            <div className="p-3 bg-surface-subtle border border-border rounded-lg space-y-1">
              <span className="text-[10px] text-slate-400 font-sans block">Current Replay Price</span>
              <p className="text-base font-bold text-white">{formatPrice(currentCandle.close)}</p>
              <span className="text-[10px] text-slate-500 font-sans block">
                Time: {formatDateTime(currentCandle.timestamp)}
              </span>
            </div>
          )}

          {/* Active Replay Position */}
          {replayPosition ? (
            <div className="p-3 bg-brand/10 border border-brand/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{replayPosition.direction} Position</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-[11px] space-y-1">
                <p className="text-slate-300">Entry: {formatPrice(replayPosition.entryPrice)}</p>
                <p className="text-red-400">Stop Loss: {formatPrice(replayPosition.stopLoss)}</p>
                <p className="text-emerald-400">Take Profit: {formatPrice(replayPosition.takeProfit)}</p>
              </div>
              <p className="text-[10px] text-slate-400 font-sans italic pt-1">
                Step or play candles forward to let the market execute your setup.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => handlePlaceReplayTrade('LONG')}
                className="w-full bg-bullish hover:bg-bullish-hover text-white font-bold py-2 rounded font-sans transition flex items-center justify-center gap-1.5 shadow-md shadow-bullish/20"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Simulate Long</span>
              </button>

              <button
                onClick={() => handlePlaceReplayTrade('SHORT')}
                className="w-full bg-bearish hover:bg-bearish-hover text-white font-bold py-2 rounded font-sans transition flex items-center justify-center gap-1.5 shadow-md shadow-bearish/20"
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>Simulate Short</span>
              </button>
            </div>
          )}

          {/* Resolution Result Banner */}
          {replayResult && (
            <div className="p-3 bg-surface-elevated border border-border-strong rounded-lg space-y-1 font-sans">
              <span className="text-[10px] font-bold text-amber-400 uppercase">Trade Resolution</span>
              <p className="text-xs font-bold text-white font-mono">{replayResult}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
