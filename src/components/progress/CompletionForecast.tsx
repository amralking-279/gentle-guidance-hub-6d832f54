import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { useProgress } from '@/components/providers/ProgressProvider';

const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const toArabicNum = (n: number) => String(n).split('').map(d => arabicNumerals[parseInt(d)] ?? d).join('');

const TOTAL_QURAN_AYAHS = 6236;

interface Props { style?: React.CSSProperties; }

export default function CompletionForecast({ style }: Props) {
  const { userProgress, dailyHistory, dailyWird } = useProgress();

  const forecast = useMemo(() => {
    // Last 30 days average ayahs/day
    const last30 = dailyHistory.slice(-30);
    const today = dailyWird;
    const allDays = today ? [...last30, today] : last30;
    const totalAyahs = allDays.reduce((sum, d) => sum + (d.ayahsRead || 0), 0);
    const activeDays = allDays.filter(d => (d.ayahsRead || 0) > 0).length;
    const dailyAvg = activeDays > 0 ? totalAyahs / activeDays : 0;

    const memorizedAyahs = userProgress.totalAyahsMemorized;
    const remaining = Math.max(0, TOTAL_QURAN_AYAHS - memorizedAyahs);

    if (dailyAvg < 1) {
      return { dailyAvg: 0, remaining, daysLeft: null, completionDate: null, memorizedAyahs };
    }

    const daysLeft = Math.ceil(remaining / dailyAvg);
    const date = new Date();
    date.setDate(date.getDate() + daysLeft);

    return {
      dailyAvg: Math.round(dailyAvg * 10) / 10,
      remaining,
      daysLeft,
      completionDate: date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
      memorizedAyahs,
    };
  }, [userProgress.totalAyahsMemorized, dailyHistory, dailyWird]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-emerald-900 bg-[#06140a] p-4 sm:p-6"
      style={style}
    >
      <h3 className="text-white font-cairo font-semibold mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-emerald-400" />
        التوقع الذكي للإكمال
      </h3>

      {forecast.daysLeft === null ? (
        <div className="text-center py-6">
          <p className="text-gray-400 font-cairo text-sm">ابدأ القراءة اليومية لحساب التوقع</p>
          <p className="text-gray-600 font-cairo text-xs mt-2">يحتاج المتوسط اليومي إلى آية واحدة على الأقل</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-800 text-center">
            <p className="text-emerald-400 text-xl font-bold font-cairo">{toArabicNum(forecast.dailyAvg)}</p>
            <p className="text-gray-500 text-xs font-cairo mt-1">المتوسط اليومي (آية)</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-950 border border-blue-800 text-center">
            <p className="text-blue-400 text-xl font-bold font-cairo">{toArabicNum(forecast.remaining)}</p>
            <p className="text-gray-500 text-xs font-cairo mt-1">آيات متبقية</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-950 border border-amber-800 text-center">
            <p className="text-amber-400 text-xl font-bold font-cairo">{toArabicNum(forecast.daysLeft)}</p>
            <p className="text-gray-500 text-xs font-cairo mt-1">يوم متوقع</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-950 border border-purple-800 text-center">
            <p className="text-purple-300 text-xs font-bold font-cairo leading-tight">{forecast.completionDate}</p>
            <p className="text-gray-500 text-xs font-cairo mt-1">تاريخ الإكمال</p>
          </div>
        </div>
      )}
      <p className="text-[10px] text-gray-600 font-cairo text-center mt-3">
        التوقع مبني على متوسط نشاطك في آخر ٣٠ يوم
      </p>
    </motion.div>
  );
}
