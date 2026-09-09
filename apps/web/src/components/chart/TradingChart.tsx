'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
  CrosshairMode,
  Time,
} from 'lightweight-charts';
import type { Candle, Timeframe, DrawingToolType } from '@trading/types';
import {
  calculateEMA,
  calculateSMA,
  calculateBollingerBands,
  calculateVWAP,
  calculateRSI,
  calculateMACD,
} from '@trading/indicators';
import { useMarket } from '../../context/MarketContext';
import { ApiClient } from '../../lib/api';
import { wsClient } from '../../lib/websocket';
import { ChartToolbar, IndicatorToggles } from './ChartToolbar';
import { DrawingToolbar } from './DrawingToolbar';
import { CyberChart3D } from './CyberChart3D';
import { formatPrice } from '../../lib/utils';
import { Sparkles, X } from 'lucide-react';

export interface PlannedTradeOverlay {
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  visible: boolean;
}

interface DrawingItem {
  id: string;
  toolType: DrawingToolType;
  price?: number;
  p1: { x: number; y: number; time?: number; price?: number };
  p2?: { x: number; y: number; time?: number; price?: number };
  text?: string;
  priceLineRef?: any;
}

interface TradingChartProps {
  plannedTrade?: PlannedTradeOverlay;
  onTradeSnapshot?: (dataUrl: string) => void;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
}

export function TradingChart({
  plannedTrade,
  onTradeSnapshot,
  isZenMode = false,
  onToggleZenMode,
}: TradingChartProps) {
  const { currentSymbol, currentTimeframe, currentTicker } = useMarket();

  // Keep a stable ref to currentTicker to avoid re-triggering candle fetches and coordinate recalculations on every tick
  const currentTickerRef = useRef(currentTicker);
  useEffect(() => {
    currentTickerRef.current = currentTicker;
  }, [currentTicker]);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const svgOverlayRef = useRef<SVGSVGElement>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // Indicators references
  const ema20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema200SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbMiddleRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<'Line'> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // High-performance candles storage ref (decoupled from React re-render lag)
  const candlesRef = useRef<Candle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 500 });

  // 3D Cyber Depth Canvas State
  const [isCyber3D, setIsCyber3D] = useState(false);

  // Live Price Animation States
  const lastTickPriceRef = useRef<number>(0);
  const [tickDirection, setTickDirection] = useState<'up' | 'down'>('up');
  const [tickFlash, setTickFlash] = useState(false);
  const flashTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [livePriceY, setLivePriceY] = useState<number | null>(null);
  const [latestCandleX, setLatestCandleX] = useState<number | null>(null);

  // Active Candle Countdown
  const [candleTimeRemaining, setCandleTimeRemaining] = useState<number>(0);
  const [candleDuration, setCandleDuration] = useState<number>(60);

  // Indicators State with localStorage persistence
  const [indicators, setIndicators] = useState<IndicatorToggles>({
    ema20: false,
    ema50: false,
    ema200: false,
    bb: false,
    vwap: false,
    rsi: false,
    macd: false,
    atr: false,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('trading_indicators');
      if (saved) {
        setIndicators(JSON.parse(saved));
      } else {
        setIndicators((prev) => ({ ...prev, ema20: true }));
      }
    } catch {}
  }, []);

  const updateIndicatorsState = useCallback((updater: React.SetStateAction<IndicatorToggles>) => {
    setIndicators((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem('trading_indicators', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Drawings State
  const [activeTool, setActiveTool] = useState<DrawingToolType | 'select' | 'crosshair'>('crosshair');
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<DrawingItem | null>(null);

  // 1. Initialize Main Chart with ResizeObserver
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const initialWidth = chartContainerRef.current.clientWidth || 800;
    const initialHeight = chartContainerRef.current.clientHeight || 500;
    setDimensions({ width: initialWidth, height: initialHeight });

    const chart = createChart(chartContainerRef.current, {
      width: initialWidth,
      height: initialHeight,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94A3B8',
        fontSize: 11,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#475569', width: 1, style: 3 },
        horzLine: { color: '#475569', width: 1, style: 3 },
      },
      rightPriceScale: {
        borderColor: '#1E293B',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: '#1E293B',
        timeVisible: true,
        secondsVisible: true,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10B981',
      downColor: '#EF4444',
      borderUpColor: '#10B981',
      borderDownColor: '#EF4444',
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      color: '#26a69a',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    // Indicator Line Series
    const ema20 = chart.addLineSeries({ color: '#06B6D4', lineWidth: 1, title: 'EMA 20' });
    const ema50 = chart.addLineSeries({ color: '#3B82F6', lineWidth: 1, title: 'EMA 50' });
    const ema200 = chart.addLineSeries({ color: '#A855F7', lineWidth: 2, title: 'EMA 200' });
    const bbUpper = chart.addLineSeries({ color: '#F59E0B', lineWidth: 1, lineStyle: 2, title: 'BB Upper' });
    const bbMiddle = chart.addLineSeries({ color: '#3B82F6', lineWidth: 1, title: 'BB Mid' });
    const bbLower = chart.addLineSeries({ color: '#F59E0B', lineWidth: 1, lineStyle: 2, title: 'BB Lower' });
    const vwap = chart.addLineSeries({ color: '#F97316', lineWidth: 2, title: 'VWAP' });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    ema20SeriesRef.current = ema20;
    ema50SeriesRef.current = ema50;
    ema200SeriesRef.current = ema200;
    bbUpperRef.current = bbUpper;
    bbMiddleRef.current = bbMiddle;
    bbLowerRef.current = bbLower;
    vwapSeriesRef.current = vwap;

    // Use ResizeObserver for instant auto-expansion on sidebar collapse/expand
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          chart.applyOptions({ width, height });
          setDimensions({ width, height });
        }
      }
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // Helper for dynamic price scale precision (5-8 decimals for low-priced assets)
  const getPrecisionForPrice = useCallback((price: number): { precision: number; minMove: number } => {
    if (price < 0.0001) return { precision: 8, minMove: 0.00000001 };
    if (price < 0.01) return { precision: 6, minMove: 0.000001 };
    if (price < 1) return { precision: 5, minMove: 0.00001 };
    if (price < 10) return { precision: 4, minMove: 0.0001 };
    if (price < 100) return { precision: 3, minMove: 0.001 };
    return { precision: 2, minMove: 0.01 };
  }, []);

  // Compute and update Indicator series
  const updateIndicators = useCallback((data: Candle[]) => {
    if (data.length < 20) return;

    if (indicators.ema20 && ema20SeriesRef.current) {
      const ema = calculateEMA(data, 20);
      ema20SeriesRef.current.setData(ema.map((p) => ({ time: p.time as Time, value: p.value })));
    } else {
      ema20SeriesRef.current?.setData([]);
    }

    if (indicators.ema50 && ema50SeriesRef.current) {
      const ema = calculateEMA(data, 50);
      ema50SeriesRef.current.setData(ema.map((p) => ({ time: p.time as Time, value: p.value })));
    } else {
      ema50SeriesRef.current?.setData([]);
    }

    if (indicators.ema200 && ema200SeriesRef.current) {
      const ema = calculateEMA(data, 200);
      ema200SeriesRef.current.setData(ema.map((p) => ({ time: p.time as Time, value: p.value })));
    } else {
      ema200SeriesRef.current?.setData([]);
    }

    if (indicators.bb && bbUpperRef.current && bbMiddleRef.current && bbLowerRef.current) {
      const bb = calculateBollingerBands(data, 20, 2);
      bbUpperRef.current.setData(bb.map((p) => ({ time: p.time as Time, value: p.upper })));
      bbMiddleRef.current.setData(bb.map((p) => ({ time: p.time as Time, value: p.middle })));
      bbLowerRef.current.setData(bb.map((p) => ({ time: p.time as Time, value: p.lower })));
    } else {
      bbUpperRef.current?.setData([]);
      bbMiddleRef.current?.setData([]);
      bbLowerRef.current?.setData([]);
    }

    if (indicators.vwap && vwapSeriesRef.current) {
      const v = calculateVWAP(data);
      vwapSeriesRef.current.setData(v.map((p) => ({ time: p.time as Time, value: p.value })));
    } else {
      vwapSeriesRef.current?.setData([]);
    }
  }, [indicators]);

  const updateChartCandle = useCallback((c: Candle) => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
    const time = Math.floor(c.timestamp / 1000) as Time;

    candleSeriesRef.current.update({
      time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    });

    volumeSeriesRef.current.update({
      time,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
    });
  }, []);

  // Update chart series with candles
  const updateChartData = useCallback((data: Candle[]) => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || data.length === 0) return;

    // Apply dynamic price scale precision based on current asset price
    const latestPrice = data[data.length - 1]?.close || currentTickerRef.current?.price || 100;
    const { precision, minMove } = getPrecisionForPrice(latestPrice);
    candleSeriesRef.current.applyOptions({
      priceFormat: {
        type: 'price',
        precision,
        minMove,
      },
    });

    const formattedCandles = data.map((c) => ({
      time: Math.floor(c.timestamp / 1000) as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const formattedVolume = data.map((c) => ({
      time: Math.floor(c.timestamp / 1000) as Time,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
    }));

    candleSeriesRef.current.setData(formattedCandles);
    volumeSeriesRef.current.setData(formattedVolume);

    // Apply indicators
    updateIndicators(data);

    // Frame the most recent 120 candles with the ability to scroll back into the 1000 historical candles
    const totalCandles = formattedCandles.length;
    if (totalCandles > 0 && chartRef.current) {
      chartRef.current.timeScale().setVisibleLogicalRange({
        from: Math.max(0, totalCandles - 120),
        to: totalCandles + 5,
      });
    }
  }, [getPrecisionForPrice, updateIndicators]);

  // Recalculate pixel coordinates for live price laser line & radar beacon
  const updateCoordinates = useCallback(() => {
    if (!candleSeriesRef.current || !chartRef.current) return;
    const history = candlesRef.current;
    const last = history[history.length - 1];
    const price = currentTickerRef.current?.price || last?.close;

    if (price !== undefined) {
      const y = candleSeriesRef.current.priceToCoordinate(price);
      setLivePriceY(y);
    }
    if (last) {
      const time = Math.floor(last.timestamp / 1000) as Time;
      const x = chartRef.current.timeScale().timeToCoordinate(time);
      setLatestCandleX(x);
    }
  }, []);

  // Subscribe to chart logical range changes (zooming / panning) to keep coordinates locked
  useEffect(() => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const handleRangeChange = () => {
      updateCoordinates();
    };
    timeScale.subscribeVisibleLogicalRangeChange(handleRangeChange);
    return () => {
      timeScale.unsubscribeVisibleLogicalRangeChange(handleRangeChange);
    };
  }, [updateCoordinates]);

  // Helper for candle duration in seconds
  const getTimeframeSeconds = useCallback((tf: string): number => {
    if (tf === '5s') return 5;
    if (tf === '15s') return 15;
    if (tf === '30s') return 30;
    if (tf === '1m') return 60;
    if (tf === '3m') return 180;
    if (tf === '5m') return 300;
    if (tf === '15m') return 900;
    if (tf === '30m') return 1800;
    if (tf === '1h') return 3600;
    if (tf === '2h') return 7200;
    if (tf === '4h') return 14400;
    if (tf === '1D') return 86400;
    return 3600;
  }, []);

  // Real-time active candle countdown loop
  useEffect(() => {
    const totalSec = getTimeframeSeconds(currentTimeframe);
    setCandleDuration(totalSec);

    const updateCountdown = () => {
      const nowSec = Date.now() / 1000;
      const elapsed = nowSec % totalSec;
      const remaining = Math.max(0, Math.ceil(totalSec - elapsed));
      setCandleTimeRemaining(remaining);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 250);
    return () => clearInterval(timer);
  }, [currentTimeframe, getTimeframeSeconds]);

  // 2. Fetch Historical Candles & Subscribe to High-Performance WebSocket Stream
  useEffect(() => {
    let isCancelled = false;
    // Only show full loading overlay if we don't have any candles yet
    if (candlesRef.current.length === 0) {
      setIsLoading(true);
    }

    ApiClient.getCandles(currentSymbol, currentTimeframe, 1000)
      .then((data) => {
        if (isCancelled || !Array.isArray(data) || data.length === 0) return;
        candlesRef.current = data;
        updateChartData(data);
        updateCoordinates();
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    // Real-time high-frequency candle tick handler
    const unsub = wsClient.subscribeCandle(currentSymbol, currentTimeframe, (incoming) => {
      const prev = candlesRef.current;
      if (prev.length === 0) {
        candlesRef.current = [incoming];
        updateChartCandle(incoming);
        updateCoordinates();
        return;
      }

      const last = prev[prev.length - 1];
      if (last.timestamp === incoming.timestamp) {
        candlesRef.current[prev.length - 1] = incoming;
      } else {
        candlesRef.current.push(incoming);
        if (candlesRef.current.length > 1000) candlesRef.current.shift();
      }

      updateChartCandle(incoming);
      updateCoordinates();
    });

    return () => {
      isCancelled = true;
      unsub();
    };
  }, [currentSymbol, currentTimeframe, updateChartData, updateCoordinates]);

  // Ultra-smooth 60fps live candle tick update from current ticker
  useEffect(() => {
    if (!currentTicker || currentTicker.symbol !== currentSymbol) return;
    if (!candleSeriesRef.current || candlesRef.current.length === 0) return;

    const price = currentTicker.price;
    const history = candlesRef.current;
    const last = history[history.length - 1];
    if (!last) return;

    // Detect tick direction & visual laser pulse
    if (lastTickPriceRef.current !== 0 && price !== lastTickPriceRef.current) {
      const dir = price > lastTickPriceRef.current ? 'up' : 'down';
      setTickDirection(dir);
      setTickFlash(true);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setTickFlash(false), 400);
    }
    lastTickPriceRef.current = price;

    const updated: Candle = {
      ...last,
      close: price,
      high: Math.max(last.high, price),
      low: Math.min(last.low, price),
    };
    candlesRef.current[history.length - 1] = updated;

    updateChartCandle(updated);
    updateCoordinates();
  }, [currentTicker?.price, currentTicker?.symbol, currentSymbol, updateCoordinates]);

  // Periodic throttled indicator update (avoiding heavy 1000-candle recalculation on every 200ms tick)
  useEffect(() => {
    const timer = setInterval(() => {
      if (candlesRef.current.length > 20) {
        updateIndicators(candlesRef.current);
      }
    }, 2500);
    return () => clearInterval(timer);
  }, []);



  // Re-run indicators when toggles change
  useEffect(() => {
    if (candlesRef.current.length > 0) {
      updateIndicators(candlesRef.current);
    }
  }, [indicators, updateIndicators]);

  // 3. Drawing Interactions
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === 'select' || activeTool === 'crosshair') return;

    const rect = svgOverlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const price = candleSeriesRef.current ? candleSeriesRef.current.coordinateToPrice(y) || currentTicker?.price || 0 : 0;

    // Single-Click Placement: Horizontal Line
    if (activeTool === 'horizontal_line') {
      const item: DrawingItem = {
        id: `draw-${Date.now()}`,
        toolType: 'horizontal_line',
        price,
        p1: { x: 0, y, price },
        p2: { x: dimensions.width, y, price },
      };

      if (candleSeriesRef.current && price) {
        try {
          const line = candleSeriesRef.current.createPriceLine({
            price,
            color: '#F59E0B',
            lineWidth: 2,
            lineStyle: 0,
            axisLabelVisible: true,
            title: `H $${formatPrice(price, currentSymbol)}`,
          });
          item.priceLineRef = line;
        } catch {}
      }

      setDrawings((prev) => [...prev, item]);
      return;
    }

    // Single-Click Placement: Vertical Line
    if (activeTool === 'vertical_line') {
      const item: DrawingItem = {
        id: `draw-${Date.now()}`,
        toolType: 'vertical_line',
        p1: { x, y: 0 },
        p2: { x, y: dimensions.height },
      };
      setDrawings((prev) => [...prev, item]);
      return;
    }

    // Single-Click Placement: Risk / Reward
    if (activeTool === 'risk_reward') {
      const boxWidth = 140;
      const targetHeight = 60;
      const riskHeight = 30;
      const item: DrawingItem = {
        id: `draw-${Date.now()}`,
        toolType: 'risk_reward',
        price,
        p1: { x: Math.max(10, x - boxWidth / 2), y: Math.max(10, y - targetHeight) },
        p2: { x: Math.max(10, x - boxWidth / 2) + boxWidth, y: y + riskHeight },
      };
      setDrawings((prev) => [...prev, item]);
      return;
    }

    // Drag-based tools: Trendline, Rectangle, Support/Resistance
    const item: DrawingItem = {
      id: `draw-${Date.now()}`,
      toolType: activeTool as DrawingToolType,
      price,
      p1: { x, y, price },
      p2: { x, y, price },
    };
    setCurrentDrawing(item);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!currentDrawing) return;
    const rect = svgOverlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentDrawing((prev) => (prev ? { ...prev, p2: { x, y } } : null));
  };

  const handleMouseUp = () => {
    if (currentDrawing) {
      let finalItem = { ...currentDrawing };
      if (finalItem.p2 && Math.abs(finalItem.p2.x - finalItem.p1.x) < 5 && Math.abs(finalItem.p2.y - finalItem.p1.y) < 5) {
        if (finalItem.toolType === 'trendline') {
          finalItem.p2 = { x: finalItem.p1.x + 140, y: finalItem.p1.y - 40 };
        } else if (finalItem.toolType === 'rectangle' || finalItem.toolType === 'support_resistance') {
          finalItem.p2 = { x: finalItem.p1.x + 180, y: finalItem.p1.y + 45 };
        }
      }

      setDrawings((prev) => [...prev, finalItem]);
      setCurrentDrawing(null);
    }
  };

  const handleClearAllDrawings = () => {
    drawings.forEach((d) => {
      if (d.priceLineRef && candleSeriesRef.current) {
        try {
          candleSeriesRef.current.removePriceLine(d.priceLineRef);
        } catch {}
      }
    });
    setDrawings([]);
    setCurrentDrawing(null);
  };

  const getPriceY = (price: number): number | null => {
    if (!candleSeriesRef.current || !chartRef.current) return null;
    return candleSeriesRef.current.priceToCoordinate(price);
  };

  const handleResetChart = () => {
    chartRef.current?.timeScale().resetTimeScale();
    chartRef.current?.timeScale().fitContent();
    updateCoordinates();
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      chartContainerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleTakeSnapshot = () => {
    if (!chartRef.current) return;
    const canvas = chartRef.current.takeScreenshot();
    const dataUrl = canvas.toDataURL('image/png');

    if (onTradeSnapshot) {
      onTradeSnapshot(dataUrl);
    }

    const link = document.createElement('a');
    link.download = `${currentSymbol}_${currentTimeframe}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Trade Planner Line Coordinates
  const plannerEntryY = plannedTrade?.visible && plannedTrade.entryPrice ? getPriceY(plannedTrade.entryPrice) : null;
  const plannerSlY = plannedTrade?.visible && plannedTrade.stopLoss ? getPriceY(plannedTrade.stopLoss) : null;
  const plannerTpY = plannedTrade?.visible && plannedTrade.takeProfit ? getPriceY(plannedTrade.takeProfit) : null;

  const isDrawingMode = activeTool !== 'select' && activeTool !== 'crosshair';
  const isUp = tickDirection === 'up';
  const candleProgress = candleDuration > 0 ? (candleDuration - candleTimeRemaining) / candleDuration : 0;
  const beaconX = latestCandleX !== null && latestCandleX > 0 && latestCandleX < dimensions.width ? latestCandleX : dimensions.width - 110;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0E14] overflow-hidden relative select-none">
      {/* Top Chart Toolbar */}
      <ChartToolbar
        indicators={indicators}
        setIndicators={updateIndicatorsState}
        onResetChart={handleResetChart}
        onFullscreen={handleFullscreen}
        onTakeSnapshot={handleTakeSnapshot}
        isZenMode={isZenMode}
        onToggleZenMode={onToggleZenMode}
        isCyber3D={isCyber3D}
        onToggleCyber3D={() => setIsCyber3D(!isCyber3D)}
      />

      {/* Main Body: Drawing Toolbar + 3D Cyber Depth + Chart Canvas + SVG Drawing Overlay */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Drawing Tools */}
        <DrawingToolbar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          onClearAll={handleClearAllDrawings}
        />

        {/* Lightweight Charts Canvas Container + Overlays */}
        <div className="flex-1 relative h-full bg-[#0B0E14] overflow-hidden">
          {/* 3D Cyber Depth WebGL Canvas (Background layer when active) */}
          <CyberChart3D ticker={currentTicker} isActive={isCyber3D} />

          {/* Interactive Lightweight Charts Engine Canvas */}
          <div ref={chartContainerRef} className="w-full h-full relative z-10" />

          {/* Active Candle Countdown Widget */}
          <div className="absolute top-3 right-4 z-20 bg-surface-elevated/85 backdrop-blur-md border border-border px-3 py-1.5 rounded-lg flex items-center gap-2.5 text-xs font-mono shadow-xl pointer-events-none">
            <div className="relative w-4 h-4 flex items-center justify-center">
              <svg className="w-4 h-4 -rotate-90" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" fill="none" />
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke={isUp ? '#10B981' : '#EF4444'}
                  strokeWidth="2.5"
                  fill="none"
                  strokeDasharray={62.83}
                  strokeDashoffset={62.83 * (1 - candleProgress)}
                  className="countdown-gauge"
                />
              </svg>
            </div>
            <div className="flex flex-col text-[11px] leading-tight">
              <span className="text-slate-400 text-[9px] uppercase tracking-wider">{currentTimeframe} BAR CLOSE</span>
              <span className="font-bold text-white tracking-wider">
                {formatCountdown(candleTimeRemaining)}
              </span>
            </div>
            <div className={`w-1.5 h-1.5 rounded-full ${isUp ? 'bg-emerald-400' : 'bg-rose-400'} animate-ping ml-0.5`} />
          </div>

          {/* Active Tool Floating Helper Banner */}
          {isDrawingMode && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-surface-elevated/90 backdrop-blur-sm border border-brand/40 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-mono text-white shadow-xl animate__animated animate__fadeInDown animate__faster">
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
              <span>Click chart to place <strong>{activeTool.replace('_', ' ')}</strong></span>
              <button
                onClick={() => setActiveTool('crosshair')}
                className="ml-1 p-0.5 text-slate-400 hover:text-white rounded-full hover:bg-surface transition"
                title="Cancel drawing tool"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Interactive SVG Overlay (Drawings + Glowing Laser Price Line + Radar Beacon) */}
          <svg
            ref={svgOverlayRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className={`absolute inset-0 w-full h-full ${
              isDrawingMode
                ? 'z-20 pointer-events-auto cursor-crosshair'
                : 'z-10 pointer-events-none'
            }`}
          >
            {/* SVG Filters for Laser Glow */}
            <defs>
              <filter id="laser-glow-green" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="laser-glow-red" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Render Finished Drawings */}
            {drawings.map((d) => renderDrawing(d, false, dimensions.width, dimensions.height, currentSymbol))}

            {/* Render Active In-Progress Drawing */}
            {currentDrawing && renderDrawing(currentDrawing, true, dimensions.width, dimensions.height, currentSymbol)}

            {/* 1. Animated Glowing Laser Price Line & Radar Beacon */}
            {livePriceY !== null && livePriceY > 0 && livePriceY < dimensions.height && (
              <g className="transition-all duration-75">
                {/* Glowing Laser Beam Line */}
                <line
                  x1={Math.max(0, beaconX - 25)}
                  y1={livePriceY}
                  x2={dimensions.width}
                  y2={livePriceY}
                  stroke={isUp ? '#10B981' : '#EF4444'}
                  strokeWidth={1.75}
                  strokeDasharray="6 4"
                  className="laser-dash-anim"
                  filter={`url(#laser-glow-${isUp ? 'green' : 'red'})`}
                />

                {/* Pulsating Radar Beacon on current active candle */}
                <g transform={`translate(${beaconX}, ${livePriceY})`}>
                  <circle r={14} fill="none" stroke={isUp ? '#10B981' : '#EF4444'} strokeWidth={1.5} className="radar-wave-1" />
                  <circle r={26} fill="none" stroke={isUp ? '#10B981' : '#EF4444'} strokeWidth={1} className="radar-wave-2" />
                  <circle r={4.5} fill={isUp ? '#10B981' : '#EF4444'} />
                  <circle r={2} fill="#FFFFFF" />
                </g>

                {/* Floating Live Price HUD Pill on the right edge */}
                <g transform={`translate(${dimensions.width - 98}, ${livePriceY - 11})`} className="cursor-default">
                  <rect
                    width={90}
                    height={22}
                    rx={4}
                    fill={isUp ? 'rgba(6, 78, 59, 0.9)' : 'rgba(127, 29, 29, 0.9)'}
                    stroke={isUp ? '#10B981' : '#EF4444'}
                    strokeWidth={1.25}
                    className={tickFlash ? (isUp ? 'watchlist-tick-up' : 'watchlist-tick-down') : ''}
                  />
                  <text
                    x={45}
                    y={15}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize={11}
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {isUp ? '▲' : '▼'} {formatPrice(currentTicker?.price || 0, currentSymbol)}
                  </text>
                </g>
              </g>
            )}

            {/* Render Visual Trade Planner Lines */}
            {plannedTrade?.visible && plannerEntryY !== null && (
              <g className="transition-all">
                {/* Entry line */}
                <line
                  x1="0"
                  y1={plannerEntryY}
                  x2={dimensions.width}
                  y2={plannerEntryY}
                  stroke="#3B82F6"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                <text x="10" y={plannerEntryY - 4} fill="#3B82F6" fontSize="11" fontFamily="monospace" fontWeight="bold">
                  ENTRY: {formatPrice(plannedTrade.entryPrice, currentSymbol)}
                </text>

                {/* Stop Loss line & zone */}
                {plannerSlY !== null && (
                  <>
                    <rect
                      x="0"
                      y={Math.min(plannerEntryY, plannerSlY)}
                      width={dimensions.width}
                      height={Math.abs(plannerSlY - plannerEntryY)}
                      fill="rgba(239, 68, 68, 0.08)"
                    />
                    <line
                      x1="0"
                      y1={plannerSlY}
                      x2={dimensions.width}
                      y2={plannerSlY}
                      stroke="#EF4444"
                      strokeWidth="1.5"
                    />
                    <text x="10" y={plannerSlY - 4} fill="#EF4444" fontSize="11" fontFamily="monospace" fontWeight="bold">
                      STOP LOSS: {formatPrice(plannedTrade.stopLoss, currentSymbol)}
                    </text>
                  </>
                )}

                {/* Take Profit line & zone */}
                {plannerTpY !== null && (
                  <>
                    <rect
                      x="0"
                      y={Math.min(plannerEntryY, plannerTpY)}
                      width={dimensions.width}
                      height={Math.abs(plannerTpY - plannerEntryY)}
                      fill="rgba(16, 185, 129, 0.08)"
                    />
                    <line
                      x1="0"
                      y1={plannerTpY}
                      x2={dimensions.width}
                      y2={plannerTpY}
                      stroke="#10B981"
                      strokeWidth="1.5"
                    />
                    <text x="10" y={plannerTpY - 4} fill="#10B981" fontSize="11" fontFamily="monospace" fontWeight="bold">
                      TAKE PROFIT: {formatPrice(plannedTrade.takeProfit, currentSymbol)}
                    </text>
                  </>
                )}
              </g>
            )}
          </svg>

          {/* Loading Skeleton Indicator */}
          {isLoading && candlesRef.current.length === 0 && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-20 pointer-events-none">
              <div className="flex items-center gap-2 bg-surface-elevated px-4 py-2 rounded-lg border border-border text-xs font-mono text-slate-300 shadow-xl">
                <span className="w-2.5 h-2.5 rounded-full bg-brand animate-ping" />
                <span>Loading {currentSymbol} chart data...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper to render user drawings (horizontal line, trendline, rectangle, risk/reward)
function renderDrawing(d: DrawingItem, isDraft = false, svgWidth = 1000, svgHeight = 600, symbol = 'BTCUSDT') {
  if (!d.p2) return null;

  switch (d.toolType) {
    case 'horizontal_line': {
      const priceText = d.price ? formatPrice(d.price, symbol) : 'H-Line';
      const badgeWidth = Math.max(75, priceText.length * 7.5 + 16);
      return (
        <g key={d.id}>
          <line
            x1={0}
            y1={d.p1.y}
            x2={svgWidth}
            y2={d.p1.y}
            stroke="#F59E0B"
            strokeWidth={2}
            strokeDasharray={isDraft ? '4 4' : undefined}
          />
          <rect
            x={Math.max(10, svgWidth - badgeWidth - 10)}
            y={d.p1.y - 10}
            width={badgeWidth}
            height={20}
            rx={4}
            fill="#F59E0B"
          />
          <text
            x={Math.max(10, svgWidth - badgeWidth / 2 - 10)}
            y={d.p1.y + 4}
            fill="#000"
            fontSize="10"
            textAnchor="middle"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {priceText}
          </text>
        </g>
      );
    }
    case 'vertical_line':
      return (
        <g key={d.id}>
          <line
            x1={d.p1.x}
            y1={0}
            x2={d.p1.x}
            y2={svgHeight}
            stroke="#3B82F6"
            strokeWidth={1.5}
            strokeDasharray={isDraft ? '4 4' : '2 2'}
          />
          <circle cx={d.p1.x} cy={12} r={3.5} fill="#3B82F6" />
        </g>
      );
    case 'trendline':
      return (
        <g key={d.id}>
          <line
            x1={d.p1.x}
            y1={d.p1.y}
            x2={d.p2.x}
            y2={d.p2.y}
            stroke="#06B6D4"
            strokeWidth={2}
            strokeDasharray={isDraft ? '4 4' : undefined}
          />
          <circle cx={d.p1.x} cy={d.p1.y} r={4} fill="#06B6D4" stroke="#fff" strokeWidth={1.5} />
          <circle cx={d.p2.x} cy={d.p2.y} r={4} fill="#06B6D4" stroke="#fff" strokeWidth={1.5} />
        </g>
      );
    case 'rectangle':
    case 'support_resistance': {
      const rx = Math.min(d.p1.x, d.p2.x);
      const ry = Math.min(d.p1.y, d.p2.y);
      const rw = Math.max(10, Math.abs(d.p2.x - d.p1.x));
      const rh = Math.max(10, Math.abs(d.p2.y - d.p1.y));
      const isSR = d.toolType === 'support_resistance';
      return (
        <g key={d.id}>
          <rect
            x={rx}
            y={ry}
            width={rw}
            height={rh}
            fill={isSR ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)'}
            stroke={isSR ? '#F59E0B' : '#3B82F6'}
            strokeWidth={1.5}
            strokeDasharray={isDraft ? '4 4' : undefined}
            rx={2}
          />
          <text
            x={rx + 6}
            y={ry + 14}
            fill={isSR ? '#F59E0B' : '#3B82F6'}
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {isSR ? 'S/R ZONE' : 'ZONE'}
          </text>
        </g>
      );
    }
    case 'risk_reward': {
      const topY = Math.min(d.p1.y, d.p2.y);
      const botY = Math.max(d.p1.y, d.p2.y);
      const midY = topY + (botY - topY) * 0.65;
      const leftX = Math.min(d.p1.x, d.p2.x);
      const width = Math.max(90, Math.abs(d.p2.x - d.p1.x));

      return (
        <g key={d.id}>
          {/* Target Green Zone */}
          <rect
            x={leftX}
            y={topY}
            width={width}
            height={midY - topY}
            fill="rgba(16, 185, 129, 0.22)"
            stroke="#10B981"
            strokeWidth={1.5}
          />
          {/* Risk Red Zone */}
          <rect
            x={leftX}
            y={midY}
            width={width}
            height={botY - midY}
            fill="rgba(239, 68, 68, 0.22)"
            stroke="#EF4444"
            strokeWidth={1.5}
          />
          <line
            x1={leftX}
            y1={midY}
            x2={leftX + width}
            y2={midY}
            stroke="#fff"
            strokeWidth={1}
            strokeDasharray="4 2"
          />
          <text x={leftX + 6} y={midY - 8} fill="#10B981" fontSize="10" fontWeight="bold" fontFamily="monospace">
            TARGET (2.0R)
          </text>
          <text x={leftX + 6} y={midY + 16} fill="#EF4444" fontSize="10" fontWeight="bold" fontFamily="monospace">
            STOP LOSS (1.0R)
          </text>
        </g>
      );
    }
    default:
      return null;
  }
}
