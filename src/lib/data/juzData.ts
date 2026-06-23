// Juz boundaries: each juz spans a range of ayahs across surahs.
// Format: { juz, start: {surah, ayah}, end: {surah, ayah} }
// Based on the standard mushaf division of the Quran into 30 juz.

export interface JuzBoundary {
  juz: number;
  start: { surah: number; ayah: number };
  end: { surah: number; ayah: number };
}

export const JUZ_BOUNDARIES: JuzBoundary[] = [
  { juz: 1, start: { surah: 1, ayah: 1 }, end: { surah: 2, ayah: 141 } },
  { juz: 2, start: { surah: 2, ayah: 142 }, end: { surah: 2, ayah: 252 } },
  { juz: 3, start: { surah: 2, ayah: 253 }, end: { surah: 3, ayah: 92 } },
  { juz: 4, start: { surah: 3, ayah: 93 }, end: { surah: 4, ayah: 23 } },
  { juz: 5, start: { surah: 4, ayah: 24 }, end: { surah: 4, ayah: 147 } },
  { juz: 6, start: { surah: 4, ayah: 148 }, end: { surah: 5, ayah: 81 } },
  { juz: 7, start: { surah: 5, ayah: 82 }, end: { surah: 6, ayah: 110 } },
  { juz: 8, start: { surah: 6, ayah: 111 }, end: { surah: 7, ayah: 87 } },
  { juz: 9, start: { surah: 7, ayah: 88 }, end: { surah: 8, ayah: 40 } },
  { juz: 10, start: { surah: 8, ayah: 41 }, end: { surah: 9, ayah: 92 } },
  { juz: 11, start: { surah: 9, ayah: 93 }, end: { surah: 11, ayah: 5 } },
  { juz: 12, start: { surah: 11, ayah: 6 }, end: { surah: 12, ayah: 52 } },
  { juz: 13, start: { surah: 12, ayah: 53 }, end: { surah: 14, ayah: 52 } },
  { juz: 14, start: { surah: 15, ayah: 1 }, end: { surah: 16, ayah: 128 } },
  { juz: 15, start: { surah: 17, ayah: 1 }, end: { surah: 18, ayah: 74 } },
  { juz: 16, start: { surah: 18, ayah: 75 }, end: { surah: 20, ayah: 135 } },
  { juz: 17, start: { surah: 21, ayah: 1 }, end: { surah: 22, ayah: 78 } },
  { juz: 18, start: { surah: 23, ayah: 1 }, end: { surah: 25, ayah: 20 } },
  { juz: 19, start: { surah: 25, ayah: 21 }, end: { surah: 27, ayah: 55 } },
  { juz: 20, start: { surah: 27, ayah: 56 }, end: { surah: 29, ayah: 45 } },
  { juz: 21, start: { surah: 29, ayah: 46 }, end: { surah: 33, ayah: 30 } },
  { juz: 22, start: { surah: 33, ayah: 31 }, end: { surah: 36, ayah: 27 } },
  { juz: 23, start: { surah: 36, ayah: 28 }, end: { surah: 39, ayah: 31 } },
  { juz: 24, start: { surah: 39, ayah: 32 }, end: { surah: 41, ayah: 46 } },
  { juz: 25, start: { surah: 41, ayah: 47 }, end: { surah: 45, ayah: 37 } },
  { juz: 26, start: { surah: 46, ayah: 1 }, end: { surah: 51, ayah: 30 } },
  { juz: 27, start: { surah: 51, ayah: 31 }, end: { surah: 57, ayah: 29 } },
  { juz: 28, start: { surah: 58, ayah: 1 }, end: { surah: 66, ayah: 12 } },
  { juz: 29, start: { surah: 67, ayah: 1 }, end: { surah: 77, ayah: 50 } },
  { juz: 30, start: { surah: 78, ayah: 1 }, end: { surah: 114, ayah: 6 } },
];

export const SURAH_AYAH_COUNTS: Record<number, number> = {
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

// Compute total ayahs in a juz
export function juzTotalAyahs(juz: number): number {
  const b = JUZ_BOUNDARIES.find(x => x.juz === juz);
  if (!b) return 0;
  let total = 0;
  for (let s = b.start.surah; s <= b.end.surah; s++) {
    const total_s = SURAH_AYAH_COUNTS[s] || 0;
    const start = s === b.start.surah ? b.start.ayah : 1;
    const end = s === b.end.surah ? b.end.ayah : total_s;
    total += Math.max(0, end - start + 1);
  }
  return total;
}

// Given memorized surahs (number → progress 0-1), compute juz completion percentage
export function computeJuzCompletion(
  memorizedFractionBySurah: Record<number, number>
): { juz: number; percentage: number; completedAyahs: number; totalAyahs: number }[] {
  return JUZ_BOUNDARIES.map(b => {
    const total = juzTotalAyahs(b.juz);
    let completed = 0;
    for (let s = b.start.surah; s <= b.end.surah; s++) {
      const total_s = SURAH_AYAH_COUNTS[s] || 0;
      const start = s === b.start.surah ? b.start.ayah : 1;
      const end = s === b.end.surah ? b.end.ayah : total_s;
      const ayahsInJuzFromSurah = Math.max(0, end - start + 1);
      const frac = memorizedFractionBySurah[s] || 0;
      // Approximation: assume memorization proportionally distributed across surah
      completed += ayahsInJuzFromSurah * frac;
    }
    return {
      juz: b.juz,
      totalAyahs: total,
      completedAyahs: Math.floor(completed),
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });
}
