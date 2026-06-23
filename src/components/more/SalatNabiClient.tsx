import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import {
  ArrowRight, Bell, BellOff, Volume2, VolumeX, PlayCircle, PauseCircle, MoonStar, Clock, Heart, Plus, RefreshCw, Info,
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  DEFAULT_SALAT_NABI_PREFS,
  ensureSalatNabiChannel,
  scheduleSalatNabi,
  cancelAllSalatNabi,
  computeUpcomingTimes,
  playFallbackChime,
  isNativeApp,
  getSoundVariantUrl,
  SALAT_NABI_SOUND_VARIANTS,
  type SalatNabiPrefs,
  type SalatNabiFrequency,
  type SalatNabiSoundVariant,
} from '@/lib/native/salatNabiScheduler';

const FREQ_OPTIONS: { value: SalatNabiFrequency; label: string }[] = [
  { value: 'm30', label: 'كل ٣٠ دقيقة' },
  { value: 'h1', label: 'كل ساعة' },
  { value: 'h2', label: 'كل ساعتين' },
  { value: 'h3', label: 'كل ٣ ساعات' },
  { value: 'daily', label: 'مرة في اليوم' },
  { value: 'friday', label: 'الجمعة فقط' },
];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export default function SalatNabiClient() {
  const [prefs, setPrefs] = useLocalStorage<SalatNabiPrefs>('salat-nabi-prefs', DEFAULT_SALAT_NABI_PREFS);
  const [counter, setCounter] = useLocalStorage<{ date: string; count: number }>('salat-nabi-counter', {
    date: todayKey(),
    count: 0,
  });

  // Migrate any old soundVariant values (e.g. 'short'/'medium') no longer in the variants list.
  useEffect(() => {
    if (!SALAT_NABI_SOUND_VARIANTS.some((v) => v.value === prefs.soundVariant)) {
      setPrefs({ ...prefs, soundVariant: DEFAULT_SALAT_NABI_PREFS.soundVariant });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [webPerm, setWebPerm] = useState<NotificationPermission | 'unsupported'>('default');
  const [statusMsg, setStatusMsg] = useState('');
  const [playingVariant, setPlayingVariant] = useState<SalatNabiSoundVariant | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const webIntervalRef = useRef<number | null>(null);
  const lastFiredRef = useRef<number>(0);

  // Reset daily counter at midnight crossing.
  useEffect(() => {
    if (counter.date !== todayKey()) {
      setCounter({ date: todayKey(), count: 0 });
    }
  }, [counter.date, setCounter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof Notification === 'undefined') {
      setWebPerm('unsupported');
    } else {
      setWebPerm(Notification.permission);
    }
    void ensureSalatNabiChannel();
  }, []);

  // (Re)schedule whenever prefs change.
  useEffect(() => {
    void (async () => {
      if (isNativeApp()) {
        try {
          await scheduleSalatNabi(prefs);
          setStatusMsg(prefs.enabled ? 'تم تفعيل التذكير ✅' : '');
        } catch {
          setStatusMsg('تعذّر جدولة الإشعارات.');
        }
      }
    })();
  }, [prefs]);

  // Web in-app reminder loop (only when the tab is open).
  useEffect(() => {
    if (isNativeApp()) return;
    if (webIntervalRef.current != null) {
      window.clearInterval(webIntervalRef.current);
      webIntervalRef.current = null;
    }
    if (!prefs.enabled) return;

    const tick = () => {
      const upcoming = computeUpcomingTimes(prefs, 1);
      const next = upcoming[0];
      if (!next) return;
      const now = Date.now();
      // Fire once when within 30s of a scheduled slot and we haven't fired in the last 60s.
      if (next.getTime() - now <= 30_000 && now - lastFiredRef.current > 60_000) {
        lastFiredRef.current = now;
        fireWebNotification();
      }
    };
    tick();
    webIntervalRef.current = window.setInterval(tick, 20_000);
    return () => {
      if (webIntervalRef.current != null) window.clearInterval(webIntervalRef.current);
      webIntervalRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.enabled, prefs.frequency, prefs.chosenTime, prefs.quietStart, prefs.quietEnd, prefs.soundEnabled, prefs.useCustomSound]);

  const fireWebNotification = useCallback(() => {
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('الصلاة على النبي ﷺ', {
          body: 'اللهم صلِّ وسلِّم على نبينا محمد ﷺ',
          icon: '/icon-192.png',
          tag: 'salat-nabi',
        });
      }
    } catch {}
    if (prefs.soundEnabled) playSound();
  }, [prefs.soundEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopAudio = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      try { a.pause(); a.currentTime = 0; } catch {}
      audioRef.current = null;
    }
    setPlayingVariant(null);
  }, []);

  const playSound = useCallback((variantOverride?: SalatNabiSoundVariant) => {
    const variant = variantOverride ?? prefs.soundVariant;

    // Toggle: if the same variant is already playing, stop it.
    if (variantOverride && playingVariant === variantOverride) {
      stopAudio();
      return;
    }

    // Always stop any currently playing audio before starting a new one.
    stopAudio();

    if (!variantOverride && !prefs.useCustomSound) {
      playFallbackChime();
      return;
    }

    const url = getSoundVariantUrl(variant);
    if (!url) {
      playFallbackChime();
      return;
    }

    setPlayingVariant(variant);
    setStatusMsg(variant === 'ai' ? 'جاري تجهيز الصوت…' : '');

    const isSameOrigin = url.startsWith('/');
    let objectUrl: string | null = null;

    const startWith = (src: string) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      if (!isSameOrigin) audio.crossOrigin = 'anonymous';
      audio.onended = () => {
        if (audioRef.current === audio) audioRef.current = null;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        setPlayingVariant((cur) => (cur === variant ? null : cur));
      };
      audioRef.current = audio;
      audio.play().then(() => {
        setStatusMsg('');
      }).catch((err) => {
        console.warn('[salat-nabi] audio play failed', err);
        if (audioRef.current === audio) audioRef.current = null;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        setPlayingVariant((cur) => (cur === variant ? null : cur));
        setStatusMsg('تعذّر تشغيل الصوت — حاول مرة أخرى.');
        playFallbackChime();
      });
    };

    // For our same-origin TTS endpoint, fetch with credentials so it works
    // inside the auth-gated preview iframe (where <audio src> can't follow
    // the auth redirect). Then play via blob URL.
    if (isSameOrigin) {
      fetch(url, { credentials: 'include', cache: 'force-cache' })
        .then(async (res) => {
          const ct = res.headers.get('content-type') || '';
          if (!res.ok || !ct.startsWith('audio/')) {
            throw new Error(`bad response ${res.status} ${ct}`);
          }
          const blob = await res.blob();
          objectUrl = URL.createObjectURL(blob);
          startWith(objectUrl);
        })
        .catch((err) => {
          console.warn('[salat-nabi] tts fetch failed', err);
          setPlayingVariant((cur) => (cur === variant ? null : cur));
          setStatusMsg('تعذّر تجهيز صوت الذكاء الاصطناعي — حاول مرة أخرى.');
          playFallbackChime();
        });
    } else {
      startWith(url);
    }
  }, [prefs.useCustomSound, prefs.soundVariant, playingVariant, stopAudio]);


  const requestWebPerm = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    const r = await Notification.requestPermission();
    setWebPerm(r);
  }, []);

  const togglePref = useCallback(<K extends keyof SalatNabiPrefs>(key: K, value: SalatNabiPrefs[K]) => {
    setPrefs({ ...prefs, [key]: value });
  }, [prefs, setPrefs]);

  const handleEnableToggle = useCallback(async () => {
    const next = !prefs.enabled;
    if (next && !isNativeApp() && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      await requestWebPerm();
    }
    togglePref('enabled', next);
    if (!next && isNativeApp()) {
      await cancelAllSalatNabi();
    }
  }, [prefs.enabled, requestWebPerm, togglePref]);

  const incrementCounter = useCallback(() => {
    setCounter({ date: todayKey(), count: counter.count + 1 });
  }, [counter.count, setCounter]);

  const previewNotification = useCallback(() => {
    fireWebNotification();
    if (!prefs.soundEnabled) playSound(); // always demo sound on preview
  }, [fireWebNotification, prefs.soundEnabled, playSound]);

  const upcoming = useMemo(() => computeUpcomingTimes(prefs, 5), [prefs]);

  return (
    <div className="pt-24 pb-28" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-emerald-800/30 mb-4">
            <Heart className="w-4 h-4 text-rose-300 fill-rose-300/40" />
            <span className="text-emerald-300 font-cairo text-sm">تذكير</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Amiri, serif' }}>
            الصلاة على النبي ﷺ
          </h1>
          <p className="text-gray-400 font-cairo text-sm leading-relaxed">
            «مَنْ صَلَّى عَلَيَّ وَاحِدَةً صَلَّى اللَّهُ عَلَيْهِ بِهَا عَشْرًا» — اضبط تذكيرًا دوريًا لا تنقطع به عن الصلاة على الحبيب ﷺ.
          </p>
        </motion.div>

        {/* Counter */}
        <div className="mb-6 glass-card border border-emerald-800/40 rounded-2xl p-5 text-center">
          <p className="text-emerald-200/80 font-cairo text-xs mb-1">صلواتك على النبي اليوم</p>
          <p className="text-5xl text-amber-300 font-bold tabular-nums" style={{ fontFamily: 'Amiri, serif' }}>
            {counter.count.toLocaleString('ar-EG')}
          </p>
          <button
            type="button"
            onClick={incrementCounter}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-cairo transition-all shadow-lg shadow-emerald-900/30"
          >
            <Plus className="w-4 h-4" />
            صليت على النبي
          </button>
        </div>

        {/* Main toggle */}
        <div className="mb-4 glass-card border border-emerald-800/40 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${prefs.enabled ? 'bg-emerald-600/30 border border-emerald-500/40' : 'bg-white/5 border border-white/10'}`}>
                {prefs.enabled ? <Bell className="w-5 h-5 text-emerald-300" /> : <BellOff className="w-5 h-5 text-gray-400" />}
              </div>
              <div>
                <p className="text-white font-cairo font-semibold">تفعيل التذكير</p>
                <p className="text-gray-400 font-cairo text-xs">إشعار دوري بالصلاة على النبي ﷺ</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.enabled}
              onClick={handleEnableToggle}
              className={`relative w-14 h-8 rounded-full transition-colors ${prefs.enabled ? 'bg-emerald-500' : 'bg-white/10'}`}
            >
              <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${prefs.enabled ? 'right-1' : 'right-7'}`} />
            </button>
          </div>

          {!isNativeApp() && webPerm !== 'granted' && webPerm !== 'unsupported' && prefs.enabled && (
            <button
              type="button"
              onClick={requestWebPerm}
              className="mt-4 w-full px-4 py-2.5 rounded-xl bg-amber-600/30 border border-amber-500/40 text-amber-200 font-cairo text-sm hover:bg-amber-600/40 transition-all"
            >
              السماح بالإشعارات في المتصفح
            </button>
          )}
          {!isNativeApp() && webPerm === 'denied' && prefs.enabled && (
            <p className="mt-3 text-rose-300 font-cairo text-xs">
              الإشعارات مرفوضة من المتصفح. فعّلها من إعدادات الموقع لتصلك التذكيرات.
            </p>
          )}
          {statusMsg && (
            <p className="mt-3 text-emerald-300 font-cairo text-xs">{statusMsg}</p>
          )}
        </div>

        {/* Frequency */}
        <div className="mb-4 glass-card border border-emerald-800/40 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-emerald-300" />
            <h3 className="text-white font-cairo font-semibold">التكرار</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {FREQ_OPTIONS.map((opt) => {
              const active = prefs.frequency === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => togglePref('frequency', opt.value)}
                  className={`px-3 py-2.5 rounded-xl font-cairo text-sm transition-all border ${
                    active
                      ? 'bg-emerald-600/30 border-emerald-500/60 text-emerald-100'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {(prefs.frequency === 'daily' || prefs.frequency === 'friday') && (
            <div className="mt-4">
              <label className="block text-gray-300 font-cairo text-xs mb-2">وقت الإشعار</label>
              <input
                type="time"
                value={prefs.chosenTime}
                onChange={(e) => togglePref('chosenTime', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-cairo focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}
        </div>

        {/* Sound */}
        <div className="mb-4 glass-card border border-emerald-800/40 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {prefs.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-300" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
              <h3 className="text-white font-cairo font-semibold">الصوت</h3>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.soundEnabled}
              onClick={() => togglePref('soundEnabled', !prefs.soundEnabled)}
              className={`relative w-12 h-7 rounded-full transition-colors ${prefs.soundEnabled ? 'bg-emerald-500' : 'bg-white/10'}`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${prefs.soundEnabled ? 'right-1' : 'right-6'}`} />
            </button>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.useCustomSound}
              disabled={!prefs.soundEnabled}
              onChange={(e) => togglePref('useCustomSound', e.target.checked)}
              className="mt-1 w-4 h-4 accent-emerald-500"
            />
            <div className="flex-1">
              <p className="text-white font-cairo text-sm">تلاوة الصلاة على النبي ﷺ</p>
              <p className="text-gray-400 font-cairo text-xs mt-0.5">عند الإيقاف يُستخدم صوت تنبيه افتراضي.</p>
            </div>
          </label>

          {prefs.soundEnabled && prefs.useCustomSound && (
            <div className="mt-4 space-y-2">
              <p className="text-gray-300 font-cairo text-xs mb-2">اختر صيغة التلاوة</p>
              {SALAT_NABI_SOUND_VARIANTS.map((v) => {
                const active = prefs.soundVariant === v.value;
                return (
                  <div
                    key={v.value}
                    className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border transition-all ${
                      active
                        ? 'bg-emerald-600/20 border-emerald-500/60'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => togglePref('soundVariant', v.value)}
                      className="flex-1 text-right"
                    >
                      <p className={`font-cairo text-sm ${active ? 'text-emerald-100' : 'text-white'}`}>{v.label}</p>
                      <p className="text-gray-400 font-cairo text-xs mt-0.5">{v.description}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => playSound(v.value)}
                      aria-label={playingVariant === v.value ? `إيقاف: ${v.label}` : `استماع: ${v.label}`}
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors ${
                        playingVariant === v.value
                          ? 'bg-amber-600/50 hover:bg-amber-500/60 border-amber-400/60 text-amber-50'
                          : 'bg-emerald-700/40 hover:bg-emerald-600/60 border-emerald-500/40 text-emerald-100'
                      }`}
                    >
                      {playingVariant === v.value ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={previewNotification}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-emerald-200 font-cairo text-sm transition-all"
          >
            <PlayCircle className="w-4 h-4" />
            معاينة الإشعار والصوت
          </button>
        </div>

        {/* Quiet hours */}
        <div className="mb-4 glass-card border border-emerald-800/40 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <MoonStar className="w-4 h-4 text-indigo-300" />
            <h3 className="text-white font-cairo font-semibold">أوقات الهدوء (لا إشعارات)</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-gray-300 font-cairo text-xs mb-2">من</span>
              <input
                type="time"
                value={prefs.quietStart}
                onChange={(e) => togglePref('quietStart', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-cairo focus:outline-none focus:border-emerald-500"
              />
            </label>
            <label className="block">
              <span className="block text-gray-300 font-cairo text-xs mb-2">إلى</span>
              <input
                type="time"
                value={prefs.quietEnd}
                onChange={(e) => togglePref('quietEnd', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-cairo focus:outline-none focus:border-emerald-500"
              />
            </label>
          </div>
        </div>

        {/* Upcoming preview */}
        {prefs.enabled && upcoming.length > 0 && (
          <div className="mb-4 glass-card border border-emerald-800/40 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-cairo font-semibold flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-300" />
                التذكيرات القادمة
              </h3>
            </div>
            <ul className="space-y-2">
              {upcoming.map((d, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-gray-200 font-cairo text-sm"
                >
                  <span>{d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                  <span className="text-emerald-300 tabular-nums">
                    {d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isNativeApp() && (
          <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-950/30 border border-amber-900/40">
            <Info className="w-4 h-4 text-amber-300 mt-0.5 flex-shrink-0" />
            <p className="text-amber-200 font-cairo text-xs leading-relaxed">
              في المتصفح يصلك الإشعار طالما الموقع مفتوح. للحصول على تذكير حتى مع إغلاق التطبيق ثبّت نسخة الأندرويد.
            </p>
          </div>
        )}

        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-900/40 border border-emerald-700/40 text-emerald-300 hover:bg-emerald-900/60 transition-all font-cairo"
          >
            <ArrowRight className="w-4 h-4" />
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
