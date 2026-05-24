// Mathematical expression evaluator for ThinkInMotion
// Converts string math expressions to numeric values

import { evaluate } from 'mathjs';

export function evalFunction(expr: string, x: number): number {
  try {
    const result = evaluate(expr, { x, e: Math.E, pi: Math.PI });
    if (typeof result === 'number' && isFinite(result)) {
      return result;
    }
    return NaN;
  } catch {
    return NaN;
  }
}

export function generateGraphPoints(
  expr: string,
  xMin: number,
  xMax: number,
  steps = 200
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const step = (xMax - xMin) / steps;

  for (let i = 0; i <= steps; i++) {
    const x = xMin + i * step;
    const y = evalFunction(expr, x);
    if (!isNaN(y) && isFinite(y)) {
      points.push({ x, y });
    }
  }

  return points;
}

export function getTangentLine(
  expr: string,
  x0: number,
  length = 2
): { x1: number; y1: number; x2: number; y2: number; slope: number } {
  const h = 0.0001;
  const y0 = evalFunction(expr, x0);
  const slope = (evalFunction(expr, x0 + h) - evalFunction(expr, x0 - h)) / (2 * h);

  return {
    x1: x0 - length,
    y1: y0 - slope * length,
    x2: x0 + length,
    y2: y0 + slope * length,
    slope,
  };
}

// Convert math coordinates to canvas coordinates
export function mathToCanvas(
  mx: number,
  my: number,
  canvasWidth: number,
  canvasHeight: number,
  xRange: [number, number],
  yRange: [number, number]
): { cx: number; cy: number } {
  const cx = ((mx - xRange[0]) / (xRange[1] - xRange[0])) * canvasWidth;
  const cy = canvasHeight - ((my - yRange[0]) / (yRange[1] - yRange[0])) * canvasHeight;
  return { cx, cy };
}

// Convert canvas coordinates to math coordinates
export function canvasToMath(
  cx: number,
  cy: number,
  canvasWidth: number,
  canvasHeight: number,
  xRange: [number, number],
  yRange: [number, number]
): { mx: number; my: number } {
  const mx = xRange[0] + (cx / canvasWidth) * (xRange[1] - xRange[0]);
  const my = yRange[0] + ((canvasHeight - cy) / canvasHeight) * (yRange[1] - yRange[0]);
  return { mx, my };
}
