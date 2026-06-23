import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X, ExternalLink, Bell } from 'lucide-react';
import { openExternalUrl, WHATSAPP_CHANNEL_URL } from '@/lib/native/openExternal';
const STORAGE_KEY = 'quran_update_reminder_last_dismissed';
const REMINDER_INTERVAL_DAYS = 15;
const REMINDER_INTERVAL_MS = REMINDER_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 3000;

function getLastDismissedTime(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

function recordDismissal(): void {
  try {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  } catch {}
}

export function UpdateReminder() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const lastDismissed = getLastDismissedTime();
    const elapsed = Date.now() - lastDismissed;
    if (elapsed < REMINDER_INTERVAL_MS) return;

    const timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenChannel = async () => {
    recordDismissal();
    setOpen(false);
    await openExternalUrl(WHATSAPP_CHANNEL_URL);
  };

  const handleDismiss = () => {
    recordDismissal();
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          dir="rtl"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="w-full max-w-md rounded-2xl border border-emerald-800 bg-gradient-to-br from-[#06140a] to-[#0a1f12] p-6 relative overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-600/5 rounded-full blur-2xl pointer-events-none" />

            <button
              onClick={handleDismiss}
              className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-gray-900/80 border border-gray-700 hover:bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center transition-all z-10"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative z-10">
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring' }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-900/50"
                >
                  <RefreshCw className="w-8 h-8 text-white" />
                </motion.div>
              </div>

              {/* Title */}
              <div className="text-center mb-4">
                <h3 className="text-white font-cairo font-bold text-xl mb-1">
                  تحقق من التحديثات الجديدة
                </h3>
                <p className="text-emerald-400 text-sm font-cairo">
                  مر {REMINDER_INTERVAL_DAYS} يوم — قد يكون هناك جديد
                </p>
              </div>

              {/* Content */}
              <div className="bg-emerald-950/50 border border-emerald-800/40 rounded-xl p-4 mb-5">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-gray-200 font-cairo text-sm leading-relaxed mb-2">
                      تابع قناتنا على واتساب للبقاء على اطلاع بآخر التحديثات والميزات الجديدة.
                    </p>
                    <p className="text-emerald-300 font-cairo text-xs">
                      انضم إلى أكثر من 1000 متابع
                    </p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleOpenChannel}
                  className="w-full bg-gradient-to-l from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-cairo font-semibold text-sm rounded-xl px-5 py-3.5 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
                >
                  <ExternalLink className="w-4 h-4" />
                  فتح قناة واتساب
                </button>
                <button
                  onClick={handleDismiss}
                  className="w-full bg-gray-900/80 border border-gray-700 hover:bg-gray-800 text-gray-300 font-cairo text-sm rounded-xl px-4 py-2.5 transition-all"
                >
                  إغلاق (لن يظهر مجداً قبل {REMINDER_INTERVAL_DAYS} يوم)
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
