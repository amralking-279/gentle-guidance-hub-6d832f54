
import { useState, useMemo, useEffect, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { fetchSurahs } from '@/services/quranApi';
import SurahCard from './SurahCard';
import SurahCardSkeleton from './SurahCardSkeleton';
import type { Surah } from '@/types/quran';

type FilterType = 'all' | 'meccan' | 'medinan';

const safeLayerStyle: CSSProperties = {
  isolation: 'isolate',
  contain: 'paint',
  transform: 'translate3d(0,0,0)',
  willChange: 'transform',
  boxShadow: 'none',
  backgroundImage: 'none',
  filter: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
};

// Normalize Arabic text for better matching
function normalizeArabic(text: string): string {
  return text
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ةه]/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function SurahList() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSurahs()
      .then(data => {
        if (!cancelled) {
          setSurahs(data);
          setError(null);
        }
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'حدث خطأ في تحميل البيانات');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!surahs.length) return [];
    const normalizedQuery = normalizeArabic(query);
    const simpleQuery = query.toLowerCase().trim();

    return surahs.filter(s => {
      // Filter by revelation type
      const matchesFilter =
        filter === 'all' ||
        (filter === 'meccan' && s.revelationType === 'Meccan') ||
        (filter === 'medinan' && s.revelationType === 'Medinan');

      if (!matchesFilter) return false;

      // If no query, return all matching filter
      if (!query.trim()) return true;

      // Search in normalized Arabic name
      const normalizedName = normalizeArabic(s.name);
      if (normalizedName.includes(normalizedQuery)) return true;

      // Search in original Arabic name (for decorative chars)
      if (s.name.includes(query)) return true;

      // Search in English name
      if (s.englishName.toLowerCase().includes(simpleQuery)) return true;

      // Search in translation
      if (s.englishNameTranslation.toLowerCase().includes(simpleQuery)) return true;

      // Search by number
      if (String(s.number).includes(simpleQuery)) return true;

      return false;
    });
  }, [surahs, query, filter]);

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 font-cairo mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-emerald-900 text-emerald-300 rounded-xl font-cairo border border-emerald-800 hover:brightness-125 transition-colors"
          style={safeLayerStyle}
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={safeLayerStyle}>
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-emerald-900 bg-[#06140a] p-3" style={safeLayerStyle}>
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث باسم السورة أو رقمها..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-emerald-950 border border-emerald-800 rounded-xl px-4 py-3 pr-10 text-white placeholder-gray-600 font-cairo text-sm focus:outline-none focus:border-emerald-600 transition-colors duration-200"
            style={safeLayerStyle}
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'meccan', 'medinan'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-cairo transition-all duration-200 ${
                filter === f
                  ? 'bg-emerald-900 text-emerald-300 border border-emerald-700'
                  : 'bg-gray-950 text-gray-400 border border-gray-800 hover:text-emerald-300 hover:brightness-125'
              }`}
              style={safeLayerStyle}
            >
              {f === 'all' ? 'الكل' : f === 'meccan' ? 'مكية' : 'مدنية'}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-gray-500 text-sm font-cairo">
          {filtered.length} سورة
        </p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 rounded-2xl border border-emerald-900 bg-[#06140a] p-3" style={safeLayerStyle}>
        {loading
          ? Array.from({ length: 12 }).map((_, i) => <SurahCardSkeleton key={i} />)
          : filtered.map((surah, idx) => (
              <SurahCard key={surah.number} surah={surah} index={idx} />
            ))
        }
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 font-cairo">لا توجد نتائج مطابقة لـ "{query}"</p>
        </div>
      )}
    </div>
  );
}
