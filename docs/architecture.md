# Architecture

## Overview

ThinkInMotion is a Next.js 16 application with three main subsystems:

1. **Scene generation** — Gemini converts a natural language question into a structured JSON scene plan
2. **Canvas rendering** — a deterministic renderer converts the scene plan into 2D canvas animations
3. **Voice I/O** — ElevenLabs handles text-to-speech (and optionally speech-to-text via Speech Engine)

These three subsystems are deliberately decoupled. The AI never writes rendering code. The renderer never calls an AI. Voice is a progressive enhancement — the app works without it.

---

## Request flow

```
Browser
  │
  │  1. User submits question (text or voice)
  ▼
useTutor.ask()
  │
  │  2. POST /api/explain { question, history }
  ▼
app/api/explain/route.ts
  │
  │  3. Calls Gemini with system prompt + question
  ▼
lib/gemini.ts → Gemini API
  │
  │  4. Returns JSON scene plan
  ▼
useTutor (sets currentPlan, status → 'rendering')
  │
  │  5. AnimationCanvas receives plan, iterates scenes
  ▼
AnimationCanvas.tsx
  │
  ├──► lib/manimRenderer.ts     (draws each scene on canvas)
  │
  └──► handleNarrate(text)
         │
         ├── if Speech Engine connected:
         │     useSpeechEngine.sendNarration(text)
         │     → sendContextualUpdate() via WebRTC
         │     → awaits onModeChange: speaking → listening
         │
         └── else (REST fallback):
               POST /api/narrate { text }
               → ElevenLabs TTS API
               → plays audio via <Audio> element
               → awaits audio.onended
```

Each scene waits for both the canvas animation **and** the narration to complete before advancing. This is achieved by `Promise.all([renderer.renderScene(scene), onNarrate(scene.narration)])` in `AnimationCanvas.tsx`.

---

## Scene plan schema

```typescript
interface ScenePlan {
  title: string;
  topic: string;
  totalDuration: number;   // seconds (informational)
  scenes: Scene[];
}

interface Scene {
  id: string;
  duration: number;        // seconds (used for hold time after animation)
  narration: string;       // spoken text for this scene
  elements: SceneElement[];
  animations: SceneAnimation[];
}

interface SceneElement {
  type: ElementType;       // 'axes' | 'graph' | 'tangent' | ... (14 types)
  // ... element-specific properties
}
```

Full type definitions: [`types/scene.ts`](../types/scene.ts)

---

## Canvas renderer

`lib/manimRenderer.ts` is a self-contained 2D canvas renderer. Key design decisions:

### Coordinate system

- Origin at canvas center
- x increases right, y increases up (mathematical convention, not screen convention)
- Scale: `Math.min(width, height) / 11` pixels per unit
- Typical visible range: x ∈ [-6, 6], y ∈ [-4, 4]

### Animation model

Each element animates in with a progress value `t ∈ [0, 1]` driven by `requestAnimationFrame`. The easing function is cubic ease-out: `1 - (1-t)³`.

- **Graphs** draw left-to-right (progress controls the x endpoint)
- **Arrows/vectors** grow from start to end
- **Tangent lines** extend outward from the tangent point
- **Shaded areas** fill progressively left-to-right
- **All others** fade in via `globalAlpha = t`

After all elements animate in, the renderer holds the scene for `max(500ms, duration * 1000 - 1500ms)` before resolving.

### Math expression safety

Function strings from Gemini (e.g. `"x**2"`, `"Math.sin(x)"`) are evaluated by a custom recursive-descent parser — not `eval` or `new Function`. The parser only accepts:

- Numbers and the variable `x`
- Operators: `+`, `-`, `*`, `/`, `**`
- Parentheses
- Functions: `Math.sin`, `Math.cos`, `Math.tan`, `Math.sqrt`, `Math.exp`, `Math.log`, `Math.abs`

Any other token causes the expression to return `0`.

### High-DPI support

The canvas is scaled by `window.devicePixelRatio` and its CSS size is set separately, so it renders crisp on retina/HiDPI displays.

---

## Voice subsystem

### Speech Engine (WebRTC)

When `ELEVENLABS_SPEECH_ENGINE_ID` is configured:

```
Browser mic → ElevenLabs STT → transcript
                                    │
                                    ▼
                             useSpeechEngine.onMessage
                             (source === 'user')
                                    │
                                    ▼
                             tutor.ask(transcript)
                             (triggers Gemini → canvas)

Canvas narration text
        │
        ▼
sendContextualUpdate(text)   ← bypasses LLM, goes straight to TTS
        │
        ▼
ElevenLabs TTS → browser speakers
        │
        ▼
onModeChange: speaking → listening
        │
        ▼
narrationResolveRef()        ← canvas advances to next scene
```

`sendContextualUpdate` is critical — it bypasses the agent's LLM and speaks the text directly. Using `sendUserMessage` would cause the agent to generate its own response on top of the narration.

### REST TTS fallback

When Speech Engine is not configured, each scene's narration goes through `POST /api/narrate`, which calls the ElevenLabs REST TTS endpoint and returns an audio/mpeg blob. The client plays it via an `<Audio>` element and awaits `audio.onended`.

---

## State machine

`useTutor` manages a `TutorStatus` state machine:

```
idle ──ask()──► thinking ──plan ready──► rendering ──scene done──► narrating
 ▲                                                                      │
 └──────────────────────── interrupt() / complete() ───────────────────┘
 ▲
 └── error
```

| Status | Meaning |
|---|---|
| `idle` | Waiting for input |
| `thinking` | Gemini API call in flight |
| `rendering` | Canvas animating, narration playing |
| `narrating` | Narration in progress (set by Speech Engine speaking callback) |
| `error` | API call failed |
| `paused` | Reserved for future use |

---

## API routes

### `POST /api/explain`

Accepts a question and conversation history, returns a JSON scene plan from Gemini.

**Request:**
```json
{
  "question": "Why does the derivative represent slope?",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response:**
```json
{ "scenePlan": { "title": "...", "scenes": [...] } }
```

**Limits:** question ≤ 500 chars, history ≤ 10 items × 300 chars.

---

### `POST /api/narrate`

Converts text to speech using ElevenLabs REST API. Returns `audio/mpeg`.

**Request:**
```json
{ "text": "Let's start with a simple parabola." }
```

**Response:** Binary audio/mpeg stream.

**Limits:** text ≤ 500 chars. Voice ID is server-controlled.

---

### `GET /api/speech-engine/token`

Mints a short-lived WebRTC conversation token for the ElevenLabs Speech Engine.

**Response:**
```json
{ "token": "eyJ..." }
```

Returns `501` with `{ "code": "NOT_CONFIGURED" }` when `ELEVENLABS_SPEECH_ENGINE_ID` is not set.
