import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { Compass, ArrowRight, MapPin, CheckCircle2, Settings, X, Loader2, ShieldCheck, RefreshCw, WifiOff } from 'lucide-react';
import { getLocation, watchLocation, checkLocationPermission, getCachedLocation, type PermissionState, type LocationFix } from '@/lib/native/location';
import { openAppSettings } from '@/lib/native/openAppSettings';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Exact Kaaba coordinates (center of the Holy Mosque)
const KAABA = { lat: 21.4224779, lon: 39.8251832 };

function bearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const f1 = toRad(lat1), f2 = toRad(lat2), dl = toRad(lon2 - lon1);
  const y = Math.sin(dl) * Math.cos(f2);
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const QIBLA_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function angleDiff(a: number, b: number) {
  const d = ((a - b) % 360 + 540) % 360 - 180;
  return d;
}

export default function QiblaClient() {
  const [qibla, setQibla] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [distKm, setDistKm] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const [needsPerm, setNeedsPerm] = useState(false);
  const [absolute, setAbsolute] = useState(false);
  const [locPerm, setLocPerm] = useState<PermissionState>('prompt');
  const [showRationale, setShowRationale] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [denyCount, setDenyCount] = useLocalStorage<number>('qibla-deny-count', 0);
  const [source, setSource] = useState<LocationFix['source'] | null>(null);
  // Used only to flip a static "aligned" UI state — not the per-frame heading.
  const [alignedUi, setAlignedUi] = useState(false);

  const unwatchRef = useRef<(() => void) | null>(null);
  // Heading lives in refs to avoid re-rendering on every (~60Hz) sensor event,
  // which is the root cause of the scroll jitter the user reported.
  const headingRef = useRef(0);
  const qiblaRef = useRef<number | null>(null);
  const needleRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const rafPendingRef = useRef(false);

  const scheduleNeedleUpdate = useCallback(() => {
    if (rafPendingRef.current) return;
    rafPendingRef.current = true;
    rafRef.current = requestAnimationFrame(() => {
      rafPendingRef.current = false;
      const q = qiblaRef.current;
      if (q == null) return;
      const rot = q - headingRef.current;
      if (needleRef.current) {
        needleRef.current.style.transform = `rotate(${rot}deg)`;
      }
      const d = Math.abs(angleDiff(q, headingRef.current));
      const nowAligned = d <= 3;
      setAlignedUi((prev) => (prev === nowAligned ? prev : nowAligned));
    });
  }, []);

  const applyPos = useCallback(
    (lat: number, lon: number, acc?: number, src?: LocationFix['source']) => {
      const b = bearing(lat, lon, KAABA.lat, KAABA.lon);
      qiblaRef.current = b;
      setQibla(b);
      setDistKm(distanceKm(lat, lon, KAABA.lat, KAABA.lon));
      if (typeof acc === 'number') setAccuracy(acc);
      if (src) setSource(src);
      scheduleNeedleUpdate();
    },
    [scheduleNeedleUpdate],
  );

  const stopWatching = useCallback(() => {
    unwatchRef.current?.();
    unwatchRef.current = null;
  }, []);

  useEffect(() => {
    const cached = getCachedLocation(30 * 24 * 60 * 60 * 1000);
    if (cached) {
      applyPos(cached.latitude, cached.longitude, cached.accuracy, cached.source);
    }
    void checkLocationPermission().then(setLocPerm);
  }, [applyPos]);

  const doRequestLocation = async () => {
    setErr('');
    setRequesting(true);
    try {
      const fix = await getLocation({ useCache: false, maxCacheAgeMs: QIBLA_CACHE_MAX_AGE_MS });
      const state = await checkLocationPermission();
      setLocPerm(state);
      if (fix) {
        setDenyCount(0);
        applyPos(fix.latitude, fix.longitude, fix.accuracy, fix.source);
        // Only watch briefly until we get a good fix, then stop —
        // continuous GPS updates cause unnecessary re-renders and battery drain
        // while the user is standing still to read the compass.
        stopWatching();
        if (typeof fix.accuracy !== 'number' || fix.accuracy > 50) {
          unwatchRef.current = watchLocation(
            (f) => {
              applyPos(f.latitude, f.longitude, f.accuracy, f.source);
              if (typeof f.accuracy === 'number' && f.accuracy <= 50) {
                stopWatching();
              }
            },
            () => undefined,
          );
        }
        return;
      }
      if (state === 'denied') {
        setDenyCount(denyCount + 1);
        setErr('تم رفض صلاحية الموقع.');
      } else if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setErr('لا يوجد اتصال بالإنترنت ولا يوجد موقع محفوظ. فعّل الإنترنت لأول مرة فقط.');
      } else {
        setErr('تعذّر تحديد الموقع. تأكد من تفعيل خدمة الموقع على الجهاز ثم أعد المحاولة.');
      }
    } finally {
      setRequesting(false);
    }
  };

  const handleStartClick = () => {
    if (locPerm === 'denied' && denyCount >= 2) return;
    setShowRationale(true);
  };

  const handleAllowFromRationale = async () => {
    setShowRationale(false);
    await doRequestLocation();
  };

  const handleOpenSettings = async () => {
    const ok = await openAppSettings();
    if (!ok) {
      setErr('افتح إعدادات المتصفح/التطبيق يدويًا وفعّل صلاحية الموقع.');
    }
  };

  useEffect(() => {
    return () => {
      stopWatching();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [stopWatching]);

  useEffect(() => {
    let gotAbsolute = false;
    const handler = (e: DeviceOrientationEvent) => {
      const webkit = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof webkit === 'number') {
        headingRef.current = webkit;
        if (!gotAbsolute) { gotAbsolute = true; setAbsolute(true); }
        scheduleNeedleUpdate();
        return;
      }
      if (e.alpha != null) {
        const isAbs = (e as DeviceOrientationEvent & { absolute?: boolean }).absolute === true;
        if (isAbs && !gotAbsolute) { gotAbsolute = true; setAbsolute(true); }
        headingRef.current = (360 - e.alpha) % 360;
        scheduleNeedleUpdate();
      }
    };

    const DOE = (window as unknown as {
      DeviceOrientationEvent?: { requestPermission?: () => Promise<string> };
    }).DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === 'function') {
      setNeedsPerm(true);
      return;
    }
    window.addEventListener('deviceorientationabsolute' as 'deviceorientation', handler, true);
    window.addEventListener('deviceorientation', handler, true);
    return () => {
      window.removeEventListener('deviceorientationabsolute' as 'deviceorientation', handler, true);
      window.removeEventListener('deviceorientation', handler, true);
    };
  }, [scheduleNeedleUpdate]);

  async function requestCompass() {
    const DOE = (window as unknown as {
      DeviceOrientationEvent?: { requestPermission?: () => Promise<string> };
    }).DeviceOrientationEvent;
    if (DOE?.requestPermission) {
      try {
        const r = await DOE.requestPermission();
        if (r === 'granted') {
          setNeedsPerm(false);
          let gotAbsolute = false;
          const handler = (e: DeviceOrientationEvent) => {
            const webkit = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
            if (typeof webkit === 'number') {
              headingRef.current = webkit;
              if (!gotAbsolute) { gotAbsolute = true; setAbsolute(true); }
              scheduleNeedleUpdate();
            } else if (e.alpha != null) {
              const isAbs = (e as DeviceOrientationEvent & { absolute?: boolean }).absolute === true;
              if (isAbs && !gotAbsolute) { gotAbsolute = true; setAbsolute(true); }
              headingRef.current = (360 - e.alpha) % 360;
              scheduleNeedleUpdate();
            }
          };
          window.addEventListener('deviceorientationabsolute' as 'deviceorientation', handler, true);
          window.addEventListener('deviceorientation', handler, true);
        }
      } catch {
        setErr('تعذّر تفعيل البوصلة');
      }
    }
  }

  const aligned = alignedUi;
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const showDeniedCard = locPerm === 'denied' && qibla == null;
  const showStartButton = qibla == null && !showDeniedCard && !requesting;

  return (
    <div className="pt-24 pb-28">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-emerald-800/30 mb-4">
            <Compass className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 font-cairo text-sm">القبلة</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3" style={{ fontFamily: 'Amiri, serif' }}>
            اتجاه القبلة
          </h1>
          <p className="text-gray-400 font-cairo">وجّه أعلى الجهاز نحو السهم الذهبي</p>
        </motion.div>

        {err && !showDeniedCard && <p className="text-rose-400 font-cairo mb-4">{err}</p>}

        {needsPerm && (
          <button
            type="button"
            onClick={requestCompass}
            className="mb-6 px-5 py-2 rounded-xl bg-emerald-900/40 border border-emerald-700/40 text-emerald-300 font-cairo hover:bg-emerald-900/70 transition-all"
          >
            تفعيل البوصلة
          </button>
        )}

        {showStartButton && (
          <button
            type="button"
            onClick={handleStartClick}
            className="mb-6 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-cairo transition-all inline-flex items-center gap-2 shadow-lg shadow-emerald-900/40"
          >
            <MapPin className="w-4 h-4" />
            حدّد القبلة باستخدام موقعك
          </button>
        )}

        {requesting && (
          <div className="mb-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-900/30 border border-emerald-700/40 text-emerald-300 font-cairo">
            <Loader2 className="w-4 h-4 animate-spin" />
            جاري طلب الموقع... وافق على إذن الموقع لو ظهر لك
          </div>
        )}

        {showDeniedCard && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 mx-auto max-w-md text-right glass-card rounded-2xl border border-amber-700/40 p-5"
            dir="rtl"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-white font-cairo font-semibold mb-1">صلاحية الموقع مرفوضة</h3>
                <p className="text-gray-300 font-cairo text-sm leading-relaxed">
                  نحتاج موقعك مرة واحدة فقط لحساب اتجاه الكعبة بدقة. لا نشاركه مع أي طرف، ويعمل بعدها أوفلاين تمامًا.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <button
                type="button"
                onClick={doRequestLocation}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-cairo transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                إعادة طلب الإذن
              </button>
              {denyCount >= 2 && (
                <button
                  type="button"
                  onClick={handleOpenSettings}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600/80 hover:bg-amber-500 text-white font-cairo transition-all"
                >
                  <Settings className="w-4 h-4" />
                  فتح الإعدادات
                </button>
              )}
            </div>
            {denyCount >= 2 && (
              <p className="text-xs text-amber-300/80 font-cairo mt-3 leading-relaxed">
                إذا لم يظهر مربع الإذن، افتح إعدادات التطبيق ← الأذونات ← الموقع ← اسمح.
              </p>
            )}
          </motion.div>
        )}

        <div
          className={`relative mx-auto h-72 w-72 rounded-full glass-card border grid place-items-center transition-colors ${
            aligned ? 'border-amber-400 shadow-[0_0_40px_-5px_rgba(251,191,36,0.5)]' : 'border-emerald-700/40'
          }`}
          style={{ transform: 'translateZ(0)', contain: 'layout paint' }}
        >
          <div className="absolute inset-4 rounded-full border border-amber-500/30" />
          <span className="absolute top-2 text-xs font-cairo text-gray-400">N</span>
          {qibla != null && (
            <div
              ref={needleRef}
              className="absolute inset-0 grid place-items-center"
              style={{ transform: 'rotate(0deg)', transition: 'transform 80ms linear', willChange: 'transform' }}
            >
              <div className={`h-1/2 w-1.5 -mt-20 rounded-full ${aligned ? 'bg-gradient-to-t from-transparent to-amber-300' : 'bg-gradient-to-t from-transparent to-amber-400'}`} />
            </div>
          )}
          <Compass size={48} className="text-emerald-400" />
        </div>

        {qibla != null && (
          <>
            <p className="mt-6 text-amber-400 text-3xl" style={{ fontFamily: 'Amiri, serif' }}>
              {qibla.toFixed(1)}°
            </p>
            <button
              type="button"
              onClick={doRequestLocation}
              disabled={requesting}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-900/30 border border-emerald-800/40 text-emerald-300 font-cairo text-xs hover:bg-emerald-900/60 transition-all disabled:opacity-60"
            >
              {requesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              تحديث الموقع
            </button>

            {aligned && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-amber-300 font-cairo text-sm">
                <CheckCircle2 className="w-4 h-4" />
                أنت تواجه القبلة الآن
              </p>
            )}
            <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs font-cairo text-gray-400">
              {accuracy != null && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-900/40">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  دقة الموقع ±{Math.round(accuracy)} م
                </span>
              )}
              {distKm != null && (
                <span className="px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-900/40">
                  المسافة إلى الكعبة {Math.round(distKm).toLocaleString('ar-EG')} كم
                </span>
              )}
              {!absolute && qibla != null && (
                <span className="px-3 py-1 rounded-full bg-amber-950/40 border border-amber-900/40 text-amber-300">
                  بوصلة نسبية — عاير الجهاز بحركة 8
                </span>
              )}
              {(source === 'cache' || isOffline) && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-900/40 text-amber-300">
                  <WifiOff className="w-3 h-3" />
                  موقع محفوظ (أوفلاين)
                </span>
              )}
              <span className="px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-900/40 text-emerald-300">
                حساب أوفلاين دقيق — لا يحتاج إنترنت
              </span>
            </div>
          </>
        )}

        <div className="mt-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-900/40 border border-emerald-700/40 text-emerald-400 hover:bg-emerald-900/60 transition-all"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="font-cairo">العودة للرئيسية</span>
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {showRationale && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowRationale(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl bg-[#0b1a12] border border-emerald-800/50 p-6 text-right relative shadow-2xl"
              dir="rtl"
            >
              <button
                type="button"
                onClick={() => setShowRationale(false)}
                className="absolute top-3 left-3 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-cairo font-bold text-lg">السماح بالموقع</h3>
                  <p className="text-emerald-300/80 font-cairo text-xs">يعمل أوفلاين بعد أول مرة</p>
                </div>
              </div>

              <p className="text-gray-300 font-cairo text-sm leading-relaxed mb-5">
                نحتاج إذن موقعك لمرة واحدة فقط لحساب اتجاه القبلة بدقة من مكانك. لا يتم رفع أي بيانات لأي خادم — يُحفظ الموقع محليًا على جهازك ويعمل بدون إنترنت في المرات القادمة.
              </p>

              <ul className="text-gray-400 font-cairo text-xs space-y-2 mb-5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  حساب دقيق لاتجاه الكعبة من إحداثياتك
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  بدون أي اتصال بالإنترنت بعد المرة الأولى
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  لا يتم مشاركة موقعك مع أي طرف
                </li>
              </ul>

              <div className="flex flex-col-reverse sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setShowRationale(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-cairo transition-all"
                >
                  ليس الآن
                </button>
                <button
                  type="button"
                  onClick={handleAllowFromRationale}
                  className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-cairo font-semibold transition-all inline-flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  السماح بالموقع
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
