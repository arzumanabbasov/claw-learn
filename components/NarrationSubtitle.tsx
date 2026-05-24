'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface NarrationSubtitleProps {
  text: string | null;
  isVisible: boolean;
}

export function NarrationSubtitle({ text, isVisible }: NarrationSubtitleProps) {
  return (
    <AnimatePresence>
      {isVisible && text && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          style={{ overflow: 'hidden', flexShrink: 0 }}
        >
          <div
            style={{
              background: 'var(--cream)',
              borderTop: '1px solid rgba(13,17,23,0.1)',
              padding: '10px 16px',
              textAlign: 'center',
            }}
          >
            <motion.p
              key={text}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize: 13,
                color: 'var(--ink-muted)',
                lineHeight: 1.6,
              }}
            >
              {text}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
