import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Trash2, Check, Loader2, HardDrive, X, ChevronDown } from 'lucide-react';
import { fetchSurahs, RECITERS } from '@/services/quranApi';
import {
  isNative,
  listCachedSurahs,
  downloadSurahAudio,
  deleteCachedAudio,
  getCacheSize,
  formatBytes,
} from '@/lib/native/audioCache';
import type { Surah, Reciter } from '@/types/quran';
import { BackButton } from '@/components/ui-custom/BackButton';

type DownloadState =
  | { kind: 'idle' }
  | { kind: 'downloading'; fraction: number }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

export default function DownloadsPageClient() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [reciter, setReciter] = useState<Reciter>(RECITERS[0]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cachedSet, setCachedSet] = useState<Set<number>>(new Set());
  const [cacheSize, setCacheSize] = useState(0);
  const [states, setStates] = useState<Record<number, DownloadState>>({});
  const [query, setQuery] = useState('');
  const abortMap = useRef<Map<number, AbortController>>(new Map());

  const native = isNative();

  useEffect(() => {
    fetchSurahs().then(setSurahs).catch(() => {});
  }, []);

  const refresh = async () => {
    const [cached, size] = await Promise.all([
      listCachedSurahs(reciter.identifier),
      getCacheSize(),
    ]);
    setCachedSet(new Set(cached));
    setCacheSize(size);
  };

  useEffect(() => {
    refresh();
    // Reset transient states when reciter changes
    setStates({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reciter.identifier]);

  const handleDownload = async (surah: Surah) => {
    if (!native) {
      setStates(prev => ({
        ...prev,
        [surah.number]: {
          kind: 'error',
          message: 'التحميل للاستخدام بدون نت متاح فقط في تطبيق الموبايل (APK).',
        },
      }));
      return;
    }
    const ctrl = new AbortController();
    abortMap.current.set(surah.number, ctrl);
    setStates(prev => ({ ...prev, [surah.number]: { kind: 'downloading', fraction: 0 } }));
    try {
      await downloadSurahAudio(
        surah.number,
        reciter.identifier,
        ({ fraction }) =>
          setStates(prev => ({
            ...prev,
            [surah.number]: { kind: 'downloading', fraction },
          })),
        ctrl.signal,
      );
      setStates(prev => ({ ...prev, [surah.number]: { kind: 'done' } }));
      await refresh();
    } catch (e) {
      const msg = (e as Error).name === 'AbortError'
        ? 'تم إلغاء التحميل'
        : (e as Error).message || 'فشل التحميل';
      setStates(prev => ({ ...prev, [surah.number]: { kind: 'error', message: msg } }));
    } finally {
      abortMap.current.delete(surah.number);
    }
  };

  const handleCancel = (n: number) => {
    abortMap.current.get(n)?.abort();
  };

  const handleDelete = async (surah: Surah) => {
    await deleteCachedAudio(surah.number, reciter.identifier);
    setStates(prev => {
      const next = { ...prev };
      delete next[surah.number];
      return next;
    });
    await refresh();
  };

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return surahs;
    return surahs.filter(s =>
      s.name.includes(q) ||
      s.englishName.toLowerCase().includes(q.toLowerCase()) ||
      String(s.number).includes(q),
    );
  }, [surahs, query]);

  return (
    <div className="min-h-screen bg-[#020806] text-white pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        <BackButton />

        <header className="mb-6 mt-2">
          <h1 className="text-2xl sm:text-3xl font-bold font-cairo text-emerald-300 mb-2">
            التحميلات للاستخدام بدون نت
          </h1>
          <p className="text-gray-400 text-sm font-cairo">
            حمّل سور القرآن بصوت قارئك المفضل لتشغيلها لاحقاً بدون إنترنت.
          </p>
        </header>

        {!native && (
          <div className="mb-6 rounded-2xl border border-amber-800 bg-amber-950/40 p-4">
            <p className="text-amber-300 font-cairo text-sm leading-relaxed">
              ℹ️ التحميل للاستخدام بدون نت يعمل فقط داخل تطبيق الموبايل (APK).
              نص القرآن والأحاديث مضمّنة في التطبيق وتعمل أوفلاين مباشرة.
            </p>
          </div>
        )}

        {/* Cache summary */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-900 bg-[#06140a] p-4"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-900 border border-emerald-800 flex items-center justify-center">
            <HardDrive className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="flex-1">
            <p className="text-gray-400 text-xs font-cairo">المساحة المستخدمة</p>
            <p className="text-emerald-200 font-cairo font-bold">{formatBytes(cacheSize)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs font-cairo text-left">السور المحفوظة</p>
            <p className="text-emerald-200 font-cairo font-bold text-left">{cachedSet.size}</p>
          </div>
        </motion.div>

        {/* Reciter picker */}
        <div className="relative mb-4">
          <button
            onClick={() => setPickerOpen(p => !p)}
            className="w-full flex items-center justify-between rounded-2xl border border-emerald-900 bg-[#06140a] px-4 py-3 hover:brightness-110 transition"
          >
            <div className="text-right">
              <p className="text-gray-400 text-xs font-cairo">القارئ</p>
              <p className="text-emerald-200 font-cairo font-bold">{reciter.arabicName}</p>
            </div>
            <ChevronDown className={`w-5 h-5 text-emerald-400 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
          </button>
          {pickerOpen && (
            <div className="absolute z-20 mt-2 w-full max-h-72 overflow-y-auto rounded-2xl border border-emerald-900 bg-[#06140a] p-2 shadow-xl">
              {RECITERS.map(r => (
                <button
                  key={r.identifier}
                  onClick={() => { setReciter(r); setPickerOpen(false); }}
                  className={`w-full text-right px-3 py-2 rounded-xl font-cairo text-sm transition ${
                    r.identifier === reciter.identifier
                      ? 'bg-emerald-900 text-emerald-200 border border-emerald-700'
                      : 'text-gray-300 hover:bg-emerald-950'
                  }`}
                >
                  {r.arabicName}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="ابحث عن سورة..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full mb-4 bg-emerald-950 border border-emerald-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 font-cairo text-sm focus:outline-none focus:border-emerald-600"
        />

        {/* Surah list */}
        <div className="space-y-2">
          {filtered.map(surah => {
            const state = states[surah.number] ?? { kind: 'idle' as const };
            const isDone = state.kind === 'done' || cachedSet.has(surah.number);
            const isDownloading = state.kind === 'downloading';

            return (
              <div
                key={surah.number}
                className="flex items-center gap-3 rounded-xl border border-emerald-900 bg-[#06140a] p-3"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-300 font-bold text-sm">
                  {surah.number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate" style={{ fontFamily: 'Amiri, serif' }}>
                    {surah.name}
                  </p>
                  {isDownloading ? (
                    <div className="mt-1 h-1.5 bg-emerald-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${Math.max(2, Math.round(state.fraction * 100))}%` }}
                      />
                    </div>
                  ) : state.kind === 'error' ? (
                    <p className="text-red-400 text-xs font-cairo truncate">{state.message}</p>
                  ) : (
                    <p className="text-gray-500 text-xs font-cairo">
                      {surah.numberOfAyahs} آية · {isDone ? 'مُحمَّلة ✓' : 'غير مُحمَّلة'}
                    </p>
                  )}
                </div>

                {isDownloading ? (
                  <button
                    onClick={() => handleCancel(surah.number)}
                    className="p-2 rounded-lg bg-red-950 border border-red-900 text-red-300 hover:brightness-125"
                    title="إلغاء التحميل"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : isDone ? (
                  <button
                    onClick={() => handleDelete(surah)}
                    className="p-2 rounded-lg bg-red-950 border border-red-900 text-red-300 hover:brightness-125"
                    title="حذف من الجهاز"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleDownload(surah)}
                    disabled={!native}
                    className="p-2 rounded-lg bg-emerald-900 border border-emerald-700 text-emerald-200 hover:brightness-125 disabled:opacity-40 disabled:cursor-not-allowed"
                    title={native ? 'تحميل' : 'متاح فقط في APK'}
                  >
                    {state.kind === 'idle' ? (
                      <Download className="w-4 h-4" />
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                  </button>
                )}
                {isDone && !isDownloading && (
                  <Check className="w-4 h-4 text-emerald-400 -mr-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
