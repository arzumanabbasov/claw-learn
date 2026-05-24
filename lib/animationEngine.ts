// Animation Engine for ThinkInMotion
// Deterministic renderer that converts JSON scene plans into canvas animations

import { Scene, SceneElement, SceneAnimation } from '@/types/scene';
import {
  generateGraphPoints,
  getTangentLine,
  mathToCanvas,
  evalFunction,
} from './mathRenderer';

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  xRange: [number, number];
  yRange: [number, number];
  padding: number;
}

export interface AnimationState {
  progress: number; // 0 to 1
  scene: Scene;
  elements: Map<string, SceneElement>;
}

const COLORS = {
  blue: '#4f9cf9',
  red: '#ff6b6b',
  yellow: '#ffd93d',
  green: '#6bcb77',
  purple: '#c77dff',
  orange: '#ff9f43',
  cyan: '#00d2d3',
  white: '#ffffff',
  gray: '#8892a4',
  background: '#0a0a0f',
  grid: '#1a1a2e',
  axis: '#2a2a4a',
};

function resolveColor(color?: string): string {
  if (!color) return COLORS.blue;
  if (color.startsWith('#')) return color;
  return COLORS[color as keyof typeof COLORS] || color;
}

export class SceneRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private padding: number;
  private xRange: [number, number];
  private yRange: [number, number];
  private animationFrame: number | null = null;
  private startTime: number | null = null;
  private onComplete: (() => void) | null = null;
  private currentScene: Scene | null = null;
  private tangentX = -3;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.padding = 60;
    this.xRange = [-5, 5];
    this.yRange = [-4, 4];
  }

  private toCanvas(mx: number, my: number): { cx: number; cy: number } {
    return mathToCanvas(
      mx,
      my,
      this.width - this.padding * 2,
      this.height - this.padding * 2,
      this.xRange,
      this.yRange
    );
  }

  private toCx(mx: number): number {
    return (
      this.padding +
      ((mx - this.xRange[0]) / (this.xRange[1] - this.xRange[0])) *
        (this.width - this.padding * 2)
    );
  }

  private toCy(my: number): number {
    return (
      this.padding +
      (1 - (my - this.yRange[0]) / (this.yRange[1] - this.yRange[0])) *
        (this.height - this.padding * 2)
    );
  }

  private clearCanvas() {
    this.ctx.fillStyle = COLORS.background;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([]);

    // Vertical grid lines
    for (let x = Math.ceil(this.xRange[0]); x <= this.xRange[1]; x++) {
      const cx = this.toCx(x);
      ctx.beginPath();
      ctx.moveTo(cx, this.padding);
      ctx.lineTo(cx, this.height - this.padding);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let y = Math.ceil(this.yRange[0]); y <= this.yRange[1]; y++) {
      const cy = this.toCy(y);
      ctx.beginPath();
      ctx.moveTo(this.padding, cy);
      ctx.lineTo(this.width - this.padding, cy);
      ctx.stroke();
    }
  }

  private drawAxes(progress = 1) {
    const ctx = this.ctx;
    const originX = this.toCx(0);
    const originY = this.toCy(0);

    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);

    // X axis
    const xEnd = this.padding + (this.width - this.padding * 2) * progress;
    ctx.beginPath();
    ctx.moveTo(this.padding, originY);
    ctx.lineTo(xEnd, originY);
    ctx.stroke();

    // Y axis
    const yStart = this.height - this.padding - (this.height - this.padding * 2) * progress;
    ctx.beginPath();
    ctx.moveTo(originX, this.height - this.padding);
    ctx.lineTo(originX, yStart);
    ctx.stroke();

    if (progress < 1) return;

    // Arrowheads
    ctx.fillStyle = COLORS.axis;
    // X arrow
    ctx.beginPath();
    ctx.moveTo(this.width - this.padding, originY);
    ctx.lineTo(this.width - this.padding - 8, originY - 4);
    ctx.lineTo(this.width - this.padding - 8, originY + 4);
    ctx.fill();
    // Y arrow
    ctx.beginPath();
    ctx.moveTo(originX, this.padding);
    ctx.lineTo(originX - 4, this.padding + 8);
    ctx.lineTo(originX + 4, this.padding + 8);
    ctx.fill();

    // Axis labels
    ctx.fillStyle = COLORS.gray;
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('x', this.width - this.padding + 12, originY + 4);
    ctx.fillText('y', originX, this.padding - 8);

    // Tick marks and numbers
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = COLORS.gray;
    for (let x = Math.ceil(this.xRange[0]); x <= this.xRange[1]; x++) {
      if (x === 0) continue;
      const cx = this.toCx(x);
      ctx.beginPath();
      ctx.moveTo(cx, originY - 4);
      ctx.lineTo(cx, originY + 4);
      ctx.strokeStyle = COLORS.gray;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillText(String(x), cx, originY + 16);
    }
    for (let y = Math.ceil(this.yRange[0]); y <= this.yRange[1]; y++) {
      if (y === 0) continue;
      const cy = this.toCy(y);
      ctx.beginPath();
      ctx.moveTo(originX - 4, cy);
      ctx.lineTo(originX + 4, cy);
      ctx.strokeStyle = COLORS.gray;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(String(y), originX - 8, cy + 4);
    }
    ctx.textAlign = 'center';
  }

  private drawGraph(
    expr: string,
    color: string,
    progress = 1,
    xRange?: [number, number]
  ) {
    const ctx = this.ctx;
    const range = xRange || this.xRange;
    const points = generateGraphPoints(expr, range[0], range[1], 300);

    if (points.length === 0) return;

    const visibleCount = Math.floor(points.length * progress);
    if (visibleCount === 0) return;

    ctx.strokeStyle = resolveColor(color);
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Glow effect
    ctx.shadowColor = resolveColor(color);
    ctx.shadowBlur = 8;

    ctx.beginPath();
    let started = false;
    for (let i = 0; i < visibleCount; i++) {
      const { x, y } = points[i];
      if (y < this.yRange[0] - 1 || y > this.yRange[1] + 1) {
        started = false;
        continue;
      }
      const cx = this.toCx(x);
      const cy = this.toCy(y);
      if (!started) {
        ctx.moveTo(cx, cy);
        started = true;
      } else {
        ctx.lineTo(cx, cy);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private drawTangentLine(
    expr: string,
    x0: number,
    color: string,
    progress = 1
  ) {
    const ctx = this.ctx;
    const tangent = getTangentLine(expr, x0, 1.5);
    const y0 = evalFunction(expr, x0);

    // Draw tangent line
    const x1 = x0 - 1.5 * progress;
    const y1 = y0 - tangent.slope * 1.5 * progress;
    const x2 = x0 + 1.5 * progress;
    const y2 = y0 + tangent.slope * 1.5 * progress;

    ctx.strokeStyle = resolveColor(color);
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.shadowColor = resolveColor(color);
    ctx.shadowBlur = 6;

    ctx.beginPath();
    ctx.moveTo(this.toCx(x1), this.toCy(y1));
    ctx.lineTo(this.toCx(x2), this.toCy(y2));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // Draw point on curve
    const pcx = this.toCx(x0);
    const pcy = this.toCy(y0);
    ctx.fillStyle = resolveColor(color);
    ctx.shadowColor = resolveColor(color);
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(pcx, pcy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Slope label
    if (progress > 0.8) {
      ctx.fillStyle = resolveColor(color);
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.textAlign = 'left';
      const slopeText = `slope = ${tangent.slope.toFixed(2)}`;
      ctx.fillText(slopeText, pcx + 10, pcy - 10);
    }
  }

  private drawPoint(
    x: number,
    y: number,
    color: string,
    label?: string,
    progress = 1
  ) {
    const ctx = this.ctx;
    const cx = this.toCx(x);
    const cy = this.toCy(y);
    const radius = 6 * progress;

    ctx.fillStyle = resolveColor(color);
    ctx.shadowColor = resolveColor(color);
    ctx.shadowBlur = 15 * progress;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (label && progress > 0.7) {
      ctx.fillStyle = COLORS.white;
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, cx + 10, cy - 8);
    }
  }

  private drawVector(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    label?: string,
    progress = 1
  ) {
    const ctx = this.ctx;
    const cx1 = this.toCx(x1);
    const cy1 = this.toCy(y1);
    const cx2 = this.toCx(x1 + (x2 - x1) * progress);
    const cy2 = this.toCy(y1 + (y2 - y1) * progress);

    const resolvedColor = resolveColor(color);
    ctx.strokeStyle = resolvedColor;
    ctx.fillStyle = resolvedColor;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.shadowColor = resolvedColor;
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(cx1, cy1);
    ctx.lineTo(cx2, cy2);
    ctx.stroke();

    // Arrowhead
    if (progress > 0.5) {
      const angle = Math.atan2(cy2 - cy1, cx2 - cx1);
      const arrowLen = 12;
      ctx.beginPath();
      ctx.moveTo(cx2, cy2);
      ctx.lineTo(
        cx2 - arrowLen * Math.cos(angle - 0.4),
        cy2 - arrowLen * Math.sin(angle - 0.4)
      );
      ctx.lineTo(
        cx2 - arrowLen * Math.cos(angle + 0.4),
        cy2 - arrowLen * Math.sin(angle + 0.4)
      );
      ctx.closePath();
      ctx.fill();
    }

    ctx.shadowBlur = 0;

    if (label && progress > 0.8) {
      const midX = (cx1 + cx2) / 2;
      const midY = (cy1 + cy2) / 2;
      ctx.fillStyle = resolvedColor;
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, midX + 12, midY - 8);
    }
  }

  private drawShadedArea(
    expr: string,
    xRange: [number, number],
    color: string,
    progress = 1
  ) {
    const ctx = this.ctx;
    const xEnd = xRange[0] + (xRange[1] - xRange[0]) * progress;
    const points = generateGraphPoints(expr, xRange[0], xEnd, 150);
    if (points.length === 0) return;

    const resolvedColor = resolveColor(color);
    ctx.fillStyle = resolvedColor + '33';
    ctx.strokeStyle = resolvedColor;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(this.toCx(xRange[0]), this.toCy(0));
    for (const { x, y } of points) {
      ctx.lineTo(this.toCx(x), this.toCy(y));
    }
    ctx.lineTo(this.toCx(xEnd), this.toCy(0));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawFormula(text: string, position: string, progress = 1) {
    const ctx = this.ctx;
    const alpha = Math.min(1, progress * 2);
    ctx.globalAlpha = alpha;

    let x = this.width / 2;
    let y = 30;

    switch (position) {
      case 'bottom':
        y = this.height - 20;
        break;
      case 'left':
        x = 80;
        y = this.height / 2;
        break;
      case 'right':
        x = this.width - 80;
        y = this.height / 2;
        break;
      case 'center':
        y = this.height / 2;
        break;
    }

    ctx.fillStyle = COLORS.yellow;
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = COLORS.yellow;
    ctx.shadowBlur = 10;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  private drawLabel(
    text: string,
    x: number,
    y: number,
    color: string,
    progress = 1
  ) {
    const ctx = this.ctx;
    ctx.globalAlpha = Math.min(1, progress * 2);
    ctx.fillStyle = resolveColor(color);
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(text, this.toCx(x), this.toCy(y));
    ctx.globalAlpha = 1;
  }

  private drawCircle(
    x: number,
    y: number,
    radius: number,
    color: string,
    filled = false,
    progress = 1
  ) {
    const ctx = this.ctx;
    const cx = this.toCx(x);
    const cy = this.toCy(y);
    const cr =
      (radius / (this.xRange[1] - this.xRange[0])) *
      (this.width - this.padding * 2);

    const resolvedColor = resolveColor(color);
    ctx.strokeStyle = resolvedColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = resolvedColor;
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2 * progress);
    if (filled) {
      ctx.fillStyle = resolvedColor + '44';
      ctx.fill();
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private drawArrow(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    progress = 1
  ) {
    this.drawVector(x1, y1, x2, y2, color, undefined, progress);
  }

  private drawText(
    text: string,
    x: number,
    y: number,
    fontSize = 14,
    color = '#ffffff',
    progress = 1
  ) {
    const ctx = this.ctx;
    ctx.globalAlpha = Math.min(1, progress * 2);
    ctx.fillStyle = resolveColor(color);
    ctx.font = `${fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(text, this.toCx(x), this.toCy(y));
    ctx.globalAlpha = 1;
  }

  private drawNumberLine(range: [number, number], progress = 1) {
    const ctx = this.ctx;
    const y = this.height / 2;
    const xStart = this.padding;
    const xEnd = this.padding + (this.width - this.padding * 2) * progress;

    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xStart, y);
    ctx.lineTo(xEnd, y);
    ctx.stroke();

    if (progress < 0.5) return;

    ctx.fillStyle = COLORS.gray;
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';

    for (let n = range[0]; n <= range[1]; n++) {
      const cx =
        xStart +
        ((n - range[0]) / (range[1] - range[0])) * (this.width - this.padding * 2);
      ctx.beginPath();
      ctx.moveTo(cx, y - 6);
      ctx.lineTo(cx, y + 6);
      ctx.strokeStyle = COLORS.gray;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillText(String(n), cx, y + 20);
    }
  }

  renderScene(scene: Scene, progress: number) {
    this.clearCanvas();

    // Update ranges from scene if specified
    const hasAxes = scene.elements.some(
      (e) => e.type === 'axes' || e.type === 'coordinate_plane'
    );

    if (hasAxes) {
      this.drawGrid();
    }

    // Render each element based on animation progress
    const totalAnimations = scene.animations.length;
    const animProgress = totalAnimations > 0 ? progress : 1;

    for (const element of scene.elements) {
      const elemProgress = Math.min(1, animProgress * 1.5);

      switch (element.type) {
        case 'axes':
          this.drawAxes(elemProgress);
          break;

        case 'coordinate_plane':
          this.drawAxes(elemProgress);
          break;

        case 'graph':
          if (element.function) {
            const xRange = element.xRange || this.xRange;
            this.drawGraph(
              element.function,
              element.color || COLORS.blue,
              elemProgress,
              xRange
            );
          }
          break;

        case 'tangent':
          if (element.function) {
            const x0 = element.x ?? 1;
            this.drawTangentLine(
              element.function,
              x0,
              element.color || COLORS.yellow,
              elemProgress
            );
          }
          break;

        case 'moving_tangent':
          if (element.function) {
            // Animate tangent moving along curve
            const xMin = this.xRange[0] + 0.5;
            const xMax = this.xRange[1] - 0.5;
            const x0 = xMin + (xMax - xMin) * progress;
            this.tangentX = x0;
            this.drawTangentLine(
              element.function,
              x0,
              element.color || COLORS.yellow,
              1
            );
          }
          break;

        case 'point':
          this.drawPoint(
            element.x ?? 0,
            element.y ?? 0,
            element.color || COLORS.red,
            element.label,
            elemProgress
          );
          break;

        case 'vector':
          this.drawVector(
            element.x1 ?? 0,
            element.y1 ?? 0,
            element.x2 ?? 1,
            element.y2 ?? 1,
            element.color || COLORS.green,
            element.label,
            elemProgress
          );
          break;

        case 'arrow':
          this.drawArrow(
            element.x1 ?? 0,
            element.y1 ?? 0,
            element.x2 ?? 1,
            element.y2 ?? 1,
            element.color || COLORS.red,
            elemProgress
          );
          break;

        case 'shaded_area':
          if (element.function && element.xRange) {
            this.drawShadedArea(
              element.function,
              element.xRange,
              element.color || COLORS.blue,
              elemProgress
            );
          }
          break;

        case 'formula':
          if (element.formula) {
            this.drawFormula(
              element.formula,
              element.position || 'top',
              elemProgress
            );
          }
          break;

        case 'label':
          if (element.text) {
            this.drawLabel(
              element.text,
              element.x ?? 0,
              element.y ?? 0,
              element.color || COLORS.white,
              elemProgress
            );
          }
          break;

        case 'circle':
          this.drawCircle(
            element.x ?? 0,
            element.y ?? 0,
            element.radius ?? 1,
            element.color || COLORS.blue,
            element.filled,
            elemProgress
          );
          break;

        case 'text':
          if (element.text) {
            this.drawText(
              element.text,
              element.x ?? 0,
              element.y ?? 0,
              element.fontSize || 14,
              element.color || COLORS.white,
              elemProgress
            );
          }
          break;

        case 'number_line':
          this.drawNumberLine(
            element.range || [-5, 5],
            elemProgress
          );
          break;
      }
    }
  }

  animate(
    scene: Scene,
    onProgress?: (progress: number) => void,
    onComplete?: () => void
  ) {
    this.stop();
    this.currentScene = scene;
    this.onComplete = onComplete || null;
    this.startTime = null;
    this.tangentX = this.xRange[0] + 0.5;

    const duration = scene.duration * 1000;

    const frame = (timestamp: number) => {
      if (!this.startTime) this.startTime = timestamp;
      const elapsed = timestamp - this.startTime;
      const progress = Math.min(elapsed / duration, 1);

      this.renderScene(scene, progress);
      onProgress?.(progress);

      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(frame);
      } else {
        this.animationFrame = null;
        this.onComplete?.();
      }
    };

    this.animationFrame = requestAnimationFrame(frame);
  }

  stop() {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  renderStatic(scene: Scene) {
    this.renderScene(scene, 1);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}
