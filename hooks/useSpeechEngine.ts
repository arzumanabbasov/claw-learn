'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useConversation } from '@elevenlabs/react';

interface UseSpeechEngineOptions {
  onUserMessage: (text: string) => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

async function fetchToken(): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch('/api/speech-engine/token');
  } catch {
    throw new Error('Network error reaching Speech Engine token endpoint');
  }
  if (res.status === 501) return null;
  if (!res.ok) throw new Error(`Speech Engine token request failed (${res.status})`);
  const data = await res.json();
  return data.token as string;
}

export function useSpeechEngine({
  onUserMessage,
  onSpeakingChange,
}: UseSpeechEngineOptions) {
  const onUserMessageRef = useRef(onUserMessage);
  const onSpeakingChangeRef = useRef(onSpeakingChange);
  onUserMessageRef.current = onUserMessage;
  onSpeakingChangeRef.current = onSpeakingChange;

  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // Pending resolve from sendNarration — called when agent finishes speaking
  const narrationResolveRef = useRef<(() => void) | null>(null);
  // Whether the agent is currently in "speaking" mode
  const isSpeakingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchToken()
      .then((token) => { if (!cancelled) setIsAvailable(token !== null); })
      .catch(() => { if (!cancelled) setIsAvailable(false); });
    return () => { cancelled = true; };
  }, []);

  const conversation = useConversation({
    onMessage: (event) => {
      if (
        event.source === 'user' &&
        typeof event.message === 'string' &&
        event.message.trim()
      ) {
        onUserMessageRef.current(event.message.trim());
      }
    },
    onModeChange: ({ mode }) => {
      const speaking = mode === 'speaking';
      isSpeakingRef.current = speaking;
      onSpeakingChangeRef.current?.(speaking);

      // When the agent transitions from speaking → listening, the narration
      // for this scene is done — resolve the pending promise so the canvas
      // can advance to the next scene.
      if (!speaking && narrationResolveRef.current) {
        const resolve = narrationResolveRef.current;
        narrationResolveRef.current = null;
        resolve();
      }
    },
    onError: (err) => {
      console.error('[SpeechEngine]', err);
      // Resolve any pending narration so the canvas doesn't hang
      if (narrationResolveRef.current) {
        const resolve = narrationResolveRef.current;
        narrationResolveRef.current = null;
        resolve();
      }
    },
    onDisconnect: () => {
      // Clean up on unexpected disconnect
      if (narrationResolveRef.current) {
        const resolve = narrationResolveRef.current;
        narrationResolveRef.current = null;
        resolve();
      }
    },
  });

  const startSession = useCallback(async () => {
    let token: string | null;
    try {
      token = await fetchToken();
    } catch (err) {
      console.error('[SpeechEngine] Could not get token:', err);
      return;
    }
    if (token === null) return;
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      conversation.startSession({ conversationToken: token });
    } catch (err) {
      console.error('[SpeechEngine] startSession failed:', err);
    }
  }, [conversation]);

  const endSession = useCallback(() => {
    // Resolve any pending narration before disconnecting
    if (narrationResolveRef.current) {
      const resolve = narrationResolveRef.current;
      narrationResolveRef.current = null;
      resolve();
    }
    conversation.endSession();
  }, [conversation]);

  /**
   * Send narration text to the agent and return a Promise that resolves
   * only when the agent finishes speaking — so the canvas waits per scene.
   *
   * Falls back to resolving after a timeout if the mode-change never fires
   * (e.g. very short utterances or network hiccups).
   */
  const sendNarration = useCallback(
    (text: string): Promise<void> => {
      if (!text.trim() || conversation.status !== 'connected') {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        // Safety timeout: if the agent never transitions back to listening
        // within 30s, resolve anyway so the canvas doesn't hang forever.
        const timeout = setTimeout(() => {
          if (narrationResolveRef.current === resolve) {
            narrationResolveRef.current = null;
            resolve();
          }
        }, 30_000);

        narrationResolveRef.current = () => {
          clearTimeout(timeout);
          resolve();
        };

        conversation.sendContextualUpdate(text.trim());
      });
    },
    [conversation]
  );

  return {
    startSession,
    endSession,
    sendNarration,
    isAvailable,
    status: conversation.status,
    isConnected: conversation.status === 'connected',
    isSpeaking: conversation.isSpeaking,
    isListening: conversation.isListening,
    setMuted: conversation.setMuted,
    isMuted: conversation.isMuted,
  };
}
