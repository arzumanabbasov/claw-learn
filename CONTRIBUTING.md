# Contributing to Claw Learn

Thank you for your interest in contributing. This document covers everything you need to get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [What to Work On](#what-to-work-on)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Commit Style](#commit-style)

---

## Code of Conduct

Be respectful. Critique code, not people. We welcome contributors of all experience levels.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- A Gemini API key (free at [aistudio.google.com](https://aistudio.google.com/app/apikey))

### Setup

```bash
git clone https://github.com/arzumanabbasov/claw-learn.git
cd claw-learn
npm install
cp .env.local.example .env.local
# Fill in GEMINI_API_KEY in .env.local
npm run dev
```

### Verify it works

Open [http://localhost:3000](http://localhost:3000), click **Start Learning**, and ask a math question. You should see an animated canvas explanation within a few seconds.

---

## Development Workflow

```bash
npm run dev      # Start dev server (Turbopack)
npm run build    # Production build
npm run lint     # ESLint
npx tsc --noEmit # Type check
```

There are no automated tests yet — manual verification is the current standard. If you add a feature, describe how you tested it in your PR.

---

## Project Structure

```
app/
  api/explain/route.ts        # POST — Gemini scene plan generation
  api/narrate/route.ts        # POST — ElevenLabs REST TTS fallback
  api/speech-engine/token/    # GET  — WebRTC token for Speech Engine
  page.tsx                    # Root page (landing ↔ tutor router)
  layout.tsx                  # Fonts, metadata, global CSS

components/
  LandingPage.tsx             # Marketing landing page (8 sections)
  TutorApp.tsx                # App shell — header, left panel, canvas panel
  AnimationCanvas.tsx         # Canvas container + scene sequencing
  ConversationPanel.tsx       # Chat history
  QuestionInput.tsx           # Text input + voice button
  NarrationSubtitle.tsx       # Subtitle bar below canvas
  VoiceOrb.tsx                # Animated voice status indicator

hooks/
  useTutor.ts                 # Core orchestration — ask, narrate, interrupt
  useSpeechEngine.ts          # ElevenLabs Speech Engine (WebRTC voice I/O)
  useVoice.ts                 # Web Speech API fallback (STT only)

lib/
  gemini.ts                   # Gemini API client + full system prompt
  manimRenderer.ts            # Canvas renderer — all 14 element types
  elevenlabs.ts               # ElevenLabs REST TTS helpers
  voiceRecognition.ts         # Web Speech API wrapper

types/
  scene.ts                    # All TypeScript types for scene plans
```

### The boundary you must not cross

The following files contain core application logic. **Do not change them** unless you are specifically working on that subsystem — changes here can silently break the rendering pipeline:

- `lib/manimRenderer.ts` — canvas renderer
- `lib/gemini.ts` — Gemini prompt and JSON parsing
- `types/scene.ts` — scene plan type definitions
- `app/api/explain/route.ts` — Gemini API route

---

## What to Work On

Good first issues:

- **Browser speech synthesis fallback** — use `window.speechSynthesis` when ElevenLabs is unavailable
- **Mobile layout** — the left panel is hidden on small screens; a bottom sheet would work well
- **Scene persistence** — save conversation history to `localStorage`
- **Export** — let users copy the scene plan JSON or share a link
- **New element types** — add `histogram`, `pie_chart`, `3d_axes` to the renderer
- **Accessibility** — keyboard navigation, ARIA labels, reduced-motion support

Harder contributions:

- **Streaming scene plans** — stream Gemini's JSON response and start rendering before it's complete
- **Interactive canvas** — let users click on elements to get more detail
- **Custom voice** — let users clone their own voice via ElevenLabs

---

## Pull Request Guidelines

1. **One concern per PR.** Don't mix a bug fix with a refactor.
2. **Keep PRs small.** Under 400 lines of diff is ideal.
3. **Describe what you tested.** Screenshots or a short screen recording are very welcome.
4. **Don't break the type check.** Run `npx tsc --noEmit` before opening a PR.
5. **Match the existing style.** Inline styles for app UI components, Tailwind only for utility classes. DM Sans for body, Playfair Display for headings, DM Mono for labels.
6. **Don't add dependencies without discussion.** Open an issue first if you need a new package.

### PR title format

```
feat: add browser speech synthesis fallback
fix: resolve canvas scaling on retina displays
docs: add element type reference to README
refactor: extract matrix renderer into separate module
```

---

## Commit Style

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:     new feature
fix:      bug fix
docs:     documentation only
style:    formatting, no logic change
refactor: code restructure, no behavior change
perf:     performance improvement
chore:    build, deps, config
```

---

## Questions

Open a GitHub Discussion or file an issue. We're happy to help you get oriented.
