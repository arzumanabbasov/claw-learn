// Scene JSON format types for ThinkInMotion

export type ElementType =
  // Core math
  | 'axes'
  | 'graph'
  | 'tangent'
  | 'secant'
  | 'shaded_area'
  | 'number_line'
  // Shapes & geometry
  | 'point'
  | 'vector'
  | 'arrow'
  | 'line'
  | 'circle'
  | 'rect'
  | 'polygon'
  | 'angle_arc'
  | 'spring'
  // Annotations
  | 'label'
  | 'text'
  | 'formula'
  | 'brace'
  | 'table'
  | 'highlight_region'
  // Data visualization
  | 'matrix'
  | 'histogram'
  | 'pie_chart'
  | 'bar_chart'
  | 'line_chart'
  | 'scatter_plot'
  | 'box_plot'
  | 'area_chart'
  // Math-specific
  | 'axes_3d'
  | 'complex_plane'
  | 'riemann_sum'
  | 'slope_field'
  | 'parametric_curve'
  | 'wave'
  // Legacy / internal
  | 'coordinate_plane'
  | 'moving_point'
  | 'moving_tangent'
  | 'number_plane';

export type AnimationType =
  | 'draw_graph'
  | 'animate_tangent'
  | 'fade_in'
  | 'fade_out'
  | 'draw_axes'
  | 'move_point'
  | 'draw_vector'
  | 'shade_area'
  | 'zoom_in'
  | 'zoom_out'
  | 'write_formula'
  | 'draw_arrow'
  | 'transform'
  | 'highlight'
  | 'pulse'
  | 'draw_circle'
  | 'draw_line';

// ─── Shared sub-types ────────────────────────────────────────────────────────

export interface DataPoint { x: number; y: number; label?: string; color?: string }
export interface DataSeries { label: string; data: number[]; color?: string }
export interface BinDef    { label: string; value: number; color?: string }
export interface SliceDef  { label: string; value: number; color?: string }
export interface Point3D   { x: number; y: number; z: number; color?: string; label?: string }
export interface Line3D    { x1: number; y1: number; z1: number; x2: number; y2: number; z2: number; color?: string }

// ─── Main element interface ───────────────────────────────────────────────────

export interface SceneElement {
  type: ElementType;
  id?: string;

  // ── Position / geometry ──────────────────────────────────────────────────
  x?: number;
  y?: number;
  x1?: number; y1?: number;
  x2?: number; y2?: number;
  xMin?: number; xMax?: number;
  width?: number; height?: number;
  radius?: number;
  length?: number;

  // ── Appearance ───────────────────────────────────────────────────────────
  color?: string;
  opacity?: number;
  strokeWidth?: number;
  dashed?: boolean;
  filled?: boolean;
  fontSize?: number;

  // ── Text / labels ────────────────────────────────────────────────────────
  label?: string;
  labelPos?: 'top' | 'bottom' | 'left' | 'right';
  text?: string;
  formula?: string;
  xLabel?: string;
  yLabel?: string;
  zLabel?: string;

  // ── Ranges ───────────────────────────────────────────────────────────────
  range?: [number, number];
  xRange?: [number, number];
  yRange?: [number, number];
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';

  // ── graph / tangent / secant / shaded_area / riemann_sum ─────────────────
  function?: string;       // JS math expression in x
  function2?: string;      // second function (area_chart, slope_field)
  atX?: number;            // tangent point
  x3?: number; y3?: number; // third point (polygon vertex etc.)

  // ── matrix ───────────────────────────────────────────────────────────────
  rows?: number[][];
  highlight?: [number, number][];
  highlightRow?: number;
  highlightCol?: number;

  // ── histogram ────────────────────────────────────────────────────────────
  bins?: BinDef[];
  showValues?: boolean;

  // ── pie_chart ─────────────────────────────────────────────────────────────
  slices?: SliceDef[];
  showLabels?: boolean;
  showPercentages?: boolean;

  // ── bar_chart / line_chart / area_chart ───────────────────────────────────
  series?: DataSeries[];       // multi-series data
  categories?: string[];       // x-axis category labels
  horizontal?: boolean;        // bar_chart: horizontal bars
  stacked?: boolean;           // bar_chart: stacked mode
  showLegend?: boolean;

  // ── scatter_plot ──────────────────────────────────────────────────────────
  points?: DataPoint[];
  showRegression?: boolean;    // draw least-squares line

  // ── box_plot ──────────────────────────────────────────────────────────────
  datasets?: Array<{ label: string; values: number[]; color?: string }>;

  // ── axes_3d / complex_plane ───────────────────────────────────────────────
  z?: number;
  points3d?: Point3D[];
  lines3d?: Line3D[];
  vectors3d?: Point3D[];       // vectors from origin

  // ── riemann_sum ───────────────────────────────────────────────────────────
  n?: number;                  // number of rectangles
  method?: 'left' | 'right' | 'midpoint';

  // ── slope_field ───────────────────────────────────────────────────────────
  // uses function (dy/dx = f(x,y)), xRange, yRange

  // ── parametric_curve ──────────────────────────────────────────────────────
  xFunction?: string;          // x(t) as JS expression in t
  yFunction?: string;          // y(t) as JS expression in t
  tRange?: [number, number];   // [tMin, tMax]

  // ── wave ──────────────────────────────────────────────────────────────────
  amplitude?: number;
  frequency?: number;
  phase?: number;
  animated?: boolean;          // propagating wave animation

  // ── polygon ───────────────────────────────────────────────────────────────
  vertices?: Array<{ x: number; y: number }>;

  // ── angle_arc ─────────────────────────────────────────────────────────────
  // vertex at (x,y), two rays defined by angles in radians
  angle1?: number;
  angle2?: number;
  arcRadius?: number;          // radius of the arc in units
  rightAngle?: boolean;        // draw a square corner instead of arc

  // ── spring ────────────────────────────────────────────────────────────────
  coils?: number;
  coilWidth?: number;

  // ── brace ─────────────────────────────────────────────────────────────────
  // spans from (x1,y1) to (x2,y2), label at midpoint
  side?: 'top' | 'bottom' | 'left' | 'right'; // which side the brace curves toward

  // ── table ─────────────────────────────────────────────────────────────────
  headers?: string[];
  tableRows?: Array<string[]>;
  colWidths?: number[];        // per-column width in units

  // ── highlight_region ──────────────────────────────────────────────────────
  shape?: 'rect' | 'ellipse';
  // uses x,y,width,height or x,y,radius
}

export interface SceneAnimation {
  type: AnimationType;
  target?: string;
  duration?: number;
  delay?: number;
  easing?: string;
  from?: number;
  to?: number;
}

export interface Scene {
  id: string;
  duration: number;
  narration: string;
  elements: SceneElement[];
  animations: SceneAnimation[];
  transition?: 'fade' | 'slide' | 'zoom' | 'none';
  cameraZoom?: number;
  backgroundColor?: string;
}

export interface ScenePlan {
  title: string;
  topic: string;
  totalDuration: number;
  scenes: Scene[];
}

export type TutorStatus =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'rendering'
  | 'narrating'
  | 'paused'
  | 'error';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface TutorSession {
  id: string;
  messages: Message[];
  currentPlan: ScenePlan | null;
  status: TutorStatus;
}
