import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Clock, MapPin, Compass, ArrowRight, Volume2, VolumeX, Bell, BellOff, Play, Pause, Loader2, Info } from 'lucide-react';
import AdhanModal from './AdhanModal';
import NotificationPermissionModal from './NotificationPermissionModal';
import { useWebPush } from '@/hooks/useWebPush';
import {
  cancelAllAdhan,
  clearPersistentNextPrayer,
  ensureAdhanChannel,
  ensureNotificationPermission,
  getNativeNotificationPermission,
  isNativeApp,
  scheduleTodayAdhan,
  showPersistentNextPrayer,
  type PrayerTimesMap,
} from '@/lib/native/adhanScheduler';

// Convert "HH:MM" (24h, may include " (TZ)" suffix from Aladhan) -> "h:MM AM/PM" بالعربية
function to12h(t?: string): string {
  if (!t || !t.includes(':')) return '--:--';
  const m1 = t.match(/^(\d{1,2}):(\d{1,2})/);
  if (!m1) return '--:--';
  let h = parseInt(m1[1], 10);
  const m = m1[2].padStart(2, '0');
  const period = h >= 12 ? 'م' : 'ص';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${period}`;
}

const ADHAN_RECITERS = [
  { id: 'makkah', name: 'أذان الحرم المكي', url: 'https://www.islamcan.com/audio/adhan/azan2.mp3' },
  { id: 'madinah', name: 'أذان الحرم المدني', url: 'https://www.islamcan.com/audio/adhan/azan1.mp3' },
  { id: 'mishary', name: 'مشاري راشد العفاسي', url: 'https://www.islamcan.com/audio/adhan/azan11.mp3' },
  { id: 'naqshbandi', name: 'الشيخ النقشبندي', url: 'https://www.islamcan.com/audio/adhan/azan9.mp3' },
  { id: 'qatami', name: 'ناصر القطامي', url: 'https://www.islamcan.com/audio/adhan/azan5.mp3' },
  { id: 'fajr', name: 'أذان الفجر (الحرم)', url: 'https://www.islamcan.com/audio/adhan/azan3.mp3' },
  { id: 'turkish', name: 'الأذان التركي', url: 'https://www.islamcan.com/audio/adhan/azan21.mp3' },
];

type Prayer = { key: string; name: string; time: string; icon: string; color: string; notify: boolean };

const PRAYER_META: Omit<Prayer, 'time'>[] = [
  { key: 'Fajr', name: 'الفجر', icon: '🌙', color: 'from-blue-600 to-blue-800', notify: true },
  { key: 'Sunrise', name: 'الشروق', icon: '🌅', color: 'from-amber-600 to-amber-800', notify: false },
  { key: 'Dhuhr', name: 'الظهر', icon: '☀️', color: 'from-yellow-600 to-yellow-800', notify: true },
  { key: 'Asr', name: 'العصر', icon: '🌤️', color: 'from-orange-600 to-orange-800', notify: true },
  { key: 'Maghrib', name: 'المغرب', icon: '🌇', color: 'from-red-600 to-red-800', notify: true },
  { key: 'Isha', name: 'العشاء', icon: '🌃', color: 'from-indigo-600 to-indigo-800', notify: true },
];

const STORAGE_KEY = 'prayer-settings-v1';

type Settings = {
  reciterId: string;
  soundEnabled: boolean;
  notifyEnabled: boolean;
  persistentEnabled: boolean;
  enabledPrayers: Record<string, boolean>;
  /** Aladhan calculation method id. 'auto' picks by detected country. */
  calcMethod: number | 'auto';
  /** 0 = Shafi/Maliki/Hanbali, 1 = Hanafi (Asr later). */
  asrSchool: 0 | 1;
};

const defaultSettings: Settings = {
  reciterId: ADHAN_RECITERS[0].id,
  soundEnabled: true,
  notifyEnabled: true,
  persistentEnabled: true,
  enabledPrayers: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
  calcMethod: 'auto',
  asrSchool: 0,
};


const HIJRI_MONTHS = ['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'];
function todayHijri(): string {
  try {
    const fmt = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' });
    return fmt.format(new Date());
  } catch { return ''; }
}
function todayGregorian(): string {
  return new Intl.DateTimeFormat('ar', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
}

async function reverseGeocode(lat: number, lon: number): Promise<{ display: string; countryCode?: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=ar`,
      { headers: { 'User-Agent': 'NoorQuranApp/1.0' } }
    );
    const data = await res.json();
    const addr = data?.address;
    if (addr) {
      const city = addr.city || addr.town || addr.village || addr.county || addr.state || '';
      const country = addr.country || '';
      return {
        display: [city, country].filter(Boolean).join('، '),
        countryCode: (addr.country_code || '').toUpperCase(),
      };
    }
  } catch {}
  return { display: `${lat.toFixed(3)}, ${lon.toFixed(3)}` };
}

async function getLocationByIP(): Promise<{ lat: number; lon: number; city: string; countryCode?: string } | null> {
  try {
    const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.latitude || !data?.longitude) return null;
    const city = [data.city, data.country_name].filter(Boolean).join('، ');
    return { lat: data.latitude, lon: data.longitude, city, countryCode: (data.country_code || '').toUpperCase() };
  } catch {
    return null;
  }
}

// Aladhan calculation method IDs — pick by country for sensible defaults.
// 1=Karachi, 2=ISNA, 3=MWL, 4=Umm al-Qura, 5=Egypt, 7=Tehran, 8=Gulf, 13=Turkey, 12=France, 15=Moonsighting
function methodForCountry(cc?: string): number {
  if (!cc) return 3;
  if (cc === 'SA') return 4;
  if (cc === 'EG' || cc === 'SD' || cc === 'LY' || cc === 'SY' || cc === 'LB' || cc === 'JO' || cc === 'PS' || cc === 'IQ' || cc === 'YE') return 5;
  if (['KW', 'QA', 'AE', 'BH', 'OM'].includes(cc)) return 8;
  if (cc === 'IR') return 7;
  if (['PK', 'IN', 'BD', 'AF', 'LK'].includes(cc)) return 1;
  if (cc === 'TR') return 13;
  if (cc === 'FR') return 12;
  if (['US', 'CA', 'MX'].includes(cc)) return 2;
  // Europe + rest
  return 3;
}

const CALC_METHODS: { id: number; name: string }[] = [
  { id: 4, name: 'أم القرى (السعودية)' },
  { id: 5, name: 'الهيئة المصرية العامة' },
  { id: 8, name: 'الكويت / دول الخليج' },
  { id: 3, name: 'رابطة العالم الإسلامي (MWL)' },
  { id: 2, name: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)' },
  { id: 1, name: 'كراتشي (باكستان/الهند)' },
  { id: 7, name: 'طهران (إيران)' },
  { id: 13, name: 'ديانت (تركيا)' },
  { id: 12, name: 'الاتحاد الإسلامي الفرنسي' },
  { id: 15, name: 'رؤية الهلال (Moonsighting)' },
];


async function getNotifSW(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  // Block in Lovable preview / iframe — notifications won't work there anyway
  const host = window.location.hostname;
  const inIframe = window.self !== window.top;
  if (inIframe || host.startsWith('id-preview--') || host.startsWith('preview--') || host.endsWith('.lovableproject.com') || host.endsWith('.lovableproject-dev.com')) {
    return null;
  }
  try {
    const existing = await navigator.serviceWorker.getRegistration('/notification-sw.js');
    if (existing) return existing;
    return await navigator.serviceWorker.register('/notification-sw.js', { scope: '/' });
  } catch { return null; }
}

async function showPersistentNotification(title: string, body: string) {
  const reg = await getNotifSW();
  if (!reg) return;
  try {
    // Mark as enabled in SW state so it re-shows when dismissed.
    const target = reg.active || reg.waiting || reg.installing;
    if (target) {
      target.postMessage({ type: 'show-persistent', title, body });
      return;
    }
    await reg.showNotification(title, {
      body,
      tag: 'prayer-persistent',
      renotify: false,
      requireInteraction: true,
      silent: true,
      icon: '/icon.svg',
      badge: '/icon.svg',
      dir: 'rtl',
      lang: 'ar',
    } as NotificationOptions);
  } catch {}
}

async function clearPersistentNotification() {
  const reg = await getNotifSW();
  if (!reg) return;
  // Tell SW to stop re-spawning the sticky notification.
  const target = reg.active || reg.waiting || reg.installing;
  if (target) target.postMessage({ type: 'disable-persistent' });
  const notes = await reg.getNotifications({ tag: 'prayer-persistent' });
  notes.forEach(n => n.close());
}


export default function PrayerTimesClient() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [times, setTimes] = useState<Record<string, string>>({});
  const [location, setLocation] = useState('جاري تحديد الموقع...');
  const [qibla, setQibla] = useState<number>(0);
  const [nextPrayer, setNextPrayer] = useState<{ name: string; in: string; countdown: string } | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [previewing, setPreviewing] = useState(false);
  const [adhanModal, setAdhanModal] = useState<{ name: string; time: string } | null>(null);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [approxLocation, setApproxLocation] = useState(false);
  const [permState, setPermState] = useState<'granted' | 'denied' | 'prompt' | 'unsupported' | null>(null);
  const [countryCode, setCountryCode] = useState<string | undefined>(undefined);
  const coordsRef = useRef<{ lat: number; lon: number }>({ lat: 21.4225, lon: 39.8262 });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const triggeredRef = useRef<Set<string>>(new Set());
  const lastPersistentRef = useRef<string>('');
  const [nativeNotifPerm, setNativeNotifPerm] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const { subscribe: syncWebPush, unsubscribe: dropWebPush } = useWebPush();

  // Centralized adhan playback with browser-blocked-autoplay detection.
  // Returns true on success, false if blocked/failed (and surfaces a toast).
  const playAdhan = useCallback(async (overrideReciterId?: string, prayerName?: string): Promise<boolean> => {
    const reciter =
      ADHAN_RECITERS.find(r => r.id === (overrideReciterId || settings.reciterId)) ?? ADHAN_RECITERS[0];
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.src = reciter.url;
    audio.muted = false;
    audio.volume = 1;
    try {
      await audio.play();
      return true;
    } catch (err) {
      const name = (err as { name?: string })?.name || '';
      const blocked = name === 'NotAllowedError' || name === 'AbortError';
      if (blocked) {
        toast.error(
          prayerName ? `تعذّر تشغيل أذان ${prayerName} تلقائياً` : 'تعذّر تشغيل صوت الأذان تلقائياً',
          {
            description: 'منع المتصفح/النظام التشغيل التلقائي للصوت. اضغط "تشغيل الأذان" للسماح بالصوت الآن.',
            duration: 20000,
            action: {
              label: 'تشغيل الأذان',
              onClick: () => {
                audio.play().catch(() => {
                  toast.error('لم يتمكن المتصفح من تشغيل الصوت', {
                    description: 'تحقّق من إعدادات الصوت والسماح بالتشغيل التلقائي لهذا الموقع.',
                  });
                });
              },
            },
          },
        );
      } else {
        toast.error('تعذّر تشغيل صوت الأذان', {
          description: 'تحقّق من اتصال الإنترنت أو جرّب مُقرئاً آخر.',
          duration: 10000,
        });
      }
      return false;
    }
  }, [settings.reciterId]);

  // Request notification permission automatically on mount if needed
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          syncWebPush().catch(() => undefined);
        }
      });
    } else if (Notification.permission === 'granted') {
      syncWebPush().catch(() => undefined);
    }
  }, [syncWebPush]);

  // Keep background Web Push in sync with current settings + location.
  useEffect(() => {
    if (!mounted) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    const t = setTimeout(() => { syncWebPush().catch(() => undefined); }, 1500);
    return () => clearTimeout(t);
  }, [mounted, settings.reciterId, settings.enabledPrayers, syncWebPush]);

  // Load settings
  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setSettings({
          ...defaultSettings,
          ...parsed,
          notifyEnabled: parsed.notifyEnabled !== false,
          persistentEnabled: parsed.persistentEnabled !== false,
        });
      }
    } catch {}
  }, []);

  // Persist settings
  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
  }, [settings, mounted]);

  // ====== NATIVE APP (Capacitor) — schedule today's adhan locally ======
  useEffect(() => {
    if (!mounted || !isNativeApp()) return;
    (async () => {
      await ensureAdhanChannel();
      // If the user disabled alerts, clear any pending adhan and bail.
      if (!settings.notifyEnabled) {
        await cancelAllAdhan();
        return;
      }
      const ok = await ensureNotificationPermission();
      if (!ok) return;
      const hasAny = !!(times.Fajr || times.Dhuhr || times.Asr || times.Maghrib || times.Isha);
      if (!hasAny) return;
      await scheduleTodayAdhan(
        times as PrayerTimesMap,
        settings.enabledPrayers,
        settings.soundEnabled,
      );
    })().catch(() => {});
  }, [mounted, times, settings.enabledPrayers, settings.notifyEnabled, settings.soundEnabled]);

  // Auto-play adhan when arriving from a push notification (?adhan=Fajr...)
  useEffect(() => {
    if (!mounted) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const adhanKey = params.get('adhan');
    if (!adhanKey) return;
    const meta = PRAYER_META.find((p) => p.key === adhanKey);
    if (!meta) return;
    void playAdhan(undefined, meta.name);
    setAdhanModal({ name: meta.name, time: times[meta.key] ? to12h(times[meta.key]) : '' });
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('adhan');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    } catch {}
  }, [mounted, times, settings.reciterId]);

  // Listen for "play-adhan" messages from the service worker (background push).
  // When a prayer push arrives and the page is open, SW asks us to play audio
  // instead of showing a duplicate notification.
  useEffect(() => {
    if (!mounted) return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string; prayerKey?: string; reciterId?: string } | null;
      if (!data || data.type !== 'play-adhan') return;
      const meta = PRAYER_META.find((p) => p.key === data.prayerKey);
      if (!settings.soundEnabled) return;
      // Mark as triggered to prevent the local 1s tick from firing again.
      if (meta) {
        const todayKey = new Date().toISOString().slice(0, 10);
        triggeredRef.current.add(`${todayKey}-${meta.key}`);
      }
      void playAdhan(data.reciterId, meta?.name);
      if (meta) {
        setAdhanModal({ name: meta.name, time: times[meta.key] ? to12h(times[meta.key]) : '' });
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [mounted, times, settings.reciterId, settings.soundEnabled]);



  // Fetch prayer times by geolocation, honouring user calculation method + Asr school.
  const fetchTimes = useCallback(async (lat: number, lon: number, preloadedCity?: string, preloadedCC?: string) => {
    try {
      const today = new Date();
      const d = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
      const cc = preloadedCC ?? countryCode;
      const method = settings.calcMethod === 'auto' ? methodForCountry(cc) : settings.calcMethod;
      const school = settings.asrSchool;
      const [timingsRes, qiblaRes, geo] = await Promise.all([
        fetch(`https://api.aladhan.com/v1/timings/${d}?latitude=${lat}&longitude=${lon}&method=${method}&school=${school}`),
        fetch(`https://api.aladhan.com/v1/qibla/${lat}/${lon}`),
        preloadedCity ? Promise.resolve({ display: preloadedCity, countryCode: preloadedCC }) : reverseGeocode(lat, lon),
      ]);

      const data = await timingsRes.json();
      if (data?.data?.timings) {
        setTimes(data.data.timings);
        setLocation(geo.display || data.data.meta?.timezone || `${lat.toFixed(3)}, ${lon.toFixed(3)}`);
        if (geo.countryCode) setCountryCode(geo.countryCode);
      }

      const qData = await qiblaRes.json();
      if (typeof qData?.data?.direction === 'number') setQibla(Math.round(qData.data.direction));

      setLoading(false);
    } catch {
      setError('تعذر جلب المواقيت');
      setLoading(false);
    }
  }, [countryCode, settings.calcMethod, settings.asrSchool]);

  /** Try to acquire a real GPS fix. Returns true on success. */
  const acquireLocation = useCallback(async (forceFresh: boolean) => {
    try {
      const { getLocation, checkLocationPermission } = await import('@/lib/native/location');
      const fix = await getLocation({
        timeoutMs: 15000,
        highAccuracy: true,
        useCache: !forceFresh,
        maxCacheAgeMs: forceFresh ? 0 : 5 * 60 * 1000,
      });
      const perm = await checkLocationPermission();
      setPermState(perm as typeof permState);
      if (fix) {
        coordsRef.current = { lat: fix.latitude, lon: fix.longitude };
        setAccuracyM(typeof fix.accuracy === 'number' ? fix.accuracy : null);
        setApproxLocation(false);
        await fetchTimes(fix.latitude, fix.longitude);
        return true;
      }
    } catch {
      // ignore — fall through
    }
    return false;
  }, [fetchTimes]);

  // Initial location flow: explicit permission request, IP fallback only on failure.
  useEffect(() => {
    if (!mounted) return;
    (async () => {
      const ok = await acquireLocation(true);
      if (ok) return;

      // Permission denied / unavailable → fall back to IP-based coarse location.
      setLocation('جاري تحديد الموقع التقريبي عبر الشبكة...');
      const ip = await getLocationByIP();
      if (ip) {
        coordsRef.current = { lat: ip.lat, lon: ip.lon };
        setApproxLocation(true);
        setAccuracyM(null);
        await fetchTimes(ip.lat, ip.lon, ip.city, ip.countryCode);
        return;
      }
      // Last resort: Mecca defaults.
      setApproxLocation(true);
      await fetchTimes(coordsRef.current.lat, coordsRef.current.lon, 'مكة المكرمة، المملكة العربية السعودية', 'SA');
    })();

    // Auto-refresh at next midnight
    let dailyId: ReturnType<typeof setInterval> | null = null;
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    const midnightId = setTimeout(() => {
      fetchTimes(coordsRef.current.lat, coordsRef.current.lon);
      dailyId = setInterval(() => fetchTimes(coordsRef.current.lat, coordsRef.current.lon), 24 * 60 * 60 * 1000);
    }, nextMidnight.getTime() - now.getTime());

    return () => {
      clearTimeout(midnightId);
      if (dailyId) clearInterval(dailyId);
    };
  }, [mounted, acquireLocation, fetchTimes]);

  // Refetch times when the user changes calculation method / Asr school.
  useEffect(() => {
    if (!mounted) return;
    if (!times.Fajr) return; // skip until first load completes
    fetchTimes(coordsRef.current.lat, coordsRef.current.lon, location, countryCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.calcMethod, settings.asrSchool]);



  // Compute next prayer + handle triggers (adhan + notification)
  useEffect(() => {
    if (!times.Fajr) return;
    const tick = () => {
      const now = new Date();
      const todayKey = now.toISOString().slice(0, 10);
      let next: { key: string; name: string; date: Date } | null = null;
      for (const p of PRAYER_META) {
        const t = times[p.key];
        if (!t) continue;
        const tm = t.match(/^(\d{1,2}):(\d{1,2})/);
        if (!tm) continue;
        const h = parseInt(tm[1], 10);
        const m = parseInt(tm[2], 10);
        const d = new Date(now);
        d.setHours(h, m, 0, 0);
        const triggerId = `${todayKey}-${p.key}`;
        // Trigger if within last 60s
        const diff = (d.getTime() - now.getTime()) / 1000;
        if (diff <= 0 && diff > -60 && !triggeredRef.current.has(triggerId)) {
          triggeredRef.current.add(triggerId);
          if (settings.enabledPrayers[p.key]) {
            if (settings.soundEnabled) playAdhan();
            setAdhanModal({ name: p.name, time: to12h(t) });
            if (settings.notifyEnabled && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(`حان الآن وقت ${p.name}`, { body: `الساعة ${to12h(t)}`, icon: '/icon.svg' });
            }
          }
        }
        if (d.getTime() > now.getTime() && p.key !== 'Sunrise' && !next) {
          next = { key: p.key, name: p.name, date: d };
        }
      }
      let nextLabel: string | null = null;
      let nextName: string | null = null;
      let nextTimeStr: string | null = null;
      let h = 0, m = 0, s = 0;
      if (next) {
        const ms = next.date.getTime() - now.getTime();
        h = Math.floor(ms / 3600000);
        m = Math.floor((ms % 3600000) / 60000);
        s = Math.floor((ms % 60000) / 1000);
        nextLabel = `${h > 0 ? `${h} س ` : ''}${m} د ${s} ث`;
        nextName = next.name;
        nextTimeStr = to12h(times[next.key]);
        setNextPrayer({
          name: next.name,
          in: `${h > 0 ? `${h} س ` : ''}${m} د`,
          countdown: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        });
      } else {
        setNextPrayer(null);
      }

      // Update persistent notification (web SW + native ongoing).
      if (settings.persistentEnabled) {
        const title = nextName ? `🕌 ${nextName} • ${nextTimeStr}` : '🕌 مواقيت الصلاة';
        const bodySimple = nextName ? `الصلاة القادمة بعد ${h > 0 ? `${h} س ` : ''}${m} د` : '';
        const body = [
          bodySimple,
          todayGregorian(),
          todayHijri(),
        ].filter(Boolean).join('  •  ');
        if (isNativeApp()) {
          // Throttle native updates — only push when minute or prayer changed.
          const sig = `${nextName ?? ''}|${h}|${m}`;
          if (sig !== lastPersistentRef.current) {
            lastPersistentRef.current = sig;
            showPersistentNextPrayer(title, body);
          }
        } else if ('Notification' in window && Notification.permission === 'granted') {
          showPersistentNotification(title, body);
        }
      }
    };
    tick();
    const id = setInterval(tick, 1000); // تحديث كل ثانية للمتابعة المباشرة
    return () => clearInterval(id);
  }, [times, settings]);



  const togglePreview = () => {
    if (previewing) {
      audioRef.current?.pause();
      setPreviewing(false);
    } else {
      playAdhan();
      setPreviewing(true);
      if (audioRef.current) {
        audioRef.current.onended = () => setPreviewing(false);
      }
    }
  };

  const requestNotifyPermission = async () => {
    // Native (Android/iOS APK): use Capacitor LocalNotifications permission flow.
    if (isNativeApp()) {
      const current = await getNativeNotificationPermission();
      if (current === 'granted') {
        setSettings(s => ({ ...s, notifyEnabled: !s.notifyEnabled }));
        return;
      }
      if (current === 'denied') {
        setNativeNotifPerm('denied');
        alert('الإشعارات مرفوضة. افتح إعدادات التطبيق ثم فعّل الإشعارات لتلقّي الأذان.');
        return;
      }
      const ok = await ensureNotificationPermission();
      setNativeNotifPerm(ok ? 'granted' : 'denied');
      if (ok) setSettings(s => ({ ...s, notifyEnabled: true }));
      return;
    }
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      setSettings(s => ({ ...s, notifyEnabled: !s.notifyEnabled }));
      return;
    }
    const res = await Notification.requestPermission();
    if (res === 'granted') {
      setSettings(s => ({ ...s, notifyEnabled: true }));
      new Notification('تم تفعيل التنبيهات', { body: 'سنذكّرك بأوقات الصلاة' });
    }
  };

  // Track native permission state for UI labels.
  useEffect(() => {
    if (!isNativeApp()) return;
    getNativeNotificationPermission().then(setNativeNotifPerm);
  }, [mounted]);

  if (!mounted) return null;

  const prayerList: Prayer[] = PRAYER_META.map(p => ({ ...p, time: to12h(times[p.key]) }));

  return (
    <div className="pt-24 pb-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-emerald-800/30 mb-4">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-cairo text-sm">مواقيت الصلاة</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3" style={{ fontFamily: 'Amiri, serif' }}>
            مواقيت الصلاة
          </h1>

          {/* Live countdown timer */}
          {nextPrayer && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-6 inline-block"
            >
              <div className="glass-card rounded-2xl p-6 border border-emerald-500/30 inline-block min-w-[280px]">
                <p className="text-emerald-300 font-cairo text-lg mb-2">
                  الصلاة القادمة: <span className="text-white font-bold">{nextPrayer.name}</span>
                </p>
                <div className="flex items-center justify-center gap-1 text-4xl md:text-5xl font-mono text-emerald-400 neon-emerald rounded-xl px-4 py-2">
                  <span className="bg-emerald-950/60 rounded-lg px-3 py-1">{nextPrayer.countdown?.split(':')[0]}</span>
                  <span className="text-emerald-500 animate-pulse">:</span>
                  <span className="bg-emerald-950/60 rounded-lg px-3 py-1">{nextPrayer.countdown?.split(':')[1]}</span>
                  <span className="text-emerald-500 animate-pulse">:</span>
                  <span className="bg-emerald-950/60 rounded-lg px-3 py-1">{nextPrayer.countdown?.split(':')[2]}</span>
                </div>
                <p className="text-gray-500 text-xs font-cairo mt-2">س : د : ث</p>
              </div>
            </motion.div>
          )}

          {!nextPrayer && (
            <p className="text-gray-400 font-cairo">أوقات الصلاة طوال اليوم</p>
          )}
        </motion.div>

        {/* Location + Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-6 mb-6 border border-emerald-900/40"
        >
          <div className="flex items-center gap-4 mb-3">
            <MapPin className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-gray-400 text-sm font-cairo">الموقع</p>
              <p className="text-white font-cairo truncate">{location}</p>
            </div>
            {loading && <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />}
            <button
              type="button"
              onClick={() => { setLoading(true); acquireLocation(true).then((ok) => { if (!ok) setLoading(false); }); }}
              className="px-3 py-1.5 rounded-lg bg-emerald-900/40 border border-emerald-700/40 text-emerald-300 font-cairo text-xs hover:bg-emerald-900/70"
            >
              تحديث الموقع
            </button>
          </div>

          {/* Location accuracy + warnings */}
          <div className="flex flex-wrap gap-2 mb-5 text-xs font-cairo">
            {accuracyM != null && (
              <span className={`px-3 py-1 rounded-full border ${accuracyM > 2000 ? 'bg-amber-950/40 border-amber-800/50 text-amber-300' : 'bg-emerald-950/40 border-emerald-900/40 text-emerald-300'}`}>
                دقة الموقع ±{Math.round(accuracyM)} م
              </span>
            )}
            {approxLocation && (
              <span className="px-3 py-1 rounded-full bg-amber-950/40 border border-amber-800/50 text-amber-300">
                موقع تقريبي عبر الشبكة — التوقيت قد ينحرف
              </span>
            )}
            {permState === 'denied' && (
              <span className="px-3 py-1 rounded-full bg-rose-950/40 border border-rose-800/50 text-rose-300">
                صلاحية الموقع مرفوضة — فعّلها من الإعدادات لدقة أفضل
              </span>
            )}
          </div>

          {/* Calculation method + Asr school */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-gray-400 text-xs font-cairo mb-2">طريقة الحساب</label>
              <select
                value={String(settings.calcMethod)}
                onChange={e => setSettings(s => ({ ...s, calcMethod: e.target.value === 'auto' ? 'auto' : Number(e.target.value) }))}
                className="w-full px-3 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-white font-cairo text-sm focus:outline-none focus:border-emerald-500"
                style={{ direction: 'rtl' }}
              >
                <option value="auto" className="bg-gray-900">تلقائي حسب الدولة{countryCode ? ` (${countryCode})` : ''}</option>
                {CALC_METHODS.map(m => (
                  <option key={m.id} value={m.id} className="bg-gray-900">{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-cairo mb-2">مذهب حساب العصر</label>
              <select
                value={settings.asrSchool}
                onChange={e => setSettings(s => ({ ...s, asrSchool: Number(e.target.value) as 0 | 1 }))}
                className="w-full px-3 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-white font-cairo text-sm focus:outline-none focus:border-emerald-500"
                style={{ direction: 'rtl' }}
              >
                <option value={0} className="bg-gray-900">الجمهور (شافعي/مالكي/حنبلي)</option>
                <option value={1} className="bg-gray-900">حنفي</option>
              </select>
            </div>
          </div>

          {/* Reciter selector */}
          <div className="mb-4">
            <label className="block text-gray-400 text-xs font-cairo mb-2">صوت الأذان</label>
            <div className="flex gap-2">
              <select
                value={settings.reciterId}
                onChange={e => setSettings(s => ({ ...s, reciterId: e.target.value }))}
                className="flex-1 px-3 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-white font-cairo text-sm focus:outline-none focus:border-emerald-500"
                style={{ direction: 'rtl' }}
              >
                {ADHAN_RECITERS.map(r => (
                  <option key={r.id} value={r.id} className="bg-gray-900">{r.name}</option>
                ))}
              </select>
              <button
                onClick={togglePreview}
                className="px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 transition-all"
                aria-label="استماع"
              >
                {previewing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span className="font-cairo text-sm hidden sm:inline">استماع</span>
              </button>
            </div>
          </div>


          {/* Toggles */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-cairo text-sm transition-all ${
                settings.soundEnabled
                  ? 'bg-emerald-900/60 border-emerald-600 text-emerald-200'
                  : 'glass border-emerald-900/40 text-gray-400'
              }`}
            >
              {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {settings.soundEnabled ? 'الأذان مفعّل' : 'الأذان متوقف'}
            </button>
            <button
              onClick={requestNotifyPermission}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-cairo text-sm transition-all ${
                settings.notifyEnabled
                  ? 'bg-emerald-900/60 border-emerald-600 text-emerald-200'
                  : 'glass border-emerald-900/40 text-gray-400'
              }`}
            >
              {settings.notifyEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              {isNativeApp() && nativeNotifPerm === 'denied'
                ? 'مرفوض — افتح الإعدادات'
                : settings.notifyEnabled ? 'الإشعارات مفعّلة' : 'تفعيل الإشعارات'}
            </button>
            <button
              onClick={async () => {
                const newVal = !settings.persistentEnabled;
                if (newVal) {
                  if (isNativeApp()) {
                    const ok = await ensureNotificationPermission();
                    if (!ok) {
                      alert('يلزم السماح بالإشعارات لعرض الإشعار الدائم.');
                      return;
                    }
                    await ensureAdhanChannel();
                    setSettings(s => ({ ...s, persistentEnabled: true, notifyEnabled: true }));
                    return;
                  }
                  if (!('Notification' in window)) return;
                  if (Notification.permission !== 'granted') {
                    const res = await Notification.requestPermission();
                    if (res !== 'granted') return;
                  }
                  const reg = await getNotifSW();
                  if (!reg) {
                    alert('الإشعار الدائم يعمل فقط على الموقع المنشور (ليس داخل المعاينة).');
                    return;
                  }
                  setSettings(s => ({ ...s, persistentEnabled: true, notifyEnabled: true }));
                } else {
                  if (isNativeApp()) {
                    await clearPersistentNextPrayer();
                    lastPersistentRef.current = '';
                  } else {
                    await clearPersistentNotification();
                  }
                  setSettings(s => ({ ...s, persistentEnabled: false }));
                }
              }}
              className={`col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-cairo text-sm transition-all ${
                settings.persistentEnabled
                  ? 'bg-emerald-900/60 border-emerald-600 text-emerald-200'
                  : 'glass border-emerald-900/40 text-gray-400'
              }`}
            >
              <Bell className="w-4 h-4" />
              {settings.persistentEnabled ? 'الإشعار الدائم في شريط الإشعارات مفعّل' : 'تثبيت إشعار دائم في شريط الإشعارات'}
            </button>
          </div>
        </motion.div>

        {/* Background limitation notice */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card rounded-2xl p-4 mb-6 border border-emerald-900/40 flex items-start gap-3"
        >
          <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-gray-300 font-cairo text-xs leading-relaxed">
            <span className="text-emerald-300 font-semibold">الإشعار الدائم</span> يظهر في شريط الإشعارات ويتحدّث كل دقيقة بالصلاة القادمة والتاريخ الميلادي والهجري — يعمل فقط على <span className="text-emerald-300">الموقع المنشور</span> (وليس داخل المعاينة)، ويبقى ظاهراً ما دامت الصفحة مفتوحة. لإشعار يعمل والصفحة مقفولة كلياً يلزم تطبيق Android.
          </p>
        </motion.div>

        {error && (
          <div className="glass-card rounded-2xl p-4 mb-6 border border-red-900/50 text-red-300 text-center font-cairo text-sm">
            {error}
          </div>
        )}

        {/* Prayer Times Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {prayerList.map((prayer, idx) => {
            const enabled = settings.enabledPrayers[prayer.key];
            const isToggleable = prayer.key !== 'Sunrise';
            return (
              <motion.div
                key={prayer.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + idx * 0.05 }}
                className="relative overflow-hidden rounded-2xl p-6 glass border border-emerald-900/40"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${prayer.color} opacity-10`} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{prayer.icon}</span>
                    <p className="text-3xl font-bold text-emerald-400 font-mono">{prayer.time}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-white font-cairo font-semibold">{prayer.name}</p>
                    {isToggleable && (
                      <button
                        onClick={() => setSettings(s => ({
                          ...s,
                          enabledPrayers: { ...s.enabledPrayers, [prayer.key]: !enabled }
                        }))}
                        className={`w-10 h-5 rounded-full relative transition-colors ${
                          enabled ? 'bg-emerald-500' : 'bg-gray-700'
                        }`}
                        aria-label="تفعيل"
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                          enabled ? 'right-0.5' : 'right-5'
                        }`} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Qibla */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-2xl p-8 border border-emerald-900/40 text-center"
        >
          <Compass className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2 font-cairo">اتجاه القبلة</h3>
          <p className="text-gray-400 font-cairo mb-4">{qibla}° من الشمال</p>
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-4 border-emerald-500 relative">
            <div
              className="absolute w-1 h-12 bg-emerald-400"
              style={{ transform: `translateY(-3.75rem) rotate(${qibla}deg)`, transformOrigin: 'bottom center' }}
            />
            <span className="text-4xl">🕌</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-10 text-center"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-900/40 border border-emerald-700/40 text-emerald-400 hover:bg-emerald-900/60 transition-all"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="font-cairo">العودة للرئيسية</span>
          </Link>
        </motion.div>
      </div>

      <AdhanModal
        open={adhanModal !== null}
        prayerName={adhanModal?.name ?? ''}
        time12={adhanModal?.time ?? ''}
        onClose={() => {
          audioRef.current?.pause();
          setAdhanModal(null);
        }}
      />

      <NotificationPermissionModal
        onEnable={() => setSettings(s => ({ ...s, notifyEnabled: true, persistentEnabled: true }))}
        onDismiss={() => {}}
      />
    </div>
  );
}
