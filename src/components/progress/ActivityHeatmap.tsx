import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { useProgress } from '@/components/providers/ProgressProvider';
import type { DailyWird } from '@/types/quran';

const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toArabicNum(n: number): string {
  return String(n).split('').map(d => arabicNumerals[parseInt(d)] ?? d).join('');
}

const WEEKDAY_LABELS = ['س', 'ج', 'خ', 'ر', 'ث', 'ن', 'ح'];
// Order in display (right→left in our flex): Sat..Fri (Arabic week starts on Saturday traditionally)
// We'll keep it simple: each column = one calendar week; rows = days of week (Sat→Fri).

function dayActivity(w?: DailyWird | null): number {
  if (!w) return 0;
  return w.ayahsRead + w.minutesListened + w.memorizationMinutes + (w.pagesRead * 10);
}

function intensityClass(value: number, max: number): string {
  if (value === 0 || max === 0) return 'bg-emerald-950/60 border-emerald-900';
  const ratio = value / max;
  if (ratio < 0.2) return 'bg-emerald-900 border-emerald-800';
  if (ratio < 0.4) return 'bg-emerald-800 border-emerald-700';
  if (ratio < 0.6) return 'bg-emerald-700 border-emerald-600';
  if (ratio < 0.85) return 'bg-emerald-600 border-emerald-500';
  return 'bg-emerald-500 border-emerald-400';
}

interface Props {
  className?: string;
  style?: React.CSSProperties;
}

export default function ActivityHeatmap({ className = '', style }: Props) {
  const { dailyWird, dailyHistory } = useProgress();
  const [hover, setHover] = useState<{ date: string; total: number; w?: DailyWird } | null>(null);

  const { weeks, max } = useMemo(() => {
    // 12 weeks × 7 days = 84 cells; we anchor to today on the right.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: { date: string; w?: DailyWird; total: number }[] = [];

    // Find the most recent Friday-end (end of week). Saturday = start (day 6 in JS Sat=6).
    // We want today as the last filled cell; the rest of its week is empty.
    const todayDow = today.getDay(); // 0=Sun..6=Sat
    // distance from today back to the previous Saturday (start of current week)
    const sinceWeekStart = (todayDow + 1) % 7; // Sat=>0, Sun=>1, ..., Fri=>6
    // total cells to render so today lands in its proper row inside the last column
    const totalCells = 12 * 7;
    // anchor: the date of the top-left cell = today - (sinceWeekStart) - 11 weeks of days
    const startOffset = sinceWeekStart + 11 * 7;
    const start = new Date(today);
    start.setDate(start.getDate() - startOffset);

    for (let i = 0; i < totalCells; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const w = dateStr === dailyWird?.date ? dailyWird : dailyHistory.find(h => h.date === dateStr);
      days.push({ date: dateStr, w: w ?? undefined, total: dayActivity(w) });
    }

    // Build into 12 columns × 7 rows (row = day of week Sat→Fri)
    const cols: typeof days[] = [];
    for (let c = 0; c < 12; c++) {
      cols.push(days.slice(c * 7, c * 7 + 7));
    }
    const m = days.reduce((acc, d) => Math.max(acc, d.total), 0);
    return { weeks: cols, max: m };
  }, [dailyWird, dailyHistory]);

  const formatDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-emerald-900 bg-[#06140a] p-4 sm:p-6 ${className}`}
      style={style}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-cairo font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          خريطة النشاط (٦٠ يوماً)
        </h3>
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-gray-500 font-cairo">
          <span>أقل</span>
          <div className="flex gap-1">
            {['bg-emerald-950/60', 'bg-emerald-800', 'bg-emerald-600', 'bg-emerald-500'].map((c, i) => (
              <span key={i} className={`w-3 h-3 rounded-sm ${c} border border-emerald-900`} />
            ))}
          </div>
          <span>أكثر</span>
        </div>
      </div>

      <div className="relative">
        <div className="flex gap-1.5 justify-center" dir="ltr">
          {/* weekday labels column */}
          <div className="flex flex-col gap-1.5 pr-1 justify-between text-[9px] text-gray-600 font-cairo">
            {WEEKDAY_LABELS.map((d, i) => (
              <span key={i} className="h-3.5 leading-3.5">{i % 2 === 0 ? d : ''}</span>
            ))}
          </div>
          {weeks.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1.5">
              {col.map((cell, ri) => {
                const isFuture = new Date(cell.date) > new Date();
                return (
                  <button
                    key={ri}
                    type="button"
                    aria-label={`${formatDate(cell.date)} — ${cell.total} نشاط`}
                    onMouseEnter={() => setHover({ date: cell.date, total: cell.total, w: cell.w })}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover({ date: cell.date, total: cell.total, w: cell.w })}
                    onBlur={() => setHover(null)}
                    className={`w-3.5 h-3.5 rounded-sm border transition-all ${
                      isFuture ? 'bg-transparent border-transparent' : intensityClass(cell.total, max)
                    } hover:scale-125 hover:ring-1 hover:ring-emerald-400`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {hover && (
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full px-3 py-2 bg-gray-950 border border-emerald-800 rounded-lg shadow-lg text-xs font-cairo text-gray-200 whitespace-nowrap pointer-events-none z-10"
          >
            <div className="text-emerald-400 mb-1">{formatDate(hover.date)}</div>
            {hover.w ? (
              <div className="space-y-0.5 text-gray-400">
                <div>الآيات: <span className="text-white">{toArabicNum(hover.w.ayahsRead)}</span></div>
                <div>الاستماع: <span className="text-white">{toArabicNum(hover.w.minutesListened)}</span> د</div>
                <div>الحفظ: <span className="text-white">{toArabicNum(hover.w.memorizationMinutes)}</span> د</div>
              </div>
            ) : (
              <div className="text-gray-500">لا نشاط</div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
