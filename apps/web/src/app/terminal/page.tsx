'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { TopNav } from '../../components/terminal/TopNav';
import { Watchlist } from '../../components/terminal/Watchlist';
import type { PlannedTradeOverlay } from '../../components/chart/TradingChart';
import { OrderPanel } from '../../components/planner/OrderPanel';
import { BottomTabs } from '../../components/terminal/BottomTabs';
import { JournalModal } from '../../components/journal/JournalModal';
import { TradeReviewModal } from '../../components/journal/TradeReviewModal';

const TradingChart = dynamic(
  () => import('../../components/chart/TradingChart').then((mod) => mod.TradingChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex flex-col items-center justify-center bg-background border-r border-border text-slate-500 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand animate-ping" />
          <span>Initializing Trading Terminal Chart Engine...</span>
        </div>
      </div>
    ),
  }
);

export default function TerminalPage() {
  const [plannedTrade, setPlannedTrade] = useState<PlannedTradeOverlay | undefined>(undefined);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [journalInitialData, setJournalInitialData] = useState<any>(null);
  const [reviewTradeId, setReviewTradeId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Collapsible Workspace State
  const [isWatchlistCollapsed, setIsWatchlistCollapsed] = useState(false);
  const [isOrderPanelCollapsed, setIsOrderPanelCollapsed] = useState(false);
  const [isBottomCollapsed, setIsBottomCollapsed] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);

  const handleToggleZenMode = () => {
    if (!isZenMode) {
      setIsZenMode(true);
      setIsWatchlistCollapsed(true);
      setIsOrderPanelCollapsed(true);
      setIsBottomCollapsed(true);
    } else {
      setIsZenMode(false);
      setIsWatchlistCollapsed(false);
      setIsOrderPanelCollapsed(false);
      setIsBottomCollapsed(false);
    }
  };

  const handleOpenJournal = (tradeData: any) => {
    setJournalInitialData(tradeData);
    setJournalModalOpen(true);
  };

  const handleTradeSaved = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-background overflow-hidden select-none">
      {/* 1. Top Navigation & Stats Bar */}
      <TopNav />

      {/* 2. Main Middle Workspace: Watchlist + Chart + Order Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Watchlist Sidebar */}
        <Watchlist
          isCollapsed={isWatchlistCollapsed}
          onToggleCollapse={() => {
            setIsWatchlistCollapsed(!isWatchlistCollapsed);
            if (isZenMode) setIsZenMode(false);
          }}
        />

        {/* Center Chart */}
        <TradingChart
          plannedTrade={plannedTrade}
          isZenMode={isZenMode}
          onToggleZenMode={handleToggleZenMode}
        />

        {/* Right Order & Trade Planner Panel */}
        <OrderPanel
          onTradePlanChange={(plan) => setPlannedTrade(plan)}
          onOpenJournalModal={handleOpenJournal}
          onPositionOpened={() => setRefreshTrigger((prev) => prev + 1)}
          isCollapsed={isOrderPanelCollapsed}
          onToggleCollapse={() => {
            setIsOrderPanelCollapsed(!isOrderPanelCollapsed);
            if (isZenMode) setIsZenMode(false);
          }}
        />
      </div>

      {/* 3. Bottom Tabs: Positions, Recent Trades & AI Diagnostic */}
      <BottomTabs
        onSelectTradeForReview={(id) => setReviewTradeId(id)}
        refreshTrigger={refreshTrigger}
        isCollapsed={isBottomCollapsed}
        onToggleCollapse={(collapsed) => {
          setIsBottomCollapsed(collapsed);
          if (isZenMode && !collapsed) setIsZenMode(false);
        }}
      />

      {/* Journal Entry Modal */}
      <JournalModal
        isOpen={journalModalOpen}
        onClose={() => setJournalModalOpen(false)}
        initialData={journalInitialData}
        onTradeSaved={handleTradeSaved}
      />

      {/* Trade Review Modal */}
      <TradeReviewModal
        tradeId={reviewTradeId}
        onClose={() => setReviewTradeId(null)}
      />
    </div>
  );
}
