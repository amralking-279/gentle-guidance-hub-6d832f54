// Schedules the day's prayer times as native local notifications with the
// adhan sound. Only runs inside the Capacitor mobile shell — silently no-ops
// on the regular website (the website keeps using web-push notifications).

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export type PrayerTimesMap = Record<'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha', string>;

const PRAYER_NAMES_AR: Record<keyof PrayerTimesMap, string> = {
  Fajr: 'الفجر',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
};

const PRAYER_IDS: Record<keyof PrayerTimesMap, number> = {
  Fajr: 1001,
  Dhuhr: 1002,
  Asr: 1003,
  Maghrib: 1004,
  Isha: 1005,
};

const PERSISTENT_ID = 999;

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isNativeApp()) return false;
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display === 'granted') return true;
  const req = await LocalNotifications.requestPermissions();
  return req.display === 'granted';
}

export async function getNativeNotificationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!isNativeApp()) return 'prompt';
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display === 'granted') return 'granted';
    if (perm.display === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'prompt';
  }
}

/** Cancel ALL scheduled adhan notifications (used when user disables alerts). */
export async function cancelAllAdhan(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const ids = Object.values(PRAYER_IDS).map((id) => ({ id }));
    await LocalNotifications.cancel({ notifications: ids });
  } catch {}
}

/**
 * Schedule one local notification per prayer for today, each playing the
 * bundled adhan sound. Re-call once per day (e.g. on app open / midnight).
 *
 * @param soundEnabled when false, schedules a silent notification (no adhan).
 */
export async function scheduleTodayAdhan(
  times: Partial<PrayerTimesMap>,
  enabled: Partial<Record<keyof PrayerTimesMap, boolean>>,
  soundEnabled: boolean = true,
): Promise<void> {
  if (!isNativeApp()) return;

  // Cancel any previous adhan schedule first (only our IDs, leave persistent alone).
  await cancelAllAdhan();

  const now = new Date();
  const notifications = (Object.keys(PRAYER_IDS) as Array<keyof PrayerTimesMap>)
    .filter((key) => enabled[key] !== false && times[key])
    .map((key) => {
      const t = times[key]!;
      const m = t.match(/^(\d{1,2}):(\d{1,2})/);
      if (!m) return null;
      const at = new Date();
      at.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
      // Skip prayers that have already passed today.
      if (at.getTime() <= now.getTime()) return null;
      const notif: Record<string, unknown> = {
        id: PRAYER_IDS[key],
        title: `🕌 حان وقت صلاة ${PRAYER_NAMES_AR[key]}`,
        body: 'الله أكبر — أقم الصلاة',
        schedule: { at, allowWhileIdle: true },
        smallIcon: 'ic_stat_icon_config_sample',
        channelId: soundEnabled ? 'adhan' : 'adhan-silent',
        ongoing: false,
        autoCancel: true,
        extra: { prayer: key },
      };
      if (soundEnabled) notif.sound = 'adhan.mp3';
      return notif;
    })
    .filter((n): n is NonNullable<typeof n> => n !== null);

  if (notifications.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await LocalNotifications.schedule({ notifications: notifications as any });
  }
}

/**
 * Create the Android notification channels (adhan sound + silent + persistent).
 * Call once on app startup (no-op on iOS / web).
 */
export async function ensureAdhanChannel(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await LocalNotifications.createChannel({
      id: 'adhan',
      name: 'الأذان',
      description: 'إشعارات مواقيت الصلاة بصوت الأذان',
      importance: 5, // IMPORTANCE_HIGH — heads-up + sound
      sound: 'adhan.mp3',
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#10b981',
    });
  } catch {}
  try {
    await LocalNotifications.createChannel({
      id: 'adhan-silent',
      name: 'تنبيه الصلاة (صامت)',
      description: 'إشعار وقت الصلاة بدون صوت',
      importance: 4,
      visibility: 1,
      vibration: true,
    });
  } catch {}
  try {
    await LocalNotifications.createChannel({
      id: 'prayer-persistent',
      name: 'الإشعار الدائم',
      description: 'إشعار ثابت يعرض الصلاة القادمة',
      importance: 2, // LOW — no sound, no heads-up
      visibility: 1,
      vibration: false,
    });
  } catch {}
}

/**
 * Show / update the ongoing notification with the next prayer info.
 * Re-call whenever the next prayer name / countdown changes.
 */
export async function showPersistentNextPrayer(title: string, body: string): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await LocalNotifications.schedule({
      notifications: [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({
          id: PERSISTENT_ID,
          title,
          body,
          schedule: { at: new Date(Date.now() + 200) },
          smallIcon: 'ic_stat_icon_config_sample',
          channelId: 'prayer-persistent',
          ongoing: true,
          autoCancel: false,
          extra: { persistent: true },
        } as any),
      ],
    });
  } catch {}
}

export async function clearPersistentNextPrayer(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: PERSISTENT_ID }] });
  } catch {}
}
