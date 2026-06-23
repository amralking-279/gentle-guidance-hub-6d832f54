import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Loader2,
  Volume2,
  Search,
} from "lucide-react";
import { RECITERS, getAyahAudioUrl, fetchSurahs, fetchSurahText } from "@/services/quranApi";
import type { Reciter } from "@/types/quran";
import { TAJWEED_RULES } from "@/lib/data/tajweed";
import { reviewPronunciation } from "@/lib/api/pronunciation.functions";

// Browser SpeechRecognition typing
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

type WordAnalysis = {
  expectedWord: string;
  heardWord?: string;
  correct: boolean;
  rule?: string;
  note?: string;
};

type TajweedRuleItem = {
  name: string;
  explanation: string;
  applied?: boolean;
};

type Feedback = {
  status: "excellent" | "minor" | "wrong";
  message: string;
  tip?: string;
  score: number;
  heardText?: string;
  wordAnalysis?: WordAnalysis[];
  tajweedRules?: TajweedRuleItem[];
};

export default function QuranLearningClient() {
  const [surahNumber, setSurahNumber] = useState<number>(1);
  const [ayahIndex, setAyahIndex] = useState<number>(0); // 0-based index within selected surah
  const [surahSearch, setSurahSearch] = useState("");
  const [reciter, setReciter] = useState<Reciter>(RECITERS[0]);
  const [reciterOpen, setReciterOpen] = useState(false);
  const [surahOpen, setSurahOpen] = useState(false);
  const [ayahOpen, setAyahOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tajweedOpen, setTajweedOpen] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [fullSurahMode, setFullSurahMode] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const review = useServerFn(reviewPronunciation);

  // Load all 114 surahs
  const surahsQuery = useQuery({
    queryKey: ["surahs-list"],
    queryFn: fetchSurahs,
    staleTime: 1000 * 60 * 60,
  });

  // Load ayahs for currently selected surah
  const surahDetailQuery = useQuery({
    queryKey: ["surah-text", surahNumber],
    queryFn: () => fetchSurahText(surahNumber),
    staleTime: 1000 * 60 * 60,
  });

  const surahs = surahsQuery.data ?? [];
  const surahDetail = surahDetailQuery.data;
  const currentSurah = surahs.find(s => s.number === surahNumber);
  const currentAyah = surahDetail?.ayahs[ayahIndex];
  const fullSurahText = useMemo(
    () => surahDetail?.ayahs.map(a => a.text).join(" ") ?? "",
    [surahDetail],
  );

  const filteredSurahs = useMemo(() => {
    const q = surahSearch.trim();
    if (!q) return surahs;
    return surahs.filter(
      s =>
        s.name.includes(q) ||
        s.englishName.toLowerCase().includes(q.toLowerCase()) ||
        String(s.number).includes(q),
    );
  }, [surahs, surahSearch]);

  const audioUrl = useMemo(() => {
    if (!currentAyah) return "";
    return getAyahAudioUrl(surahNumber, currentAyah.numberInSurah, reciter.identifier);
  }, [surahNumber, currentAyah, reciter]);

  useEffect(() => {
    setFeedback(null);
    setTranscript("");
    setError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [surahNumber, ayahIndex, reciter]);

  // Reset ayah index when changing surah
  useEffect(() => {
    setAyahIndex(0);
  }, [surahNumber]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate, audioUrl]);

  const togglePlay = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) {
      a.pause();
      setIsPlaying(false);
    } else {
      try {
        await a.play();
        setIsPlaying(true);
      } catch {
        setError("تعذّر تشغيل الصوت، جرّب قارئاً آخر");
      }
    }
  };

  const startRecording = () => {
    setError(null);
    setFeedback(null);
    setTranscript("");
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError("متصفحك لا يدعم التعرف على الصوت. استخدم Chrome أو Edge.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "ar-SA";
    rec.interimResults = true;
    rec.continuous = fullSurahMode;
    rec.maxAlternatives = 1;
    let finalText = "";
    rec.onresult = e => {
      finalText = "";
      for (let i = 0; i < e.results.length; i++) {
        finalText += e.results[i][0].transcript;
      }
      setTranscript(finalText);
    };
    rec.onerror = ev => {
      setError(`خطأ في الميكروفون: ${ev.error}`);
      setIsRecording(false);
    };
    rec.onend = async () => {
      setIsRecording(false);
      recRef.current = null;
      if (!finalText.trim()) {
        setError("لم نسمع شيئاً، الرجاء المحاولة مرة أخرى");
        return;
      }
      setEvaluating(true);
      try {
        if (!currentSurah || (!fullSurahMode && !currentAyah)) {
          setError("الآية غير جاهزة بعد، انتظر قليلاً ثم حاول مجدداً");
          return;
        }
        const expectedText = fullSurahMode ? fullSurahText : currentAyah!.text;
        const result = await review({
          data: {
            expected: expectedText,
            transcript: finalText,
            surahName: currentSurah.name,
            ayahNumber: fullSurahMode ? 0 : currentAyah!.numberInSurah,
          },
        });
        setFeedback(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "تعذّر تقييم النطق");
      } finally {
        setEvaluating(false);
      }
    };
    try {
      rec.start();
      recRef.current = rec;
      setIsRecording(true);
    } catch {
      setError("لم نتمكن من الوصول للميكروفون");
    }
  };

  const stopRecording = () => {
    recRef.current?.stop();
  };

  const reset = () => {
    setFeedback(null);
    setTranscript("");
    setError(null);
  };

  // Speak Arabic text using the browser's built-in speech synthesis
  const speakArabic = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setError("متصفحك لا يدعم النطق الصوتي");
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "ar-SA";
      utter.rate = 0.85;
      utter.pitch = 1;
      const voices = window.speechSynthesis.getVoices();
      const arVoice = voices.find(v => v.lang?.startsWith("ar"));
      if (arVoice) utter.voice = arVoice;
      window.speechSynthesis.speak(utter);
    } catch {
      setError("تعذّر تشغيل النطق");
    }
  };

  // Replay the current ayah audio from the selected reciter
  const replayAyah = async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      await a.play();
      setIsPlaying(true);
    } catch {
      setError("تعذّر تشغيل الآية");
    }
  };

  return (
    <div className="pt-24 pb-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-emerald-800/30 mb-4">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-cairo text-sm">
              معلّم القرآن بالذكاء الاصطناعي
            </span>
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold text-white mb-3"
            style={{ fontFamily: "Amiri, serif" }}
          >
            تعلّم تلاوة القرآن الكريم
          </h1>
          <p className="text-gray-400 font-cairo text-sm md:text-base">
            اختر قارئاً واستمع، ثم أعد التلاوة وستحصل على تقييم فوري لنطقك
          </p>
        </motion.div>

        {/* Recitation mode toggle */}
        <div className="glass-card rounded-2xl p-2 border border-emerald-900/40 mb-4 flex items-center gap-2">
          <button
            onClick={() => {
              setFullSurahMode(false);
              setFeedback(null);
              setTranscript("");
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-cairo transition-all ${
              !fullSurahMode
                ? "bg-emerald-600 text-white shadow"
                : "text-gray-300 hover:bg-emerald-900/30"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            آية واحدة
          </button>
          <button
            onClick={() => {
              setFullSurahMode(true);
              setFeedback(null);
              setTranscript("");
              setError(null);
              setAyahOpen(false);
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-cairo transition-all ${
              fullSurahMode
                ? "bg-emerald-600 text-white shadow"
                : "text-gray-300 hover:bg-emerald-900/30"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            السورة كاملة
          </button>
        </div>

        {/* Pickers */}
        <div className={`grid ${fullSurahMode ? "md:grid-cols-2" : "md:grid-cols-3"} gap-4 mb-6`}>
          {/* Surah picker */}
          <div className="relative">
            <button
              onClick={() => {
                setSurahOpen(o => !o);
                setAyahOpen(false);
                setReciterOpen(false);
              }}
              className="w-full glass-card rounded-2xl p-4 border border-emerald-900/40 hover:border-emerald-600/60 transition-all flex items-center justify-between text-right"
            >
              <div className="min-w-0">
                <p className="text-xs text-emerald-400 font-cairo mb-1">السورة</p>
                <p
                  className="text-white font-bold truncate"
                  style={{ fontFamily: "Amiri, serif" }}
                >
                  {currentSurah ? `${currentSurah.number}. ${currentSurah.name}` : "..."}
                </p>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-emerald-400 transition-transform flex-shrink-0 ${surahOpen ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence>
              {surahOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-30 mt-2 w-full rounded-2xl glass-card border border-emerald-800/40 p-2"
                >
                  <div className="relative mb-2">
                    <Search className="w-4 h-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={surahSearch}
                      onChange={e => setSurahSearch(e.target.value)}
                      placeholder="ابحث عن سورة..."
                      className="w-full bg-emerald-950/40 border border-emerald-800/40 rounded-lg px-3 py-2 pr-9 text-white text-sm font-cairo placeholder:text-gray-500 focus:outline-none focus:border-emerald-500"
                      dir="rtl"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {surahsQuery.isLoading && (
                      <p className="text-center text-gray-400 font-cairo text-sm py-4">
                        جاري التحميل...
                      </p>
                    )}
                    {filteredSurahs.map(s => (
                      <button
                        key={s.number}
                        onClick={() => {
                          setSurahNumber(s.number);
                          setSurahOpen(false);
                          setSurahSearch("");
                        }}
                        className={`w-full text-right px-3 py-2 rounded-lg transition-colors font-cairo text-sm flex items-center justify-between gap-2 ${
                          surahNumber === s.number
                            ? "bg-emerald-700/40 text-white"
                            : "text-gray-300 hover:bg-emerald-900/30"
                        }`}
                      >
                        <span>
                          {s.number}. {s.name}
                        </span>
                        <span className="text-xs text-emerald-400">
                          {s.numberOfAyahs} آية
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Ayah picker (hidden in full-surah mode) */}
          {!fullSurahMode && (
          <div className="relative">
            <button
              onClick={() => {
                setAyahOpen(o => !o);
                setSurahOpen(false);
                setReciterOpen(false);
              }}
              disabled={!surahDetail}
              className="w-full glass-card rounded-2xl p-4 border border-emerald-900/40 hover:border-emerald-600/60 transition-all flex items-center justify-between text-right disabled:opacity-50"
            >
              <div>
                <p className="text-xs text-emerald-400 font-cairo mb-1">الآية</p>
                <p className="text-white font-bold" style={{ fontFamily: "Amiri, serif" }}>
                  {currentAyah ? `آية ${currentAyah.numberInSurah}` : "..."}
                </p>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-emerald-400 transition-transform flex-shrink-0 ${ayahOpen ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence>
              {ayahOpen && surahDetail && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-30 mt-2 w-full max-h-72 overflow-y-auto rounded-2xl glass-card border border-emerald-800/40 p-2"
                >
                  {surahDetail.ayahs.map((a, idx) => (
                    <button
                      key={a.number}
                      onClick={() => {
                        setAyahIndex(idx);
                        setAyahOpen(false);
                      }}
                      className={`w-full text-right px-3 py-2 rounded-lg transition-colors font-cairo text-sm ${
                        ayahIndex === idx
                          ? "bg-emerald-700/40 text-white"
                          : "text-gray-300 hover:bg-emerald-900/30"
                      }`}
                    >
                      آية {a.numberInSurah}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          )}

          {/* Reciter picker */}
          <div className="relative">
            <button
              onClick={() => {
                setReciterOpen(o => !o);
                setSurahOpen(false);
                setAyahOpen(false);
              }}
              className="w-full glass-card rounded-2xl p-4 border border-emerald-900/40 hover:border-emerald-600/60 transition-all flex items-center justify-between text-right"
            >
              <div>
                <p className="text-xs text-emerald-400 font-cairo mb-1">القارئ</p>
                <p className="text-white font-bold" style={{ fontFamily: "Amiri, serif" }}>
                  الشيخ {reciter.arabicName}
                </p>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-emerald-400 transition-transform ${reciterOpen ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence>
              {reciterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-20 mt-2 w-full max-h-72 overflow-y-auto rounded-2xl glass-card border border-emerald-800/40 p-2"
                >
                  {RECITERS.map(r => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setReciter(r);
                        setReciterOpen(false);
                      }}
                      className={`w-full text-right px-3 py-2 rounded-lg transition-colors font-cairo text-sm ${
                        reciter.id === r.id
                          ? "bg-emerald-700/40 text-white"
                          : "text-gray-300 hover:bg-emerald-900/30"
                      }`}
                    >
                      {r.arabicName}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Ayah display */}
        <motion.div
          key={`${surahNumber}-${fullSurahMode ? "full" : ayahIndex}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`glass-card rounded-3xl p-6 md:p-10 border border-emerald-800/40 mb-6 text-center ${
            fullSurahMode ? "max-h-[60vh] overflow-y-auto" : ""
          }`}
        >
          {surahDetailQuery.isLoading || !surahDetail ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
          ) : fullSurahMode ? (
            <>
              <p
                className="text-2xl md:text-3xl text-white leading-loose"
                style={{ fontFamily: "Amiri, serif", direction: "rtl" }}
              >
                {surahDetail.ayahs.map((a, i) => (
                  <span key={a.number}>
                    {a.text}
                    <span className="mx-1 text-emerald-400 text-base align-middle">
                      ﴿{a.numberInSurah}﴾
                    </span>{" "}
                  </span>
                ))}
              </p>
              <p className="mt-4 text-emerald-400/80 font-cairo text-sm">
                سورة {currentSurah?.name} — {surahDetail.ayahs.length} آية
              </p>
            </>
          ) : !currentAyah ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
          ) : (
            <>
              <p
                className="text-3xl md:text-5xl text-white leading-loose"
                style={{ fontFamily: "Amiri, serif", direction: "rtl" }}
              >
                {currentAyah.text}
              </p>
              <p className="mt-4 text-emerald-400/80 font-cairo text-sm">
                ﴿{currentAyah.numberInSurah}﴾ سورة {currentSurah?.name}
              </p>
            </>
          )}
        </motion.div>

        {/* Audio + speed */}
        <div className="glass-card rounded-2xl p-4 border border-emerald-900/40 mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-900/50 transition-all"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>
            <div>
              <p className="text-white font-cairo text-sm">استماع لتلاوة الشيخ</p>
              <p className="text-gray-400 font-cairo text-xs">{reciter.arabicName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            {[0.75, 1, 1.25].map(rate => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={`px-3 py-1 rounded-lg text-xs font-cairo transition-colors ${
                  playbackRate === rate
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-900/30 text-gray-300 hover:bg-emerald-900/50"
                }`}
              >
                {rate}×
              </button>
            ))}
          </div>
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            preload="auto"
          />
        </div>

        {/* Record */}
        <div className="glass-card rounded-3xl p-6 md:p-8 border border-emerald-800/40 mb-6">
          <div className="text-center mb-5">
            <h3 className="text-xl text-white font-bold mb-1" style={{ fontFamily: "Amiri, serif" }}>
              جرّب التلاوة بنفسك
            </h3>
            <p className="text-gray-400 font-cairo text-sm">
              {fullSurahMode
                ? "اضغط على الميكروفون واتلُ السورة كاملة، ثم اضغط إيقاف لتقييم نطقك"
                : "اضغط على الميكروفون واتلُ الآية، ثم سيقيّم الذكاء الاصطناعي نطقك"}
            </p>
          </div>

          <div className="flex justify-center mb-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={evaluating}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center text-white shadow-2xl transition-all ${
                isRecording
                  ? "bg-gradient-to-br from-red-500 to-red-700"
                  : "bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 disabled:opacity-50"
              }`}
            >
              {isRecording ? (
                <>
                  <span className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
                  <Square className="w-8 h-8 relative" />
                </>
              ) : evaluating ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <Mic className="w-9 h-9" />
              )}
            </motion.button>
          </div>

          <p className="text-center text-sm font-cairo text-gray-400 mb-3">
            {isRecording
              ? "🔴 جاري التسجيل... اضغط للإيقاف"
              : evaluating
                ? "جاري التقييم بالذكاء الاصطناعي..."
                : "اضغط للبدء"}
          </p>

          {transcript && (
            <div className="rounded-xl bg-emerald-950/40 border border-emerald-800/30 p-4 mb-3 text-center">
              <p className="text-xs text-emerald-400 font-cairo mb-1">ما تم سماعه:</p>
              <p className="text-white text-lg" style={{ fontFamily: "Amiri, serif" }}>
                {transcript}
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-950/40 border border-red-800/40 p-3 text-center text-red-300 font-cairo text-sm flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                className={`mt-4 rounded-2xl p-5 border ${
                  feedback.status === "excellent"
                    ? "bg-emerald-950/50 border-emerald-600/50"
                    : feedback.status === "minor"
                      ? "bg-amber-950/40 border-amber-600/40"
                      : "bg-red-950/40 border-red-600/40"
                }`}
              >
                <div className="flex items-start gap-3 mb-2">
                  {feedback.status === "excellent" ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                  ) : feedback.status === "minor" ? (
                    <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 text-right">
                    <p className="text-white font-cairo font-bold mb-1">{feedback.message}</p>
                    {feedback.tip && (
                      <p className="text-gray-300 font-cairo text-sm leading-relaxed">
                        💡 {feedback.tip}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-2xl font-bold font-cairo ${
                      feedback.status === "excellent"
                        ? "text-emerald-400"
                        : feedback.status === "minor"
                          ? "text-amber-400"
                          : "text-red-400"
                    }`}
                  >
                    {feedback.score}
                  </span>
                </div>
                {feedback.heardText && (
                  <div className="mt-4 rounded-xl bg-black/30 border border-emerald-800/30 p-4 text-center">
                    <p className="text-xs text-emerald-400 font-cairo mb-2">
                      ما سمعه الذكاء الاصطناعي (بالتشكيل)
                    </p>
                    <p
                      className="text-white text-xl leading-loose"
                      style={{ fontFamily: "Amiri, serif", direction: "rtl" }}
                    >
                      {feedback.heardText}
                    </p>
                  </div>
                )}

                {feedback.wordAnalysis && feedback.wordAnalysis.length > 0 && (
                  <div className="mt-4">
                    {feedback.wordAnalysis.some(w => !w.correct) && (
                      <div className="mb-3 rounded-xl bg-amber-950/40 border border-amber-700/40 p-3 flex items-center justify-between gap-3">
                        <div className="text-right">
                          <p className="text-amber-300 font-cairo text-sm font-bold mb-0.5">
                            وُجدت أخطاء في النطق
                          </p>
                          <p className="text-gray-300 font-cairo text-xs">
                            استمع للآية الصحيحة بصوت الشيخ ثم أعد المحاولة
                          </p>
                        </div>
                        <button
                          onClick={replayAyah}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-cairo text-sm transition-colors flex-shrink-0"
                        >
                          <Play className="w-4 h-4" />
                          استمع للآية
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-emerald-400 font-cairo mb-2 text-right">
                      تحليل كل كلمة (النطق والتجويد والهمزات) — اضغط 🔊 لسماع النطق الصحيح
                    </p>
                    <div className="space-y-2">
                      {feedback.wordAnalysis.map((w, i) => (
                        <div
                          key={i}
                          className={`rounded-xl p-3 border ${
                            w.correct
                              ? "bg-emerald-950/30 border-emerald-700/40"
                              : "bg-red-950/30 border-red-700/40"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <span
                              className="text-white text-lg"
                              style={{ fontFamily: "Amiri, serif" }}
                            >
                              {w.expectedWord}
                            </span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => speakArabic(w.expectedWord)}
                                title="استمع للنطق الصحيح"
                                className="p-1.5 rounded-lg bg-emerald-700/40 hover:bg-emerald-600/60 text-emerald-200 transition-colors"
                              >
                                <Volume2 className="w-4 h-4" />
                              </button>
                              {w.correct ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                          </div>
                          {w.heardWord && (
                            <p className="text-gray-300 font-cairo text-xs text-right mb-1">
                              نُطقت:{" "}
                              <span
                                className="text-white"
                                style={{ fontFamily: "Amiri, serif" }}
                              >
                                {w.heardWord}
                              </span>
                            </p>
                          )}
                          {w.rule && (
                            <p className="text-amber-300 font-cairo text-xs text-right mb-0.5">
                              🕮 الحكم: {w.rule}
                            </p>
                          )}
                          {w.note && (
                            <p className="text-gray-300 font-cairo text-xs text-right leading-relaxed">
                              {w.note}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {feedback.tajweedRules && feedback.tajweedRules.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-emerald-400 font-cairo mb-2 text-right">
                      أحكام التجويد في هذه الآية
                    </p>
                    <div className="space-y-2">
                      {feedback.tajweedRules.map((r, i) => (
                        <div
                          key={i}
                          className="rounded-xl bg-black/30 border border-emerald-800/30 p-3"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-emerald-300 font-cairo text-sm font-bold">
                              {r.name}
                            </span>
                            {typeof r.applied === "boolean" &&
                              (r.applied ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              ))}
                          </div>
                          <p className="text-gray-300 font-cairo text-xs text-right leading-relaxed">
                            {r.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={reset}
                  className="mt-4 inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-cairo text-sm"
                >
                  <RotateCcw className="w-4 h-4" /> المحاولة مرة أخرى
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tajweed Rules */}
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-5">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <h2
              className="text-2xl font-bold text-white"
              style={{ fontFamily: "Amiri, serif" }}
            >
              أحكام التجويد
            </h2>
          </div>
          <div className="space-y-3">
            {TAJWEED_RULES.map(rule => (
              <div
                key={rule.id}
                className="glass-card rounded-2xl border border-emerald-900/40 overflow-hidden"
              >
                <button
                  onClick={() => setTajweedOpen(tajweedOpen === rule.id ? null : rule.id)}
                  className="w-full p-5 text-right flex items-center justify-between gap-3"
                >
                  <div>
                    <h3
                      className="text-lg text-emerald-400 font-bold mb-1"
                      style={{ fontFamily: "Amiri, serif" }}
                    >
                      {rule.title}
                    </h3>
                    <p className="text-gray-400 font-cairo text-xs">{rule.summary}</p>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-emerald-400 transition-transform flex-shrink-0 ${
                      tajweedOpen === rule.id ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {tajweedOpen === rule.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-5 pb-5 pt-1 border-t border-emerald-900/30"
                    >
                      <p
                        className="text-gray-200 leading-loose whitespace-pre-line text-base"
                        style={{ fontFamily: "Amiri, serif", direction: "rtl" }}
                      >
                        {rule.detail}
                      </p>
                      {rule.example && (
                        <div className="mt-3 rounded-xl bg-emerald-950/40 border border-emerald-800/30 p-3 text-center">
                          <p className="text-xs text-emerald-400 font-cairo mb-1">مثال</p>
                          <p
                            className="text-white text-lg"
                            style={{ fontFamily: "Amiri, serif" }}
                          >
                            {rule.example}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}