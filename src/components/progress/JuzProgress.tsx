import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';
import { useProgress } from '@/components/providers/ProgressProvider';
import { computeJuzCompletion, SURAH_AYAH_COUNTS } from '@/lib/data/juzData';

const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const toArabicNum = (n: number) => String(n).split('').map(d => arabicNumerals[parseInt(d)] ?? d).join('');

interface Props { style?: React.CSSProperties; }

export default function JuzProgress({ style }: Props) {
  const { surahMemorizations } = useProgress();

  const juzData = useMemo(() => {
    const fractionBySurah: Record<number, number> = {};
    surahMemorizations.forEach(s => {
      if (s.status === 'completed') fractionBySurah[s.surahNumber] = 1;
      else if (s.status === 'memorized') fractionBySurah[s.surahNumber] = Math.max(0.8, s.progress / 100);
      else if (s.status === 'in-progress' || s.status === 'needs-review') {
        fractionBySurah[s.surahNumber] = (s.progress || 0) / 100;
      }
    });
    return computeJuzCompletion(fractionBySurah);
  }, [surahMemorizations]);

  const totalCompleted = juzData.filter(j => j.percentage >= 100).length;
  const totalPartial = juzData.filter(j => j.percentage > 0 && j.percentage < 100).length;

  const colorFor = (p: number) => {
    if (p >= 100) return 'bg-emerald-500 border-emerald-400 text-white';
    if (p >= 75) return 'bg-emerald-700 border-emerald-600 text-emerald-100';
    if (p >= 50) return 'bg-emerald-800 border-emerald-700 text-emerald-200';
    if (p >= 25) return 'bg-emerald-900 border-emerald-800 text-emerald-300';
    if (p > 0) return 'bg-emerald-950 border-emerald-900 text-emerald-400';
    return 'bg-gray-950 border-gray-800 text-gray-600';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-emerald-900 bg-[#06140a] p-4 sm:p-6"
      style={style}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-white font-cairo font-semibold flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-400" />
          الأجزاء الـ ٣٠
        </h3>
        <div className="flex gap-3 text-xs font-cairo">
          <span className="text-emerald-400">مكتمل: {toArabicNum(totalCompleted)}</span>
          <span className="text-emerald-600">جزئي: {toArabicNum(totalPartial)}</span>
        </div>
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
        {juzData.map(j => (
          <div
            key={j.juz}
            className={`group relative aspect-square rounded-lg border flex flex-col items-center justify-center cursor-default ${colorFor(j.percentage)}`}
            title={`الجزء ${j.juz}: ${j.percentage}% (${j.completedAyahs}/${j.totalAyahs})`}
          >
            <span className="text-xs font-cairo font-bold leading-none">{toArabicNum(j.juz)}</span>
            <span className="text-[9px] font-cairo opacity-80 mt-0.5">{toArabicNum(j.percentage)}%</span>
            <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-950 rounded text-[10px] font-cairo text-gray-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-gray-800">
              الجزء {toArabicNum(j.juz)} — {toArabicNum(j.completedAyahs)}/{toArabicNum(j.totalAyahs)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 justify-center text-[10px] font-cairo text-gray-500">
        <span>أقل</span>
        <div className="w-3 h-3 rounded bg-gray-950 border border-gray-800" />
        <div className="w-3 h-3 rounded bg-emerald-950 border border-emerald-900" />
        <div className="w-3 h-3 rounded bg-emerald-800 border border-emerald-700" />
        <div className="w-3 h-3 rounded bg-emerald-500 border border-emerald-400" />
        <span>أكثر</span>
      </div>
    </motion.div>
  );
}

// re-export for tests/usage
export { SURAH_AYAH_COUNTS };
