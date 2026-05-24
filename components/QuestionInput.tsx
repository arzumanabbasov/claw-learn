'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Loader2, Square } from 'lucide-react';
import { TutorStatus } from '@/types/scene';

interface QuestionInputProps {
  onSubmit: (question: string) => void;
  onToggleVoice: () => void;
  onInterrupt: () => void;
  status: TutorStatus;
  isListening: boolean;
  isVoiceSupported: boolean;
  interimText?: string;
  disabled?: boolean;
}

const EXAMPLE_QUESTIONS = [
  'Why does the derivative represent slope?',
  'What is a Fourier transform?',
  'How does matrix multiplication work?',
  'Explain integration visually',
  "What is Euler's formula?",
  'Explain the chain rule visually',
];

export function QuestionInput({
  onSubmit,
  onToggleVoice,
  onInterrupt,
  status,
  isListening,
  isVoiceSupported,
  interimText,
  disabled,
}: QuestionInputProps) {
  const [value, setValue] = useState('');
  const [showExamples, setShowExamples] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isProcessing = status === 'thinking' || status === 'rendering';
  const canInterrupt = status === 'narrating' || status === 'rendering' || status === 'thinking';

  const handleSubmit = () => {
    const q = value.trim() || interimText?.trim();
    if (!q || isProcessing) return;
    onSubmit(q);
    setValue('');
    setShowExamples(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') setShowExamples(false);
  };

  const handleExampleClick = (q: string) => {
    onSubmit(q);
    setShowExamples(false);
    setValue('');
  };

  // Voice button color — green when listening, red when interruptible, amber otherwise
  const voiceColor = isListening ? '#3a8a42' : canInterrupt ? '#c0392b' : 'var(--accent)';
  const voiceBg   = isListening ? 'rgba(58,138,66,0.1)' : canInterrupt ? 'rgba(192,57,43,0.08)' : 'var(--accent-light)';
  const voiceBorder = isListening ? 'rgba(58,138,66,0.3)' : canInterrupt ? 'rgba(192,57,43,0.25)' : 'rgba(232,160,32,0.3)';

  return (
    <div style={{ position: 'relative' }}>
      {/* Example questions dropdown */}
      <AnimatePresence>
        {showExamples && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              bottom: '100%',
              marginBottom: 8,
              left: 0,
              right: 0,
              background: 'var(--cream)',
              border: '1px solid rgba(13,17,23,0.12)',
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(13,17,23,0.1)',
              zIndex: 50,
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid rgba(13,17,23,0.08)',
              }}
            >
              <span
                style={{
                  fontFamily: '"DM Mono", monospace',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--ink-faint)',
                }}
              >
                Try asking
              </span>
            </div>
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleExampleClick(q)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '9px 12px',
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: 12,
                  color: 'var(--ink-muted)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid rgba(13,17,23,0.05)',
                  cursor: 'pointer',
                  transition: 'background 0.1s, color 0.1s',
                }}
                onMouseEnter={e => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = 'var(--cream-warm)';
                  b.style.color = 'var(--ink)';
                }}
                onMouseLeave={e => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = 'transparent';
                  b.style.color = 'var(--ink-muted)';
                }}
              >
                {q}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderRadius: 4,
          border: isListening
            ? '1px solid rgba(58,138,66,0.35)'
            : '1px solid rgba(13,17,23,0.15)',
          background: isListening
            ? 'rgba(58,138,66,0.04)'
            : 'var(--cream)',
          padding: '8px 10px',
          transition: 'border-color 0.2s, background 0.2s',
          boxShadow: '0 1px 3px rgba(13,17,23,0.06)',
        }}
      >
        {/* Examples trigger */}
        <button
          onClick={() => setShowExamples(!showExamples)}
          title="Example questions"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--ink-faint)',
            cursor: 'pointer',
            fontSize: 14,
            lineHeight: 1,
            flexShrink: 0,
            padding: 0,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-muted)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-faint)'; }}
        >
          ✦
        </button>

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={isListening ? (interimText || '') : value}
          onChange={(e) => !isListening && setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowExamples(false)}
          placeholder={
            isListening   ? 'Listening...'  :
            isProcessing  ? 'Processing...' :
            'Ask any math or physics question...'
          }
          disabled={disabled || isListening}
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontFamily: '"DM Sans", sans-serif',
            fontSize: 13,
            color: 'var(--ink)',
            cursor: disabled || isListening ? 'not-allowed' : 'text',
          }}
        />

        {/* Voice button */}
        {isVoiceSupported && (
          <motion.button
            onClick={canInterrupt ? onInterrupt : onToggleVoice}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            title={canInterrupt ? 'Stop' : isListening ? 'Stop listening' : 'Voice input'}
            style={{
              flexShrink: 0,
              width: 28,
              height: 28,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: voiceBg,
              border: `1px solid ${voiceBorder}`,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {canInterrupt && !isListening ? (
              <Square size={11} style={{ color: voiceColor }} fill={voiceColor} />
            ) : isListening ? (
              <MicOff size={12} style={{ color: voiceColor }} />
            ) : (
              <Mic size={12} style={{ color: voiceColor }} />
            )}
          </motion.button>
        )}

        {/* Send button */}
        <motion.button
          onClick={handleSubmit}
          disabled={(!value.trim() && !interimText?.trim()) || isProcessing}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          style={{
            flexShrink: 0,
            width: 28,
            height: 28,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--indigo)',
            border: '1px solid var(--indigo)',
            color: 'var(--cream)',
            cursor: 'pointer',
            opacity: (!value.trim() && !interimText?.trim()) || isProcessing ? 0.3 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {isProcessing ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <Send size={11} />
          )}
        </motion.button>
      </div>
    </div>
  );
}
