'use client';

import { useEffect, useRef } from 'react';

interface LandingPageProps {
  onStart: () => void;
}

/* ─── Hero Canvas Animation ─────────────────────────────────────────────── */
function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let startTime: number | null = null;
    const LOOP_DURATION = 9000; // ms
    const PAUSE = 1000;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    resize();
    window.addEventListener('resize', resize);

    function easeInOut(t: number) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    function lerp(a: number, b: number, t: number) {
      return a + (b - a) * t;
    }

    function draw(timestamp: number) {
      if (!canvas || !ctx) return;
      if (!startTime) startTime = timestamp;

      const elapsed = (timestamp - startTime) % (LOOP_DURATION + PAUSE);
      const t = Math.min(elapsed / LOOP_DURATION, 1);

      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;

      ctx.clearRect(0, 0, W, H);

      // Coordinate system: origin at center, scale 52px/unit
      const SCALE = Math.min(W, H) / 9;
      const OX = W / 2;
      const OY = H / 2;

      function toScreen(x: number, y: number): [number, number] {
        return [OX + x * SCALE, OY - y * SCALE];
      }

      // ── Axes ──────────────────────────────────────────────────────────
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, OY); ctx.lineTo(W, OY);
      ctx.moveTo(OX, 0); ctx.lineTo(OX, H);
      ctx.stroke();

      // Tick labels
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.font = '10px "DM Mono", monospace';
      ctx.textAlign = 'center';
      for (let i = -4; i <= 4; i++) {
        if (i === 0) continue;
        const [sx] = toScreen(i, 0);
        const [, sy] = toScreen(0, i);
        ctx.fillText(String(i), sx, OY + 14);
        ctx.textAlign = 'right';
        ctx.fillText(String(i), OX - 6, sy + 3);
        ctx.textAlign = 'center';
      }

      // ── Phase 1: Draw parabola (t: 0 → 0.25) ─────────────────────────
      const phase1End = 0.25;
      const p1 = Math.min(t / phase1End, 1);
      const xStart = -4;
      const xEnd = 4;
      const xCurrent = lerp(xStart, xEnd, easeInOut(p1));

      if (p1 > 0) {
        ctx.strokeStyle = '#4f9cf9';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        let first = true;
        for (let x = xStart; x <= xCurrent; x += 0.05) {
          const [sx, sy] = toScreen(x, x * x);
          if (first) { ctx.moveTo(sx, sy); first = false; }
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }

      // Formula label appears after parabola drawn
      if (p1 > 0.85) {
        const alpha = easeInOut((p1 - 0.85) / 0.15);
        const [lx, ly] = toScreen(2.2, 5.2);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#1e2a5e';
        const labelW = 80;
        const labelH = 22;
        ctx.beginPath();
        ctx.roundRect(lx - 4, ly - 14, labelW, labelH, 4);
        ctx.fill();
        ctx.fillStyle = '#f5f3ee';
        ctx.font = '11px "DM Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('f(x) = x²', lx + 2, ly);
        ctx.restore();
      }

      // ── Phase 2: Tangent line at x=2 (t: 0.2 → 0.55) ────────────────
      const phase2Start = 0.20;
      const phase2End = 0.55;
      const p2Raw = (t - phase2Start) / (phase2End - phase2Start);
      const p2 = Math.max(0, Math.min(p2Raw, 1));

      if (p2 > 0) {
        // Tangent at x=2: f(2)=4, f'(2)=4, so y = 4(x-2)+4 = 4x-4
        const tx0 = 2;
        const ty0 = 4;
        const slope = 4;
        const extend = easeInOut(p2) * 2.5;

        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const [sx0, sy0] = toScreen(tx0 - extend, slope * (tx0 - extend - tx0) + ty0);
        const [sx1, sy1] = toScreen(tx0 + extend, slope * (tx0 + extend - tx0) + ty0);
        ctx.moveTo(sx0, sy0);
        ctx.lineTo(sx1, sy1);
        ctx.stroke();

        // Point marker at (2, 4)
        const [px, py] = toScreen(tx0, ty0);
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Phase 3: Labels fade in (t: 0.45 → 0.75) ─────────────────────
      const phase3Start = 0.45;
      const phase3End = 0.75;
      const p3Raw = (t - phase3Start) / (phase3End - phase3Start);
      const p3 = Math.max(0, Math.min(p3Raw, 1));

      if (p3 > 0) {
        const alpha = easeInOut(p3);
        ctx.save();
        ctx.globalAlpha = alpha;

        // f'(2) = 4 label
        const [lx1, ly1] = toScreen(2.8, 3.2);
        ctx.fillStyle = '#ff6b6b';
        const lw1 = 72;
        ctx.beginPath();
        ctx.roundRect(lx1 - 4, ly1 - 14, lw1, 22, 4);
        ctx.fillStyle = 'rgba(255,107,107,0.15)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,107,107,0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#ff6b6b';
        ctx.font = '11px "DM Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText("f'(2) = 4", lx1 + 2, ly1);

        // slope = 4 label
        const [lx2, ly2] = toScreen(-3.5, 6.5);
        ctx.fillStyle = 'rgba(255,107,107,0.12)';
        ctx.beginPath();
        ctx.roundRect(lx2 - 4, ly2 - 14, 76, 22, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,107,107,0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#ff6b6b';
        ctx.fillText('slope = 4', lx2 + 2, ly2);

        ctx.restore();
      }

      animFrame = requestAnimationFrame(draw);
    }

    animFrame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}

/* ─── Navigation ─────────────────────────────────────────────────────────── */
function Nav({ onStart }: { onStart: () => void }) {
  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 64,
        background: 'var(--cream)',
        borderBottom: '1px solid rgba(13,17,23,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 48px',
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            background: 'var(--cream)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <img src="/logo.png" alt="Claw Learn" width={32} height={32} style={{ display: 'block', objectFit: 'cover' }} />
        </div>
        <span
          style={{
            fontFamily: '"Playfair Display", serif',
            fontWeight: 700,
            fontSize: 18,
            color: 'var(--ink)',
          }}
        >
          Claw Learn
        </span>
      </div>

      {/* Center nav */}
      <div
        style={{
          display: 'flex',
          gap: 32,
          fontFamily: '"DM Sans", sans-serif',
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
        }}
      >
        <a href="#topics" style={{ color: 'inherit', textDecoration: 'none' }}>Topics</a>
        <a href="#features" style={{ color: 'inherit', textDecoration: 'none' }}>Examples</a>
      </div>

      {/* CTA */}
      <button
        onClick={onStart}
        style={{
          background: 'var(--indigo)',
          color: 'var(--cream)',
          fontFamily: '"DM Sans", sans-serif',
          fontSize: 13,
          fontWeight: 500,
          padding: '10px 20px',
          borderRadius: 4,
          border: 'none',
          cursor: 'pointer',
          letterSpacing: '0.02em',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--indigo-mid)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--indigo)';
        }}
      >
        Start Learning
      </button>
    </nav>
  );
}

/* ─── Hero Section ───────────────────────────────────────────────────────── */
function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section
      className="bg-grid"
      style={{
        minHeight: '100vh',
        background: 'var(--cream)',
        paddingTop: 64,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '80px 48px 0',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Headline */}
        <h1
          className="hero-headline"
          style={{
            fontFamily: '"Playfair Display", serif',
            fontWeight: 900,
            fontSize: 'clamp(56px, 7vw, 96px)',
            lineHeight: 1.0,
            color: 'var(--ink)',
            marginBottom: 28,
            maxWidth: 800,
          }}
        >
          Mathematics,{' '}
          <em
            style={{
              fontStyle: 'italic',
              color: 'var(--indigo-mid)',
            }}
          >
            made
          </em>{' '}
          <span style={{ position: 'relative', display: 'inline-block' }}>
            visible.
            <span
              style={{
                position: 'absolute',
                bottom: 4,
                left: 0,
                right: 0,
                height: 6,
                background: 'var(--accent)',
                opacity: 0.4,
                zIndex: -1,
                borderRadius: 2,
              }}
            />
          </span>
        </h1>

        {/* Subheadline */}
        <p
          className="hero-sub"
          style={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: 17,
            fontWeight: 400,
            color: 'var(--ink-muted)',
            maxWidth: 540,
            lineHeight: 1.6,
            marginBottom: 36,
          }}
        >
          Ask any math or physics question. Watch it come alive — animated graphs,
          vectors, integrals, and matrices, narrated in real time.
        </p>

        {/* CTA Row */}
        <div
          className="hero-cta"
          style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 56 }}
        >
          <button
            onClick={onStart}
            style={{
              background: 'var(--indigo)',
              color: 'var(--cream)',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: 14,
              fontWeight: 500,
              padding: '14px 28px',
              borderRadius: 4,
              border: '1px solid var(--indigo)',
              cursor: 'pointer',
              letterSpacing: '0.01em',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = 'transparent';
              b.style.color = 'var(--indigo)';
            }}
            onMouseLeave={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = 'var(--indigo)';
              b.style.color = 'var(--cream)';
            }}
          >
            Start Learning →
          </button>
          <button
            onClick={onStart}
            style={{
              background: 'none',
              border: 'none',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: 14,
              color: 'var(--ink-muted)',
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
              padding: 0,
            }}
          >
            ▶ Watch a demo
          </button>
        </div>

        {/* Canvas Preview */}
        <div
          className="hero-canvas"
          style={{
            background: '#0d1117',
            borderRadius: '8px 8px 0 0',
            overflow: 'hidden',
            flex: 1,
            minHeight: 320,
            position: 'relative',
          }}
        >
          {/* Mac chrome */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57', display: 'block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e', display: 'block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840', display: 'block' }} />
            <span
              style={{
                marginLeft: 12,
                fontFamily: '"DM Mono", monospace',
                fontSize: 11,
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '0.04em',
              }}
            >
              Understanding Derivatives — Scene 2 / 8
            </span>
          </div>

          {/* Canvas */}
          <div style={{ height: 'calc(100% - 37px)', minHeight: 280, position: 'relative' }}>
            <HeroCanvas />
            {/* Bottom label */}
            <div
              style={{
                position: 'absolute',
                bottom: 12,
                left: 16,
                fontFamily: '"DM Mono", monospace',
                fontSize: 11,
                color: 'rgba(255,255,255,0.25)',
                letterSpacing: '0.04em',
              }}
            >
              f(x) = x² · tangent at x = 2
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Stats Bar ──────────────────────────────────────────────────────────── */
function StatsBar() {
  const stats = [
    { number: '14+', label: 'Visual element types' },
    { number: '∞', label: 'Questions you can ask' },
    { number: '~3s', label: 'Time to first animation' },
    { number: '0', label: 'Slides. Textbooks. Confusion.' },
  ];

  return (
    <div
      style={{
        background: 'var(--indigo)',
        padding: '20px 0',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          width: '100%',
          padding: '0 48px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
        }}
      >
        {stats.map((s, i) => (
          <div
            key={s.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '0 24px',
              borderRight: i < 3 ? '1px solid rgba(255,255,255,0.1)' : 'none',
            }}
          >
            <span
              style={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 700,
                fontSize: 28,
                color: 'var(--cream)',
                lineHeight: 1,
              }}
            >
              {s.number}
            </span>
            <span
              style={{
                fontFamily: '"DM Mono", monospace',
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'rgba(245,243,238,0.5)',
                textAlign: 'center',
              }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Topics Grid ────────────────────────────────────────────────────────── */
function Topics({ onStart }: { onStart: () => void }) {
  const topics = [
    { name: 'Derivatives & Calculus', example: 'Why does the derivative represent slope?' },
    { name: 'Integration', example: 'What is integration and why does it find area?' },
    { name: 'Linear Algebra', example: 'How does matrix multiplication work?' },
    { name: 'Fourier Transforms', example: 'Explain the Fourier transform visually' },
    { name: "Euler's Formula", example: "Show me e^(iπ) + 1 = 0" },
    { name: 'Vectors & Geometry', example: 'Show me how vectors add together' },
    { name: 'Taylor Series', example: 'What is a Taylor series?' },
    { name: 'Gravity & Orbits', example: 'How does gravity create orbits?' },
    { name: 'Trigonometry', example: 'Why is sin²θ + cos²θ = 1?' },
  ];

  return (
    <section id="topics" style={{ padding: '100px 0', background: 'var(--cream)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>
        {/* Section header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            borderBottom: '1px solid rgba(13,17,23,0.12)',
            paddingBottom: 24,
            marginBottom: 40,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: '"DM Mono", monospace',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--ink-faint)',
                marginBottom: 8,
              }}
            >
              03 — Topics
            </div>
            <h2
              style={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 700,
                fontSize: 36,
                color: 'var(--ink)',
                lineHeight: 1.15,
              }}
            >
              What can you explore?
            </h2>
          </div>
        </div>

        {/* Topic chips */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
            background: 'rgba(13,17,23,0.08)',
          }}
        >
          {topics.map((topic) => (
            <button
              key={topic.name}
              onClick={onStart}
              style={{
                background: 'var(--cream)',
                border: 'none',
                padding: '20px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--indigo-light)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--cream)';
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: '"DM Sans", sans-serif',
                    fontWeight: 500,
                    fontSize: 14,
                    color: 'var(--ink)',
                    marginBottom: 4,
                  }}
                >
                  {topic.name}
                </div>
                <div
                  style={{
                    fontFamily: '"DM Sans", sans-serif',
                    fontStyle: 'italic',
                    fontSize: 12,
                    color: 'var(--ink-faint)',
                  }}
                >
                  &ldquo;{topic.example}&rdquo;
                </div>
              </div>
              <span
                style={{
                  color: 'var(--ink)',
                  opacity: 0.3,
                  fontSize: 16,
                  marginLeft: 16,
                  flexShrink: 0,
                  transition: 'transform 0.15s, opacity 0.15s',
                }}
              >
                →
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA Section ────────────────────────────────────────────────────────── */
function CTASection({ onStart }: { onStart: () => void }) {
  return (
    <section
      className="bg-grid-white"
      style={{
        background: 'var(--indigo)',
        padding: '100px 0',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 48px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 48,
        }}
      >
        <h2
          style={{
            fontFamily: '"Playfair Display", serif',
            fontWeight: 900,
            fontSize: 'clamp(36px, 4vw, 56px)',
            color: 'var(--cream)',
            lineHeight: 1.1,
            maxWidth: 560,
          }}
        >
          Stop reading about math.{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>
            Start seeing it.
          </em>
        </h2>
        <button
          onClick={onStart}
          style={{
            background: 'var(--accent)',
            color: 'var(--ink)',
            fontFamily: '"DM Sans", sans-serif',
            fontSize: 16,
            fontWeight: 500,
            padding: '16px 32px',
            borderRadius: 4,
            border: '1px solid var(--accent)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = 'transparent';
            b.style.color = 'var(--accent)';
          }}
          onMouseLeave={e => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = 'var(--accent)';
            b.style.color = 'var(--ink)';
          }}
        >
          Start Learning Free →
        </button>
      </div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer
      style={{
        background: 'var(--ink)',
        padding: '40px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 24,
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          fontFamily: '"Playfair Display", serif',
          fontWeight: 700,
          fontSize: 16,
          color: 'var(--cream)',
        }}
      >
        Claw Learn
      </span>
      <div style={{ display: 'flex', gap: 24 }}>
        {['GitHub', 'Docs', 'License'].map((link) => (
          <a
            key={link}
            href="#"
            style={{
              fontFamily: '"DM Mono", monospace',
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'rgba(245,243,238,0.4)',
              textDecoration: 'none',
            }}
          >
            {link}
          </a>
        ))}
      </div>
      <span
        style={{
          fontFamily: '"DM Sans", sans-serif',
          fontSize: 12,
          color: 'rgba(245,243,238,0.4)',
        }}
      >
        Inspired by 3Blue1Brown · Built with ElevenLabs
      </span>
    </footer>
  );
}

/* ─── Main Export ────────────────────────────────────────────────────────── */
export function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div style={{ fontFamily: '"DM Sans", sans-serif' }}>
      <Nav onStart={onStart} />
      <Hero onStart={onStart} />
      <StatsBar />
      <Topics onStart={onStart} />
      <CTASection onStart={onStart} />
      <Footer />
    </div>
  );
}
