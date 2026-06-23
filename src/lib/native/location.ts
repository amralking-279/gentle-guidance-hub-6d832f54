// Unified geolocation helper for web + Capacitor (native) shells.
// - Uses @capacitor/geolocation on the native app (Google Play Services / CoreLocation).
// - Falls back to navigator.geolocation on the web.
// - Caches the last successful fix in localStorage to avoid prompting on every page.
// - Exposes the permission state so the UI can render a "denied → open settings" hint.

export type LocationFix = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  source: 'native' | 'web' | 'cache';
};

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

const CACHE_KEY = 'last-location-v1';
const CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour (fresh)
const CACHE_STALE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (offline fallback)

function isOffline(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.onLine === false;
}

function readCache(): { latitude: number; longitude: number; accuracy?: number; ts: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.latitude === 'number' && typeof parsed?.longitude === 'number' && typeof parsed?.ts === 'number') {
      return parsed;
    }
  } catch {}
  return null;
}

function writeCache(lat: number, lon: number, accuracy?: number) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ latitude: lat, longitude: lon, accuracy, ts: Date.now() }));
  } catch {}
}

export function getCachedLocation(maxAgeMs = CACHE_MAX_AGE_MS): LocationFix | null {
  const c = readCache();
  if (!c) return null;
  if (Date.now() - c.ts > maxAgeMs) return null;
  return { latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy, source: 'cache' };
}

async function isNative(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function checkLocationPermission(): Promise<PermissionState> {
  if (typeof window === 'undefined') return 'unsupported';
  if (await isNative()) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const p = await Geolocation.checkPermissions();
      if (p.location === 'granted') return 'granted';
      if (p.location === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'unsupported';
    }
  }
  if (!('geolocation' in navigator)) return 'unsupported';
  if ('permissions' in navigator && navigator.permissions?.query) {
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return status.state as PermissionState;
    } catch {
      return 'prompt';
    }
  }
  return 'prompt';
}

export type GetLocationOptions = {
  /** Use cache if a fresh fix exists (default: true). */
  useCache?: boolean;
  /** Cache freshness window in ms (default: 1h). */
  maxCacheAgeMs?: number;
  /** Timeout for the live request in ms (default: 12s). */
  timeoutMs?: number;
  /** High accuracy on supported platforms (default: true). */
  highAccuracy?: boolean;
};

/**
 * Request a single location fix. On native, uses Capacitor Geolocation (which
 * shows the OS permission dialog itself). On web, uses navigator.geolocation
 * (which shows the browser's permission prompt).
 *
 * Returns null on denial / failure. The caller decides whether to show a
 * "denied → open settings" message based on `checkLocationPermission()`.
 */
export async function getLocation(opts: GetLocationOptions = {}): Promise<LocationFix | null> {
  const { useCache = true, maxCacheAgeMs = CACHE_MAX_AGE_MS, timeoutMs = 12000, highAccuracy = true } = opts;

  if (useCache) {
    const cached = getCachedLocation(maxCacheAgeMs);
    if (cached) return cached;
  }

  if (typeof window === 'undefined') return null;

  // Offline fallback to stale cache (up to 30 days) — useful when the
  // browser/Wi-Fi positioning needs the network and the user is offline.
  const staleFallback = (): LocationFix | null => {
    const stale = getCachedLocation(CACHE_STALE_MAX_AGE_MS);
    return stale ?? null;
  };

  if (await isNative()) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') return staleFallback();
      }
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: highAccuracy,
        timeout: timeoutMs,
        maximumAge: CACHE_STALE_MAX_AGE_MS,
      });
      writeCache(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        source: 'native',
      };
    } catch {
      return staleFallback();
    }
  }

  if (!('geolocation' in navigator)) return staleFallback();
  return new Promise<LocationFix | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        writeCache(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: 'web',
        });
      },
      () => {
        // On failure (often the case offline on web) fall back to any cached
        // fix we still have, even if older than the requested freshness.
        resolve(staleFallback());
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: timeoutMs,
        maximumAge: isOffline() ? CACHE_STALE_MAX_AGE_MS : maxCacheAgeMs,
      },
    );
  });
}

/**
 * Subscribe to live location updates. Web-only (Capacitor's watchPosition has
 * platform quirks we don't need for the Qibla compass — the cached fix is
 * enough since the user typically isn't moving while pointing the phone).
 */
export function watchLocation(
  onUpdate: (fix: LocationFix) => void,
  onError?: () => void,
): () => void {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    onError?.();
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => {
      writeCache(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
      onUpdate({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        source: 'web',
      });
    },
    () => onError?.(),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
  );
  return () => {
    try { navigator.geolocation.clearWatch(id); } catch {}
  };
}
