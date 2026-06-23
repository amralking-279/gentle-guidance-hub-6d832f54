import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export interface RemoteVersionInfo {
  version: string;
  version_code?: number;
  apk_url: string;
  message?: string;
  changelog?: string[];
  mandatory?: boolean;
  force_update_below?: string;
  min_android_version?: number;
  released_at?: string;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  isMandatory: boolean;
  currentVersion: string;
  remote: RemoteVersionInfo | null;
}

const VERSION_URL = 'https://quran-foundation-prime.lovable.app/version.json';
const SKIP_KEY = 'noor_update_skipped_version';

function isNative(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

/** Parse a version string into numeric parts and a pre-release tag. */
function parseVersion(v: string) {
  const trimmed = v.trim();
  // Match e.g. "1.2.3-beta.4"
  const match = trimmed.match(/^(\d+(?:\.\d+)*)(?:-(.+))?$/);
  if (!match) return { parts: [0, 0, 0], pre: null as string | null };
  const parts = match[1].split('.').map((n) => parseInt(n, 10));
  const pre = match[2] || null;
  return { parts, pre };
}

/**
 * Compare two version strings using strict SemVer-like rules:
 * 1. Compare numeric parts left-to-right.
 * 2. A version with fewer parts is padded with zeros.
 * 3. A version WITHOUT a pre-release tag is always greater than one WITH a tag (e.g. 1.0.0 > 1.0.0-beta).
 * 4. Pre-release tags are compared lexicographically.
 *
 * Returns:
 *   >0  if a is newer than b
 *   <0  if a is older than b
 *    0  if identical
 */
export function compareVersions(a: string, b: string): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  const len = Math.max(va.parts.length, vb.parts.length);
  for (let i = 0; i < len; i++) {
    const x = va.parts[i] ?? 0;
    const y = vb.parts[i] ?? 0;
    if (x !== y) return x - y;
  }
  // Same numeric parts — check pre-release
  if (va.pre && !vb.pre) return -1;
  if (!va.pre && vb.pre) return 1;
  if (va.pre && vb.pre) {
    if (va.pre < vb.pre) return -1;
    if (va.pre > vb.pre) return 1;
  }
  return 0;
}

export async function getCurrentAppVersion(): Promise<string> {
  if (!isNative()) return '0.0.0';
  try {
    const info = await App.getInfo();
    return info.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export async function fetchRemoteVersion(): Promise<RemoteVersionInfo | null> {
  try {
    const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as RemoteVersionInfo;
    if (!data?.version || !data?.apk_url) return null;
    return data;
  } catch {
    return null;
  }
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const currentVersion = await getCurrentAppVersion();
  if (!isNative()) {
    return { hasUpdate: false, isMandatory: false, currentVersion, remote: null };
  }
  const remote = await fetchRemoteVersion();
  if (!remote) return { hasUpdate: false, isMandatory: false, currentVersion, remote: null };

  const hasUpdate = compareVersions(remote.version, currentVersion) > 0;

  // A remote version is mandatory if explicitly flagged OR if current version
  // is below the minimum required version.
  let isMandatory = !!remote.mandatory;
  if (remote.force_update_below) {
    isMandatory = isMandatory || compareVersions(currentVersion, remote.force_update_below) < 0;
  }

  return { hasUpdate, isMandatory, currentVersion, remote };
}

export function getSkippedVersion(): string | null {
  try { return localStorage.getItem(SKIP_KEY); } catch { return null; }
}

export function setSkippedVersion(version: string): void {
  try { localStorage.setItem(SKIP_KEY, version); } catch {}
}