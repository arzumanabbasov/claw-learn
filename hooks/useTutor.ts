// Main tutor hook — orchestrates the full Claw Learn experience

'use client';

import { useState, useCallback, useRef } from 'react';
import { ScenePlan, TutorStatus, Message } from '@/types/scene';
import { AISettings, AppSettings } from '@/components/SettingsModal';

interface UseTutorOptions {
  onScenePlanReady?: (plan: ScenePlan) => void;
  onStatusChange?: (status: TutorStatus) => void;
  aiSettings?: AISettings | null;
  appSettings?: AppSettings | null;
}

export function useTutor(options: UseTutorOptions = {}) {
  const [status, setStatus] = useState<TutorStatus>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentPlan, setCurrentPlan] = useState<ScenePlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isNarrating, setIsNarrating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastNarratedRef = useRef<string>('');

  const updateStatus = useCallback(
    (s: TutorStatus) => {
      setStatus(s);
      options.onStatusChange?.(s);
    },
    [options]
  );

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  const interrupt = useCallback(() => {
    abortRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    lastNarratedRef.current = '';
    setIsNarrating(false);
    updateStatus('idle');
  }, [updateStatus]);

  const narrateText = useCallback(
    async (text: string): Promise<void> => {
      if (!text || !text.trim()) return;
      // Deduplicate — don't re-narrate the same text
      if (isNarrating && lastNarratedRef.current === text) return;
      lastNarratedRef.current = text;

      try {
        setIsNarrating(true);

        // Forward ElevenLabs settings from the in-app settings page if available
        const body: Record<string, unknown> = { text: text.trim() };
        if (options.appSettings?.elevenLabsApiKey) {
          body.elevenLabsApiKey = options.appSettings.elevenLabsApiKey;
        }
        if (options.appSettings?.elevenLabsVoiceId) {
          body.elevenLabsVoiceId = options.appSettings.elevenLabsVoiceId;
        }

        const response = await fetch('/api/narrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: abortRef.current?.signal,
        });

        if (!response.ok) {
          console.warn('Narration unavailable');
          setIsNarrating(false);
          return;
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        await new Promise<void>((resolve) => {
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          audio.play().catch(() => resolve());
        });
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.warn('Narration error:', e);
        }
      } finally {
        setIsNarrating(false);
      }
    },
    [isNarrating]
  );

  const ask = useCallback(
    async (question: string) => {
      if (status === 'thinking' || status === 'rendering') return;

      // Interrupt any ongoing narration
      interrupt();

      setError(null);
      addMessage('user', question);
      updateStatus('thinking');

      abortRef.current = new AbortController();

      try {
        const history = messages.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        // Pass AI settings from the in-app settings page if available
        const aiConfig = options.aiSettings
          ? {
              apiKey:  options.aiSettings.apiKey,
              baseUrl: options.aiSettings.baseUrl,
              model:   options.aiSettings.model,
            }
          : undefined;

        const response = await fetch('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, history, aiConfig }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to get explanation');
        }

        const data = await response.json();
        const plan: ScenePlan = data.scenePlan;

        setCurrentPlan(plan);
        options.onScenePlanReady?.(plan);

        addMessage(
          'assistant',
          plan.scenes.map((s) => s.narration).join(' ')
        );

        updateStatus('rendering');
      } catch (e) {
        if ((e as Error).name === 'AbortError') {
          updateStatus('idle');
          return;
        }
        const msg = e instanceof Error ? e.message : 'Something went wrong';
        setError(msg);
        updateStatus('error');
        console.error('Tutor error:', e);
      }
    },
    [status, messages, interrupt, addMessage, updateStatus, options]
  );

  const reset = useCallback(() => {
    interrupt();
    setMessages([]);
    setCurrentPlan(null);
    setError(null);
    updateStatus('idle');
  }, [interrupt, updateStatus]);

  return {
    status,
    messages,
    currentPlan,
    error,
    isNarrating,
    ask,
    interrupt,
    narrateText,
    reset,
    setStatus: updateStatus,
  };
}
