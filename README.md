<div align="center">

# Claw Learn

**AI-powered visual math tutor — inspired by 3Blue1Brown.**

Ask any math or physics question. Watch it come alive.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)
[![Voice by ElevenLabs](https://img.shields.io/badge/Voice-ElevenLabs-orange)](https://elevenlabs.io)

[Live Demo](https://clawlearn.vercel.app) · [Report a Bug](https://github.com/your-username/clawlearn/issues) · [Request a Feature](https://github.com/your-username/clawlearn/issues)

</div>

---

## What is Claw Learn?

Claw Learn turns math questions into synchronized animated explanations. You ask a question — in text or by voice — and the app generates a multi-scene visual explanation with narration, rendered live in the browser.

No slides. No textbooks. No pre-recorded videos. Every explanation is generated fresh for your exact question.

```
You:  "Why does the derivative represent slope?"

App:  → AI generates a 10-scene visual teaching plan
      → Canvas renders: axes, parabola, tangent line, slope formula
      → ElevenLabs narrates each scene in sync
      → You can interrupt and ask follow-ups at any time
```

---

## Demo

> Add a GIF or screenshot here

**Try these questions:**
- *"How does matrix multiplication work?"*
- *"Explain the Fourier transform visually"*
- *"What is integration and why does it find area?"*
- *"Show me Euler's formula e^(iπ) + 1 = 0"*
- *"How does gravity create orbits?"*

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4, Framer Motion |
| AI | Any OpenAI-compatible API (Gemini, OpenAI, Ollama, etc.) |
| Voice I/O | ElevenLabs Speech Engine (WebRTC) |
| TTS fallback | ElevenLabs REST API |
| STT fallback | Web Speech API |
| Animations | Custom 2D Canvas renderer |
| Language | TypeScript 5 |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites

- **Node.js 18+**
- **An OpenAI-compatible API key** — Gemini (free at [aistudio.google.com](https://aistudio.google.com/app/apikey)), OpenAI, or any compatible provider
- **ElevenLabs API key** — optional, free tier at [elevenlabs.io](https://elevenlabs.io) (app works without it)

### 1. Clone and install

```bash
git clone https://github.com/your-username/clawlearn.git
cd clawlearn
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your keys:

```env
# AI Provider — OpenAI-compatible endpoint (required)
# Use Gemini, OpenAI, Ollama, or any compatible provider
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
OPENAI_MODEL=gemini-2.5-flash

# Optional — REST TTS fallback (works without this)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Optional — override default voice (Adam)
ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB

# Optional — Speech Engine for full WebRTC voice I/O
# Create an agent at https://elevenlabs.io/app/conversational-ai
ELEVENLABS_SPEECH_ENGINE_ID=agent_xxxxxxxxxxxxxxxxxxxx

# Optional — lock CORS to your domain in production
ALLOWED_ORIGIN=https://your-domain.com
```

Alternatively, you can configure API keys directly in the app's **Settings** page (gear icon in the top bar) — no `.env` file needed for local use.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## AI Provider Configuration

Claw Learn uses the OpenAI-compatible API format, so it works with any provider that supports it.

### Gemini (default)

```env
OPENAI_API_KEY=your_gemini_api_key
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
OPENAI_MODEL=gemini-2.5-flash
```

### OpenAI

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o
```

### Ollama (local)

```env
OPENAI_API_KEY=ollama
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL=llama3.1
```

### Any other OpenAI-compatible provider

Set `OPENAI_BASE_URL` to the provider's base URL and `OPENAI_MODEL` to the model name.

---

## Voice Modes

Claw Learn supports two voice modes:

### Mode 1 — REST TTS (default, no setup needed)

When `ELEVENLABS_API_KEY` is set, each scene's narration is sent to the ElevenLabs REST API and played back as audio. Simple and reliable.

### Mode 2 — Speech Engine (full voice I/O)

When `ELEVENLABS_SPEECH_ENGINE_ID` is set, the app connects via WebRTC to an ElevenLabs Conversational AI agent. This enables:

- **Voice input** — speak your questions, no typing needed
- **Lower latency TTS** — audio streams directly from ElevenLabs
- **Interruption** — speak mid-explanation to ask a follow-up

**Setup:**
1. Go to [elevenlabs.io/app/conversational-ai](https://elevenlabs.io/app/conversational-ai)
2. Create a new agent
3. Set the system prompt to: *"You are a math narration voice. Read exactly what the user sends you as clear, natural narration."*
4. Copy the Agent ID and add it to `.env.local` as `ELEVENLABS_SPEECH_ENGINE_ID`

---

## Settings Page

Claw Learn includes an in-app settings page where you can configure all API keys without touching `.env` files. Keys are stored in `localStorage` and take precedence over environment variables.

Access it via the **⚙ Settings** button in the top bar of the tutor app.

---

## Deployment

### Vercel (recommended)

```bash
npx vercel
```

Set these environment variables in the Vercel dashboard under **Settings → Environment Variables**:

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | ✅ | API key for your AI provider |
| `OPENAI_BASE_URL` | ✅ | Base URL of the OpenAI-compatible endpoint |
| `OPENAI_MODEL` | ✅ | Model name to use |
| `ELEVENLABS_API_KEY` | Optional | ElevenLabs REST TTS |
| `ELEVENLABS_VOICE_ID` | Optional | Override default voice |
| `ELEVENLABS_SPEECH_ENGINE_ID` | Optional | WebRTC voice agent ID |
| `ALLOWED_ORIGIN` | Recommended | Your production domain for CORS |

The `vercel.json` in the repo is pre-configured.

### Self-hosted

```bash
npm run build
npm start
```

Requires Node.js 18+ and the environment variables above.

---

## Visual Element Reference

The canvas renderer supports 30+ element types:

| Type | Description |
|---|---|
| `axes` | Coordinate axes with grid and tick labels |
| `graph` | Function curve (JS math expression) |
| `tangent` | Tangent line to a curve at a point |
| `secant` | Secant line between two points |
| `shaded_area` | Filled area under a curve |
| `point` | Dot with optional label |
| `vector` | Arrow with label |
| `matrix` | Matrix grid with brackets and highlights |
| `formula` | Math text in a pill box |
| `histogram` | Bar chart for distributions |
| `pie_chart` | Proportions and compositions |
| `bar_chart` | Categorical comparisons |
| `line_chart` | Discrete data series |
| `scatter_plot` | Correlation with optional regression line |
| `wave` | Propagating sine/cosine wave |
| `axes_3d` | Isometric 3D axes |
| `complex_plane` | Re/Im axes with unit circle |
| `riemann_sum` | Rectangles approximating an integral |
| `slope_field` | Directional arrows for dy/dx |
| `parametric_curve` | x(t), y(t) traced as t varies |
| `polygon` | Arbitrary shape from vertices |
| `angle_arc` | Label an angle between two rays |
| `spring` | Physics spring between two points |
| `brace` | Curly brace annotation |
| `table` | Data table with headers |
| `highlight_region` | Shaded overlay |

**Coordinate system:** origin at center, x right, y up. Typical visible range: x ∈ [-6, 6], y ∈ [-4, 4].

---

## Project Structure

```
clawlearn/
├── app/
│   ├── api/
│   │   ├── explain/route.ts          # POST — AI scene plan generation
│   │   ├── narrate/route.ts          # POST — ElevenLabs REST TTS
│   │   └── speech-engine/token/      # GET  — WebRTC conversation token
│   ├── page.tsx                      # Root — landing ↔ tutor router
│   ├── layout.tsx                    # Fonts, metadata, global CSS
│   └── globals.css                   # Design tokens, animations
│
├── components/
│   ├── LandingPage.tsx               # Marketing page
│   ├── TutorApp.tsx                  # App shell
│   ├── AnimationCanvas.tsx           # Canvas + scene sequencer
│   ├── ConversationPanel.tsx         # Chat history
│   ├── QuestionInput.tsx             # Input bar
│   ├── NarrationSubtitle.tsx         # Subtitle below canvas
│   ├── VoiceOrb.tsx                  # Voice status indicator
│   └── SettingsModal.tsx             # API key configuration
│
├── hooks/
│   ├── useTutor.ts                   # Core orchestration
│   ├── useSpeechEngine.ts            # ElevenLabs Speech Engine
│   └── useVoice.ts                   # Web Speech API fallback
│
├── lib/
│   ├── openai.ts                     # OpenAI-compatible client + system prompt
│   ├── manimRenderer.ts              # Canvas renderer (30+ elements)
│   ├── elevenlabs.ts                 # ElevenLabs REST helpers
│   └── voiceRecognition.ts           # Web Speech API wrapper
│
├── types/
│   └── scene.ts                      # Scene plan TypeScript types
│
├── .env.local.example                # Environment variable template
├── CONTRIBUTING.md                   # Contribution guide
├── LICENSE                           # MIT
└── vercel.json                       # Vercel deployment config
```

---

## Security

- API keys are server-side only — never exposed to the browser (unless set via the in-app settings, which stores them in `localStorage` for local use only)
- Input is length-limited and validated on every API route
- CORS is locked to `ALLOWED_ORIGIN` in production (set this on Vercel)
- The canvas renderer uses a safe recursive-descent math parser — no `eval` or `new Function`
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) are set on all responses

See [SECURITY.md](SECURITY.md) for the full security policy and how to report vulnerabilities.

---

## Known Limitations

- **No persistence** — conversation history is in-memory, cleared on page refresh
- **Voice input** — Web Speech API requires Chrome or Edge (not Firefox/Safari)
- **JSON truncation** — very complex topics may cause the AI to return truncated JSON; the parser attempts recovery by finding the last complete scene
- **ElevenLabs free tier** — 10,000 characters/month; the app continues silently without narration when quota is exceeded

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

```bash
# Fork, then:
git checkout -b feat/your-feature
# Make changes
npx tsc --noEmit   # must pass
git commit -m "feat: your feature"
git push origin feat/your-feature
# Open a pull request
```

---

## Acknowledgments

- Inspired by [3Blue1Brown](https://www.3blue1brown.com/) and the [manim](https://github.com/3b1b/manim) animation library
- Built with [ElevenLabs](https://elevenlabs.io/), [Next.js](https://nextjs.org/), and [Framer Motion](https://www.framer.com/motion/)

---

## License

[MIT](LICENSE) © 2025 Claw Learn Contributors
