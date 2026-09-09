'use client';

import React, { useState } from 'react';
import {
  Camera,
  ChevronDown,
  Expand,
  Maximize2,
  Minimize2,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import type { Timeframe } from '@trading/types';
import { useMarket } from '../../context/MarketContext';

export interface IndicatorToggles {
  ema20: boolean;
  ema50: boolean;
  ema200: boolean;
  bb: boolean;
  vwap: boolean;
  rsi: boolean;
  macd: boolean;
  atr: boolean;
}

interface ChartToolbarProps {
  indicators: IndicatorToggles;
  setIndicators: React.Dispatch<React.SetStateAction<IndicatorToggles>>;
  onResetChart: () => void;
  onFullscreen: () => void;
  onTakeSnapshot: () => void;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
  isCyber3D?: boolean;
  onToggleCyber3D?: () => void;
}

export function ChartToolbar({
  indicators,
  setIndicators,
  onResetChart,
  onFullscreen,
  onTakeSnapshot,
  isZenMode = false,
  onToggleZenMode,
  isCyber3D = false,
  onToggleCyber3D,
}: ChartToolbarProps) {
  const { currentTimeframe, setCurrentTimeframe } = useMarket();
  const [indicatorsOpen, setIndicatorsOpen] = useState(false);

  const timeframes: Timeframe[] = ['5s', '15s', '30s', '1m', '5m', '15m', '1h', '4h', '1D'];

  const toggle = (key: keyof IndicatorToggles) => {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="h-10 bg-surface border-b border-border flex items-center justify-between px-3 text-xs select-none">
      {/* Left: Timeframe Switcher */}
      <div className="flex items-center gap-1">
        {timeframes.map((tf) => (
          <button
            key={tf}
            onClick={() => setCurrentTimeframe(tf)}
            className={`px-2 py-1 rounded text-xs font-mono font-medium transition ${
              currentTimeframe === tf
                ? 'bg-brand text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-surface-elevated'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Right: Indicators & Controls */}
      <div className="flex items-center gap-2">
        {/* Indicators Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIndicatorsOpen(!indicatorsOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium transition ${
              Object.values(indicators).some(Boolean)
                ? 'bg-surface-elevated border-brand/40 text-brand'
                : 'bg-surface-subtle border-border text-slate-300 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Indicators</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {indicatorsOpen && (
            <div className="absolute right-0 top-9 w-60 bg-surface-elevated border border-border-strong rounded-lg shadow-2xl p-2 z-50">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 border-b border-border mb-1">
                Chart Indicators
              </div>

              <div className="space-y-1">
                <label className="flex items-center justify-between p-1.5 rounded hover:bg-surface text-slate-200 cursor-pointer">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    EMA 20
                  </span>
                  <input
                    type="checkbox"
                    checked={indicators.ema20}
                    onChange={() => toggle('ema20')}
                    className="accent-brand"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 rounded hover:bg-surface text-slate-200 cursor-pointer">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    EMA 50
                  </span>
                  <input
                    type="checkbox"
                    checked={indicators.ema50}
                    onChange={() => toggle('ema50')}
                    className="accent-brand"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 rounded hover:bg-surface text-slate-200 cursor-pointer">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                    EMA 200
                  </span>
                  <input
                    type="checkbox"
                    checked={indicators.ema200}
                    onChange={() => toggle('ema200')}
                    className="accent-brand"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 rounded hover:bg-surface text-slate-200 cursor-pointer">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    Bollinger Bands (20, 2)
                  </span>
                  <input
                    type="checkbox"
                    checked={indicators.bb}
                    onChange={() => toggle('bb')}
                    className="accent-brand"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 rounded hover:bg-surface text-slate-200 cursor-pointer">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                    VWAP
                  </span>
                  <input
                    type="checkbox"
                    checked={indicators.vwap}
                    onChange={() => toggle('vwap')}
                    className="accent-brand"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 rounded hover:bg-surface text-slate-200 cursor-pointer">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    RSI (14) Sub-pane
                  </span>
                  <input
                    type="checkbox"
                    checked={indicators.rsi}
                    onChange={() => toggle('rsi')}
                    className="accent-brand"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 rounded hover:bg-surface text-slate-200 cursor-pointer">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                    MACD Sub-pane
                  </span>
                  <input
                    type="checkbox"
                    checked={indicators.macd}
                    onChange={() => toggle('macd')}
                    className="accent-brand"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Snapshot button */}
        <button
          onClick={onTakeSnapshot}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-surface-elevated rounded border border-border transition"
          title="Take automatic chart snapshot"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>

        {/* Reset zoom */}
        <button
          onClick={onResetChart}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-surface-elevated rounded border border-border transition"
          title="Reset chart scale"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* 3D Cyber Depth Mode Toggle */}
        {onToggleCyber3D && (
          <button
            onClick={onToggleCyber3D}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono font-bold transition shadow-sm ${
              isCyber3D
                ? 'bg-gradient-to-r from-blue-600/30 to-emerald-600/30 border-emerald-500/50 text-emerald-400 shadow-emerald-500/20'
                : 'bg-surface-subtle border-border text-slate-400 hover:text-white hover:border-slate-600'
            }`}
            title="Toggle Interactive 3D Cyber Depth Canvas"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isCyber3D ? 'text-emerald-400 animate-pulse' : ''}`} />
            <span className="hidden md:inline">3D DEPTH</span>
          </button>
        )}

        {/* Zen Mode / Maximize Graph */}
        {onToggleZenMode && (
          <button
            onClick={onToggleZenMode}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-semibold transition ${
              isZenMode
                ? 'bg-brand text-white border-brand shadow-sm animate-pulse'
                : 'bg-surface-subtle border-border text-slate-300 hover:text-white hover:bg-surface-elevated'
            }`}
            title={isZenMode ? 'Exit Zen Mode (Restore panels)' : 'Zen Mode: Maximize chart & collapse all panels'}
          >
            {isZenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Expand className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isZenMode ? 'Exit Zen' : 'Zen Graph'}</span>
          </button>
        )}

        {/* Fullscreen */}
        <button
          onClick={onFullscreen}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-surface-elevated rounded border border-border transition"
          title="Toggle browser fullscreen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
