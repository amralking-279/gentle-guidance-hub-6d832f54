
import { type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { BookOpen, Headphones, Heart, MapPin } from 'lucide-react';
import type { Surah } from '@/types/quran';
import { useFavorites } from '@/components/providers/FavoritesProvider';
import { useAudio } from '@/components/providers/AudioProvider';

interface SurahCardProps {
  surah: Surah;
  index: number;
  mode?: 'read' | 'listen' | 'default';
}

const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toArabicNumerals(n: number): string {
  return String(n).split('').map(d => arabicNumerals[parseInt(d)] ?? d).join('');
}

// Static surface isolation. Do NOT apply to elements that framer-motion
// animates (transform animations + paint containment corrupt the GPU layer).
const safeLayerStyle: CSSProperties = {
  isolation: 'isolate',
  contain: 'paint',
  transform: 'translateZ(0)',
  backfaceVisibility: 'hidden',
  boxShadow: 'none',
  backgroundImage: 'none',
  filter: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
};

export default function SurahCard({ surah, index, mode = 'default' }: SurahCardProps) {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { playSurah, currentSurah, isPlaying } = useAudio();
  const fav = isFavorite(surah.number);
  const isCurrentlyPlaying = currentSurah?.number === surah.number && isPlaying;

  function toggleFav(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (fav) {
      removeFavorite(surah.number);
    } else {
      addFavorite({
        number: surah.number,
        name: surah.name,
        numberOfAyahs: surah.numberOfAyahs,
        revelationType: surah.revelationType,
        addedAt: Date.now(),
      });
    }
  }

  function handlePlay(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    playSurah(surah);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.6) }}
      className="group"
    >
      <div
        className={`relative rounded-2xl p-4 bg-emerald-950 border border-emerald-800 transition-colors duration-200 hover:brightness-125 ${
          isCurrentlyPlaying ? 'border-emerald-600' : ''
        }`}
        style={safeLayerStyle}
      >
        {/* Playing indicator */}
        {isCurrentlyPlaying && (
          <div className="absolute top-2 right-2 flex gap-0.5 items-end h-4">
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                className="w-0.5 bg-emerald-400 rounded-full"
                animate={{ height: ['30%', '100%', '30%'] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Number */}
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-900 border border-emerald-800 flex items-center justify-center" style={safeLayerStyle}>
            <span className="text-emerald-400 font-cairo text-sm font-bold">
              {toArabicNumerals(surah.number)}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3
                className="text-white font-bold text-base truncate"
                style={{ fontFamily: 'Amiri, serif' }}
              >
                {surah.name}
              </h3>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-cairo flex-shrink-0 ${
                surah.revelationType === 'Meccan'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-emerald-900 text-emerald-300 border border-emerald-800'
              }`}>
                {surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 font-cairo">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {surah.englishNameTranslation}
              </span>
              <span>{toArabicNumerals(surah.numberOfAyahs)} آية</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={toggleFav}
              className={`p-2 rounded-lg transition-all duration-200 ${
                fav
                  ? 'text-red-300 bg-red-950 border border-red-800'
                  : 'text-gray-500 bg-gray-950 border border-gray-800 hover:text-red-300 hover:brightness-125'
              }`}
              title={fav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
            >
              <Heart className={`w-4 h-4 ${fav ? 'fill-red-400' : ''}`} />
            </button>

            <button
              onClick={handlePlay}
              className={`p-2 rounded-lg transition-all duration-200 ${
                isCurrentlyPlaying
                  ? 'text-emerald-300 bg-emerald-900 border border-emerald-800'
                  : 'text-gray-500 bg-gray-950 border border-gray-800 hover:text-emerald-300 hover:brightness-125'
              }`}
              title="استمع"
            >
              <Headphones className="w-4 h-4" />
            </button>

            <Link
              to={`/read/${surah.number}`}
              className="p-2 rounded-lg text-gray-500 bg-gray-950 border border-gray-800 hover:text-emerald-300 hover:brightness-125 transition-colors duration-200"
              title="اقرأ"
            >
              <BookOpen className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
