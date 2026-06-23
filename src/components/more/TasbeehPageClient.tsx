import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import {
  ArrowRight, RotateCcw, Lightbulb, Volume2, VolumeX, Vibrate,
  Sparkles, ChevronLeft, BookOpen
} from 'lucide-react';

type Dhikr = {
  id: string;
  arabic: string;
  transliteration: string;
  target: number;
  fadl: string;
};

const DHKAR_OPTIONS: Dhikr[] = [
  {
    id: 'subhan',
    arabic: 'سُبْحَانَ اللَّهِ',
    transliteration: 'SubhanAllah',
    target: 33,
    fadl: 'قال ﷺ: «كلمتانِ خفيفتانِ على اللسانِ، ثقيلتانِ في الميزانِ، حبيبتانِ إلى الرحمنِ: سبحان الله وبحمده، سبحان الله العظيم». رواه البخاري ومسلم.',
  },
  {
    id: 'hamd',
    arabic: 'الْحَمْدُ لِلَّهِ',
    transliteration: 'Alhamdulillah',
    target: 33,
    fadl: 'قال ﷺ: «الحمد لله تملأ الميزان». رواه مسلم. وهي أحبّ الكلام إلى الله بعد سبحان الله.',
  },
  {
    id: 'la-ilah',
    arabic: 'لَا إِلَهَ إِلَّا اللَّهُ',
    transliteration: 'La ilaha illAllah',
    target: 100,
    fadl: 'قال ﷺ: «أفضل الذكر لا إله إلا الله». رواه الترمذي. ومن قالها مئة مرة كانت له عدل عشر رقاب وكُتبت له مئة حسنة.',
  },
  {
    id: 'allah-akbar',
    arabic: 'اللَّهُ أَكْبَرُ',
    transliteration: 'Allahu Akbar',
    target: 34,
    fadl: 'من أحب الكلام إلى الله، وتمام الباقيات الصالحات. تكبير الله إقرارٌ بعظمته وتعظيمٌ لشأنه سبحانه.',
  },
  {
    id: 'lahawl',
    arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    transliteration: 'La hawla wa la quwwata illa billah',
    target: 100,
    fadl: 'قال ﷺ: «هي كنزٌ من كنوز الجنة». رواه البخاري ومسلم. وهي شفاءٌ من تسعة وتسعين داءً أيسرها الهمّ.',
  },
  {
    id: 'istighfar',
    arabic: 'أَسْتَغْفِرُ اللَّهَ',
    transliteration: 'Astaghfirullah',
    target: 100,
    fadl: 'قال ﷺ: «من لزم الاستغفار جعل الله له من كل همٍّ فرجًا، ومن كل ضيقٍ مخرجًا، ورزقه من حيث لا يحتسب». رواه أبو داود.',
  },
  {
    id: 'salat-nabi',
    arabic: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
    transliteration: 'Allahumma salli wa sallim ala Muhammad',
    target: 100,
    fadl: 'قال ﷺ: «من صلّى عليّ صلاةً واحدةً صلّى الله عليه بها عشرًا». رواه مسلم. والصلاة عليه ﷺ سببٌ لكشف الكروب وقضاء الحوائج.',
  },
  {
    id: 'subhan-bihamd',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    transliteration: 'SubhanAllahi wa bihamdih',
    target: 100,
    fadl: 'قال ﷺ: «من قال سبحان الله وبحمده في يوم مئة مرة، حُطّت خطاياه ولو كانت مثل زبد البحر». رواه البخاري ومسلم.',
  },
  {
    id: 'subhan-azim',
    arabic: 'سُبْحَانَ اللَّهِ الْعَظِيمِ وَبِحَمْدِهِ',
    transliteration: 'SubhanAllahi al-Azim wa bihamdih',
    target: 100,
    fadl: 'قال ﷺ: «من قال سبحان الله العظيم وبحمده غُرست له نخلة في الجنة». رواه الترمذي.',
  },
  {
    id: 'hasbi-allah',
    arabic: 'حَسْبِيَ اللَّهُ وَنِعْمَ الْوَكِيلُ',
    transliteration: 'Hasbiyallahu wa ni\'mal wakeel',
    target: 70,
    fadl: 'قالها إبراهيم عليه السلام حين أُلقي في النار، وقالها محمد ﷺ حين قيل له إن الناس قد جمعوا لكم. كافيةٌ لكلّ همٍّ وكربٍ.',
  },
  {
    id: 'tawhid-mulk',
    arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration: 'La ilaha illAllah wahdahu...',
    target: 100,
    fadl: 'قال ﷺ: «من قالها في يوم مئة مرة كانت له عدل عشر رقاب، وكُتبت له مئة حسنة، ومُحيت عنه مئة سيئة، وكانت له حرزًا من الشيطان يومه ذلك». رواه البخاري.',
  },
  {
    id: 'baqiyat',
    arabic: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ',
    transliteration: 'Al-Baqiyat as-Salihat',
    target: 33,
    fadl: 'قال ﷺ: «الباقيات الصالحات». وقال: «لأن أقولهنّ أحبّ إليّ مما طلعت عليه الشمس». رواه مسلم.',
  },
  {
    id: 'sayyid-istighfar',
    arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ...',
    transliteration: 'Sayyid al-Istighfar',
    target: 3,
    fadl: 'قال ﷺ: «من قالها من النهار موقنًا بها فمات من يومه قبل أن يُمسي فهو من أهل الجنة، ومن قالها من الليل وهو موقنٌ بها فمات قبل أن يصبح فهو من أهل الجنة». رواه البخاري.',
  },
  {
    id: 'tawakkul',
    arabic: 'تَوَكَّلْتُ عَلَى اللَّهِ',
    transliteration: 'Tawakkaltu \'ala Allah',
    target: 100,
    fadl: 'قال تعالى: ﴿وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ﴾. والتوكل من أعظم العبادات وأجمعها لخير الدنيا والآخرة.',
  },
  {
    id: 'ya-hayy',
    arabic: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ',
    transliteration: 'Ya Hayyu ya Qayyum',
    target: 100,
    fadl: 'كان ﷺ إذا حزبه أمرٌ قال: «يا حيُّ يا قيومُ برحمتك أستغيث». رواه الترمذي. وهي من أعظم ما يُستفتح به الفرج.',
  },
  {
    id: 'custom',
    arabic: 'تخصيص',
    transliteration: 'Custom',
    target: 100,
    fadl: 'اختر ذكرك المفضّل وعدد التكرار الذي تريد. ولا تنسَ نية الإخلاص لله تعالى في كل ذكرٍ تقوله.',
  },
];

const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toArabicNum(n: number): string {
  return String(n).split('').map(d => arabicNumerals[parseInt(d)] ?? d).join('');
}

export default function TasbeehPageClient() {
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(33);
  const [selectedDhikr, setSelectedDhikr] = useState<Dhikr>(DHKAR_OPTIONS[0]);
  const [history, setHistory] = useState<{ dhikr: string; count: number; date: string }[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [totalToday, setTotalToday] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const buttonScale = useMotionValue(1);
  const glowOpacity = useTransform(buttonScale, [0.9, 1], [0.5, 0.8]);

  useEffect(() => {
    const saved = localStorage.getItem('tasbeeh_data');
    if (saved) {
      const data = JSON.parse(saved);
      setCount(data.count || 0);
      setTarget(data.target || 33);
      // Re-resolve dhikr from options to ensure fadl is present after schema upgrade
      const savedId = data.selectedDhikr?.id;
      const matched = DHKAR_OPTIONS.find(d => d.id === savedId) || DHKAR_OPTIONS[0];
      setSelectedDhikr(matched);
      setHistory(data.history || []);
      setSoundEnabled(data.soundEnabled ?? true);
      setVibrationEnabled(data.vibrationEnabled ?? true);
    }

    const savedHistory = localStorage.getItem('tasbeeh_history');
    if (savedHistory) {
      const historyData = JSON.parse(savedHistory);
      const today = new Date().toDateString();
      const todayTotal = historyData
        .filter((h: { date: string }) => new Date(h.date).toDateString() === today)
        .reduce((acc: number, h: { count: number }) => acc + h.count, 0);
      setTotalToday(todayTotal);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tasbeeh_data', JSON.stringify({
      count, target, selectedDhikr, history, soundEnabled, vibrationEnabled,
    }));
  }, [count, target, selectedDhikr, history, soundEnabled, vibrationEnabled]);

  const playSound = useCallback(() => {
    if (!soundEnabled) return;
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1;
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }, [soundEnabled]);

  const vibrate = useCallback(() => {
    if (vibrationEnabled && navigator.vibrate) navigator.vibrate(50);
  }, [vibrationEnabled]);

  const increment = useCallback(() => {
    setCount(prev => {
      const newCount = prev + 1;
      playSound();
      vibrate();
      if (newCount >= target) {
        const entry = { dhikr: selectedDhikr.arabic, count: newCount, date: new Date().toISOString() };
        setHistory(h => [entry, ...h]);
        setTotalToday(t => t + newCount);
        const savedHistory = localStorage.getItem('tasbeeh_history');
        const historyData = savedHistory ? JSON.parse(savedHistory) : [];
        localStorage.setItem('tasbeeh_history', JSON.stringify([entry, ...historyData]));
        return 0;
      }
      return newCount;
    });
  }, [target, selectedDhikr.arabic, playSound, vibrate]);

  const reset = useCallback(() => setCount(0), []);

  const changeDhikr = useCallback((dhikr: Dhikr) => {
    setSelectedDhikr(dhikr);
    setTarget(dhikr.target);
    setCount(0);
  }, []);

  const progress = count > 0 ? Math.min((count / target) * 100, 100) : 0;

  return (
    <div className="pt-20 pb-24 min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Settings toggle */}
        <div className="flex items-center justify-end mb-6">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              showSettings
                ? 'bg-emerald-900/60 border border-emerald-700/50 text-emerald-400'
                : 'bg-emerald-900/30 border border-emerald-800/30 text-gray-400 hover:text-emerald-400'
            }`}
          >
            <Lightbulb className="w-5 h-5" />
          </button>
        </div>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-card rounded-2xl p-4 mb-6"
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-300 font-cairo">الصوت</span>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    soundEnabled
                      ? 'bg-emerald-900/40 border border-emerald-700/40 text-emerald-400'
                      : 'bg-gray-800/40 border border-gray-700/40 text-gray-500'
                  }`}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-gray-300 font-cairo">الاهتزاز</span>
                <button
                  onClick={() => setVibrationEnabled(!vibrationEnabled)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    vibrationEnabled
                      ? 'bg-emerald-900/40 border border-emerald-700/40 text-emerald-400'
                      : 'bg-gray-800/40 border border-gray-700/40 text-gray-500'
                  }`}
                >
                  <Vibrate className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-emerald-900/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 font-cairo">إجمالي اليوم</span>
                  <span className="text-emerald-400 font-cairo font-bold">{toArabicNum(totalToday)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dhikr Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="grid grid-cols-4 gap-2">
            {DHKAR_OPTIONS.map((dhikr) => (
              <button
                key={dhikr.id}
                onClick={() => changeDhikr(dhikr)}
                className={`p-3 rounded-xl transition-all text-center min-h-[60px] flex items-center justify-center ${
                  selectedDhikr.id === dhikr.id
                    ? 'bg-emerald-900/60 border border-emerald-700/50 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                    : 'bg-emerald-950/30 border border-emerald-900/30 text-gray-400 hover:text-emerald-400 hover:bg-emerald-900/20'
                }`}
              >
                <span className="text-sm leading-tight" style={{ fontFamily: 'Amiri, serif' }}>
                  {dhikr.id === 'custom' ? 'تخصيص' : dhikr.arabic.split(' ').slice(0, 3).join(' ')}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Current Dhikr Display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-6"
        >
          <motion.h2
            key={selectedDhikr.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl text-white mb-2 leading-relaxed px-2"
            style={{ fontFamily: 'Amiri, serif' }}
          >
            {selectedDhikr.arabic}
          </motion.h2>
          <p className="text-emerald-500/60 font-cairo text-sm">{selectedDhikr.transliteration}</p>
        </motion.div>

        {/* Counter Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative flex flex-col items-center justify-center mb-6"
        >
          <div className="relative w-64 h-64 md:w-72 md:h-72">
            <div
              className="absolute inset-0 rounded-full blur-2xl"
              style={{ background: `radial-gradient(circle, rgba(16, 185, 129, ${glowOpacity.get()}) 0%, transparent 70%)` }}
            />
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(16, 185, 129, 0.1)" strokeWidth="8" />
              <motion.circle
                cx="100" cy="100" r="90" fill="none" stroke="url(#gradient)" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 90}
                initial={{ strokeDashoffset: 2 * Math.PI * 90 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 90 * (1 - progress / 100) }}
                transition={{ duration: 0.3 }}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>
            <motion.button
              onClick={increment}
              style={{ scale: buttonScale }}
              whileTap={{ scale: 0.95 }}
              className="absolute inset-8 md:inset-10 rounded-full bg-gradient-to-br from-emerald-900/80 to-emerald-950/80 border-2 border-emerald-700/40 shadow-[0_0_40px_rgba(16,185,129,0.2)] flex flex-col items-center justify-center transition-shadow hover:shadow-[0_0_60px_rgba(16,185,129,0.35)] active:shadow-[0_0_80px_rgba(16,185,129,0.5)]"
            >
              <motion.span
                key={count}
                initial={{ opacity: 0, scale: 1.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-5xl md:text-6xl font-bold text-emerald-400 font-cairo"
                style={{ textShadow: '0 0 30px rgba(16, 185, 129, 0.5)' }}
              >
                {toArabicNum(count)}
              </motion.span>
              <span className="text-emerald-600/60 text-sm font-cairo mt-1">
                من {toArabicNum(target)}
              </span>
            </motion.button>
          </div>
        </motion.div>

        {/* Fadl (virtue) of current dhikr */}
        <motion.div
          key={`fadl-${selectedDhikr.id}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-8 rounded-2xl p-5 bg-gradient-to-br from-emerald-950/40 to-emerald-900/20 border border-emerald-800/40 shadow-[0_0_25px_rgba(16,185,129,0.08)]"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-900/50 border border-emerald-700/40 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-emerald-400 font-cairo font-bold text-sm">فضل الذكر</h3>
          </div>
          <p
            className="text-gray-200 text-base md:text-lg leading-loose text-right"
            style={{ fontFamily: 'Amiri, serif' }}
          >
            {selectedDhikr.fadl}
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-4"
        >
          <button
            onClick={reset}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-gray-400 hover:text-emerald-400 hover:bg-emerald-900/40 transition-all font-cairo"
          >
            <RotateCcw className="w-4 h-4" />
            إعادة
          </button>

          <button
            onClick={() => setCount(0)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-gray-400 hover:text-emerald-400 hover:bg-emerald-900/40 transition-all font-cairo"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            التالي
          </button>
        </motion.div>

        <AnimatePresence>
          {count >= target && count > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="mt-8 text-center"
            >
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-900/40 border border-emerald-700/40 text-emerald-400 font-cairo">
                <Sparkles className="w-5 h-5" />
                أحسنت! تم إكمال {toArabicNum(target)} تسبيحة
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {history.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12"
          >
            <h3 className="text-gray-400 font-cairo text-sm mb-3 text-center">آخر الأذكار</h3>
            <div className="space-y-2">
              {history.slice(0, 5).map((entry, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-950/20 border border-emerald-900/20"
                >
                  <span className="text-white" style={{ fontFamily: 'Amiri, serif' }}>
                    {entry.dhikr}
                  </span>
                  <span className="text-emerald-400 font-cairo">{toArabicNum(entry.count)}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
