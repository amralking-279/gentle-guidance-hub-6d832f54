import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing, X, Sparkles } from 'lucide-react';
import { useWebPush } from '@/hooks/useWebPush';

const PROMPT_KEY = 'global-notif-prompt-shown-v2';
const DELAY_MS = 5000; // Reduced from 30s to 5s

async function getNotifSW(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  const host = window.location.hostname;
  const inIframe = window.self !== window.top;
  if (
    inIframe ||
    host.startsWith('id-preview--') ||
    host.startsWith('preview--') ||
    host.endsWith('.lovableproject.com') ||
    host.endsWith('.lovableproject-dev.com')
  ) {
    return null;
  }
  try {
    const existing = await navigator.serviceWorker.getRegistration('/notification-sw.js');
    if (existing) return existing;
    return await navigator.serviceWorker.register('/notification-sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

async function showStickyWelcome() {
  try {
    const reg = await getNotifSW();
    const title = '🕌 نور القرآن الكريم';
    const body = 'تم تفعيل التنبيهات ✨ سيصلك الأذان والتحديثات هنا — للإيقاف اذهب إلى مواقيت الصلاة';
    if (reg) {
      // Wait for SW to be active before posting
      await navigator.serviceWorker.ready;
      const target = reg.active || reg.waiting || reg.installing;
      if (target) {
        target.postMessage({ type: 'show-persistent', title, body });
      } else {
        await reg.showNotification(title, {
          body,
          tag: 'prayer-persistent',
          requireInteraction: true,
          silent: true,
          icon: '/icon.svg',
          badge: '/icon.svg',
          dir: 'rtl',
          lang: 'ar',
        });
      }
    } else if ('Notification' in window) {
      new Notification(title, { body, icon: '/icon.svg' });
    }
  } catch {
    // ignore
  }
}

type PromptVariant = 'enable' | 'denied' | 'ios-install';

function detectIosStandalone(): { isIos: boolean; isStandalone: boolean } {
  if (typeof window === 'undefined') return { isIos: false, isStandalone: false };
  const ua = navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
  const isStandalone =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return { isIos, isStandalone };
}

export function GlobalNotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [variant, setVariant] = useState<PromptVariant>('enable');
  const { subscribe } = useWebPush();

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    // Don't show in preview/iframe
    const host = window.location.hostname;
    const inIframe = window.self !== window.top;
    if (
      inIframe ||
      host.startsWith('id-preview--') ||
      host.startsWith('preview--')
    ) {
      return;
    }

    // If permission was already granted before, ensure background push is registered.
    if (Notification.permission === 'granted') {
      subscribe().catch(() => undefined);
      return;
    }

    // iOS web push only works when the app is installed to the Home Screen
    // (iOS 16.4+). Guide the user to install instead of asking for a permission
    // the browser won't honor.
    const { isIos, isStandalone } = detectIosStandalone();
    if (isIos && !isStandalone) {
      if (localStorage.getItem(PROMPT_KEY)) return;
      const t = setTimeout(() => {
        setVariant('ios-install');
        setVisible(true);
      }, DELAY_MS);
      return () => clearTimeout(t);
    }

    if (Notification.permission === 'denied') {
      // Show the "denied → open settings" banner once.
      if (localStorage.getItem(PROMPT_KEY + ':denied')) return;
      const t = setTimeout(() => {
        setVariant('denied');
        setVisible(true);
      }, DELAY_MS);
      return () => clearTimeout(t);
    }

    if (Notification.permission !== 'default') return;
    if (localStorage.getItem(PROMPT_KEY)) return;

    const timer = setTimeout(() => {
      setVariant('enable');
      setVisible(true);
    }, DELAY_MS);
    return () => clearTimeout(timer);
  }, [subscribe]);

  const handleEnable = async () => {
    if (!('Notification' in window)) {
      handleDismiss();
      return;
    }
    try {
      const res = await Notification.requestPermission();
      if (res === 'granted') {
        await showStickyWelcome();
        // Mark the persistent prayer notification as enabled by default,
        // so PrayerTimesClient picks it up.
        try {
          const PRAYER_KEY = 'prayer-settings-v1';
          const raw = localStorage.getItem(PRAYER_KEY);
          const parsed = raw ? JSON.parse(raw) : {};
          localStorage.setItem(
            PRAYER_KEY,
            JSON.stringify({ ...parsed, notifyEnabled: true, persistentEnabled: true })
          );
        } catch {}
        // Register for background Web Push so notifications arrive even when the site is closed.
        try { await subscribe(); } catch {}
      } else if (res === 'denied') {
        // Remember so we can show the "denied" banner next time instead.
        try { localStorage.setItem(PROMPT_KEY + ':denied', '1'); } catch {}
      }
    } catch {
      // ignore
    }
    localStorage.setItem(PROMPT_KEY, 'true');
    setVisible(false);
  };

  const handleDismiss = () => {
    if (variant === 'denied') {
      try { localStorage.setItem(PROMPT_KEY + ':denied', '1'); } catch {}
    } else {
      localStorage.setItem(PROMPT_KEY, 'true');
    }
    setVisible(false);
  };

  const headline =
    variant === 'denied'
      ? 'الإشعارات مرفوضة'
      : variant === 'ios-install'
      ? 'ثبّت التطبيق لتفعيل الإشعارات'
      : 'فعّل تنبيهات نور القرآن';

  const subline =
    variant === 'denied'
      ? 'لقد رفضت الإشعارات سابقاً. لتفعيلها افتح إعدادات المتصفح لهذا الموقع وفعّل "Notifications" ثم أعد تحميل الصفحة.'
      : variant === 'ios-install'
      ? 'على iPhone/iPad، الإشعارات تعمل فقط بعد إضافة التطبيق إلى الشاشة الرئيسية: شارك ← "إضافة إلى الشاشة الرئيسية".'
      : 'اسمح لنا بإرسال إشعارات لك ليصلك كل ما هو جديد ومهم';

  const primaryLabel =
    variant === 'denied'
      ? 'فهمت'
      : variant === 'ios-install'
      ? 'حسناً'
      : 'نعم، فعّل الإشعارات';

  const onPrimary = variant === 'enable' ? handleEnable : handleDismiss;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[95] flex items-center justify-center px-4"
          dir="rtl"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleDismiss}
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="relative z-10 w-full max-w-md glass-card rounded-2xl p-6 border border-emerald-800/40"
          >
            <button
              onClick={handleDismiss}
              aria-label="إغلاق"
              className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-6 pt-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: 'spring' }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"
              >
                <BellRing className="w-8 h-8 text-emerald-400" />
              </motion.div>
              <h2 className="text-xl font-bold text-white mb-2 font-cairo">
                {headline}
              </h2>
              <p className="text-gray-400 text-sm font-cairo leading-relaxed">
                {subline}
              </p>
            </div>

            {variant === 'enable' && (
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/20">
                  <Bell className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white text-sm font-cairo font-medium">تنبيهات الأذان</p>
                    <p className="text-gray-400 text-xs font-cairo">إشعار فوري عند دخول وقت كل صلاة يظهر فوق التطبيقات</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/20">
                  <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white text-sm font-cairo font-medium">تحديثات وميزات جديدة</p>
                    <p className="text-gray-400 text-xs font-cairo">كن أول من يعلم بكل جديد في المنصة</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/20">
                  <BellRing className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white text-sm font-cairo font-medium">تذكيرات وأذكار</p>
                    <p className="text-gray-400 text-xs font-cairo">تذكير بأذكار الصباح والمساء ويوم الجمعة</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <button
                onClick={onPrimary}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-cairo font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                <BellRing className="w-4 h-4" />
                {primaryLabel}
              </button>
              {variant === 'enable' && (
                <button
                  onClick={handleDismiss}
                  className="w-full py-2.5 rounded-xl bg-transparent border border-gray-700 hover:border-gray-600 text-gray-400 hover:text-gray-200 font-cairo text-sm transition-all"
                >
                  ليس الآن
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
