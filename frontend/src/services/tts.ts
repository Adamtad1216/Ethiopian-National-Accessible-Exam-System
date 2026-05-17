import type { TTSSettings } from '@/types';
import { isCurrentRouteAudioMuted } from '@/lib/routeAudio';

class TTSService {
  private synth: SpeechSynthesis | null = null;
  private settings: TTSSettings = {
    enabled: true,
    language: 'en',
    speed: 1.0,
    voice: 'default',
    autoRead: true,
  };
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voicesReadyPromise: Promise<void> | null = null;

  constructor() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.synth = window.speechSynthesis;
      // Prime voice list; many browsers populate it asynchronously.
      this.synth.getVoices();
    }
  }

  private ensureVoicesReady(timeoutMs = 1200): Promise<void> {
    if (!this.synth) return Promise.resolve();

    if (this.synth.getVoices().length > 0) {
      return Promise.resolve();
    }

    if (this.voicesReadyPromise) {
      return this.voicesReadyPromise;
    }

    this.voicesReadyPromise = new Promise((resolve) => {
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        if (typeof window !== 'undefined') {
          window.speechSynthesis.onvoiceschanged = null;
        }
        this.voicesReadyPromise = null;
        resolve();
      };

      if (typeof window !== 'undefined') {
        window.speechSynthesis.onvoiceschanged = () => {
          if (window.speechSynthesis.getVoices().length > 0) {
            finish();
          }
        };
      }

      window.setTimeout(finish, timeoutMs);
    });

    return this.voicesReadyPromise;
  }

  updateSettings(settings: Partial<TTSSettings>) {
    this.settings = { ...this.settings, ...settings };
  }

  getSettings(): TTSSettings {
    return { ...this.settings };
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  getVoicesForLanguage(lang: 'en' | 'am'): SpeechSynthesisVoice[] {
    const voices = this.getAvailableVoices();
    if (lang === 'am') {
      return voices.filter(v => {
        const langCode = v.lang.toLowerCase();
        const voiceName = v.name.toLowerCase();
        return (
          langCode.startsWith('am') ||
          langCode.includes('ethi') ||
          voiceName.includes('amhar') ||
          voiceName.includes('ethiop')
        );
      });
    }
    return voices.filter(v => v.lang.startsWith('en'));
  }

  hasVoiceForLanguage(lang: 'en' | 'am'): boolean {
    return this.getVoicesForLanguage(lang).length > 0;
  }

  speak(text: string, language?: 'en' | 'am'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synth || !this.settings.enabled || isCurrentRouteAudioMuted()) {
        resolve();
        return;
      }

      void this.ensureVoicesReady().then(() => {
        if (!this.synth) {
          resolve();
          return;
        }

        this.stop();

        const effectiveLanguage = language ?? this.settings.language;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = this.settings.speed;
        // Use broad Amharic locale tag to maximize compatibility across browsers/OS voice packs.
        utterance.lang = effectiveLanguage === 'am' ? 'am' : 'en-US';

        const voices = this.getVoicesForLanguage(effectiveLanguage);
        if (this.settings.voice !== 'default') {
          const selectedVoice = voices.find(v => v.name === this.settings.voice);
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          } else if (voices.length > 0) {
            // Fallback to first matching voice when saved voice is unavailable.
            utterance.voice = voices[0];
          }
        } else if (voices.length > 0) {
          utterance.voice = voices[0];
        }

        utterance.onend = () => {
          this.currentUtterance = null;
          resolve();
        };
        utterance.onerror = (e) => {
          this.currentUtterance = null;
          reject(e);
        };

        this.currentUtterance = utterance;
        this.synth.speak(utterance);
      });
    });
  }

  speakQuestion(
    questionText: string,
    options: { label: string; text: string }[],
    language?: 'en' | 'am',
    questionNumber?: number,
  ) {
    const lang = language ?? this.settings.language;
    const optionsText = options
      .map((o) =>
        lang === 'am'
          ? `ምርጫ ${o.label}. ${o.text}`
          : `Option ${o.label}. ${o.text}`,
      )
      .join('. ');
    const questionPrefix =
      typeof questionNumber === 'number'
        ? lang === 'am'
          ? `ጥያቄ ${questionNumber}. `
          : `Question ${questionNumber}. `
        : '';
    const fullText = `${questionPrefix}${questionText}. ${optionsText}`;
    return this.speak(fullText, lang);
  }

  speakOption(label: string, text: string, language?: 'en' | 'am') {
    const lang = language ?? this.settings.language;
    return this.speak(
      lang === 'am' ? `ምርጫ ${label}: ${text}` : `Option ${label}: ${text}`,
      lang,
    );
  }

  speakTimeAlert(minutes: number, language?: 'en' | 'am') {
    const lang = language ?? this.settings.language;
    const text =
      lang === 'am'
        ? minutes === 1
          ? 'ማስጠንቀቂያ፡ አንድ ደቂቃ ቀርቷል።'
          : `ማስጠንቀቂያ፡ ${minutes} ደቂቃዎች ቀርተዋል።`
        : minutes === 1
          ? 'Warning: One minute remaining.'
          : `Warning: ${minutes} minutes remaining.`;
    return this.speak(text, lang);
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  isSpeaking(): boolean {
    return this.synth?.speaking || false;
  }

  pause() {
    this.synth?.pause();
  }

  resume() {
    this.synth?.resume();
  }
}

export const ttsService = new TTSService();
