import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

const Schema = z.object({
  endpoint: z.string().url().min(20).max(2048),
  p256dh: z.string().min(20).max(256),
  auth: z.string().min(8).max(128),
  user_agent: z.string().max(512).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  timezone: z.string().max(64).optional().nullable(),
  reciter_id: z.string().max(64).optional().nullable(),
  enabled_prayers: z.record(z.string(), z.boolean()).optional(),
  notify_updates: z.boolean().optional(),
});

export const Route = createFileRoute('/api/public/push/subscribe')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const data = Schema.parse(body);
          const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
          const { error } = await supabaseAdmin
            .from('push_subscriptions')
            .upsert(
              {
                endpoint: data.endpoint,
                p256dh: data.p256dh,
                auth: data.auth,
                user_agent: data.user_agent ?? null,
                latitude: data.latitude ?? null,
                longitude: data.longitude ?? null,
                timezone: data.timezone ?? null,
                reciter_id: data.reciter_id ?? null,
                enabled_prayers: data.enabled_prayers ?? undefined,
                notify_updates: data.notify_updates ?? true,
              },
              { onConflict: 'endpoint' },
            );
          if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 500,
              headers: { 'Content-Type': 'application/json', ...CORS },
            });
          }
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...CORS },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Bad request';
          return new Response(JSON.stringify({ error: message }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...CORS },
          });
        }
      },
    },
  },
});
