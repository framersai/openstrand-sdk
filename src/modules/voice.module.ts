/**
 * Voice Module
 * 
 * Client wrapper for TTS (text-to-speech) and STT (speech-to-text) services.
 * Supports both server-side providers (OpenAI, ElevenLabs) and browser fallbacks (Web Speech API).
 * 
 * @module modules/voice
 * @author OpenStrand
 * @since 1.6.0
 * @license MIT
 * 
 * @example
 * ```typescript
 * import { OpenStrandSDK } from '@framers/openstrand-sdk';
 * 
 * const sdk = new OpenStrandSDK({ baseUrl: 'http://localhost:8000' });
 * 
 * // Text-to-speech
 * const audioBuffer = await sdk.voice.speak('Hello world', { voice: 'alloy' });
 * 
 * // Speech-to-text (browser mic)
 * const { text } = await sdk.voice.transcribe(micAudioBlob);
 * ```
 */

import type { OpenStrandSDK } from '../client';

export type VoiceProvider = 
  | 'OPENAI_TTS'
  | 'OPENAI_WHISPER'
  | 'ELEVENLABS'
  | 'GOOGLE_TTS'
  | 'GOOGLE_STT'
  | 'AWS_POLLY'
  | 'AZURE_TTS'
  | 'BROWSER_STT';

export interface VoiceSettings {
  id: string;
  userId?: string;
  teamId?: string;
  ttsProvider: VoiceProvider;
  ttsVoice: string;
  ttsSpeed: number;
  ttsLanguage: string;
  ttsAutoNarrate: boolean;
  sttProvider: VoiceProvider;
  sttLanguage?: string;
  sttSensitivity: number;
  retentionDays: number;
  saveByDefault: boolean;
}

export interface VoiceRecording {
  id: string;
  userId: string;
  teamId?: string;
  type: 'TTS' | 'STT';
  provider: VoiceProvider;
  audioUrl: string;
  transcriptText?: string;
  duration?: number;
  language?: string;
  format: string;
  cost?: number;
  expiresAt?: string;
  saved: boolean;
  created: string;
}

export interface SpeakOptions {
  voice?: string;
  language?: string;
  speed?: number;
  format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav';
  provider?: VoiceProvider;
  saveRecording?: boolean;
  attachTo?: {
    strandId?: string;
    flashcardId?: string;
    quizId?: string;
  };
}

export interface TranscribeOptions {
  language?: string;
  prompt?: string;
  temperature?: number;
  provider?: VoiceProvider;
  saveRecording?: boolean;
  attachTo?: {
    strandId?: string;
    flashcardId?: string;
    quizId?: string;
  };
}

export interface TranscriptionResult {
  text: string;
  language: string;
  confidence?: number;
  duration: number;
  cost?: number;
}

export interface BrowserSpeechRecognition {
  start: () => void;
  stop: () => void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
}

/**
 * Voice Module
 * 
 * Provides methods for TTS/STT with browser fallbacks.
 * 
 * @public
 */
export class VoiceModule {
  private browserSpeechRecognition: BrowserSpeechRecognition | null = null;

  constructor(private sdk: OpenStrandSDK) {}

  // ============================================================================
  // TEXT-TO-SPEECH
  // ============================================================================

  /**
   * Synthesize speech from text (quick mode)
   * 
   * @param text - Text to speak
   * @param options - Synthesis options
   * @returns Audio buffer (for playback or download)
   * 
   * @example
   * ```typescript
   * const audioBuffer = await sdk.voice.speak('Hello world!', {
   *   voice: 'alloy',
   *   speed: 1.2
   * });
   * 
   * // Play audio
   * const audio = new Audio(URL.createObjectURL(new Blob([audioBuffer])));
   * audio.play();
   * ```
   * 
   * @public
   */
  async speak(text: string, options?: SpeakOptions): Promise<ArrayBuffer> {
    const response = await this.sdk.requestRaw('POST', '/api/v1/voice/tts/stream', {
      body: {
        text,
        ...options,
      },
    });

    return await response.arrayBuffer();
  }

  /**
   * Synthesize speech and get URL (saved to server)
   * 
   * @param text - Text to speak
   * @param options - Synthesis options
   * @returns Audio URL and metadata
   * 
   * @example
   * ```typescript
   * const { audioUrl, duration } = await sdk.voice.speakSaved('Important note', {
   *   attachTo: { strandId: 'strand-123' }
   * });
   * ```
   * 
   * @public
   */
  async speakSaved(text: string, options?: SpeakOptions): Promise<{
    audioUrl: string;
    duration: number;
    cost?: number;
  }> {
    return this.sdk.request('POST', '/api/v1/voice/tts/synthesize', {
      body: {
        text,
        saveRecording: true,
        ...options,
      },
    });
  }

  /**
   * Synthesize speech with streaming (for long text)
   * Browser-only method - streams audio chunks as they arrive.
   * 
   * @param text - Text to speak
   * @param options - Synthesis options
   * @returns AsyncGenerator yielding audio chunks
   * 
   * @example
   * ```typescript
   * const audioContext = new AudioContext();
   * const source = audioContext.createBufferSource();
   * 
   * for await (const chunk of sdk.voice.speakStream('Long text...')) {
   *   // Process chunks
   * }
   * ```
   * 
   * @public
   */
  async *speakStream(text: string, options?: SpeakOptions): AsyncGenerator<Uint8Array, void, unknown> {
    if (typeof window === 'undefined') {
      throw new Error('speakStream() is only available in browser environments');
    }

    const response = await this.sdk.requestRaw('POST', '/api/v1/voice/tts/stream', {
      body: {
        text,
        ...options,
      },
    });

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield value;
    }
  }

  // ============================================================================
  // SPEECH-TO-TEXT
  // ============================================================================

  /**
   * Transcribe audio to text (server-side)
   * 
   * @param audioBlob - Audio blob (from mic or file)
   * @param options - Transcription options
   * @returns Transcription result
   * 
   * @example
   * ```typescript
   * // From file input
   * const file = fileInput.files[0];
   * const { text } = await sdk.voice.transcribe(file);
   * console.log('Transcript:', text);
   * ```
   * 
   * @public
   */
  async transcribe(audioBlob: Blob, options?: TranscribeOptions): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append('file', audioBlob);

    if (options?.language) formData.append('language', options.language);
    if (options?.prompt) formData.append('prompt', options.prompt);
    if (options?.temperature !== undefined) formData.append('temperature', String(options.temperature));
    if (options?.provider) formData.append('provider', options.provider);
    if (options?.saveRecording) formData.append('saveRecording', 'true');
    if (options?.attachTo) formData.append('attachTo', JSON.stringify(options.attachTo));

    const response = await fetch(`${this.sdk.getConfig().baseUrl}/api/v1/voice/stt/transcribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.sdk.getConfig().token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || 'Transcription failed');
    }

    return await response.json();
  }

  /**
   * Start browser-based speech recognition (Web Speech API fallback)
   * 
   * @param options - Recognition options
   * @returns Promise that resolves with transcript
   * 
   * @example
   * ```typescript
   * const { text } = await sdk.voice.startMicSession({
   *   language: 'en-US',
   *   onInterim: (partial) => console.log('Partial:', partial)
   * });
   * 
   * console.log('Final transcript:', text);
   * ```
   * 
   * @public
   */
  async startMicSession(options?: {
    language?: string;
    continuous?: boolean;
    interimResults?: boolean;
    onInterim?: (text: string) => void;
    onError?: (error: string) => void;
  }): Promise<{ text: string }> {
    if (typeof window === 'undefined') {
      throw new Error('startMicSession() is only available in browser environments');
    }

    return new Promise((resolve, reject) => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        reject(new Error('Browser does not support Web Speech API. Use server-side transcription instead.'));
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = options?.language || 'en-US';
      recognition.continuous = options?.continuous ?? false;
      recognition.interimResults = options?.interimResults ?? true;

      let finalTranscript = '';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;

          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (options?.onInterim && interimTranscript) {
          options.onInterim(interimTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        const errorMsg = `Speech recognition error: ${event.error}`;
        if (options?.onError) {
          options.onError(errorMsg);
        }
        reject(new Error(errorMsg));
      };

      recognition.onend = () => {
        resolve({ text: finalTranscript.trim() });
      };

      this.browserSpeechRecognition = recognition;
      recognition.start();
    });
  }

  /**
   * Stop active speech recognition session
   * 
   * @example
   * ```typescript
   * sdk.voice.stopMicSession();
   * ```
   * 
   * @public
   */
  stopMicSession(): void {
    if (this.browserSpeechRecognition) {
      this.browserSpeechRecognition.stop();
      this.browserSpeechRecognition = null;
    }
  }

  // ============================================================================
  // SETTINGS & MANAGEMENT
  // ============================================================================

  /**
   * Get user's voice settings
   * 
   * @returns Voice settings
   * 
   * @example
   * ```typescript
   * const settings = await sdk.voice.getSettings();
   * console.log('Default TTS voice:', settings.ttsVoice);
   * ```
   * 
   * @public
   */
  async getSettings(): Promise<VoiceSettings> {
    return this.sdk.request('GET', '/api/v1/voice/settings');
  }

  /**
   * Update voice settings
   * 
   * @param settings - Settings to update
   * @returns Updated settings
   * 
   * @example
   * ```typescript
   * await sdk.voice.updateSettings({
   *   ttsVoice: 'nova',
   *   ttsSpeed: 1.25,
   *   sttLanguage: 'es'
   * });
   * ```
   * 
   * @public
   */
  async updateSettings(settings: Partial<Omit<VoiceSettings, 'id' | 'userId' | 'teamId'>>): Promise<VoiceSettings> {
    return this.sdk.request('PATCH', '/api/v1/voice/settings', {
      body: settings,
    });
  }

  /**
   * List available voice providers
   * 
   * @returns Available providers
   * 
   * @example
   * ```typescript
   * const { tts, stt } = await sdk.voice.getProviders();
   * console.log('TTS providers:', tts);
   * console.log('STT providers:', stt);
   * ```
   * 
   * @public
   */
  async getProviders(): Promise<{
    available: VoiceProvider[];
    tts: VoiceProvider[];
    stt: VoiceProvider[];
  }> {
    return this.sdk.request('GET', '/api/v1/voice/providers');
  }

  /**
   * List user's voice recordings
   * 
   * @returns Array of recordings
   * 
   * @example
   * ```typescript
   * const recordings = await sdk.voice.getRecordings();
   * recordings.forEach(rec => {
   *   console.log(`${rec.type}: ${rec.audioUrl}`);
   * });
   * ```
   * 
   * @public
   */
  async getRecordings(): Promise<VoiceRecording[]> {
    return this.sdk.request('GET', '/api/v1/voice/recordings');
  }
}

