
import { useState, useCallback, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  ChevronUp, ChevronDown, Loader2, Music, RotateCcw,
  Settings, Repeat, Repeat1, X
} from 'lucide-react';
import { useAudio } from '@/components/providers/AudioProvider';
import { useSurahs } from '@/hooks/useQuran';
import type { PlayMode } from '@/types/quran';

function formatTime(t: number): string {
  if (!isFinite(t) || isNaN(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const PLAY_MODES: { value: PlayMode; label: string }[] = [
  { value: 'normal', label: 'عادي' },
  { value: 'repeat-ayah', label: 'تكرار الآية' },
  { value: 'repeat-range', label: 'تكرار مجموعة' },
  { value: 'listen-repeat', label: 'استمع وكرر' },
];

// Outer wrapper: animated via framer-motion. Avoid `contain: paint` here
// because combining paint containment with transform animations causes
// GPU layer artifacts on mobile Chrome.
const outerLayerStyle: CSSProperties = {
  isolation: 'isolate',
  transform: 'translate3d(0,0,0)',
  willChange: 'transform',
  backfaceVisibility: 'hidden',
  boxShadow: 'none',
  backgroundImage: 'none',
  filter: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
};

// Inner static surfaces: safe to fully contain & isolate.
const safeLayerStyle: CSSProperties = {
  isolation: 'isolate',
  contain: 'paint',
  transform: 'translateZ(0)',
  backfaceVisibility: 'hidden',
  boxShadow: 'none',
  backgroundImage: 'none',
  filter: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
};

export function AudioPlayer() {
  const {
    currentSurah, isPlaying, isLoading, currentTime, duration,
    volume, playbackRate, playMode, repeatCount, listenRepeatDelay,
    error, togglePlay, setVolume, setPlaybackRate,
    seekTo, seekForward, seekBackward, playNext, playPrevious,
    setPlayMode, setRepeatCount, setListenRepeatDelay,
    replayCurrentAyah, closePlayer,
  } = useAudio();

  const { surahs } = useSurahs();
  const [expanded, setExpanded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(1);
  const [showModes, setShowModes] = useState(false);

  const toggleMute = useCallback(() => {
    if (muted) {
      setVolume(prevVolume);
      setMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setMuted(true);
    }
  }, [muted, volume, prevVolume, setVolume]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!currentSurah) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-50"
      style={outerLayerStyle}
    >
      {/* Solid opaque shield: prevents any underlying scrolling layer
          from bleeding through GPU compositing artifacts. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[#020806]"
        style={{ ...safeLayerStyle, zIndex: -1 }}
      />
      <div className="relative bg-[#020806] border-t border-emerald-900" style={safeLayerStyle}>

        {/* Progress bar */}
        <div
          className="w-full h-1 bg-emerald-950 cursor-pointer group"
          style={safeLayerStyle}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const pct = x / rect.width;
            seekTo(pct * duration);
          }}
        >
          <div
            className="h-full bg-emerald-500 transition-all duration-100 relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-emerald-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="flex items-center gap-4 px-4 py-3 max-w-7xl mx-auto">
          {/* Surah Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative w-10 h-10 rounded-xl bg-emerald-900 border border-emerald-800 flex items-center justify-center flex-shrink-0" style={safeLayerStyle}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              ) : (
                <Music className="w-4 h-4 text-emerald-400" />
              )}
              {isPlaying && !isLoading && (
                <div className="absolute inset-0 rounded-xl border border-emerald-500 animate-ping" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-bold truncate" style={{ fontFamily: 'Amiri, serif' }}>
                {currentSurah.name}
              </p>
              {error ? (
                <p className="text-red-400 text-xs font-cairo truncate">
                  {error}
                </p>
              ) : (
                <p className="text-gray-500 text-xs font-cairo truncate">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </p>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Seek Backward */}
            <button
              onClick={seekBackward}
              className="p-2 text-gray-400 hover:text-emerald-400 transition-colors hidden sm:block"
              title="رجوع 5 ثواني"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => playPrevious(surahs)}
              className="p-2 text-gray-400 hover:text-emerald-400 transition-colors"
              title="السابق"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              disabled={isLoading}
              className="w-10 h-10 rounded-full bg-emerald-800 border border-emerald-700 hover:brightness-125 flex items-center justify-center text-white transition-colors duration-200 disabled:opacity-60"
              style={safeLayerStyle}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 mr-0.5" />
              )}
            </button>

            <button
              onClick={() => playNext(surahs)}
              className="p-2 text-gray-400 hover:text-emerald-400 transition-colors"
              title="التالي"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            {/* Seek Forward */}
            <button
              onClick={seekForward}
              className="p-2 text-gray-400 hover:text-emerald-400 transition-colors hidden sm:block"
              title="تقديم 5 ثواني"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Volume & Expand */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Play Mode */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowModes(prev => !prev)}
                className={`p-2 rounded-lg transition-all ${
                  playMode !== 'normal'
                      ? 'text-emerald-300 bg-emerald-900 border border-emerald-800'
                    : 'text-gray-400 hover:text-emerald-400'
                }`}
                title="وضع التشغيل"
              >
                {playMode === 'normal' ? <Repeat className="w-4 h-4" /> : <Repeat1 className="w-4 h-4" />}
              </button>
              <AnimatePresence>
                {showModes && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full right-0 mb-2 bg-[#06140a] border border-emerald-900 rounded-xl p-2 min-w-[140px] z-50"
                    style={safeLayerStyle}
                  >
                    {PLAY_MODES.map(mode => (
                      <button
                        key={mode.value}
                        onClick={() => { setPlayMode(mode.value); setShowModes(false); }}
                        className={`w-full px-3 py-2 rounded-lg text-right text-sm font-cairo transition-colors ${
                          playMode === mode.value
                            ? 'bg-emerald-900 text-emerald-300 border border-emerald-800'
                            : 'text-gray-400 bg-gray-950 border border-gray-800 hover:text-emerald-300'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={toggleMute}
              className="p-2 text-gray-400 hover:text-emerald-400 transition-colors hidden sm:block"
            >
              {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={e => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
              className="hidden sm:block w-20 h-1 accent-emerald-500 cursor-pointer"
            />

            <button
              onClick={() => setExpanded(prev => !prev)}
              className="p-2 text-gray-400 hover:text-emerald-400 transition-colors"
              title={expanded ? 'تصغير' : 'توسيع'}
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>

            <button
              onClick={closePlayer}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-950"
              title="إغلاق المشغل"
              aria-label="إغلاق المشغل"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expanded Panel */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-emerald-900"
              style={safeLayerStyle}
            >
              <div className="px-4 py-4 max-w-7xl mx-auto space-y-4">
                {/* Volume Mobile */}
                <div className="flex items-center gap-3 sm:hidden">
                  <Volume2 className="w-4 h-4 text-gray-400" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={e => setVolume(parseFloat(e.target.value))}
                    className="w-24 h-1 accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Speed */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs font-cairo">السرعة:</span>
                    <div className="flex gap-1">
                      {[0.75, 1, 1.25, 1.5, 2].map(rate => (
                        <button
                          key={rate}
                          onClick={() => setPlaybackRate(rate)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-cairo transition-all ${
                            playbackRate === rate
                              ? 'bg-emerald-900 text-emerald-300 border border-emerald-700'
                              : 'bg-gray-950 text-gray-400 hover:text-emerald-300 border border-gray-800'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Repeat Count */}
                  {(playMode === 'repeat-ayah' || playMode === 'repeat-range') && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs font-cairo">التكرار:</span>
                      <div className="flex gap-1">
                        {[1, 3, 5, 7, 10, 20].map(count => (
                          <button
                            key={count}
                            onClick={() => setRepeatCount(count)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-cairo transition-all ${
                              repeatCount === count
                                ? 'bg-emerald-900 text-emerald-300 border border-emerald-700'
                                : 'bg-gray-950 text-gray-400 hover:text-emerald-300 border border-gray-800'
                            }`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Listen-Repeat Delay */}
                  {playMode === 'listen-repeat' && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs font-cairo">الانتظار:</span>
                      <div className="flex gap-1">
                        {[2, 3, 5, 7, 10].map(delay => (
                          <button
                            key={delay}
                            onClick={() => setListenRepeatDelay(delay)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-cairo transition-all ${
                              listenRepeatDelay === delay
                                ? 'bg-emerald-900 text-emerald-300 border border-emerald-700'
                                : 'bg-gray-950 text-gray-400 hover:text-emerald-300 border border-gray-800'
                            }`}
                          >
                            {delay}s
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Play Mode Mobile */}
                <div className="flex items-center gap-2 md:hidden">
                  <Settings className="w-4 h-4 text-gray-400" />
                  <div className="flex gap-1 flex-wrap">
                    {PLAY_MODES.map(mode => (
                      <button
                        key={mode.value}
                        onClick={() => setPlayMode(mode.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-cairo transition-all ${
                          playMode === mode.value
                            ? 'bg-emerald-900 text-emerald-300 border border-emerald-700'
                            : 'bg-gray-950 text-gray-400 hover:text-emerald-300 border border-gray-800'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
