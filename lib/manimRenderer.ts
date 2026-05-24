// Canvas-based visual renderer for ThinkInMotion
// 3Blue1Brown-inspired math animations

'use client';

import { Scene, SceneElement } from '@/types/scene';

const BG = '#0a0a0f';
const GRID = '#161628';
const AXIS_COLOR = '#2d2d5e';
const AXIS_LABEL = '#4a4a7a';

export class ManimRenderer {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrame: number | null = null;
  private _cssW = 800;
  private _cssH = 500;
  private resizeObserver: ResizeObserver | null = null;
  private lastScene: Scene | null = null;

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.initCanvas();
    this.attachResizeObserver();
  }

  private attachResizeObserver() {
    if (typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(this.container);
  }

  private handleResize() {
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 500;
    if (w === this._cssW && h === this._cssH) return;
    const dpr = window.devicePixelRatio || 1;
    if (!this.canvas || !this.ctx) return;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this._cssW = w;
    this._cssH = h;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    // Redraw the last scene at the new size
    if (this.lastScene) {
      this.ctx.fillStyle = BG;
      this.ctx.fillRect(0, 0, w, h);
      this.animateScene(this.lastScene);
    }
  }

  private initCanvas() {
    const old = this.container.querySelector('canvas');
    if (old) old.remove();
    this.canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 500;
    // Scale canvas for device pixel ratio (fixes blurriness on retina/HiDPI)
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.style.display = 'block';
    this.ctx = this.canvas.getContext('2d');
    if (this.ctx) this.ctx.scale(dpr, dpr);
    this._cssW = w;
    this._cssH = h;
    this.container.appendChild(this.canvas);
  }

  private get W() { return this._cssW; }
  private get H() { return this._cssH; }
  private get CX() { return this.W / 2; }
  private get CY() { return this.H / 2; }
  private get S() { return Math.min(this.W, this.H) / 11; }

  private px(x: number): number { return this.CX + x * this.S; }
  private py(y: number): number { return this.CY - y * this.S; }
  private toPixel(x: number, y: number): [number, number] { return [this.px(x), this.py(y)]; }

  async renderScene(sceneData: Scene): Promise<void> {
    if (!this.ctx || !this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 500;
    if (this._cssW !== w || this._cssH !== h) {
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;
      this._cssW = w;
      this._cssH = h;
      // Reset to identity first — calling scale() again would compound the
      // existing DPR transform and shift the origin on every scene change.
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }
    if (this.animFrame !== null) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
    this.ctx.fillStyle = BG;
    this.ctx.fillRect(0, 0, w, h);

    this.lastScene = sceneData;
    await this.animateScene(sceneData);

    const holdMs = Math.max(500, sceneData.duration * 1000 - 1500);
    await new Promise(r => setTimeout(r, holdMs));
  }

  private async animateScene(sceneData: Scene): Promise<void> {
    if (!this.ctx) return;

    const hasAxes = sceneData.elements.some(
      e => e.type === 'axes' || e.type === 'coordinate_plane'
    );
    const rest = sceneData.elements.filter(
      e => e.type !== 'axes' && e.type !== 'coordinate_plane'
    );

    const drawBase = () => {
      if (!this.ctx) return;
      this.ctx.fillStyle = BG;
      this.ctx.fillRect(0, 0, this.W, this.H);
      if (hasAxes) { this.drawGrid(); this.drawAxes(); }
    };

    drawBase();
    const done: SceneElement[] = [];
    for (const el of rest) {
      await this.animateElement(el, done, drawBase);
      done.push(el);
    }
  }

  private getAnimDuration(el: SceneElement): number {
    switch (el.type) {
      case 'graph': return 900;
      case 'shaded_area': return 700;
      case 'tangent': case 'secant': return 600;
      case 'vector': case 'arrow': return 500;
      case 'line': return 400;
      case 'circle': return 500;
      case 'formula': case 'text': case 'label': return 350;
      default: return 400;
    }
  }

  private async animateElement(
    el: SceneElement,
    completed: SceneElement[],
    drawBase: () => void,
  ): Promise<void> {
    const dur = this.getAnimDuration(el);
    const start = performance.now();
    return new Promise(resolve => {
      const frame = (now: number) => {
        const t = Math.min((now - start) / dur, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        // Clear and redraw base + all completed elements + current at progress t
        // Prevents ghosting from alpha-composited frames stacking up
        drawBase();
        for (const d of completed) this.drawElement(d, 1);
        this.drawElement(el, ease);
        if (t < 1) {
          this.animFrame = requestAnimationFrame(frame);
        } else {
          this.animFrame = null;
          resolve();
        }
      };
      this.animFrame = requestAnimationFrame(frame);
    });
  }

  private drawElement(el: SceneElement, t: number) {
    if (!this.ctx) return;
    const color = el.color || '#4f9cf9';
    this.ctx.save();

    switch (el.type) {
      case 'graph':
        if (el.function) this.drawGraphPartial(el.function, color, t, el.xRange);
        break;

      case 'tangent':
        if (el.function && el.atX !== undefined)
          this.drawTangentLine(el.function, el.atX, color, el.length ?? 3, t);
        break;

      case 'secant':
        if (el.function && el.x1 !== undefined && el.x2 !== undefined)
          this.drawSecantLine(el.function, el.x1, el.x2, color, t);
        break;

      case 'shaded_area':
        if (el.function && el.x1 !== undefined && el.x2 !== undefined)
          this.drawShadedArea(el.function, el.x1, el.x2, color, el.opacity ?? 0.3, t);
        break;

      case 'point': {
        this.ctx.globalAlpha = t;
        const [px, py] = this.toPixel(el.x ?? 0, el.y ?? 0);
        this.drawDot(px, py, color, 7);
        if (el.label) this.drawPointLabel(el.label, px, py, color, el.labelPos ?? 'top');
        // Only draw projection lines for labeled math points (not chart data points).
        // Suppress with dashed:false on the element.
        if (el.label && el.dashed !== false) {
          this.drawProjectionLines(el.x ?? 0, el.y ?? 0, color);
        }
        break;
      }

      case 'circle': {
        this.ctx.globalAlpha = t;
        const [cx, cy] = this.toPixel(el.x ?? 0, el.y ?? 0);
        this.drawCircleEl(cx, cy, (el.radius ?? 1) * this.S, color, el.filled ?? false);
        break;
      }

      case 'rect': {
        this.ctx.globalAlpha = t;
        const rw = (el.width ?? 1) * this.S;
        const rh = (el.height ?? 1) * this.S;
        // x, y is the CENTER of the rect (consistent with circle and matrix)
        const [rcx, rcy] = this.toPixel(el.x ?? 0, el.y ?? 0);
        const rx = rcx - rw / 2;
        const ry = rcy - rh / 2;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        if (el.filled) {
          this.ctx.fillStyle = color + '30';
          this.ctx.fillRect(rx, ry, rw, rh);
        }
        this.ctx.strokeRect(rx, ry, rw, rh);
        break;
      }

      case 'vector':
      case 'arrow': {
        const [ax1, ay1] = this.toPixel(el.x1 ?? 0, el.y1 ?? 0);
        const [ax2, ay2] = this.toPixel(el.x2 ?? 1, el.y2 ?? 1);
        const mx = ax1 + (ax2 - ax1) * t;
        const my = ay1 + (ay2 - ay1) * t;
        this.drawArrow(ax1, ay1, mx, my, color, t > 0.85, el.strokeWidth ?? 2.5);
        if (el.label && t > 0.85) {
          this.ctx.globalAlpha = (t - 0.85) / 0.15;
          this.drawLabel(el.label, (ax1 + ax2) / 2 + 12, (ay1 + ay2) / 2 - 12, color, 15);
        }
        break;
      }

      case 'line': {
        const [lx1, ly1] = this.toPixel(el.x1 ?? -3, el.y1 ?? 0);
        const [lx2, ly2] = this.toPixel(el.x2 ?? 3, el.y2 ?? 0);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = el.strokeWidth ?? 2;
        if (el.dashed) this.ctx.setLineDash([6, 4]);
        this.ctx.beginPath();
        this.ctx.moveTo(lx1, ly1);
        this.ctx.lineTo(lx1 + (lx2 - lx1) * t, ly1 + (ly2 - ly1) * t);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        break;
      }

      case 'number_line': {
        this.ctx.globalAlpha = t;
        this.drawNumberLine(el.xMin ?? -5, el.xMax ?? 5, el.y ?? 0, color);
        break;
      }

      case 'matrix': {
        this.ctx.globalAlpha = t;
        if (el.rows) {
          const [mx, my] = this.toPixel(el.x ?? 0, el.y ?? 0);
          this.drawMatrix(el.rows, mx, my, color, el.label, el.highlightRow, el.highlightCol);
        }
        break;
      }

      case 'formula': {
        if (!el.formula) break;
        this.ctx.globalAlpha = t;
        const [fx, fy] = this.toPixel(el.x ?? 3, el.y ?? 3);
        this.drawMathBox(el.formula, fx, fy, color, el.fontSize ?? 18);
        break;
      }

      case 'text':
      case 'label': {
        const txt = el.text ?? el.label ?? '';
        if (!txt) break;
        this.ctx.globalAlpha = t;
        const [tx, ty] = this.toPixel(el.x ?? 0, el.y ?? 0);
        this.drawLabel(txt, tx, ty, color, el.fontSize ?? 15);
        break;
      }

      case 'histogram': {
        this.ctx.globalAlpha = t;
        if (el.bins && el.bins.length > 0) {
          const [hx, hy] = this.toPixel(el.x ?? 0, el.y ?? 0);
          this.drawHistogram(el.bins, hx, hy, el.width ?? 8, el.height ?? 5, color, t, el.showValues ?? false);
        }
        break;
      }

      case 'pie_chart': {
        this.ctx.globalAlpha = t;
        if (el.slices && el.slices.length > 0) {
          const [pcx, pcy] = this.toPixel(el.x ?? 0, el.y ?? 0);
          this.drawPieChart(el.slices, pcx, pcy, (el.radius ?? 2) * this.S, t, el.showLabels ?? true, el.showPercentages ?? true);
        }
        break;
      }

      case 'axes_3d': {
        this.ctx.globalAlpha = t;
        const [ox3, oy3] = this.toPixel(el.x ?? 0, el.y ?? 0);
        this.drawAxes3D(ox3, oy3, (el.length ?? 3) * this.S,
          el.xLabel ?? 'x', el.yLabel ?? 'y', el.zLabel ?? 'z',
          color, el.points3d, el.lines3d, el.vectors3d);
        break;
      }

      // ── Charts ──────────────────────────────────────────────────────────

      case 'bar_chart': {
        this.ctx.globalAlpha = t;
        if (el.series && el.categories) {
          const [bx, by] = this.toPixel(el.x ?? 0, el.y ?? 0);
          this.drawBarChart(el.series, el.categories, bx, by,
            el.width ?? 9, el.height ?? 5, color, t,
            el.horizontal ?? false, el.stacked ?? false, el.showLegend ?? true);
        }
        break;
      }

      case 'line_chart': {
        this.ctx.globalAlpha = t;
        if (el.series && el.categories) {
          const [lcx, lcy] = this.toPixel(el.x ?? 0, el.y ?? 0);
          this.drawLineChart(el.series, el.categories, lcx, lcy,
            el.width ?? 9, el.height ?? 5, t, el.showLegend ?? true);
        }
        break;
      }

      case 'scatter_plot': {
        this.ctx.globalAlpha = t;
        if (el.points && el.points.length > 0) {
          const [spx, spy] = this.toPixel(el.x ?? 0, el.y ?? 0);
          this.drawScatterPlot(el.points, spx, spy,
            el.width ?? 8, el.height ?? 5, color, t, el.showRegression ?? false);
        }
        break;
      }

      case 'box_plot': {
        this.ctx.globalAlpha = t;
        if (el.datasets && el.datasets.length > 0) {
          const [bpx, bpy] = this.toPixel(el.x ?? 0, el.y ?? 0);
          this.drawBoxPlot(el.datasets, bpx, bpy, el.width ?? 8, el.height ?? 5, t);
        }
        break;
      }

      case 'area_chart': {
        this.ctx.globalAlpha = t;
        if (el.function) {
          this.drawAreaChart(el.function, el.function2 ?? '0',
            el.xRange ?? [-4, 4], color, t, el.opacity ?? 0.35);
        }
        break;
      }

      // ── Geometry ────────────────────────────────────────────────────────

      case 'polygon': {
        this.ctx.globalAlpha = t;
        if (el.vertices && el.vertices.length >= 3) {
          this.drawPolygon(el.vertices, color, el.filled ?? false, el.strokeWidth ?? 2);
        }
        break;
      }

      case 'angle_arc': {
        this.ctx.globalAlpha = t;
        const [vx, vy] = this.toPixel(el.x ?? 0, el.y ?? 0);
        this.drawAngleArc(vx, vy,
          el.angle1 ?? 0, el.angle2 ?? Math.PI / 2,
          (el.arcRadius ?? 0.5) * this.S,
          color, el.label ?? '', el.rightAngle ?? false, t);
        break;
      }

      case 'spring': {
        const [sx1, sy1] = this.toPixel(el.x1 ?? -2, el.y1 ?? 0);
        const [sx2, sy2] = this.toPixel(el.x2 ?? 2, el.y2 ?? 0);
        this.drawSpring(sx1, sy1, sx2, sy2, el.coils ?? 8,
          (el.coilWidth ?? 0.3) * this.S, color, t);
        break;
      }

      case 'wave': {
        this.ctx.globalAlpha = t;
        this.drawWave(el.amplitude ?? 1, el.frequency ?? 1, el.phase ?? 0,
          el.xRange ?? [-6, 6], color, el.strokeWidth ?? 2);
        break;
      }

      // ── Annotations ─────────────────────────────────────────────────────

      case 'brace': {
        this.ctx.globalAlpha = t;
        const [brx1, bry1] = this.toPixel(el.x1 ?? -2, el.y1 ?? 0);
        const [brx2, bry2] = this.toPixel(el.x2 ?? 2, el.y2 ?? 0);
        this.drawBrace(brx1, bry1, brx2, bry2, el.label ?? '', color,
          el.side ?? 'bottom', t);
        break;
      }

      case 'table': {
        this.ctx.globalAlpha = t;
        if (el.tableRows) {
          const [tbx, tby] = this.toPixel(el.x ?? 0, el.y ?? 0);
          this.drawTable(el.headers ?? [], el.tableRows, tbx, tby, color,
            el.fontSize ?? 13, t);
        }
        break;
      }

      case 'highlight_region': {
        this.ctx.globalAlpha = t * (el.opacity ?? 0.25);
        const [hrx, hry] = this.toPixel(el.x ?? 0, el.y ?? 0);
        const hrw = (el.width ?? 2) * this.S;
        const hrh = (el.height ?? 1) * this.S;
        this.ctx.fillStyle = color;
        if (el.shape === 'ellipse') {
          this.ctx.beginPath();
          this.ctx.ellipse(hrx, hry, hrw / 2, hrh / 2, 0, 0, Math.PI * 2);
          this.ctx.fill();
        } else {
          this.ctx.fillRect(hrx - hrw / 2, hry - hrh / 2, hrw, hrh);
        }
        break;
      }

      // ── Math-specific ────────────────────────────────────────────────────

      case 'complex_plane':
      case 'number_plane': {
        this.ctx.globalAlpha = t;
        this.drawComplexPlane(color, el.points ?? [], el.vectors3d ?? []);
        break;
      }

      case 'riemann_sum': {
        this.ctx.globalAlpha = t;
        if (el.function && el.x1 !== undefined && el.x2 !== undefined) {
          this.drawRiemannSum(el.function, el.x1, el.x2,
            el.n ?? 6, el.method ?? 'midpoint', color, t);
        }
        break;
      }

      case 'slope_field': {
        this.ctx.globalAlpha = t;
        if (el.function) {
          this.drawSlopeField(el.function,
            el.xRange ?? [-4, 4], el.yRange ?? [-3, 3], color, t);
        }
        break;
      }

      case 'parametric_curve': {
        this.ctx.globalAlpha = t;
        if (el.xFunction && el.yFunction) {
          this.drawParametricCurve(el.xFunction, el.yFunction,
            el.tRange ?? [0, Math.PI * 2], color, el.strokeWidth ?? 2, t);
        }
        break;
      }
    }

    this.ctx.restore();
  }

  // ─── Primitives ───────────────────────────────────────────────────────────

  private drawGrid() {
    if (!this.ctx) return;
    this.ctx.strokeStyle = GRID;
    this.ctx.lineWidth = 1;
    const stepsX = Math.ceil(this.W / this.S / 2) + 1;
    const stepsY = Math.ceil(this.H / this.S / 2) + 1;
    for (let i = -stepsX; i <= stepsX; i++) {
      const x = this.CX + i * this.S;
      this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.H); this.ctx.stroke();
    }
    for (let i = -stepsY; i <= stepsY; i++) {
      const y = this.CY + i * this.S;
      this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.W, y); this.ctx.stroke();
    }
  }

  private drawAxes() {
    if (!this.ctx) return;
    const s = this.S;

    this.ctx.strokeStyle = AXIS_COLOR;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath(); this.ctx.moveTo(0, this.CY); this.ctx.lineTo(this.W, this.CY); this.ctx.stroke();
    this.ctx.beginPath(); this.ctx.moveTo(this.CX, 0); this.ctx.lineTo(this.CX, this.H); this.ctx.stroke();

    this.drawArrow(this.W - 30, this.CY, this.W - 4, this.CY, AXIS_COLOR, true, 1.5);
    this.drawArrow(this.CX, 28, this.CX, 4, AXIS_COLOR, true, 1.5);

    this.ctx.fillStyle = AXIS_LABEL;
    this.ctx.font = `${Math.max(10, s * 0.28)}px monospace`;
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = AXIS_COLOR;

    const stepsX = Math.floor((this.W / 2) / s);
    for (let i = -stepsX; i <= stepsX; i++) {
      if (i === 0) continue;
      const x = this.CX + i * s;
      this.ctx.beginPath(); this.ctx.moveTo(x, this.CY - 4); this.ctx.lineTo(x, this.CY + 4); this.ctx.stroke();
      if (Math.abs(i) <= 6) {
        this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'top';
        this.ctx.fillText(String(i), x, this.CY + 6);
      }
    }
    const stepsY = Math.floor((this.H / 2) / s);
    for (let i = -stepsY; i <= stepsY; i++) {
      if (i === 0) continue;
      const y = this.CY - i * s;
      this.ctx.beginPath(); this.ctx.moveTo(this.CX - 4, y); this.ctx.lineTo(this.CX + 4, y); this.ctx.stroke();
      if (Math.abs(i) <= 5) {
        this.ctx.textAlign = 'right'; this.ctx.textBaseline = 'middle';
        this.ctx.fillText(String(i), this.CX - 8, y);
      }
    }

    this.ctx.fillStyle = AXIS_LABEL;
    this.ctx.font = `italic ${Math.max(13, s * 0.35)}px serif`;
    this.ctx.textAlign = 'left'; this.ctx.textBaseline = 'middle';
    this.ctx.fillText('x', this.W - 18, this.CY - 14);
    this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'bottom';
    this.ctx.fillText('y', this.CX + 14, 18);
  }

  private drawGraphPartial(funcStr: string, color: string, progress: number, xRange?: [number, number]) {
    if (!this.ctx) return;
    const func = this.parseFunction(funcStr);

    // Pixel boundaries for the full draw range
    const fullStart = xRange ? this.px(xRange[0]) : 0;
    const fullEnd   = xRange ? this.px(xRange[1]) : this.W;

    // The animated endpoint: starts at fullStart, reaches fullEnd at progress=1
    // Clamp both ends to canvas bounds only for the loop, not for the animation calc
    const drawEnd = fullStart + (fullEnd - fullStart) * progress;

    // Loop from the left edge of the range (or canvas) to the animated endpoint
    const loopStart = Math.max(0, fullStart);
    const loopEnd   = Math.min(this.W, drawEnd);

    if (loopEnd < loopStart) return; // nothing to draw yet

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();

    let started = false;
    let prevPy = 0;
    for (let pixX = loopStart; pixX <= loopEnd; pixX += 1.5) {
      const x = (pixX - this.CX) / this.S;
      const y = func(x);
      if (!isFinite(y) || Math.abs(y) > 25) { started = false; continue; }
      const pixY = this.CY - y * this.S;
      const jump = started && Math.abs(pixY - prevPy) > this.S * 4;
      if (!started || jump) { this.ctx.moveTo(pixX, pixY); started = true; }
      else this.ctx.lineTo(pixX, pixY);
      prevPy = pixY;
    }
    this.ctx.stroke();
  }

  private drawTangentLine(funcStr: string, atX: number, color: string, length: number, t: number) {
    if (!this.ctx) return;
    const func = this.parseFunction(funcStr);
    const h = 0.0001;
    const slope = (func(atX + h) - func(atX - h)) / (2 * h);
    const y0 = func(atX);
    const [px0, py0] = this.toPixel(atX, y0);
    const [px1, py1] = this.toPixel(atX - length, y0 - slope * length);
    const [px2, py2] = this.toPixel(atX + length, y0 + slope * length);

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(px0 + (px1 - px0) * t, py0 + (py1 - py0) * t);
    this.ctx.lineTo(px0 + (px2 - px0) * t, py0 + (py2 - py0) * t);
    this.ctx.stroke();

    if (t > 0.5) {
      this.ctx.globalAlpha = (t - 0.5) * 2;
      this.drawDot(px0, py0, color, 6);
    }
  }

  private drawSecantLine(funcStr: string, x1: number, x2: number, color: string, t: number) {
    if (!this.ctx) return;
    const func = this.parseFunction(funcStr);
    const [px1, py1] = this.toPixel(x1, func(x1));
    const [px2, py2] = this.toPixel(x2, func(x2));

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(px1, py1);
    this.ctx.lineTo(px1 + (px2 - px1) * t, py1 + (py2 - py1) * t);
    this.ctx.stroke();

    if (t > 0.3) { this.ctx.globalAlpha = Math.min(1, (t - 0.3) / 0.3); this.drawDot(px1, py1, color, 5); }
    if (t > 0.7) { this.ctx.globalAlpha = Math.min(1, (t - 0.7) / 0.3); this.drawDot(px2, py2, color, 5); }
  }

  private drawShadedArea(funcStr: string, x1: number, x2: number, color: string, opacity: number, t: number) {
    if (!this.ctx) return;
    const func = this.parseFunction(funcStr);
    const pxStart = this.px(x1);
    const pxEnd = this.px(x2);
    const drawEnd = pxStart + (pxEnd - pxStart) * t;

    this.ctx.fillStyle = color;
    this.ctx.globalAlpha = opacity;
    this.ctx.beginPath();
    this.ctx.moveTo(pxStart, this.CY);
    for (let p = pxStart; p <= drawEnd; p += 2) {
      const x = (p - this.CX) / this.S;
      const y = func(x);
      if (!isFinite(y)) continue;
      this.ctx.lineTo(p, this.CY - y * this.S);
    }
    this.ctx.lineTo(drawEnd, this.CY);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.globalAlpha = 1;

    // Top border — no glow
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    let started = false;
    for (let p = pxStart; p <= drawEnd; p += 2) {
      const x = (p - this.CX) / this.S;
      const y = func(x);
      if (!isFinite(y)) { started = false; continue; }
      const py = this.CY - y * this.S;
      if (!started) { this.ctx.moveTo(p, py); started = true; } else this.ctx.lineTo(p, py);
    }
    this.ctx.stroke();
  }

  private drawProjectionLines(x: number, y: number, color: string) {
    if (!this.ctx) return;
    const [px, py] = this.toPixel(x, y);
    this.ctx.strokeStyle = color + '50';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([4, 4]);
    this.ctx.beginPath(); this.ctx.moveTo(px, py); this.ctx.lineTo(px, this.CY); this.ctx.stroke();
    this.ctx.beginPath(); this.ctx.moveTo(px, py); this.ctx.lineTo(this.CX, py); this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private drawDot(x: number, y: number, color: string, r = 6) {
    if (!this.ctx) return;
    this.ctx.fillStyle = color;
    this.ctx.beginPath(); this.ctx.arc(x, y, r, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath(); this.ctx.arc(x, y, r * 0.35, 0, Math.PI * 2); this.ctx.fill();
  }

  private drawPointLabel(text: string, px: number, py: number, color: string, pos: string) {
    if (!this.ctx) return;
    const off = 16;
    const lx = pos === 'left' ? px - off : pos === 'right' ? px + off : px;
    const ly = pos === 'bottom' ? py + off : pos === 'top' ? py - off : py;
    this.ctx.fillStyle = color;
    this.ctx.font = `13px 'Inter', system-ui, sans-serif`;
    this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, lx, ly);
  }

  private drawCircleEl(x: number, y: number, r: number, color: string, filled: boolean) {
    if (!this.ctx) return;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath(); this.ctx.arc(x, y, r, 0, Math.PI * 2);
    if (filled) { this.ctx.fillStyle = color + '30'; this.ctx.fill(); }
    this.ctx.stroke();
  }

  private drawArrow(x1: number, y1: number, x2: number, y2: number, color: string, head = true, lw = 2.5) {
    if (!this.ctx) return;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 2) return;
    this.ctx.strokeStyle = color; this.ctx.fillStyle = color;
    this.ctx.lineWidth = lw;
    this.ctx.beginPath(); this.ctx.moveTo(x1, y1); this.ctx.lineTo(x2, y2); this.ctx.stroke();
    if (head) {
      const angle = Math.atan2(dy, dx);
      const hs = Math.min(14, len * 0.25);
      this.ctx.beginPath();
      this.ctx.moveTo(x2, y2);
      this.ctx.lineTo(x2 - hs * Math.cos(angle - 0.42), y2 - hs * Math.sin(angle - 0.42));
      this.ctx.lineTo(x2 - hs * Math.cos(angle + 0.42), y2 - hs * Math.sin(angle + 0.42));
      this.ctx.closePath(); this.ctx.fill();
    }
  }

  private drawLabel(text: string, x: number, y: number, color: string, size: number) {
    if (!this.ctx) return;
    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px 'Inter', system-ui, sans-serif`;
    this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, y);
  }

  private drawMatrix(
    rows: number[][],
    cx: number, cy: number,
    color: string,
    label?: string,
    highlightRow?: number,
    highlightCol?: number
  ) {
    if (!this.ctx) return;
    const nRows = rows.length;
    const nCols = rows[0]?.length ?? 0;
    if (nRows === 0 || nCols === 0) return;

    const cellW = 44;
    const cellH = 36;
    const pad = 10;
    const totalW = nCols * cellW + pad * 2;
    const totalH = nRows * cellH + pad * 2;
    const left = cx - totalW / 2;
    const top = cy - totalH / 2;

    // Background
    this.ctx.fillStyle = 'rgba(10,10,25,0.9)';
    this.ctx.beginPath();
    this.ctx.roundRect(left, top, totalW, totalH, 6);
    this.ctx.fill();

    // Bracket lines — left
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(left + 8, top + 4);
    this.ctx.lineTo(left + 4, top + 4);
    this.ctx.lineTo(left + 4, top + totalH - 4);
    this.ctx.lineTo(left + 8, top + totalH - 4);
    this.ctx.stroke();

    // Bracket lines — right
    this.ctx.beginPath();
    this.ctx.moveTo(left + totalW - 8, top + 4);
    this.ctx.lineTo(left + totalW - 4, top + 4);
    this.ctx.lineTo(left + totalW - 4, top + totalH - 4);
    this.ctx.lineTo(left + totalW - 8, top + totalH - 4);
    this.ctx.stroke();

    // Cells
    for (let r = 0; r < nRows; r++) {
      for (let c = 0; c < nCols; c++) {
        const cellX = left + pad + c * cellW;
        const cellY = top + pad + r * cellH;
        const val = rows[r]?.[c] ?? 0;

        // Highlight cell
        const isHighlightedRow = highlightRow === r;
        const isHighlightedCol = highlightCol === c;
        const isHighlighted = isHighlightedRow || isHighlightedCol;

        if (isHighlighted) {
          this.ctx.fillStyle = color + (isHighlightedRow && isHighlightedCol ? '50' : '25');
          this.ctx.fillRect(cellX, cellY, cellW, cellH);
        }

        // Cell value
        this.ctx.fillStyle = isHighlighted ? color : color + 'cc';
        this.ctx.font = `bold ${isHighlighted ? 16 : 15}px 'Inter', monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(String(val), cellX + cellW / 2, cellY + cellH / 2);
      }
    }

    // Optional label above matrix
    if (label) {
      this.ctx.fillStyle = color;
      this.ctx.font = `bold 14px 'Inter', sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'bottom';
      this.ctx.fillText(label, cx, top - 6);
    }
  }

  private drawMathBox(text: string, x: number, y: number, color: string, size: number) {
    if (!this.ctx) return;
    this.ctx.font = `${size}px 'Inter', system-ui, sans-serif`;
    const m = this.ctx.measureText(text);
    const pw = m.width + 28, ph = size + 18;
    const bx = Math.max(pw / 2 + 10, Math.min(this.W - pw / 2 - 10, x));
    const by = Math.max(ph / 2 + 10, Math.min(this.H - ph / 2 - 10, y));
    // Background
    this.ctx.fillStyle = 'rgba(8,8,20,0.88)';
    this.ctx.beginPath();
    this.ctx.roundRect(bx - pw / 2, by - ph / 2, pw, ph, 8);
    this.ctx.fill();
    // Subtle border — no glow
    this.ctx.strokeStyle = color + '40';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    // Text
    this.ctx.fillStyle = color;
    this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, bx, by);
  }

  private drawNumberLine(xMin: number, xMax: number, y: number, color: string) {
    if (!this.ctx) return;
    const [px1] = this.toPixel(xMin, y);
    const [px2, py] = this.toPixel(xMax, y);
    this.drawArrow(px1, py, px2, py, color, true, 2);
    this.ctx.fillStyle = color;
    this.ctx.font = `12px monospace`;
    this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'top';
    for (let i = Math.ceil(xMin); i <= Math.floor(xMax); i++) {
      const tx = this.px(i);
      this.ctx.beginPath(); this.ctx.strokeStyle = color; this.ctx.lineWidth = 1;
      this.ctx.moveTo(tx, py - 5); this.ctx.lineTo(tx, py + 5); this.ctx.stroke();
      this.ctx.fillText(String(i), tx, py + 8);
    }
  }

  /**
   * Safely parse and evaluate a math expression string.
   *
   * Security model: instead of eval / new Function, we use a recursive-descent
   * parser that only understands a strict allowlist of tokens:
   *   numbers, the variable x, +  -  *  /  **  unary minus, parentheses,
   *   and the Math functions: sin cos tan sqrt exp log abs.
   *
   * Any token outside this set causes the parser to return 0, so malicious
   * input from the AI (e.g. `fetch(...)`, `alert(...)`) is silently ignored
   * rather than executed.
   */
  // ─── Histogram ────────────────────────────────────────────────────────────

  private drawHistogram(
    bins: Array<{ label: string; value: number; color?: string }>,
    cx: number, cy: number,
    widthUnits: number, heightUnits: number,
    defaultColor: string,
    t: number,
    showValues: boolean,
  ) {
    if (!this.ctx) return;
    const totalW = widthUnits * this.S;
    const totalH = heightUnits * this.S;
    const left = cx - totalW / 2;
    const bottom = cy + totalH / 2;
    const maxVal = Math.max(...bins.map(b => b.value), 1);
    const barW = totalW / bins.length;
    const gap = barW * 0.15;

    // Baseline
    this.ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(left, bottom);
    this.ctx.lineTo(left + totalW, bottom);
    this.ctx.stroke();

    bins.forEach((bin, i) => {
      if (!this.ctx) return;
      const barH = (bin.value / maxVal) * totalH * t;
      const bx = left + i * barW + gap / 2;
      const bw = barW - gap;
      const by = bottom - barH;
      const col = bin.color ?? defaultColor;

      // Bar fill
      this.ctx.fillStyle = col + '55';
      this.ctx.fillRect(bx, by, bw, barH);

      // Bar stroke
      this.ctx.strokeStyle = col;
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(bx, by, bw, barH);

      // Label below baseline
      this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
      this.ctx.font = `11px "DM Mono", monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(bin.label, bx + bw / 2, bottom + 5);

      // Value above bar
      if (showValues && t > 0.7) {
        this.ctx.globalAlpha = (t - 0.7) / 0.3;
        this.ctx.fillStyle = col;
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillText(String(bin.value), bx + bw / 2, by - 3);
        this.ctx.globalAlpha = 1;
      }
    });
  }

  // ─── Pie chart ────────────────────────────────────────────────────────────

  private drawPieChart(
    slices: Array<{ label: string; value: number; color?: string }>,
    cx: number, cy: number,
    radius: number,
    t: number,
    showLabels: boolean,
    showPercentages: boolean,
  ) {
    if (!this.ctx) return;
    const total = slices.reduce((s, sl) => s + sl.value, 0);
    if (total === 0) return;

    const DEFAULT_COLORS = [
      '#4f9cf9', '#ff6b6b', '#6bcb77', '#ffd93d',
      '#c77dff', '#ff9f43', '#48dbfb', '#ff6b9d',
    ];

    let startAngle = -Math.PI / 2; // start at top
    const sweepTotal = Math.PI * 2 * t;

    slices.forEach((slice, i) => {
      if (!this.ctx) return;
      const fraction = slice.value / total;
      const sweep = Math.min(fraction * Math.PI * 2, sweepTotal - (startAngle + Math.PI / 2));
      if (sweep <= 0) return;
      const endAngle = startAngle + fraction * Math.PI * 2;
      const col = slice.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];

      // Slice fill
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.arc(cx, cy, radius, startAngle, startAngle + Math.min(fraction * Math.PI * 2, sweepTotal));
      this.ctx.closePath();
      this.ctx.fillStyle = col + '99';
      this.ctx.fill();
      this.ctx.strokeStyle = col;
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();

      // Label — only when slice is fully drawn
      if (showLabels && t > fraction * 0.9) {
        const midAngle = startAngle + (fraction * Math.PI * 2) / 2;
        const labelR = radius * 1.25;
        const lx = cx + Math.cos(midAngle) * labelR;
        const ly = cy + Math.sin(midAngle) * labelR;
        const pct = Math.round(fraction * 100);
        const text = showPercentages ? `${slice.label} ${pct}%` : slice.label;
        this.ctx.fillStyle = col;
        this.ctx.font = `11px "DM Mono", monospace`;
        this.ctx.textAlign = lx > cx ? 'left' : 'right';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, lx, ly);
      }

      startAngle = endAngle;
    });
  }

  // ─── 3D axes (isometric projection) ──────────────────────────────────────

  /**
   * Draws isometric 3D axes with optional points, lines, and vectors.
   * Uses a standard isometric projection: x→right-down, y→up, z→left-down.
   */
  private drawAxes3D(
    ox: number, oy: number,
    axisLen: number,
    xLabel: string, yLabel: string, zLabel: string,
    color: string,
    points3d?: Array<{ x: number; y: number; z: number; color?: string; label?: string }>,
    lines3d?: Array<{ x1: number; y1: number; z1: number; x2: number; y2: number; z2: number; color?: string }>,
    vectors3d?: Array<{ x: number; y: number; z: number; color?: string; label?: string }>,
  ) {
    if (!this.ctx) return;

    // Isometric basis vectors (screen pixels per unit)
    const scale = axisLen / 3;
    const isoX = (x: number, y: number, z: number): [number, number] => {
      const sx = ox + (x - z) * Math.cos(Math.PI / 6) * scale;
      const sy = oy + (x + z) * Math.sin(Math.PI / 6) * scale - y * scale;
      return [sx, sy];
    };

    const axisColor = 'rgba(255,255,255,0.35)';

    // Draw axes
    const axes: Array<{ end: [number,number,number]; label: string; col: string }> = [
      { end: [3, 0, 0], label: xLabel, col: '#4f9cf9' },
      { end: [0, 3, 0], label: yLabel, col: '#6bcb77' },
      { end: [0, 0, 3], label: zLabel, col: '#ff6b6b' },
    ];

    axes.forEach(({ end, label, col }) => {
      if (!this.ctx) return;
      const [ex, ey] = isoX(...end);
      this.ctx.strokeStyle = col;
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(ox, oy);
      this.ctx.lineTo(ex, ey);
      this.ctx.stroke();
      // Arrowhead
      this.drawArrow(ox, oy, ex, ey, col, true, 1.5);
      // Label
      this.ctx.fillStyle = col;
      this.ctx.font = `12px "DM Mono", monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(label, ex + (ex - ox) * 0.12, ey + (ey - oy) * 0.12);
    });

    // Grid floor (xz plane at y=0)
    this.ctx.strokeStyle = axisColor;
    this.ctx.lineWidth = 0.5;
    for (let i = 0; i <= 3; i++) {
      const [ax, ay] = isoX(i, 0, 0);
      const [bx, by] = isoX(i, 0, 3);
      this.ctx.beginPath(); this.ctx.moveTo(ax, ay); this.ctx.lineTo(bx, by); this.ctx.stroke();
      const [cx2, cy2] = isoX(0, 0, i);
      const [dx, dy] = isoX(3, 0, i);
      this.ctx.beginPath(); this.ctx.moveTo(cx2, cy2); this.ctx.lineTo(dx, dy); this.ctx.stroke();
    }

    // Optional lines3d
    lines3d?.forEach(l => {
      if (!this.ctx) return;
      const [ax, ay] = isoX(l.x1, l.y1, l.z1);
      const [bx, by] = isoX(l.x2, l.y2, l.z2);
      this.ctx.strokeStyle = l.color ?? color;
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath(); this.ctx.moveTo(ax, ay); this.ctx.lineTo(bx, by); this.ctx.stroke();
    });

    // Optional vectors3d (from origin)
    vectors3d?.forEach(v => {
      if (!this.ctx) return;
      const [ex, ey] = isoX(v.x, v.y, v.z);
      const col = v.color ?? color;
      this.drawArrow(ox, oy, ex, ey, col, true, 2);
      if (v.label) {
        this.ctx.fillStyle = col;
        this.ctx.font = `12px "DM Mono", monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillText(v.label, ex, ey - 6);
      }
    });

    // Optional points3d
    points3d?.forEach(p => {
      if (!this.ctx) return;
      const [px, py] = isoX(p.x, p.y, p.z);
      const col = p.color ?? color;
      this.drawDot(px, py, col, 5);
      if (p.label) {
        this.ctx.fillStyle = col;
        this.ctx.font = `11px "DM Mono", monospace`;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillText(p.label, px + 7, py - 4);
      }
    });
  }

  private parseFunction(expr: string): (x: number) => number {
    // Pre-process: normalise common shorthand
    const normalised = expr
      .replace(/\^/g, '**')
      .replace(/\bpi\b/gi, '3.141592653589793')
      .replace(/\be\b/g, '2.718281828459045')
      // Ensure bare function names get the Math. prefix
      .replace(/\b(sin|cos|tan|sqrt|exp|log|abs)\s*\(/g, 'Math.$1(');

    return (x: number): number => {
      try {
        return evalExpr(normalised, x);
      } catch {
        return 0;
      }
    };
  }

  stop(): void {
    if (this.animFrame !== null) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  private drawBarChart(
    series: Array<{ label: string; data: number[]; color?: string }>,
    categories: string[],
    cx: number, cy: number,
    widthUnits: number, heightUnits: number,
    defaultColor: string,
    t: number,
    horizontal: boolean,
    stacked: boolean,
    showLegend: boolean,
  ) {
    if (!this.ctx) return;
    const W = widthUnits * this.S;
    const H = heightUnits * this.S;
    const left = cx - W / 2;
    const bottom = cy + H / 2;
    const COLORS = ['#4f9cf9','#ff6b6b','#6bcb77','#ffd93d','#c77dff','#ff9f43'];

    const maxVal = stacked
      ? Math.max(...categories.map((_, ci) => series.reduce((s, sr) => s + (sr.data[ci] ?? 0), 0)))
      : Math.max(...series.flatMap(sr => sr.data), 1);

    const groupW = W / categories.length;
    const barW = stacked ? groupW * 0.6 : (groupW * 0.8) / series.length;
    const groupGap = groupW * 0.2;

    // Baseline
    this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(left, bottom);
    this.ctx.lineTo(left + W, bottom);
    this.ctx.stroke();

    categories.forEach((cat, ci) => {
      if (!this.ctx) return;
      let stackOffset = 0;
      series.forEach((sr, si) => {
        const val = sr.data[ci] ?? 0;
        const col = sr.color ?? COLORS[si % COLORS.length];
        const barH = (val / maxVal) * H * t;
        const bx = stacked
          ? left + ci * groupW + groupGap / 2
          : left + ci * groupW + groupGap / 2 + si * barW;
        const by = bottom - barH - (stacked ? stackOffset : 0);

        this.ctx!.fillStyle = col + '66';
        this.ctx!.fillRect(bx, by, barW, barH);
        this.ctx!.strokeStyle = col;
        this.ctx!.lineWidth = 1.5;
        this.ctx!.strokeRect(bx, by, barW, barH);

        if (stacked) stackOffset += barH;
      });

      // Category label
      this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
      this.ctx.font = '11px "DM Mono",monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(cat, left + ci * groupW + groupW / 2, bottom + 4);
    });

    // Legend
    if (showLegend && t > 0.8) {
      series.forEach((sr, si) => {
        if (!this.ctx) return;
        const col = sr.color ?? COLORS[si % COLORS.length];
        const lx = left + si * 90;
        const ly = cy - H / 2 - 18;
        this.ctx.fillStyle = col;
        this.ctx.fillRect(lx, ly, 10, 10);
        this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
        this.ctx.font = '11px "DM Mono",monospace';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(sr.label, lx + 14, ly + 5);
      });
    }
  }

  // ─── Line Chart ───────────────────────────────────────────────────────────

  private drawLineChart(
    series: Array<{ label: string; data: number[]; color?: string }>,
    categories: string[],
    cx: number, cy: number,
    widthUnits: number, heightUnits: number,
    t: number,
    showLegend: boolean,
  ) {
    if (!this.ctx) return;
    const W = widthUnits * this.S;
    const H = heightUnits * this.S;
    const left = cx - W / 2;
    const bottom = cy + H / 2;
    const COLORS = ['#4f9cf9','#ff6b6b','#6bcb77','#ffd93d','#c77dff','#ff9f43'];
    const n = categories.length;
    const maxVal = Math.max(...series.flatMap(sr => sr.data), 1);
    const stepX = W / Math.max(n - 1, 1);

    // Axes
    this.ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(left, bottom); this.ctx.lineTo(left + W, bottom); this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(left, cy - H / 2); this.ctx.lineTo(left, bottom); this.ctx.stroke();

    // Category labels
    this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
    this.ctx.font = '11px "DM Mono",monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    categories.forEach((cat, i) => {
      this.ctx!.fillText(cat, left + i * stepX, bottom + 5);
    });

    // Series lines
    series.forEach((sr, si) => {
      if (!this.ctx) return;
      const col = sr.color ?? COLORS[si % COLORS.length];
      const drawCount = Math.floor(sr.data.length * t);

      this.ctx.strokeStyle = col;
      this.ctx.lineWidth = 2;
      this.ctx.lineJoin = 'round';
      this.ctx.beginPath();

      for (let i = 0; i <= drawCount && i < sr.data.length; i++) {
        const px = left + i * stepX;
        const py = bottom - (sr.data[i] / maxVal) * H;
        if (i === 0) this.ctx.moveTo(px, py);
        else this.ctx.lineTo(px, py);
      }
      this.ctx.stroke();

      // Dots
      for (let i = 0; i <= drawCount && i < sr.data.length; i++) {
        const px = left + i * stepX;
        const py = bottom - (sr.data[i] / maxVal) * H;
        this.ctx.fillStyle = col;
        this.ctx.beginPath();
        this.ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });

    // Legend
    if (showLegend && t > 0.8) {
      series.forEach((sr, si) => {
        if (!this.ctx) return;
        const col = sr.color ?? COLORS[si % COLORS.length];
        const lx = left + si * 90;
        const ly = cy - H / 2 - 18;
        this.ctx.fillStyle = col;
        this.ctx.fillRect(lx, ly, 10, 10);
        this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
        this.ctx.font = '11px "DM Mono",monospace';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(sr.label, lx + 14, ly + 5);
      });
    }
  }

  // ─── Scatter Plot ─────────────────────────────────────────────────────────

  private drawScatterPlot(
    points: Array<{ x: number; y: number; label?: string; color?: string }>,
    cx: number, cy: number,
    widthUnits: number, heightUnits: number,
    defaultColor: string,
    t: number,
    showRegression: boolean,
  ) {
    if (!this.ctx) return;
    const W = widthUnits * this.S;
    const H = heightUnits * this.S;
    const left = cx - W / 2;
    const bottom = cy + H / 2;

    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs, minX + 1);
    const minY = Math.min(...ys), maxY = Math.max(...ys, minY + 1);

    const toSX = (x: number) => left + ((x - minX) / (maxX - minX)) * W;
    const toSY = (y: number) => bottom - ((y - minY) / (maxY - minY)) * H;

    // Axes
    this.ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(left, bottom); this.ctx.lineTo(left + W, bottom); this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(left, cy - H / 2); this.ctx.lineTo(left, bottom); this.ctx.stroke();

    const drawCount = Math.floor(points.length * t);
    for (let i = 0; i < drawCount; i++) {
      const p = points[i];
      const sx = toSX(p.x), sy = toSY(p.y);
      const col = p.color ?? defaultColor;
      this.ctx.fillStyle = col + 'cc';
      this.ctx.strokeStyle = col;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
      if (p.label) {
        this.ctx.fillStyle = col;
        this.ctx.font = '10px "DM Mono",monospace';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillText(p.label, sx + 7, sy - 3);
      }
    }

    // Regression line
    if (showRegression && t > 0.9 && points.length >= 2) {
      const n = points.length;
      const sumX = xs.reduce((a, b) => a + b, 0);
      const sumY = ys.reduce((a, b) => a + b, 0);
      const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
      const sumX2 = xs.reduce((a, x) => a + x * x, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      const y1 = slope * minX + intercept;
      const y2 = slope * maxX + intercept;
      this.ctx.strokeStyle = '#ffd93d';
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([5, 4]);
      this.ctx.beginPath();
      this.ctx.moveTo(toSX(minX), toSY(y1));
      this.ctx.lineTo(toSX(maxX), toSY(y2));
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
  }

  // ─── Box Plot ─────────────────────────────────────────────────────────────

  private drawBoxPlot(
    datasets: Array<{ label: string; values: number[]; color?: string }>,
    cx: number, cy: number,
    widthUnits: number, heightUnits: number,
    t: number,
  ) {
    if (!this.ctx) return;
    const W = widthUnits * this.S;
    const H = heightUnits * this.S;
    const left = cx - W / 2;
    const bottom = cy + H / 2;
    const COLORS = ['#4f9cf9','#ff6b6b','#6bcb77','#ffd93d','#c77dff'];

    const allVals = datasets.flatMap(d => d.values);
    const minV = Math.min(...allVals), maxV = Math.max(...allVals, minV + 1);
    const toSY = (v: number) => bottom - ((v - minV) / (maxV - minV)) * H;
    const boxW = (W / datasets.length) * 0.5;

    datasets.forEach((ds, i) => {
      if (!this.ctx) return;
      const sorted = [...ds.values].sort((a, b) => a - b);
      const n = sorted.length;
      const q1 = sorted[Math.floor(n * 0.25)];
      const median = sorted[Math.floor(n * 0.5)];
      const q3 = sorted[Math.floor(n * 0.75)];
      const min = sorted[0], max = sorted[n - 1];
      const col = ds.color ?? COLORS[i % COLORS.length];
      const bx = left + i * (W / datasets.length) + (W / datasets.length - boxW) / 2;

      this.ctx.globalAlpha = t;
      this.ctx.strokeStyle = col;
      this.ctx.lineWidth = 1.5;

      // Whiskers
      this.ctx.beginPath();
      this.ctx.moveTo(bx + boxW / 2, toSY(min));
      this.ctx.lineTo(bx + boxW / 2, toSY(max));
      this.ctx.stroke();
      // Min/max caps
      [min, max].forEach(v => {
        this.ctx!.beginPath();
        this.ctx!.moveTo(bx + boxW * 0.2, toSY(v));
        this.ctx!.lineTo(bx + boxW * 0.8, toSY(v));
        this.ctx!.stroke();
      });
      // Box
      this.ctx.fillStyle = col + '33';
      this.ctx.fillRect(bx, toSY(q3), boxW, toSY(q1) - toSY(q3));
      this.ctx.strokeRect(bx, toSY(q3), boxW, toSY(q1) - toSY(q3));
      // Median
      this.ctx.strokeStyle = col;
      this.ctx.lineWidth = 2.5;
      this.ctx.beginPath();
      this.ctx.moveTo(bx, toSY(median));
      this.ctx.lineTo(bx + boxW, toSY(median));
      this.ctx.stroke();
      // Label
      this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
      this.ctx.font = '11px "DM Mono",monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(ds.label, bx + boxW / 2, bottom + 4);
    });
  }

  // ─── Area Chart ───────────────────────────────────────────────────────────

  private drawAreaChart(
    funcStr: string,
    funcStr2: string,
    xRange: [number, number],
    color: string,
    t: number,
    opacity: number,
  ) {
    if (!this.ctx) return;
    const f1 = this.parseFunction(funcStr);
    const f2 = this.parseFunction(funcStr2);
    const pxStart = this.px(xRange[0]);
    const pxEnd = this.px(xRange[1]);
    const drawEnd = pxStart + (pxEnd - pxStart) * t;

    this.ctx.fillStyle = color;
    this.ctx.globalAlpha = opacity;
    this.ctx.beginPath();
    this.ctx.moveTo(Math.max(0, pxStart), this.CY - f2((Math.max(0, pxStart) - this.CX) / this.S) * this.S);

    for (let p = Math.max(0, pxStart); p <= Math.min(this.W, drawEnd); p += 2) {
      const x = (p - this.CX) / this.S;
      const y = f1(x);
      if (!isFinite(y)) continue;
      this.ctx.lineTo(p, this.CY - y * this.S);
    }
    for (let p = Math.min(this.W, drawEnd); p >= Math.max(0, pxStart); p -= 2) {
      const x = (p - this.CX) / this.S;
      const y = f2(x);
      if (!isFinite(y)) continue;
      this.ctx.lineTo(p, this.CY - y * this.S);
    }
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.globalAlpha = 1;

    // Top border
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    let started = false;
    for (let p = Math.max(0, pxStart); p <= Math.min(this.W, drawEnd); p += 2) {
      const x = (p - this.CX) / this.S;
      const y = f1(x);
      if (!isFinite(y)) { started = false; continue; }
      const py = this.CY - y * this.S;
      if (!started) { this.ctx.moveTo(p, py); started = true; } else this.ctx.lineTo(p, py);
    }
    this.ctx.stroke();
  }

  // ─── Polygon ──────────────────────────────────────────────────────────────

  private drawPolygon(
    vertices: Array<{ x: number; y: number }>,
    color: string,
    filled: boolean,
    strokeWidth: number,
  ) {
    if (!this.ctx || vertices.length < 3) return;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = strokeWidth;
    this.ctx.beginPath();
    const [fx, fy] = this.toPixel(vertices[0].x, vertices[0].y);
    this.ctx.moveTo(fx, fy);
    for (let i = 1; i < vertices.length; i++) {
      const [vx, vy] = this.toPixel(vertices[i].x, vertices[i].y);
      this.ctx.lineTo(vx, vy);
    }
    this.ctx.closePath();
    if (filled) {
      this.ctx.fillStyle = color + '33';
      this.ctx.fill();
    }
    this.ctx.stroke();
  }

  // ─── Angle Arc ────────────────────────────────────────────────────────────

  private drawAngleArc(
    vx: number, vy: number,
    angle1: number, angle2: number,
    arcRadius: number,
    color: string,
    label: string,
    rightAngle: boolean,
    t: number,
  ) {
    if (!this.ctx) return;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.5;

    if (rightAngle) {
      // Draw a small square corner
      const s = arcRadius * 0.7;
      const cos1 = Math.cos(angle1), sin1 = Math.sin(angle1);
      const cos2 = Math.cos(angle2), sin2 = Math.sin(angle2);
      this.ctx.beginPath();
      this.ctx.moveTo(vx + cos1 * s, vy + sin1 * s);
      this.ctx.lineTo(vx + cos1 * s + cos2 * s, vy + sin1 * s + sin2 * s);
      this.ctx.lineTo(vx + cos2 * s, vy + sin2 * s);
      this.ctx.stroke();
    } else {
      const sweep = (angle2 - angle1) * t;
      this.ctx.beginPath();
      this.ctx.arc(vx, vy, arcRadius, angle1, angle1 + sweep);
      this.ctx.stroke();
    }

    if (label && t > 0.7) {
      const midAngle = (angle1 + angle2) / 2;
      const lx = vx + Math.cos(midAngle) * (arcRadius + 12);
      const ly = vy + Math.sin(midAngle) * (arcRadius + 12);
      this.ctx.fillStyle = color;
      this.ctx.font = '12px "DM Mono",monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(label, lx, ly);
    }
  }

  // ─── Spring ───────────────────────────────────────────────────────────────

  private drawSpring(
    x1: number, y1: number,
    x2: number, y2: number,
    coils: number,
    coilWidth: number,
    color: string,
    t: number,
  ) {
    if (!this.ctx) return;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 2) return;
    const ux = dx / len, uy = dy / len;
    const nx = -uy, ny = ux; // normal

    const drawLen = len * t;
    const segLen = drawLen / (coils * 2 + 2);

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);

    // Lead-in
    this.ctx.lineTo(x1 + ux * segLen, y1 + uy * segLen);

    for (let i = 0; i < coils * 2; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const px = x1 + ux * segLen * (i + 1.5) + nx * coilWidth * side;
      const py = y1 + uy * segLen * (i + 1.5) + ny * coilWidth * side;
      if (segLen * (i + 1.5) > drawLen) break;
      this.ctx.lineTo(px, py);
    }

    // Lead-out
    if (drawLen >= len - segLen) {
      this.ctx.lineTo(x2, y2);
    }
    this.ctx.stroke();
  }

  // ─── Wave ─────────────────────────────────────────────────────────────────

  private drawWave(
    amplitude: number,
    frequency: number,
    phase: number,
    xRange: [number, number],
    color: string,
    strokeWidth: number,
  ) {
    if (!this.ctx) return;
    const pxStart = this.px(xRange[0]);
    const pxEnd = this.px(xRange[1]);

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = strokeWidth;
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();

    let started = false;
    for (let p = Math.max(0, pxStart); p <= Math.min(this.W, pxEnd); p += 1.5) {
      const x = (p - this.CX) / this.S;
      const y = amplitude * Math.sin(frequency * x + phase);
      const py = this.CY - y * this.S;
      if (!started) { this.ctx.moveTo(p, py); started = true; }
      else this.ctx.lineTo(p, py);
    }
    this.ctx.stroke();
  }

  // ─── Brace ────────────────────────────────────────────────────────────────

  private drawBrace(
    x1: number, y1: number,
    x2: number, y2: number,
    label: string,
    color: string,
    side: string,
    t: number,
  ) {
    if (!this.ctx) return;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 2) return;
    const nx = -dy / len, ny = dx / len;
    const bulge = 14 * (side === 'top' || side === 'left' ? -1 : 1);

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.bezierCurveTo(
      x1 + nx * bulge * 0.5, y1 + ny * bulge * 0.5,
      mx + nx * bulge, my + ny * bulge,
      mx + nx * bulge, my + ny * bulge,
    );
    this.ctx.bezierCurveTo(
      mx + nx * bulge, my + ny * bulge,
      x2 + nx * bulge * 0.5, y2 + ny * bulge * 0.5,
      x2, y2,
    );
    this.ctx.stroke();

    if (label && t > 0.6) {
      this.ctx.fillStyle = color;
      this.ctx.font = '12px "DM Mono",monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(label, mx + nx * (bulge + 12), my + ny * (bulge + 12));
    }
  }

  // ─── Table ────────────────────────────────────────────────────────────────

  private drawTable(
    headers: string[],
    rows: string[][],
    cx: number, cy: number,
    color: string,
    fontSize: number,
    t: number,
  ) {
    if (!this.ctx) return;
    const cols = Math.max(headers.length, ...rows.map(r => r.length));
    const cellW = Math.max(60, (cols > 0 ? 320 / cols : 80));
    const cellH = fontSize + 14;
    const totalW = cols * cellW;
    const totalH = (rows.length + 1) * cellH;
    const left = cx - totalW / 2;
    const top = cy - totalH / 2;
    const drawRows = Math.floor((rows.length + 1) * t);

    // Header row
    if (drawRows >= 1) {
      this.ctx.fillStyle = color + '22';
      this.ctx.fillRect(left, top, totalW, cellH);
      this.ctx.strokeStyle = color + '55';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(left, top, totalW, cellH);
      headers.forEach((h, i) => {
        if (!this.ctx) return;
        this.ctx.fillStyle = color;
        this.ctx.font = `bold ${fontSize}px "DM Sans",sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(h, left + i * cellW + cellW / 2, top + cellH / 2);
      });
    }

    // Data rows
    for (let r = 0; r < rows.length && r + 1 < drawRows; r++) {
      const ry = top + (r + 1) * cellH;
      this.ctx.fillStyle = r % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent';
      this.ctx.fillRect(left, ry, totalW, cellH);
      this.ctx.strokeStyle = color + '33';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(left, ry, totalW, cellH);
      rows[r].forEach((cell, i) => {
        if (!this.ctx) return;
        this.ctx.fillStyle = 'rgba(255,255,255,0.75)';
        this.ctx.font = `${fontSize}px "DM Sans",sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(cell, left + i * cellW + cellW / 2, ry + cellH / 2);
      });
    }
  }

  // ─── Complex Plane ────────────────────────────────────────────────────────

  private drawComplexPlane(
    color: string,
    points: Array<{ x: number; y: number; label?: string; color?: string }>,
    vectors: Array<{ x: number; y: number; z: number; color?: string; label?: string }>,
  ) {
    if (!this.ctx) return;
    // Draw axes with Re/Im labels
    this.drawGrid();
    this.drawAxes();

    // Re / Im labels
    this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
    this.ctx.font = 'italic 14px serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Re', this.W - 28, this.CY - 16);
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText('Im', this.CX + 16, 20);

    // Unit circle
    this.ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([4, 4]);
    this.ctx.beginPath();
    this.ctx.arc(this.CX, this.CY, this.S, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Points
    points.forEach(p => {
      if (!this.ctx) return;
      const [sx, sy] = this.toPixel(p.x, p.y);
      const col = p.color ?? color;
      this.drawDot(sx, sy, col, 6);
      if (p.label) {
        this.ctx.fillStyle = col;
        this.ctx.font = '12px "DM Mono",monospace';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillText(p.label, sx + 8, sy - 4);
      }
    });

    // Vectors from origin
    vectors.forEach(v => {
      if (!this.ctx) return;
      const [ex, ey] = this.toPixel(v.x, v.y);
      const col = v.color ?? color;
      this.drawArrow(this.CX, this.CY, ex, ey, col, true, 2);
      if (v.label) {
        this.ctx.fillStyle = col;
        this.ctx.font = '12px "DM Mono",monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillText(v.label, ex, ey - 8);
      }
    });
  }

  // ─── Riemann Sum ──────────────────────────────────────────────────────────

  private drawRiemannSum(
    funcStr: string,
    x1: number, x2: number,
    n: number,
    method: 'left' | 'right' | 'midpoint',
    color: string,
    t: number,
  ) {
    if (!this.ctx) return;
    const func = this.parseFunction(funcStr);
    const dx = (x2 - x1) / n;
    const drawCount = Math.floor(n * t);

    for (let i = 0; i < drawCount; i++) {
      const xLeft = x1 + i * dx;
      const xSample = method === 'left' ? xLeft
        : method === 'right' ? xLeft + dx
        : xLeft + dx / 2;
      const y = func(xSample);
      if (!isFinite(y)) continue;

      const [px1s, py1s] = this.toPixel(xLeft, 0);
      const [px2s] = this.toPixel(xLeft + dx, 0);
      const [, pyTop] = this.toPixel(xLeft, y);
      const rectW = px2s - px1s;
      const rectH = py1s - pyTop;

      this.ctx.fillStyle = color + '44';
      this.ctx.fillRect(px1s, pyTop, rectW, rectH);
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(px1s, pyTop, rectW, rectH);
    }
  }

  // ─── Slope Field ──────────────────────────────────────────────────────────

  private drawSlopeField(
    funcStr: string,
    xRange: [number, number],
    yRange: [number, number],
    color: string,
    t: number,
  ) {
    if (!this.ctx) return;
    // funcStr is dy/dx = f(x,y) — we parse as f(x) treating y as 0 for simplicity
    // For full x,y support the expression would need a two-variable parser
    const func = this.parseFunction(funcStr);
    const cols = 14, rows = 10;
    const dx = (xRange[1] - xRange[0]) / cols;
    const dy = (yRange[1] - yRange[0]) / rows;
    const arrowLen = Math.min(dx, dy) * 0.4 * this.S;
    const total = cols * rows;
    const drawCount = Math.floor(total * t);

    let count = 0;
    for (let r = 0; r <= rows && count < drawCount; r++) {
      for (let c = 0; c <= cols && count < drawCount; c++) {
        const x = xRange[0] + c * dx;
        const y = yRange[0] + r * dy;
        const slope = func(x);
        if (!isFinite(slope)) continue;

        const angle = Math.atan(slope);
        const [sx, sy] = this.toPixel(x, y);
        const ex = sx + Math.cos(angle) * arrowLen;
        const ey = sy - Math.sin(angle) * arrowLen;
        const sx2 = sx - Math.cos(angle) * arrowLen;
        const sy2 = sy + Math.sin(angle) * arrowLen;

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(sx2, sy2);
        this.ctx.lineTo(ex, ey);
        this.ctx.stroke();
        count++;
      }
    }
  }

  // ─── Parametric Curve ─────────────────────────────────────────────────────

  private drawParametricCurve(
    xFuncStr: string,
    yFuncStr: string,
    tRange: [number, number],
    color: string,
    strokeWidth: number,
    progress: number,
  ) {
    if (!this.ctx) return;
    const xFunc = this.parseFunction(xFuncStr.replace(/\bt\b/g, 'x'));
    const yFunc = this.parseFunction(yFuncStr.replace(/\bt\b/g, 'x'));
    const steps = 300;
    const tMin = tRange[0], tMax = tRange[1];
    const drawSteps = Math.floor(steps * progress);

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = strokeWidth;
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();

    let started = false;
    for (let i = 0; i <= drawSteps; i++) {
      const param = tMin + (i / steps) * (tMax - tMin);
      const x = xFunc(param);
      const y = yFunc(param);
      if (!isFinite(x) || !isFinite(y)) { started = false; continue; }
      const [sx, sy] = this.toPixel(x, y);
      if (!started) { this.ctx.moveTo(sx, sy); started = true; }
      else this.ctx.lineTo(sx, sy);
    }
    this.ctx.stroke();
  }


  resize(width: number, height: number): void {
    if (this.canvas) { this.canvas.width = width; this.canvas.height = height; }
  }
}

// ─── Safe math expression evaluator ─────────────────────────────────────────
//
// Recursive-descent parser for a strict subset of arithmetic expressions.
// Allowed: numbers, variable x, +  -  *  /  **  unary minus, parentheses,
//          Math.sin  Math.cos  Math.tan  Math.sqrt  Math.exp  Math.log  Math.abs
//
// Anything outside this set throws, which the caller catches and maps to 0.
// This replaces the previous `new Function(...)` eval approach.

type TokenKind = 'num' | 'var' | 'op' | 'lparen' | 'rparen' | 'fn' | 'eof';
interface Token { kind: TokenKind; value: string }

function tokenise(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === ' ' || ch === '\t') { i++; continue; }

    // Number (integer or decimal, optional leading minus handled as unary op)
    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < src.length && /[0-9.]/.test(src[i])) num += src[i++];
      // Optional exponent
      if (i < src.length && (src[i] === 'e' || src[i] === 'E')) {
        num += src[i++];
        if (i < src.length && (src[i] === '+' || src[i] === '-')) num += src[i++];
        while (i < src.length && /[0-9]/.test(src[i])) num += src[i++];
      }
      tokens.push({ kind: 'num', value: num });
      continue;
    }

    // Variable x
    if (ch === 'x' && (i + 1 >= src.length || !/[a-zA-Z0-9_]/.test(src[i + 1]))) {
      tokens.push({ kind: 'var', value: 'x' }); i++; continue;
    }

    // Allowed Math functions: Math.sin( etc.
    const mathFnMatch = src.slice(i).match(/^Math\.(sin|cos|tan|sqrt|exp|log|abs)\s*\(/);
    if (mathFnMatch) {
      tokens.push({ kind: 'fn', value: mathFnMatch[1] });
      i += mathFnMatch[0].length - 1; // leave the '(' to be consumed as lparen
      continue;
    }

    // Operators
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      // Check for ** (exponentiation)
      if (ch === '*' && src[i + 1] === '*') {
        tokens.push({ kind: 'op', value: '**' }); i += 2; continue;
      }
      tokens.push({ kind: 'op', value: ch }); i++; continue;
    }

    if (ch === '(') { tokens.push({ kind: 'lparen', value: '(' }); i++; continue; }
    if (ch === ')') { tokens.push({ kind: 'rparen', value: ')' }); i++; continue; }

    // Anything else is not allowed — throw so the caller returns 0
    throw new Error(`Unexpected character: ${ch}`);
  }
  tokens.push({ kind: 'eof', value: '' });
  return tokens;
}

class Parser {
  private tokens: Token[];
  private pos = 0;
  private x: number;

  constructor(tokens: Token[], x: number) { this.tokens = tokens; this.x = x; }

  private peek(): Token { return this.tokens[this.pos]; }
  private consume(): Token { return this.tokens[this.pos++]; }

  parse(): number {
    const val = this.parseAddSub();
    if (this.peek().kind !== 'eof') throw new Error('Unexpected token after expression');
    return val;
  }

  // Addition and subtraction (lowest precedence)
  private parseAddSub(): number {
    let left = this.parseMulDiv();
    while (this.peek().kind === 'op' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.consume().value;
      const right = this.parseMulDiv();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  // Multiplication and division
  private parseMulDiv(): number {
    let left = this.parsePow();
    while (this.peek().kind === 'op' && (this.peek().value === '*' || this.peek().value === '/')) {
      const op = this.consume().value;
      const right = this.parsePow();
      if (op === '/' && right === 0) return Infinity;
      left = op === '*' ? left * right : left / right;
    }
    return left;
  }

  // Exponentiation (right-associative)
  private parsePow(): number {
    const base = this.parseUnary();
    if (this.peek().kind === 'op' && this.peek().value === '**') {
      this.consume();
      const exp = this.parsePow(); // right-associative
      return Math.pow(base, exp);
    }
    return base;
  }

  // Unary minus and function calls
  private parseUnary(): number {
    if (this.peek().kind === 'op' && this.peek().value === '-') {
      this.consume();
      return -this.parseUnary();
    }
    if (this.peek().kind === 'fn') {
      const fn = this.consume().value;
      // The tokeniser left the '(' in the stream
      if (this.peek().kind !== 'lparen') throw new Error('Expected ( after function');
      this.consume(); // consume '('
      const arg = this.parseAddSub();
      if (this.peek().kind !== 'rparen') throw new Error('Expected ) after function argument');
      this.consume(); // consume ')'
      switch (fn) {
        case 'sin':  return Math.sin(arg);
        case 'cos':  return Math.cos(arg);
        case 'tan':  return Math.tan(arg);
        case 'sqrt': return Math.sqrt(arg);
        case 'exp':  return Math.exp(arg);
        case 'log':  return Math.log(arg);
        case 'abs':  return Math.abs(arg);
        default: throw new Error(`Unknown function: ${fn}`);
      }
    }
    return this.parsePrimary();
  }

  // Numbers, variable x, and parenthesised expressions
  private parsePrimary(): number {
    const tok = this.peek();
    if (tok.kind === 'num') { this.consume(); return parseFloat(tok.value); }
    if (tok.kind === 'var') { this.consume(); return this.x; }
    if (tok.kind === 'lparen') {
      this.consume();
      const val = this.parseAddSub();
      if (this.peek().kind !== 'rparen') throw new Error('Expected )');
      this.consume();
      return val;
    }
    throw new Error(`Unexpected token: ${tok.value}`);
  }
}

function evalExpr(expr: string, x: number): number {
  const tokens = tokenise(expr);
  return new Parser(tokens, x).parse();
}

// NOTE: The methods below are appended here because the ManimRenderer class
// closing brace appears above. They are module-level helpers called by the
// switch cases added earlier. To keep TypeScript happy they are defined as
// standalone functions and called via a thin adapter inside the class.
// ─────────────────────────────────────────────────────────────────────────────
// Actually — the class is already closed above. The new element switch cases
// reference `this.drawBarChart` etc., so we need to reopen the class.
// The cleanest fix: add the methods to the ManimRenderer prototype after the
// fact, which TypeScript supports via declaration merging in the same file.
