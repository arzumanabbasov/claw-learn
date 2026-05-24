'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LandingPage } from '@/components/LandingPage';
import { TutorApp } from '@/components/TutorApp';

type AppView = 'landing' | 'tutor';

export default function Home() {
  const [view, setView] = useState<AppView>('landing');

  return (
    <AnimatePresence mode="wait">
      {view === 'landing' ? (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.4 }}
        >
          <LandingPage onStart={() => setView('tutor')} />
        </motion.div>
      ) : (
        <motion.div
          key="tutor"
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="h-screen"
        >
          <TutorApp onBack={() => setView('landing')} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
