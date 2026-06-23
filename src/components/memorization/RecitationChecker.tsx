
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Square, RefreshCw, AlertCircle,
  Award, Target, Sparkles, BookOpen, ListOrdered
} from 'lucide-react';
import type { Ayah, RecitationResult } from '@/types/quran';
import {
  startRecognition,
  checkAndRequestPermission,
  isNative,
  type SpeechSession,
} from '@/lib/native/speechRecognition';


interface Props {
  ayahs: Ayah[];
  currentAyah: number;
  onAyahComplete: (result: RecitationResult) => void;
  onNextAyah: () => void;
  onPreviousAyah: () => void;
  onSelectAyah?: (ayahNumber: number) => void;
}

// Normalize Arabic text for comparison
function normalizeArabic(text: string): string {
  return text
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ةه]/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/\s+/g, ' ')
    .replace(/[^\u0600-\u06FF\s]/g, '')
    .trim()
    .toLowerCase();
}

// Calculate similarity between texts
function calculateSimilarity(spoken: string, correct: string): number {
  const normSpoken = normalizeArabic(spoken);
  const normCorrect = normalizeArabic(correct);

  if (normCorrect.length === 0) return 0;

  const spokenWords = normSpoken.split(' ').filter(Boolean);
  const correctWords = normCorrect.split(' ').filter(Boolean);

  let matchCount = 0;
  const matchedIndices = new Set<number>();

  for (const word of spokenWords) {
    const idx = correctWords.findIndex((w, i) => !matchedIndices.has(i) && normalizeArabic(w) === normalizeArabic(word));
    if (idx !== -1) {
      matchCount++;
      matchedIndices.add(idx);
    }
  }

  return Math.round((matchCount / Math.max(correctWords.length, 1)) * 100);
}

export default function RecitationChecker({
  ayahs,
  currentAyah,
  onAyahComplete,
  onNextAyah,
  onPreviousAyah,
  onSelectAyah,
}: Props) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<RecitationResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [fullSurahMode, setFullSurahMode] = useState(false);

  const sessionRef = useRef<SpeechSession | null>(null);
  const finalTranscriptRef = useRef<string>('');

  // Use refs to avoid stale closures
  const currentAyahRef = useRef(currentAyah);
  currentAyahRef.current = currentAyah;

  const currentAyahObj = ayahs[currentAyah - 1];
  const currentAyahObjRef = useRef(currentAyahObj);
  currentAyahObjRef.current = currentAyahObj;

  const fullSurahText = ayahs.map((a) => a.text).join(' ');
  const fullSurahModeRef = useRef(fullSurahMode);
  fullSurahModeRef.current = fullSurahMode;
  const fullSurahTextRef = useRef(fullSurahText);
  fullSurahTextRef.current = fullSurahText;

  const onAyahCompleteRef = useRef(onAyahComplete);
  onAyahCompleteRef.current = onAyahComplete;

  const analyzeRecitation = useCallback((spoken: string) => {
    const isFull = fullSurahModeRef.current;
    const ayahObj = currentAyahObjRef.current;
    const correctText = isFull ? fullSurahTextRef.current : ayahObj?.text;
    if (!correctText) return;
    const accuracy = calculateSimilarity(spoken, correctText);

    const correctWords = normalizeArabic(correctText).split(' ').filter(Boolean);
    const spokenWords = normalizeArabic(spoken).split(' ').filter(Boolean);

    const mistakes: { word: string; correct: string; position: number }[] = [];
    const missing: string[] = [];

    const spokenSet = new Set(spokenWords.map(normalizeArabic));
    correctWords.forEach((word) => {
      const normWord = normalizeArabic(word);
      if (!spokenSet.has(normWord)) {
        missing.push(word);
      }
    });

    const recitationResult: RecitationResult = {
      ayahNumber: isFull ? 0 : currentAyahRef.current,
      spokenText: spoken,
      correctText,
      accuracy,
      mistakes,
      missing,
      score: Math.max(0, accuracy - missing.length * 2),
    };

    setResult(recitationResult);
    setShowResult(true);
    onAyahCompleteRef.current(recitationResult);
  }, []);

  const analyzeRecitationRef = useRef(analyzeRecitation);
  analyzeRecitationRef.current = analyzeRecitation;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionRef.current?.abort().catch(() => {});
    };
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    setPermissionDenied(false);
    setTranscript('');
    setResult(null);
    setShowResult(false);
    finalTranscriptRef.current = '';

    const perm = await checkAndRequestPermission();
    if (perm === 'unsupported') {
      setError(isNative()
        ? 'خدمة التعرف الصوتي غير متاحة على هذا الجهاز'
        : 'متصفحك لا يدعم التعرف على الصوت');
      return;
    }
    if (perm === 'denied') {
      setPermissionDenied(true);
      setError('يرجى السماح بالوصول للميكروفون من إعدادات التطبيق');
      return;
    }

    setIsListening(true);
    try {
      sessionRef.current = await startRecognition({
        language: 'ar-SA',
        onPartial: (text) => {
          finalTranscriptRef.current = text;
          setTranscript(text);
        },
        onFinal: (text) => {
          finalTranscriptRef.current = text;
          setTranscript(text);
        },
        onError: (code, message) => {
          if (code === 'not-allowed') {
            setPermissionDenied(true);
            setError('يرجى السماح بالوصول للميكروفون');
          } else if (code === 'network') {
            setError('انقطع الاتصال بالإنترنت. على Android: نزّل حزمة اللغة العربية للعمل أوفلاين من إعدادات Google.');
          } else if (code === 'unsupported') {
            setError('خدمة التعرف الصوتي غير متاحة');
          } else if (message && message !== 'no-match') {
            setError('حدث خطأ في التعرف على الصوت');
          }
        },
        onEnd: () => {
          setIsListening(false);
          const spoken = finalTranscriptRef.current.trim();
          if (spoken) analyzeRecitationRef.current(spoken);
        },
      });
    } catch (err) {
      console.error('[recitation] start failed', err);
      setIsListening(false);
      setError('تعذّر بدء التسجيل');
    }
  }, []);

  const stopListening = useCallback(async () => {
    await sessionRef.current?.stop().catch(() => {});
    sessionRef.current = null;
    setIsListening(false);
  }, []);

  const handleRetry = useCallback(() => {
    setTranscript('');
    setResult(null);
    setShowResult(false);
    finalTranscriptRef.current = '';
    startListening();
  }, [startListening]);


  const handleNext = useCallback(() => {
    setTranscript('');
    setResult(null);
    setShowResult(false);
    finalTranscriptRef.current = '';
    onNextAyah();
  }, [onNextAyah]);

  const handlePrevious = useCallback(() => {
    setTranscript('');
    setResult(null);
    setShowResult(false);
    finalTranscriptRef.current = '';
    onPreviousAyah();
  }, [onPreviousAyah]);


  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center">
          <Mic className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-cairo font-semibold">فحص التلاوة</h3>
          <p className="text-gray-400 text-xs font-cairo">
            {fullSurahMode
              ? 'اقرأ السورة كاملة ثم اضغط إيقاف للفحص'
              : 'اقرأ الآية كاملة ثم اضغط إيقاف للفحص'}
          </p>
        </div>
        {!fullSurahMode && currentAyahObj && (
          <span className="text-emerald-400 text-sm font-cairo">
            الآية {currentAyah}
          </span>
        )}
      </div>

      {/* Mode toggle: single ayah vs. full surah */}
      {ayahs.length > 1 && (
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => {
              setFullSurahMode(false);
              setTranscript('');
              setResult(null);
              setShowResult(false);
              finalTranscriptRef.current = '';
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-cairo transition-all ${
              !fullSurahMode
                ? 'bg-emerald-700 text-white shadow'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            آية واحدة
          </button>
          <button
            onClick={() => {
              setFullSurahMode(true);
              setTranscript('');
              setResult(null);
              setShowResult(false);
              finalTranscriptRef.current = '';
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-cairo transition-all ${
              fullSurahMode
                ? 'bg-emerald-700 text-white shadow'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            السورة كاملة
          </button>
        </div>
      )}

      {/* Ayah picker */}
      {!fullSurahMode && onSelectAyah && ayahs.length > 1 && (
        <div className="flex items-center gap-2 mb-4">
          <label className="text-gray-400 text-xs font-cairo whitespace-nowrap">
            اختر الآية:
          </label>
          <select
            value={currentAyah}
            onChange={(e) => {
              setTranscript('');
              setResult(null);
              setShowResult(false);
              finalTranscriptRef.current = '';
              onSelectAyah(parseInt(e.target.value, 10));
            }}
            className="flex-1 bg-emerald-950/50 border border-emerald-800/40 text-white text-sm font-cairo rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            {ayahs.map((a, i) => (
              <option key={i} value={i + 1} className="bg-emerald-950">
                الآية {i + 1}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Text to recite */}
      {fullSurahMode ? (
        <div className="bg-emerald-950/50 rounded-xl p-4 mb-4 border border-emerald-800/30 max-h-72 overflow-y-auto">
          <p
            className="text-white text-center leading-loose"
            style={{ fontFamily: 'Amiri, serif', fontSize: '22px' }}
            dir="rtl"
          >
            {ayahs.map((a, i) => (
              <span key={i}>
                {a.text}
                <span className="inline-block mx-1 text-emerald-400 text-base align-middle">
                  ﴿{i + 1}﴾
                </span>{' '}
              </span>
            ))}
          </p>
        </div>
      ) : currentAyahObj && (
        <div className="bg-emerald-950/50 rounded-xl p-4 mb-4 border border-emerald-800/30">
          <p
            className="text-white text-center leading-relaxed"
            style={{ fontFamily: 'Amiri, serif', fontSize: '22px' }}
          >
            {currentAyahObj.text}
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-950/30 border border-red-800/30 rounded-xl p-3 mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <p className="text-red-400 text-sm font-cairo">{error}</p>
        </div>
      )}

      {permissionDenied && (
        <div className="bg-amber-950/30 border border-amber-800/30 rounded-xl p-3 mb-4">
          <p className="text-amber-400 text-sm font-cairo">
            يرجى السماح بالوصول للميكروفون من إعدادات المتصفح
          </p>
        </div>
      )}

      {/* Transcript */}
      {(transcript || isListening) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10"
        >
          <p className={`text-gray-300 font-cairo ${isListening ? 'animate-pulse' : ''}`}>
            {transcript || 'جاري الاستماع...'}
          </p>
        </motion.div>
      )}

      {/* Result */}
      <AnimatePresence>
        {showResult && result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            {/* Score */}
            <div className="flex items-center justify-center gap-4">
              <div
                className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center ${
                  result.accuracy >= 80
                    ? 'bg-emerald-900/50 border border-emerald-600/40'
                    : result.accuracy >= 60
                    ? 'bg-amber-900/50 border border-amber-600/40'
                    : 'bg-red-900/50 border border-red-600/40'
                }`}
              >
                <span
                  className={`text-3xl font-bold ${
                    result.accuracy >= 80
                      ? 'text-emerald-400'
                      : result.accuracy >= 60
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                >
                  {result.accuracy}%
                </span>
              </div>
            </div>

            {/* Message */}
            <div className="text-center">
              {result.accuracy >= 90 ? (
                <div className="flex items-center justify-center gap-2 text-emerald-400">
                  <Award className="w-5 h-5" />
                  <span className="font-cairo font-semibold">ممتاز! تلاوة صحيحة</span>
                </div>
              ) : result.accuracy >= 70 ? (
                <div className="flex items-center justify-center gap-2 text-amber-400">
                  <Target className="w-5 h-5" />
                  <span className="font-cairo font-semibold">جيد جدًا</span>
                </div>
              ) : result.accuracy >= 50 ? (
                <div className="flex items-center justify-center gap-2 text-orange-400">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-cairo font-semibold">جرب مرة أخرى</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-cairo font-semibold">يحتاج مراجعة</span>
                </div>
              )}
            </div>

            {/* Missing words */}
            {result.missing.length > 0 && (
              <div>
                <p className="text-gray-400 text-xs font-cairo mb-2">كلمات ناقصة:</p>
                <div className="flex flex-wrap gap-2">
                  {result.missing.map((word, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded-lg bg-red-900/30 text-red-400 text-sm font-cairo"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 mt-4">
        {!fullSurahMode && currentAyah > 1 && (
          <button
            onClick={handlePrevious}
            className="p-3 rounded-xl bg-white/5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-900/30 transition-all"
          >
            <RefreshCw className="w-5 h-5 rotate-180" />
          </button>
        )}

        {isListening ? (
          <button
            onClick={stopListening}
            className="flex items-center gap-2 px-6 py-3 bg-red-700 hover:bg-red-600 text-white rounded-xl font-cairo font-semibold transition-all shadow-lg"
          >
            <Square className="w-4 h-4" />
            إيقاف والفحص
          </button>
        ) : (
          <button
            onClick={startListening}
            disabled={!!result && showResult}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-cairo font-semibold transition-all shadow-lg disabled:opacity-50"
          >
            <Mic className="w-4 h-4" />
            ابدأ التلاوة
          </button>
        )}

        {showResult && (
          <>
            <button
              onClick={handleRetry}
              className="p-3 rounded-xl bg-white/5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-900/30 transition-all"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            {!fullSurahMode && (
              <button
                onClick={handleNext}
                className="p-3 rounded-xl bg-white/5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-900/30 transition-all"
              >
                <RefreshCw className="w-5 h-5 rotate-[-90deg]" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
