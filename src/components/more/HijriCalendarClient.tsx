
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import {
  Calendar, ArrowRight, ChevronLeft, ChevronRight,
  Sparkles, Moon, Star, Sun,
} from 'lucide-react';

const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];

const GREG_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const WEEKDAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const WEEKDAY_HEADERS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

// Hijri Islamic occasions (month, day, name)
const OCCASIONS: { month: number; day: number; name: string; emoji: string; color: string }[] = [
  { month: 1,  day: 1,  name: 'رأس السنة الهجرية', emoji: '🌙', color: 'amber' },
  { month: 1,  day: 10, name: 'يوم عاشوراء',         emoji: '✨', color: 'amber' },
  { month: 3,  day: 12, name: 'المولد النبوي الشريف', emoji: '🕌', color: 'emerald' },
  { month: 7,  day: 27, name: 'الإسراء والمعراج',     emoji: '🌌', color: 'indigo' },
  { month: 8,  day: 15, name: 'ليلة النصف من شعبان',  emoji: '🌕', color: 'amber' },
  { month: 9,  day: 1,  name: 'بداية شهر رمضان',       emoji: '🌙', color: 'emerald' },
  { month: 9,  day: 27, name: 'ليلة القدر (تقديرياً)', emoji: '⭐', color: 'amber' },
  { month: 10, day: 1,  name: 'عيد الفطر المبارك',     emoji: '🎉', color: 'emerald' },
  { month: 12, day: 9,  name: 'يوم عرفة',              emoji: '🕋', color: 'emerald' },
  { month: 12, day: 10, name: 'عيد الأضحى المبارك',    emoji: '🐏', color: 'emerald' },
];

const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toArabicNum(n: number | string): string {
  return String(n).split('').map(d => arabicNumerals[parseInt(d)] ?? d).join('');
}

interface HijriParts { day: number; month: number; year: number; }

function getHijri(date: Date): HijriParts {
  const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
    day: 'numeric', month: 'numeric', year: 'numeric',
  });
  const parts = fmt.formatToParts(date);
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10);
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '1446', 10);
  return { day, month, year };
}

function firstGregOfHijriMonth(year: number, month: number): Date {
  // Approximate Gregorian year for given Hijri year
  const approxGregYear = Math.round((year - 1) * 0.970224 + 621.5643);
  let d = new Date(approxGregYear, 5, 15);
  // Coarse adjust by months
  for (let i = 0; i < 36; i++) {
    const h = getHijri(d);
    const diff = (year - h.year) * 12 + (month - h.month);
    if (diff === 0) break;
    d = new Date(d.getTime() + Math.round(diff * 29.5) * 86400000);
  }
  // Fine adjust: walk to day 1
  let safety = 90;
  while (safety-- > 0) {
    const h = getHijri(d);
    if (h.year === year && h.month === month && h.day === 1) return d;
    if (h.year === year && h.month === month) {
      d = new Date(d.getTime() - 86400000);
    } else if ((h.year < year) || (h.year === year && h.month < month)) {
      d = new Date(d.getTime() + 86400000);
    } else {
      d = new Date(d.getTime() - 86400000);
    }
  }
  return d;
}

function daysInHijriMonth(year: number, month: number): number {
  const first = firstGregOfHijriMonth(year, month);
  // Walk forward up to 31 days; the last day before month changes
  let lastDay = 1;
  for (let i = 1; i <= 31; i++) {
    const d = new Date(first.getTime() + i * 86400000);
    const h = getHijri(d);
    if (h.month === month && h.year === year) {
      lastDay = h.day;
    } else {
      break;
    }
  }
  return lastDay;
}

export default function HijriCalendarClient() {
  const [mounted, setMounted] = useState(false);
  const [today, setToday] = useState<{ hijri: HijriParts; greg: Date }>({
    hijri: { day: 1, month: 1, year: 1446 },
    greg: new Date(),
  });
  const [viewYear, setViewYear] = useState(1446);
  const [viewMonth, setViewMonth] = useState(1);
  const [primary, setPrimary] = useState<'hijri' | 'greg'>('hijri');

  useEffect(() => {
    const now = new Date();
    const h = getHijri(now);
    setToday({ hijri: h, greg: now });
    setViewYear(h.year);
    setViewMonth(h.month);
    setMounted(true);
  }, []);

  // Build the calendar grid for the current view
  const grid = useMemo(() => {
    if (!mounted) return null;
    const first = firstGregOfHijriMonth(viewYear, viewMonth);
    const total = daysInHijriMonth(viewYear, viewMonth);
    // First column = Saturday (Arabic calendar) → map JS getDay so Sat=0
    const dow = first.getDay(); // 0=Sun .. 6=Sat
    const startCol = (dow + 1) % 7; // Sat=0, Sun=1, ... Fri=6
    const cells: Array<{ hijriDay: number; greg: Date } | null> = [];
    for (let i = 0; i < startCol; i++) cells.push(null);
    for (let i = 0; i < total; i++) {
      cells.push({ hijriDay: i + 1, greg: new Date(first.getTime() + i * 86400000) });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return { cells, first, total };
  }, [mounted, viewYear, viewMonth]);

  // Occasions in the currently-viewed Hijri month
  const monthOccasions = useMemo(() => {
    return OCCASIONS
      .filter(o => o.month === viewMonth)
      .map(o => {
        const first = grid?.first ?? firstGregOfHijriMonth(viewYear, viewMonth);
        const greg = new Date(first.getTime() + (o.day - 1) * 86400000);
        return { ...o, greg };
      })
      .sort((a, b) => a.day - b.day);
  }, [viewMonth, viewYear, grid]);

  // Next upcoming occasion across the year
  const upcoming = useMemo<null | { name: string; emoji: string; greg: Date; days: number; hijriDay: number; hijriMonth: number }>(() => {
    if (!mounted) return null;
    const now = today.greg.getTime();
    let best: { name: string; emoji: string; greg: Date; days: number; hijriDay: number; hijriMonth: number } | null = null;
    for (let i = 0; i < 12; i++) {
      const m = ((today.hijri.month - 1 + i) % 12) + 1;
      const y = m < today.hijri.month ? today.hijri.year + 1 : today.hijri.year;
      const monthFirst = firstGregOfHijriMonth(y, m);
      for (const o of OCCASIONS.filter(x => x.month === m)) {
        const g = new Date(monthFirst.getTime() + (o.day - 1) * 86400000);
        if (g.getTime() > now) {
          const days = Math.ceil((g.getTime() - now) / 86400000);
          if (best === null || days < best.days) {
            best = { name: o.name, emoji: o.emoji, greg: g, days, hijriDay: o.day, hijriMonth: o.month };
          }
        }
      }
      if (best !== null) break;
    }
    return best;
  }, [mounted, today]);


  const navigateMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  };

  const goToToday = () => {
    setViewMonth(today.hijri.month);
    setViewYear(today.hijri.year);
  };

  if (!mounted) {
    return (
      <div className="pt-24 pb-28 flex items-center justify-center">
        <div className="animate-pulse text-gray-500 font-cairo">جاري التحميل...</div>
      </div>
    );
  }

  const todayWeekday = WEEKDAYS_AR[today.greg.getDay()];
  const isViewingCurrentMonth = viewYear === today.hijri.year && viewMonth === today.hijri.month;

  return (
    <div className="pt-20 pb-28 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 -right-32 w-96 h-96 rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute top-40 -left-32 w-96 h-96 rounded-full bg-amber-500/10 blur-[120px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-emerald-800/30 mb-4">
            <Moon className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-cairo text-sm">التقويم الإسلامي</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3" style={{ fontFamily: 'Amiri, serif' }}>
            التقويم الهجري
          </h1>
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent mx-auto" />
        </motion.div>

        {/* Today Card — Dual Date */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative glass-card rounded-3xl p-6 sm:p-8 mb-8 border border-emerald-800/40 overflow-hidden"
        >
          {/* Ornate corner accents */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-br-full pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-amber-500/15 to-transparent rounded-tl-full pointer-events-none" />

          <div className="relative">
            {/* Weekday */}
            <div className="text-center mb-6">
              <p className="text-emerald-400 font-cairo text-lg" style={{ fontFamily: 'Amiri, serif' }}>
                {todayWeekday}
              </p>
            </div>

            {/* Toggle */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex p-1 rounded-xl bg-emerald-950/60 border border-emerald-800/40">
                <button
                  onClick={() => setPrimary('hijri')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-cairo transition-all ${
                    primary === 'hijri'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  هجري
                </button>
                <button
                  onClick={() => setPrimary('greg')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-cairo transition-all ${
                    primary === 'greg'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  ميلادي
                </button>
              </div>
            </div>

            {/* Primary Date (large) */}
            <AnimatePresence mode="wait">
              <motion.div
                key={primary}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="text-center"
              >
                {primary === 'hijri' ? (
                  <>
                    <p className="text-5xl sm:text-6xl font-bold gradient-emerald-gold mb-2" style={{ fontFamily: 'Amiri, serif' }}>
                      {toArabicNum(today.hijri.day)} {HIJRI_MONTHS[today.hijri.month - 1]}
                    </p>
                    <p className="text-2xl text-emerald-300 font-cairo">
                      {toArabicNum(today.hijri.year)} هـ
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-5xl sm:text-6xl font-bold gradient-emerald-gold mb-2" style={{ fontFamily: 'Amiri, serif' }}>
                      {toArabicNum(today.greg.getDate())} {GREG_MONTHS[today.greg.getMonth()]}
                    </p>
                    <p className="text-2xl text-emerald-300 font-cairo">
                      {toArabicNum(today.greg.getFullYear())} م
                    </p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Secondary date */}
            <div className="mt-6 pt-5 border-t border-emerald-900/40 text-center">
              <p className="text-xs text-gray-500 font-cairo mb-1">
                {primary === 'hijri' ? 'الموافق ميلادياً' : 'الموافق هجرياً'}
              </p>
              <p className="text-gray-300 font-cairo text-base">
                {primary === 'hijri'
                  ? `${toArabicNum(today.greg.getDate())} ${GREG_MONTHS[today.greg.getMonth()]} ${toArabicNum(today.greg.getFullYear())} م`
                  : `${toArabicNum(today.hijri.day)} ${HIJRI_MONTHS[today.hijri.month - 1]} ${toArabicNum(today.hijri.year)} هـ`}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Upcoming Occasion */}
        {upcoming && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative glass-card rounded-2xl p-5 mb-8 border border-amber-800/40 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-emerald-500/5 pointer-events-none" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-2xl shadow-lg shadow-amber-900/40 shrink-0">
                {upcoming.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-amber-400/80 font-cairo text-xs mb-0.5">المناسبة القادمة</p>
                <h3 className="text-white font-cairo font-bold text-lg truncate">{upcoming.name}</h3>
                <p className="text-gray-400 font-cairo text-xs mt-0.5">
                  {toArabicNum(upcoming.greg.getDate())} {GREG_MONTHS[upcoming.greg.getMonth()]} {toArabicNum(upcoming.greg.getFullYear())} م
                </p>
              </div>
              <div className="text-center shrink-0">
                <p className="text-2xl font-bold gradient-emerald-gold font-cairo">{toArabicNum(upcoming.days)}</p>
                <p className="text-amber-400/80 text-xs font-cairo">يوم متبقّي</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Calendar Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-3xl p-5 sm:p-6 border border-emerald-800/40 mb-8"
        >
          {/* Month nav */}
          <div className="flex items-center justify-between mb-6 gap-2">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2.5 rounded-xl bg-emerald-900/30 hover:bg-emerald-800/50 border border-emerald-800/40 transition-colors"
              aria-label="الشهر السابق"
            >
              <ChevronRight className="w-5 h-5 text-emerald-400" />
            </button>

            <div className="text-center flex-1">
              <h3 className="text-xl sm:text-2xl font-bold text-white font-cairo" style={{ fontFamily: 'Amiri, serif' }}>
                {HIJRI_MONTHS[viewMonth - 1]} {toArabicNum(viewYear)} هـ
              </h3>
              {grid && (
                <p className="text-xs text-gray-500 font-cairo mt-1">
                  {GREG_MONTHS[grid.first.getMonth()]} {toArabicNum(grid.first.getFullYear())} م
                </p>
              )}
            </div>

            <button
              onClick={() => navigateMonth(1)}
              className="p-2.5 rounded-xl bg-emerald-900/30 hover:bg-emerald-800/50 border border-emerald-800/40 transition-colors"
              aria-label="الشهر التالي"
            >
              <ChevronLeft className="w-5 h-5 text-emerald-400" />
            </button>
          </div>

          {!isViewingCurrentMonth && (
            <div className="flex justify-center mb-4">
              <button
                onClick={goToToday}
                className="inline-flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 font-cairo bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-700/40 rounded-lg px-3 py-1.5 transition-colors"
              >
                <Sun className="w-3.5 h-3.5" />
                العودة لليوم
              </button>
            </div>
          )}

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {WEEKDAY_HEADERS.map(day => (
              <div
                key={day}
                className="text-center text-[10px] sm:text-xs font-cairo text-emerald-400/80 font-semibold py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1.5">
            {grid?.cells.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} className="aspect-square" />;
              }
              const isToday = isViewingCurrentMonth && cell.hijriDay === today.hijri.day;
              const occasion = monthOccasions.find(o => o.day === cell.hijriDay);
              const isFriday = cell.greg.getDay() === 5;

              return (
                <motion.div
                  key={cell.hijriDay}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.005 }}
                  className={`relative aspect-square rounded-xl flex flex-col items-center justify-center font-cairo transition-all cursor-default ${
                    isToday
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-900/50 ring-2 ring-emerald-300/50'
                      : occasion
                      ? `bg-gradient-to-br ${
                          occasion.color === 'amber'
                            ? 'from-amber-900/40 to-amber-950/40 border border-amber-700/40'
                            : occasion.color === 'indigo'
                            ? 'from-indigo-900/40 to-indigo-950/40 border border-indigo-700/40'
                            : 'from-emerald-900/40 to-emerald-950/40 border border-emerald-700/40'
                        } text-white hover:scale-105`
                      : isFriday
                      ? 'bg-emerald-950/40 border border-emerald-900/40 text-emerald-300 hover:bg-emerald-900/40'
                      : 'bg-white/5 hover:bg-emerald-900/30 text-gray-300'
                  }`}
                  title={occasion?.name}
                >
                  <span className={`text-sm sm:text-base font-bold leading-none ${isToday ? 'text-white' : ''}`}>
                    {toArabicNum(cell.hijriDay)}
                  </span>
                  <span className={`text-[9px] sm:text-[10px] leading-none mt-0.5 ${isToday ? 'text-white/80' : 'text-gray-500'}`}>
                    {cell.greg.getDate()}
                  </span>
                  {occasion && (
                    <span className="absolute -top-1 -right-1 text-[10px] sm:text-xs">
                      {occasion.emoji}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-5 pt-4 border-t border-emerald-900/30 flex flex-wrap items-center justify-center gap-3 text-[10px] sm:text-xs font-cairo text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-gradient-to-br from-emerald-500 to-emerald-700" />
              <span>اليوم</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-950/40 border border-emerald-900/40" />
              <span>الجمعة</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="w-3 h-3 text-amber-400" />
              <span>مناسبة</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <span>(الأرقام الصغيرة = ميلادي)</span>
            </div>
          </div>
        </motion.div>

        {/* Month Occasions List */}
        {monthOccasions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-2xl p-6 border border-emerald-800/40 mb-8"
          >
            <h3 className="text-white font-cairo font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              مناسبات شهر {HIJRI_MONTHS[viewMonth - 1]}
            </h3>
            <div className="space-y-2">
              {monthOccasions.map((o, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/40 hover:border-emerald-700/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center text-xl shrink-0">
                    {o.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-cairo text-sm font-semibold truncate">{o.name}</p>
                    <p className="text-gray-500 font-cairo text-xs">
                      {toArabicNum(o.day)} {HIJRI_MONTHS[o.month - 1]} ·{' '}
                      {toArabicNum(o.greg.getDate())} {GREG_MONTHS[o.greg.getMonth()]} {toArabicNum(o.greg.getFullYear())} م
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-900/40 border border-emerald-700/40 text-emerald-400 hover:bg-emerald-900/60 transition-all"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="font-cairo">العودة للرئيسية</span>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
