import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Search, BookOpen, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { HADITH_BOOKS, colorClassMap } from '@/lib/data/hadithBooks';
import { fetchFullBook, type HadithItem } from '@/services/hadithApi';
import { formatGrade } from '@/lib/data/hadithGrades';
import { toArabicNum } from './HadithClient';

const PAGE_SIZE = 20;

export default function HadithBookClient({ bookSlug }: { bookSlug: string }) {
  const book = HADITH_BOOKS.find(b => b.slug === bookSlug);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const colors = colorClassMap[book?.color ?? 'emerald'] || colorClassMap.emerald;

  const { data, isLoading, error } = useQuery({
    queryKey: ['hadith-book', bookSlug],
    queryFn: () => fetchFullBook(bookSlug),
    enabled: !!book?.available,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2,
  });

  const sectionsList = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.metadata.sections)
      .filter(([id]) => id !== '0')
      .map(([id, name]) => ({ id, name }));
  }, [data]);

  const filteredHadiths = useMemo<HadithItem[]>(() => {
    if (!data) return [];
    let list = data.hadiths;
    if (activeSection) {
      const detail = data.metadata.section_details[activeSection];
      if (detail) {
        list = list.filter(
          h =>
            h.hadithnumber >= detail.hadithnumber_first &&
            h.hadithnumber <= detail.hadithnumber_last,
        );
      }
    }
    list = list.filter(h => h.text && h.text.trim().length > 0);


    if (query.trim()) {
      const q = query.trim();
      list = list.filter(h => h.text.includes(q) || String(h.hadithnumber).includes(q));
    }
    return list;
  }, [data, query, activeSection]);

  const effectivePageSize =
    filteredHadiths.length <= 50 ? Math.max(filteredHadiths.length, 1) : PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filteredHadiths.length / effectivePageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedHadiths = filteredHadiths.slice(
    (currentPage - 1) * effectivePageSize,
    currentPage * effectivePageSize,
  );


  if (!book) {
    return (
      <main className="min-h-screen bg-[#030a06] pt-24 px-4">
        <div className="max-w-xl mx-auto text-center py-20">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-white text-xl font-cairo mb-3">الكتاب غير موجود</h2>
          <Link
            to="/more/hadith"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-900/40 border border-emerald-700/40 text-emerald-400 font-cairo"
          >
            <ChevronRight className="w-4 h-4" />
            مكتبة الحديث
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#030a06]">
      <div className="pt-24 pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl p-6 border ${colors.border} ${colors.bg} ${colors.ring} mb-8`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center`}>
                <BookOpen className={`w-7 h-7 ${colors.text}`} />
              </div>
              <div className="flex-1">
                <h1
                  className="text-3xl md:text-4xl text-white leading-tight"
                  style={{ fontFamily: 'Amiri, serif' }}
                >
                  {book.arabicName}
                </h1>
                <p className="text-gray-400 font-cairo text-sm mt-1">
                  {book.author} • {toArabicNum(book.count)} حديث
                </p>
              </div>
            </div>
          </motion.div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="ابحث في الأحاديث (نص أو رقم)..."
              className="w-full pr-12 pl-4 py-3 rounded-xl glass border border-emerald-800/40 bg-emerald-900/20 text-white font-cairo focus:outline-none focus:border-emerald-600"
              style={{ direction: 'rtl' }}
            />
          </div>

          {/* Sections filter */}
          {sectionsList.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-gray-400 font-cairo text-sm">الأبواب:</span>
                {activeSection && (
                  <button
                    onClick={() => {
                      setActiveSection(null);
                      setPage(1);
                    }}
                    className="text-xs px-2 py-1 rounded-md bg-emerald-900/40 border border-emerald-700/40 text-emerald-400 font-cairo"
                  >
                    عرض الكل ×
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2">
                {sectionsList.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActiveSection(s.id);
                      setPage(1);
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-cairo transition-all ${
                      activeSection === s.id
                        ? `${colors.bg} ${colors.border} ${colors.text}`
                        : 'bg-emerald-950/30 border-emerald-900/30 text-gray-400 hover:text-emerald-400'
                    }`}
                  >
                    باب {toArabicNum(parseInt(s.id))}
                    {s.name && <span className="opacity-60"> · {s.name}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className={`w-10 h-10 ${colors.text} animate-spin mb-4`} />
              <p className="text-gray-400 font-cairo">جاري تحميل الكتاب...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-center py-12">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-red-300 font-cairo">تعذّر تحميل الكتاب، حاول مجددًا.</p>
            </div>
          )}

          {/* Hadiths */}
          {data && !isLoading && (
            <>
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 font-cairo text-sm">
                  {toArabicNum(filteredHadiths.length)} حديث
                </span>
                <span className="text-gray-500 font-cairo text-xs">
                  صفحة {toArabicNum(currentPage)} من {toArabicNum(totalPages)}
                </span>
              </div>

              <div className="space-y-4">
                {pagedHadiths.map((h, i) => (
                  <motion.div
                    key={h.hadithnumber}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    className="glass-card rounded-2xl p-5 border border-emerald-900/40"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`shrink-0 w-12 h-12 rounded-xl ${colors.bg} ${colors.border} border ${colors.text} font-cairo font-bold flex items-center justify-center text-sm`}
                      >
                        {toArabicNum(h.hadithnumber)}
                      </div>
                      <p
                        className="text-white text-lg leading-loose flex-1"
                        style={{ fontFamily: 'Amiri, serif', direction: 'rtl' }}
                      >
                        {h.text}
                      </p>
                    </div>
                    {h.grades && h.grades.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-emerald-900/30 flex flex-wrap gap-2">
                        {h.grades.map((g, gi) => (
                          <span
                            key={gi}
                            className="text-[11px] px-2 py-0.5 rounded bg-emerald-900/30 border border-emerald-800/40 text-emerald-300 font-cairo"
                          >
                            {formatGrade(g.name, g.grade)}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
                {pagedHadiths.length === 0 && (
                  <p className="text-center text-gray-400 font-cairo py-10">لا توجد نتائج</p>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-gray-300 font-cairo text-sm disabled:opacity-40"
                  >
                    السابق
                  </button>
                  <span className="px-3 py-2 rounded-lg bg-emerald-900/40 border border-emerald-700/40 text-emerald-300 font-cairo text-sm">
                    {toArabicNum(currentPage)} / {toArabicNum(totalPages)}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-gray-300 font-cairo text-sm disabled:opacity-40"
                  >
                    التالي
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
