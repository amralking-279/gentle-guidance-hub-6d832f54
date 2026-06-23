
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type {
  MemorizationProgress, DailyWird, UserProgress, Achievement,
  MemorizationSession, RevisionSchedule, SurahMemorization, SurahStatus,
  DailyGoals
} from '@/types/quran';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';

interface ProgressContextType {
  // Progress data
  memorizationProgress: MemorizationProgress[];
  surahMemorizations: SurahMemorization[];
  dailyWird: DailyWird | null;
  userProgress: UserProgress;
  achievements: Achievement[];
  revisionSchedule: RevisionSchedule[];
  dailyGoals: DailyGoals;
  dailyHistory: DailyWird[];
  visibleSections: Record<string, boolean>;
  setSectionVisible: (key: string, visible: boolean) => void;
  // Surah status actions
  updateSurahStatus: (surahNumber: number, surahName: string, status: SurahStatus) => void;
  updateSurahProgress: (surahNumber: number, progress: number) => void;
  getSurahStatus: (surahNumber: number) => SurahStatus;
  getSurahsByStatus: (status: SurahStatus) => SurahMemorization[];
  // Legacy actions
  updateMemorization: (surahNumber: number, surahName: string, ayahs: number[]) => void;
  recordSession: (session: MemorizationSession) => void;
  updateWird: (data: Partial<DailyWird>) => void;
  addReadingActivity: (data: { ayahs?: number; pages?: number; minutes?: number }) => void;
  addListeningSeconds: (seconds: number) => void;
  setDailyGoals: (goals: DailyGoals) => void;
  resetProgress: () => void;
  exportProgress: () => string;
  importProgress: (json: string) => { ok: boolean; error?: string };
  checkAchievements: () => void;
  generateRevisionSchedule: () => void;
  getMemorizedSurahs: () => MemorizationProgress[];
  getNextRevision: () => RevisionSchedule | null;
  // Statistics
  getTotalProgress: () => { total: number; completed: number; percentage: number };
  getTodayReviewSurahs: () => SurahMemorization[];
}


const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_surah', title: 'أول سورة', description: 'أتممت حفظ أول سورة', icon: 'star', requirement: 1, type: 'surahs' },
  { id: 'juz_1', title: 'حفظ جزء', description: 'حفظت جزء كامل من القرآن', icon: 'book', requirement: 1, type: 'surahs' },
  { id: 'streak_7', title: 'أسبوع متواصل', description: '7 أيام متتالية', icon: 'fire', requirement: 7, type: 'streak' },
  { id: 'streak_30', title: 'شهر متواصل', description: '30 يوم متتالي', icon: 'fire', requirement: 30, type: 'streak' },
  { id: 'hours_10', title: '10 ساعات استماع', description: 'استمعت 10 ساعات', icon: 'headphones', requirement: 600, type: 'minutes' },
  { id: 'ayahs_100', title: 'مئة آية', description: 'حفظت 100 آية', icon: 'ayah', requirement: 100, type: 'ayahs' },
  { id: 'sessions_50', title: '50 جلسة', description: 'أكملت 50 جلسة حفظ', icon: 'session', requirement: 50, type: 'sessions' },
];

const ProgressContext = createContext<ProgressContextType | null>(null);

const SURAH_AYAH_COUNTS: Record<number, number> = {
  1: 7, 2: 286, 3: 200, 4: 176, 5: 120, 6: 165, 7: 206, 8: 75, 9: 129, 10: 109,
  11: 123, 12: 111, 13: 43, 14: 52, 15: 99, 16: 128, 17: 111, 18: 110, 19: 98, 20: 135,
  21: 112, 22: 78, 23: 118, 24: 64, 25: 77, 26: 227, 27: 93, 28: 88, 29: 69, 30: 60,
  31: 34, 32: 30, 33: 73, 34: 54, 35: 45, 36: 83, 37: 182, 38: 88, 39: 75, 40: 85,
  41: 54, 42: 53, 43: 89, 44: 59, 45: 37, 46: 35, 47: 38, 48: 29, 49: 18, 50: 45,
  51: 60, 52: 49, 53: 62, 54: 55, 55: 78, 56: 96, 57: 29, 58: 22, 59: 24, 60: 13,
  61: 14, 62: 11, 63: 11, 64: 18, 65: 12, 66: 12, 67: 30, 68: 52, 69: 52, 70: 44,
  71: 28, 72: 28, 73: 20, 74: 56, 75: 40, 76: 31, 77: 50, 78: 40, 79: 46, 80: 42,
  81: 29, 82: 19, 83: 36, 84: 25, 85: 22, 86: 17, 87: 19, 88: 26, 89: 30, 90: 20,
  91: 15, 92: 21, 93: 11, 94: 8, 95: 8, 96: 19, 97: 5, 98: 8, 99: 8, 100: 11,
  101: 11, 102: 8, 103: 3, 104: 9, 105: 5, 106: 4, 107: 7, 108: 3, 109: 6, 110: 3,
  111: 5, 112: 4, 113: 5, 114: 6
};

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [memorizationProgress, setMemorizationProgress] = useState<MemorizationProgress[]>([]);
  const [surahMemorizations, setSurahMemorizations] = useState<SurahMemorization[]>([]);
  const [dailyWird, setDailyWird] = useState<DailyWird | null>(null);
  const [dailyHistory, setDailyHistory] = useState<DailyWird[]>([]);
  const [dailyGoals, setDailyGoalsState] = useState<DailyGoals>({
    pagesRead: 5,
    ayahsRead: 50,
    minutesListened: 30,
    memorizationMinutes: 20,
  });
  const [userProgress, setUserProgress] = useState<UserProgress>({
    totalAyahsMemorized: 0,
    totalSurahsCompleted: 0,
    totalMinutesListened: 0,
    totalMinutesRead: 0,
    currentStreak: 0,
    longestStreak: 0,
    points: 0,
    level: 1,
    badges: [],
    lastActiveDate: new Date().toISOString().split('T')[0],
  });
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS);
  const [revisionSchedule, setRevisionSchedule] = useState<RevisionSchedule[]>([]);
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({
    heatmap: true,
    monthlyChart: true,
    weeklyBars: false,
    juzProgress: false,
    forecast: false,
    comparison: false,
    records: false,
  });
  const [hydrated, setHydrated] = useState(false);
  const listenSecondsBufferRef = useRef(0);
  const { user } = useAuth();
  const cloudSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudHydratedForUserRef = useRef<string | null>(null);


  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('quran_progress');
      if (stored) {
        const data = JSON.parse(stored);
        setMemorizationProgress(data.memorizationProgress || []);
        setSurahMemorizations(data.surahMemorizations || []);
        setUserProgress(prev => ({ ...prev, ...data.userProgress }));
        setAchievements(data.achievements || ACHIEVEMENTS);
        setRevisionSchedule(data.revisionSchedule || []);
        if (data.dailyGoals) setDailyGoalsState(data.dailyGoals);
        if (data.dailyHistory) setDailyHistory(data.dailyHistory);
        if (data.visibleSections) {
          // One-time migration: ensure Phase 2 sections start hidden until user opts in
          const migrated = { ...data.visibleSections };
          if (!data.visibleSectionsV2) {
            migrated.juzProgress = false;
            migrated.forecast = false;
            migrated.comparison = false;
            migrated.records = false;
          }
          setVisibleSections(v => ({ ...v, ...migrated }));
        }
      }
      const wird = localStorage.getItem('quran_wird');
      const today = new Date().toISOString().split('T')[0];
      if (wird) {
        const wirdData = JSON.parse(wird);
        if (wirdData.date === today) {
          setDailyWird(wirdData);
        } else {
          // Archive yesterday's wird into history
          setDailyHistory(prev => {
            const exists = prev.some(d => d.date === wirdData.date);
            const next = exists ? prev : [...prev, wirdData];
            return next.slice(-60);
          });
          initializeDailyWird(wirdData.date);
        }
      } else {
        initializeDailyWird();
      }
    } catch {}
    setHydrated(true);
  }, []);

  const initializeDailyWird = useCallback((lastDate?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const wasActiveYesterday = lastDate === yesterday;

    setDailyWird({
      date: today,
      pagesRead: 0,
      ayahsRead: 0,
      minutesListened: 0,
      memorizationMinutes: 0,
      streak: wasActiveYesterday ? userProgress.currentStreak : 0,
    });
  }, [userProgress.currentStreak]);

  const saveToStorage = useCallback(() => {
    try {
      localStorage.setItem('quran_progress', JSON.stringify({
        memorizationProgress,
        surahMemorizations,
        userProgress,
        achievements,
        revisionSchedule,
        dailyGoals,
        dailyHistory,
        visibleSections,
        visibleSectionsV2: true,
      }));
      if (dailyWird) {
        localStorage.setItem('quran_wird', JSON.stringify(dailyWird));
      }
    } catch {}
  }, [memorizationProgress, surahMemorizations, userProgress, achievements, revisionSchedule, dailyWird, dailyGoals, dailyHistory, visibleSections]);

  const setSectionVisible = useCallback((key: string, visible: boolean) => {
    setVisibleSections(prev => ({ ...prev, [key]: visible }));
  }, []);

  useEffect(() => {
    if (hydrated) saveToStorage();
  }, [hydrated, saveToStorage]);

  // ===== Cloud sync (Supabase) =====
  // 1) On sign-in: hydrate from cloud (remote wins, falls back to local if no row).
  useEffect(() => {
    if (!user) {
      cloudHydratedForUserRef.current = null;
      return;
    }
    if (cloudHydratedForUserRef.current === user.id) return;
    cloudHydratedForUserRef.current = user.id;

    let cancelled = false;
    (async () => {
      try {
        const { data: row, error } = await supabase
          .from('user_progress')
          .select('data, wird, updated_at')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          console.error('[progress] cloud load failed:', error.message);
          return;
        }
        if (row && row.data && typeof row.data === 'object') {
          const d = row.data as Record<string, unknown> & {
            memorizationProgress?: MemorizationProgress[];
            surahMemorizations?: SurahMemorization[];
            userProgress?: UserProgress;
            achievements?: Achievement[];
            revisionSchedule?: RevisionSchedule[];
            dailyGoals?: DailyGoals;
            dailyHistory?: DailyWird[];
            visibleSections?: Record<string, boolean>;
          };
          if (d.memorizationProgress) setMemorizationProgress(d.memorizationProgress);
          if (d.surahMemorizations) setSurahMemorizations(d.surahMemorizations);
          if (d.userProgress) setUserProgress(prev => ({ ...prev, ...d.userProgress }));
          if (d.achievements) setAchievements(d.achievements);
          if (d.revisionSchedule) setRevisionSchedule(d.revisionSchedule);
          if (d.dailyGoals) setDailyGoalsState(d.dailyGoals);
          if (d.dailyHistory) setDailyHistory(d.dailyHistory);
          if (d.visibleSections) setVisibleSections(v => ({ ...v, ...d.visibleSections }));
        }
        if (row && row.wird) {
          const w = row.wird as unknown as DailyWird;
          const today = new Date().toISOString().split('T')[0];
          if (w.date === today) setDailyWird(w);
        }
      } catch (e) {
        console.error('[progress] cloud load exception:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // 2) On any change while signed in: debounce-upsert to cloud.
  useEffect(() => {
    if (!hydrated || !user) return;
    if (cloudSyncTimerRef.current) clearTimeout(cloudSyncTimerRef.current);
    cloudSyncTimerRef.current = setTimeout(async () => {
      try {
        const payload = {
          user_id: user.id,
          data: {
            memorizationProgress,
            surahMemorizations,
            userProgress,
            achievements,
            revisionSchedule,
            dailyGoals,
            dailyHistory,
            visibleSections,
            visibleSectionsV2: true,
          } as never,
          wird: (dailyWird ?? null) as never,
        };
        const { error } = await supabase
          .from('user_progress')
          .upsert(payload, { onConflict: 'user_id' });
        if (error) console.error('[progress] cloud save failed:', error.message);
      } catch (e) {
        console.error('[progress] cloud save exception:', e);
      }
    }, 1500);
    return () => {
      if (cloudSyncTimerRef.current) clearTimeout(cloudSyncTimerRef.current);
    };
  }, [
    hydrated, user,
    memorizationProgress, surahMemorizations, userProgress, achievements,
    revisionSchedule, dailyGoals, dailyHistory, visibleSections, dailyWird,
  ]);



  // Update Surah Status
  const updateSurahStatus = useCallback((surahNumber: number, surahName: string, status: SurahStatus) => {
    setSurahMemorizations(prev => {
      const existing = prev.find(s => s.surahNumber === surahNumber);
      const now = Date.now();

      let updated: SurahMemorization;
      if (existing) {
        updated = {
          ...existing,
          status,
          lastReviewedAt: status === 'memorized' || status === 'completed' ? now : existing.lastReviewedAt,
          reviewCount: status === 'needs-review' ? existing.reviewCount + 1 : existing.reviewCount,
          completedAt: status === 'completed' ? now : existing.completedAt,
          progress: status === 'completed' ? 100 : existing.progress,
        };
        return prev.map(s => s.surahNumber === surahNumber ? updated : s);
      } else {
        updated = {
          surahNumber,
          surahName,
          status,
          progress: status === 'completed' ? 100 : status === 'not-started' ? 0 : 10,
          startedAt: status !== 'not-started' ? now : undefined,
          reviewCount: 0,
        };
        return [...prev, updated];
      }
    });

    // Update user progress stats
    setUserProgress(prev => {
      const totalSurahs = surahMemorizations.filter(s =>
        s.status === 'completed' || s.status === 'memorized'
      ).length + (status === 'completed' || status === 'memorized' ? 1 : 0);

      return {
        ...prev,
        totalSurahsCompleted: totalSurahs,
        points: prev.points + (status === 'completed' ? 100 : status === 'memorized' ? 50 : 10),
      };
    });
  }, [surahMemorizations]);

  // Update Surah Progress percentage
  const updateSurahProgress = useCallback((surahNumber: number, progress: number) => {
    setSurahMemorizations(prev =>
      prev.map(s =>
        s.surahNumber === surahNumber
          ? { ...s, progress: Math.min(100, Math.max(0, progress)) }
          : s
      )
    );
  }, []);

  // Get Surah Status
  const getSurahStatus = useCallback((surahNumber: number): SurahStatus => {
    const surah = surahMemorizations.find(s => s.surahNumber === surahNumber);
    return surah?.status || 'not-started';
  }, [surahMemorizations]);

  // Get Surahs by Status
  const getSurahsByStatus = useCallback((status: SurahStatus): SurahMemorization[] => {
    return surahMemorizations.filter(s => s.status === status);
  }, [surahMemorizations]);

  // Get Total Progress
  const getTotalProgress = useCallback(() => {
    const totalAyahs = Object.values(SURAH_AYAH_COUNTS).reduce((a, b) => a + b, 0);
    const completedAyahs = surahMemorizations.reduce((acc, surah) => {
      if (surah.status === 'completed') {
        return acc + (SURAH_AYAH_COUNTS[surah.surahNumber] || 0);
      } else if (surah.status === 'memorized' || surah.status === 'in-progress') {
        return acc + Math.floor((SURAH_AYAH_COUNTS[surah.surahNumber] || 0) * (surah.progress / 100));
      }
      return acc;
    }, 0);

    return {
      total: totalAyahs,
      completed: completedAyahs,
      percentage: Math.round((completedAyahs / totalAyahs) * 100),
    };
  }, [surahMemorizations]);

  // Get Today's Review Surahs
  const getTodayReviewSurahs = useCallback(() => {
    const today = new Date();
    const needsReview = surahMemorizations.filter(s =>
      s.status === 'needs-review' || s.status === 'memorized'
    );

    // Also include surahs not reviewed in 7 days
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const oldMemorized = surahMemorizations.filter(s =>
      s.status === 'completed' && s.lastReviewedAt && s.lastReviewedAt < weekAgo
    );

    return [...needsReview, ...oldMemorized].slice(0, 5);
  }, [surahMemorizations]);

  // Legacy: Update Memorization
  const updateMemorization = useCallback((surahNumber: number, surahName: string, ayahs: number[]) => {
    setMemorizationProgress(prev => {
      const existing = prev.find(p => p.surahNumber === surahNumber);
      if (existing) {
        const combined = [...existing.memorizedAyahs, ...ayahs];
        const uniqueAyahs = combined.filter((v, i, a) => a.indexOf(v) === i);
        return prev.map(p =>
          p.surahNumber === surahNumber
            ? { ...p, memorizedAyahs: uniqueAyahs, lastRevision: Date.now(), revisionCount: p.revisionCount + 1 }
            : p
        );
      }
      return prev;
    });

    setUserProgress(prev => ({
      ...prev,
      totalAyahsMemorized: prev.totalAyahsMemorized + ayahs.length,
      points: prev.points + ayahs.length * 5,
    }));
  }, []);

  const recordSession = useCallback((session: MemorizationSession) => {
    setUserProgress(prev => {
      const pointsEarned = Math.floor(session.duration / 60) * 10 + session.repetitions * 5;
      return {
        ...prev,
        points: prev.points + pointsEarned,
        totalMinutesRead: prev.totalMinutesRead + Math.floor(session.duration / 60),
      };
    });

    if (session.accuracy && session.accuracy > 80) {
      setUserProgress(prev => ({
        ...prev,
        points: prev.points + Math.floor(session.accuracy || 0),
      }));
    }
  }, []);

  const updateWird = useCallback((data: Partial<DailyWird>) => {
    setDailyWird(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      if (data.pagesRead && data.pagesRead > 0 && prev.pagesRead === 0) {
        setUserProgress(p => {
          const newStreak = p.currentStreak + 1;
          return {
            ...p,
            currentStreak: newStreak,
            longestStreak: Math.max(p.longestStreak, newStreak),
            lastActiveDate: new Date().toISOString().split('T')[0],
          };
        });
      }
      return updated;
    });
  }, []);

  // Auto-tracking helpers
  const addReadingActivity = useCallback((data: { ayahs?: number; pages?: number; minutes?: number }) => {
    setDailyWird(prev => {
      if (!prev) return null;
      const wasInactive = prev.pagesRead === 0 && prev.ayahsRead === 0 && prev.minutesListened === 0 && prev.memorizationMinutes === 0;
      const updated = {
        ...prev,
        pagesRead: prev.pagesRead + (data.pages || 0),
        ayahsRead: prev.ayahsRead + (data.ayahs || 0),
      };
      if (wasInactive && (data.pages || data.ayahs || data.minutes)) {
        setUserProgress(p => {
          const newStreak = p.currentStreak + 1;
          return {
            ...p,
            currentStreak: newStreak,
            longestStreak: Math.max(p.longestStreak, newStreak),
            lastActiveDate: new Date().toISOString().split('T')[0],
          };
        });
      }
      return updated;
    });
    if (data.minutes) {
      setUserProgress(p => ({
        ...p,
        totalMinutesRead: p.totalMinutesRead + (data.minutes || 0),
        points: p.points + Math.floor((data.minutes || 0)) * 2 + (data.ayahs || 0),
      }));
    } else if (data.ayahs) {
      setUserProgress(p => ({ ...p, points: p.points + (data.ayahs || 0) }));
    }
  }, []);

  const addListeningSeconds = useCallback((seconds: number) => {
    listenSecondsBufferRef.current += seconds;
    if (listenSecondsBufferRef.current >= 60) {
      const minutes = Math.floor(listenSecondsBufferRef.current / 60);
      listenSecondsBufferRef.current = listenSecondsBufferRef.current % 60;
      setDailyWird(prev => prev ? { ...prev, minutesListened: prev.minutesListened + minutes } : prev);
      setUserProgress(p => ({
        ...p,
        totalMinutesListened: p.totalMinutesListened + minutes,
        points: p.points + minutes * 3,
      }));
    }
  }, []);

  const setDailyGoals = useCallback((goals: DailyGoals) => {
    setDailyGoalsState(goals);
  }, []);

  const resetProgress = useCallback(() => {
    setMemorizationProgress([]);
    setSurahMemorizations([]);
    setRevisionSchedule([]);
    setAchievements(ACHIEVEMENTS);
    setDailyHistory([]);
    setUserProgress({
      totalAyahsMemorized: 0,
      totalSurahsCompleted: 0,
      totalMinutesListened: 0,
      totalMinutesRead: 0,
      currentStreak: 0,
      longestStreak: 0,
      points: 0,
      level: 1,
      badges: [],
      lastActiveDate: new Date().toISOString().split('T')[0],
    });
    const today = new Date().toISOString().split('T')[0];
    setDailyWird({ date: today, pagesRead: 0, ayahsRead: 0, minutesListened: 0, memorizationMinutes: 0, streak: 0 });
  }, []);

  const exportProgress = useCallback(() => {
    return JSON.stringify({
      memorizationProgress, surahMemorizations, userProgress, achievements,
      revisionSchedule, dailyGoals, dailyHistory, dailyWird,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }, [memorizationProgress, surahMemorizations, userProgress, achievements, revisionSchedule, dailyGoals, dailyHistory, dailyWird]);

  const importProgress = useCallback((json: string): { ok: boolean; error?: string } => {
    try {
      const data = JSON.parse(json);
      if (typeof data !== 'object' || data === null) {
        return { ok: false, error: 'صيغة غير صالحة' };
      }
      if (Array.isArray(data.memorizationProgress)) setMemorizationProgress(data.memorizationProgress);
      if (Array.isArray(data.surahMemorizations)) setSurahMemorizations(data.surahMemorizations);
      if (data.userProgress && typeof data.userProgress === 'object') {
        setUserProgress(prev => ({ ...prev, ...data.userProgress }));
      }
      if (Array.isArray(data.achievements)) setAchievements(data.achievements);
      if (Array.isArray(data.revisionSchedule)) setRevisionSchedule(data.revisionSchedule);
      if (data.dailyGoals) setDailyGoalsState(data.dailyGoals);
      if (Array.isArray(data.dailyHistory)) setDailyHistory(data.dailyHistory);
      if (data.dailyWird && data.dailyWird.date === new Date().toISOString().split('T')[0]) {
        setDailyWird(data.dailyWird);
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'ملف غير صالح' };
    }
  }, []);



  const checkAchievements = useCallback(() => {
    setAchievements(prev =>
      prev.map(achievement => {
        if (achievement.unlockedAt) return achievement;
        let unlocked = false;
        switch (achievement.type) {
          case 'ayahs':
            unlocked = userProgress.totalAyahsMemorized >= achievement.requirement;
            break;
          case 'surahs':
            unlocked = userProgress.totalSurahsCompleted >= achievement.requirement;
            break;
          case 'streak':
            unlocked = userProgress.currentStreak >= achievement.requirement;
            break;
          case 'minutes':
            unlocked = userProgress.totalMinutesListened >= achievement.requirement;
            break;
        }
        if (unlocked && !achievement.unlockedAt) {
          return { ...achievement, unlockedAt: Date.now() };
        }
        return achievement;
      })
    );
  }, [userProgress]);

  const generateRevisionSchedule = useCallback(() => {
    const today = new Date();
    const schedule: RevisionSchedule[] = [];

    // Generate 7 days of revision
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const surahsToReview = surahMemorizations
        .filter(s => s.status === 'needs-review' || s.status === 'memorized')
        .slice(i * 2, (i + 1) * 2)
        .map(s => ({
          surahNumber: s.surahNumber,
          surahName: s.surahName,
          pages: Math.ceil((SURAH_AYAH_COUNTS[s.surahNumber] || 0) / 20),
          completed: false,
        }));

      if (surahsToReview.length > 0) {
        schedule.push({
          id: dateStr,
          date: dateStr,
          surahs: surahsToReview,
          completed: false,
        });
      }
    }

    setRevisionSchedule(schedule);
  }, [surahMemorizations]);

  const getMemorizedSurahs = useCallback(() => {
    return memorizationProgress;
  }, [memorizationProgress]);

  const getNextRevision = useCallback(() => {
    return revisionSchedule.find(r => !r.completed) || null;
  }, [revisionSchedule]);

  return (
    <ProgressContext.Provider value={{
      memorizationProgress,
      surahMemorizations,
      dailyWird,
      userProgress,
      achievements,
      revisionSchedule,
      dailyGoals,
      dailyHistory,
      visibleSections,
      setSectionVisible,
      updateSurahStatus,
      updateSurahProgress,
      getSurahStatus,
      getSurahsByStatus,
      updateMemorization,
      recordSession,
      updateWird,
      addReadingActivity,
      addListeningSeconds,
      setDailyGoals,
      resetProgress,
      exportProgress,
      importProgress,
      checkAchievements,
      generateRevisionSchedule,
      getMemorizedSurahs,
      getNextRevision,
      getTotalProgress,
      getTodayReviewSurahs,
    }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
}
