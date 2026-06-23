/**
 * Storage readiness check for the offline audio cache.
 *
 * `Directory.Data` (app-internal sandbox) does NOT require Android/iOS
 * runtime permissions, but the @capacitor/filesystem plugin exposes
 * `checkPermissions` / `requestPermissions` anyway. We call them defensively
 * so we surface a clear Arabic error if a future plugin update, OEM ROM, or
 * filesystem failure (full disk, missing dir) blocks writes.
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

export type StorageReadyResult =
  | { ok: true }
  | { ok: false; reason: 'permission_denied' | 'no_space' | 'unknown'; message: string };

const PROBE_PATH = '__probe.tmp';
// "ok" in base64 — tiny payload just to verify we can write.
const PROBE_DATA = 'b2s=';

export async function ensureStorageReady(): Promise<StorageReadyResult> {
  if (!Capacitor.isNativePlatform()) {
    return { ok: true };
  }

  // 1) Permission check (no-op on most platforms, but future-proof).
  try {
    const status = await Filesystem.checkPermissions();
    const value = (status as { publicStorage?: string }).publicStorage;
    if (value === 'denied') {
      const requested = await Filesystem.requestPermissions();
      const newValue = (requested as { publicStorage?: string }).publicStorage;
      if (newValue === 'denied') {
        return {
          ok: false,
          reason: 'permission_denied',
          message: 'تم رفض صلاحية التخزين. فعّلها من إعدادات التطبيق ثم حاول مجدداً.',
        };
      }
    }
  } catch {
    // Plugin may not implement permissions on this platform — that's fine,
    // Directory.Data doesn't require them. Continue to the probe.
  }

  // 2) Write probe — catches "no space left", read-only FS, etc.
  try {
    await Filesystem.writeFile({
      path: PROBE_PATH,
      data: PROBE_DATA,
      directory: Directory.Data,
      recursive: true,
    });
    try {
      await Filesystem.deleteFile({ path: PROBE_PATH, directory: Directory.Data });
    } catch {
      /* ignore cleanup failure */
    }
    return { ok: true };
  } catch (e) {
    const msg = (e as Error)?.message?.toLowerCase() ?? '';
    if (msg.includes('space') || msg.includes('enospc') || msg.includes('no space')) {
      return {
        ok: false,
        reason: 'no_space',
        message: 'لا توجد مساحة كافية على الجهاز لتحميل الملف.',
      };
    }
    return {
      ok: false,
      reason: 'unknown',
      message: 'تعذّر الوصول لمساحة التخزين على الجهاز.',
    };
  }
}
