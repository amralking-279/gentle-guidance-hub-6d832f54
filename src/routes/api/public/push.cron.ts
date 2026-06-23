// Cron-triggered endpoint that runs once per minute.
// Iterates all push subscriptions, computes prayer times per location,
// and dispatches notifications for any prayer due right now and for any
// pending app updates the subscriber hasn't seen yet.

import { createFileRoute } from '@tanstack/react-router';
import { sendPush } from '@/lib/push/sender.server';
import { findDuePrayer, findApproachingPrayer, getPrayerTimes, PRAYER_NAMES_AR } from '@/lib/push/prayer-times.server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, apikey, Authorization',
} as const;

type Row = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  reciter_id: string | null;
  enabled_prayers: Record<string, boolean> | null;
  notify_updates: boolean;
  last_notified_key: string | null;
  last_pre_notified_key: string | null;
  last_update_version: string | null;
};

type UpdateRow = { version: string; title: string; body: string };

export const Route = createFileRoute('/api/public/push/cron')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        // Protect against open abuse: only callers presenting the shared
        // CRON_SECRET (configured server-side and supplied by the scheduler)
        // may trigger broadcasts.
        const secret = process.env.CRON_SECRET;
        const auth = request.headers.get('authorization') || '';
        const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
        if (!secret || provided !== secret) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json', ...CORS },
          });
        }
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const now = new Date();

        // Pull active subscriptions.
        // NOTE: `last_pre_notified_key` was added in a later migration; cast via
        // unknown until the generated types regenerate to include it.
        const { data: subs, error } = await supabaseAdmin
          .from('push_subscriptions')
          .select('*')
          .limit(5000);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
          });
        }

        // Pull the latest update version (the cron will push any subscriber
        // who hasn't been notified of it yet).
        const { data: updateRows } = await supabaseAdmin
          .from('push_updates')
          .select('version,title,body')
          .order('created_at', { ascending: false })
          .limit(1);
        const latestUpdate: UpdateRow | null = (updateRows && updateRows[0]) || null;

        let sentPrayer = 0;
        let sentPre = 0;
        let sentUpdate = 0;
        const dead: string[] = [];

        for (const s of (subs as unknown as Row[] | null) || []) {
          // 1. Prayer-time + pre-prayer (approaching) notifications.
          if (s.latitude != null && s.longitude != null) {
            const times = await getPrayerTimes(s.latitude, s.longitude, s.timezone || undefined);
            if (times) {
              const today = (s.timezone
                ? new Intl.DateTimeFormat('en-CA', { timeZone: s.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
                : now.toISOString().slice(0, 10));
              const enabled = s.enabled_prayers ?? { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true };

              // 1a. Approaching-prayer warning (≤ 10 min before).
              const approaching = findApproachingPrayer(times, now, s.timezone || undefined, 10);
              if (approaching && enabled[approaching.key]) {
                const preKey = `${today}-${approaching.key}-pre`;
                if (s.last_pre_notified_key !== preKey) {
                  const arabicName = PRAYER_NAMES_AR[approaching.key];
                  const mins = approaching.minutesLeft;
                  const res = await sendPush(
                    { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
                    {
                      title: `⏰ اقتربت صلاة ${arabicName}`,
                      body: `باقي ${mins} ${mins === 1 ? 'دقيقة' : mins === 2 ? 'دقيقتان' : mins <= 10 ? 'دقائق' : 'دقيقة'} على أذان ${arabicName} — ${times[approaching.key]}`,
                      tag: `prayer-pre-${preKey}`,
                      url: '/more/prayer-times',
                      requireInteraction: false,
                    },
                  );
                  if (res.gone) { dead.push(s.endpoint); continue; }
                  if (res.ok) {
                    sentPre++;
                    await supabaseAdmin
                      .from('push_subscriptions')
                      .update({ last_pre_notified_key: preKey } as never)
                      .eq('id', s.id);
                  }
                }
              }

              // 1b. On-time prayer notification.
              const due = findDuePrayer(times, now, s.timezone || undefined, 1);
              if (due) {
                if (enabled[due]) {
                  const key = `${today}-${due}`;
                  if (s.last_notified_key !== key) {
                    const arabicName = PRAYER_NAMES_AR[due];
                    const res = await sendPush(
                      { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
                      {
                        title: `🕌 حان وقت صلاة ${arabicName}`,
                        body: `الله أكبر — حان الآن موعد صلاة ${arabicName}`,
                        tag: `prayer-${key}`,
                        url: `/more/prayer-times?adhan=${due}`,
                        requireInteraction: true,
                        persistent: true,
                        playAdhan: true,
                        prayerKey: due,
                        reciterId: s.reciter_id ?? undefined,
                      },
                    );
                    if (res.gone) {
                      dead.push(s.endpoint);
                      continue;
                    }
                    if (res.ok) {
                      sentPrayer++;
                      await supabaseAdmin
                        .from('push_subscriptions')
                        .update({ last_notified_key: key })
                        .eq('id', s.id);
                    }
                  }
                }
              }
            }
          }

          // 2. Update notification.
          if (latestUpdate && s.notify_updates && s.last_update_version !== latestUpdate.version) {
            const res = await sendPush(
              { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
              {
                title: latestUpdate.title,
                body: latestUpdate.body,
                tag: `noor-update-${latestUpdate.version}`,
                url: '/',
                requireInteraction: false,
              },
            );
            if (res.gone) {
              dead.push(s.endpoint);
              continue;
            }
            if (res.ok) {
              sentUpdate++;
              await supabaseAdmin
                .from('push_subscriptions')
                .update({ last_update_version: latestUpdate.version })
                .eq('id', s.id);
            }
          }
        }

        if (dead.length) {
          await supabaseAdmin.from('push_subscriptions').delete().in('endpoint', dead);
        }

        return new Response(
          JSON.stringify({ ok: true, sentPrayer, sentUpdate, removed: dead.length, total: subs?.length || 0 }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } },
        );
      },
    },
  },
});
