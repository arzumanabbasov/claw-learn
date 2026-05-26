'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw, Mic, MicOff, Radio, LogOut } from 'lucide-react';
import { ConversationProvider } from '@elevenlabs/react';
import { signOut } from 'next-auth/react';
import Image from 'next/image';
import { Scene } from '@/types/scene';
import { useTutor } from '@/hooks/useTutor';
import { useSpeechEngine } from '@/hooks/useSpeechEngine';
import { AnimationCanvas } from './AnimationCanvas';
import { ConversationPanel } from './ConversationPanel';
import { QuestionInput } from './QuestionInput';
import { NarrationSubtitle } from './NarrationSubtitle';

interface TutorAppProps {
  onBack: () => void;
}

interface UserInfo {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

// ── Quota badge ───────────────────────────────────────────────────────────────
function QuotaBadge({ remaining, limit }: { remaining: number; limit: number }) {
  const pct = remaining / limit;
  const color  = pct === 0 ? '#c0392b' : pct <= 0.34 ? '#e8a020' : '#3a8a42';
  const bg     = pct === 0 ? 'rgba(192,57,43,0.08)' : pct <= 0.34 ? 'rgba(232,160,32,0.1)' : 'rgba(58,138,66,0.08)';
  const border = pct === 0 ? 'rgba(192,57,43,0.25)' : pct <= 0.34 ? 'rgba(232,160,32,0.3)' : 'rgba(58,138,66,0.25)';
  return (
    <div
      title={`${remaining} of ${limit} questions remaining today`}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '3px 9px', borderRadius: 3,
        border: `1px solid ${border}`, background: bg,
        fontFamily: '"DM Mono", monospace', fontSize: 10,
        color, letterSpacing: '0.06em', userSelect: 'none',
      }}
    >
      <span style={{ fontWeight: 600 }}>{remaining}</span>
      <span style={{ opacity: 0.6 }}>/ {limit} today</span>
    </div>
  );
}

// ── Inner component ───────────────────────────────────────────────────────────
function TutorAppInner({ onBack }: TutorAppProps) {
  const [currentNarration, setCurrentNarration] = useState<string | null>(null);
  const [, setCurrentScene] = useState<Scene | null>(null);
  const [remaining, setRemaining] = useState<number>(3);
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then((r) => {
        if (r.status === 401) { window.location.href = '/login'; return null; }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        if (d.user) setUser(d.user);
        if (typeof d.remaining === 'number') setRemaining(d.remaining);
      })
      .catch(() => {});
  }, []);

  const tutor = useTutor({
    onStatusChange: (s) => { if (s === 'idle') setCurrentNarration(null); },
    onRateLimitUpdate: (r) => setRemaining(r),
  });

  const speechEngine = useSpeechEngine({
    onUserMessage: (text) => tutor.ask(text),
    onSpeakingChange: (speaking) => { if (speaking) tutor.setStatus('narrating'); },
  });

  const handleNarrate = useCallback(async (text: string): Promise<void> => {
    if (!text?.trim()) return;
    setCurrentNarration(text);
    tutor.setStatus('narrating');
    if (speechEngine.isConnected) { await speechEngine.sendNarration(text); return; }
    await tutor.narrateText(text);
  }, [tutor, speechEngine]);

  const handleSceneChange = useCallback((scene: Scene) => { setCurrentScene(scene); }, []);
  const handleAnimationComplete = useCallback(() => { tutor.setStatus('idle'); setCurrentNarration(null); }, [tutor]);
  const handleInterrupt = useCallback(() => { tutor.interrupt(); setCurrentNarration(null); }, [tutor]);

  const isNarrating = tutor.status === 'narrating';

  // Shared input props
  const inputProps = {
    onSubmit: tutor.ask,
    onToggleVoice: speechEngine.isConnected
      ? () => speechEngine.setMuted(!speechEngine.isMuted)
      : speechEngine.startSession,
    onInterrupt: handleInterrupt,
    status: tutor.status,
    isListening: speechEngine.isConnected && !speechEngine.isMuted && speechEngine.isListening,
    isVoiceSupported: true,
    interimText: undefined as undefined,
  };

  return (
    <div style={{
      height: '100dvh', // dvh handles mobile browser chrome correctly
      background: 'var(--cream)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: '"DM Sans", sans-serif',
    }}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', height: 48,
        borderBottom: '1px solid rgba(13,17,23,0.1)',
        background: 'var(--cream)',
        zIndex: 10,
      }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onBack} style={{ padding: 6, borderRadius: 4, border: 'none', background: 'transparent', color: 'var(--ink-faint)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={14} />
          </button>
          <div style={{ width: 1, height: 16, background: 'rgba(13,17,23,0.12)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 22, height: 22, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
              <img src="/logo.png" alt="Claw Learn" width={22} height={22} style={{ display: 'block', objectFit: 'cover' }} />
            </div>
            <span style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
              Claw Learn
            </span>
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Voice toggle — hide label on mobile to save space */}
          {speechEngine.isAvailable !== false && (
            <button
              onClick={speechEngine.isConnected ? speechEngine.endSession : speechEngine.startSession}
              title={speechEngine.isConnected ? 'Disconnect voice' : 'Connect voice'}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', borderRadius: 2,
                border: speechEngine.isConnected ? '1px solid rgba(107,203,119,0.4)' : '1px solid rgba(13,17,23,0.15)',
                background: speechEngine.isConnected ? 'rgba(107,203,119,0.1)' : 'transparent',
                color: speechEngine.isConnected ? '#3a8a42' : 'var(--ink-faint)',
                cursor: speechEngine.isAvailable === null ? 'default' : 'pointer',
                fontFamily: '"DM Mono", monospace', fontSize: 10,
                textTransform: 'uppercase' as const, letterSpacing: '0.06em',
                opacity: speechEngine.isAvailable === null ? 0.5 : 1,
              }}
            >
              {speechEngine.isConnected ? (
                <motion.div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3a8a42' }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
              ) : (
                <Radio size={10} />
              )}
              {/* Label hidden on small screens */}
              <span className="hidden sm:inline">
                {speechEngine.isConnected ? 'Voice on' : speechEngine.isAvailable === null ? 'Voice...' : 'Voice off'}
              </span>
            </button>
          )}

          {speechEngine.isConnected && (
            <button onClick={() => speechEngine.setMuted(!speechEngine.isMuted)} title={speechEngine.isMuted ? 'Unmute' : 'Mute'}
              style={{ padding: '4px 6px', borderRadius: 2, border: '1px solid rgba(13,17,23,0.15)', background: 'transparent', color: speechEngine.isMuted ? '#c0392b' : 'var(--ink-faint)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              {speechEngine.isMuted ? <MicOff size={12} /> : <Mic size={12} />}
            </button>
          )}

          {tutor.status !== 'idle' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--accent-light)', border: '1px solid rgba(232,160,32,0.3)', borderRadius: 2, padding: '3px 7px' }}>
              <motion.div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
              <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--accent)' }}>
                {tutor.status}
              </span>
            </div>
          )}

          <QuotaBadge remaining={remaining} limit={3} />

          <button onClick={() => { tutor.reset(); setCurrentNarration(null); }} title="Reset"
            style={{ padding: 6, borderRadius: 4, border: 'none', background: 'transparent', color: 'var(--ink-faint)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <RotateCcw size={13} />
          </button>

          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {user.image ? (
                <Image src={user.image} alt={user.name ?? 'User'} width={26} height={26} style={{ borderRadius: '50%', border: '1px solid rgba(13,17,23,0.12)' }} />
              ) : (
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"DM Sans", sans-serif', fontSize: 11, fontWeight: 600, color: 'var(--cream)' }}>
                  {(user.name ?? user.email ?? '?')[0].toUpperCase()}
                </div>
              )}
              <button onClick={() => signOut({ callbackUrl: '/login' })} title="Sign out"
                style={{ padding: 4, borderRadius: 4, border: 'none', background: 'transparent', color: 'var(--ink-faint)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#c0392b'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-faint)'; }}>
                <LogOut size={12} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      {/*
        ONE AnimationCanvas instance. Layout switches between:
        - Desktop (md+): side-by-side — conversation left, canvas right
        - Mobile (<md):  stacked — canvas top 55%, chat bottom 45%
        The canvas wrapper is always rendered; only its surrounding chrome changes.
      */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Conversation panel — left on desktop, hidden on mobile ──────── */}
        <div
          className="hidden md:flex"
          style={{ width: 320, flexShrink: 0, flexDirection: 'column', borderRight: '1px solid rgba(13,17,23,0.1)', background: 'var(--cream)' }}
        >
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            <ConversationPanel messages={tutor.messages} status={tutor.status} currentNarration={currentNarration || undefined} error={tutor.error} />
          </div>
          <div style={{ flexShrink: 0, borderTop: '1px solid rgba(13,17,23,0.1)', padding: 12, background: 'var(--cream)' }}>
            <QuestionInput {...inputProps} />
          </div>
        </div>

        {/* ── Right side: canvas + (on mobile) chat below ─────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

          {/* Canvas section — 55% on mobile, fills all on desktop */}
          <div
            className="canvas-section"
            style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--cream-warm)', borderBottom: '1px solid rgba(13,17,23,0.1)' }}
          >
            {/* Title bar */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 40, borderBottom: '1px solid rgba(13,17,23,0.1)', background: 'var(--cream)' }}>
              <span style={{ fontFamily: '"Playfair Display", serif', fontWeight: 500, fontSize: 14, color: 'var(--ink-muted)' }}>
                {tutor.currentPlan?.title ?? 'Blackboard'}
              </span>
              {isNarrating && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <motion.div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
                  <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.06em' }}>
                    {speechEngine.isConnected ? 'Speech Engine' : 'Narrating'}
                  </span>
                </div>
              )}
            </div>

            {/* THE single canvas instance */}
            <div style={{ flex: 1, minHeight: 0, padding: 12, paddingBottom: 0 }}>
              <AnimationCanvas
                plan={tutor.currentPlan}
                isActive={tutor.status === 'rendering' || tutor.status === 'narrating'}
                onNarrate={handleNarrate}
                onComplete={handleAnimationComplete}
                onSceneChange={handleSceneChange}
              />
            </div>

            <NarrationSubtitle text={currentNarration} isVisible={!!currentNarration} />
          </div>

          {/* Chat section — only visible on mobile, below the canvas */}
          <div
            className="md:hidden"
            style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--cream)', borderTop: '1px solid rgba(13,17,23,0.1)' }}
          >
            <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <ConversationPanel messages={tutor.messages} status={tutor.status} currentNarration={currentNarration || undefined} error={tutor.error} />
            </div>
            <div style={{ flexShrink: 0, borderTop: '1px solid rgba(13,17,23,0.1)', padding: '10px 12px', background: 'var(--cream)', paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
              <QuestionInput {...inputProps} />
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

export function TutorApp({ onBack }: TutorAppProps) {
  return (
    <ConversationProvider>
      <TutorAppInner onBack={onBack} />
    </ConversationProvider>
  );
}
