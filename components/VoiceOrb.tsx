'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Square } from 'lucide-react';
import { TutorStatus } from '@/types/scene';

interface VoiceOrbProps {
  status: TutorStatus;
  isListening: boolean;
  onToggleVoice: () => void;
  onInterrupt: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const statusColors: Record<TutorStatus, string> = {
  idle:      '#1e2a5e',
  listening: '#6bcb77',
  thinking:  '#e8a020',
  rendering: '#e8a020',
  narrating: '#e8a020',
  paused:    '#6b7280',
  error:     '#ff6b6b',
};

const statusLabels: Record<TutorStatus, string> = {
  idle:      'Ask anything',
  listening: 'Listening...',
  thinking:  'Thinking...',
  rendering: 'Visualizing...',
  narrating: 'Explaining...',
  paused:    'Paused',
  error:     'Error',
};

export function VoiceOrb({
  status,
  isListening,
  onToggleVoice,
  onInterrupt,
  size = 'md',
}: VoiceOrbProps) {
  const color = statusColors[status];
  const isActive = status !== 'idle' && status !== 'error' && status !== 'paused';
  const canInterrupt = status === 'narrating' || status === 'rendering' || status === 'thinking';

  const sizes = {
    sm: { orb: 36, icon: 14, ring: 52 },
    md: { orb: 72, icon: 22, ring: 92 },
    lg: { orb: 128, icon: 36, ring: 160 },
  };

  const s = sizes[size];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: s.ring,
          height: s.ring,
        }}
      >
        {/* Pulse rings */}
        <AnimatePresence>
          {isActive && (
            <>
              <motion.div
                style={{
                  position: 'absolute',
                  width: s.ring,
                  height: s.ring,
                  borderRadius: '50%',
                  border: `1px solid ${color}40`,
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.3, opacity: [0.6, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.div
                style={{
                  position: 'absolute',
                  width: s.ring * 0.85,
                  height: s.ring * 0.85,
                  borderRadius: '50%',
                  border: `1px solid ${color}60`,
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.2, opacity: [0.8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
              />
            </>
          )}
        </AnimatePresence>

        {/* Listening waveform */}
        <AnimatePresence>
          {isListening && (
            <>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  style={{
                    position: 'absolute',
                    width: s.orb + 20 + i * 16,
                    height: s.orb + 20 + i * 16,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${color}20, transparent)`,
                  }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.2, 0.6] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Main orb */}
        <motion.button
          onClick={canInterrupt ? onInterrupt : onToggleVoice}
          style={{
            position: 'relative',
            width: s.orb,
            height: s.orb,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: 'none',
            background: `radial-gradient(circle at 35% 35%, ${color}cc, ${color}66)`,
            boxShadow: `0 0 ${isActive ? 40 : 20}px ${color}66, 0 0 ${isActive ? 80 : 40}px ${color}22`,
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: isActive
              ? [
                  `0 0 40px ${color}66, 0 0 80px ${color}22`,
                  `0 0 60px ${color}88, 0 0 100px ${color}33`,
                  `0 0 40px ${color}66, 0 0 80px ${color}22`,
                ]
              : `0 0 20px ${color}44, 0 0 40px ${color}11`,
          }}
          transition={{
            boxShadow: { duration: 2, repeat: isActive ? Infinity : 0, ease: 'easeInOut' },
          }}
        >
          <AnimatePresence mode="wait">
            {canInterrupt ? (
              <motion.div
                key="stop"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Square size={s.icon} color="white" fill="white" />
              </motion.div>
            ) : isListening ? (
              <motion.div
                key="listening"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <MicOff size={s.icon} color="white" />
              </motion.div>
            ) : (
              <motion.div
                key="mic"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Mic size={s.icon} color="white" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {size !== 'sm' && (
        <motion.p
          key={status}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontFamily: '"DM Mono", monospace',
            fontSize: 12,
            fontWeight: 400,
            color,
            letterSpacing: '0.06em',
          }}
        >
          {statusLabels[status]}
        </motion.p>
      )}
    </div>
  );
}
