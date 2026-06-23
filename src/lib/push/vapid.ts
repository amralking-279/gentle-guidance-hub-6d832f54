// Public VAPID key — safe to ship in the browser bundle.
// Private counterpart lives in the VAPID_PRIVATE_KEY server secret.
export const VAPID_PUBLIC_KEY =
  'BHeXMVounvgvdH6L4iPLY4RyrdeKNcLzwYbh2XnDaiJL-a2GDQanKvOVvxkltt9HHbMoGh8_rByp92Xhn5ObS6M';

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
