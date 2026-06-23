
import { Link } from '@tanstack/react-router';
import { Star, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative bg-[#020806] border-t border-emerald-900/30 pt-12 pb-6 overflow-hidden">
      <div className="absolute inset-0 bg-islamic-pattern opacity-30 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div className="text-center md:text-right">
            <div className="flex items-center gap-3 justify-center md:justify-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center neon-emerald">
                <Star className="w-5 h-5" style={{ color: '#facc15', fill: '#facc15' }} />
              </div>
              <span className="font-amiri text-xl text-white" style={{ fontFamily: 'Amiri, serif' }}>القرآن الكريم</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed font-cairo">
              منصة إسلامية حديثة لقراءة القرآن الكريم والاستماع إليه بأعلى جودة وأجمل تصميم.
            </p>
          </div>

          {/* Quick Links */}
          <div className="text-center">
            <h3 className="text-emerald-400 font-cairo font-semibold mb-4">روابط سريعة</h3>
            <ul className="space-y-2">
              {[
                { href: '/read', label: 'قراءة القرآن' },
                { href: '/listen', label: 'الاستماع' },
                { href: '/search', label: 'البحث' },
                { href: '/favorites', label: 'المفضلة' },
              ].map(link => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-gray-400 hover:text-emerald-400 transition-colors text-sm font-cairo"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="text-center">
            <h3 className="text-emerald-400 font-cairo font-semibold mb-4">قانوني</h3>
            <ul className="space-y-2">
              {[
                { href: '/privacy', label: 'سياسة الخصوصية' },
                { href: '/terms', label: 'شروط الاستخدام' },
                { href: '/data-policy', label: 'سياسة البيانات' },
                { href: '/more/settings', label: 'الإعدادات' },
              ].map(link => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-gray-400 hover:text-emerald-400 transition-colors text-sm font-cairo"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quran Quote */}
          <div className="text-center md:text-left">
            <h3 className="text-gold-400 font-cairo font-semibold mb-4" style={{ color: '#facc15' }}>آية كريمة</h3>
            <blockquote className="font-amiri text-lg text-white/80 leading-relaxed mb-2" style={{ fontFamily: 'Amiri, serif' }}>
              ﴿ إِنَّ هَذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ ﴾
            </blockquote>
            <p className="text-emerald-500/70 text-xs font-cairo">سورة الإسراء - الآية ٩</p>
          </div>
        </div>


        <div className="border-t border-emerald-900/30 pt-6 flex flex-col items-center gap-3">
          <p
            className="font-amiri text-xl text-center"
            style={{ fontFamily: 'Amiri, serif', color: '#facc15', textShadow: '0 0 10px rgba(234,179,8,0.4)' }}
          >
            صدقة جارية بإذن الله
          </p>
          <p className="text-gray-500 text-xs font-cairo flex items-center gap-1">
            صنع بـ <Heart className="w-3 h-3 text-red-500 fill-red-500 mx-1" /> لخدمة القرآن الكريم &nbsp;|&nbsp; © {new Date().getFullYear()} القرآن الكريم
          </p>
        </div>
      </div>
    </footer>
  );
}
