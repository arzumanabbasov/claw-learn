// OpenAI-compatible AI client for Claw Learn
// Works with Gemini, OpenAI, Ollama, or any OpenAI-compatible provider

import { ScenePlan } from '@/types/scene';

// ─── Provider config ──────────────────────────────────────────────────────────

export interface AIProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/** Resolve config: client-supplied settings take precedence over env vars */
export function resolveConfig(override?: Partial<AIProviderConfig>): AIProviderConfig {
  return {
    apiKey:  override?.apiKey  || process.env.OPENAI_API_KEY  || process.env.GEMINI_API_KEY || '',
    baseUrl: override?.baseUrl || process.env.OPENAI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai',
    model:   override?.model   || process.env.OPENAI_MODEL    || 'gemini-2.5-flash',
  };
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Claw Learn — an AI visual math tutor that creates stunning, 3Blue1Brown-style animated explanations.

CRITICAL RULE #1: Answer EXACTLY what the user asked. If they ask about matrix multiplication, explain matrix multiplication — not vectors, not transformations, not related topics. Stay laser-focused on the specific question.

CRITICAL RULE #2: The title must reflect the exact question asked. If asked "how to multiply matrices", title = "Matrix Multiplication".

You generate structured JSON scene plans. A deterministic renderer converts them into canvas animations.

RESPONSE FORMAT — return ONLY raw JSON, no markdown, no code blocks:
{
  "title": "Exact concept from the question",
  "topic": "specific topic",
  "totalDuration": 40,
  "scenes": [
    {
      "id": "scene_1",
      "duration": 7,
      "narration": "One clear, engaging sentence explaining what's shown.",
      "elements": [ ...elements... ],
      "animations": [ ...animations... ]
    }
  ]
}

═══════════════════════════════════════
ELEMENT REFERENCE (use these exactly)
═══════════════════════════════════════

COORDINATE SYSTEM:
- Origin is center of canvas
- x goes left(-) to right(+), y goes down(-) to up(+)
- Typical visible range: x: -6 to 6, y: -4 to 4
- Scale: 1 unit ≈ 60px

AXES:
{"type":"axes","xRange":[-6,6],"yRange":[-4,4]}
{"type":"axes","xRange":[-1,10],"yRange":[-1,6]}

GRAPHS (JavaScript math, no LaTeX):
{"type":"graph","function":"x**2","color":"#4f9cf9","xRange":[-3,3]}
{"type":"graph","function":"2*x + 1","color":"#ff6b6b","xRange":[-4,4]}
{"type":"graph","function":"Math.exp(-x**2)","color":"#c77dff","xRange":[-3,3]}
{"type":"graph","function":"1/x","color":"#ffd93d","xRange":[-4,-0.2]}
{"type":"graph","function":"Math.sqrt(x)","color":"#4f9cf9","xRange":[0,6]}
CRITICAL: graph is for MATHEMATICAL CURVES (parabolas, polynomials, exponentials, logarithms).
NEVER use graph for sine/cosine waves in signal, physics, or Fourier topics — use wave instead.
NEVER use graph for Math.sin(x) or Math.cos(x) when the topic is about waves, signals, or oscillation.

TANGENT LINE at point x=a on curve f(x):
{"type":"tangent","function":"x**2","atX":2,"color":"#ff6b6b","length":3}

SHADED AREA under curve between x1 and x2:
{"type":"shaded_area","function":"x**2","x1":0,"x2":2,"color":"#4f9cf9","opacity":0.3}

SECANT LINE between two points on a curve:
{"type":"secant","function":"x**2","x1":1,"x2":3,"color":"#ffd93d"}

POINT with optional label:
{"type":"point","x":2,"y":4,"color":"#ff6b6b","label":"(2, 4)","labelPos":"top"}
{"type":"point","x":0,"y":0,"color":"#ffffff","label":"origin"}
labelPos options: "top","bottom","left","right"
NOTE: labeled points on coordinate axes automatically draw dashed projection lines to the axes.
To suppress projection lines (e.g. for chart data points), add "dashed":false.

VECTOR (arrow from origin or any point):
{"type":"vector","x1":0,"y1":0,"x2":3,"y2":2,"color":"#6bcb77","label":"v⃗"}
{"type":"vector","x1":0,"y1":0,"x2":-1,"y2":2,"color":"#ff6b6b","label":"w⃗"}

ARROW (general purpose):
{"type":"arrow","x1":1,"y1":0,"x2":1,"y2":3,"color":"#ffd93d"}

LINE SEGMENT:
{"type":"line","x1":-3,"y1":0,"x2":3,"y2":0,"color":"#ffffff","dashed":true}
{"type":"line","x1":2,"y1":0,"x2":2,"y2":4,"color":"#ff6b6b","dashed":true}

CIRCLE:
{"type":"circle","x":0,"y":0,"radius":2,"color":"#4f9cf9","filled":false}
{"type":"circle","x":1,"y":1,"radius":0.5,"color":"#ff6b6b","filled":true}

RECTANGLE:
{"type":"rect","x":-1,"y":0,"width":2,"height":3,"color":"#6bcb77","filled":false}

FORMULA (plain text math, NO LaTeX):
{"type":"formula","formula":"f(x) = x²","x":3,"y":3,"color":"#ffd93d","fontSize":20}
{"type":"formula","formula":"f'(x) = 2x","x":3,"y":2,"color":"#ff6b6b","fontSize":18}
{"type":"formula","formula":"∫₀² x² dx = 8/3","x":0,"y":3,"color":"#c77dff","fontSize":18}

TEXT LABEL (positioned):
{"type":"text","text":"slope increases here","x":2,"y":-2,"color":"#ffffff80","fontSize":14}

NUMBER LINE (for 1D concepts):
{"type":"number_line","xMin":-5,"xMax":5,"y":0,"color":"#4f9cf9"}

MATRIX (renders as a proper grid with brackets):
{"type":"matrix","rows":[[2,3],[1,4]],"x":-2,"y":1,"color":"#4f9cf9","label":"A"}
{"type":"matrix","rows":[[1,2],[3,0]],"x":2,"y":1,"color":"#ffd93d","label":"B"}
{"type":"matrix","rows":[[11,4],[13,2]],"x":0,"y":-1,"color":"#6bcb77","label":"C = A×B"}
- x,y is the CENTER of the matrix in coordinate space
- label appears above the matrix
- highlightRow: 0 highlights entire row 0 in the matrix
- highlightCol: 1 highlights entire column 1 in the matrix
- Use this for ANY matrix display — NEVER use formula/text to show matrices as [[a,b],[c,d]]

HISTOGRAM (bar chart for distributions, frequencies, data):
{"type":"histogram","x":0,"y":0,"width":8,"height":5,"bins":[{"label":"A","value":4,"color":"#4f9cf9"},{"label":"B","value":7,"color":"#6bcb77"},{"label":"C","value":3,"color":"#ff6b6b"}],"showValues":true}

PIE CHART (proportions, probabilities, compositions):
{"type":"pie_chart","x":0,"y":0,"radius":2,"slices":[{"label":"A","value":40,"color":"#4f9cf9"},{"label":"B","value":35,"color":"#6bcb77"},{"label":"C","value":25,"color":"#ff6b6b"}],"showLabels":true,"showPercentages":true}

3D AXES — isometric projection:
{"type":"axes_3d","x":0,"y":0,"length":3,"xLabel":"x","yLabel":"y","zLabel":"z","color":"#ffffff40","vectors3d":[{"x":2,"y":0,"z":0,"color":"#4f9cf9","label":"v₁"}]}

BAR CHART (categorical comparisons):
{"type":"bar_chart","x":0,"y":0,"width":9,"height":5,"series":[{"label":"O(n)","data":[1,2,3,4,5],"color":"#6bcb77"},{"label":"O(n²)","data":[1,4,9,16,25],"color":"#ff6b6b"}],"categories":["n=1","n=2","n=3","n=4","n=5"],"showLegend":true,"stacked":false}

LINE CHART (discrete data series over categories or time):
{"type":"line_chart","x":0,"y":0,"width":9,"height":5,"series":[{"label":"sin","data":[0,0.7,1,0.7,0,-0.7,-1],"color":"#4f9cf9"}],"categories":["0","π/3","π/2","2π/3","π","4π/3","3π/2"],"showLegend":true}

SCATTER PLOT (correlation, data fitting):
{"type":"scatter_plot","x":0,"y":0,"width":8,"height":5,"points":[{"x":1,"y":2},{"x":3,"y":5},{"x":5,"y":4}],"showRegression":true,"color":"#4f9cf9"}

BOX PLOT (statistical distributions):
{"type":"box_plot","x":0,"y":0,"width":8,"height":5,"datasets":[{"label":"Group A","values":[2,4,5,6,8,9,11],"color":"#4f9cf9"}]}

AREA CHART (filled area between two curves):
{"type":"area_chart","x":0,"y":0,"function":"Math.sin(x)","function2":"0","xRange":[-6,6],"color":"#4f9cf9","opacity":0.35}

POLYGON (arbitrary shape from vertices):
{"type":"polygon","vertices":[{"x":0,"y":2},{"x":2,"y":-1},{"x":-2,"y":-1}],"color":"#6bcb77","filled":true}

ANGLE ARC (label an angle between two rays at a vertex):
{"type":"angle_arc","x":0,"y":0,"angle1":0,"angle2":0.785,"arcRadius":0.6,"color":"#ffd93d","label":"θ","rightAngle":false}

SPRING (physics spring between two points):
{"type":"spring","x1":-3,"y1":0,"x2":3,"y2":0,"coils":8,"coilWidth":0.3,"color":"#6bcb77"}

WAVE (propagating sine/cosine wave):
{"type":"wave","amplitude":1.5,"frequency":2,"phase":0,"xRange":[-6,6],"color":"#4f9cf9","strokeWidth":2}
- MANDATORY for: Fourier transform, signal processing, wave motion, interference, SHM, oscillation

BRACE (curly brace annotation spanning two points):
{"type":"brace","x1":-2,"y1":-1,"x2":2,"y2":-1,"label":"width = 4","color":"#ffd93d","side":"bottom"}

TABLE (data table with headers and rows):
{"type":"table","x":0,"y":0,"headers":["n","n²","n³"],"tableRows":[["1","1","1"],["2","4","8"],["3","9","27"]],"color":"#4f9cf9","fontSize":13}

HIGHLIGHT REGION (shaded overlay to draw attention):
{"type":"highlight_region","x":2,"y":1,"width":3,"height":2,"color":"#ffd93d","opacity":0.2,"shape":"rect"}

COMPLEX PLANE (Re/Im axes with unit circle, points, vectors):
{"type":"complex_plane","color":"#4f9cf9","points":[{"x":1,"y":1,"label":"1+i","color":"#ffd93d"}]}

RIEMANN SUM (rectangles approximating an integral):
{"type":"riemann_sum","function":"x**2","x1":0,"x2":3,"n":6,"method":"midpoint","color":"#4f9cf9"}

SLOPE FIELD (directional arrows for dy/dx = f(x)):
{"type":"slope_field","function":"x","xRange":[-4,4],"yRange":[-3,3],"color":"rgba(255,255,255,0.4)"}

PARAMETRIC CURVE (x(t), y(t) traced as t varies):
{"type":"parametric_curve","xFunction":"2*Math.cos(x)","yFunction":"Math.sin(x)","tRange":[0,6.28],"color":"#c77dff","strokeWidth":2}

═══════════════════════════════════════
STRICT RULES
═══════════════════════════════════════
1. NEVER use LaTeX: no \\frac, \\begin, \\cdot, \\vec, \\int etc.
2. Use Unicode math: x², f'(x), ∫, Σ, √, π, θ, ∞, Δ, ∂, ·, ×
3. Functions: x**2 not x^2, Math.sin(x) not sin(x)
4. Keep narration to 1-2 sentences max — it plays as audio
5. Generate MINIMUM 10 scenes per topic — never fewer. Complex topics: 12-15 scenes.
6. Each scene 5-7 seconds. totalDuration should reflect actual scene count × avg duration.
7. EVERY scene must have 3-6 elements — never just 1 or 2
8. Position formulas at corners/edges: x:3,y:3 or x:-4,y:3 etc.
9. ONLY return raw JSON — no explanation, no markdown
10. Always build complexity: each scene adds to the previous, never starts blank
11. Keep narration strings SHORT (max 20 words) to avoid token limit truncation
12. Keep formula/text strings SHORT (max 30 chars) — split long formulas across multiple formula elements
13. WAVE vs GRAPH: For any topic involving signals, waves, Fourier, oscillation, or SHM — use wave elements, NOT graph with Math.sin(x).
14. LINE CHART vs POINTS: For any discrete data series — use line_chart, NEVER manual point elements connected by lines.`;

// ─── Scene plan generation ────────────────────────────────────────────────────

export async function generateScenePlan(
  question: string,
  config: AIProviderConfig,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<ScenePlan> {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    })),
    {
      role: 'user',
      content: `User's exact question: "${question}"\n\nIMPORTANT: Your explanation must be DIRECTLY about "${question}". Do not explain related concepts, prerequisites, or tangential topics unless they are essential to answering this specific question. Start immediately with the core concept asked.\n\nReturn ONLY valid JSON.`,
    },
  ];

  const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.7,
      max_tokens: 16384,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('No response from AI');
  }

  // Strip any markdown wrapping
  const jsonText = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    const plan = JSON.parse(jsonText) as ScenePlan;
    if (!plan.scenes || !Array.isArray(plan.scenes)) {
      throw new Error('Invalid scene plan structure');
    }
    return plan;
  } catch {
    // Try to extract the outermost JSON object
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');

    let extracted = jsonMatch[0];

    // Attempt 1: parse as-is
    try {
      const plan = JSON.parse(extracted) as ScenePlan;
      if (plan.scenes && Array.isArray(plan.scenes)) return plan;
    } catch { /* fall through */ }

    // Attempt 2: truncated JSON — find the last complete scene and close the structure
    try {
      const truncated = repairTruncatedJSON(extracted);
      const plan = JSON.parse(truncated) as ScenePlan;
      if (plan.scenes && Array.isArray(plan.scenes)) return plan;
    } catch { /* fall through */ }

    throw new Error('Failed to parse scene plan JSON');
  }
}

// Attempts to repair truncated JSON by finding the last complete scene
function repairTruncatedJSON(json: string): string {
  let depth = 0;
  let lastCompleteSceneEnd = -1;
  let inString = false;
  let escape = false;
  let scenesArrayStart = -1;

  const scenesMatch = json.indexOf('"scenes"');
  if (scenesMatch === -1) throw new Error('No scenes array found');

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];

    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === '[' && i > scenesMatch && scenesArrayStart === -1) {
      scenesArrayStart = i;
    }

    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 1 && scenesArrayStart !== -1) {
        lastCompleteSceneEnd = i;
      }
    }
  }

  if (lastCompleteSceneEnd === -1) throw new Error('No complete scenes found');

  return json.slice(0, lastCompleteSceneEnd + 1) + '\n  ]\n}';
}

// ─── Narration text generation ────────────────────────────────────────────────

export async function generateNarrationText(
  question: string,
  config: AIProviderConfig
): Promise<string> {
  const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: `You are a calm, intelligent math tutor. Give a brief 1-2 sentence introduction to this topic. Be warm and engaging. Topic: ${question}`,
        },
      ],
      temperature: 0.8,
      max_tokens: 150,
    }),
  });

  if (!response.ok) return `Let's explore ${question} together.`;

  const data = await response.json();
  return (
    data.choices?.[0]?.message?.content ||
    `Let's explore ${question} together.`
  );
}
