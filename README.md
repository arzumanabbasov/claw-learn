<div align="center">

# Claw Learn

**Talk to it. Watch it teach.**

Claw Learn is an AI-powered visual math tutor with a real-time voice interface — powered by the ElevenLabs Speech Engine. Ask any math or physics question by voice or text, and watch a synchronized animated explanation generate live in the browser.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)
[![Speech Engine by ElevenLabs](https://img.shields.io/badge/Speech%20Engine-ElevenLabs-orange)](https://elevenlabs.io)

[Live Demo](https://clawlearn.vercel.app) · [Report a Bug](https://github.com/arzumanabbasov/claw-learn/issues) · [Request a Feature](https://github.com/arzumanabbasov/claw-learn/issues)

</div>

---

[![Watch the video](https://img.youtube.com/vi/TWIZvm1Dc-M/maxresdefault.jpg)](https://www.youtube.com/watch?v=TWIZvm1Dc-M)
---

## What is Claw Learn?

Claw Learn combines the ElevenLabs Speech Engine with an AI scene planner and a custom canvas renderer to turn math questions into live animated explanations with synchronized narration.

The Speech Engine is the core of the experience — it handles both voice input and audio output over WebRTC, so you can speak your question, interrupt mid-explanation, and ask follow-ups without ever touching a keyboard. When the Speech Engine isn't configured, the app falls back to REST TTS and browser-based speech recognition.

No slides. No textbooks. No pre-recorded videos. Every explanation is generated fresh for your exact question.

```
You:  "Why does the derivative represent slope?"

App:  → ElevenLabs Speech Engine captures your voice over WebRTC
      → AI generates a 10-scene visual teaching plan
      → Canvas renders: axes, parabola, tangent line, slope formula
      → Speech Engine narrates each scene in sync with the animation
      → Interrupt at any time to ask a follow-up — just speak
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
git clone https://github.com/arzumanabbasov/claw-learn.git
cd claw-learn
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your keys:

```env
# AI Provider — OpenAI-compatible endpoint (required)
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
OPENAI_MODEL=gemini-2.5-flash

# Optional — REST TTS fallback (works without this)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Optional — override default voice (Adam)
ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB

# Speech Engine — full WebRTC voice I/O (recommended)
# Create an agent at https://elevenlabs.io/app/conversational-ai
ELEVENLABS_SPEECH_ENGINE_ID=agent_xxxxxxxxxxxxxxxxxxxx

# Optional — lock CORS to your domain in production
ALLOWED_ORIGIN=https://your-domain.com
```

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

---

## Voice Modes

### Mode 1 — ElevenLabs Speech Engine (recommended)

The Speech Engine connects via WebRTC to an ElevenLabs Conversational AI agent and is the primary voice interface for Claw Learn. It handles both input and output in a single low-latency connection:

- **Voice input** — speak your questions naturally, no typing needed
- **Streaming TTS** — audio streams directly from ElevenLabs as each scene plays
- **Interruption** — speak mid-explanation to redirect or ask a follow-up
- **Lower latency** — WebRTC is significantly faster than the REST fallback

**Setup:**
1. Go to [elevenlabs.io/app/conversational-ai](https://elevenlabs.io/app/conversational-ai)
2. Create a new agent
3. Set the system prompt to: *"You are a math narration voice. Read exactly what the user sends you as clear, natural narration."*
4. Copy the Agent ID and set it as `ELEVENLABS_SPEECH_ENGINE_ID` in your `.env.local`

The **Voice** button in the top bar connects and disconnects the Speech Engine. When connected, a pulsing green indicator shows the session is live.

### Mode 2 — REST TTS fallback

When `ELEVENLABS_API_KEY` is set but no Speech Engine is configured, each scene's narration is sent to the ElevenLabs REST API and played back as audio. No voice input in this mode.

### Mode 3 — No voice

The app works fully without any ElevenLabs configuration — text input and silent animations only.

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
| `ELEVENLABS_API_KEY` | Optional | ElevenLabs REST TTS fallback |
| `ELEVENLABS_VOICE_ID` | Optional | Override default voice |
| `ELEVENLABS_SPEECH_ENGINE_ID` | Recommended | WebRTC voice agent ID |
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
│   └── NarrationSubtitle.tsx         # Subtitle below canvas
│
├── hooks/
│   ├── useTutor.ts                   # Core orchestration
│   ├── useSpeechEngine.ts            # ElevenLabs Speech Engine (WebRTC)
│   └── useVoice.ts                   # Web Speech API fallback
│
├── lib/
│   ├── openai.ts                     # OpenAI-compatible client + system prompt
│   ├── animationEngine.ts            # Canvas renderer (30+ elements)
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

- API keys are server-side only — never exposed to the browser
- Input is length-limited and validated on every API route
- CORS is locked to `ALLOWED_ORIGIN` in production
- The canvas renderer uses a safe recursive-descent math parser — no `eval` or `new Function`
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) are set on all responses

See [SECURITY.md](SECURITY.md) for the full security policy and how to report vulnerabilities.

---

## Known Limitations

- **No persistence** — conversation history is in-memory, cleared on page refresh
- **Voice input** — Web Speech API fallback requires Chrome or Edge; the Speech Engine works in all modern browsers
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
- Built with the [ElevenLabs Speech Engine](https://elevenlabs.io/conversational-ai), [Next.js](https://nextjs.org/), and [Framer Motion](https://www.framer.com/motion/)

---

## License

[MIT](LICENSE) © 2025 Claw Learn Contributors
