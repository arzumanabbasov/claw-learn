// ElevenLabs TTS service for ThinkInMotion

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Using premade voice for free tier - Adam (deep, educational voice)
const DEFAULT_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam - free tier compatible

export interface TTSOptions {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export async function textToSpeech(
  text: string,
  apiKey: string,
  options: TTSOptions = {}
): Promise<ArrayBuffer> {
  const {
    voiceId = DEFAULT_VOICE_ID,
    stability = 0.5,
    similarityBoost = 0.75,
    style = 0.0,
    useSpeakerBoost = true,
  } = options;

  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style,
          use_speaker_boost: useSpeakerBoost,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  return response.arrayBuffer();
}

export async function textToSpeechStream(
  text: string,
  apiKey: string,
  options: TTSOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const { voiceId = DEFAULT_VOICE_ID, stability = 0.5, similarityBoost = 0.75 } = options;

  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/stream`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs stream error: ${response.status}`);
  }

  return response.body!;
}

export function playAudioBuffer(audioBuffer: ArrayBuffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    audioContext.decodeAudioData(
      audioBuffer,
      (buffer) => {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.onended = () => {
          audioContext.close();
          resolve();
        };
        source.start(0);
      },
      (error) => {
        audioContext.close();
        reject(error);
      }
    );
  });
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private isPlaying = false;

  async play(audioBuffer: ArrayBuffer): Promise<void> {
    this.stop();

    this.audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    return new Promise((resolve, reject) => {
      this.audioContext!.decodeAudioData(
        audioBuffer,
        (buffer) => {
          this.currentSource = this.audioContext!.createBufferSource();
          this.currentSource.buffer = buffer;
          this.currentSource.connect(this.audioContext!.destination);
          this.currentSource.onended = () => {
            this.isPlaying = false;
            resolve();
          };
          this.currentSource.start(0);
          this.isPlaying = true;
        },
        reject
      );
    });
  }

  stop() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Already stopped
      }
      this.currentSource = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isPlaying = false;
  }

  get playing() {
    return this.isPlaying;
  }
}
