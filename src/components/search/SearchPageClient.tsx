
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { Search, BookOpen, Headphones, Loader2 } from 'lucide-react';
import { fetchSurahs } from '@/services/quranApi';
import { useAudio } from '@/components/providers/AudioProvider';
import type { Surah } from '@/types/quran';

// Normalize Arabic for better matching: strip diacritics, tatweel, normalize
// hamza/ya/ta-marbuta and alif-wasla so "الفاتحة" matches "سُورَةُ ٱلْفَاتِحَةِ".
function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // tashkeel + superscript alif + tatweel
    .replace(/[\u06D6-\u06ED]/g, '')              // Quranic annotation signs
    .replace(/[\u0671\u0622\u0623\u0625]/g, 'ا') // alif wasla / madda / hamza variants
    .replace(/[ةه]/g, 'ه')
    .replace(/[ىيئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/\s+/g, ' ')
    .trim();
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const normalizedQuery = normalizeArabic(query);
  if (!normalizedQuery) return text;

  // Build normalized string char-by-char with a map back to original indices,
  // so the highlight covers the real substring (including diacritics).
  const map: number[] = [];
  let normalized = '';
  for (let i = 0; i < text.length; i++) {
    const n = normalizeArabic(text[i]);
    for (let j = 0; j < n.length; j++) map.push(i);
    normalized += n;
  }

  const idx = normalized.indexOf(normalizedQuery);
  if (idx === -1) return text;

  const start = map[idx] ?? 0;
  const end = (map[idx + normalizedQuery.length - 1] ?? start) + 1;

  return (
    <>
      {text.slice(0, start)}
      <mark className="bg-emerald-800/60 text-emerald-300 rounded px-0.5">
        {text.slice(start, end)}
      </mark>
      {text.slice(end)}
    </>
  );
}

const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toArabicNum(n: number): string {
  return String(n).split('').map(d => arabicNumerals[parseInt(d)] ?? d).join('');
}

export default function SearchPageClient() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [loading, setLoading] = useState(true);
  const { playSurah } = useAudio();
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchSurahs()
      .then(data => {
        setSurahs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const results = useMemo(() => {
    if (!query.trim() || !surahs.length) return [];

    const normalizedQuery = normalizeArabic(query);
    const simpleQuery = query.toLowerCase().trim();

    return surahs.filter(s => {
      // Search in normalized Arabic name
      const normalizedName = normalizeArabic(s.name);
      if (normalizedName.includes(normalizedQuery)) return true;

      // Search in original name
      if (s.name.includes(query)) return true;

      // Search in English name
      if (s.englishName.toLowerCase().includes(simpleQuery)) return true;

      // Search in translation
      if (s.englishNameTranslation.toLowerCase().includes(simpleQuery)) return true;

      // Search by number
      if (String(s.number).includes(simpleQuery)) return true;

      return false;
    });
  }, [surahs, query]);

  return (
    <div className="pt-20 pb-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-emerald-800/30 mb-4">
            <Search className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-cairo text-sm">البحث</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Amiri, serif' }}>
            البحث في القرآن
          </h1>
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent mx-auto" />
        </motion.div>

        {/* Search Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative mb-8"
        >
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600 pointer-events-none" />
          {loading && (
            <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
          )}
          <input
            type="text"
            placeholder="ابحث باسم السورة أو رقمها..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-white/5 border border-emerald-800/40 rounded-2xl px-5 py-4 pr-12 text-white placeholder-gray-600 font-cairo text-base focus:outline-none focus:border-emerald-600/60 focus:shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all duration-200"
          />
        </motion.div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {query.trim() === '' ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-emerald-800" />
              </div>
              <p className="text-gray-500 font-cairo">اكتب للبحث في سور القرآن الكريم</p>
            </motion.div>
          ) : results.length === 0 ? (
            <motion.div
              key="no-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16"
            >
              <p className="text-gray-500 font-cairo">لا توجد نتائج لـ "{query}"</p>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <p className="text-gray-500 text-sm font-cairo mb-4">
                {results.length} نتيجة
              </p>
              {results.map((surah, idx) => (
                <motion.div
                  key={surah.number}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="glass-card rounded-2xl p-4 hover:border-emerald-700/40 transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-400 text-sm font-cairo font-bold">
                        {toArabicNum(surah.number)}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Amiri, serif' }}>
                        {highlight(surah.name, query)}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 font-cairo mt-0.5">
                        <span>{surah.englishName}</span>
                        <span>·</span>
                        <span>{toArabicNum(surah.numberOfAyahs)} آية</span>
                        <span className={`px-2 py-0.5 rounded-full ${
                          surah.revelationType === 'Meccan'
                            ? 'bg-amber-900/30 text-amber-400'
                            : 'bg-emerald-900/30 text-emerald-400'
                        }`}>
                          {surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => playSurah(surah)}
                        className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-900/30 transition-all"
                        title="استمع"
                      >
                        <Headphones className="w-4 h-4" />
                      </button>
                      <Link
                        to={`/read/${surah.number}`}
                        className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-900/30 transition-all"
                        title="اقرأ"
                      >
                        <BookOpen className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
