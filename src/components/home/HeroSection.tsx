
import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { BookOpen, Headphones, ChevronDown } from 'lucide-react';

const BASMALA = 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ';

function IslamicGeometry({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M100 10 L190 55 L190 145 L100 190 L10 145 L10 55 Z" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.3" />
      <path d="M100 30 L170 65 L170 135 L100 170 L30 135 L30 65 Z" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.2" />
      <path d="M100 50 L150 75 L150 125 L100 150 L50 125 L50 75 Z" stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.2" />
      <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.1" strokeDasharray="4 4" />
      <circle cx="100" cy="100" r="50" stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.15" />
      <path d="M100 20 L100 180 M20 100 L180 100 M30 30 L170 170 M170 30 L30 170" stroke="currentColor" strokeWidth="0.3" opacity="0.08" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x = 100 + 70 * Math.cos(rad);
        const y = 100 + 70 * Math.sin(rad);
        return <circle key={i} cx={x} cy={y} r="3" fill="currentColor" opacity="0.3" />;
      })}
    </svg>
  );
}

function FloatingParticle({ delay, size, x, y }: { delay: number; size: number; x: string; y: string }) {
  return (
    <motion.div
      className="absolute rounded-full hidden md:block"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        background: `radial-gradient(circle, rgba(16,185,129,0.6) 0%, rgba(16,185,129,0) 70%)`,
      }}
      animate={{
        y: [0, -20, 0],
        opacity: [0.3, 0.8, 0.3],
        scale: [1, 1.3, 1],
      }}
      transition={{
        duration: 4 + delay,
        repeat: Infinity,
        delay,
        ease: 'easeInOut',
      }}
    />
  );
}

const particles = [
  { delay: 0, size: 8, x: '15%', y: '20%' },
  { delay: 1.2, size: 5, x: '80%', y: '15%' },
  { delay: 0.7, size: 12, x: '70%', y: '75%' },
  { delay: 2, size: 6, x: '25%', y: '70%' },
  { delay: 0.4, size: 9, x: '50%', y: '85%' },
  { delay: 1.8, size: 4, x: '90%', y: '45%' },
  { delay: 0.9, size: 7, x: '5%', y: '55%' },
  { delay: 1.5, size: 5, x: '40%', y: '10%' },
  { delay: 3, size: 10, x: '60%', y: '25%' },
  { delay: 2.5, size: 6, x: '85%', y: '60%' },
];

export default function HeroSection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#030a06]">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(6,95,70,0.25)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(6,95,70,0.1)_0%,transparent_50%)]" />
      </div>

      {/* Particles */}
      {mounted && particles.map((p, i) => (
        <FloatingParticle key={i} {...p} />
      ))}

      {/* Decorative Geometry */}
      <motion.div
        className="absolute top-10 right-10 w-48 h-48 text-emerald-700/20 hidden md:block"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      >
        <IslamicGeometry className="w-full h-full" />
      </motion.div>
      <motion.div
        className="absolute bottom-20 left-10 w-36 h-36 text-emerald-700/15 hidden md:block"
        animate={{ rotate: -360 }}
        transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
      >
        <IslamicGeometry className="w-full h-full" />
      </motion.div>

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 hidden md:block w-64 h-64 bg-emerald-900/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 hidden md:block w-64 h-64 bg-emerald-900/15 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Basmala */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mb-8"
        >
          <div className="inline-block px-6 py-3 rounded-full glass border border-emerald-700/30 mb-4">
            <p
              className="text-emerald-300 text-lg md:text-xl"
              style={{ fontFamily: 'Amiri, serif' }}
            >
              {BASMALA}
            </p>
          </div>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="font-amiri text-5xl md:text-7xl lg:text-8xl font-bold mb-6"
          style={{ fontFamily: 'Amiri, serif' }}
        >
          <span className="gradient-emerald-gold text-neon-emerald">القرآن</span>
          <span className="text-white mx-3">الكريم</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-cairo mb-10"
        >
          اقرأ واستمع إلى القرآن الكريم كاملًا بتصميم إسلامي حديث ومريح يساعد على التدبر والخشوع.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link
            to="/read"
            className="group relative flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-cairo font-bold text-lg rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_35px_rgba(16,185,129,0.5)] hover:-translate-y-0.5"
          >
            <BookOpen className="w-5 h-5" />
            ابدأ القراءة
            <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>

          <Link
            to="/listen"
            className="group flex items-center gap-3 px-8 py-4 glass border border-emerald-700/40 text-emerald-300 hover:text-white font-cairo font-bold text-lg rounded-2xl transition-all duration-300 hover:border-emerald-500/60 hover:bg-emerald-900/40 hover:-translate-y-0.5"
          >
            <Headphones className="w-5 h-5" />
            استمع الآن
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="flex flex-wrap justify-center gap-8 mt-16"
        >
          {[
            { value: '١١٤', label: 'سورة' },
            { value: '٦٢٣٦', label: 'آية' },
            { value: '١٦+', label: 'قارئ' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div
                className="text-3xl md:text-4xl font-bold gradient-emerald-gold"
                style={{ fontFamily: 'Amiri, serif' }}
              >
                {value}
              </div>
              <div className="text-gray-400 text-sm font-cairo mt-1">{label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-emerald-600/60"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="text-xs font-cairo">اكتشف المزيد</span>
        <ChevronDown className="w-5 h-5" />
      </motion.div>
    </section>
  );
}
