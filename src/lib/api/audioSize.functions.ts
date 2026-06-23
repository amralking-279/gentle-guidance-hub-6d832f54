import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { getAllAudioUrls } from '@/services/quranApi';

const remoteAudioSizeCache = new Map<string, number>();

const PROBE_TIMEOUT_MS = 2500;

function timeoutSignal(ms: number): { signal: AbortSignal; cancel: () => void } {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, cancel: () => clearTimeout(timer) };
}

async function headSize(url: string): Promise<number> {
  const t = timeoutSignal(PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: 'HEAD', signal: t.signal });
    if (!res.ok) return 0;
    const len = Number(res.headers.get('content-length') ?? 0);
    return len > 0 ? len : 0;
  } catch {
    return 0;
  } finally {
    t.cancel();
  }
}

async function rangeSize(url: string): Promise<number> {
  const t = timeoutSignal(PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-0' }, signal: t.signal });
    let total = 0;
    if (res.status === 206) {
      const cr = res.headers.get('content-range');
      const m = cr ? /\/(\d+)\s*$/.exec(cr) : null;
      if (m) total = Number.parseInt(m[1], 10);
    } else if (res.ok) {
      total = Number(res.headers.get('content-length') ?? 0);
    }
    try { await res.arrayBuffer(); } catch { /* drain */ }
    return total > 0 ? total : 0;
  } catch {
    return 0;
  } finally {
    t.cancel();
  }
}

/**
 * Race all mirrors in parallel; first non-zero size wins.
 * If HEADs all fail, fall back to a Range probe race.
 */
async function probeAudioSize(surahNumber: number, reciterIdentifier: string): Promise<number> {
  const key = `${reciterIdentifier}:${surahNumber}`;
  const cached = remoteAudioSizeCache.get(key);
  if (cached !== undefined && cached > 0) return cached;

  const urls = getAllAudioUrls(surahNumber, reciterIdentifier);
  if (urls.length === 0) return 0;

  const raceFirstPositive = (tasks: Promise<number>[]): Promise<number> =>
    new Promise(resolve => {
      let remaining = tasks.length;
      tasks.forEach(p => {
        p.then(v => {
          if (v > 0) resolve(v);
          else if (--remaining === 0) resolve(0);
        }).catch(() => {
          if (--remaining === 0) resolve(0);
        });
      });
    });

  let size = await raceFirstPositive(urls.map(u => headSize(u)));
  if (size === 0) {
    size = await raceFirstPositive(urls.map(u => rangeSize(u)));
  }
  if (size > 0) remoteAudioSizeCache.set(key, size);
  return size;
}

export const getRemoteAudioSizes = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      reciterIdentifier: z.string().min(1).max(100),
      surahNumbers: z.array(z.number().int().min(1).max(114)).min(1).max(114),
    }),
  )
  .handler(async ({ data }) => {
    const uniqueNumbers = Array.from(new Set(data.surahNumbers));
    const sizes: Record<number, number> = {};

    // Probe all surahs in parallel — each probe internally races its mirrors.
    await Promise.all(
      uniqueNumbers.map(async n => {
        sizes[n] = await probeAudioSize(n, data.reciterIdentifier);
      }),
    );

    return sizes;
  });
