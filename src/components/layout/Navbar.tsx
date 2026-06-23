
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { useLocation } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, BookOpen, Headphones, Search, Heart, Info, Mail, Menu, X, Star, TrendingUp,
  ChevronDown, Grid, CircleDot, BookMarked, MessageSquare, Shield, Sparkles,
  Clock, Compass, BookCopy, FileText, Calendar, Calculator, GraduationCap, Mic, Play, RefreshCw,
  Loader2, Download, Settings
} from 'lucide-react';
import { checkForUpdate, type RemoteVersionInfo } from '@/lib/native/updateChecker';
import { openExternalUrl, openBlankTabSync, WHATSAPP_CHANNEL_URL } from '@/lib/native/openExternal';
import { useAuth, signOut } from '@/hooks/use-auth';
import { LogIn, LogOut } from 'lucide-react';
import ThemeSwitcher from '@/components/ThemeSwitcher';

const navLinks = [
  { href: '/', label: 'الرئيسية', icon: Home },
  { href: '/read', label: 'قراءة القرآن', icon: BookOpen },
  { href: '/listen', label: 'الاستماع', icon: Headphones },
  { href: '/search', label: 'البحث', icon: Search },
  { href: '/progress', label: 'التقدم', icon: TrendingUp },
  { href: '/favorites', label: 'المفضلة', icon: Heart },
];

type MoreFeature = {
  href: string;
  label: string;
  icon: typeof Home;
  available: boolean;
  color: string;
  external?: boolean;
  action?: 'check-update';
};

const moreFeatures: MoreFeature[] = [
  { href: '/more/tasbeeh', label: 'السبحة الإلكترونية', icon: CircleDot, available: true, color: 'emerald' },
  { href: '/more/prayer-times', label: 'مواقيت الصلاة', icon: Clock, available: true, color: 'teal' },
  { href: '/more/names', label: 'أسماء الله الحسنى', icon: Sparkles, available: true, color: 'gold' },
  { href: '/more/hijri-calendar', label: 'التقويم الهجري', icon: Calendar, available: true, color: 'blue' },
  { href: '/more/zakat-calculator', label: 'حاسبة الزكاة', icon: Calculator, available: true, color: 'rose' },
  { href: '/more/islamic-education', label: 'تعليم الإسلام', icon: GraduationCap, available: true, color: 'cyan' },
  { href: '/more/quran-learning', label: 'تعلّم تلاوة القرآن', icon: Mic, available: true, color: 'emerald' },
  { href: '/more/athkar', label: 'الأذكار', icon: BookMarked, available: true, color: 'blue' },
  { href: '/more/hadith', label: 'الأحاديث', icon: MessageSquare, available: true, color: 'purple' },
  { href: '/more/qibla', label: 'اتجاه القبلة', icon: Compass, available: true, color: 'amber' },
  { href: '/more/ruqyah', label: 'الرقية الشرعية', icon: Shield, available: true, color: 'red' },
  { href: '/more/downloads', label: 'التحميلات (بدون نت)', icon: Download, available: true, color: 'indigo' },
  { href: '/more/settings', label: 'الإعدادات والخصوصية', icon: Settings, available: true, color: 'slate' },
  { href: '#check-update', label: 'التحقق من التحديثات', icon: RefreshCw, available: true, color: 'green', action: 'check-update' },
  { href: '#', label: 'دروس دينية فيديو', icon: Play, available: false, color: 'indigo' },
];

export default function Navbar() {
  const pathname = useLocation().pathname;
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateResult, setUpdateResult] = useState<
    | null
    | { status: 'latest'; currentVersion: string }
    | { status: 'available'; currentVersion: string; remote: RemoteVersionInfo }
    | { status: 'error'; message: string }
  >(null);

  const handleCheckUpdate = useCallback(async () => {
    if (updateChecking) return;
    // Open a blank tab synchronously inside the click gesture so the
    // browser doesn't block the popup after the async update check.
    const pending = openBlankTabSync();
    setUpdateChecking(true);
    setUpdateResult(null);
    try {
      const result = await checkForUpdate();
      if (result.hasUpdate && result.remote) {
        pending.close();
        setUpdateResult({ status: 'available', currentVersion: result.currentVersion, remote: result.remote });
      } else {
        await pending.navigate(WHATSAPP_CHANNEL_URL);
      }
    } catch {
      pending.close();
      setUpdateResult({ status: 'error', message: 'تعذّر الاتصال بالخادم. تأكد من اتصالك بالإنترنت وحاول مجدداً.' });
    } finally {
      setUpdateChecking(false);
    }
  }, [updateChecking]);


  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const isActive = (href: string) => {
    if (href.startsWith('/#')) return false;
    return pathname === href;
  };

  const isMoreActive = moreFeatures.some(f => pathname === f.href);

  const colorClasses: Record<string, { bg: string; iconBg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-900/40', iconBg: 'bg-emerald-900/40', text: 'text-emerald-400', border: 'border-emerald-700/40' },
    blue:    { bg: 'bg-blue-900/40',    iconBg: 'bg-blue-900/40',    text: 'text-blue-400',    border: 'border-blue-700/40' },
    purple:  { bg: 'bg-purple-900/40',  iconBg: 'bg-purple-900/40',  text: 'text-purple-400',  border: 'border-purple-700/40' },
    red:     { bg: 'bg-red-900/40',     iconBg: 'bg-red-900/40',     text: 'text-red-400',     border: 'border-red-700/40' },
    gold:    { bg: 'bg-yellow-900/40',  iconBg: 'bg-yellow-900/40',  text: 'text-yellow-400',  border: 'border-yellow-700/40' },
    teal:    { bg: 'bg-teal-900/40',    iconBg: 'bg-teal-900/40',    text: 'text-teal-400',    border: 'border-teal-700/40' },
    cyan:    { bg: 'bg-cyan-900/40',    iconBg: 'bg-cyan-900/40',    text: 'text-cyan-400',    border: 'border-cyan-700/40' },
    rose:    { bg: 'bg-rose-900/40',    iconBg: 'bg-rose-900/40',    text: 'text-rose-400',    border: 'border-rose-700/40' },
    amber:   { bg: 'bg-amber-900/40',   iconBg: 'bg-amber-900/40',   text: 'text-amber-400',   border: 'border-amber-700/40' },
    indigo:  { bg: 'bg-indigo-900/40',   iconBg: 'bg-indigo-900/40',   text: 'text-indigo-400',   border: 'border-indigo-700/40' },
    green:   { bg: 'bg-green-900/40',   iconBg: 'bg-green-900/40',   text: 'text-green-400',   border: 'border-green-700/40' },
  };

  // Solid-color variant for the mobile drawer cards — mirrors the
  // home-page FeaturesSection palette to avoid GPU compositor artifacts
  // caused by translucent backgrounds on Android Chrome.
  const solidColorClasses: Record<string, { bg: string; iconBg: string; text: string; border: string }> = {
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
    green:   { bg: 'bg-green-950',   iconBg: 'bg-green-900',   text: 'text-green-300',   border: 'border-green-800' },
  };


  return (
    <>
      <nav
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-[#030a06]/95 border-b border-emerald-900/40 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
            : 'bg-[#030a06]/90 border-b border-emerald-900/20'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center neon-emerald group-hover:scale-110 transition-transform duration-300">
                  <Star className="w-5 h-5 text-gold-400 fill-gold-400" style={{ color: '#facc15', fill: '#facc15' }} />
                </div>
                <div className="absolute inset-0 rounded-xl bg-emerald-500/20 blur-md group-hover:blur-lg transition-all duration-300" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-amiri text-lg font-bold text-white leading-none" style={{ fontFamily: 'Amiri, serif' }}>
                  القرآن الكريم
                </span>
                <span className="text-[10px] text-emerald-400 font-cairo leading-none mt-0.5">
                  اقرأ واستمع
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  to={href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-cairo font-medium transition-all duration-200 group ${
                    isActive(href)
                      ? 'bg-emerald-900/50 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                      : 'text-gray-300 hover:text-emerald-400 hover:bg-emerald-900/30'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-colors ${isActive(href) ? 'text-emerald-400' : 'text-gray-400 group-hover:text-emerald-400'}`} />
                  {label}
                </Link>
              ))}

              {/* More Dropdown */}
              <div ref={moreRef} className="relative">
                <button
                  onClick={() => setMoreOpen(!moreOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-cairo font-medium transition-all duration-200 group ${
                    isMoreActive
                      ? 'bg-emerald-900/50 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                      : 'text-gray-300 hover:text-emerald-400 hover:bg-emerald-900/30'
                  }`}
                >
                  <Grid className={`w-4 h-4 transition-colors ${isMoreActive ? 'text-emerald-400' : 'text-gray-400 group-hover:text-emerald-400'}`} />
                  المزيد
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {moreOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      style={{ transformOrigin: 'top right' }}
                      className="absolute top-full right-0 mt-2 w-[320px] p-3 rounded-2xl bg-[#030a06]/95 border border-emerald-900/40 shadow-2xl z-50"
                    >
                      <div className="grid grid-cols-2 gap-2 max-h-[70vh] overflow-y-auto">
                        {moreFeatures.map((feature) => {
                          const colors = colorClasses[feature.color] || colorClasses.emerald;
                          const isExternal = feature.external === true;
                          const content = (
                            <>
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${feature.available ? colors.bg : 'bg-gray-800/50'}`}>
                                <feature.icon className={`w-5 h-5 ${feature.available ? colors.text : 'text-gray-600'}`} />
                              </div>
                              <span className={`text-xs font-cairo text-center ${feature.available ? colors.text : 'text-gray-500'}`}>
                                {feature.label}
                              </span>
                              {!feature.available && (
                                <span className="absolute top-1 left-1 text-[8px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                                  سيتم إضافته قريباً
                                </span>
                              )}
                            </>
                          );
                          const className = `relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 group ${
                            feature.available
                              ? `${colors.bg} border ${colors.border} hover:scale-105 hover:shadow-lg cursor-pointer`
                              : 'bg-gray-900/30 border border-gray-800/30 cursor-not-allowed opacity-50'
                          }`;
                          if (feature.action === 'check-update' && feature.available) {
                            return (
                              <button
                                key={feature.href}
                                type="button"
                                onClick={() => { setMoreOpen(false); handleCheckUpdate(); }}
                                className={className}
                                disabled={updateChecking}
                              >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg}`}>
                                  {updateChecking
                                    ? <Loader2 className={`w-5 h-5 ${colors.text} animate-spin`} />
                                    : <feature.icon className={`w-5 h-5 ${colors.text}`} />}
                                </div>
                                <span className={`text-xs font-cairo text-center ${colors.text}`}>
                                  {updateChecking ? 'جارٍ التحقق…' : feature.label}
                                </span>
                              </button>
                            );
                          }
                          if (isExternal && feature.available) {
                            return (
                              <a
                                key={feature.href}
                                href={feature.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setMoreOpen(false)}
                                className={className}
                              >
                                {content}
                              </a>
                            );
                          }
                          return (
                            <Link
                              key={feature.href}
                              to={feature.available ? feature.href : '#'}
                              onClick={() => {
                                if (feature.available) setMoreOpen(false);
                              }}
                              className={className}
                            >
                              {content}
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Static Links */}
              <a
                href="/#about"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-cairo font-medium text-gray-300 hover:text-emerald-400 hover:bg-emerald-900/30 transition-all duration-200"
              >
                <Info className="w-4 h-4 text-gray-400" />
                من نحن
              </a>
              <a
                href="/#contact"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-cairo font-medium text-gray-300 hover:text-emerald-400 hover:bg-emerald-900/30 transition-all duration-200"
              >
                <Mail className="w-4 h-4 text-gray-400" />
                تواصل معنا
              </a>
              {user && !user.is_anonymous ? (
                <button
                  onClick={() => signOut()}
                  title={user.email ?? ''}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-cairo font-medium text-amber-300 hover:text-amber-200 hover:bg-emerald-900/30 transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  خروج
                </button>
              ) : (
                <Link
                  to="/auth"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-cairo font-medium text-amber-300 hover:text-amber-200 hover:bg-emerald-900/30 transition-all duration-200"
                >
                  <LogIn className="w-4 h-4" />
                  ربط حساب
                </Link>
              )}
              <div className="mr-2">
                <ThemeSwitcher compact />
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center gap-2 flex-shrink-0">
              <ThemeSwitcher compact />
              <button
              onClick={() => setMenuOpen(prev => !prev)}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-900/40 border border-emerald-800/50 text-emerald-400 hover:bg-emerald-900/60 transition-all duration-200"
              aria-label="قائمة التنقل"
            >
              <AnimatePresence mode="wait" initial={false}>
                {menuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ opacity: 0, rotate: 90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -90 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Fullscreen Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
            className="fixed inset-0 z-[99] lg:hidden pointer-events-auto"
            style={{ backgroundColor: '#030a06', isolation: 'isolate' }}
          >
            <div
              className="absolute inset-0 pointer-events-auto"
              style={{ backgroundColor: '#030a06' }}
              onClick={closeMenu}
            />
            <div className="relative h-full flex flex-col pt-20 px-6 pb-8 overflow-y-auto" style={{ backgroundColor: '#030a06' }}>
              <div className="flex-1 flex flex-col gap-2 mt-4">
                {navLinks.map(({ href, label, icon: Icon }, idx) => (
                  <motion.div
                    key={href}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{ delay: idx * 0.05, duration: 0.2 }}
                  >
                    <Link
                      to={href}
                      onClick={closeMenu}
                      className={`flex items-center gap-4 px-5 py-4 rounded-2xl text-lg font-cairo font-semibold transition-all duration-200 ${
                        isActive(href)
                          ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-700/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                          : 'text-gray-200 hover:bg-emerald-900/30 hover:text-emerald-400 border border-transparent'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isActive(href) ? 'bg-emerald-800/60' : 'bg-white/5'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {label}
                      {isActive(href) && (
                        <div className="mr-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </Link>
                  </motion.div>
                ))}

                {/* المزيد Section in Mobile — mirrors home FeaturesSection */}
                <div className="mt-4 pt-4 border-t border-emerald-900/30">
                  <p className="px-1 mb-3 text-sm font-cairo text-gray-500">المزيد</p>
                  <style>{`
                    .nav-features-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; align-items: stretch; }
                  `}</style>
                  <div className="nav-features-grid">
                    {moreFeatures.map((feature) => {
                      const colors = solidColorClasses[feature.color] || solidColorClasses.emerald;
                      const isExternal = feature.external === true;
                      const content = (
                        <>
                          <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${feature.available ? colors.iconBg : 'bg-gray-900'}`}>
                            <feature.icon className={`w-6 h-6 ${feature.available ? colors.text : 'text-gray-600'}`} />
                          </div>
                          <span className={`text-xs font-cairo text-center leading-tight ${feature.available ? colors.text : 'text-gray-500'}`}>
                            {feature.label}
                          </span>
                          {!feature.available && (
                            <span className="absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded bg-gray-900 text-gray-400 border border-gray-700">
                              سيتم إضافته قريباً
                            </span>
                          )}
                        </>
                      );
                      const className = `relative flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl p-4 transition-colors duration-200 ${
                        feature.available
                          ? `${colors.bg} border ${colors.border} hover:brightness-125 cursor-pointer`
                          : 'bg-gray-950 border border-gray-800 cursor-not-allowed opacity-50'
                      }`;
                      if (feature.action === 'check-update' && feature.available) {
                        return (
                          <button
                            key={feature.href}
                            type="button"
                            onClick={() => { closeMenu(); handleCheckUpdate(); }}
                            disabled={updateChecking}
                            className={className}
                            style={{ transform: 'translateZ(0)', aspectRatio: '1 / 1' }}
                          >
                            <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${colors.iconBg}`}>
                              {updateChecking
                                ? <Loader2 className={`w-6 h-6 ${colors.text} animate-spin`} />
                                : <feature.icon className={`w-6 h-6 ${colors.text}`} />}
                            </div>
                            <span className={`text-xs font-cairo text-center leading-tight ${colors.text}`}>
                              {updateChecking ? 'جارٍ التحقق…' : feature.label}
                            </span>
                          </button>
                        );
                      }
                      if (isExternal && feature.available) {
                        return (
                          <a
                            key={feature.href}
                            href={feature.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={closeMenu}
                            className={className}
                            style={{ transform: 'translateZ(0)', aspectRatio: '1 / 1' }}
                          >
                            {content}
                          </a>
                        );
                      }
                      return (
                        <Link
                          key={feature.href}
                          to={feature.available ? feature.href : '#'}
                          onClick={(e) => {
                            if (!feature.available) {
                              e.preventDefault();
                            } else {
                              closeMenu();
                            }
                          }}
                          className={className}
                          style={{ transform: 'translateZ(0)', aspectRatio: '1 / 1' }}
                        >
                          {content}
                        </Link>
                      );
                    })}
                  </div>
                </div>


                {/* Static Links */}
                <div className="mt-4 pt-4 border-t border-emerald-900/30 flex flex-col gap-2">
                  <a href="/#about" onClick={closeMenu} className="flex items-center gap-4 px-5 py-3 text-gray-400 hover:text-emerald-400 transition-colors">
                    <Info className="w-5 h-5" />
                    <span className="font-cairo">من نحن</span>
                  </a>
                  <a href="/#contact" onClick={closeMenu} className="flex items-center gap-4 px-5 py-3 text-gray-400 hover:text-emerald-400 transition-colors">
                    <Mail className="w-5 h-5" />
                    <span className="font-cairo">تواصل معنا</span>
                  </a>
                </div>
              </div>

              <div className="text-center mt-6">
                <p className="text-emerald-600/60 text-sm font-cairo">بسم الله الرحمن الرحيم</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Update Check Result Modal */}
      <AnimatePresence>
        {updateResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            dir="rtl"
            onClick={() => setUpdateResult(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-emerald-800 bg-[#06140a] p-6 relative"
            >
              <button
                onClick={() => setUpdateResult(null)}
                className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-gray-950 border border-gray-800 hover:brightness-125 text-gray-300 flex items-center justify-center"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>

              {updateResult.status === 'available' && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-900 border border-emerald-800 flex items-center justify-center shrink-0">
                      <Sparkles className="w-6 h-6 text-emerald-300" />
                    </div>
                    <div>
                      <h3 className="text-white font-cairo font-bold text-lg">تحديث جديد متاح</h3>
                      <p className="text-emerald-400 text-xs font-cairo mt-0.5">
                        {updateResult.currentVersion} ← {updateResult.remote.version}
                      </p>
                    </div>
                  </div>
                  {updateResult.remote.message && (
                    <p className="text-gray-200 font-cairo text-sm leading-relaxed mb-4">
                      {updateResult.remote.message}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => { void openExternalUrl(updateResult.remote.apk_url); }}
                    className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-cairo font-semibold text-sm rounded-lg px-4 py-3 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    تحميل التحديث
                  </button>
                </div>
              )}

              {updateResult.status === 'error' && (
                <div className="text-center">
                  <h3 className="text-white font-cairo font-bold text-lg mb-2">تعذّر التحقق</h3>
                  <p className="text-gray-300 font-cairo text-sm">{updateResult.message}</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
