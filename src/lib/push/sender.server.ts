// Server-only helper that signs and sends Web Push messages.
// Uses the `web-push` npm package; Cloudflare Workers nodejs_compat covers
// the node:crypto and node:https requirements.
import webpush from 'web-push';

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const pub = 'BHeXMVounvgvdH6L4iPLY4RyrdeKNcLzwYbh2XnDaiJL-a2GDQanKvOVvxkltt9HHbMoGh8_rByp92Xhn5ObS6M';
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subj = process.env.VAPID_SUBJECT || 'mailto:owner@quran-divine-grace.app';
  if (!priv) throw new Error('VAPID_PRIVATE_KEY is not set');
  webpush.setVapidDetails(subj, pub, priv);
  configured = true;
}

export type PushSub = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushPayload = {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  persistent?: boolean;
  /** When true, the SW will message any open client to play the adhan audio. */
  playAdhan?: boolean;
  /** Prayer key (Fajr, Dhuhr, ...) — passed through to the client. */
  prayerKey?: string;
  /** Reciter id selected by the user, so the open page can use it. */
  reciterId?: string;
};

/** Returns true if push was accepted, false if the subscription is gone (410/404). */
export async function sendPush(sub: PushSub, payload: PushPayload): Promise<{ ok: boolean; gone: boolean; status?: number }>{
  ensureConfigured();
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 5 },
    );
    return { ok: true, gone: false };
  } catch (e: unknown) {
    const status = (e as { statusCode?: number })?.statusCode;
    const gone = status === 404 || status === 410;
    return { ok: false, gone, status };
  }
}
