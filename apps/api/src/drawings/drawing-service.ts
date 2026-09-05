import type { ChartDrawing, DrawingToolType, Timeframe } from '@trading/types';
import { prisma } from '../db/prisma.js';

export class DrawingService {
  static async getDrawings(userId: string, symbol: string, timeframe?: Timeframe): Promise<ChartDrawing[]> {
    const where: any = { userId, symbol: symbol.toUpperCase() };
    if (timeframe) where.timeframe = timeframe;

    const drawings = await prisma.chartDrawing.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return drawings.map((d) => ({
      id: d.id,
      symbol: d.symbol,
      timeframe: d.timeframe as Timeframe,
      toolType: d.toolType as DrawingToolType,
      points: JSON.parse(d.pointsJson),
      style: JSON.parse(d.styleJson),
      text: d.text || undefined,
      isLocked: d.isLocked,
      visible: d.visible,
    }));
  }

  static async saveDrawing(
    userId: string,
    drawing: {
      id?: string;
      symbol: string;
      timeframe: Timeframe;
      toolType: DrawingToolType;
      points: { time: number; price: number }[];
      style: any;
      text?: string;
      isLocked?: boolean;
      visible?: boolean;
    }
  ): Promise<ChartDrawing> {
    if (drawing.id) {
      const existing = await prisma.chartDrawing.findFirst({
        where: { id: drawing.id, userId },
      });
      if (existing) {
        const updated = await prisma.chartDrawing.update({
          where: { id: drawing.id },
          data: {
            pointsJson: JSON.stringify(drawing.points),
            styleJson: JSON.stringify(drawing.style),
            text: drawing.text,
            isLocked: drawing.isLocked ?? existing.isLocked,
            visible: drawing.visible ?? existing.visible,
          },
        });
        return {
          id: updated.id,
          symbol: updated.symbol,
          timeframe: updated.timeframe as Timeframe,
          toolType: updated.toolType as DrawingToolType,
          points: JSON.parse(updated.pointsJson),
          style: JSON.parse(updated.styleJson),
          text: updated.text || undefined,
          isLocked: updated.isLocked,
          visible: updated.visible,
        };
      }
    }

    const created = await prisma.chartDrawing.create({
      data: {
        userId,
        symbol: drawing.symbol.toUpperCase(),
        timeframe: drawing.timeframe,
        toolType: drawing.toolType,
        pointsJson: JSON.stringify(drawing.points),
        styleJson: JSON.stringify(drawing.style),
        text: drawing.text,
        isLocked: drawing.isLocked ?? false,
        visible: drawing.visible ?? true,
      },
    });

    return {
      id: created.id,
      symbol: created.symbol,
      timeframe: created.timeframe as Timeframe,
      toolType: created.toolType as DrawingToolType,
      points: JSON.parse(created.pointsJson),
      style: JSON.parse(created.styleJson),
      text: created.text || undefined,
      isLocked: created.isLocked,
      visible: created.visible,
    };
  }

  static async deleteDrawing(id: string, userId: string): Promise<boolean> {
    const existing = await prisma.chartDrawing.findFirst({ where: { id, userId } });
    if (!existing) return false;
    await prisma.chartDrawing.delete({ where: { id } });
    return true;
  }
}
