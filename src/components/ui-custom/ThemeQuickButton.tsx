import { Link } from '@tanstack/react-router';
import { Palette } from 'lucide-react';

export function ThemeQuickButton() {
  return (
    <Link
      to="/more/themes"
      aria-label="تغيير شكل التطبيق"
      title="تغيير شكل التطبيق"
      className="fixed z-40 flex items-center gap-2 rounded-full font-cairo font-bold text-[12px] transition-transform hover:-translate-y-0.5 active:translate-y-0"
      style={{
        right: '14px',
        bottom: 'calc(86px + env(safe-area-inset-bottom))',
        padding: '10px 14px',
        background: 'linear-gradient(135deg, #fffaf0 0%, #f5e7c1 100%)',
        color: '#1f6b4a',
        border: '1px solid rgba(201, 164, 73, 0.55)',
        boxShadow:
          '0 12px 28px -10px rgba(120, 78, 30, 0.35), inset 0 1px 0 rgba(255,255,255,0.75)',
        backdropFilter: 'blur(10px) saturate(140%)',
      }}
    >
      <span
        className="flex items-center justify-center w-7 h-7 rounded-full"
        style={{
          background: 'linear-gradient(135deg, #1f6b4a 0%, #2d8a5f 100%)',
          color: '#fdf6e3',
          boxShadow: '0 4px 10px -2px rgba(31, 107, 74, 0.45)',
        }}
      >
        <Palette className="w-4 h-4" strokeWidth={2.2} />
      </span>
      الشكل
    </Link>
  );
}