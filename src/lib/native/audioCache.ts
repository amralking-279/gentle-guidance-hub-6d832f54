/**
 * Offline audio cache for Quran recitations.
 *
 * On a Capacitor APK we store downloaded surahs on the device filesystem under
 * `Directory.Data/audio/{reciter}/{surah}.mp3` and serve them back to <audio>
 * via `Capacitor.convertFileSrc(uri)`. On the web preview we don't have access
 * to a real filesystem, so the helpers degrade gracefully: nothing is cached,
 * and the player always uses the network URL.
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { getAllAudioUrls } from '@/services/quranApi';
import { ensureStorageReady } from './storagePermissions';

const AUDIO_DIR = 'audio';

// Remote size cache, keyed by `${reciter}:${surah}` → bytes.
const remoteSizeCache = new Map<string, number>();

/**
 * Probe a remote audio file for its byte size without downloading the body.
 * Tries HEAD first, then falls back to a 1-byte Range GET (some CDNs deny
 * HEAD but always answer Range). Iterates all fallback URLs. Results are
 * memoised in-process. Returns 0 when no source reports a size.
 */
const PROBE_TIMEOUT_MS = 2500;

function linkedTimeoutSignal(outer: AbortSignal | undefined): { signal: AbortSignal; cancel: () => void } {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  if (outer) {
    if (outer.aborted) ctrl.abort();
    else outer.addEventListener('abort', onAbort, { once: true });
  }
  return {
    signal: ctrl.signal,
    cancel: () => {
      clearTimeout(timer);
      outer?.removeEventListener('abort', onAbort);
    },
  };
}

async function headSize(url: string, outer?: AbortSignal): Promise<number> {
  const t = linkedTimeoutSignal(outer);
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

async function rangeSize(url: string, outer?: AbortSignal): Promise<number> {
  const t = linkedTimeoutSignal(outer);
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-0' }, signal: t.signal });
    let total = 0;
    if (res.status === 206) {
      const cr = res.headers.get('content-range');
      const m = cr ? /\/(\d+)\s*$/.exec(cr) : null;
      if (m) total = parseInt(m[1], 10);
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

function raceFirstPositive(tasks: Promise<number>[]): Promise<number> {
  return new Promise(resolve => {
    if (tasks.length === 0) { resolve(0); return; }
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
}

/**
 * Probe a remote audio file for its byte size. Races all mirrors in parallel:
 * the first one to return a non-zero content-length wins. Falls back to a
 * Range probe race if every HEAD fails. Does NOT cache zeros so retries work.
 */
export async function fetchRemoteAudioSize(
  surahNumber: number,
  reciterIdentifier: string,
  signal?: AbortSignal,
): Promise<number> {
  const key = `${reciterIdentifier}:${surahNumber}`;
  const cached = remoteSizeCache.get(key);
  if (cached !== undefined && cached > 0) return cached;

  const urls = getAllAudioUrls(surahNumber, reciterIdentifier);
  if (urls.length === 0) return 0;

  let size = await raceFirstPositive(urls.map(u => headSize(u, signal)));
  if (size === 0 && !signal?.aborted) {
    size = await raceFirstPositive(urls.map(u => rangeSize(u, signal)));
  }
  if (size > 0) remoteSizeCache.set(key, size);
  return size;
}

/**
 * Probe sizes for many surahs in parallel (bounded concurrency).
 * `onUpdate` fires every time a new size resolves, so the UI can stream a
 * running total instead of blocking on the slowest request.
 */
export async function fetchRemoteAudioSizes(
  surahNumbers: number[],
  reciterIdentifier: string,
  onUpdate?: (surahNumber: number, size: number) => void,
  signal?: AbortSignal,
  concurrency = 24,
): Promise<Record<number, number>> {
  const out: Record<number, number> = {};
  let i = 0;
  const workers: Promise<void>[] = [];
  const next = async (): Promise<void> => {
    while (i < surahNumbers.length) {
      if (signal?.aborted) return;
      const n = surahNumbers[i++];
      try {
        const size = await fetchRemoteAudioSize(n, reciterIdentifier, signal);
        out[n] = size;
        onUpdate?.(n, size);
      } catch { /* skip */ }
    }
  };
  for (let w = 0; w < Math.min(concurrency, surahNumbers.length); w++) workers.push(next());
  await Promise.all(workers);
  return out;
}





const pad3 = (n: number) => String(n).padStart(3, '0');

/** True when running inside the Capacitor native APK (iOS/Android). */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

function relPath(surahNumber: number, reciterIdentifier: string): string {
  // Sanitize identifier for safe filesystem use.
  const id = reciterIdentifier.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${AUDIO_DIR}/${id}/${pad3(surahNumber)}.mp3`;
}

/** Return a playable <audio src=> if the surah is cached locally, else null. */
export async function getCachedAudioSrc(
  surahNumber: number,
  reciterIdentifier: string,
): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const { uri } = await Filesystem.getUri({
      path: relPath(surahNumber, reciterIdentifier),
      directory: Directory.Data,
    });
    // Confirm the file actually exists.
    await Filesystem.stat({
      path: relPath(surahNumber, reciterIdentifier),
      directory: Directory.Data,
    });
    return Capacitor.convertFileSrc(uri);
  } catch {
    return null;
  }
}

export async function isCached(
  surahNumber: number,
  reciterIdentifier: string,
): Promise<boolean> {
  if (!isNative()) return false;
  try {
    await Filesystem.stat({
      path: relPath(surahNumber, reciterIdentifier),
      directory: Directory.Data,
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteCachedAudio(
  surahNumber: number,
  reciterIdentifier: string,
): Promise<void> {
  if (!isNative()) return;
  for (const suffix of ['', '.part']) {
    try {
      await Filesystem.deleteFile({
        path: relPath(surahNumber, reciterIdentifier) + suffix,
        directory: Directory.Data,
      });
    } catch {
      // already missing
    }
  }
}

/** Total cache size in bytes for a single reciter (or all reciters). */
export async function getCacheSize(reciterIdentifier?: string): Promise<number> {
  if (!isNative()) return 0;
  try {
    const base = reciterIdentifier
      ? `${AUDIO_DIR}/${reciterIdentifier.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      : AUDIO_DIR;
    const { files } = await Filesystem.readdir({ path: base, directory: Directory.Data });
    let total = 0;
    for (const f of files) {
      if (f.type === 'file') {
        total += f.size ?? 0;
      } else {
        // Sub-folder (a reciter directory when reciterIdentifier is undefined)
        try {
          const inner = await Filesystem.readdir({
            path: `${base}/${f.name}`,
            directory: Directory.Data,
          });
          for (const g of inner.files) total += g.size ?? 0;
        } catch { /* empty */ }
      }
    }
    return total;
  } catch {
    return 0;
  }
}

export async function listCachedSurahs(reciterIdentifier: string): Promise<number[]> {
  if (!isNative()) return [];
  try {
    const id = reciterIdentifier.replace(/[^a-zA-Z0-9._-]/g, '_');
    const { files } = await Filesystem.readdir({
      path: `${AUDIO_DIR}/${id}`,
      directory: Directory.Data,
    });
    return files
      .filter(f => f.type === 'file' && /^\d{3}\.mp3$/.test(f.name))
      .map(f => parseInt(f.name.slice(0, 3), 10))
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

export type DownloadProgress = {
  bytesLoaded: number;
  bytesTotal: number; // 0 when unknown
  fraction: number; // 0..1, 0 when unknown
};

/**
 * Download a single surah for a given reciter and write it to the device.
 *
 * Supports HTTP range resume: progress is persisted to a `.part` sidecar
 * file so an aborted/interrupted download continues from the last byte on
 * the next attempt instead of restarting from zero. Iterates every known
 * fallback URL until one succeeds.
 */
export async function downloadSurahAudio(
  surahNumber: number,
  reciterIdentifier: string,
  onProgress?: (p: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!isNative()) {
    throw new Error('التحميل للاستخدام بدون نت متاح فقط على تطبيق الموبايل');
  }
  const ready = await ensureStorageReady();
  if (!ready.ok) {
    const err = new Error(ready.message);
    (err as Error & { code?: string }).code = ready.reason;
    throw err;
  }
  const urls = getAllAudioUrls(surahNumber, reciterIdentifier);
  if (urls.length === 0) throw new Error('لا يوجد رابط صوت لهذا القارئ');

  const finalPath = relPath(surahNumber, reciterIdentifier);
  const partPath = `${finalPath}.part`;

  let lastErr: unknown;
  for (const url of urls) {
    try {
      await downloadWithResume(url, partPath, onProgress, signal);
      // Atomically promote .part → final.
      try {
        await Filesystem.deleteFile({ path: finalPath, directory: Directory.Data });
      } catch { /* not present, ok */ }
      try {
        await Filesystem.rename({
          from: partPath,
          to: finalPath,
          directory: Directory.Data,
          toDirectory: Directory.Data,
        });
      } catch {
        // Some Android versions reject rename across the same directory — fall
        // back to copy+delete so the final file always lands.
        await Filesystem.copy({
          from: partPath,
          to: finalPath,
          directory: Directory.Data,
          toDirectory: Directory.Data,
        });
        try {
          await Filesystem.deleteFile({ path: partPath, directory: Directory.Data });
        } catch { /* ignore */ }
      }
      // Sanity check: confirm the final file actually exists and is non-empty.
      const finalSize = await getFileSize(finalPath);
      if (finalSize === 0) throw new Error('فشل حفظ الملف الصوتي على الجهاز');
      console.log('[audioCache] downloaded', { finalPath, bytes: finalSize });
      return;
    } catch (e) {
      // Preserve .part on abort so the user can resume later.
      if ((e as { name?: string }).name === 'AbortError') throw e;
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('فشل تحميل الملف الصوتي');
}

/** Returns the size of a file under Directory.Data, or 0 if it doesn't exist. */
async function getFileSize(path: string): Promise<number> {
  try {
    const s = await Filesystem.stat({ path, directory: Directory.Data });
    return s.size ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Fetch `url` and stream it into `partPath`, resuming from any bytes already
 * present on disk via an HTTP `Range` request. Flushes to disk in ~256 KB
 * batches to keep base64-over-bridge overhead reasonable.
 */
async function downloadWithResume(
  url: string,
  partPath: string,
  onProgress?: (p: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  let written = await getFileSize(partPath);
  const headers: Record<string, string> = {};
  if (written > 0) headers['Range'] = `bytes=${written}-`;

  const res = await fetch(url, { signal, headers });

  // Server says we already have everything → finished.
  if (res.status === 416) {
    onProgress?.({ bytesLoaded: written, bytesTotal: written, fraction: 1 });
    return;
  }
  if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status}`);

  // Resolve the absolute total size for accurate progress.
  let total = 0;
  if (res.status === 206) {
    const cr = res.headers.get('content-range'); // "bytes start-end/total"
    const m = cr ? /\/(\d+)\s*$/.exec(cr) : null;
    if (m) total = parseInt(m[1], 10);
    else total = written + Number(res.headers.get('content-length') ?? 0);
  } else {
    // Range was ignored — server is sending the whole thing again.
    total = Number(res.headers.get('content-length') ?? 0);
    if (written > 0) {
      try { await Filesystem.deleteFile({ path: partPath, directory: Directory.Data }); } catch { /* ignore */ }
      written = 0;
    }
  }

  if (!res.body) throw new Error('استجابة بدون محتوى');
  const reader = res.body.getReader();
  const FLUSH_BYTES = 256 * 1024;
  let pending: Uint8Array[] = [];
  let pendingBytes = 0;

  const flush = async () => {
    if (pendingBytes === 0) return;
    const merged = concatChunks(pending, pendingBytes);
    const b64 = bytesToBase64(merged);
    if (written === 0) {
      await Filesystem.writeFile({
        path: partPath,
        data: b64,
        directory: Directory.Data,
        recursive: true,
      });
    } else {
      await Filesystem.appendFile({
        path: partPath,
        data: b64,
        directory: Directory.Data,
      });
    }
    written += pendingBytes;
    pending = [];
    pendingBytes = 0;
    onProgress?.({
      bytesLoaded: written,
      bytesTotal: total,
      fraction: total ? written / total : 0,
    });
  };

  // Initial progress tick (so UI shows resume position immediately).
  onProgress?.({
    bytesLoaded: written,
    bytesTotal: total,
    fraction: total ? written / total : 0,
  });

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      pending.push(value);
      pendingBytes += value.byteLength;
      if (pendingBytes >= FLUSH_BYTES) {
        await flush();
      }
    }
  }
  await flush();
  onProgress?.({ bytesLoaded: written, bytesTotal: total || written, fraction: 1 });
}

function concatChunks(chunks: Uint8Array[], totalBytes: number): Uint8Array {
  const out = new Uint8Array(totalBytes);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/** Convert bytes → base64 using chunked btoa to avoid call-stack overflow. */
function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + CHUNK)),
    );
  }
  return btoa(binary);
}

/** Manually clear the partial download (used by "delete" actions). */
export async function clearPartialDownload(
  surahNumber: number,
  reciterIdentifier: string,
): Promise<void> {
  if (!isNative()) return;
  try {
    await Filesystem.deleteFile({
      path: `${relPath(surahNumber, reciterIdentifier)}.part`,
      directory: Directory.Data,
    });
  } catch { /* already gone */ }
}


export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
