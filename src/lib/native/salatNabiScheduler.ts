// Salat ʿala an-Nabi (الصلاة على النبي ﷺ) reminder scheduler.
//
// - On Capacitor native: schedules local notifications for the next 24h with
//   a dedicated channel + sound.
// - On the web: relies on an in-app interval (see SalatNabiClient) + the
//   Notifications API while the tab is open. Background web push is out of
//   scope for v1.

// Capacitor modules are imported dynamically inside functions to avoid
// pulling them into the SSR/initial client bundle (which previously
// triggered Vite re-optimization mid-hydration and broke routing).

export type SalatNabiSoundVariant = 'ai' | 'ibrahimiya';

const AI_URL = '/api/public/tts/salat-nabi.mp3';
const IBRAHIMIYA_URL = 'https://archive.org/download/20251209_20251209_2113/%D9%85%D8%A7%20%D8%A7%D8%AC%D9%85%D9%84%20%D8%A7%D9%84%D8%B5%D9%84%D8%A7%D8%A9%20%D8%A7%D9%84%D8%A7%D8%A8%D8%B1%D8%A7%D9%87%D9%8A%D9%85%D9%8A%D8%A9%20%D8%A8%D8%A7%D9%84%D8%B5%D9%8A%D8%BA%D8%A9%20%D8%A7%D9%84%D8%B5%D8%AD%D9%8A%D8%AD%D8%A9%20%D8%A8%D8%B5%D9%88%D8%AA%20%D9%87%D8%A7%D8%AF%D8%A6%20%D9%88%D9%85%D8%B1%D9%8A%D8%AD%20%20%23%D8%A7%D8%B0%D9%83%D8%A7%D8%B1%20%23%D8%A7%D9%83%D8%B3%D8%A8%D9%84%D9%88%D8%B1%20%23%D8%A7%D9%84%D8%B5%D9%84%D8%A7%D8%A9%D8%A7%D9%84%D8%A5%D8%A8%D8%B1%D8%A7%D9%87%D9%8A%D9%85%D9%8A%D8%A9.mp3';

export const SALAT_NABI_SOUND_VARIANTS: {
  value: SalatNabiSoundVariant;
  label: string;
  description: string;
  url: string;
  nativeFile: string;
}[] = [
  { value: 'ai', label: 'صوت ذكاء اصطناعي — رجل هادئ', description: 'صوت رجل هادئ وجميل يردد الصلاة على النبي ﷺ', url: AI_URL, nativeFile: 'salat_nabi_ibrahimiya.mp3' },
  { value: 'ibrahimiya', label: 'الصلاة الإبراهيمية', description: 'الصيغة الكاملة بصوت هادئ ومريح', url: IBRAHIMIYA_URL, nativeFile: 'salat_nabi_ibrahimiya.mp3' },
];

export function getSoundVariantUrl(v: SalatNabiSoundVariant): string {
  return (SALAT_NABI_SOUND_VARIANTS.find((s) => s.value === v) ?? SALAT_NABI_SOUND_VARIANTS[0]).url;
}
export function getSoundVariantNativeFile(v: SalatNabiSoundVariant): string {
  return (SALAT_NABI_SOUND_VARIANTS.find((s) => s.value === v) ?? SALAT_NABI_SOUND_VARIANTS[0]).nativeFile;
}

export type SalatNabiFrequency =
  | 'm30' | 'h1' | 'h2' | 'h3' | 'daily' | 'friday';

export type SalatNabiPrefs = {
  enabled: boolean;
  frequency: SalatNabiFrequency;
  soundEnabled: boolean;
  useCustomSound: boolean;
  soundVariant: SalatNabiSoundVariant;
  quietStart: string;
  quietEnd: string;
  chosenTime: string;
};

export const DEFAULT_SALAT_NABI_PREFS: SalatNabiPrefs = {
  enabled: false,
  frequency: 'h2',
  soundEnabled: true,
  useCustomSound: true,
  soundVariant: 'ai',
  quietStart: '23:00',
  quietEnd: '06:00',
  chosenTime: '13:00',
};

const ID_BASE = 2000;
const ID_RANGE = 200;

/** @deprecated use getSoundVariantNativeFile */
export const SALAT_NABI_SOUND_FILE = 'salat_nabi_ibrahimiya.mp3';
/** @deprecated use getSoundVariantUrl */
export const SALAT_NABI_SOUND_WEB: string = IBRAHIMIYA_URL;

export function isNativeApp(): boolean {
  try {
    const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return !!cap?.isNativePlatform?.();
  } catch { return false; }
}

function parseHM(hm: string): [number, number] {
  const m = hm.match(/^(\d{1,2}):(\d{1,2})/);
  if (!m) return [0, 0];
  return [Math.min(23, parseInt(m[1], 10)), Math.min(59, parseInt(m[2], 10))];
}

function inQuietWindow(date: Date, quietStart: string, quietEnd: string): boolean {
  const [sh, sm] = parseHM(quietStart);
  const [eh, em] = parseHM(quietEnd);
  const minutes = date.getHours() * 60 + date.getMinutes();
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (start === end) return false;
  if (start < end) return minutes >= start && minutes < end;
  // window crosses midnight
  return minutes >= start || minutes < end;
}

function frequencyToStepMinutes(f: SalatNabiFrequency): number | null {
  switch (f) {
    case 'm30': return 30;
    case 'h1': return 60;
    case 'h2': return 120;
    case 'h3': return 180;
    default: return null;
  }
}

/** Build the next N firing times for the chosen frequency, skipping quiet hours. */
export function computeUpcomingTimes(prefs: SalatNabiPrefs, limit = 48): Date[] {
  const now = new Date();
  const out: Date[] = [];
  const [ch, cm] = parseHM(prefs.chosenTime);

  if (prefs.frequency === 'daily') {
    for (let i = 0; i < Math.min(7, limit); i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      d.setHours(ch, cm, 0, 0);
      if (d.getTime() > now.getTime()) out.push(d);
    }
    return out;
  }

  if (prefs.frequency === 'friday') {
    for (let i = 0; i < 6 && out.length < limit; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      d.setHours(ch, cm, 0, 0);
      if (d.getDay() === 5 && d.getTime() > now.getTime()) out.push(d);
    }
    return out;
  }

  const step = frequencyToStepMinutes(prefs.frequency);
  if (!step) return out;
  // Start from the next aligned step boundary in the future.
  const t = new Date(now);
  t.setSeconds(0, 0);
  t.setMinutes(t.getMinutes() + (step - (t.getMinutes() % step)));
  // Cap to next 24h on native to avoid scheduling too many.
  const horizonMs = 24 * 60 * 60 * 1000;
  const horizon = now.getTime() + horizonMs;
  while (out.length < limit && t.getTime() < horizon) {
    if (!inQuietWindow(t, prefs.quietStart, prefs.quietEnd)) {
      out.push(new Date(t));
    }
    t.setMinutes(t.getMinutes() + step);
  }
  return out;
}

async function loadLocalNotifications() {
  const mod = await import('@capacitor/local-notifications');
  return mod.LocalNotifications;
}

export async function ensureSalatNabiChannel(): Promise<void> {
  if (!isNativeApp()) return;
  const LocalNotifications = await loadLocalNotifications();
  try {
    await LocalNotifications.createChannel({
      id: 'salat-nabi',
      name: 'الصلاة على النبي ﷺ',
      description: 'تذكير دوري للصلاة على النبي محمد ﷺ',
      importance: 4,
      sound: SALAT_NABI_SOUND_FILE,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#10b981',
    });
  } catch {}
  try {
    await LocalNotifications.createChannel({
      id: 'salat-nabi-silent',
      name: 'الصلاة على النبي (صامت)',
      description: 'تذكير الصلاة على النبي بدون صوت',
      importance: 3,
      visibility: 1,
      vibration: true,
    });
  } catch {}
}

export async function cancelAllSalatNabi(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const LocalNotifications = await loadLocalNotifications();
    const ids = Array.from({ length: ID_RANGE }, (_, i) => ({ id: ID_BASE + i }));
    await LocalNotifications.cancel({ notifications: ids });
  } catch {}
}

export async function scheduleSalatNabi(prefs: SalatNabiPrefs): Promise<void> {
  if (!isNativeApp()) return;
  await cancelAllSalatNabi();
  if (!prefs.enabled) return;

  const times = computeUpcomingTimes(prefs, ID_RANGE);
  if (!times.length) return;

  const notifications = times.map((at, i) => {
    const notif: Record<string, unknown> = {
      id: ID_BASE + i,
      title: 'الصلاة على النبي ﷺ',
      body: 'اللهم صلِّ وسلِّم على نبينا محمد ﷺ',
      schedule: { at, allowWhileIdle: true },
      smallIcon: 'ic_stat_icon_config_sample',
      channelId: prefs.soundEnabled ? 'salat-nabi' : 'salat-nabi-silent',
      autoCancel: true,
      extra: { kind: 'salat-nabi' },
    };
    if (prefs.soundEnabled && prefs.useCustomSound) {
      notif.sound = getSoundVariantNativeFile(prefs.soundVariant);
    }
    return notif;
  });

  const LocalNotifications = await loadLocalNotifications();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await LocalNotifications.schedule({ notifications: notifications as any });
}

/** Web fallback: synthesized soft chime when no audio file is available. */
export function playFallbackChime(): void {
  try {
    const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    [880, 660, 990].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      const start = now + i * 0.18;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.25, start + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
      o.connect(g).connect(ctx.destination);
      o.start(start);
      o.stop(start + 0.7);
    });
    setTimeout(() => ctx.close().catch(() => undefined), 1800);
  } catch {}
}
