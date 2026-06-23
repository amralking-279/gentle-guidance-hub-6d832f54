
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import type { Surah, Reciter, PlayMode, Ayah } from '@/types/quran';
import { RECITERS, getAudioUrl, getAllAudioUrls } from '@/services/quranApi';
import { getCachedAudioSrc } from '@/lib/native/audioCache';

interface AudioContextType {
  currentSurah: Surah | null;
  currentReciter: Reciter;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  currentAyahIndex: number;
  playMode: PlayMode;
  repeatCount: number;
  repeatRange: { start: number; end: number } | null;
  listenRepeatDelay: number;
  error: string | null;
  // Basic controls
  playSurah: (surah: Surah) => void;
  pauseAudio: () => void;
  resumeAudio: () => void;
  togglePlay: () => void;
  setReciter: (reciter: Reciter) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  seekTo: (time: number) => void;
  seekForward: () => void;
  seekBackward: () => void;
  playNext: (surahs: Surah[]) => void;
  playPrevious: (surahs: Surah[]) => void;
  // Advanced controls
  setPlayMode: (mode: PlayMode) => void;
  setRepeatCount: (count: number) => void;
  setRepeatRange: (range: { start: number; end: number } | null) => void;
  setListenRepeatDelay: (seconds: number) => void;
  replayCurrentAyah: () => void;
  playAyahRange: (start: number, end: number) => void;
  // Memorization
  getCurrentAyah: () => Ayah | null;
  setCurrentAyahIndex: (index: number) => void;
  closePlayer: () => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fallbackIndexRef = useRef(0);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const [currentSurah, setCurrentSurah] = useState<Surah | null>(null);
  const [currentReciter, setCurrentReciter] = useState<Reciter>(RECITERS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [playMode, setPlayMode] = useState<PlayMode>('normal');
  const [repeatCount, setRepeatCount] = useState(1);
  const [repeatRange, setRepeatRange] = useState<{ start: number; end: number } | null>(null);
  const [listenRepeatDelay, setListenRepeatDelay] = useState(3);
  const [currentRepeatCount, setCurrentRepeatCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const ayahsRef = useRef<Ayah[]>([]);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    // Set initial properties
    audio.volume = 1;
    audio.playbackRate = 1;
    audio.preload = 'auto';

    // Event handlers
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };
    const handleCanPlay = () => setIsLoading(false);
    const handlePlaying = () => {
      setIsPlaying(true);
      setIsLoading(false);
      setError(null);
    };
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlayThrough = () => setIsLoading(false);

    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      handleAudioError();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
    };
  }, []);

  const handleEnded = useCallback(() => {
    if (playMode === 'repeat-ayah' && currentRepeatCount < repeatCount - 1) {
      setCurrentRepeatCount(prev => prev + 1);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      return;
    }

    if (playMode === 'repeat-range' && repeatRange) {
      if (currentAyahIndex < repeatRange.end - 1) {
        setCurrentAyahIndex(prev => prev + 1);
        setCurrentRepeatCount(0);
        return;
      } else if (currentRepeatCount < repeatCount - 1) {
        setCurrentAyahIndex(repeatRange.start - 1);
        setCurrentRepeatCount(prev => prev + 1);
        return;
      }
    }

    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentRepeatCount(0);
  }, [playMode, currentRepeatCount, repeatCount, repeatRange, currentAyahIndex]);

  const handleAudioError = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentSurah) {
      setIsLoading(false);
      setIsPlaying(false);
      return;
    }

    // Try next fallback URL
    const nextFallbackIndex = fallbackIndexRef.current + 1;
    const urls = getAllAudioUrls(currentSurah.number, currentReciter.identifier);

    if (nextFallbackIndex < urls.length && retryCountRef.current < maxRetries) {
      console.log(`Trying fallback ${nextFallbackIndex} for surah ${currentSurah.number}`);
      fallbackIndexRef.current = nextFallbackIndex;
      retryCountRef.current += 1;

      const newUrl = urls[nextFallbackIndex];
      audio.src = newUrl;
      audio.load();
      audio.play().catch(() => {
        // Try again or fail
        if (retryCountRef.current >= maxRetries) {
          setError('فشل تحميل الصوت. جرب قارئ آخر.');
          setIsLoading(false);
          setIsPlaying(false);
        }
      });
    } else {
      // All fallbacks exhausted
      setError('تعذر تشغيل هذه السورة. جرب قارئ آخر.');
      setIsLoading(false);
      setIsPlaying(false);
      fallbackIndexRef.current = 0;
      retryCountRef.current = 0;
    }
  }, [currentSurah, currentReciter]);

  const playSurah = useCallback((surah: Surah) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Reset fallback tracking
    fallbackIndexRef.current = 0;
    retryCountRef.current = 0;
    setError(null);

    // If same surah is playing, just toggle
    if (currentSurah?.number === surah.number && isPlaying) {
      audio.pause();
      return;
    }

    // Stop current playback
    audio.pause();

    setCurrentSurah(surah);
    setIsLoading(true);
    setCurrentRepeatCount(0);
    setCurrentAyahIndex(0);

    // Prefer the offline cache (native APK). Fall back to streaming URL.
    (async () => {
      const cached = await getCachedAudioSrc(surah.number, currentReciter.identifier);
      const url = cached ?? getAudioUrl(surah.number, currentReciter.identifier, 0);
      console.log('[audio] playSurah', {
        surah: surah.number,
        reciter: currentReciter.identifier,
        source: cached ? 'cache' : 'network',
        url,
      });
      audio.src = url;
      audio.load();
      audio.volume = volume;
      audio.playbackRate = playbackRate;
      audio.play().catch(() => {
        handleAudioError();
      });
    })();
  }, [currentReciter, volume, playbackRate, currentSurah, isPlaying, handleAudioError]);

  const pauseAudio = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resumeAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.src) {
      audio.play().catch(() => {});
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pauseAudio();
    } else {
      resumeAudio();
    }
  }, [isPlaying, pauseAudio, resumeAudio]);

  const setReciter = useCallback((reciter: Reciter) => {
    setCurrentReciter(reciter);
    setError(null);

    if (currentSurah && audioRef.current) {
      // Reset fallback tracking
      fallbackIndexRef.current = 0;
      retryCountRef.current = 0;

      const wasPlaying = isPlaying;
      const currentPos = audioRef.current.currentTime;

      (async () => {
        const cached = await getCachedAudioSrc(currentSurah.number, reciter.identifier);
        const url = cached ?? getAudioUrl(currentSurah.number, reciter.identifier, 0);
        if (!audioRef.current) return;
        audioRef.current.src = url;
        audioRef.current.load();

        audioRef.current.addEventListener('loadedmetadata', function onLoaded() {
          if (audioRef.current) {
            const safePos = Math.min(currentPos, audioRef.current.duration || 0);
            audioRef.current.currentTime = safePos;
          }
          audioRef.current?.removeEventListener('loadedmetadata', onLoaded);
        });

        if (wasPlaying) {
          audioRef.current.play().catch(() => {});
        }
      })();
    }
  }, [currentSurah, isPlaying]);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
    if (audioRef.current) audioRef.current.volume = vol;
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, []);

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio && isFinite(time)) {
      const safeTime = Math.max(0, Math.min(time, duration || 0));
      audio.currentTime = safeTime;
      setCurrentTime(safeTime);
    }
  }, [duration]);

  const seekForward = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      const newTime = Math.min(audio.currentTime + 5, duration || 0);
      audio.currentTime = newTime;
    }
  }, [duration]);

  const seekBackward = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      const newTime = Math.max(audio.currentTime - 5, 0);
      audio.currentTime = newTime;
    }
  }, []);

  const playNext = useCallback((surahs: Surah[]) => {
    if (!currentSurah || !surahs.length) return;
    const idx = surahs.findIndex(s => s.number === currentSurah.number);
    if (idx >= 0 && idx < surahs.length - 1) {
      playSurah(surahs[idx + 1]);
    }
  }, [currentSurah, playSurah]);

  const playPrevious = useCallback((surahs: Surah[]) => {
    if (!currentSurah || !surahs.length) return;
    const idx = surahs.findIndex(s => s.number === currentSurah.number);
    if (idx > 0) {
      playSurah(surahs[idx - 1]);
    }
  }, [currentSurah, playSurah]);

  const replayCurrentAyah = useCallback(() => {
    setCurrentRepeatCount(0);
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  }, []);

  const playAyahRange = useCallback((start: number, end: number) => {
    setRepeatRange({ start, end });
    setPlayMode('repeat-range');
    setCurrentAyahIndex(start - 1);
    setCurrentRepeatCount(0);
  }, []);

  const getCurrentAyah = useCallback(() => {
    return ayahsRef.current[currentAyahIndex] || null;
  }, [currentAyahIndex]);

  const closePlayer = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = '';
    }
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentSurah(null);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
  }, []);

  return (
    <AudioContext.Provider value={{
      currentSurah, currentReciter, isPlaying, isLoading,
      currentTime, duration, volume, playbackRate,
      currentAyahIndex, playMode, repeatCount, repeatRange, listenRepeatDelay,
      error,
      playSurah, pauseAudio, resumeAudio, togglePlay,
      setReciter, setVolume, setPlaybackRate, seekTo, seekForward, seekBackward,
      playNext, playPrevious,
      setPlayMode, setRepeatCount, setRepeatRange, setListenRepeatDelay,
      replayCurrentAyah, playAyahRange,
      getCurrentAyah, setCurrentAyahIndex,
      closePlayer,
    }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio must be used within AudioProvider');
  return ctx;
}
