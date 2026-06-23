
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Headphones, Play, Pause, Loader2, Music, Download, X, Check, CheckSquare, Square, ListChecks } from 'lucide-react';
import { useSurahs } from '@/hooks/useQuran';
import { useAudio } from '@/components/providers/AudioProvider';
import { RECITERS } from '@/services/quranApi';
import type { Surah } from '@/types/quran';
import SurahCardSkeleton from '@/components/quran/SurahCardSkeleton';
import {
  isNative,
  listCachedSurahs,
  downloadSurahAudio,
  getCacheSize,
  formatBytes,
} from '@/lib/native/audioCache';

const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toArabicNum(n: number): string {
  return String(n).split('').map(d => arabicNumerals[parseInt(d)] ?? d).join('');
}

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

const safeSurfaceClass = 'rounded-2xl border border-emerald-900 bg-[#06140a]';

// Estimated total bytes for the full Quran per reciter identifier.
// Most CDN editions are ~128 kbps MP3 (~1.1 GB total). 64 kbps fallbacks are ~550 MB.
// These are approximations shown as "≈" so the user sees a size instantly
// without probing every surah over the network.
const RECITER_TOTAL_BYTES: Record<string, number> = {
  'ar.alafasy': 1_150_000_000,
  'ar.abdulbasitmurattal': 1_150_000_000,
  'ar.mahermuaiqly': 1_150_000_000,
  'ar.saoodshuraym': 1_150_000_000,
  'ar.abdurrahmaansudais': 550_000_000,
  'ar.ahmedajamy': 1_150_000_000,
  'ar.hudhaify': 1_150_000_000,
  'ar.husary': 1_150_000_000,
  'ar.minshawi': 1_150_000_000,
  'ar.muhammadayyoub': 1_150_000_000,
  'ar.muhammadjibreel': 1_150_000_000,
  'ar.hanirifai': 1_150_000_000,
  'ar.shaatree': 1_150_000_000,
};
const DEFAULT_ESTIMATED_TOTAL_BYTES = 1_150_000_000;

type BulkState =
  | { kind: 'idle' }
  | {
      kind: 'running';
      currentSurah: number;
      currentFraction: number;
      completed: number;
      failed: number;
      total: number;
    }
  | { kind: 'done'; completed: number; failed: number; total: number };

export default function ListenPageClient() {
  const { surahs, loading } = useSurahs();
  const { playSurah, currentSurah, isPlaying, isLoading, currentReciter, setReciter } = useAudio();
  const [query, setQuery] = useState('');

  const native = isNative();
  const [cachedSet, setCachedSet] = useState<Set<number>>(new Set());
  const [cacheSize, setCacheSize] = useState(0);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulk, setBulk] = useState<BulkState>({ kind: 'idle' });
  const abortRef = useRef<AbortController | null>(null);
  // Live byte counter for the in-flight bulk download.
  const [bulkLoaded, setBulkLoaded] = useState(0);

  const refreshCache = async () => {
    if (!native) return;
    const [cached, size] = await Promise.all([
      listCachedSurahs(currentReciter.identifier),
      getCacheSize(),
    ]);
    setCachedSet(new Set(cached));
    setCacheSize(size);
  };

  useEffect(() => {
    refreshCache();
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentReciter.identifier]);


  const filtered = surahs.filter(s =>
    !query || s.name.includes(query) || s.englishName.toLowerCase().includes(query.toLowerCase())
  );

  const toggleSelect = (n: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected(prev => {
      const next = new Set(prev);
      filtered.forEach(s => next.add(s.number));
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const estimatedAllBytes =
    RECITER_TOTAL_BYTES[currentReciter.identifier] ?? DEFAULT_ESTIMATED_TOTAL_BYTES;
  const perSurahEstimate = surahs.length > 0 ? estimatedAllBytes / surahs.length : 0;
  const remainingBytes = useMemo(
    () => surahs.filter(s => !cachedSet.has(s.number)).length * perSurahEstimate,
    [surahs, cachedSet, perSurahEstimate],
  );
  const selectedBytes = useMemo(
    () => selected.size * perSurahEstimate,
    [selected, perSurahEstimate],
  );
  const sizeSummaryText = (bytes: number) => `≈ ${formatBytes(bytes)}`;

  const runBulk = async (numbers: number[]) => {
    if (!native) {
      alert('التحميل للاستخدام بدون نت متاح فقط داخل تطبيق الموبايل (APK).');
      return;
    }
    const targets = numbers.filter(n => !cachedSet.has(n));
    if (targets.length === 0) {
      alert('كل السور المحددة محفوظة بالفعل على الجهاز.');
      return;
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let completed = 0;
    let failed = 0;
    let completedBytes = 0;
    const total = targets.length;
    const totalBytes = targets.length * perSurahEstimate;
    setBulkLoaded(0);
    setBulk({ kind: 'running', currentSurah: targets[0], currentFraction: 0, completed, failed, total });

    for (const n of targets) {
      if (ctrl.signal.aborted) break;
      setBulk({ kind: 'running', currentSurah: n, currentFraction: 0, completed, failed, total });
      const currentSize = perSurahEstimate;
      try {
        await downloadSurahAudio(
          n,
          currentReciter.identifier,
          ({ fraction, bytesLoaded, bytesTotal }) => {
            // Prefer the live byte count from the stream; fall back to
            // (currentSize * fraction) when content-length is unknown.
            const liveBytes = bytesLoaded || Math.round(currentSize * fraction);
            setBulkLoaded(completedBytes + liveBytes);
            void bytesTotal;
            setBulk({ kind: 'running', currentSurah: n, currentFraction: fraction, completed, failed, total });
          },
          ctrl.signal,
        );
        completed += 1;
        completedBytes += currentSize;
        setBulkLoaded(completedBytes);
        setCachedSet(prev => {
          const next = new Set(prev);
          next.add(n);
          return next;
        });
      } catch (e) {
        if ((e as Error).name === 'AbortError') break;
        failed += 1;
      }
    }
    abortRef.current = null;
    setBulk({ kind: 'done', completed, failed, total });
    void totalBytes;
    await refreshCache();
  };

  const cancelBulk = () => abortRef.current?.abort();

  const downloadAll = () => runBulk(surahs.map(s => s.number));
  const downloadSelected = () => runBulk(Array.from(selected));

  const allCount = surahs.length;
  const remaining = surahs.filter(s => !cachedSet.has(s.number)).length;

  const bulkTotalBytes = useMemo(() => {
    if (bulk.kind !== 'running' && bulk.kind !== 'done') return 0;
    const count = surahs
      .filter(s => !cachedSet.has(s.number) || (bulk.kind === 'done' && cachedSet.has(s.number)))
      .length;
    return count * perSurahEstimate;
  }, [bulk.kind, surahs, cachedSet, perSurahEstimate]);

  const bulkProgress = useMemo(() => {
    if (bulk.kind !== 'running') return 0;
    if (bulkTotalBytes > 0) return Math.min(100, (bulkLoaded / bulkTotalBytes) * 100);
    return ((bulk.completed + bulk.currentFraction) / bulk.total) * 100;
  }, [bulk, bulkLoaded, bulkTotalBytes]);

  return (
    <div className="pt-20 pb-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-950 border border-emerald-800 mb-4" style={safeLayerStyle}>
            <Headphones className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-cairo text-sm">الاستماع</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Amiri, serif' }}>
            الاستماع للقرآن الكريم
          </h1>
          <div className="w-24 h-px bg-emerald-700 mx-auto" />
        </motion.div>

        {/* Reciter Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`${safeSurfaceClass} p-6 mb-6`}
          style={safeLayerStyle}
        >
          <h2 className="text-white font-cairo font-semibold mb-4 flex items-center gap-2">
            <Music className="w-4 h-4 text-emerald-400" />
            اختر القارئ
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {RECITERS.map(reciter => (
              <button
                key={reciter.id}
                onClick={() => setReciter(reciter)}
                className={`px-3 py-2.5 rounded-xl text-sm font-cairo transition-all duration-200 text-right ${
                  currentReciter.id === reciter.id
                    ? 'bg-emerald-900 text-emerald-300 border border-emerald-700'
                    : 'bg-gray-950 text-gray-400 border border-gray-800 hover:text-emerald-300 hover:brightness-125'
                }`}
                style={safeLayerStyle}
              >
                {reciter.arabicName}
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-emerald-900 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-gray-400 text-sm font-cairo">
              القارئ الحالي: <span className="text-emerald-400 font-semibold">{currentReciter.arabicName}</span>
            </span>
          </div>
        </motion.div>

        {/* Bulk download panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${safeSurfaceClass} p-4 mb-6`}
          style={safeLayerStyle}
        >
          {!native && (
            <p className="text-amber-300 font-cairo text-xs mb-3 leading-relaxed">
              ℹ️ التحميل للاستماع بدون نت يعمل فقط داخل تطبيق الموبايل (APK). داخل المعاينة سيظهر زر التحميل لكن لن يحفظ على الجهاز.
            </p>
          )}

          {/* Prominent total size banner — instant estimate, no probing */}
          <div
            className="mb-4 rounded-xl border border-emerald-800 bg-emerald-950/60 p-4"
            style={safeLayerStyle}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-gray-300 font-cairo text-sm">الحجم الكلي قبل التحميل</span>
              <span className="text-emerald-300 font-bold font-cairo text-2xl">
                ≈ {formatBytes(estimatedAllBytes)}
              </span>
            </div>
          </div>

          {/* Size summary */}
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-cairo text-gray-300">
            <span>
              المتبقي للتحميل:{' '}
              <span className="text-emerald-300 font-bold">
                {sizeSummaryText(remainingBytes)}
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={downloadAll}
              disabled={bulk.kind === 'running' || remaining === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-900 border border-emerald-700 text-emerald-100 font-cairo text-sm hover:brightness-125 disabled:opacity-40 disabled:cursor-not-allowed"
              style={safeLayerStyle}
            >
              <Download className="w-4 h-4" />
              تحميل كل السور ({toArabicNum(remaining)} متبقية · {sizeSummaryText(remainingBytes)})
            </button>


            <button
              onClick={() => {
                setSelectMode(p => !p);
                if (selectMode) clearSelection();
              }}
              disabled={bulk.kind === 'running'}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-cairo text-sm border transition ${
                selectMode
                  ? 'bg-emerald-950 border-emerald-600 text-emerald-200'
                  : 'bg-gray-950 border-gray-800 text-gray-300 hover:text-emerald-300'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              style={safeLayerStyle}
            >
              <ListChecks className="w-4 h-4" />
              {selectMode ? 'إنهاء التحديد' : 'تحديد سور للتحميل'}
            </button>

            {selectMode && (
              <>
                <button
                  onClick={selectAllVisible}
                  className="px-3 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-gray-300 font-cairo text-sm hover:text-emerald-300"
                  style={safeLayerStyle}
                >
                  تحديد الظاهر
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-gray-300 font-cairo text-sm hover:text-red-300"
                  style={safeLayerStyle}
                >
                  مسح التحديد
                </button>
                <button
                  onClick={downloadSelected}
                  disabled={selected.size === 0 || bulk.kind === 'running'}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-900 border border-emerald-700 text-emerald-100 font-cairo text-sm hover:brightness-125 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={safeLayerStyle}
                >
                  <Download className="w-4 h-4" />
                  تحميل المحدد ({toArabicNum(selected.size)} · {sizeSummaryText(selectedBytes)})
                </button>

              </>
            )}

            <div className="ms-auto text-xs font-cairo text-gray-400 flex items-center gap-3">
              <span>محفوظ: <span className="text-emerald-300 font-bold">{toArabicNum(cachedSet.size)}</span>/{toArabicNum(allCount)}</span>
              <span>على الجهاز: <span className="text-emerald-300 font-bold">{formatBytes(cacheSize)}</span></span>
            </div>
          </div>

          {/* Bulk progress */}
          {bulk.kind === 'running' && (
            <div className="mt-4 rounded-xl border border-emerald-800 bg-emerald-950/40 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-emerald-200 font-cairo text-sm">
                  جاري تحميل سورة {toArabicNum(bulk.currentSurah)} ({toArabicNum(bulk.completed + 1)}/{toArabicNum(bulk.total)})
                </p>
                <button
                  onClick={cancelBulk}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-950 border border-red-900 text-red-300 text-xs hover:brightness-125"
                >
                  <X className="w-3 h-3" /> إيقاف
                </button>
              </div>
              <div className="h-2 bg-emerald-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.max(2, Math.round(bulkProgress))}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-cairo">
                <span className="text-emerald-200">
                  تم تحميل{' '}
                  <span className="font-bold">{formatBytes(bulkLoaded)}</span>
                  {bulkTotalBytes > 0 && (
                    <> من <span className="font-bold">≈ {formatBytes(bulkTotalBytes)}</span></>
                  )}
                </span>
                <span className="text-gray-400">{Math.round(bulkProgress)}%</span>
              </div>
              {bulk.failed > 0 && (
                <p className="text-red-400 text-xs font-cairo mt-2">فشل: {toArabicNum(bulk.failed)}</p>
              )}
            </div>
          )}

          {bulk.kind === 'done' && (
            <div className="mt-4 rounded-xl border border-emerald-800 bg-emerald-950/40 p-3 flex items-center justify-between">
              <p className="text-emerald-200 font-cairo text-sm">
                اكتمل التحميل · نجح {toArabicNum(bulk.completed)} من {toArabicNum(bulk.total)}
                {bulk.failed > 0 && <span className="text-red-300"> · فشل {toArabicNum(bulk.failed)}</span>}
              </p>
              <button
                onClick={() => setBulk({ kind: 'idle' })}
                className="px-2 py-1 rounded-lg bg-gray-950 border border-gray-800 text-gray-300 text-xs hover:text-emerald-300"
              >
                إخفاء
              </button>
            </div>
          )}
        </motion.div>

        {/* Search */}
        <div className="relative mb-6 rounded-2xl border border-emerald-900 bg-[#06140a] p-3" style={safeLayerStyle}>
          <input
            type="text"
            placeholder="ابحث عن سورة..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-emerald-950 border border-emerald-800 rounded-2xl px-5 py-3.5 text-white placeholder-gray-600 font-cairo text-sm focus:outline-none focus:border-emerald-600 transition-colors duration-200"
            style={safeLayerStyle}
          />
        </div>

        {/* Surah Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 rounded-2xl border border-emerald-900 bg-[#06140a] p-3" style={safeLayerStyle}>
          {loading
            ? Array.from({ length: 16 }).map((_, i) => <SurahCardSkeleton key={i} />)
            : filtered.map((surah, idx) => (
                <SurahListenCard
                  key={surah.number}
                  surah={surah}
                  index={idx}
                  isCurrentlyPlaying={currentSurah?.number === surah.number && isPlaying}
                  isLoading={currentSurah?.number === surah.number && isLoading}
                  isCached={cachedSet.has(surah.number)}
                  isDownloadingNow={bulk.kind === 'running' && bulk.currentSurah === surah.number}
                  downloadFraction={bulk.kind === 'running' && bulk.currentSurah === surah.number ? bulk.currentFraction : 0}
                  selectMode={selectMode}
                  selected={selected.has(surah.number)}
                  remoteSize={perSurahEstimate}
                  onToggleSelect={() => toggleSelect(surah.number)}
                  onPlay={() => playSurah(surah)}
                />
              ))
          }
        </div>
      </div>
    </div>
  );
}

function SurahListenCard({
  surah, index, isCurrentlyPlaying, isLoading, isCached, isDownloadingNow, downloadFraction, selectMode, selected, remoteSize, onToggleSelect, onPlay,
}: {
  surah: Surah;
  index: number;
  isCurrentlyPlaying: boolean;
  isLoading: boolean;
  isCached: boolean;
  isDownloadingNow: boolean;
  downloadFraction: number;
  selectMode: boolean;
  selected: boolean;
  remoteSize: number;
  onToggleSelect: () => void;
  onPlay: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.5) }}
    >
      <button
        onClick={selectMode ? onToggleSelect : onPlay}
        className={`w-full rounded-2xl p-4 bg-emerald-950 border transition-colors duration-200 hover:brightness-125 text-right group ${
          selected ? 'border-emerald-500' : isCurrentlyPlaying ? 'border-emerald-600' : 'border-emerald-800'
        }`}
        style={safeLayerStyle}
      >
        <div className="flex items-center gap-3">
          {/* Left icon: select checkbox OR play */}
          {selectMode ? (
            <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border ${
              selected ? 'bg-emerald-800 border-emerald-600 text-white' : 'bg-emerald-900 border-emerald-800 text-emerald-400'
            }`} style={safeLayerStyle}>
              {selected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
            </div>
          ) : (
            <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
              isCurrentlyPlaying
                ? 'bg-emerald-800 border border-emerald-700'
                : 'bg-emerald-900 border border-emerald-800 group-hover:brightness-125'
            }`} style={safeLayerStyle}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              ) : isCurrentlyPlaying ? (
                <Pause className="w-4 h-4 text-white" />
              ) : (
                <Play className="w-4 h-4 text-emerald-400 mr-[-2px]" />
              )}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-bold truncate" style={{ fontFamily: 'Amiri, serif' }}>
              {surah.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-gray-500 text-xs font-cairo">{toArabicNum(surah.numberOfAyahs)} آية</span>
              {remoteSize > 0 && (
                <span className="text-gray-500 text-xs font-cairo">· {formatBytes(remoteSize)}</span>
              )}
              {isCached && !isDownloadingNow && (
                <span className="inline-flex items-center gap-0.5 text-emerald-400 text-xs font-cairo">
                  <Check className="w-3 h-3" /> محفوظة
                </span>
              )}
              {isCurrentlyPlaying && (
                <div className="flex gap-0.5 items-end h-3">
                  {[1, 2, 3].map(i => (
                    <motion.div
                      key={i}
                      className="w-0.5 bg-emerald-400 rounded-full"
                      animate={{ height: ['30%', '100%', '30%'] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              )}
            </div>
            {isDownloadingNow && (
              <div className="mt-1.5 h-1 bg-emerald-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.max(2, Math.round(downloadFraction * 100))}%` }}
                />
              </div>
            )}
          </div>

          <span className="text-emerald-800 text-xs font-cairo flex-shrink-0">
            {toArabicNum(surah.number)}
          </span>
        </div>
      </button>
    </motion.div>
  );
}
