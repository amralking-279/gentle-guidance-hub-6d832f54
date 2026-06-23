import { Link } from '@tanstack/react-router';
import { BookOpen, Sparkles, Grid3x3, Bell, Compass } from 'lucide-react';

const TABS = [
  { to: '/', label: 'استكشف', Icon: Sparkles },
  { to: '/more/prayer-times', label: 'الصلاة', Icon: Bell },
  { to: '/more', label: 'المزيد', Icon: Grid3x3 },
  { to: '/more/athkar', label: 'الأذكار', Icon: Compass },
  { to: '/read', label: 'القرآن', Icon: BookOpen },
] as const;

export function PrayerNowBottomTab() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-emerald-900/40 bg-[#0a1f17]/95 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      dir="rtl"
    >
      <ul className="flex items-stretch justify-around max-w-md mx-auto px-2 py-2">
        {TABS.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="flex flex-col items-center justify-center gap-1 py-1 text-emerald-200/80 hover:text-emerald-300 active:text-emerald-400 transition-colors"
              activeProps={{ className: 'flex flex-col items-center justify-center gap-1 py-1 text-emerald-300' }}
            >
              <Icon className="w-5 h-5" />
              <span className="font-cairo text-[11px] font-bold">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
