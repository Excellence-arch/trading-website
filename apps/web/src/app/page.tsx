'use client';

import React from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronRight,
  Coins,
  History,
  Lock,
  Play,
  Shield,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const { user, loginAsDemo } = useAuth();
  const router = useRouter();

  const handleLaunchDemo = async () => {
    if (!user) {
      await loginAsDemo();
    }
    router.push('/terminal');
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Top Header */}
      <header className="h-16 border-b border-border/80 bg-surface/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6 max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-wider leading-none text-white">NEXUS</span>
            <span className="text-[10px] text-slate-400 font-mono font-medium tracking-widest">TERMINAL</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs text-slate-400 font-medium">
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#charting" className="hover:text-white transition">Charting</a>
          <a href="#journal" className="hover:text-white transition">Auto-Journal</a>
          <a href="#analytics" className="hover:text-white transition">Analytics</a>
          <a href="#ai" className="hover:text-white transition">AI Coach</a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLaunchDemo}
            className="bg-brand hover:bg-brand-hover text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-lg shadow-brand/20 flex items-center gap-1.5"
          >
            <span>Launch Terminal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-6 max-w-6xl mx-auto text-center space-y-6 relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated border border-border text-xs font-mono text-slate-300 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Professional Crypto Terminal & Journal V1.0</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15]">
          Understand Every Trade <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
            You Take.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Analyze the crypto market, track your trades, and automatically discover the patterns behind your performance.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          <button
            onClick={handleLaunchDemo}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm px-7 py-3.5 rounded-xl shadow-xl shadow-blue-500/25 transition flex items-center justify-center gap-2"
          >
            <span>Launch Live Terminal Demo</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <Link
            href="/journal"
            className="w-full sm:w-auto bg-surface hover:bg-surface-elevated border border-border-strong text-slate-200 font-semibold text-sm px-6 py-3.5 rounded-xl transition flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4 text-brand" />
            <span>Explore Trade Journal</span>
          </Link>
        </div>

        {/* Disclaimer / Compliance Notice */}
        <p className="text-[11px] text-slate-500 italic pt-2">
          Strictly educational market analysis and performance journaling. No guaranteed profits or financial advice.
        </p>
      </section>

      {/* Interactive Terminal Mockup Preview */}
      <section className="px-4 max-w-6xl mx-auto pb-24" id="charting">
        <div className="rounded-2xl border border-border-strong bg-surface p-2 shadow-2xl shadow-blue-900/10 overflow-hidden">
          <div className="h-8 bg-surface-subtle border-b border-border flex items-center justify-between px-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-amber-500/60" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
              <span className="text-[11px] font-mono text-slate-400 ml-2">BTCUSDT • 1h • NEXUS TERMINAL</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              REAL-TIME WEBSOCKET FEED
            </span>
          </div>

          <div className="aspect-[16/9] w-full bg-[#0B0E14] relative flex items-center justify-center p-6 bg-grid-pattern">
            <div className="text-center space-y-3 z-10">
              <div className="w-12 h-12 rounded-xl bg-brand/20 text-brand flex items-center justify-center mx-auto border border-brand/30">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">TradingView Lightweight Charts Engine</h3>
              <p className="text-xs text-slate-400 max-w-md">
                Interactive candlesticks, EMA 20/50/200, Bollinger Bands, Volume, and full drawing tool suite (Trendlines, Zones, R:R Box).
              </p>
              <button
                onClick={handleLaunchDemo}
                className="bg-brand text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-brand-hover transition shadow-lg"
              >
                Open Terminal
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="py-20 bg-surface/50 border-t border-b border-border" id="features">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              An Integrated Suite for Serious Crypto Traders
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              From market analysis to psychological auditing and AI-driven pattern detection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface border border-border p-6 rounded-2xl space-y-3 shadow-lg hover:border-brand/40 transition">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-brand flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Automatic Trade Journal</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Log entries with 1 click. Net P&L, R-Multiple, return %, and holding stats are calculated automatically server-side with decimal safety.
              </p>
            </div>

            <div className="bg-surface border border-border p-6 rounded-2xl space-y-3 shadow-lg hover:border-brand/40 transition">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Quantitative Analytics</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Equity curves, expectancy calculations, profit factor, max drawdown tracking, and multidimensional breakdowns by strategy, symbol, and session.
              </p>
            </div>

            <div className="bg-surface border border-border p-6 rounded-2xl space-y-3 shadow-lg hover:border-brand/40 transition">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">AI Coach & Pattern Detection</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Analyzes your actual trade logs to diagnose recurring errors, emotional leaks, and high-expectancy playbooks with strict statistical grounding.
              </p>
            </div>

            <div className="bg-surface border border-border p-6 rounded-2xl space-y-3 shadow-lg hover:border-brand/40 transition">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Simulated Paper Trading</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Virtual $10,000 account. Live unrealized P&L updates from tick streams, margin validation, and automatic journal entry on position close.
              </p>
            </div>

            <div className="bg-surface border border-border p-6 rounded-2xl space-y-3 shadow-lg hover:border-brand/40 transition">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                <History className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Historical Market Replay</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hide future market candles, step forward candle-by-candle at 1x–10x speed, place simulated trades, and test edge against historical price action.
              </p>
            </div>

            <div className="bg-surface border border-border p-6 rounded-2xl space-y-3 shadow-lg hover:border-brand/40 transition">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Position Size & Risk Planner</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Interactive chart planner with entry, SL, and TP lines. Calculates exact position size based on account balance and risk percentage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Footer */}
      <footer className="mt-auto border-t border-border py-12 px-6 bg-surface">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">NEXUS TERMINAL</span>
            <span>• Production-Quality Crypto Trading Terminal & Journal</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/terminal" className="hover:text-white transition">Terminal</Link>
            <Link href="/journal" className="hover:text-white transition">Journal</Link>
            <Link href="/analytics" className="hover:text-white transition">Analytics</Link>
            <Link href="/paper" className="hover:text-white transition">Paper Trading</Link>
            <Link href="/replay" className="hover:text-white transition">Replay</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
