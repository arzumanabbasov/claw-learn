// Animation player hook — manages scene playback timeline

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ScenePlan, Scene } from '@/types/scene';
import { SceneRenderer } from '@/lib/animationEngine';

interface UseAnimationPlayerOptions {
  onSceneChange?: (scene: Scene, index: number) => void;
  onNarrate?: (text: string) => void;
  onComplete?: () => void;
}

export function useAnimationPlayer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  options: UseAnimationPlayerOptions = {}
) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [sceneProgress, setSceneProgress] = useState(0);
  const [plan, setPlan] = useState<ScenePlan | null>(null);
  const rendererRef = useRef<SceneRenderer | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize renderer when canvas is ready
  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new SceneRenderer(canvasRef.current);
    }
  }, [canvasRef]);

  const stopPlayback = useCallback(() => {
    rendererRef.current?.stop();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playScene = useCallback(
    (scene: Scene, index: number, scenes: Scene[]) => {
      if (!rendererRef.current) return;

      setCurrentSceneIndex(index);
      setSceneProgress(0);
      options.onSceneChange?.(scene, index);
      options.onNarrate?.(scene.narration);

      rendererRef.current.animate(
        scene,
        (progress) => setSceneProgress(progress),
        () => {
          // Scene complete — move to next
          const nextIndex = index + 1;
          if (nextIndex < scenes.length) {
            timeoutRef.current = setTimeout(() => {
              playScene(scenes[nextIndex], nextIndex, scenes);
            }, 300);
          } else {
            setIsPlaying(false);
            options.onComplete?.();
          }
        }
      );
    },
    [options]
  );

  const play = useCallback(
    (scenePlan: ScenePlan) => {
      stopPlayback();
      setPlan(scenePlan);
      setCurrentSceneIndex(0);
      setIsPlaying(true);

      if (scenePlan.scenes.length > 0) {
        playScene(scenePlan.scenes[0], 0, scenePlan.scenes);
      }
    },
    [stopPlayback, playScene]
  );

  const pause = useCallback(() => {
    rendererRef.current?.stop();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    if (!plan) return;
    setIsPlaying(true);
    playScene(
      plan.scenes[currentSceneIndex],
      currentSceneIndex,
      plan.scenes
    );
  }, [plan, currentSceneIndex, playScene]);

  const jumpToScene = useCallback(
    (index: number) => {
      if (!plan || index < 0 || index >= plan.scenes.length) return;
      stopPlayback();
      setIsPlaying(true);
      playScene(plan.scenes[index], index, plan.scenes);
    },
    [plan, stopPlayback, playScene]
  );

  const renderStatic = useCallback(
    (scene: Scene) => {
      rendererRef.current?.renderStatic(scene);
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  return {
    isPlaying,
    currentSceneIndex,
    sceneProgress,
    plan,
    play,
    pause,
    resume,
    stopPlayback,
    jumpToScene,
    renderStatic,
    totalScenes: plan?.scenes.length ?? 0,
    currentScene: plan?.scenes[currentSceneIndex] ?? null,
  };
}
