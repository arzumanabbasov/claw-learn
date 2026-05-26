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
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: 3,
        border: `1px solid ${border}`,
        background: bg,
        fontFamily: '"DM Mono", monospace',
        fontSize: 10,
        color,
        letterSpacing: '0.06em',
        userSelect: 'none',
      }}
    >
      <span style={{ fontWeight: 600 }}>{remaining}</span>
      <span style={{ opacity: 0.6 }}>/ {limit} today</span>
    </div>
  );
}

// ── Inner component (must be inside ConversationProvider) ─────────────────────
function TutorAppInner({ onBack }: TutorAppProps) {
  const [currentNarration, setCurrentNarration] = useState<string | null>(null);
  const [, setCurrentScene] = useState<Scene | null>(null);
  const [remaining, setRemaining] = useState<number>(3);
  const [user, setUser] = useState<UserInfo | null>(null);

  // Fetch session info + remaining quota on mount
  useEffect(() => {
    fetch('/api/me')
      .then((r) => {
        if (r.status === 401) {
          // Not logged in — redirect to login page
          window.location.href = '/login';
          return null;
        }
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
    onStatusChange: (s) => {
      if (s === 'idle') setCurrentNarration(null);
    },
    onRateLimitUpdate: (r) => setRemaining(r),
  });

  const speechEngine = useSpeechEngine({
    onUserMessage: (text) => tutor.ask(text),
    onSpeakingChange: (speaking) => {
      if (speaking) tutor.setStatus('narrating');
    },
  });

  const handleNarrate = useCallback(
    async (text: string): Promise<void> => {
      if (!text?.trim()) return;
      setCurrentNarration(text);
      tutor.setStatus('narrating');
      if (speechEngine.isConnected) {
        await speechEngine.sendNarration(text);
        return;
      }
      await tutor.narrateText(text);
    },
    [tutor, speechEngine]
  );

  const handleSceneChange = useCallback((scene: Scene) => {
    setCurrentScene(scene);
  }, []);

  const handleAnimationComplete = useCallback(() => {
    tutor.setStatus('idle');
    setCurrentNarration(null);
  }, [tutor]);

  const handleInterrupt = useCallback(() => {
    tutor.interrupt();
    setCurrentNarration(null);
  }, [tutor]);

  const isNarrating = tutor.status === 'narrating';

  return (
    <div
      style={{
        height: '100vh',
        background: 'var(--cream)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          height: 48,
          borderBottom: '1px solid rgba(13,17,23,0.1)',
          background: 'var(--cream)',
        }}
      >
        {/* Left: back + logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onBack}
            style={{
              padding: '6px',
              borderRadius: 4,
              border: 'none',
              background: 'transparent',
              color: 'var(--ink-faint)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-faint)'; }}
          >
            <ArrowLeft size={14} />
          </button>

          <div style={{ width: 1, height: 16, background: 'rgba(13,17,23,0.12)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
              <img src="/logo.png" alt="Claw Learn" width={22} height={22} style={{ display: 'block', objectFit: 'cover' }} />
            </div>
            <span style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
              Claw Learn
            </span>
          </div>
        </div>

        {/* Right: controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* Speech Engine toggle */}
          {speechEngine.isAvailable !== false && (
            <button
              onClick={speechEngine.isConnected ? speechEngine.endSession : speechEngine.startSession}
              title={speechEngine.isConnected ? 'Disconnect voice' : 'Connect voice'}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 2,
                border: speechEngine.isConnected ? '1px solid rgba(107,203,119,0.4)' : '1px solid rgba(13,17,23,0.15)',
                background: speechEngine.isConnected ? 'rgba(107,203,119,0.1)' : 'transparent',
                color: speechEngine.isConnected ? '#3a8a42' : 'var(--ink-faint)',
                cursor: speechEngine.isAvailable === null ? 'default' : 'pointer',
                fontFamily: '"DM Mono", monospace', fontSize: 10,
                textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                transition: 'all 0.15s', opacity: speechEngine.isAvailable === null ? 0.5 : 1,
              }}
            >
              {speechEngine.isConnected ? (
                <>
                  <motion.div
                    style={{ width: 5, height: 5, borderRadius: '50%', background: '#3a8a42', flexShrink: 0 }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                  Voice on
                </>
              ) : (
                <><Radio size={10} />{speechEngine.isAvailable === null ? 'Voice...' : 'Voice off'}</>
              )}
            </button>
          )}

          {/* Mute toggle */}
          {speechEngine.isConnected && (
            <button
              onClick={() => speechEngine.setMuted(!speechEngine.isMuted)}
              title={speechEngine.isMuted ? 'Unmute mic' : 'Mute mic'}
              style={{
                padding: '4px 8px', borderRadius: 2,
                border: '1px solid rgba(13,17,23,0.15)', background: 'transparent',
                color: speechEngine.isMuted ? '#c0392b' : 'var(--ink-faint)',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
              }}
            >
              {speechEngine.isMuted ? <MicOff size={12} /> : <Mic size={12} />}
            </button>
          )}

          {/* Status badge */}
          {tutor.status !== 'idle' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'var(--accent-light)', border: '1px solid rgba(232,160,32,0.3)',
              borderRadius: 2, padding: '3px 8px',
            }}>
              <motion.div
                style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--accent)' }}>
                {tutor.status}
              </span>
            </div>
          )}

          {/* Quota badge */}
          <QuotaBadge remaining={remaining} limit={3} />

          {/* Reset */}
          <button
            onClick={() => { tutor.reset(); setCurrentNarration(null); }}
            title="Reset"
            style={{
              padding: '6px', borderRadius: 4, border: 'none', background: 'transparent',
              color: 'var(--ink-faint)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-faint)'; }}
          >
            <RotateCcw size={13} />
          </button>

          {/* User avatar + sign out */}
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? 'User'}
                  width={26}
                  height={26}
                  style={{ borderRadius: '50%', border: '1px solid rgba(13,17,23,0.12)' }}
                />
              ) : (
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'var(--indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: '"DM Sans", sans-serif', fontSize: 11, fontWeight: 600, color: 'var(--cream)',
                }}>
                  {(user.name ?? user.email ?? '?')[0].toUpperCase()}
                </div>
              )}
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                title="Sign out"
                style={{
                  padding: '4px', borderRadius: 4, border: 'none', background: 'transparent',
                  color: 'var(--ink-faint)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#c0392b'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-faint)'; }}
              >
                <LogOut size={12} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* LEFT PANEL: conversation */}
        <div
          className="hidden md:flex"
          style={{
            width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column',
            borderRight: '1px solid rgba(13,17,23,0.1)', background: 'var(--cream)',
          }}
        >
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            <ConversationPanel
              messages={tutor.messages}
              status={tutor.status}
              currentNarration={currentNarration || undefined}
              error={tutor.error}
            />
          </div>
          <div style={{ flexShrink: 0, borderTop: '1px solid rgba(13,17,23,0.1)', padding: 12, background: 'var(--cream)' }}>
            <QuestionInput
              onSubmit={tutor.ask}
              onToggleVoice={speechEngine.isConnected ? () => speechEngine.setMuted(!speechEngine.isMuted) : speechEngine.startSession}
              onInterrupt={handleInterrupt}
              status={tutor.status}
              isListening={speechEngine.isConnected && !speechEngine.isMuted && speechEngine.isListening}
              isVoiceSupported={true}
              interimText={undefined}
            />
          </div>
        </div>

        {/* RIGHT PANEL: canvas */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', background: 'var(--cream-warm)' }}>
          {/* Canvas top bar */}
          <div style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 16px', height: 40, borderBottom: '1px solid rgba(13,17,23,0.1)', background: 'var(--cream)',
          }}>
            <span style={{ fontFamily: '"Playfair Display", serif', fontWeight: 500, fontSize: 14, color: 'var(--ink-muted)' }}>
              {tutor.currentPlan?.title ?? 'Blackboard'}
            </span>
            {isNarrating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <motion.div
                  style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }}
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
                <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.06em' }}>
                  {speechEngine.isConnected ? 'Speech Engine' : 'Narrating'}
                </span>
              </div>
            )}
          </div>

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

          {/* Mobile input */}
          <div className="md:hidden" style={{ padding: 12, borderTop: '1px solid rgba(13,17,23,0.1)', background: 'var(--cream)' }}>
            <QuestionInput
              onSubmit={tutor.ask}
              onToggleVoice={speechEngine.isConnected ? () => speechEngine.setMuted(!speechEngine.isMuted) : speechEngine.startSession}
              onInterrupt={handleInterrupt}
              status={tutor.status}
              isListening={speechEngine.isConnected && !speechEngine.isMuted && speechEngine.isListening}
              isVoiceSupported={true}
              interimText={undefined}
            />
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
