import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Check } from 'lucide-react';

// Bump this version whenever new updates ship — banner re-appears once per user.
const UPDATE_VERSION = '2026-06-09.audio-fix';
const STORAGE_KEY = 'quran_update_banner_seen';
const AUTO_DISMISS_MS = 12000;
const SWIPE_THRESHOLD = 80;

const UPDATES: string[] = [
  'إصلاح صوت الشيخ سعود الشريم',
  'إصلاح صوت الشيخ علي الحذيفي',
  'إصلاح صوت الشيخ محمد أيوب',
  'إصلاح صوت الشيخ محمد جبريل',
  'إصلاح صوت الشيخ هاني الرفاعي وأبو بكر الشاطري',
  'تحسين سرعة تشغيل الصوت وتقليل محاولات الاتصال الفاشلة',
];

const safeLayerStyle = {
  isolation: 'isolate' as const,
  contain: 'paint' as const,
  transform: 'translate3d(0,0,0)',
  willChange: 'transform',
  boxShadow: 'none',
  backgroundImage: 'none',
  filter: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
};

const OS_NOTIF_KEY = 'quran_update_os_notif_seen';

async function sendUpdateOSNotification() {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    if (localStorage.getItem(OS_NOTIF_KEY) === UPDATE_VERSION) return;
  } catch {}

  const host = window.location.hostname;
  const inIframe = window.self !== window.top;
  if (
    inIframe ||
    host.startsWith('id-preview--') ||
    host.startsWith('preview--') ||
    host.endsWith('.lovableproject.com') ||
    host.endsWith('.lovableproject-dev.com')
  ) {
    return;
  }

  const title = '✨ تحديث جديد في نور القرآن';
  const body = UPDATES.slice(0, 3).join(' • ');
  const options: NotificationOptions = {
    body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    // Unique tag per version so it appears as a new, swipeable notification.
    tag: `noor-update-${UPDATE_VERSION}`,
    requireInteraction: false,
    silent: false,
    dir: 'rtl',
    lang: 'ar',
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration('/notification-sw.js');
      if (reg) {
        await reg.showNotification(title, options);
      } else {
        new Notification(title, options);
      }
    } else {
      new Notification(title, options);
    }
    try { localStorage.setItem(OS_NOTIF_KEY, UPDATE_VERSION); } catch {}
  } catch {
    // ignore
  }
}

export function UpdateBanner() {
  const [open, setOpen] = useState(false);
  const [exitX, setExitX] = useState(0);
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoDismiss = () => {
    if (autoDismissRef.current) {
      clearTimeout(autoDismissRef.current);
      autoDismissRef.current = null;
    }
  };

  const close = () => {
    clearAutoDismiss();
    setOpen(false);
    try { localStorage.setItem(STORAGE_KEY, UPDATE_VERSION); } catch {}
  };

  useEffect(() => {
    // Update broadcasts to push subscribers are now triggered server-side
    // (CI/cron with CRON_SECRET) — not from anonymous client visits — so
    // the public push surface can't be used to inject arbitrary content.
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (seen !== UPDATE_VERSION) {
        const t = setTimeout(() => setOpen(true), 800);
        sendUpdateOSNotification();
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (open) {
      autoDismissRef.current = setTimeout(() => {
        setExitX(0);
        close();
      }, AUTO_DISMISS_MS);
    }
    return () => clearAutoDismiss();
  }, [open]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number }; velocity: { x: number } }) => {
    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;

    if (Math.abs(offsetX) > SWIPE_THRESHOLD || Math.abs(velocityX) > 500) {
      const direction = offsetX > 0 ? 1 : -1;
      setExitX(direction * 400);
      setTimeout(() => close(), 250);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: -120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ x: exitX, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.3}
          onDragEnd={handleDragEnd}
          className="fixed top-0 inset-x-0 z-[100] px-3 sm:px-4 pt-3 cursor-grab active:cursor-grabbing touch-pan-y"
          style={safeLayerStyle}
          dir="rtl"
        >
          <div className="max-w-3xl mx-auto rounded-2xl border border-emerald-800 bg-[#06140a] overflow-hidden" style={safeLayerStyle}>
            <div className="relative p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-900 border border-emerald-800 flex items-center justify-center shrink-0" style={safeLayerStyle}>
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-white font-cairo font-bold text-base sm:text-lg">
                        تحديثات جديدة
                      </h3>
                      <p className="text-emerald-400 text-xs font-cairo">آخر ما أُضيف للموقع</p>
                    </div>
                    <button
                      onClick={close}
                      className="w-8 h-8 rounded-lg bg-gray-950 border border-gray-800 hover:brightness-125 text-gray-300 flex items-center justify-center transition-colors shrink-0"
                      style={safeLayerStyle}
                      aria-label="إغلاق"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <ul className="space-y-1.5 mt-3">
                    {UPDATES.map((u, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.05 }}
                        className="flex items-start gap-2 text-gray-200 font-cairo text-xs sm:text-sm"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <span>{u}</span>
                      </motion.li>
                    ))}
                  </ul>
                  <button
                    onClick={close}
                    className="mt-4 w-full sm:w-auto bg-emerald-800 border border-emerald-700 hover:brightness-125 text-white font-cairo text-sm rounded-lg px-5 py-2 transition-colors"
                    style={safeLayerStyle}
                  >
                    تم، شكراً
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
