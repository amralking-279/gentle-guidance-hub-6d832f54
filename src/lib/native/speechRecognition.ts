// Unified speech-recognition wrapper.
// - On native (Android via Capacitor): uses @capacitor-community/speech-recognition,
//   which calls the on-device Android SpeechRecognizer. Works offline if the user
//   has the Arabic offline language pack installed (Settings → Google → Voice).
// - On web: falls back to Web Speech API (webkitSpeechRecognition) which requires
//   internet (Google servers).
import { Capacitor } from '@capacitor/core';

type PartialCb = (text: string) => void;
type FinalCb = (text: string) => void;
type ErrorCb = (code: 'not-allowed' | 'no-speech' | 'network' | 'unsupported' | 'unknown', message?: string) => void;

export interface SpeechSession {
  stop: () => Promise<void>;
  abort: () => Promise<void>;
}

export interface StartOptions {
  language?: string;
  onPartial: PartialCb;
  onFinal: FinalCb;
  onError: ErrorCb;
  onEnd: () => void;
}

export const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export async function checkAndRequestPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (isNative()) {
    try {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
      const available = await SpeechRecognition.available();
      if (!available.available) return 'unsupported';
      const status = await SpeechRecognition.checkPermissions();
      if (status.speechRecognition === 'granted') return 'granted';
      const req = await SpeechRecognition.requestPermissions();
      return req.speechRecognition === 'granted' ? 'granted' : 'denied';
    } catch (err) {
      console.error('[speech] native permission error', err);
      return 'denied';
    }
  }
  // Web: trigger the browser mic prompt explicitly.
  try {
    if (!navigator.mediaDevices?.getUserMedia) return 'unsupported';
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return 'granted';
  } catch {
    return 'denied';
  }
}

export async function startRecognition(opts: StartOptions): Promise<SpeechSession> {
  const language = opts.language ?? 'ar-SA';

  if (isNative()) {
    const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');

    await SpeechRecognition.removeAllListeners();
    let finalText = '';
    let stopped = false;

    await SpeechRecognition.addListener('partialResults', (data: { matches?: string[] }) => {
      const m = data?.matches?.[0];
      if (typeof m === 'string') {
        finalText = m;
        opts.onPartial(m);
      }
    });

    await SpeechRecognition.addListener('listeningState', (data: { status?: string }) => {
      if (data?.status === 'stopped' && !stopped) {
        stopped = true;
        if (finalText) opts.onFinal(finalText);
        opts.onEnd();
      }
    });

    try {
      await SpeechRecognition.start({
        language,
        maxResults: 1,
        prompt: '',
        partialResults: true,
        popup: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      opts.onError(msg.toLowerCase().includes('permission') ? 'not-allowed' : 'unknown', msg);
      opts.onEnd();
    }

    const stop = async () => {
      if (stopped) return;
      stopped = true;
      try { await SpeechRecognition.stop(); } catch {}
      if (finalText) opts.onFinal(finalText);
      await SpeechRecognition.removeAllListeners().catch(() => {});
      opts.onEnd();
    };

    return { stop, abort: stop };
  }

  // Web fallback
  const w = window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any };
  const SR: any = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!SR) {
    opts.onError('unsupported', 'Web Speech API not available');
    opts.onEnd();
    return { stop: async () => {}, abort: async () => {} };
  }

  const recognition = new SR();
  recognition.lang = language;
  recognition.continuous = true;
  recognition.interimResults = true;

  let finalText = '';
  let manualStop = false;

  recognition.onresult = (event: any) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const piece = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalText += (finalText ? ' ' : '') + piece;
      } else {
        interim += piece;
      }
    }
    opts.onPartial((finalText + ' ' + interim).trim());
  };

  recognition.onerror = (event: any) => {
    const code = event.error;
    if (code === 'not-allowed') opts.onError('not-allowed');
    else if (code === 'no-speech' || code === 'aborted') { /* benign */ }
    else if (code === 'network') opts.onError('network');
    else opts.onError('unknown', code);
  };

  recognition.onend = () => {
    if (finalText) opts.onFinal(finalText.trim());
    opts.onEnd();
  };

  try {
    recognition.start();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    opts.onError('unknown', msg);
    opts.onEnd();
  }

  return {
    stop: async () => { manualStop = true; try { recognition.stop(); } catch {} },
    abort: async () => { manualStop = true; try { recognition.abort(); } catch {} },
  };
}
