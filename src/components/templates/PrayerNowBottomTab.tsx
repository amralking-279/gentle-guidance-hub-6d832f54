import { Link } from '@tanstack/react-router';
import { BookOpenText, Sparkles, LayoutGrid, Clock4, HeartHandshake } from 'lucide-react';

const TABS = [
  { to: '/', label: 'استكشف', Icon: Sparkles },
  { to: '/more/prayer-times', label: 'الصلاة', Icon: Clock4 },
  { to: '/more', label: 'المزيد', Icon: LayoutGrid },
  { to: '/more/athkar', label: 'الأذكار', Icon: HeartHandshake },
  { to: '/read', label: 'القرآن', Icon: BookOpenText },
] as const;

export function PrayerNowBottomTab() {
  return (
    <nav
      className="app-template-tab fixed bottom-0 left-0 right-0 z-40"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'linear-gradient(180deg, rgba(255,250,236,0.96) 0%, rgba(248,238,214,0.98) 100%)',
        borderTop: '1px solid rgba(201, 164, 73, 0.35)',
        boxShadow: '0 -8px 30px -10px rgba(120, 78, 30, 0.18), inset 0 1px 0 rgba(255,255,255,0.6)',
        backdropFilter: 'blur(16px) saturate(140%)',
      }}
      dir="rtl"
    >
      {/* thin gold top accent */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-32"
        style={{ background: 'linear-gradient(90deg, transparent, #c9a449, transparent)' }}
      />
      <ul className="flex items-stretch justify-around max-w-md mx-auto px-2 pt-2 pb-1.5">
        {TABS.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="group relative flex flex-col items-center justify-center gap-1 py-1.5 px-1 transition-colors"
              style={{ color: '#7a8c80' }}
              activeProps={{
                style: { color: '#1f6b4a' },
              }}
            >
              {({ isActive }) => (
                <>
                  <span
                    className="flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-300"
                    style={
                      isActive
                        ? {
                            background:
                              'linear-gradient(135deg, rgba(31,107,74,0.12) 0%, rgba(201,164,73,0.18) 100%)',
                            boxShadow: 'inset 0 0 0 1px rgba(201,164,73,0.35)',
                          }
                        : undefined
                    }
                  >
                    <Icon
                      className="w-[22px] h-[22px]"
                      strokeWidth={isActive ? 2.4 : 1.9}
                    />
                  </span>
                  <span
                    className="font-cairo text-[11px] font-bold tracking-tight"
                    style={{ color: isActive ? '#1f6b4a' : '#7a8c80' }}
                  >
                    {label}
                  </span>
                  {isActive && (
                    <span
                      className="absolute -top-[6px] left-1/2 -translate-x-1/2 h-1 w-8 rounded-full"
                      style={{ background: 'linear-gradient(90deg, #c9a449, #1f6b4a)' }}
                    />
                  )}
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
