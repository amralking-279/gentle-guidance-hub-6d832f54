import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing, X } from 'lucide-react';

const MODAL_SHOWN_KEY = 'prayer-notif-modal-shown-v2'; // Updated to re-prompt users

async function getNotifSW(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
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

type Props = {
  onEnable: () => void;
  onDismiss: () => void;
};

export default function NotificationPermissionModal({ onEnable, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  // NOTE: We intentionally do NOT auto-call Notification.requestPermission().
  // Modern browsers (Firefox, Safari) ignore unsolicited prompts, and Chrome
  // may permanently block the origin. Permission is only requested on the
  // explicit user click in handleEnable below.
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      // Already granted previously — ensure SW is registered and notify parent.
      void getNotifSW().then(() => onEnable());
    }
  }, [onEnable]);

  const handleEnable = async () => {
    if (!('Notification' in window)) {
      setVisible(false);
      onDismiss();
      return;
    }
    const res = await Notification.requestPermission();
    if (res === 'granted') {
      // Ensure service worker is ready for persistent notifications
      await getNotifSW();
      onEnable();
    }
    localStorage.setItem(MODAL_SHOWN_KEY, 'true');
    setVisible(false);
    onDismiss();
  };

  const handleDismiss = () => {
    localStorage.setItem(MODAL_SHOWN_KEY, 'true');
    setVisible(false);
    onDismiss();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center px-4"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleDismiss} />

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
                تفعيل تنبيهات الأذان
              </h2>
              <p className="text-gray-400 text-sm font-cairo leading-relaxed">
                هل تريد تفعيل إشعارات مواقيت الصلاة؟
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/20">
                <Bell className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-sm font-cairo font-medium">إشعارات لحظية</p>
                  <p className="text-gray-400 text-xs font-cairo">تنبيه فوري عند دخول وقت كل صلاة</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/20">
                <BellRing className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-sm font-cairo font-medium">إشعار دائم في شريط الإشعارات</p>
                  <p className="text-gray-400 text-xs font-cairo">يعرض الصلاة القادمة والوقت المتبقي بشكل مستمر</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleEnable}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-cairo font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                <BellRing className="w-4 h-4" />
                نعم، فعّل التنبيهات
              </button>
              <button
                onClick={handleDismiss}
                className="w-full py-2.5 rounded-xl bg-transparent border border-gray-700 hover:border-gray-600 text-gray-400 hover:text-gray-200 font-cairo text-sm transition-all"
              >
                لا الآن
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
