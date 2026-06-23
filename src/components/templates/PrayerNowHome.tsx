import { Link } from '@tanstack/react-router';
import { Settings2, Share2, MapPin, BookOpenText, Compass, Calculator, HeartHandshake, GraduationCap, BookMarked, Sunrise, Sparkles, Clock4 } from 'lucide-react';
import { usePrayerData, formatCountdown, to12hArabic, type PrayerKey } from '@/hooks/usePrayerData';
import headerBg from '@/assets/prayer-now-header.jpg';

const PRAYER_ROW: { key: PrayerKey; label: string; emoji: string }[] = [
  { key: 'Fajr', label: 'الفجر', emoji: '🌙' },
  { key: 'Dhuhr', label: 'الظهر', emoji: '☀️' },
  { key: 'Asr', label: 'العصر', emoji: '⛅' },
  { key: 'Maghrib', label: 'المغرب', emoji: '🌇' },
  { key: 'Isha', label: 'العشاء', emoji: '🌃' },
];

const FEATURES = [
  { to: '/more/qibla', label: 'اتجاه القبلة', Icon: Compass },
  { to: '/more/tasbeeh', label: 'السبحة', Icon: HeartHandshake },
  { to: '/progress', label: 'الختمة', Icon: BookMarked },
  { to: '/more/prayer-times', label: 'متتبع الصلاة', Icon: Clock4 },
  { to: '/more/islamic-education', label: 'تعليم إسلامي', Icon: GraduationCap },
  { to: '/more/zakat-calculator', label: 'حاسبة الزكاة', Icon: Calculator },
];

export function PrayerNowHome() {
  const data = usePrayerData();
  const remaining = data.next?.remainingMs ?? 0;

  return (
    <main
      className="min-h-screen pb-28"
      style={{ background: 'linear-gradient(180deg, #f6ecd6 0%, #efe2c4 100%)' }}
      dir="rtl"
    >
      {/* Top bar */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-emerald-700/15 px-3 py-1.5 text-emerald-800 font-cairo text-xs font-bold shadow-sm hover:bg-white transition"
        >
          <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">👤</span>
          تسجيل الدخول
        </Link>
        <div className="flex items-center gap-2 text-emerald-900">
          <div className="text-right leading-tight">
            <h1 className="font-cairo font-extrabold text-base">نور القرآن الكريم</h1>
            <p className="font-cairo text-[10px] text-emerald-700/70">رفيقك اليومي للعبادة</p>
          </div>
          <span className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 text-amber-200 flex items-center justify-center text-lg shadow-md">
            🕌
          </span>
        </div>
      </div>

      {/* Hero header with desert image and countdown */}
      <section
        className="relative mx-3 mt-1 rounded-3xl overflow-hidden shadow-xl ring-1 ring-amber-700/10"
        style={{ aspectRatio: '16 / 11' }}
      >
        <img
          src={headerBg}
          alt="هيدر شروق الشمس"
          width={1280}
          height={768}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Soft top/bottom overlays for legibility */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Top-left settings */}
        <Link
          to="/more/themes"
          className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/35 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/50 transition"
          aria-label="إعدادات الشكل"
        >
          <Settings className="w-5 h-5" />
        </Link>
        <button
          className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-amber-400/95 text-amber-950 px-3 py-1 font-cairo text-[11px] font-bold shadow"
          aria-label="الإصدار المجاني"
        >
          <Sparkles className="w-3 h-3" />
          الإصدار المجاني
        </button>

        {/* Brand pill */}
        <div className="absolute top-14 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur px-3 py-1 font-cairo text-[11px] font-extrabold text-emerald-900 shadow-sm">
          نور القرآن الكريم
        </div>

        {/* Countdown */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-4"
          style={{ textShadow: '0 2px 14px rgba(0,0,0,0.55)' }}
        >
          <div className="font-cairo text-white/95 text-xl font-extrabold tracking-wide">
            {data.next ? `الصلاة القادمة · ${data.next.name}` : '...'}
          </div>
          <div
            className="font-cairo text-white text-5xl sm:text-6xl font-black tracking-wider mt-2 tabular-nums"
            style={{ direction: 'ltr', textShadow: '0 4px 24px rgba(0,0,0,0.45)' }}
          >
            {formatCountdown(remaining)}
          </div>
          {data.next && (
            <div className="font-cairo text-white/90 text-xs mt-1.5 tabular-nums" style={{ direction: 'ltr' }}>
              تبدأ {to12hArabic(data.next.time)}
            </div>
          )}
        </div>

        {/* Location chip */}
        <div className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/35 backdrop-blur-sm text-white/95 px-2.5 py-1 font-cairo text-[11px]">
          <MapPin className="w-3 h-3" />
          {data.city}
        </div>
      </section>

      {/* Date strip */}
      <section className="mx-3 mt-3 rounded-2xl bg-white/95 border border-emerald-700/10 shadow-sm px-4 py-3 flex items-center justify-between">
        <button aria-label="مشاركة" className="text-emerald-700 hover:text-emerald-900 transition">
          <Share2 className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center">
          <div className="font-cairo font-extrabold text-emerald-900 text-base">{data.gregorian}</div>
          <div className="font-cairo text-emerald-700/70 text-[11px] mt-0.5">{data.hijri}</div>
        </div>
        <div className="text-right flex items-center gap-2">
          <div>
            <div className="font-cairo text-amber-700 text-[10px] font-bold">الشروق</div>
            <div className="font-cairo text-emerald-900 text-sm font-extrabold tabular-nums" style={{ direction: 'ltr' }}>
              {to12hArabic(data.times?.Sunrise)}
            </div>
          </div>
          <Sunrise className="w-5 h-5 text-amber-500" />
        </div>
      </section>

      {/* Prayer times row */}
      <section className="mx-3 mt-3 rounded-2xl bg-gradient-to-br from-white to-amber-50/70 border border-emerald-700/10 shadow-sm px-2 py-3">
        <ul className="grid grid-cols-5 gap-1">
          {PRAYER_ROW.map((p) => {
            const isNext = data.next?.key === p.key;
            return (
              <li
                key={p.key}
                className={`flex flex-col items-center text-center px-1 py-2 rounded-xl transition ${
                  isNext ? 'bg-emerald-600 text-white shadow-md' : ''
                }`}
              >
                <div className={`font-cairo font-extrabold text-sm ${isNext ? 'text-white' : 'text-emerald-900'}`}>
                  {p.label}
                </div>
                <div className="text-xl my-1" aria-hidden>{p.emoji}</div>
                <div
                  className={`font-cairo text-xs font-bold tabular-nums ${isNext ? 'text-white' : 'text-emerald-900'}`}
                  style={{ direction: 'ltr' }}
                >
                  {to12hArabic(data.times?.[p.key])}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Features grid */}
      <section className="mx-3 mt-3 rounded-2xl bg-white/95 border border-emerald-700/10 shadow-sm px-3 py-4">
        <h2 className="font-cairo font-extrabold text-emerald-900 text-sm mb-3 text-right">الميزات السريعة</h2>
        <ul className="grid grid-cols-3 gap-3">
          {FEATURES.map(({ to, label, Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl hover:bg-emerald-50/70 active:bg-emerald-100/70 transition-colors"
              >
                <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-50 to-amber-50 border border-emerald-200/70 flex items-center justify-center text-emerald-700 shadow-sm">
                  <Icon className="w-6 h-6" />
                </span>
                <span className="font-cairo text-[11px] font-bold text-emerald-900 text-center leading-tight">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Friendly note */}
      <section className="mx-3 mt-3 rounded-2xl bg-amber-50 border border-amber-300/60 px-4 py-3 flex items-start gap-3">
        <span className="shrink-0 w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-extrabold">!</span>
        <div className="flex-1 text-right">
          <p className="font-cairo text-amber-900 text-[13px] leading-relaxed">
            فعّل إشعارات الأذكار والمؤذن لتُذكّرك بأوقات الصلاة طوال اليوم.
          </p>
          <Link to="/more/prayer-times" className="font-cairo text-red-700 text-xs font-extrabold mt-1 inline-block">
            اضغط للتفعيل!
          </Link>
        </div>
      </section>
    </main>
  );
}
