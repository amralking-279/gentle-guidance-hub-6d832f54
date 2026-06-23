// Idempotent endpoint: any client visit announces the current release notes
// so the cron picks it up and pushes it to all subscribers (once per version).
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

const Schema = z.object({
  version: z.string().min(1).max(64).regex(/^[a-zA-Z0-9._\-:]+$/),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(500),
});

export const Route = createFileRoute('/api/public/push/announce-update')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          // Require shared CRON_SECRET — only trusted deploy/CI callers may
          // queue a release-note broadcast. Without this any visitor could
          // inject arbitrary push content delivered to every subscriber.
          const secret = process.env.CRON_SECRET;
          const auth = request.headers.get('authorization') || '';
          const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
          if (!secret || provided !== secret) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), {
              status: 403,
              headers: { 'Content-Type': 'application/json', ...CORS },
            });
          }
          const data = Schema.parse(await request.json());
          const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
          // upsert on `version` so concurrent visitors are deduped.
          await supabaseAdmin
            .from('push_updates')
            .upsert({ version: data.version, title: data.title, body: data.body }, { onConflict: 'version' });
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
