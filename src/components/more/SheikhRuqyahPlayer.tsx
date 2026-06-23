import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Play, Pause, Loader2, Headphones, Rewind, FastForward, User,
  Download, Check, Trash2, X, WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getCached, saveCached, deleteCached, listCached,
} from '@/lib/audioCache';

type Sheikh = {
  id: string;
  name: string;
  url: string;
};

const SHEIKHS: Sheikh[] = [
  {
    id: 'afasy',
    name: 'مشاري راشد العفاسي',
    url: 'https://archive.org/download/al-ruqyah-al-shariah-mishary-rashid-al-afasy/Al_Ruqyah_Al_Shariah_Mishary_Rashid_Al-Afasy_%D8%A7%D9%84%D8%B1%D9%82%D9%8A%D8%A9_%D8%A7%D9%84%D8%B4%D8%B1%D8%B9%D9%8A%DB%81.mp3',
  },
  {
    id: 'muaiqly',
    name: 'ماهر المعيقلي',
    url: 'https://archive.org/download/MuaiqlyRuqyah/%D8%A7%D9%84%D8%B1%D9%82%D9%8A%D9%87%20%D8%A7%D9%84%D8%B4%D8%B1%D8%B9%D9%8A%D9%87%20-%20%D8%A7%D9%84%D8%B4%D9%8A%D8%AE%20%D9%85%D8%A7%D9%87%D8%B1%20%D8%A7%D9%84%D9%85%D8%B9%D9%8A%D9%82%D9%84%D9%8A.mp3',
  },
  {
    id: 'ajmi',
    name: 'أحمد العجمي',
    url: 'https://archive.org/download/Ar-ruqyahAs-shariahRecitationBySheikhAhmadAlAjmi/Sheikh_Ahmed_Bin_Ali_Al-Ajmy_Ruqya.mp3',
  },
  {
    id: 'abkar',
    name: 'إدريس أبكر',
    url: 'https://archive.org/download/ruqyah-shariah-idris-abkar/Ruqyah%20Shariah%20Idris%20Abkar.mp3',
  },
];

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, '0')}`;
};

const fmtMinutes = (s: number) => {
  if (!isFinite(s) || s <= 0) return '—';
  const totalMin = Math.round(s / 60);
  return `${totalMin} دقيقة`;
};

const fmtMB = (bytes: number) => {
  if (!isFinite(bytes) || bytes <= 0) return '—';
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
};

// Module-level singleton: keeps downloads alive across component mounts/unmounts
type DownloadState = {
  sheikhId: string;
  received: number;
  total: number;
  progress: number; // 0-100
  controller: AbortController;
};
const activeDownloads = new Map<string, DownloadState>();
const downloadListeners = new Set<() => void>();
const notifyDownloads = () => downloadListeners.forEach((fn) => fn());

// Cache of file sizes per sheikh id (from HEAD or download)
const fileSizes = new Map<string, number>();

export interface SheikhPlayerHandle {
  stop: () => void;
}

interface Props {
  onPlayingChange?: (playingId: string | null) => void;
  registerStop?: (fn: () => void) => void;
}

export default function SheikhRuqyahPlayer({ onPlayingChange, registerStop }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const [, forceTick] = useState(0);

  // Subscribe to module-level download state so multiple mounts stay in sync
  useEffect(() => {
    const fn = () => forceTick((n) => n + 1);
    downloadListeners.add(fn);
    return () => { downloadListeners.delete(fn); };
  }, []);

  // Hydrate sizes from module cache on mount
  useEffect(() => {
    const init: Record<string, number> = {};
    fileSizes.forEach((v, k) => { init[k] = v; });
    if (Object.keys(init).length) setSizes((prev) => ({ ...prev, ...init }));
  }, []);

  const revokeObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const stop = () => {
    const a = audioRef.current;
    if (a) {
      a.pause();
    }
    setPlayingId(null);
    revokeObjectUrl();
  };

  useEffect(() => {
    registerStop?.(stop);
  }, [registerStop]);

  useEffect(() => {
    onPlayingChange?.(playingId);
  }, [playingId, onPlayingChange]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      revokeObjectUrl();
    };
  }, []);

  useEffect(() => {
    listCached().then(async (ids) => {
      setCachedIds(new Set(ids));
      // Read durations from cached blobs so labels are accurate even before playback
      for (const id of ids) {
        try {
          const blob = await getCached(id);
          if (!blob) continue;
          fileSizes.set(id, blob.size);
          setSizes((prev) => ({ ...prev, [id]: blob.size }));
          const url = URL.createObjectURL(blob);
          const a = new Audio();
          a.preload = 'metadata';
          a.src = url;
          await new Promise<void>((resolve) => {
            const done = () => { URL.revokeObjectURL(url); resolve(); };
            a.addEventListener('loadedmetadata', () => {
              setDurations((prev) => ({ ...prev, [id]: a.duration || 0 }));
              done();
            }, { once: true });
            a.addEventListener('error', done, { once: true });
          });
        } catch { /* ignore */ }
      }
    }).catch(() => {});
  }, []);

  // Fetch file sizes via HEAD for all sheikhs that aren't cached (best-effort)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const s of SHEIKHS) {
        if (cancelled) return;
        if (fileSizes.has(s.id)) continue;
        try {
          const res = await fetch(s.url, { method: 'HEAD' });
          const len = Number(res.headers.get('content-length') || 0);
          if (len > 0) {
            fileSizes.set(s.id, len);
            if (!cancelled) setSizes((prev) => ({ ...prev, [s.id]: len }));
          }
        } catch { /* ignore */ }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleToggle = async (sheikh: Sheikh) => {
    if (playingId === sheikh.id) {
      stop();
      return;
    }
    // Switching: pause previous
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    revokeObjectUrl();
    setCurrentTime(0);
    setDuration(0);
    setLoadingId(sheikh.id);
    try {
      let src = sheikh.url;
      const cachedBlob = await getCached(sheikh.id);
      if (cachedBlob) {
        const url = URL.createObjectURL(cachedBlob);
        objectUrlRef.current = url;
        src = url;
      } else if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        toast.error('غير متاح بدون إنترنت — حمّل الملف أولاً');
        setLoadingId(null);
        return;
      }
      const audio = new Audio(src);
      audio.preload = 'none';
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration || 0);
        setDurations((prev) => ({ ...prev, [sheikh.id]: audio.duration || 0 }));
      });
      audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
      audio.addEventListener('ended', () => {
        setPlayingId(null);
        revokeObjectUrl();
      });
      audio.addEventListener('error', () => {
        setPlayingId(null);
        setLoadingId(null);
        revokeObjectUrl();
        toast.error('تعذّر تشغيل الملف');
      });
      audioRef.current = audio;
      await audio.play();
      setPlayingId(sheikh.id);
    } catch {
      setPlayingId(null);
      revokeObjectUrl();
      toast.error('تعذّر التشغيل');
    } finally {
      setLoadingId(null);
    }
  };

  const seek = (delta: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min((a.duration || 0), a.currentTime + delta));
  };

  const handleDownload = async (sheikh: Sheikh) => {
    if (activeDownloads.size > 0) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      toast.error('لا يوجد اتصال بالإنترنت');
      return;
    }
    // Warn for very large files (>60MB)
    const knownSize = fileSizes.get(sheikh.id) || 0;
    if (knownSize > 60 * 1024 * 1024) {
      const mb = Math.round(knownSize / (1024 * 1024));
      // eslint-disable-next-line no-alert
      const ok = window.confirm(`حجم الملف ~${mb} ميجا، متابعة التحميل؟`);
      if (!ok) return;
    }
    const controller = new AbortController();
    const state: DownloadState = {
      sheikhId: sheikh.id,
      received: 0,
      total: knownSize,
      progress: 0,
      controller,
    };
    activeDownloads.set(sheikh.id, state);
    notifyDownloads();
    toast.info(`بدأ تحميل ${sheikh.name} — قد يستغرق دقائق`);
    try {
      const res = await fetch(sheikh.url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error('no response body');
      const totalStr = res.headers.get('content-length');
      const total = totalStr ? Number(totalStr) : state.total;
      state.total = total;
      if (total > 0) {
        fileSizes.set(sheikh.id, total);
        setSizes((prev) => ({ ...prev, [sheikh.id]: total }));
      }
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          state.received += value.byteLength;
          state.progress = total > 0
            ? Math.min(99, Math.floor((state.received / total) * 100))
            : 0;
          notifyDownloads();
        }
      }
      const blob = new Blob(chunks as BlobPart[], { type: res.headers.get('content-type') || 'audio/mpeg' });
      await saveCached(sheikh.id, blob);
      setCachedIds((prev) => new Set(prev).add(sheikh.id));
      state.progress = 100;
      notifyDownloads();
      // Read real duration from the newly cached file
      try {
        const url = URL.createObjectURL(blob);
        const a = new Audio();
        a.preload = 'metadata';
        a.src = url;
        a.addEventListener('loadedmetadata', () => {
          setDurations((prev) => ({ ...prev, [sheikh.id]: a.duration || 0 }));
          URL.revokeObjectURL(url);
        }, { once: true });
        a.addEventListener('error', () => URL.revokeObjectURL(url), { once: true });
      } catch { /* ignore */ }
      toast.success(`تم حفظ تلاوة ${sheikh.name} للأوفلاين`);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        toast('تم إلغاء التحميل');
      } else {
        // eslint-disable-next-line no-console
        console.error('[SheikhDownload] failed', sheikh.id, err);
        toast.error('فشل التحميل، حاول لاحقاً');
      }
    } finally {
      activeDownloads.delete(sheikh.id);
      notifyDownloads();
    }
  };

  const handleCancelDownload = (id: string) => {
    activeDownloads.get(id)?.controller.abort();
  };

  const handleDelete = async (sheikh: Sheikh) => {
    if (playingId === sheikh.id) stop();
    await deleteCached(sheikh.id);
    setCachedIds((prev) => {
      const next = new Set(prev);
      next.delete(sheikh.id);
      return next;
    });
    toast.success('تم حذف الملف المحفوظ');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-5 mt-8 border border-red-900/50 bg-gradient-to-br from-red-950/40 to-red-900/10"
    >
      <div className="flex items-center gap-2 mb-1">
        <Headphones className="w-5 h-5 text-red-400" />
        <h3 className="text-white font-cairo font-bold">رقية بصوت المشايخ</h3>
      </div>
      <p className="text-red-300/70 font-cairo text-xs mb-4">
        استمع للرقية الشرعية كاملة بصوت كبار القراء
      </p>

      <div className="space-y-3">
        {SHEIKHS.map((s) => {
          const isActive = playingId === s.id;
          const isLoading = loadingId === s.id;
          const isCached = cachedIds.has(s.id);
          const dl = activeDownloads.get(s.id);
          const isDownloading = !!dl;
          const isAnyDownloading = activeDownloads.size > 0;
          const downloadProgress = dl?.progress ?? 0;
          const dlReceived = dl?.received ?? 0;
          const dlTotal = dl?.total ?? 0;
          const sizeBytes = sizes[s.id] ?? 0;
          return (
            <div
              key={s.id}
              className={`rounded-xl border p-4 transition-all ${
                isActive
                  ? 'bg-red-950/40 border-red-600/60 shadow-lg shadow-red-900/30'
                  : 'bg-red-950/20 border-red-900/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-900/50 border border-red-700/40 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-red-300" />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    {isCached && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-cairo px-1.5 py-0.5 rounded-full bg-emerald-900/40 border border-emerald-600/40 text-emerald-300">
                        <Check className="w-3 h-3" />
                        أوفلاين
                      </span>
                    )}
                    <p className="text-white font-cairo font-bold text-sm truncate">{s.name}</p>
                  </div>
                  <p className="text-red-400/70 font-cairo text-xs">
                    الرقية الشرعية كاملة
                    {durations[s.id] ? ` • ${fmtMinutes(durations[s.id])}` : ''}
                    {!isCached && !isDownloading && sizeBytes > 0 ? ` • ≈ ${fmtMB(sizeBytes)}` : ''}
                  </p>
                </div>
                {/* Download / Cached / Delete control */}
                {isDownloading ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex items-center gap-1 px-2 h-11 rounded-full bg-red-900/50 border border-red-700/50 text-red-100">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs font-bold font-cairo tabular-nums w-10 text-center">
                        {dlTotal > 0 ? `${downloadProgress}%` : '…'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCancelDownload(s.id)}
                      className="w-9 h-9 rounded-full bg-red-900/50 border border-red-700/50 text-red-200 hover:bg-red-900/80 flex items-center justify-center"
                      aria-label="إلغاء التحميل"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : isCached ? (
                  <button
                    onClick={() => handleDelete(s)}
                    className="w-11 h-11 rounded-full bg-emerald-900/30 border border-emerald-600/40 text-emerald-300 hover:bg-emerald-900/60 flex items-center justify-center shrink-0"
                    aria-label="حذف الملف المحفوظ"
                    title="حذف الملف المحفوظ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleDownload(s)}
                    disabled={isAnyDownloading}
                    className="w-11 h-11 rounded-full bg-red-900/40 border border-red-700/40 text-red-200 hover:bg-red-900/70 disabled:opacity-50 flex items-center justify-center shrink-0"
                    aria-label="تحميل للأوفلاين"
                    title="تحميل للأوفلاين"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleToggle(s)}
                  disabled={isLoading}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0 ${
                    isActive
                      ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40'
                      : 'bg-red-900/50 border border-red-700/50 text-red-200 hover:bg-red-900/80'
                  } disabled:opacity-60`}
                  aria-label={isActive ? 'إيقاف' : 'تشغيل'}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isActive ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </button>
              </div>
              {isDownloading && (
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-baseline justify-between font-cairo tabular-nums">
                    <span className="text-xs text-red-300/80">
                      {dlTotal > 0
                        ? `${fmtMB(dlReceived)} / ${fmtMB(dlTotal)}`
                        : `${fmtMB(dlReceived)} نُزّلت`}
                    </span>
                    <span className="text-lg font-bold text-red-200">
                      {dlTotal > 0 ? `${downloadProgress}%` : 'جارٍ التحميل…'}
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-red-950/60 overflow-hidden">
                    {dlTotal > 0 ? (
                      <>
                        <div
                          className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-[width] duration-150 ease-out"
                          style={{ width: `${Math.max(2, downloadProgress)}%` }}
                        />
                        <div
                          className="absolute inset-0 opacity-40 animate-shimmer"
                          style={{
                            backgroundImage:
                              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
                            backgroundSize: '200% 100%',
                          }}
                        />
                      </>
                    ) : (
                      <div
                        className="absolute inset-0 animate-shimmer"
                        style={{
                          backgroundImage:
                            'linear-gradient(90deg, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.9) 50%, rgba(239,68,68,0.2) 100%)',
                          backgroundSize: '200% 100%',
                        }}
                      />
                    )}
                  </div>
                </div>
              )}
              {!isCached && !isDownloading && (
                <p className="mt-2 text-[11px] font-cairo text-red-300/60 flex items-center gap-1 justify-end">
                  <WifiOff className="w-3 h-3" />
                  يحتاج إنترنت — أو حمّله مرة للأوفلاين
                </p>
              )}

              {isActive && (
                <div className="mt-4 space-y-2">
                  <div className="h-1.5 rounded-full bg-red-950/60 overflow-hidden">
                    <div
                      className="h-full bg-red-500 transition-all"
                      style={{
                        width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-cairo text-red-300/80">
                    <span>{fmt(currentTime)}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => seek(-10)}
                        className="w-8 h-8 rounded-full bg-red-900/40 border border-red-700/40 text-red-300 hover:bg-red-900/70 flex items-center justify-center"
                        aria-label="رجوع 10 ثواني"
                      >
                        <Rewind className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => seek(10)}
                        className="w-8 h-8 rounded-full bg-red-900/40 border border-red-700/40 text-red-300 hover:bg-red-900/70 flex items-center justify-center"
                        aria-label="تقديم 10 ثواني"
                      >
                        <FastForward className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span>{fmt(duration)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
