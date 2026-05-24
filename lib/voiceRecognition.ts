// Voice recognition service using Web Speech API

// Extend window type for cross-browser support
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionCtor = new () => ISpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w['SpeechRecognition'] || w['webkitSpeechRecognition']) as SpeechRecognitionCtor | null;
}

export interface VoiceRecognitionOptions {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  language?: string;
  continuous?: boolean;
}

export class VoiceRecognition {
  private recognition: ISpeechRecognition | null = null;
  private isListening = false;
  private options: VoiceRecognitionOptions;

  constructor(options: VoiceRecognitionOptions) {
    this.options = options;
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionAPI = getSpeechRecognition();

    if (!SpeechRecognitionAPI) {
      console.warn('Speech recognition not supported');
      return;
    }

    this.recognition = new SpeechRecognitionAPI();
    this.recognition.continuous = this.options.continuous ?? false;
    this.recognition.interimResults = true;
    this.recognition.lang = this.options.language ?? 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        this.options.onResult(finalTranscript, true);
      } else if (interimTranscript) {
        this.options.onResult(interimTranscript, false);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.isListening = false;
      this.options.onError(event.error);
    };

    this.recognition.onstart = () => {
      this.isListening = true;
      this.options.onStart?.();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.options.onEnd?.();
    };
  }

  start() {
    if (!this.recognition) {
      this.options.onError('Speech recognition not supported in this browser');
      return;
    }
    if (this.isListening) return;

    try {
      this.recognition.start();
    } catch (e) {
      console.error('Failed to start recognition:', e);
    }
  }

  stop() {
    if (!this.recognition || !this.isListening) return;
    this.recognition.stop();
  }

  abort() {
    if (!this.recognition) return;
    this.recognition.abort();
    this.isListening = false;
  }

  get listening() {
    return this.isListening;
  }

  static isSupported(): boolean {
    return getSpeechRecognition() !== null;
  }
}
