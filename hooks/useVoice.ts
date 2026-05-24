// Voice recognition hook

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { VoiceRecognition } from '@/lib/voiceRecognition';

interface UseVoiceOptions {
  onFinalTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
}

export function useVoice({ onFinalTranscript, onInterimTranscript }: UseVoiceOptions) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<VoiceRecognition | null>(null);

  useEffect(() => {
    setIsSupported(VoiceRecognition.isSupported());
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) return;

    recognitionRef.current = new VoiceRecognition({
      onResult: (transcript, isFinal) => {
        if (isFinal) {
          setInterimText('');
          onFinalTranscript(transcript);
          setIsListening(false);
        } else {
          setInterimText(transcript);
          onInterimTranscript?.(transcript);
        }
      },
      onError: (error) => {
        console.warn('Voice error:', error);
        setIsListening(false);
        setInterimText('');
      },
      onStart: () => setIsListening(true),
      onEnd: () => {
        setIsListening(false);
        setInterimText('');
      },
    });

    recognitionRef.current.start();
  }, [isSupported, onFinalTranscript, onInterimTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimText('');
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    interimText,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
  };
}
