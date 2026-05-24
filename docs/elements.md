# Visual Element Reference

All 14 element types supported by the canvas renderer.

## Coordinate system

- Origin at canvas center
- x increases right, y increases up
- Typical visible range: x ∈ [-6, 6], y ∈ [-4, 4]
- Scale: ~60px per unit (varies with canvas size)

---

## `axes`

Coordinate axes with grid lines, tick marks, and axis labels.

```json
{ "type": "axes", "xRange": [-6, 6], "yRange": [-4, 4] }
```

| Property | Type | Default | Description |
|---|---|---|---|
| `xRange` | `[number, number]` | auto | Visible x range |
| `yRange` | `[number, number]` | auto | Visible y range |

Always include axes for calculus and algebra topics.

---

## `graph`

A function curve drawn left-to-right.

```json
{ "type": "graph", "function": "x**2", "color": "#4f9cf9", "xRange": [-3, 3] }
```

| Property | Type | Default | Description |
|---|---|---|---|
| `function` | `string` | — | JS math expression in `x` |
| `color` | `string` | `#4f9cf9` | Stroke color |
| `xRange` | `[number, number]` | full canvas | Draw range |

**Function syntax:** JavaScript math — `x**2`, `Math.sin(x)`, `Math.sqrt(x)`, `1/x`, `Math.exp(-x**2)`. No LaTeX, no `^`.

---

## `tangent`

Tangent line to a curve at a given x value.

```json
{ "type": "tangent", "function": "x**2", "atX": 2, "color": "#ff6b6b", "length": 3 }
```

| Property | Type | Default | Description |
|---|---|---|---|
| `function` | `string` | — | The curve |
| `atX` | `number` | — | x coordinate of tangent point |
| `length` | `number` | `3` | Half-length of the tangent line in units |
| `color` | `string` | `#ff6b6b` | Line color |

Slope is computed numerically: `(f(x+h) - f(x-h)) / (2h)` where `h = 0.0001`.

---

## `secant`

Secant line between two points on a curve.

```json
{ "type": "secant", "function": "x**2", "x1": 1, "x2": 3, "color": "#ffd93d" }
```

| Property | Type | Default | Description |
|---|---|---|---|
| `function` | `string` | — | The curve |
| `x1` | `number` | — | First x coordinate |
| `x2` | `number` | — | Second x coordinate |
| `color` | `string` | `#ffd93d` | Line color |

---

## `shaded_area`

Filled area between a curve and the x-axis.

```json
{ "type": "shaded_area", "function": "x**2", "x1": 0, "x2": 2, "color": "#4f9cf9", "opacity": 0.3 }
```

| Property | Type | Default | Description |
|---|---|---|---|
| `function` | `string` | — | The curve |
| `x1` | `number` | — | Left boundary |
| `x2` | `number` | — | Right boundary |
| `color` | `string` | `#4f9cf9` | Fill color |
| `opacity` | `number` | `0.3` | Fill opacity (0–1) |

---

## `point`

A dot with optional label and projection lines to the axes.

```json
{ "type": "point", "x": 2, "y": 4, "color": "#ff6b6b", "label": "(2, 4)", "labelPos": "top" }
```

| Property | Type | Default | Description |
|---|---|---|---|
| `x` | `number` | `0` | x coordinate |
| `y` | `number` | `0` | y coordinate |
| `color` | `string` | `#ff6b6b` | Dot color |
| `label` | `string` | — | Text label |
| `labelPos` | `"top" \| "bottom" \| "left" \| "right"` | `"top"` | Label position |

Projection lines (dashed, 50% opacity) are drawn automatically to both axes.

---

## `vector`

An arrow from one point to another with an optional label.

```json
{ "type": "vector", "x1": 0, "y1": 0, "x2": 3, "y2": 2, "color": "#6bcb77", "label": "v⃗" }
```

| Property | Type | Default | Description |
|---|---|---|---|
| `x1`, `y1` | `number` | `0, 0` | Start point |
| `x2`, `y2` | `number` | `1, 1` | End point |
| `color` | `string` | `#6bcb77` | Arrow color |
| `label` | `string` | — | Label near midpoint |

---

## `arrow`

General-purpose arrow (same as `vector` but without the label convention).

```json
{ "type": "arrow", "x1": 1, "y1": 0, "x2": 1, "y2": 3, "color": "#ffd93d" }
```

---

## `line`

A line segment, optionally dashed.

```json
{ "type": "line", "x1": 2, "y1": 0, "x2": 2, "y2": 4, "color": "#ff6b6b", "dashed": true }
```

| Property | Type | Default | Description |
|---|---|---|---|
| `x1`, `y1` | `number` | — | Start point |
| `x2`, `y2` | `number` | — | End point |
| `color` | `string` | `#ffffff` | Line color |
| `dashed` | `boolean` | `false` | Dashed style |
| `strokeWidth` | `number` | `2` | Line width in pixels |

---

## `circle`

A circle, filled or outline.

```json
{ "type": "circle", "x": 0, "y": 0, "radius": 2, "color": "#4f9cf9", "filled": false }
```

| Property | Type | Default | Description |
|---|---|---|---|
| `x`, `y` | `number` | `0, 0` | Center |
| `radius` | `number` | `1` | Radius in units |
| `color` | `string` | `#4f9cf9` | Color |
| `filled` | `boolean` | `false` | Fill with 30% opacity |

---

## `rect`

A rectangle, filled or outline.

```json
{ "type": "rect", "x": -1, "y": 0, "width": 2, "height": 3, "color": "#6bcb77", "filled": false }
```

| Property | Type | Default | Description |
|---|---|---|---|
| `x`, `y` | `number` | — | Bottom-left corner |
| `width` | `number` | `1` | Width in units |
| `height` | `number` | `1` | Height in units |
| `color` | `string` | `#6bcb77` | Color |
| `filled` | `boolean` | `false` | Fill with 30% opacity |

---

## `matrix`

A matrix rendered as a proper grid with square brackets.

```json
{
  "type": "matrix",
  "rows": [[2, 3], [1, 4]],
  "x": -2, "y": 1,
  "color": "#4f9cf9",
  "label": "A",
  "highlightRow": 0,
  "highlightCol": 1
}
```

| Property | Type | Default | Description |
|---|---|---|---|
| `rows` | `number[][]` | — | Matrix values |
| `x`, `y` | `number` | `0, 0` | Center of the matrix |
| `color` | `string` | `#4f9cf9` | Color |
| `label` | `string` | — | Label above the matrix |
| `highlightRow` | `number` | — | Highlight entire row |
| `highlightCol` | `number` | — | Highlight entire column |

**Never** use `formula` or `text` to display matrices as `[[a,b],[c,d]]`. Always use this element type.

---

## `formula`

Math text in a dark pill box, positioned at a coordinate.

```json
{ "type": "formula", "formula": "f'(x) = 2x", "x": 3, "y": 3, "color": "#ffd93d", "fontSize": 18 }
```

| Property | Type | Default | Description |
|---|---|---|---|
| `formula` | `string` | — | Display text (Unicode math, no LaTeX) |
| `x`, `y` | `number` | `3, 3` | Position |
| `color` | `string` | `#ffd93d` | Text and border color |
| `fontSize` | `number` | `18` | Font size in pixels |

**Use Unicode math:** `x²`, `f'(x)`, `∫`, `Σ`, `√`, `π`, `θ`, `∞`, `Δ`, `∂`, `·`, `×`. No LaTeX.

Position formulas at corners/edges: `x: 3, y: 3` (top-right), `x: -4, y: 3` (top-left), etc.

---

## `text` / `label`

Plain text at a coordinate, no background box.

```json
{ "type": "text", "text": "slope increases here", "x": 2, "y": -2, "color": "#ffffff80", "fontSize": 14 }
```

| Property | Type | Default | Description |
|---|---|---|---|
| `text` | `string` | — | Display text |
| `x`, `y` | `number` | `0, 0` | Position |
| `color` | `string` | `#ffffff` | Text color |
| `fontSize` | `number` | `15` | Font size in pixels |

---

## `number_line`

A standalone horizontal number line with tick marks.

```json
{ "type": "number_line", "xMin": -5, "xMax": 5, "y": 0, "color": "#4f9cf9" }
```

| Property | Type | Default | Description |
|---|---|---|---|
| `xMin` | `number` | `-5` | Left end |
| `xMax` | `number` | `5` | Right end |
| `y` | `number` | `0` | Vertical position |
| `color` | `string` | `#4f9cf9` | Color |
