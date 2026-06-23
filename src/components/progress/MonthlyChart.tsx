import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useProgress } from '@/components/providers/ProgressProvider';

type RangeKey = '7' | '30' | '90';

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '7', label: '٧ أيام', days: 7 },
  { key: '30', label: '٣٠ يوم', days: 30 },
  { key: '90', label: '٩٠ يوم', days: 90 },
];

interface Props {
  className?: string;
  style?: React.CSSProperties;
}

export default function MonthlyChart({ className = '', style }: Props) {
  const { dailyWird, dailyHistory } = useProgress();
  const [range, setRange] = useState<RangeKey>('30');

  const data = useMemo(() => {
    const days = RANGES.find(r => r.key === range)!.days;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const out: { date: string; label: string; ayahs: number; listen: number; memo: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const w = dateStr === dailyWird?.date ? dailyWird : dailyHistory.find(h => h.date === dateStr);
      const label = days <= 7
        ? d.toLocaleDateString('ar-EG', { weekday: 'short' })
        : d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
      out.push({
        date: dateStr,
        label,
        ayahs: w?.ayahsRead ?? 0,
        listen: w?.minutesListened ?? 0,
        memo: w?.memorizationMinutes ?? 0,
      });
    }
    return out;
  }, [range, dailyWird, dailyHistory]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-emerald-900 bg-[#06140a] p-4 sm:p-6 ${className}`}
      style={style}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="text-white font-cairo font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          تطور النشاط
        </h3>
        <div className="flex gap-1 p-1 bg-emerald-950 rounded-lg border border-emerald-900">
          {RANGES.map(r => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={`px-3 py-1 text-xs font-cairo rounded-md transition-colors ${
                range === r.key
                  ? 'bg-emerald-700 text-white'
                  : 'text-gray-400 hover:text-emerald-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#0a3a1f" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              stroke="#4b6b54"
              tick={{ fill: '#6b8a72', fontSize: 10, fontFamily: 'Cairo' }}
              interval={range === '90' ? 9 : range === '30' ? 3 : 0}
            />
            <YAxis stroke="#4b6b54" tick={{ fill: '#6b8a72', fontSize: 10 }} width={28} />
            <Tooltip
              contentStyle={{
                background: '#06140a',
                border: '1px solid #0a3a1f',
                borderRadius: 8,
                fontFamily: 'Cairo',
                fontSize: 12,
              }}
              labelStyle={{ color: '#10b981' }}
              itemStyle={{ color: '#e5e7eb' }}
              formatter={(value: number, name: string) => [value, name]}
            />
            <Legend
              wrapperStyle={{ fontFamily: 'Cairo', fontSize: 12, color: '#9ca3af' }}
              iconType="circle"
            />
            <Line type="monotone" dataKey="ayahs" name="آيات" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="listen" name="استماع (د)" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="memo" name="حفظ (د)" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
