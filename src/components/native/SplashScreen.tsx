import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { SplashScreen as CapacitorSplashScreen } from '@capacitor/splash-screen';

const AYAH = 'إِنَّ هَذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ';
const AYAH_REF = 'سورة الإسراء: الآية 9';

function IslamicPattern() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.06]"
      xmlns="http://www.w3.org/2000/svg"
      style={{ pointerEvents: 'none' }}
    >
      <defs>
        <pattern id="islamic-tile" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M40 0 L80 20 L80 60 L40 80 L0 60 L0 20 Z" fill="none" stroke="#c89b3c" strokeWidth="0.5"/>
          <path d="M40 10 L70 25 L70 55 L40 70 L10 55 L10 25 Z" fill="none" stroke="#c89b3c" strokeWidth="0.3"/>
          <circle cx="40" cy="40" r="12" fill="none" stroke="#c89b3c" strokeWidth="0.4"/>
          <path d="M40 28 L44 36 L52 36 L46 42 L48 50 L40 45 L32 50 L34 42 L28 36 L36 36 Z" fill="none" stroke="#c89b3c" strokeWidth="0.3"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#islamic-tile)"/>
    </svg>
  );
}

function MosqueSilhouette() {
  return (
    <svg
      className="absolute bottom-0 left-0 right-0 w-full opacity-10"
      viewBox="0 0 400 120"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMax meet"
    >
      <g fill="#ffffff">
        {/* Central large dome */}
        <ellipse cx="200" cy="60" rx="55" ry="55"/>
        <rect x="145" y="60" width="110" height="60"/>
        {/* Left medium dome */}
        <ellipse cx="110" cy="75" rx="38" ry="38"/>
        <rect x="72" y="75" width="76" height="45"/>
        {/* Right medium dome */}
        <ellipse cx="290" cy="75" rx="38" ry="38"/>
        <rect x="252" y="75" width="76" height="45"/>
        {/* Far left small dome */}
        <ellipse cx="35" cy="88" rx="25" ry="25"/>
        <rect x="10" y="88" width="50" height="32"/>
        {/* Far right small dome */}
        <ellipse cx="365" cy="88" rx="25" ry="25"/>
        <rect x="340" y="88" width="50" height="32"/>
        {/* Central minaret */}
        <rect x="193" y="0" width="14" height="65"/>
        <ellipse cx="200" cy="5" rx="10" ry="10"/>
        {/* Left minaret */}
        <rect x="98" y="20" width="10" height="55"/>
        <ellipse cx="103" cy="25" rx="7" ry="7"/>
        {/* Right minaret */}
        <rect x="292" y="20" width="10" height="55"/>
        <ellipse cx="297" cy="25" rx="7" ry="7"/>
      </g>
    </svg>
  );
}

function DecorativeFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glowing ring */}
      <div className="absolute inset-0 rounded-full bg-[#c89b3c]/5 blur-2xl" style={{ transform: 'scale(1.3)' }}/>
      {/* Decorative SVG frame */}
      <svg
        viewBox="0 0 320 320"
        className="absolute w-[320px] h-[320px]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5d97a"/>
            <stop offset="50%" stopColor="#c89b3c"/>
            <stop offset="100%" stopColor="#f5d97a"/>
          </linearGradient>
        </defs>
        {/* 8-pointed star frame (Islamic geometry) */}
        <path
          d="M160 20
             L180 70 L220 50 L200 95
             L250 85 L230 125 L280 135
             L240 160 L280 185 L230 195
             L250 235 L200 225 L220 270
             L180 250 L160 300
             L140 250 L100 270 L120 225
             L70 235 L90 195 L40 185
             L80 160 L40 135 L90 125
             L70 85 L120 95 L100 50
             L140 70 Z"
          fill="none"
          stroke="url(#goldGrad)"
          strokeWidth="2.5"
          opacity="0.85"
        />
        {/* Inner decorative ring */}
        <circle cx="160" cy="160" r="130" fill="none" stroke="url(#goldGrad)" strokeWidth="1.5" opacity="0.5" strokeDasharray="6 4"/>
        <circle cx="160" cy="160" r="120" fill="none" stroke="url(#goldGrad)" strokeWidth="1" opacity="0.3"/>
        {/* Corner dots */}
        {[
          [160, 25], [290, 95], [310, 230], [240, 305],
          [80, 305], [10, 230], [30, 95], [160, 25]
        ].slice(0, 7).map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="4" fill="#c89b3c" opacity="0.6"/>
        ))}
      </svg>
      {/* Inner content circle */}
      <div
        className="relative z-10 w-[220px] h-[220px] rounded-full flex flex-col items-center justify-center"
        style={{ background: 'radial-gradient(ellipse at center, rgba(4,40,18,0.95) 0%, rgba(2,20,8,0.98) 100%)' }}
      >
        {children}
      </div>
    </div>
  );
}

export function AppSplashScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Animate progress bar
    const steps = [
      { target: 30, delay: 200 },
      { target: 60, delay: 600 },
      { target: 85, delay: 1200 },
      { target: 100, delay: 1800 },
    ];

    const timers: ReturnType<typeof setTimeout>[] = [];

    steps.forEach(({ target, delay }) => {
      timers.push(setTimeout(() => setProgress(target), delay));
    });

    // Hide after 2.4s
    timers.push(
      setTimeout(() => {
        setVisible(false);
        // Hide native splash screen if on Capacitor
        if (Capacitor.isNativePlatform()) {
          CapacitorSplashScreen.hide({ fadeOutDuration: 400 }).catch(() => undefined);
        }
        setTimeout(onDone, 500);
      }, 2400)
    );

    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-between py-16 overflow-hidden"
          style={{ background: 'radial-gradient(ellipse at 50% 30%, #0a3d1e 0%, #030a06 70%)' }}
        >
          <IslamicPattern />
          <MosqueSilhouette />

          {/* Top spacer */}
          <div />

          {/* Center: Logo and frame */}
          <div className="relative z-10 flex flex-col items-center gap-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <DecorativeFrame>
                {/* Quran Book Icon */}
                <div className="flex flex-col items-center gap-1">
                  {/* Arabic title */}
                  <div
                    className="text-center leading-tight"
                    style={{ fontFamily: 'Amiri, serif', color: '#e8c560', textShadow: '0 0 12px rgba(200,155,60,0.6)' }}
                  >
                    <div style={{ fontSize: '28px', fontWeight: 700 }}>القرآن</div>
                    <div style={{ fontSize: '22px', fontWeight: 700 }}>الكريم</div>
                  </div>
                  {/* Book SVG */}
                  <svg viewBox="0 0 90 60" width="90" height="60" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="pageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f5e6c0"/>
                        <stop offset="100%" stopColor="#e8d5a0"/>
                      </linearGradient>
                      <linearGradient id="spineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8b6914"/>
                        <stop offset="100%" stopColor="#c89b3c"/>
                      </linearGradient>
                    </defs>
                    {/* Left page */}
                    <path d="M4,4 Q2,30 4,52 L42,50 L42,2 Q28,0 4,4 Z" fill="url(#pageGrad)" stroke="#c89b3c" strokeWidth="1"/>
                    {/* Right page */}
                    <path d="M86,4 Q88,30 86,52 L48,50 L48,2 Q62,0 86,4 Z" fill="url(#pageGrad)" stroke="#c89b3c" strokeWidth="1"/>
                    {/* Spine */}
                    <rect x="42" y="1" width="6" height="50" rx="2" fill="url(#spineGrad)"/>
                    {/* Lines on left */}
                    <line x1="10" y1="16" x2="38" y2="16" stroke="#c89b3c" strokeWidth="0.7" opacity="0.5"/>
                    <line x1="9" y1="24" x2="38" y2="24" stroke="#c89b3c" strokeWidth="0.7" opacity="0.5"/>
                    <line x1="9" y1="32" x2="38" y2="32" stroke="#c89b3c" strokeWidth="0.7" opacity="0.5"/>
                    {/* Lines on right */}
                    <line x1="52" y1="16" x2="80" y2="16" stroke="#c89b3c" strokeWidth="0.7" opacity="0.5"/>
                    <line x1="52" y1="24" x2="81" y2="24" stroke="#c89b3c" strokeWidth="0.7" opacity="0.5"/>
                    <line x1="52" y1="32" x2="81" y2="32" stroke="#c89b3c" strokeWidth="0.7" opacity="0.5"/>
                    {/* Book stand */}
                    <path d="M20,52 L16,60 L74,60 L70,52 Z" fill="#8b6914"/>
                    <rect x="38" y="58" width="14" height="3" rx="1.5" fill="#6b4f10"/>
                  </svg>
                </div>
              </DecorativeFrame>
            </motion.div>

            {/* Ayah */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-center px-8"
            >
              <div
                className="text-[#e8c560] text-lg leading-relaxed mb-1"
                style={{ fontFamily: 'Amiri, serif', textShadow: '0 0 8px rgba(200,155,60,0.3)' }}
              >
                ﴿ {AYAH} ﴾
              </div>
              <div className="text-[#a08540] text-xs font-cairo mt-1">{AYAH_REF}</div>
            </motion.div>
          </div>

          {/* Bottom: Progress bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="relative z-10 w-full px-12 flex flex-col items-center gap-3"
          >
            <div className="w-full h-1.5 bg-[#0a2010] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #c89b3c, #f5d97a, #c89b3c)' }}
                initial={{ width: '5%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              />
            </div>
            <p className="text-[#a08540] text-sm font-cairo">جاري التحميل...</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
