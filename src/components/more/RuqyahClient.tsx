import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { Shield, ArrowRight, RotateCcw, BookOpen, Play, Pause, SkipForward, Volume2, Repeat, Loader2 } from 'lucide-react';
import { RUQYAH, VIRTUES } from '@/lib/data/ruqyah';
import { RECITERS, getAllAudioUrls } from '@/services/quranApi';
import SheikhRuqyahPlayer from './SheikhRuqyahPlayer';

const RUQYAH_SURAHS = [
  { number: 1, name: 'الفاتحة' },
  { number: 2, name: 'البقرة (كاملة)' },
  { number: 112, name: 'الإخلاص' },
  { number: 113, name: 'الفلق' },
  { number: 114, name: 'الناس' },
  { number: 36, name: 'يس' },
  { number: 55, name: 'الرحمن' },
  { number: 67, name: 'الملك' },
];

export default function RuqyahClient() {
  const [activeId, setActiveId] = useState(RUQYAH[0].id);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<'ruqyah' | 'virtues'>('ruqyah');
  const active = RUQYAH.find(c => c.id === activeId)!;

  // Audio player state
  const audioRef = useRef<HTMLAudioElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const [reciterId, setReciterId] = useState(RECITERS[0].identifier);
  const [surahIdx, setSurahIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [urlIdx, setUrlIdx] = useState(0);
  const [autoplay, setAutoplay] = useState(false);

  // Load autoplay preference
  useEffect(() => {
    try {
      const v = localStorage.getItem('ruqyah:autoplay');
      if (v === '1') setAutoplay(true);
    } catch {}
  }, []);

  const toggleAutoplay = () => {
    setAutoplay(prev => {
      const next = !prev;
      try { localStorage.setItem('ruqyah:autoplay', next ? '1' : '0'); } catch {}
      return next;
    });
  };

  const surah = RUQYAH_SURAHS[surahIdx];
  const urls = getAllAudioUrls(surah.number, reciterId);
  const currentUrl = urls[Math.min(urlIdx, urls.length - 1)];

  useEffect(() => {
    setUrlIdx(0);
  }, [reciterId, surahIdx]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) a.play().catch(() => setIsPlaying(false));
    else a.pause();
  }, [isPlaying, currentUrl]);

  const handleError = () => {
    if (urlIdx < urls.length - 1) setUrlIdx(i => i + 1);
    else setIsPlaying(false);
  };

  const nextSurah = () => {
    setSurahIdx(i => (i + 1) % RUQYAH_SURAHS.length);
  };

  const handleEnded = () => {
    if (autoplay) {
      setSurahIdx(i => (i + 1) % RUQYAH_SURAHS.length);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  const sheikhStopRef = useRef<(() => void) | null>(null);

  const selectCategory = (id: string) => {
    if (id === activeId) return;
    // Stop and clear any TTS audio when switching category
    const a = ttsAudioRef.current;
    if (a) { a.pause(); a.currentTime = 0; }
    setTtsPlayingKey(null);
    sheikhStopRef.current?.();
    setActiveId(id);
    requestAnimationFrame(() => {
      itemsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };


  const key = (i: number) => `${activeId}:${i}`;
  const inc = (i: number, max: number) =>
    setCounts(c => ({ ...c, [key(i)]: Math.min((c[key(i)] ?? 0) + 1, max) }));
  const reset = (i: number) => setCounts(c => ({ ...c, [key(i)]: 0 }));

  // TTS for ruqyah items
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsCacheRef = useRef<Map<string, string>>(new Map());
  const [ttsLoadingKey, setTtsLoadingKey] = useState<string | null>(null);
  const [ttsPlayingKey, setTtsPlayingKey] = useState<string | null>(null);

  const stopTts = () => {
    const a = ttsAudioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    setTtsPlayingKey(null);
  };

  const playItem = async (text: string) => {
    // Toggle if already playing this exact item
    if (ttsPlayingKey === text) {
      stopTts();
      return;
    }
    stopTts();
    // Pause the surah player while item TTS plays
    if (isPlaying) setIsPlaying(false);

    try {
      const cache = ttsCacheRef.current;
      let url = cache.get(text);
      if (!url) {
        setTtsLoadingKey(text);
        const res = await fetch('/api/public/tts/ruqyah', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error(`TTS ${res.status}`);
        const blob = await res.blob();
        url = URL.createObjectURL(blob);
        // LRU cap: keep at most 8 entries
        if (cache.size >= 8) {
          const oldestKey = cache.keys().next().value;
          if (oldestKey) {
            const oldUrl = cache.get(oldestKey);
            if (oldUrl) URL.revokeObjectURL(oldUrl);
            cache.delete(oldestKey);
          }
        }
        cache.set(text, url);
      } else {
        // Refresh recency
        cache.delete(text);
        cache.set(text, url);
      }

      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      audio.onended = () => setTtsPlayingKey(null);
      audio.onerror = () => setTtsPlayingKey(null);
      setTtsPlayingKey(text);
      await audio.play();
    } catch {
      setTtsPlayingKey(null);
    } finally {
      setTtsLoadingKey(null);
    }
  };

  useEffect(() => {
    return () => {
      ttsAudioRef.current?.pause();
      ttsCacheRef.current.forEach(u => URL.revokeObjectURL(u));
      ttsCacheRef.current.clear();
    };
  }, []);


  return (
    <div className="pt-24 pb-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-red-800/30 mb-4">
            <Shield className="w-4 h-4 text-red-400" />
            <span className="text-red-400 font-cairo text-sm">الرقية الشرعية</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3" style={{ fontFamily: 'Amiri, serif' }}>
            الرقية الشرعية
          </h1>
          <p className="text-gray-400 font-cairo">حصن المسلم من القرآن والسنة</p>
        </motion.div>

        {/* Top tabs */}
        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() => setTab('ruqyah')}
            className={`px-5 py-2 rounded-xl font-cairo text-sm border transition-all ${
              tab === 'ruqyah'
                ? 'bg-red-900/60 border-red-600 text-red-200'
                : 'glass border-red-900/40 text-gray-300 hover:border-red-700/60'
            }`}
          >
            الرقى والآيات
          </button>
          <button
            onClick={() => setTab('virtues')}
            className={`px-5 py-2 rounded-xl font-cairo text-sm border transition-all ${
              tab === 'virtues'
                ? 'bg-red-900/60 border-red-600 text-red-200'
                : 'glass border-red-900/40 text-gray-300 hover:border-red-700/60'
            }`}
          >
            الفضائل
          </button>
        </div>


        {tab === 'ruqyah' && (
        <>
        {/* Reciter audio player */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-5 mb-6 border border-red-900/50 bg-gradient-to-br from-red-950/40 to-red-900/10"
        >
          <div className="flex items-center gap-2 mb-4">
            <Volume2 className="w-5 h-5 text-red-400" />
            <h3 className="text-white font-cairo font-bold">استمع للرقية من القرآن</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-gray-400 text-xs font-cairo mb-1.5">القارئ</label>
              <select
                value={reciterId}
                onChange={e => setReciterId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-red-950/40 border border-red-800/50 text-white font-cairo text-sm focus:outline-none focus:border-red-500"
                style={{ direction: 'rtl' }}
              >
                {RECITERS.map(r => (
                  <option key={r.identifier} value={r.identifier} className="bg-gray-900">
                    {r.arabicName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-cairo mb-1.5">السورة</label>
              <select
                value={surahIdx}
                onChange={e => setSurahIdx(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-red-950/40 border border-red-800/50 text-white font-cairo text-sm focus:outline-none focus:border-red-500"
                style={{ direction: 'rtl' }}
              >
                {RUQYAH_SURAHS.map((s, i) => (
                  <option key={s.number} value={i} className="bg-gray-900">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(p => !p)}
              className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all shadow-lg shadow-red-900/40"
              aria-label={isPlaying ? 'إيقاف' : 'تشغيل'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <button
              onClick={nextSurah}
              className="w-10 h-10 rounded-full bg-red-900/40 border border-red-700/40 text-red-300 hover:bg-red-900/70 flex items-center justify-center transition-all"
              aria-label="السورة التالية"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <button
              onClick={toggleAutoplay}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
                autoplay
                  ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-900/40'
                  : 'bg-red-900/40 border-red-700/40 text-red-300 hover:bg-red-900/70'
              }`}
              aria-label="تشغيل تلقائي"
              aria-pressed={autoplay}
              title={autoplay ? 'التشغيل التلقائي مفعّل' : 'تشغيل تلقائي'}
            >
              <Repeat className="w-4 h-4" />
            </button>
            <div className="flex-1 text-right">
              <p className="text-white font-cairo text-sm font-bold" style={{ fontFamily: 'Amiri, serif' }}>
                {surah.name}
              </p>
              <p className="text-red-400/70 font-cairo text-xs">
                {RECITERS.find(r => r.identifier === reciterId)?.arabicName}
                {autoplay && <span className="mr-2 text-red-300">• تشغيل تلقائي</span>}
              </p>
            </div>
          </div>

          <audio
            ref={audioRef}
            src={currentUrl}
            onEnded={handleEnded}
            onError={handleError}
            preload="none"
          />
        </motion.div>


            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {RUQYAH.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => selectCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl font-cairo text-sm border transition-all ${
                    activeId === cat.id
                      ? 'bg-red-900/60 border-red-600 text-red-200 shadow-lg shadow-red-900/40'
                      : 'glass border-red-900/40 text-gray-300 hover:border-red-700/60'
                  }`}
                >
                  {cat.title}
                </button>
              ))}
            </div>

            <div ref={itemsRef} className="scroll-mt-24">
            {active.description && (
              <div className="glass-card rounded-2xl p-4 mb-5 border border-red-900/40 bg-red-950/20">
                <p className="text-red-300/90 font-cairo text-sm leading-relaxed text-center">
                  {active.description}
                </p>
              </div>
            )}

            <div className="space-y-4">
              {active.items.map((item, i) => {
                const c = counts[key(i)] ?? 0;
                const done = c >= item.count;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`glass-card rounded-2xl p-6 border ${done ? 'border-red-600/60' : 'border-red-900/40'}`}
                  >
                    <p
                      className="text-white text-lg leading-loose mb-4"
                      style={{ fontFamily: 'Amiri, serif', direction: 'rtl' }}
                    >
                      {item.text}
                    </p>
                    {item.note && (
                      <p className="text-red-400/80 text-xs font-cairo mb-3">{item.note}</p>
                    )}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <button
                        onClick={() => inc(i, item.count)}
                        disabled={done}
                        className="px-5 py-2 rounded-xl font-cairo text-sm border transition-all bg-red-900/40 border-red-700/40 text-red-300 hover:bg-red-900/70 disabled:cursor-default"
                      >
                        {done ? '✓ تم' : `اضغط للعد (${c} / ${item.count})`}
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => playItem(item.text)}
                          disabled={ttsLoadingKey === item.text}
                          className={`p-2 rounded-lg border transition-all ${
                            ttsPlayingKey === item.text
                              ? 'bg-red-600 border-red-400 text-white'
                              : 'bg-red-900/40 border-red-700/40 text-red-300 hover:bg-red-900/70'
                          } disabled:opacity-60`}
                          aria-label={ttsPlayingKey === item.text ? 'إيقاف' : 'استماع'}
                          title={ttsPlayingKey === item.text ? 'إيقاف' : 'استماع'}
                        >
                          {ttsLoadingKey === item.text ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : ttsPlayingKey === item.text ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => reset(i)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                          aria-label="إعادة"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  </motion.div>
                );
              })}
            </div>
            </div>

            <SheikhRuqyahPlayer registerStop={(fn) => { sheikhStopRef.current = fn; }} />
          </>

        )}

        {tab === 'virtues' && (
          <div className="space-y-6">
            {Object.values(VIRTUES).map((section, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-card rounded-2xl p-6 md:p-8 border border-red-900/40 bg-gradient-to-br from-red-950/30 to-transparent"
              >
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-red-900/40">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-700/50 to-red-900/40 border border-red-600/40 flex items-center justify-center shadow-lg shadow-red-900/30">
                    <BookOpen className="w-5 h-5 text-red-200" />
                  </div>
                  <h2
                    className="text-3xl md:text-4xl font-bold bg-gradient-to-l from-red-200 via-amber-100 to-red-200 bg-clip-text text-transparent"
                    style={{ fontFamily: 'Amiri, serif' }}
                  >
                    {section.title}
                  </h2>
                </div>
                <ul className="space-y-4">
                  {section.items.map((line, i) => {
                    const dashIdx = line.lastIndexOf('—');
                    const body = dashIdx > 0 ? line.slice(0, dashIdx).trim() : line;
                    const source = dashIdx > 0 ? line.slice(dashIdx + 1).trim() : null;
                    return (
                      <li
                        key={i}
                        className="flex gap-3 items-start rounded-xl bg-red-950/20 border border-red-900/30 p-4 md:p-5"
                        style={{ direction: 'rtl' }}
                      >
                        <span className="shrink-0 w-7 h-7 rounded-full bg-red-900/50 border border-red-700/40 text-red-200 text-xs font-bold flex items-center justify-center mt-1">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-white text-lg md:text-xl"
                            style={{ fontFamily: 'Amiri, serif', lineHeight: '2.1' }}
                          >
                            {body}
                          </p>
                          {source && (
                            <span className="inline-block mt-2 px-2.5 py-1 rounded-md bg-red-900/30 border border-red-800/40 text-red-300/90 text-xs font-cairo">
                              {source}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-900/40 border border-red-700/40 text-red-300 hover:bg-red-900/60 transition-all"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="font-cairo">العودة للرئيسية</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
