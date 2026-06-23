import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { Moon, X, BookOpen, Heart } from 'lucide-react';

const STORAGE_KEY = 'quran_friday_reminder_date';
const AUTO_DISMISS_MS = 12000;
const SWIPE_THRESHOLD = 80;

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

export function FridayReminder() {
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
    try {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem(STORAGE_KEY, today);
    } catch {}
  };

  useEffect(() => {
    const now = new Date();
    if (now.getDay() !== 5) return; // 5 = Friday
    const today = now.toISOString().split('T')[0];
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (seen === today) return;
      const t = setTimeout(() => setOpen(true), 1600);
      return () => clearTimeout(t);
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
          <div className="max-w-3xl mx-auto rounded-2xl border border-amber-800 bg-[#06140a] overflow-hidden" style={safeLayerStyle}>
            <div className="relative p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-900 border border-amber-800 flex items-center justify-center shrink-0" style={safeLayerStyle}>
                  <Moon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <h3 className="text-white font-cairo font-bold text-base sm:text-lg" style={{ fontFamily: 'Amiri, serif' }}>
                      جمعة مباركة
                    </h3>
                    <button
                      onClick={close}
                      className="w-8 h-8 rounded-lg bg-gray-950 border border-gray-800 hover:brightness-125 text-gray-300 flex items-center justify-center transition-colors shrink-0"
                      style={safeLayerStyle}
                      aria-label="إغلاق"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-amber-200 font-cairo text-sm leading-relaxed">
                    لا تنسَ وِردَك اليوم: قراءة <span className="text-amber-300 font-bold">سورة الكهف</span>،
                    والإكثار من <span className="text-amber-300 font-bold">الصلاة على النبي ﷺ</span>.
                  </p>
                  <p className="text-gray-400 font-cairo text-xs mt-2 leading-relaxed" style={{ fontFamily: 'Amiri, serif' }}>
                    «إنَّ من أفضلِ أيامكم يومَ الجمعةِ، فأكثروا عليَّ من الصلاةِ فيه»
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      to="/read/$surahNumber"
                      params={{ surahNumber: '18' }}
                      onClick={close}
                      className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-cairo text-sm rounded-lg px-4 py-2 transition-colors"
                    >
                      <BookOpen className="w-4 h-4" />
                      اقرأ سورة الكهف
                    </Link>
                    <Link
                      to="/more/athkar"
                      onClick={close}
                      className="inline-flex items-center gap-2 bg-emerald-900 hover:brightness-125 text-emerald-200 font-cairo text-sm rounded-lg px-4 py-2 transition-colors border border-emerald-800"
                      style={safeLayerStyle}
                    >
                      <Heart className="w-4 h-4" />
                      الصلاة على النبي
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
