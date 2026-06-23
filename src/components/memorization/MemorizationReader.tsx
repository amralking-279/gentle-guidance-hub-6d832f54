
import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, Sparkles, RotateCcw, Check, Settings,
  BookOpen, Zap, Target, X, ChevronDown
} from 'lucide-react';
import type { Ayah, SurahDetail } from '@/types/quran';

interface Props {
  surah: SurahDetail;
  fontSize: number;
}

type HideMode = 'none' | 'blur' | 'hide' | 'word-by-word';

const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toArabicNum(n: number): string {
  return String(n).split('').map(d => arabicNumerals[parseInt(d)] ?? d).join('');
}

export default function MemorizationReader({ surah, fontSize }: Props) {
  const [hideMode, setHideMode] = useState<HideMode>('none');
  const [hiddenAyahs, setHiddenAyahs] = useState<Set<number>>(new Set());
  const [revealedAyahs, setRevealedAyahs] = useState<Set<number>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [wordHidePercentage, setWordHidePercentage] = useState(50);

  const toggleAyahVisibility = useCallback((ayahNumber: number) => {
    setRevealedAyahs(prev => {
      const next = new Set(prev);
      if (next.has(ayahNumber)) {
        next.delete(ayahNumber);
      } else {
        next.add(ayahNumber);
      }
      return next;
    });
  }, []);

  const hideSelectedAyahs = useCallback(() => {
    setHiddenAyahs(prev => {
      const next = new Set(prev);
      revealedAyahs.forEach(n => next.add(n));
      return next;
    });
    setRevealedAyahs(new Set());
  }, [revealedAyahs]);

  const revealAllAyahs = useCallback(() => {
    setHiddenAyahs(new Set());
    setRevealedAyahs(new Set());
  }, []);

  const hideByPattern = useCallback((pattern: 'even' | 'odd' | 'all') => {
    const newHidden = new Set<number>();
    if (pattern === 'all') {
      surah.ayahs.forEach(a => newHidden.add(a.numberInSurah));
    } else {
      surah.ayahs.forEach((a, idx) => {
        if (pattern === 'even' && idx % 2 === 0) newHidden.add(a.numberInSurah);
        if (pattern === 'odd' && idx % 2 === 1) newHidden.add(a.numberInSurah);
      });
    }
    setHiddenAyahs(newHidden);
  }, [surah.ayahs]);

  const progress = useMemo(() => {
    const total = surah.ayahs.length;
    const hidden = hiddenAyahs.size;
    return { total, hidden, percentage: Math.round((hidden / total) * 100) };
  }, [surah.ayahs.length, hiddenAyahs.size]);

  const toggleAyahSelection = useCallback((ayahNumber: number) => {
    if (hideMode === 'none') return;
    setRevealedAyahs(prev => {
      const next = new Set(prev);
      if (next.has(ayahNumber)) {
        next.delete(ayahNumber);
      } else {
        next.add(ayahNumber);
      }
      return next;
    });
  }, [hideMode]);

  const renderAyahText = (ayah: Ayah) => {
    const isHidden = hiddenAyahs.has(ayah.numberInSurah);
    const isSelected = revealedAyahs.has(ayah.numberInSurah);

    if (isHidden && hideMode === 'blur') {
      return (
        <span
          className="blur-sm select-none cursor-pointer hover:blur-none transition-all duration-200"
          onClick={() => toggleAyahVisibility(ayah.numberInSurah)}
        >
          {ayah.text}
        </span>
      );
    }

    if (isHidden && hideMode === 'hide') {
      return (
        <span
          className="cursor-pointer inline-flex items-center gap-2"
          onClick={() => toggleAyahVisibility(ayah.numberInSurah)}
        >
          <span className="bg-emerald-900/30 text-emerald-500 px-3 py-1 rounded-lg font-cairo text-sm">
            اضغط للإظهار
          </span>
        </span>
      );
    }

    if (hideMode === 'word-by-word' && !isSelected) {
      const words = ayah.text.split(' ');
      const hideCount = Math.floor(words.length * (wordHidePercentage / 100));
      const hideIndices = new Set<number>();
      while (hideIndices.size < hideCount) {
        hideIndices.add(Math.floor(Math.random() * words.length));
      }

      return (
        <span className="cursor-pointer" onClick={() => toggleAyahVisibility(ayah.numberInSurah)}>
          {words.map((word, idx) =>
            hideIndices.has(idx)
              ? <span key={idx} className="inline-block mx-0.5 px-2 py-0.5 border-b-2 border-emerald-600/50 min-w-[2rem] text-transparent select-none">_</span>
              : <span key={idx} className="inline-block mx-0.5">{word}</span>
          )}
        </span>
      );
    }

    return <span>{ayah.text}</span>;
  };

  return (
    <div className="relative">
      {/* Memorization Controls */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-4 mb-6"
      >
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-cairo text-sm font-semibold">وضع الحفظ</span>
            </div>

            <div className="flex gap-1">
              {[
                { mode: 'none' as HideMode, label: 'إغلاق', icon: X },
                { mode: 'blur' as HideMode, label: 'ضبابي', icon: Eye },
                { mode: 'hide' as HideMode, label: 'إخفاء', icon: EyeOff },
                { mode: 'word-by-word' as HideMode, label: 'كلمات', icon: Sparkles },
              ].map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => {
                    setHideMode(mode);
                    if (mode === 'none') revealAllAyahs();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-cairo transition-all ${
                    hideMode === mode
                      ? 'bg-emerald-700/50 text-emerald-300 border border-emerald-600/40'
                      : 'bg-white/5 text-gray-400 hover:text-emerald-400 border border-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {hideMode !== 'none' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => hideByPattern('odd')}
                className="px-3 py-1.5 rounded-lg text-xs font-cairo bg-amber-900/30 text-amber-400 border border-amber-800/30 hover:bg-amber-900/40 transition-all"
              >
                إخفاء الفردي
              </button>
              <button
                onClick={() => hideByPattern('even')}
                className="px-3 py-1.5 rounded-lg text-xs font-cairo bg-amber-900/30 text-amber-400 border border-amber-800/30 hover:bg-amber-900/40 transition-all"
              >
                إخفاء الزوجي
              </button>
              <button
                onClick={revealAllAyahs}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-cairo bg-white/5 text-gray-400 hover:text-emerald-400 border border-white/10 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                إظهار الكل
              </button>
            </div>
          )}
        </div>

        {/* Progress */}
        {hideMode !== 'none' && (
          <div className="mt-4 pt-4 border-t border-emerald-900/30">
            <div className="flex items-center justify-between text-xs font-cairo text-gray-400 mb-2">
              <span>الآيات المخفية: {progress.hidden} / {progress.total}</span>
              <span>{progress.percentage}%</span>
            </div>
            <div className="h-1.5 bg-emerald-950 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentage}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Word-by-word settings */}
        {hideMode === 'word-by-word' && (
          <div className="mt-4 pt-4 border-t border-emerald-900/30">
            <div className="flex items-center gap-3">
              <span className="text-xs font-cairo text-gray-400">نسبة الإخفاء:</span>
              <input
                type="range"
                min="20"
                max="80"
                step="10"
                value={wordHidePercentage}
                onChange={e => setWordHidePercentage(parseInt(e.target.value))}
                className="flex-1 h-1 accent-emerald-500"
              />
              <span className="text-xs font-cairo text-emerald-400">{wordHidePercentage}%</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Quran Text */}
      <motion.div
        className="quran-page rounded-3xl p-6 md:p-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {surah.number !== 9 && (
          <p
            className="text-center mb-8"
            style={{ fontFamily: 'Amiri, serif', fontSize: `${fontSize + 4}px`, color: '#d1fae5', lineHeight: 2 }}
          >
            بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
          </p>
        )}

        <div
          className="text-center leading-[2.8] text-right"
          style={{
            fontFamily: 'Amiri, serif',
            fontSize: `${fontSize}px`,
            color: '#f0fdf4',
            direction: 'rtl',
          }}
        >
          {surah.ayahs.map((ayah) => {
            const isHidden = hiddenAyahs.has(ayah.numberInSurah);
            const isSelected = revealedAyahs.has(ayah.numberInSurah);

            return (
              <span key={ayah.numberInSurah} className="inline">
                <motion.span
                  className={`inline cursor-pointer rounded transition-all duration-200 ${
                    hideMode !== 'none' && !isHidden ? 'hover:bg-emerald-900/20' : ''
                  } ${isSelected ? 'ring-2 ring-emerald-500/50 bg-emerald-900/20' : ''}`}
                  onClick={() => {
                    if (hideMode === 'blur' && isHidden) toggleAyahVisibility(ayah.numberInSurah);
                    else if (hideMode === 'hide' && isHidden) toggleAyahVisibility(ayah.numberInSurah);
                    else if (hideMode === 'word-by-word' && !isHidden) toggleAyahVisibility(ayah.numberInSurah);
                  }}
                  layout
                >
                  {renderAyahText(ayah)}
                </motion.span>
                {' '}
                <span
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full border mx-1 align-middle cursor-default select-none ${
                    isHidden
                      ? 'bg-emerald-950 border-emerald-800/30 text-emerald-700'
                      : 'bg-emerald-900/50 border-emerald-800/40 text-emerald-300'
                  }`}
                  style={{ fontSize: '12px', fontFamily: 'Cairo, sans-serif' }}
                >
                  {toArabicNum(ayah.numberInSurah)}
                </span>
                {' '}
              </span>
            );
          })}
        </div>
      </motion.div>

      {/* Quick Actions */}
      {hideMode !== 'none' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-32 left-1/2 -translate-x-1/2 flex items-center gap-3 z-40"
        >
          <button
            onClick={revealAllAyahs}
            className="flex items-center gap-2 px-5 py-2.5 glass rounded-xl text-emerald-400 font-cairo text-sm hover:bg-emerald-900/30 transition-all"
          >
            <Eye className="w-4 h-4" />
            إظهار الكل
          </button>
          <button
            onClick={() => setHiddenAyahs(new Set())}
            className="flex items-center gap-2 px-5 py-2.5 glass rounded-xl text-gray-400 font-cairo text-sm hover:bg-white/10 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            إعادة
          </button>
        </motion.div>
      )}
    </div>
  );
}
