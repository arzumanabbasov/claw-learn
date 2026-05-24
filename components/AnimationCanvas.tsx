'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScenePlan, Scene } from '@/types/scene';
import { ManimRenderer } from '@/lib/manimRenderer';

interface AnimationCanvasProps {
  plan: ScenePlan | null;
  isActive: boolean;
  onNarrate?: (text: string) => Promise<void>;
  onComplete?: () => void;
  onSceneChange?: (scene: Scene, index: number) => void;
}

export function AnimationCanvas({
  plan,
  isActive,
  onNarrate,
  onComplete,
  onSceneChange,
}: AnimationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<ManimRenderer | null>(null);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);

  // Keep callback refs stable — never stale, never cause re-runs
  const onNarrateRef = useRef(onNarrate);
  const onCompleteRef = useRef(onComplete);
  const onSceneChangeRef = useRef(onSceneChange);
  useEffect(() => { onNarrateRef.current = onNarrate; }, [onNarrate]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onSceneChangeRef.current = onSceneChange; }, [onSceneChange]);

  // Track whether playback is already running for this plan
  const playingPlanRef = useRef<string | null>(null);

  // Initialize manim renderer
  useEffect(() => {
    if (containerRef.current && !rendererRef.current) {
      rendererRef.current = new ManimRenderer(containerRef.current);
    }
  }, []);

  // Play scenes only when plan identity changes
  useEffect(() => {
    if (!plan || !isActive || !rendererRef.current) return;

    // Use plan title + scene count as a stable identity key
    const planKey = `${plan.title}::${plan.scenes.length}`;
    if (playingPlanRef.current === planKey) return;
    playingPlanRef.current = planKey;

    let cancelled = false;

    const playScenes = async () => {
      setCurrentSceneIndex(0);

      for (let i = 0; i < plan.scenes.length; i++) {
        if (cancelled) break;

        const scene = plan.scenes[i];
        setCurrentSceneIndex(i);
        onSceneChangeRef.current?.(scene, i);

        // Render visuals and narrate in parallel — but wait for BOTH before next scene
        await Promise.all([
          rendererRef.current!.renderScene(scene),
          onNarrateRef.current ? onNarrateRef.current(scene.narration) : Promise.resolve(),
        ]);

        if (cancelled) break;
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (!cancelled) {
        onCompleteRef.current?.();
      }
    };

    playScenes();

    return () => {
      cancelled = true;
    };
  // Only re-run when plan or isActive changes — NOT on callback changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, isActive]);

  // Cleanup renderer on unmount
  useEffect(() => {
    return () => {
      rendererRef.current?.stop();
    };
  }, []);

  // Reset plan key when plan is cleared so next question plays fresh
  useEffect(() => {
    if (!plan) {
      playingPlanRef.current = null;
    }
  }, [plan]);

  const progressPercent = plan ? ((currentSceneIndex + 1) / plan.scenes.length) * 100 : 0;

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Canvas container — fills all available space */}
      <div className="relative flex-1 rounded-xl overflow-hidden min-h-0" style={{ background: '#0a0a0f' }}>
        <div 
          ref={containerRef}
          className="absolute inset-0"
          style={{ background: '#0a0a0f' }}
        />

        {/* Empty state */}
        <AnimatePresence>
          {!plan && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4"
            >
              {/* Orbit container — 240×240 so the 100px radius symbols have room */}
              <div style={{ position: 'relative', width: 240, height: 240 }}>
                {/* Floating math symbols — orbit around the center */}
                {['∫', '∂', 'Σ', 'π', '∞', 'φ', 'λ', '∇'].map((sym, i) => {
                  const angle = (i / 8) * Math.PI * 2;
                  const radius = 100;
                  // Center of container is 120,120; subtract half glyph size (~12px) to center each symbol
                  const cx = 120 + Math.cos(angle) * radius - 12;
                  const cy = 120 + Math.sin(angle) * radius - 12;
                  return (
                    <motion.span
                      key={sym}
                      className="absolute text-2xl font-light select-none"
                      style={{
                        color: `hsl(${i * 45}, 70%, 60%)`,
                        left: cx,
                        top: cy,
                        opacity: 0.3,
                      }}
                      animate={{
                        y: [0, -8, 0],
                        opacity: [0.2, 0.5, 0.2],
                      }}
                      transition={{
                        duration: 3 + i * 0.3,
                        repeat: Infinity,
                        delay: i * 0.4,
                        ease: 'easeInOut',
                      }}
                    >
                      {sym}
                    </motion.span>
                  );
                })}
                {/* Center circle */}
                <motion.div
                  style={{
                    position: 'absolute',
                    left: 80, top: 80,   // 120 - 40 (half of w-20 = 80px)
                    width: 80, height: 80,
                    borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                >
                  <span className="text-3xl text-white/20">∫</span>
                </motion.div>
              </div>
              <p className="text-white/30 text-sm mt-8">
                Ask a question to see the magic
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scene title overlay */}
        <AnimatePresence>
          {plan && (
            <motion.div
              key={currentSceneIndex}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-3 left-3 right-3 flex items-center justify-between"
            >
              <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/5">
                <p className="text-white/70 text-xs font-medium">{plan.title}</p>
              </div>
              <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/5">
                <p className="text-white/50 text-xs">
                  {currentSceneIndex + 1} / {plan.scenes.length}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar */}
        {plan && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              style={{ width: `${((currentSceneIndex + 1) / plan.scenes.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
