import { motion } from 'framer-motion';
import { Trophy, Flame, BookOpen, Headphones, Brain, Calendar } from 'lucide-react';
import { usePersonalRecords } from '@/hooks/usePersonalRecords';

const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const toArabicNum = (n: number) => String(n).split('').map(d => arabicNumerals[parseInt(d)] ?? d).join('');
const fmtDate = (s: string) => {
  try { return new Date(s).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }); }
  catch { return s; }
};

interface Props { style?: React.CSSProperties; }

export default function PersonalRecords({ style }: Props) {
  const r = usePersonalRecords();

  const cards = [
    { icon: BookOpen, label: 'أعلى يوم قراءة', value: r.bestAyahsDay?.value ?? 0, unit: 'آية', date: r.bestAyahsDay?.date, color: 'emerald' },
    { icon: Headphones, label: 'أعلى يوم استماع', value: r.bestListenDay?.value ?? 0, unit: 'دقيقة', date: r.bestListenDay?.date, color: 'blue' },
    { icon: Brain, label: 'أعلى يوم حفظ', value: r.bestMemoDay?.value ?? 0, unit: 'دقيقة', date: r.bestMemoDay?.date, color: 'amber' },
    { icon: Flame, label: 'أطول سلسلة', value: r.longestStreak, unit: 'يوم', date: null, color: 'orange' },
    { icon: Calendar, label: 'إجمالي الأيام النشطة', value: r.totalActiveDays, unit: 'يوم', date: null, color: 'purple' },
  ];

  const colorClass: Record<string, string> = {
    emerald: 'bg-emerald-950 border-emerald-800 text-emerald-400',
    blue: 'bg-blue-950 border-blue-800 text-blue-400',
    amber: 'bg-amber-950 border-amber-800 text-amber-400',
    orange: 'bg-orange-950 border-orange-800 text-orange-400',
    purple: 'bg-purple-950 border-purple-800 text-purple-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-emerald-900 bg-[#06140a] p-4 sm:p-6"
      style={style}
    >
      <h3 className="text-white font-cairo font-semibold mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-400" />
        أرقامك القياسية
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`p-3 rounded-xl border ${colorClass[c.color]}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" />
                <span className="text-xs font-cairo opacity-90">{c.label}</span>
              </div>
              <p className="text-white text-xl font-bold font-cairo">
                {toArabicNum(c.value)} <span className="text-xs opacity-70">{c.unit}</span>
              </p>
              {c.date && (
                <p className="text-[10px] font-cairo opacity-60 mt-1">{fmtDate(c.date)}</p>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
