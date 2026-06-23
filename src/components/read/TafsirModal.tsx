import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, BookOpen, AlertCircle } from 'lucide-react';

type Props = {
  open: boolean;
  surahNumber: number;
  ayahNumber: number; // numberInSurah
  surahName: string;
  ayahText: string;
  onClose: () => void;
};

type Edition = { key: string; label: string };

const EDITIONS: Edition[] = [
  { key: 'ar.muyassar', label: 'التفسير الميسر' },
  { key: 'ar.jalalayn', label: 'تفسير الجلالين' },
  { key: 'ar.miqbas', label: 'تنوير المقباس (ابن عباس)' },
];

const cache = new Map<string, string>();

export default function TafsirModal({ open, surahNumber, ayahNumber, surahName, ayahText, onClose }: Props) {
  const [edition, setEdition] = useState<string>(EDITIONS[0].key);
  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const cacheKey = `${surahNumber}:${ayahNumber}:${edition}`;
    if (cache.has(cacheKey)) {
      setText(cache.get(cacheKey)!);
      setErr(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setText('');
    fetch(`https://api.alquran.cloud/v1/ayah/${surahNumber}:${ayahNumber}/${edition}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const t = data?.data?.text as string | undefined;
        if (!t) throw new Error('no-data');
        cache.set(cacheKey, t);
        setText(t);
      })
      .catch(() => { if (!cancelled) setErr('تعذر جلب التفسير، جرّب مرة أخرى.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, surahNumber, ayahNumber, edition]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="relative w-full sm:max-w-2xl max-h-[88vh] overflow-hidden flex flex-col bg-gradient-to-b from-[#0a1a10] to-[#030a06] border-t sm:border border-emerald-800/40 rounded-t-3xl sm:rounded-3xl shadow-2xl"
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-900/40">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-900/40 border border-emerald-700/40 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-emerald-300 font-cairo text-xs">تفسير الآية</p>
                  <p className="text-white font-cairo text-sm font-semibold">
                    {surahName} — الآية {ayahNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="إغلاق"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ayah text */}
            <div className="px-5 py-5 border-b border-emerald-900/30 bg-emerald-950/20">
              <p
                className="text-emerald-50 text-center leading-loose"
                style={{ fontFamily: 'Amiri, serif', fontSize: '22px' }}
              >
                {ayahText}
              </p>
            </div>

            {/* Edition tabs */}
            <div className="flex gap-2 px-5 pt-4 overflow-x-auto">
              {EDITIONS.map(e => (
                <button
                  key={e.key}
                  onClick={() => setEdition(e.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-cairo whitespace-nowrap border transition-all ${
                    edition === e.key
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-emerald-950/40 border-emerald-800/40 text-gray-300 hover:border-emerald-600/50'
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>

            {/* Tafsir body */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {loading && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                  <p className="text-gray-400 font-cairo text-sm">جاري تحميل التفسير...</p>
                </div>
              )}
              {err && !loading && (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-red-300">
                  <AlertCircle className="w-6 h-6" />
                  <p className="font-cairo text-sm">{err}</p>
                </div>
              )}
              {!loading && !err && text && (
                <p
                  className="text-gray-200 leading-loose font-cairo text-[15px] sm:text-base"
                  style={{ lineHeight: 2 }}
                >
                  {text}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
