
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import {
  ArrowRight, ArrowLeft, Bookmark, BookmarkCheck, Copy,
  ZoomIn, ZoomOut, Headphones, Heart, Loader2, AlertCircle,
  Eye, Mic, Target, Settings
} from 'lucide-react';
import { useSurahDetail } from '@/hooks/useQuran';
import { useFavorites } from '@/components/providers/FavoritesProvider';
import { useAudio } from '@/components/providers/AudioProvider';
import { useProgress } from '@/components/providers/ProgressProvider';
import MemorizationReader from '@/components/memorization/MemorizationReader';
import RecitationChecker from '@/components/memorization/RecitationChecker';
import TafsirModal from '@/components/read/TafsirModal';
import type { Ayah, RecitationResult } from '@/types/quran';

interface Props {
  surahNumber: number;
}

type ViewMode = 'read' | 'memorize' | 'recite';

const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toArabicNum(n: number): string {
  return String(n).split('').map(d => arabicNumerals[parseInt(d)] ?? d).join('');
}

export default function SurahReader({ surahNumber }: Props) {
  const { surah, loading, error } = useSurahDetail(surahNumber);
  const { addBookmark, removeBookmark, isBookmarked, addFavorite, removeFavorite, isFavorite, setLastRead } = useFavorites();
  const { playSurah, currentSurah, isPlaying, currentTime, duration } = useAudio();
  const { addReadingActivity } = useProgress();
  const [fontSize, setFontSize] = useState(26);
  const [activeAyah, setActiveAyah] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [tafsirAyah, setTafsirAyah] = useState<Ayah | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('read');
  const [currentRecitingAyah, setCurrentRecitingAyah] = useState(1);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const ayahRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const userScrolledRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const trackedRef = useRef<number | null>(null);

  const fav = isFavorite(surahNumber);

  useEffect(() => {
    if (surah) {
      setLastRead({ surahNumber, surahName: surah.name, ayahNumber: 1 });
      // Auto-log reading once per surah open
      if (trackedRef.current !== surahNumber) {
        trackedRef.current = surahNumber;
        const pages = Math.max(1, Math.ceil(surah.ayahs.length / 15));
        addReadingActivity({ ayahs: surah.ayahs.length, pages, minutes: Math.max(1, Math.ceil(surah.ayahs.length / 10)) });
      }
    }
  }, [surah, surahNumber, setLastRead, addReadingActivity]);

  // Estimate current ayah based on audio time with improved calculation
  useEffect(() => {
    if (currentSurah?.number === surahNumber && surah && duration > 0 && isPlaying) {
      // Average ayah duration varies, use weighted estimate
      const avgAyahDuration = duration / surah.ayahs.length;
      const estimatedAyah = Math.min(
        Math.floor(currentTime / avgAyahDuration) + 1,
        surah.ayahs.length
      );
      setActiveAyah(estimatedAyah);
    }
  }, [currentSurah, surahNumber, surah, currentTime, duration, isPlaying]);

  // Auto-scroll to current ayah with smooth behavior
  useEffect(() => {
    if (activeAyah && isPlaying && !userScrolledRef.current) {
      const ayahElement = ayahRefs.current.get(activeAyah);
      if (ayahElement) {
        ayahElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeAyah, isPlaying]);

  // Detect user manual scrolling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      userScrolledRef.current = true;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      // Re-enable auto-scroll after 3 seconds of no manual scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        userScrolledRef.current = false;
      }, 3000);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  const toggleBookmark = useCallback((ayah: Ayah) => {
    if (!surah) return;
    if (isBookmarked(surahNumber, ayah.numberInSurah)) {
      removeBookmark(surahNumber, ayah.numberInSurah);
    } else {
      addBookmark({
        surahNumber,
        surahName: surah.name,
        ayahNumber: ayah.numberInSurah,
        text: ayah.text.slice(0, 100),
        timestamp: Date.now(),
      });
    }
  }, [surah, surahNumber, isBookmarked, addBookmark, removeBookmark]);

  const copyAyah = useCallback(async (ayah: Ayah) => {
    if (!surah) return;
    const text = `${ayah.text}\n[${surah.name} - الآية ${toArabicNum(ayah.numberInSurah)}]`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(ayah.numberInSurah);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  }, [surah]);

  const handlePlay = useCallback(() => {
    if (!surah) return;
    playSurah({
      number: surah.number,
      name: surah.name,
      englishName: surah.englishName,
      englishNameTranslation: surah.englishNameTranslation,
      numberOfAyahs: surah.numberOfAyahs,
      revelationType: surah.revelationType,
    });
  }, [surah, playSurah]);

  const handleRecitationResult = useCallback((result: RecitationResult) => {
    console.log('Recitation result:', result);
  }, []);

  if (loading) {
    return (
      <div className="pt-24 pb-24 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-gray-400 font-cairo">جاري تحميل السورة...</p>
      </div>
    );
  }

  if (error || !surah) {
    return (
      <div className="pt-24 pb-24 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-red-400 font-cairo">{error || 'حدث خطأ في تحميل السورة'}</p>
        <Link to="/read" className="text-emerald-400 hover:text-emerald-300 font-cairo text-sm underline">
          العودة لقائمة السور
        </Link>
      </div>
    );
  }

  const isCurrentlyPlaying = currentSurah?.number === surahNumber && isPlaying;

  return (
    <div className="pt-20 pb-28" ref={containerRef}>
      {/* Sticky Header */}
      <div className="sticky top-16 z-30 bg-[#030a06]/95 backdrop-blur-xl border-b border-emerald-900/30 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <Link
            to="/read"
            className="flex items-center gap-2 text-gray-400 hover:text-emerald-400 transition-colors font-cairo text-sm"
          >
            <ArrowRight className="w-4 h-4" />
            العودة
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-white font-bold text-lg" style={{ fontFamily: 'Amiri, serif' }}>
              {surah.name}
            </span>
            <span className="text-gray-500 text-xs font-cairo">
              ({toArabicNum(surah.numberOfAyahs)} آية)
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setFontSize(s => Math.max(16, s - 2))}
              className="p-2 text-gray-400 hover:text-emerald-400 transition-colors rounded-lg hover:bg-emerald-900/20"
              title="تصغير الخط"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setFontSize(s => Math.min(40, s + 2))}
              className="p-2 text-gray-400 hover:text-emerald-400 transition-colors rounded-lg hover:bg-emerald-900/20"
              title="تكبير الخط"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {/* View Mode Selector */}
            <div className="relative">
              <button
                onClick={() => setShowModeSelector(prev => !prev)}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode !== 'read'
                    ? 'text-emerald-400 bg-emerald-900/30'
                    : 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-900/20'
                }`}
                title="وضع القراءة"
              >
                <Settings className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showModeSelector && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full right-0 mb-2 glass-card rounded-xl p-2 min-w-[140px] z-50"
                  >
                    {[
                      { mode: 'read' as ViewMode, label: 'قراءة', icon: Eye },
                      { mode: 'memorize' as ViewMode, label: 'حفظ', icon: Target },
                      { mode: 'recite' as ViewMode, label: 'تلاوة', icon: Mic },
                    ].map(({ mode, label, icon: Icon }) => (
                      <button
                        key={mode}
                        onClick={() => { setViewMode(mode); setShowModeSelector(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-right text-sm font-cairo transition-colors ${
                          viewMode === mode
                            ? 'bg-emerald-900/30 text-emerald-400'
                            : 'text-gray-400 hover:bg-white/5'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={handlePlay}
              className={`p-2 rounded-lg transition-colors ${isCurrentlyPlaying ? 'text-emerald-400 bg-emerald-900/30' : 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-900/20'}`}
              title="استمع"
            >
              <Headphones className="w-4 h-4" />
            </button>

            <button
              onClick={() => fav ? removeFavorite(surahNumber) : addFavorite({ number: surah.number, name: surah.name, numberOfAyahs: surah.numberOfAyahs, revelationType: surah.revelationType, addedAt: Date.now() })}
              className={`p-2 rounded-lg transition-colors ${fav ? 'text-red-400 bg-red-900/20' : 'text-gray-400 hover:text-red-400 hover:bg-red-900/20'}`}
              title={fav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
            >
              <Heart className={`w-4 h-4 ${fav ? 'fill-red-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Surah Header - Clean, No Duplicate */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="relative inline-block">
            <div className="absolute -inset-4 bg-emerald-900/10 rounded-3xl blur-xl" />
            <div className="relative glass-card rounded-3xl px-8 py-6 border border-emerald-800/30">
              {/* Bismillah - Elegant Gold/White Style */}
              <p
                className="mb-4 select-none"
                style={{
                  fontFamily: 'Amiri, serif',
                  fontSize: '28px',
                  color: '#fef3c7',
                  textShadow: '0 0 20px rgba(251, 191, 36, 0.3)',
                  letterSpacing: '0.05em',
                }}
              >
                ﷽
              </p>

              {/* Surah Name Only Once */}
              <h1 className="text-3xl md:text-4xl text-white font-bold mb-2" style={{ fontFamily: 'Amiri, serif' }}>
                {surah.name}
              </h1>

              <div className="flex items-center justify-center gap-4 text-sm font-cairo">
                <span className={`px-3 py-1 rounded-full ${
                  surah.revelationType === 'Meccan'
                    ? 'bg-amber-900/30 text-amber-400 border border-amber-800/30'
                    : 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/30'
                }`}>
                  {surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}
                </span>
                <span className="text-gray-500">{toArabicNum(surah.numberOfAyahs)} آية</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recitation Checker Mode */}
        {viewMode === 'recite' && (
          <div className="space-y-6">
            <RecitationChecker
              ayahs={surah.ayahs}
              currentAyah={currentRecitingAyah}
              onAyahComplete={handleRecitationResult}
              onNextAyah={() => setCurrentRecitingAyah(prev => Math.min(prev + 1, surah.ayahs.length))}
              onPreviousAyah={() => setCurrentRecitingAyah(prev => Math.max(prev - 1, 1))}
              onSelectAyah={(n) => setCurrentRecitingAyah(n)}
            />
          </div>
        )}

        {/* Memorization Mode */}
        {viewMode === 'memorize' && (
          <MemorizationReader surah={surah} fontSize={fontSize} />
        )}

        {/* Normal Reading Mode */}
        {viewMode === 'read' && (
          <>
            {/* Bismillah - Elegant Style for Surahs (except At-Tawba) */}
            {surah.number !== 9 && surah.number !== 1 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-10"
                style={{
                  fontFamily: 'Amiri, serif',
                  fontSize: '26px',
                  color: '#fef3c7',
                  textShadow: '0 0 15px rgba(251, 191, 36, 0.25)',
                  letterSpacing: '0.03em',
                }}
              >
                بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
              </motion.p>
            )}

            {/* Mushaf Text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="quran-page rounded-3xl p-6 md:p-10"
            >
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
                  const isActive = activeAyah === ayah.numberInSurah && isCurrentlyPlaying;
                  const isBookmarkedAyah = isBookmarked(surahNumber, ayah.numberInSurah);

                  return (
                    <span
                      key={ayah.numberInSurah}
                      ref={(el) => { if (el) ayahRefs.current.set(ayah.numberInSurah, el); }}
                      className="inline"
                      onMouseEnter={() => setActiveAyah(ayah.numberInSurah)}
                      onMouseLeave={() => !isCurrentlyPlaying && setActiveAyah(null)}
                    >
                      <span
                        onClick={() => setTafsirAyah(ayah)}
                        title="اضغط لعرض التفسير"
                        className={`inline cursor-pointer rounded transition-all duration-300 ${
                          isActive
                            ? 'bg-gradient-to-r from-amber-900/30 via-emerald-900/30 to-amber-900/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
                            : 'hover:bg-emerald-900/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                        }`}
                      >
                        {ayah.text}
                      </span>
                      {' '}
                      {/* Mushaf-style end-of-ayah ornament (U+06DD) — sized in em so it scales with the surrounding ayah font on any device */}
                      <span
                        className={`inline-block cursor-default select-none transition-colors duration-300 ${
                          isActive ? 'text-amber-300' : 'text-emerald-400'
                        }`}
                        style={{
                          fontFamily: 'Amiri, serif',
                          fontSize: '0.85em',
                          lineHeight: 1,
                          margin: '0 0.15em',
                          verticalAlign: 'baseline',
                          letterSpacing: 0,
                        }}
                        aria-label={`آية ${ayah.numberInSurah}`}
                      >
                        {'\u06DD'}{toArabicNum(ayah.numberInSurah)}
                      </span>
                      {' '}

                      {/* Hover actions */}
                      {activeAyah === ayah.numberInSurah && (
                        <span className="inline-flex items-center gap-1 mx-1" style={{ verticalAlign: 'middle' }}>
                          <button
                            onClick={() => toggleBookmark(ayah)}
                            className={`inline-flex p-1 rounded transition-colors ${isBookmarkedAyah ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'}`}
                            style={{ color: isBookmarkedAyah ? '#facc15' : undefined }}
                            title="إشارة مرجعية"
                          >
                            {isBookmarkedAyah ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => copyAyah(ayah)}
                            className="inline-flex p-1 rounded text-gray-500 hover:text-emerald-400 transition-colors"
                            title="نسخ"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}

        {/* Copy notification */}
        <AnimatePresence>
          {copied !== null && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-emerald-800 text-white px-4 py-2 rounded-xl font-cairo text-sm shadow-lg"
            >
              تم نسخ الآية
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10 gap-4">
          {surahNumber > 1 ? (
            <Link
              to={`/read/${surahNumber - 1}`}
              className="flex items-center gap-2 px-5 py-3 glass-card rounded-2xl text-gray-300 hover:text-emerald-400 font-cairo text-sm transition-all hover:border-emerald-700/40"
            >
              <ArrowRight className="w-4 h-4" />
              السورة السابقة
            </Link>
          ) : <div />}

          {surahNumber < 114 ? (
            <Link
              to={`/read/${surahNumber + 1}`}
              className="flex items-center gap-2 px-5 py-3 glass-card rounded-2xl text-gray-300 hover:text-emerald-400 font-cairo text-sm transition-all hover:border-emerald-700/40"
            >
              السورة التالية
              <ArrowLeft className="w-4 h-4" />
            </Link>
          ) : <div />}
        </div>
      </div>

      <TafsirModal
        open={tafsirAyah !== null}
        surahNumber={surahNumber}
        ayahNumber={tafsirAyah?.numberInSurah ?? 1}
        surahName={surah.name}
        ayahText={tafsirAyah?.text ?? ''}
        onClose={() => setTafsirAyah(null)}
      />
    </div>
  );
}
