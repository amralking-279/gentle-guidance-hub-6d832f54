// Computes today's prayer times for a (lat, lon) using the public Aladhan API.
// Results are cached in-memory for the day to keep cron calls cheap.

type DayTimes = { Fajr: string; Dhuhr: string; Asr: string; Maghrib: string; Isha: string };

const cache = new Map<string, { date: string; times: DayTimes }>();

function todayKey(tz?: string): string {
  // Use the subscription's timezone if provided, else UTC.
  const now = new Date();
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz || 'UTC',
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
    return fmt.format(now); // YYYY-MM-DD
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export async function getPrayerTimes(
  lat: number,
  lon: number,
  tz?: string,
): Promise<DayTimes | null> {
  const date = todayKey(tz);
  const cacheKey = `${lat.toFixed(3)}|${lon.toFixed(3)}|${date}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit.times;

  try {
    const url = `https://api.aladhan.com/v1/timings/${date.replace(/-/g, '-')}` +
      `?latitude=${lat}&longitude=${lon}&method=5`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { timings?: Record<string, string> } };
    const t = json.data?.timings;
    if (!t) return null;
    const times: DayTimes = {
      Fajr: (t.Fajr || '').slice(0, 5),
      Dhuhr: (t.Dhuhr || '').slice(0, 5),
      Asr: (t.Asr || '').slice(0, 5),
      Maghrib: (t.Maghrib || '').slice(0, 5),
      Isha: (t.Isha || '').slice(0, 5),
    };
    cache.set(cacheKey, { date, times });
    return times;
  } catch {
    return null;
  }
}

/** Returns the prayer name (Fajr/Dhuhr/...) whose time matches "now" within ±window minutes, else null. */
export function findDuePrayer(
  times: DayTimes,
  now: Date,
  tz: string | undefined,
  windowMin = 1,
): keyof DayTimes | null {
  // Get current HH:MM in the subscription's timezone.
  let hhmm: string;
  try {
    hhmm = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz || 'UTC', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(now);
  } catch {
    hhmm = now.toISOString().slice(11, 16);
  }
  const [nh, nm] = hhmm.split(':').map(Number);
  const nowMin = nh * 60 + nm;
  for (const key of ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const) {
    const t = times[key];
    if (!t) continue;
    const [ph, pm] = t.split(':').map(Number);
    if (Number.isNaN(ph) || Number.isNaN(pm)) continue;
    const prayerMin = ph * 60 + pm;
    if (Math.abs(nowMin - prayerMin) <= windowMin) return key;
  }
  return null;
}

export const PRAYER_NAMES_AR: Record<keyof DayTimes, string> = {
  Fajr: 'الفجر',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
};

/**
 * Returns the next prayer that is approaching within `withinMin` minutes
 * (strictly in the future), with the exact minutes remaining.
 * Used to send a "اقتربت الصلاة" pre-notification.
 */
export function findApproachingPrayer(
  times: DayTimes,
  now: Date,
  tz: string | undefined,
  withinMin = 10,
): { key: keyof DayTimes; minutesLeft: number } | null {
  let hhmm: string;
  try {
    hhmm = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz || 'UTC', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(now);
  } catch {
    hhmm = now.toISOString().slice(11, 16);
  }
  const [nh, nm] = hhmm.split(':').map(Number);
  const nowMin = nh * 60 + nm;
  for (const key of ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const) {
    const t = times[key];
    if (!t) continue;
    const [ph, pm] = t.split(':').map(Number);
    if (Number.isNaN(ph) || Number.isNaN(pm)) continue;
    const diff = ph * 60 + pm - nowMin;
    if (diff > 0 && diff <= withinMin) return { key, minutesLeft: diff };
  }
  return null;
}
