'use client';

import React from 'react';
import {
  ArrowUpRight,
  Crosshair,
  Minus,
  MousePointer,
  MoveVertical,
  Percent,
  Square,
  Target,
  Trash2,
  Type,
  Layers,
} from 'lucide-react';
import type { DrawingToolType } from '@trading/types';

interface DrawingToolbarProps {
  activeTool: DrawingToolType | 'select' | 'crosshair';
  setActiveTool: (tool: DrawingToolType | 'select' | 'crosshair') => void;
  onClearAll: () => void;
}

export function DrawingToolbar({
  activeTool,
  setActiveTool,
  onClearAll,
}: DrawingToolbarProps) {
  const tools: { id: DrawingToolType | 'select' | 'crosshair'; label: string; icon: any }[] = [
    { id: 'select', label: 'Select / Move', icon: MousePointer },
    { id: 'crosshair', label: 'Crosshair', icon: Crosshair },
    { id: 'trendline', label: 'Trendline', icon: ArrowUpRight },
    { id: 'horizontal_line', label: 'Horizontal Line', icon: Minus },
    { id: 'vertical_line', label: 'Vertical Line', icon: MoveVertical },
    { id: 'rectangle', label: 'Rectangle / Zone', icon: Square },
    { id: 'support_resistance', label: 'Support / Resistance Zone', icon: Layers },
    { id: 'risk_reward', label: 'Risk / Reward Box', icon: Target },
    { id: 'price_range', label: 'Price Range', icon: Percent },
    { id: 'text', label: 'Text Annotation', icon: Type },
  ];

  return (
    <div className="w-10 bg-surface border-r border-border flex flex-col items-center py-2 gap-1 select-none z-10">
      {tools.map((t) => {
        const Icon = t.icon;
        const isActive = activeTool === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setActiveTool(t.id)}
            className={`w-8 h-8 rounded flex items-center justify-center transition group relative ${
              isActive
                ? 'bg-brand text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-surface-elevated'
            }`}
            title={t.label}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}

      <div className="w-6 h-[1px] bg-border my-1" />

      <button
        onClick={onClearAll}
        className="w-8 h-8 rounded flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
        title="Clear all drawings"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
