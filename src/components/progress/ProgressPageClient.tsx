
import { useState, useEffect, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import {
  TrendingUp, Award, Target, Calendar, Flame, BookOpen,
  Clock, Star, ChevronRight, RefreshCw, Play, BarChart3,
  Check, Circle, AlertCircle, Loader2, Headphones,
  Search, Compass, Download, Trash2, Edit3, Save, X, Zap, Settings, Upload
} from 'lucide-react';
import { useProgress } from '@/components/providers/ProgressProvider';
import { useFavorites } from '@/components/providers/FavoritesProvider';
import { useSurahs } from '@/hooks/useQuran';
import type { SurahStatus, DailyGoals } from '@/types/quran';
import ActivityHeatmap from './ActivityHeatmap';
import MonthlyChart from './MonthlyChart';
import SectionToggle from './SectionToggle';
import JuzProgress from './JuzProgress';
import CompletionForecast from './CompletionForecast';
import MonthComparison from './MonthComparison';
import PersonalRecords from './PersonalRecords';

const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toArabicNum(n: number): string {
  return String(n).split('').map(d => arabicNumerals[parseInt(d)] ?? d).join('');
}

const BADGE_ICONS: Record<string, React.ReactNode> = {
  star: <Star className="w-5 h-5" />,
  fire: <Flame className="w-5 h-5" />,
  book: <BookOpen className="w-5 h-5" />,
  ayah: <span className="w-5 h-5 flex items-center justify-center text-sm">آية</span>,
  headphones: <span className="w-5 h-5">🎧</span>,
  session: <Play className="w-5 h-5" />,
};

const STATUS_CONFIG: Record<SurahStatus, { label: string; color: string; bgColor: string; iconBgColor: string; borderColor: string; icon: React.ReactNode }> = {
  'not-started': { label: 'لم يبدأ', color: 'text-gray-400', bgColor: 'bg-gray-950', iconBgColor: 'bg-gray-900', borderColor: 'border-gray-800', icon: <Circle className="w-4 h-4" /> },
  'in-progress': { label: 'قيد الحفظ', color: 'text-blue-300', bgColor: 'bg-blue-950', iconBgColor: 'bg-blue-900', borderColor: 'border-blue-800', icon: <Loader2 className="w-4 h-4" /> },
  'memorized': { label: 'محفوظة', color: 'text-emerald-300', bgColor: 'bg-emerald-950', iconBgColor: 'bg-emerald-900', borderColor: 'border-emerald-800', icon: <Check className="w-4 h-4" /> },
  'needs-review': { label: 'تحتاج مراجعة', color: 'text-amber-300', bgColor: 'bg-amber-950', iconBgColor: 'bg-amber-900', borderColor: 'border-amber-800', icon: <AlertCircle className="w-4 h-4" /> },
  'completed': { label: 'مكتملة', color: 'text-green-300', bgColor: 'bg-green-950', iconBgColor: 'bg-green-900', borderColor: 'border-green-800', icon: <Award className="w-4 h-4" /> },
};

const STATUS_OPTIONS: SurahStatus[] = ['not-started', 'in-progress', 'memorized', 'needs-review', 'completed'];

const safeLayerStyle: CSSProperties = {
  isolation: 'isolate',
  contain: 'paint',
  transform: 'translateZ(0)',
  willChange: 'transform',
  boxShadow: 'none',
  backgroundImage: 'none',
  filter: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
};

const safeSurfaceClass = 'rounded-2xl border border-emerald-900 bg-[#06140a]';
const safeCardClass = `${safeSurfaceClass} p-6`;

export default function ProgressPageClient() {
  const {
    userProgress, dailyWird, achievements, surahMemorizations,
    dailyGoals, dailyHistory, setDailyGoals, resetProgress, exportProgress, importProgress,
    checkAchievements, generateRevisionSchedule, updateSurahStatus,
    getTotalProgress, getTodayReviewSurahs,
    visibleSections, setSectionVisible,
  } = useProgress();
  const { lastRead } = useFavorites();

  const { surahs } = useSurahs();
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<SurahStatus | 'all'>('all');
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalsDraft, setGoalsDraft] = useState<DailyGoals>(dailyGoals);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkAchievements();
    generateRevisionSchedule();
  }, [checkAchievements, generateRevisionSchedule]);

  useEffect(() => { setGoalsDraft(dailyGoals); }, [dailyGoals]);

  if (!mounted) {
    return (
      <div className="pt-24 pb-24 flex items-center justify-center">
        <div className="animate-pulse text-gray-500 font-cairo">جاري التحميل...</div>
      </div>
    );
  }

  const totalProgress = getTotalProgress();
  const todayReview = getTodayReviewSurahs();
  const unlockedAchievements = achievements.filter(a => a.unlockedAt);
  const lockedAchievements = achievements.filter(a => !a.unlockedAt);
  const levelProgress = (userProgress.points % 1000) / 1000 * 100;
  const currentLevel = Math.floor(userProgress.points / 1000) + 1;

  // Filter surahs
  const filteredSurahs = filter === 'all'
    ? surahs
    : surahs.filter(s => {
        const memorization = surahMemorizations.find(m => m.surahNumber === s.number);
        return memorization?.status === filter || (filter === 'not-started' && !memorization);
      });

  // Stats
  const completedCount = surahMemorizations.filter(s => s.status === 'completed').length;
  const memorizedCount = surahMemorizations.filter(s => s.status === 'memorized').length;
  const inProgressCount = surahMemorizations.filter(s => s.status === 'in-progress').length;
  const needsReviewCount = surahMemorizations.filter(s => s.status === 'needs-review').length;

  return (
    <div className="pt-32 md:pt-36 pb-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-800 bg-emerald-950 mb-4" style={safeLayerStyle}>
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-cairo text-sm">تقدم الحفظ</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Amiri, serif' }}>
            لوحة التقدم
          </h1>
          <div className="w-24 h-px bg-emerald-700 mx-auto" />
        </motion.div>


        {/* Overall Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${safeCardClass} mb-8`}
          style={safeLayerStyle}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-900 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-cairo font-semibold">تقدم حفظ القرآن</h3>
                <p className="text-gray-500 text-sm font-cairo">
                  {toArabicNum(totalProgress.completed)} من {toArabicNum(totalProgress.total)} آية
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-emerald-400 font-cairo">
                {toArabicNum(totalProgress.percentage)}%
              </p>
              <p className="text-gray-500 text-xs font-cairo">نسبة الإكمال</p>
            </div>
          </div>
          <div className="h-3 bg-emerald-950 rounded-full overflow-hidden relative">
            <motion.div
              className="h-full bg-emerald-500 relative"
              initial={{ width: 0 }}
              animate={{ width: `${totalProgress.percentage}%` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-3 text-center">
            <div className="p-2 rounded-xl bg-green-950 border border-green-800" style={safeLayerStyle}>
              <p className="text-green-400 font-bold font-cairo">{toArabicNum(completedCount)}</p>
              <p className="text-gray-500 text-xs font-cairo">مكتملة</p>
            </div>
            <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800" style={safeLayerStyle}>
              <p className="text-emerald-400 font-bold font-cairo">{toArabicNum(memorizedCount)}</p>
              <p className="text-gray-500 text-xs font-cairo">محفوظة</p>
            </div>
            <div className="p-2 rounded-xl bg-blue-950 border border-blue-800" style={safeLayerStyle}>
              <p className="text-blue-400 font-bold font-cairo">{toArabicNum(inProgressCount)}</p>
              <p className="text-gray-500 text-xs font-cairo">قيد الحفظ</p>
            </div>
            <div className="p-2 rounded-xl bg-amber-950 border border-amber-800" style={safeLayerStyle}>
              <p className="text-amber-400 font-bold font-cairo">{toArabicNum(needsReviewCount)}</p>
              <p className="text-gray-500 text-xs font-cairo">تحتاج مراجعة</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'الآيات المحفوظة', value: userProgress.totalAyahsMemorized, icon: Target, color: 'emerald' },
            { label: 'أيام متتالية', value: userProgress.currentStreak, icon: Flame, color: 'orange' },
            { label: 'دقائق الاستماع', value: userProgress.totalMinutesListened, icon: Clock, color: 'blue' },
            { label: 'النقاط', value: userProgress.points, icon: Award, color: 'yellow' },
          ].map(({ label, value, icon: Icon, color }, idx) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`rounded-2xl p-5 text-center border ${
                color === 'emerald' ? 'bg-emerald-950 border-emerald-800' :
                color === 'orange' ? 'bg-orange-950 border-orange-800' :
                color === 'blue' ? 'bg-blue-950 border-blue-800' : 'bg-yellow-950 border-yellow-800'
              }`}
              style={safeLayerStyle}
            >
              <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${
                color === 'emerald' ? 'bg-emerald-900' :
                color === 'orange' ? 'bg-orange-900' :
                color === 'blue' ? 'bg-blue-900' : 'bg-yellow-900'
              }`}>
                <Icon className={`w-6 h-6 ${
                  color === 'emerald' ? 'text-emerald-400' :
                  color === 'orange' ? 'text-orange-400' :
                  color === 'blue' ? 'text-blue-400' : 'text-yellow-400'
                }`} />
              </div>
              <p className="text-2xl font-bold text-white font-cairo mb-1">{toArabicNum(value)}</p>
              <p className="text-gray-500 text-xs font-cairo">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Level Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${safeCardClass} mb-8`}
          style={safeLayerStyle}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-900 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-cairo font-semibold">المستوى {currentLevel}</h3>
                <p className="text-gray-500 text-xs font-cairo">{userProgress.points} نقطة</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-emerald-400 text-sm font-cairo">المستوى التالي</p>
              <p className="text-gray-500 text-xs font-cairo">{1000 - (userProgress.points % 1000)} نقطة متبقية</p>
            </div>
          </div>
          <div className="h-2 bg-emerald-950 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </motion.div>

        {/* Today's Wird & Review */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={safeCardClass}
            style={safeLayerStyle}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-cairo font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                ورد اليوم
              </h3>
              <button
                onClick={() => setEditingGoals(v => !v)}
                className="text-xs text-emerald-400 font-cairo flex items-center gap-1 hover:text-emerald-300"
              >
                {editingGoals ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                {editingGoals ? 'إلغاء' : 'تعديل الأهداف'}
              </button>
            </div>
            {editingGoals ? (
              <div className="space-y-3">
                {([
                  { key: 'pagesRead', label: 'هدف الصفحات' },
                  { key: 'ayahsRead', label: 'هدف الآيات' },
                  { key: 'minutesListened', label: 'دقائق الاستماع' },
                  { key: 'memorizationMinutes', label: 'دقائق الحفظ' },
                ] as const).map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <label className="text-xs text-gray-400 font-cairo">{label}</label>
                    <input
                      type="number"
                      min={1}
                      value={goalsDraft[key]}
                      onChange={(e) => setGoalsDraft({ ...goalsDraft, [key]: Math.max(1, Number(e.target.value) || 1) })}
                      className="w-24 bg-emerald-950 border border-emerald-800 rounded-lg px-3 py-1.5 text-sm font-cairo text-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                ))}
                <button
                  onClick={() => { setDailyGoals(goalsDraft); setEditingGoals(false); }}
                  className="w-full mt-2 bg-emerald-800 hover:brightness-125 text-white font-cairo text-sm rounded-lg py-2 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  حفظ الأهداف
                </button>
              </div>
            ) : dailyWird ? (
              <div className="space-y-4">
                {[
                  { label: 'الصفحات', value: dailyWird.pagesRead, max: dailyGoals.pagesRead },
                  { label: 'الآيات', value: dailyWird.ayahsRead, max: dailyGoals.ayahsRead },
                  { label: 'دقائق الاستماع', value: dailyWird.minutesListened, max: dailyGoals.minutesListened },
                  { label: 'دقائق الحفظ', value: dailyWird.memorizationMinutes, max: dailyGoals.memorizationMinutes },
                ].map(({ label, value, max }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs font-cairo mb-1">
                      <span className="text-gray-400">{label}</span>
                      <span className={value >= max ? 'text-green-400' : 'text-emerald-400'}>
                        {toArabicNum(value)} / {toArabicNum(max)} {value >= max && '✓'}
                      </span>
                    </div>
                    <div className="h-2 bg-emerald-950 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((value / max) * 100, 100)}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 font-cairo text-center py-8">لم يبدأ ورد اليوم بعد</p>
            )}

            {!editingGoals && dailyWird && dailyWird.streak > 0 && (
              <div className="mt-4 pt-4 border-t border-emerald-900 flex items-center justify-center gap-2 text-orange-400">
                <Flame className="w-5 h-5" />
                <span className="font-cairo">{toArabicNum(dailyWird.streak)} يوم متتالي</span>
              </div>
            )}
          </motion.div>

          {/* Today's Review */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={safeCardClass}
            style={safeLayerStyle}
          >
            <h3 className="text-white font-cairo font-semibold mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-amber-400" />
              مراجعة اليوم
            </h3>
            {todayReview.length > 0 ? (
              <div className="space-y-3">
                {todayReview.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-emerald-950 border border-emerald-800"
                    style={safeLayerStyle}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-900 flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-white font-cairo text-sm">{s.surahName}</p>
                        <p className="text-gray-500 text-xs font-cairo">
                          {STATUS_CONFIG[s.status]?.label}
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/read/${s.surahNumber}`}
                      className="p-2 rounded-lg bg-emerald-900 text-emerald-400 hover:brightness-125 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 font-cairo text-center py-8">لا توجد مراجعات اليوم</p>
            )}
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className={`${safeSurfaceClass} p-4 sm:p-6 mb-8`}
          style={safeLayerStyle}
        >
          <h3 className="text-white font-cairo font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            إجراءات سريعة
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-stretch">
            <Link
              to={lastRead ? `/read/${lastRead.surahNumber}` : '/read'}
              className="group relative flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl p-4 bg-emerald-950 border border-emerald-800 hover:brightness-125 transition-colors"
              style={{ ...safeLayerStyle, aspectRatio: '1 / 1' }}
            >
              <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 bg-emerald-900">
                <BookOpen className="w-6 h-6 text-emerald-300" />
              </div>
              <p className="text-emerald-300 font-cairo text-xs sm:text-sm font-semibold text-center leading-tight">
                {lastRead ? 'متابعة القراءة' : 'ابدأ القراءة'}
              </p>
              <p className="text-emerald-500 text-[10px] sm:text-xs font-cairo text-center leading-tight truncate max-w-full">
                {lastRead ? lastRead.surahName : 'تصفّح السور'}
              </p>
            </Link>
            <Link
              to="/listen"
              className="group relative flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl p-4 bg-blue-950 border border-blue-800 hover:brightness-125 transition-colors"
              style={{ ...safeLayerStyle, aspectRatio: '1 / 1' }}
            >
              <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 bg-blue-900">
                <Headphones className="w-6 h-6 text-blue-300" />
              </div>
              <p className="text-blue-300 font-cairo text-xs sm:text-sm font-semibold text-center leading-tight">استماع</p>
              <p className="text-blue-500 text-[10px] sm:text-xs font-cairo text-center leading-tight">تلاوات القراء</p>
            </Link>
            <Link
              to="/more/tasbeeh"
              className="group relative flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl p-4 bg-yellow-950 border border-yellow-800 hover:brightness-125 transition-colors"
              style={{ ...safeLayerStyle, aspectRatio: '1 / 1' }}
            >
              <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 bg-yellow-900">
                <Compass className="w-6 h-6 text-yellow-300" />
              </div>
              <p className="text-yellow-300 font-cairo text-xs sm:text-sm font-semibold text-center leading-tight">التسبيح</p>
              <p className="text-yellow-500 text-[10px] sm:text-xs font-cairo text-center leading-tight">ذكر وتسبيح</p>
            </Link>
            <Link
              to="/search"
              className="group relative flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl p-4 bg-purple-950 border border-purple-800 hover:brightness-125 transition-colors"
              style={{ ...safeLayerStyle, aspectRatio: '1 / 1' }}
            >
              <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 bg-purple-900">
                <Search className="w-6 h-6 text-purple-300" />
              </div>
              <p className="text-purple-300 font-cairo text-xs sm:text-sm font-semibold text-center leading-tight">بحث</p>
              <p className="text-purple-500 text-[10px] sm:text-xs font-cairo text-center leading-tight">في القرآن</p>
            </Link>
          </div>
        </motion.div>


        {/* Visualizations: Monthly Chart + Heatmap (with toggles) */}
        <div className="space-y-6 mb-8">
          {/* Section controls */}
          <div className="flex flex-wrap items-center gap-2 px-1">
            <span className="text-xs text-gray-500 font-cairo">الأقسام:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 font-cairo">المخطط</span>
              <SectionToggle
                visible={!!visibleSections.monthlyChart}
                onToggle={() => setSectionVisible('monthlyChart', !visibleSections.monthlyChart)}
                label="المخطط الشهري"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 font-cairo">الخريطة</span>
              <SectionToggle
                visible={!!visibleSections.heatmap}
                onToggle={() => setSectionVisible('heatmap', !visibleSections.heatmap)}
                label="خريطة النشاط"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 font-cairo">أعمدة الأسبوع</span>
              <SectionToggle
                visible={!!visibleSections.weeklyBars}
                onToggle={() => setSectionVisible('weeklyBars', !visibleSections.weeklyBars)}
                label="أعمدة الأسبوع"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 font-cairo">الأجزاء</span>
              <SectionToggle
                visible={!!visibleSections.juzProgress}
                onToggle={() => setSectionVisible('juzProgress', !visibleSections.juzProgress)}
                label="الأجزاء"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 font-cairo">التوقع</span>
              <SectionToggle
                visible={!!visibleSections.forecast}
                onToggle={() => setSectionVisible('forecast', !visibleSections.forecast)}
                label="التوقع"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 font-cairo">المقارنة</span>
              <SectionToggle
                visible={!!visibleSections.comparison}
                onToggle={() => setSectionVisible('comparison', !visibleSections.comparison)}
                label="المقارنة"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 font-cairo">الأرقام القياسية</span>
              <SectionToggle
                visible={!!visibleSections.records}
                onToggle={() => setSectionVisible('records', !visibleSections.records)}
                label="الأرقام القياسية"
              />
            </div>
          </div>

          {visibleSections.monthlyChart && (
            <MonthlyChart style={safeLayerStyle} />
          )}

          {visibleSections.juzProgress && (
            <JuzProgress style={safeLayerStyle} />
          )}

          {visibleSections.forecast && (
            <CompletionForecast style={safeLayerStyle} />
          )}

          {visibleSections.comparison && (
            <MonthComparison style={safeLayerStyle} />
          )}

          {visibleSections.records && (
            <PersonalRecords style={safeLayerStyle} />
          )}

          {visibleSections.heatmap && (
            <ActivityHeatmap style={safeLayerStyle} />
          )}

          {visibleSections.weeklyBars && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className={safeCardClass}
              style={safeLayerStyle}
            >
              <h3 className="text-white font-cairo font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                نشاط الأسبوع
              </h3>
              {(() => {
                const days: { label: string; total: number; isToday: boolean }[] = [];
                for (let i = 6; i >= 0; i--) {
                  const d = new Date();
                  d.setDate(d.getDate() - i);
                  const dateStr = d.toISOString().split('T')[0];
                  const isToday = i === 0;
                  const wird = isToday
                    ? dailyWird
                    : dailyHistory.find(h => h.date === dateStr);
                  const total = wird ? wird.ayahsRead + wird.minutesListened + wird.memorizationMinutes : 0;
                  const weekday = d.toLocaleDateString('ar-EG', { weekday: 'short' });
                  days.push({ label: weekday, total, isToday });
                }
                const max = Math.max(1, ...days.map(d => d.total));
                return (
                  <div className="flex items-end justify-between gap-2 h-40">
                    {days.map((d, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full h-32 flex items-end">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${(d.total / max) * 100}%` }}
                            transition={{ duration: 0.6, delay: idx * 0.05 }}
                            className={`w-full rounded-t-lg ${
                              d.isToday
                                ? 'bg-emerald-500'
                                : d.total > 0
                                ? 'bg-emerald-700'
                                : 'bg-emerald-950'
                            }`}
                          />
                        </div>
                        <p className={`text-xs font-cairo ${d.isToday ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>
                          {d.label}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <p className="text-xs text-gray-500 font-cairo text-center mt-3">
                مجموع النشاط = آيات مقروءة + دقائق استماع + دقائق حفظ
              </p>
            </motion.div>
          )}
        </div>


        {/* Surah Status Tracker */}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`${safeCardClass} mb-8`}
          style={safeLayerStyle}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-cairo font-semibold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              متابعة السور
            </h3>
            <div className="flex gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as SurahStatus | 'all')}
                className="bg-emerald-950 border border-emerald-800 rounded-lg px-3 py-1.5 text-sm font-cairo text-gray-300 focus:outline-none focus:border-emerald-600"
              >
                <option value="all">الكل</option>
                {STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>{STATUS_CONFIG[status].label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Surah Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[400px] overflow-y-auto pr-2">
            <AnimatePresence>
              {filteredSurahs.map((surah, idx) => {
                const memorization = surahMemorizations.find(m => m.surahNumber === surah.number);
                const status = memorization?.status || 'not-started';
                const progress = memorization?.progress || 0;
                const config = STATUS_CONFIG[status];

                return (
                  <motion.div
                    key={surah.number}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.01 }}
                    className="group relative"
                  >
                    <div className={`p-3 rounded-xl ${config.bgColor} border ${config.borderColor} hover:brightness-125 transition-colors cursor-pointer`}
                      style={safeLayerStyle}
                      onClick={() => {
                        const nextStatus = STATUS_OPTIONS[(STATUS_OPTIONS.indexOf(status) + 1) % STATUS_OPTIONS.length];
                        updateSurahStatus(surah.number, surah.name, nextStatus);
                      }}
                    >
                      {/* Surah Number */}
                      <div className="text-center mb-2">
                        <span className="text-emerald-800 text-lg font-cairo">{toArabicNum(surah.number)}</span>
                      </div>

                      {/* Status Icon */}
                      <div className={`w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center ${config.iconBgColor}`}>
                        <span className={config.color}>{config.icon}</span>
                      </div>

                      {/* Surah Name */}
                      <p className="text-white text-xs font-cairo text-center truncate" style={{ fontFamily: 'Amiri, serif' }}>
                        {surah.name}
                      </p>

                      {/* Progress Bar */}
                      {progress > 0 && (
                        <div className="mt-2 h-1 bg-emerald-950 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Hover tooltip */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-950 rounded-lg text-xs font-cairo text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-gray-800">
                      انقر للتغيير: {config.label}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Achievements — mirrors home FeaturesSection grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={`${safeSurfaceClass} p-4 sm:p-6`}
          style={safeLayerStyle}
        >
          <h3 className="text-white font-cairo font-semibold mb-6 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            الإنجازات
          </h3>

          <style>{`
            .achievements-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; align-items: stretch; }
            @media (min-width: 640px) { .achievements-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; } }
            @media (min-width: 1024px) { .achievements-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
          `}</style>
          <div className="achievements-grid">
            {unlockedAchievements.map(achievement => (
              <div
                key={achievement.id}
                className="relative flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl p-4 bg-emerald-950 border border-emerald-800 text-center"
                style={{ ...safeLayerStyle, aspectRatio: '1 / 1' }}
              >
                <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 bg-emerald-900 text-emerald-300">
                  {BADGE_ICONS[achievement.icon] || <Star className="w-5 h-5" />}
                </div>
                <p className="text-emerald-300 font-cairo text-xs sm:text-sm font-semibold leading-tight">{achievement.title}</p>
                <p className="text-emerald-500 text-[10px] font-cairo leading-tight line-clamp-2">{achievement.description}</p>
                <Check className="absolute top-2 right-2 w-4 h-4 text-emerald-400" />
              </div>
            ))}

            {lockedAchievements.slice(0, 4).map(achievement => (
              <div
                key={achievement.id}
                className="relative flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl p-4 bg-gray-950 border border-gray-800 text-center"
                style={{ ...safeLayerStyle, aspectRatio: '1 / 1' }}
              >
                <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 bg-gray-900 text-gray-600">
                  {BADGE_ICONS[achievement.icon] || <Star className="w-5 h-5" />}
                </div>
                <p className="text-gray-400 font-cairo text-xs sm:text-sm leading-tight">{achievement.title}</p>
                <p className="text-gray-600 text-[10px] font-cairo leading-tight line-clamp-2">{achievement.description}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Data Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className={`${safeSurfaceClass} p-4 sm:p-6 mt-8 mb-8`}
          style={safeLayerStyle}
        >
          <h3 className="text-white font-cairo font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-400" />
            إدارة البيانات
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch">
            <button
              onClick={() => {
                const data = exportProgress();
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `quran-progress-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="w-full h-12 flex items-center justify-center gap-2 bg-emerald-950 hover:brightness-125 text-emerald-300 font-cairo text-sm rounded-xl px-4 border border-emerald-800 transition-colors"
              style={safeLayerStyle}
            >
              <Download className="w-4 h-4" />
              تصدير (JSON)
            </button>
            <label
              className="w-full h-12 flex items-center justify-center gap-2 bg-blue-950 hover:brightness-125 text-blue-300 font-cairo text-sm rounded-xl px-4 border border-blue-800 transition-colors cursor-pointer"
              style={safeLayerStyle}
            >
              <Upload className="w-4 h-4" />
              استيراد (JSON)
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  const res = importProgress(text);
                  if (res.ok) alert('تم استيراد البيانات بنجاح');
                  else alert('فشل الاستيراد: ' + (res.error || 'خطأ غير معروف'));
                  e.target.value = '';
                }}
              />
            </label>
            {confirmReset ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { resetProgress(); setConfirmReset(false); }}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-red-900 hover:brightness-125 text-white font-cairo text-sm rounded-xl px-4 border border-red-800 transition-colors"
                  style={safeLayerStyle}
                >
                  <Trash2 className="w-4 h-4" />
                  تأكيد
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="w-full h-12 flex items-center justify-center bg-gray-900 hover:brightness-125 text-gray-300 font-cairo text-sm rounded-xl px-4 border border-gray-800 transition-colors"
                  style={safeLayerStyle}
                >
                  إلغاء
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="w-full h-12 flex items-center justify-center gap-2 bg-red-950 hover:brightness-125 text-red-300 font-cairo text-sm rounded-xl px-4 border border-red-800 transition-colors"
                style={safeLayerStyle}
              >
                <Trash2 className="w-4 h-4" />
                إعادة تعيين كل التقدم
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 font-cairo mt-3 text-center">
            بياناتك محفوظة محلياً على جهازك. صدّرها بانتظام للاحتفاظ بنسخة.
          </p>
        </motion.div>

      </div>
    </div>
  );
}
