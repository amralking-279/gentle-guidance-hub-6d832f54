import { Link } from '@tanstack/react-router';
import {
  CircleDot, Clock, Sparkles, Calendar, Calculator, GraduationCap,
  BookMarked, MessageSquare, Shield, Compass, Play, Download, Heart,
} from 'lucide-react';


const features = [
  { href: '/more/salat-nabi', label: 'الصلاة على النبي ﷺ', icon: Heart, color: 'rose' },
  { href: '/more/tasbeeh', label: 'السبحة الإلكترونية', icon: CircleDot, color: 'emerald' },
  { href: '/more/prayer-times', label: 'مواقيت الصلاة', icon: Clock, color: 'teal' },
  { href: '/more/names', label: 'أسماء الله الحسنى', icon: Sparkles, color: 'gold' },
  { href: '/more/hijri-calendar', label: 'التقويم الهجري', icon: Calendar, color: 'blue' },
  { href: '/more/zakat-calculator', label: 'حاسبة الزكاة', icon: Calculator, color: 'rose' },
  { href: '/more/islamic-education', label: 'تعليم الإسلام', icon: GraduationCap, color: 'cyan' },
  { href: '/more/athkar', label: 'الأذكار', icon: BookMarked, color: 'blue' },
  { href: '/more/hadith', label: 'الأحاديث', icon: MessageSquare, color: 'purple' },
  { href: '/more/qibla', label: 'اتجاه القبلة', icon: Compass, color: 'amber' },
  { href: '/more/ruqyah', label: 'الرقية الشرعية', icon: Shield, color: 'red' },
  { href: '/more/downloads', label: 'التحميلات (بدون نت)', icon: Download, color: 'indigo' },
];

const colorClasses: Record<string, { bg: string; iconBg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-950', iconBg: 'bg-emerald-900', text: 'text-emerald-300', border: 'border-emerald-800' },
  blue:    { bg: 'bg-blue-950',    iconBg: 'bg-blue-900',    text: 'text-blue-300',    border: 'border-blue-800' },
  purple:  { bg: 'bg-purple-950',  iconBg: 'bg-purple-900',  text: 'text-purple-300',  border: 'border-purple-800' },
  red:     { bg: 'bg-red-950',     iconBg: 'bg-red-900',     text: 'text-red-300',     border: 'border-red-800' },
  gold:    { bg: 'bg-yellow-950',  iconBg: 'bg-yellow-900',  text: 'text-yellow-300',  border: 'border-yellow-800' },
  teal:    { bg: 'bg-teal-950',    iconBg: 'bg-teal-900',    text: 'text-teal-300',    border: 'border-teal-800' },
  cyan:    { bg: 'bg-cyan-950',    iconBg: 'bg-cyan-900',    text: 'text-cyan-300',    border: 'border-cyan-800' },
  rose:    { bg: 'bg-rose-950',    iconBg: 'bg-rose-900',    text: 'text-rose-300',    border: 'border-rose-800' },
  amber:   { bg: 'bg-amber-950',   iconBg: 'bg-amber-900',   text: 'text-amber-300',   border: 'border-amber-800' },
  indigo:  { bg: 'bg-indigo-950',  iconBg: 'bg-indigo-900',  text: 'text-indigo-300',  border: 'border-indigo-800' },
};

export default function FeaturesSection() {
  return (
    <section
      className="relative py-20 px-4 sm:px-6 lg:px-8 bg-[#030a06] overflow-hidden"
      style={{ isolation: 'isolate' }}
    >
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3" style={{ fontFamily: 'Amiri, serif' }}>
            الميزات الإضافية
          </h2>
          <p className="text-gray-400 font-cairo">استكشف أدوات إسلامية مفيدة</p>
        </div>

        <div
          className="rounded-3xl border border-emerald-900/40 bg-[#06140a] p-4 sm:p-6 md:p-8"
          style={{ transform: 'translateZ(0)' }}
        >
          <style>{`
            .features-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; align-items: stretch; }
            @media (min-width: 640px) { .features-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; } }
            @media (min-width: 1024px) { .features-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
          `}</style>
          <div className="features-grid">

            {features.map((feature) => {
              const colors = colorClasses[feature.color] || colorClasses.emerald;
              return (
                <Link
                  key={feature.href}
                  to={feature.href}
                  className={`relative flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl p-4 transition-colors duration-200 ${colors.bg} border ${colors.border} hover:brightness-125 cursor-pointer`}
                  style={{ transform: 'translateZ(0)', aspectRatio: '1 / 1' }}
                >
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${colors.iconBg}`}>
                    <feature.icon className={`w-6 h-6 ${colors.text}`} />
                  </div>
                  <span className={`text-xs sm:text-sm font-cairo text-center leading-tight ${colors.text}`}>
                    {feature.label}
                  </span>
                </Link>
              );
            })}

            {/* Disabled placeholder */}
            <div
              className="relative flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl p-4 bg-indigo-950 border border-indigo-800 opacity-60 cursor-not-allowed"
              style={{ transform: 'translateZ(0)', aspectRatio: '1 / 1' }}
              title="سيتم إضافته قريباً"
            >
              <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 bg-indigo-900">
                <Play className="w-6 h-6 text-indigo-300" />
              </div>
              <span className="text-xs sm:text-sm font-cairo text-center leading-tight text-indigo-300">
                دروس دينية فيديو
              </span>
              <span className="absolute top-2 left-2 text-[10px] font-cairo text-indigo-200 bg-indigo-900/80 px-1.5 py-0.5 rounded-full border border-indigo-800">
                سيتم إضافته قريباً
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

