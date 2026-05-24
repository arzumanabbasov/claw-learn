'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, TutorStatus } from '@/types/scene';
import { AlertCircle } from 'lucide-react';

interface ConversationPanelProps {
  messages: Message[];
  status: TutorStatus;
  currentNarration?: string;
  error?: string | null;
}

function ThinkingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0' }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'var(--accent)',
            opacity: 0.5,
          }}
          animate={{ y: [0, -4, 0], opacity: [0.35, 0.9, 0.35] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}
    >
      <div
        style={{
          minWidth: 0,
          maxWidth: '84%',
          borderRadius: isUser ? '8px 2px 8px 8px' : '2px 8px 8px 8px',
          padding: '8px 12px',
          fontSize: 13,
          lineHeight: 1.65,
          wordBreak: 'break-word',
          fontFamily: '"DM Sans", sans-serif',
          ...(isUser
            ? {
                background: 'var(--indigo-light)',
                border: '1px solid rgba(30,42,94,0.12)',
                color: 'var(--indigo)',
              }
            : {
                background: 'transparent',
                color: 'var(--ink-muted)',
              }),
        }}
      >
        {message.content}
      </div>
    </motion.div>
  );
}

export function ConversationPanel({
  messages,
  status,
  currentNarration,
  error,
}: ConversationPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentNarration]);

  const isThinking = status === 'thinking';
  const isNarrating = status === 'narrating';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          padding: '10px 16px',
          borderBottom: '1px solid rgba(13,17,23,0.08)',
        }}
      >
        <span
          style={{
            fontFamily: '"DM Mono", monospace',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--ink-faint)',
          }}
        >
          Conversation
        </span>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          minHeight: 0,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(13,17,23,0.12) transparent',
        }}
      >
        <AnimatePresence initial={false}>
          {/* Empty state */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                padding: '32px 0',
              }}
            >
              <p
                style={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: 12,
                  color: 'var(--ink-faint)',
                  textAlign: 'center',
                  lineHeight: 1.6,
                }}
              >
                Ask a math or physics question
                <br />
                to start learning visually
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                {[
                  'Why does the derivative represent slope?',
                  'What is a Fourier transform?',
                  'How does matrix multiplication work?',
                  'Explain integration visually',
                ].map((q) => (
                  <span
                    key={q}
                    style={{
                      fontFamily: '"DM Sans", sans-serif',
                      fontSize: 12,
                      color: 'var(--ink-muted)',
                      background: 'var(--cream-warm)',
                      border: '1px solid rgba(13,17,23,0.08)',
                      borderRadius: 4,
                      padding: '6px 12px',
                      lineHeight: 1.4,
                    }}
                  >
                    {q}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Thinking */}
          {isThinking && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                background: 'var(--cream-warm)',
                border: '1px solid rgba(13,17,23,0.08)',
                borderRadius: '2px 8px 8px 8px',
                padding: '8px 12px',
                alignSelf: 'flex-start',
              }}
            >
              <ThinkingDots />
            </motion.div>
          )}

          {/* Narration */}
          {isNarrating && currentNarration && (
            <motion.div
              key="narration"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                background: 'var(--accent-light)',
                border: '1px solid rgba(232,160,32,0.25)',
                borderRadius: 4,
                padding: '10px 12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <motion.div
                  style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span
                  style={{
                    fontFamily: '"DM Mono", monospace',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--accent)',
                  }}
                >
                  Explaining
                </span>
              </div>
              <p
                style={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: 12,
                  color: 'var(--ink-muted)',
                  lineHeight: 1.6,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {currentNarration}
              </p>
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'rgba(220,38,38,0.06)',
                border: '1px solid rgba(220,38,38,0.2)',
                borderRadius: 4,
                padding: '8px 12px',
                display: 'flex',
                gap: 8,
              }}
            >
              <AlertCircle size={12} color="#c0392b" style={{ marginTop: 2, flexShrink: 0 }} />
              <p
                style={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: 12,
                  color: '#c0392b',
                  lineHeight: 1.6,
                }}
              >
                {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
