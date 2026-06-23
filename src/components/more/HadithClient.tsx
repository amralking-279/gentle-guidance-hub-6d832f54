import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { MessageSquare, Search, BookOpen, Clock, ChevronRight, ChevronLeft } from 'lucide-react';
import { HADITH_BOOKS, colorClassMap } from '@/lib/data/hadithBooks';

const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
export function toArabicNum(n: number): string {
  return String(n).split('').map(d => arabicNumerals[parseInt(d)] ?? d).join('');
}

export default function HadithClient() {
  const [query, setQuery] = useState('');

  const list = useMemo(
    () =>
      HADITH_BOOKS.filter(
        b => !query || b.arabicName.includes(query) || b.author.includes(query) || b.englishName.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );

  return (
    <main className="min-h-screen bg-[#030a06]">
      <div className="pt-24 pb-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-emerald-800/30 mb-4">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <span className="text-purple-400 font-cairo text-sm">مكتبة الحديث الشريف</span>
            </div>
            <h1
              className="text-4xl md:text-5xl font-bold text-white mb-3"
              style={{ fontFamily: 'Amiri, serif' }}
            >
              كتب السنة النبوية
            </h1>
            <p className="text-gray-400 font-cairo">
              الكتب التسعة وأصول الحديث — بحثٌ، تصفّحٌ، وقراءةٌ كاملةٌ
            </p>
          </motion.div>

          <div className="relative mb-8 max-w-2xl mx-auto">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ابحث عن كتاب..."
              className="w-full pr-12 pl-4 py-3 rounded-xl glass border border-emerald-800/40 bg-emerald-900/20 text-white font-cairo focus:outline-none focus:border-emerald-600"
              style={{ direction: 'rtl' }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((book, i) => {
              const colors = colorClassMap[book.color] || colorClassMap.emerald;
              const inner = (
                <div
                  className={`relative h-full rounded-2xl p-5 border ${colors.border} ${
                    book.available
                      ? `${colors.bg} ${colors.ring} hover:scale-[1.02] hover:-translate-y-0.5 cursor-pointer`
                      : 'bg-gray-900/30 opacity-60'
                  } transition-all duration-300`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center`}>
                      <BookOpen className={`w-6 h-6 ${colors.text}`} />
                    </div>
                    {!book.available && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-gray-800/60 border border-gray-700/40 text-gray-400 font-cairo">
                        <Clock className="w-3 h-3" />
                        بعد قريب
                      </span>
                    )}
                    {book.available && (
                      <ChevronLeft className={`w-5 h-5 ${colors.text} opacity-60`} />
                    )}
                  </div>

                  <h3
                    className="text-2xl text-white mb-1 leading-tight"
                    style={{ fontFamily: 'Amiri, serif' }}
                  >
                    {book.arabicName}
                  </h3>
                  <p className="text-gray-400 font-cairo text-sm mb-3">{book.author}</p>

                  <div className="flex items-center justify-between pt-3 border-t border-emerald-900/30">
                    <span className={`${colors.text} font-cairo text-sm font-bold`}>
                      {toArabicNum(book.count)} حديث
                    </span>
                    <span className="text-gray-500 font-cairo text-xs">{book.englishName}</span>
                  </div>
                </div>
              );

              if (!book.available) {
                return (
                  <motion.div
                    key={book.slug}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.5) }}
                  >
                    {inner}
                  </motion.div>
                );
              }
              return (
                <motion.div
                  key={book.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.5) }}
                >
                  <Link
                    to="/more/hadith/$book"
                    params={{ book: book.slug }}
                    className="block h-full"
                  >
                    {inner}
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {list.length === 0 && (
            <p className="text-center text-gray-400 font-cairo mt-8">لا توجد نتائج</p>
          )}

          <div className="text-center mt-10">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-900/40 border border-emerald-700/40 text-emerald-400 hover:bg-emerald-900/60 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
              <span className="font-cairo">العودة للرئيسية</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
