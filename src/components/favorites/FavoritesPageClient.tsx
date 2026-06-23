
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { Heart, Bookmark, BookOpen, Headphones, Trash2, Clock } from 'lucide-react';
import { useFavorites } from '@/components/providers/FavoritesProvider';
import { useAudio } from '@/components/providers/AudioProvider';

const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toArabicNum(n: number): string {
  return String(n).split('').map(d => arabicNumerals[parseInt(d)] ?? d).join('');
}

export default function FavoritesPageClient() {
  const { favorites, bookmarks, lastRead, removeFavorite, removeBookmark } = useFavorites();
  const { playSurah } = useAudio();

  return (
    <div className="pt-20 pb-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-emerald-800/30 mb-4">
            <Heart className="w-4 h-4 text-red-400" />
            <span className="text-emerald-400 font-cairo text-sm">المفضلة</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Amiri, serif' }}>
            المفضلة
          </h1>
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent mx-auto" />
        </motion.div>

        {/* Last Read */}
        {lastRead && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-3xl p-6 mb-8 border border-emerald-800/30"
          >
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-4 h-4 text-emerald-400" />
              <h2 className="text-white font-cairo font-semibold">آخر موضع للقراءة</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-bold" style={{ fontFamily: 'Amiri, serif' }}>
                  سورة {lastRead.surahName}
                </p>
                <p className="text-gray-400 text-sm font-cairo mt-1">
                  الآية {toArabicNum(lastRead.ayahNumber)}
                </p>
              </div>
              <Link
                to={`/read/${lastRead.surahNumber}`}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-700/40 hover:bg-emerald-700/60 text-emerald-300 rounded-xl font-cairo text-sm transition-all"
              >
                <BookOpen className="w-4 h-4" />
                متابعة القراءة
              </Link>
            </div>
          </motion.div>
        )}

        {/* Favorite Surahs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-white font-cairo font-semibold mb-4 flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-400" />
            السور المفضلة
            <span className="text-gray-600 text-sm">({favorites.length})</span>
          </h2>

          {favorites.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <Heart className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 font-cairo">لا توجد سور مفضلة بعد</p>
              <Link to="/read" className="text-emerald-400 hover:text-emerald-300 text-sm font-cairo mt-2 inline-block">
                ابدأ القراءة وأضف سورًا للمفضلة
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AnimatePresence>
                {favorites.map((surah, idx) => (
                  <motion.div
                    key={surah.number}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, x: -20 }}
                    transition={{ delay: idx * 0.05 }}
                    className="glass-card rounded-2xl p-4 hover:border-emerald-700/40 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                        <span className="text-emerald-400 text-sm font-cairo font-bold">
                          {toArabicNum(surah.number)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold truncate" style={{ fontFamily: 'Amiri, serif' }}>
                          {surah.name}
                        </p>
                        <p className="text-gray-500 text-xs font-cairo">{toArabicNum(surah.numberOfAyahs)} آية</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => playSurah(surah as any)}
                          className="p-2 text-gray-500 hover:text-emerald-400 rounded-lg hover:bg-emerald-900/20 transition-all"
                        >
                          <Headphones className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          to={`/read/${surah.number}`}
                          className="p-2 text-gray-500 hover:text-emerald-400 rounded-lg hover:bg-emerald-900/20 transition-all"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => removeFavorite(surah.number)}
                          className="p-2 text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-900/20 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Bookmarks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-white font-cairo font-semibold mb-4 flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-yellow-400" />
            الإشارات المرجعية
            <span className="text-gray-600 text-sm">({bookmarks.length})</span>
          </h2>

          {bookmarks.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <Bookmark className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 font-cairo">لا توجد إشارات مرجعية بعد</p>
              <p className="text-gray-600 text-sm font-cairo mt-1">
                أضف إشارات مرجعية أثناء القراءة
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {bookmarks.map((bm, idx) => (
                  <motion.div
                    key={`${bm.surahNumber}-${bm.ayahNumber}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: idx * 0.05 }}
                    className="glass-card rounded-2xl p-4 hover:border-yellow-800/30 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-yellow-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bookmark className="w-4 h-4 text-yellow-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-yellow-400 text-sm font-cairo font-semibold">{bm.surahName}</span>
                          <span className="text-gray-600 text-xs font-cairo">الآية {toArabicNum(bm.ayahNumber)}</span>
                        </div>
                        <p className="text-gray-400 text-sm font-cairo line-clamp-2 leading-relaxed">
                          {bm.text}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Link
                          to={`/read/${bm.surahNumber}`}
                          className="p-2 text-gray-500 hover:text-emerald-400 rounded-lg hover:bg-emerald-900/20 transition-all"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => removeBookmark(bm.surahNumber, bm.ayahNumber)}
                          className="p-2 text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-900/20 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
