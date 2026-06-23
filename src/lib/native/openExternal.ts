import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';

/** Official WhatsApp channel URL used across the app. */
export const WHATSAPP_CHANNEL_URL =
  'https://whatsapp.com/channel/0029VbCNNuEDuMRaEJn1Rw06';

/**
 * Normalize an http(s) URL:
 *  - trim whitespace
 *  - upgrade `http:` → `https:` (Android blocks cleartext by default, and
 *    every site we link to supports TLS)
 *  - strip a leading `www.` on known hosts that 302 to the apex domain
 *    anyway (e.g. `www.whatsapp.com` → `whatsapp.com`), so the deeplink
 *    matches WhatsApp's Android App Link intent filter
 *  - lowercase the hostname
 *  - drop a trailing slash on the pathname (but not on the root "/")
 */
function normalizeUrl(parsed: URL): URL {
  if (parsed.protocol === 'http:') parsed.protocol = 'https:';
  parsed.hostname = parsed.hostname.toLowerCase();
  const stripWwwHosts = new Set(['www.whatsapp.com']);
  if (stripWwwHosts.has(parsed.hostname)) {
    parsed.hostname = parsed.hostname.replace(/^www\./, '');
  }
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  }
  return parsed;
}

/**
 * Validate that a URL is a safe, well-formed http(s) URL we are willing to open.
 * Returns the normalized href, or null if invalid.
 */
function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      console.warn('[openExternalUrl] Rejected non-http(s) URL:', trimmed);
      return null;
    }
    const normalized = normalizeUrl(parsed).toString();
    if (normalized !== trimmed) {
      console.info('[openExternalUrl] Normalized URL:', trimmed, '→', normalized);
    }
    return normalized;
  } catch {
    console.warn('[openExternalUrl] Rejected malformed URL:', trimmed);
    return null;
  }
}

/**
 * Build an Android `intent://` URL that hands the request to the WhatsApp
 * app if it is installed, and falls back to the system browser otherwise.
 * Without this, `whatsapp.com` returns `X-Frame-Options: DENY` and shows
 * `ERR_BLOCKED_BY_RESPONSE` inside any embedded webview / custom tab.
 */
function buildWhatsAppIntentUrl(httpsUrl: string): string | null {
  try {
    const parsed = new URL(httpsUrl);
    if (parsed.hostname !== 'whatsapp.com') {
      return null;
    }
    const pathAndQuery = parsed.pathname + parsed.search + parsed.hash;
    // S.browser_fallback_url lets Android open the system browser when
    // WhatsApp is not installed.  We encode the raw https URL so the
    // browser receives the exact same normalized link.
    const fallback = encodeURIComponent(httpsUrl);
    return (
      `intent://${parsed.hostname}${pathAndQuery}` +
      `#Intent;scheme=https;package=com.whatsapp;` +
      `S.browser_fallback_url=${fallback};end`
    );
  } catch {
    return null;
  }
}

/**
 * Build a generic Android browser intent URL (no specific package).
 * This forces Android to resolve the URL with the user's default browser
 * app instead of an embedded WebView / Chrome Custom Tab.
 */
function buildBrowserIntentUrl(httpsUrl: string): string {
  try {
    const parsed = new URL(httpsUrl);
    const pathAndQuery = parsed.pathname + parsed.search + parsed.hash;
    return (
      `intent://${parsed.hostname}${pathAndQuery}` +
      `#Intent;scheme=https;action=android.intent.action.VIEW;end`
    );
  } catch {
    // If parsing fails, fall back to a simple intent with the full URL.
    return `intent://open?url=${encodeURIComponent(httpsUrl)}` +
           `#Intent;scheme=https;action=android.intent.action.VIEW;end`;
  }
}

/**
 * Robustly open an external URL from either web or a Capacitor WebView.
 *
 * On Android (native):
 *   1) For WhatsApp links, dispatch a real Android `intent://` URL so the
 *      OS hands the deeplink to the installed WhatsApp app, or falls back
 *      to the user's default system browser via `browser_fallback_url`.
 *      This avoids `ERR_BLOCKED_BY_RESPONSE` you get from
 *      `www.whatsapp.com` inside Chrome Custom Tabs / WebView.
 *   2) For everything else, use AppLauncher (system handler).
 *   3) Last resort: never the in-app `Browser` for whatsapp.com — only for
 *      sites that are safe to render embedded.
 *
 * On the web: open a new tab, falling back to top-level navigation.
 */
export async function openExternalUrl(url: string): Promise<boolean> {
  const safeUrl = sanitizeUrl(url);
  if (!safeUrl) return false;

  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  const isWhatsApp = /(^|\.)whatsapp\.com$/i.test(new URL(safeUrl).hostname);

  console.info(
    `[openExternalUrl] Opening (${isNative ? 'native:' + platform : 'web'}, whatsapp=${isWhatsApp}):`,
    safeUrl,
  );

  if (isNative) {
    // --- Android WhatsApp links: force external browser, never the WebView ---
    if (isWhatsApp && platform === 'android') {
      // 1) Try WhatsApp-specific intent (opens app if installed, or falls
      //    back to browser via S.browser_fallback_url).
      const intentUrl = buildWhatsAppIntentUrl(safeUrl);
      if (intentUrl) {
        try {
          const { completed } = await AppLauncher.openUrl({ url: intentUrl });
          if (completed) return true;
          console.warn('[openExternalUrl] WhatsApp intent did not complete, trying browser fallback');
        } catch (err) {
          console.warn('[openExternalUrl] WhatsApp intent failed:', err);
        }
      }

      // 2) Explicit browser intent — forces Android to open the default
      //    system browser app directly (never the WebView).
      const browserIntent = buildBrowserIntentUrl(safeUrl);
      try {
        const { completed } = await AppLauncher.openUrl({ url: browserIntent });
        if (completed) return true;
        console.warn('[openExternalUrl] Browser intent did not complete');
      } catch (err) {
        console.warn('[openExternalUrl] Browser intent failed:', err);
      }

      // 3) Generic system handler.  ACTION_VIEW usually returns no result,
      //    so `completed` is often false even on success — treat "no throw"
      //    as "dispatched" so we don't accidentally navigate the WebView.
      try {
        await AppLauncher.openUrl({ url: safeUrl });
        return true;
      } catch (err) {
        console.warn('[openExternalUrl] Generic AppLauncher failed:', err);
      }

      // 4) Do NOT fall through to window.open / location.href for WhatsApp
      //    on Android — that loads the link inside the WebView and triggers
      //    ERR_BLOCKED_BY_RESPONSE.
      console.error(
        '[openExternalUrl] Could not open WhatsApp link in an external app/browser.',
      );
      return false;
    }

    // --- Non-WhatsApp or non-Android ---
    // Generic system handler (browser / matching app).
    try {
      const { completed } = await AppLauncher.openUrl({ url: safeUrl });
      if (completed) return true;
      console.warn('[openExternalUrl] AppLauncher did not complete');
    } catch (err) {
      console.warn('[openExternalUrl] AppLauncher.openUrl failed:', err);
    }

    // In-app browser fallback — but NOT for WhatsApp (it gets blocked).
    if (!isWhatsApp) {
      try {
        await Browser.open({ url: safeUrl, presentationStyle: 'popover' });
        return true;
      } catch (err) {
        console.warn('[openExternalUrl] Capacitor Browser.open failed:', err);
      }
    }
  }

  // --- Web or last-resort ---
  // 1) Anchor-click trick: works inside sandboxed iframes (e.g. the Lovable
  //    preview) where `window.open` is silently blocked, and avoids loading
  //    the URL inside the current frame (which would trigger
  //    ERR_BLOCKED_BY_RESPONSE for sites with X-Frame-Options: DENY).
  try {
    const a = document.createElement('a');
    a.href = safeUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  } catch (err) {
    console.warn('[openExternalUrl] anchor-click failed:', err);
  }

  // 2) window.open fallback.
  try {
    const win = window.open(safeUrl, '_blank', 'noopener,noreferrer');
    if (win) return true;
  } catch (err) {
    console.warn('[openExternalUrl] window.open failed:', err);
  }

  // 3) Last-resort: top-level navigation.  Use `window.top` so the URL
  //    replaces the outermost frame instead of loading inside an iframe
  //    where sites with X-Frame-Options: DENY (e.g. whatsapp.com) would
  //    fail with ERR_BLOCKED_BY_RESPONSE.
  try {
    const top = window.top ?? window;
    top.location.href = safeUrl;
    return true;
  } catch {
    try {
      window.location.href = safeUrl;
      return true;
    } catch (err) {
      console.error('[openExternalUrl] All open strategies failed:', err);
      return false;
    }
  }
}

/**
 * Open a blank popup synchronously inside a user-gesture click handler,
 * then navigate it later once an async operation (e.g. fetching the real
 * target URL) finishes.  Returns a handle with `.navigate(url)` and
 * `.close()`; if the popup was blocked, navigate() falls back to the full
 * `openExternalUrl` strategy chain.
 *
 * USAGE — must be called synchronously at the very top of a click handler,
 * BEFORE any `await`, otherwise the browser will treat the popup as
 * programmatic and block it.
 */
export function openBlankTabSync(): {
  navigate: (url: string) => Promise<boolean>;
  close: () => void;
} {
  let popup: Window | null = null;
  try {
    // Open WITHOUT `noopener` so we keep a handle to the new tab and can
    // navigate it after the async work finishes.  We null out `opener`
    // right after navigation to restore the security guarantee.
    popup = window.open('about:blank', '_blank');
  } catch {
    popup = null;
  }
  return {
    async navigate(url: string) {
      const safe = sanitizeUrl(url);
      if (!safe) {
        try { popup?.close(); } catch {}
        return false;
      }
      if (popup && !popup.closed) {
        try {
          popup.location.href = safe;
          try { (popup as Window & { opener: Window | null }).opener = null; } catch {}
          return true;
        } catch {
          // fall through to full strategy
        }
      }
      return openExternalUrl(safe);
    },
    close() {
      try { popup?.close(); } catch {}
    },
  };
}
