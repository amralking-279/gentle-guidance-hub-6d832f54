import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { GitCompare, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useProgress } from '@/components/providers/ProgressProvider';

const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const toArabicNum = (n: number) => String(n).split('').map(d => arabicNumerals[parseInt(d)] ?? d).join('');

interface Props { style?: React.CSSProperties; }

function sumRange(days: { ayahsRead: number; minutesListened: number; memorizationMinutes: number }[]) {
  return days.reduce(
    (acc, d) => ({
      ayahs: acc.ayahs + (d.ayahsRead || 0),
      listen: acc.listen + (d.minutesListened || 0),
      memo: acc.memo + (d.memorizationMinutes || 0),
    }),
    { ayahs: 0, listen: 0, memo: 0 }
  );
}

export default function MonthComparison({ style }: Props) {
  const { dailyWird, dailyHistory } = useProgress();

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const day = 86400000;

    const all = dailyWird ? [...dailyHistory, dailyWird] : dailyHistory;

    const last30 = all.filter(d => {
      const t = new Date(d.date).getTime();
      return t >= todayMs - 30 * day && t <= todayMs;
    });
    const prev30 = all.filter(d => {
      const t = new Date(d.date).getTime();
      return t >= todayMs - 60 * day && t < todayMs - 30 * day;
    });

    const current = sumRange(last30);
    const previous = sumRange(prev30);

    const pct = (cur: number, prev: number) => {
      if (prev === 0) return cur > 0 ? 100 : 0;
      return Math.round(((cur - prev) / prev) * 100);
    };

    return {
      current,
      previous,
      changes: {
        ayahs: pct(current.ayahs, previous.ayahs),
        listen: pct(current.listen, previous.listen),
        memo: pct(current.memo, previous.memo),
      },
    };
  }, [dailyWird, dailyHistory]);

  const rows = [
    { key: 'ayahs', label: 'آيات مقروءة', cur: stats.current.ayahs, prev: stats.previous.ayahs, change: stats.changes.ayahs },
    { key: 'listen', label: 'دقائق استماع', cur: stats.current.listen, prev: stats.previous.listen, change: stats.changes.listen },
    { key: 'memo', label: 'دقائق حفظ', cur: stats.current.memo, prev: stats.previous.memo, change: stats.changes.memo },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-emerald-900 bg-[#06140a] p-4 sm:p-6"
      style={style}
    >
      <h3 className="text-white font-cairo font-semibold mb-4 flex items-center gap-2">
        <GitCompare className="w-5 h-5 text-emerald-400" />
        مقارنة الـ ٣٠ يوم الأخيرة بالسابقة
      </h3>
      <div className="space-y-2">
        {rows.map(r => {
          const up = r.change > 0, down = r.change < 0;
          const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
          const color = up ? 'text-emerald-400' : down ? 'text-red-400' : 'text-gray-500';
          return (
            <div key={r.key} className="flex items-center justify-between p-3 rounded-xl bg-emerald-950 border border-emerald-900">
              <span className="text-gray-300 font-cairo text-sm">{r.label}</span>
              <div className="flex items-center gap-3 text-sm font-cairo">
                <span className="text-gray-500">{toArabicNum(r.prev)} →</span>
                <span className="text-white font-semibold">{toArabicNum(r.cur)}</span>
                <span className={`flex items-center gap-1 ${color} min-w-[60px] justify-end`}>
                  <Icon className="w-3.5 h-3.5" />
                  {toArabicNum(Math.abs(r.change))}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
