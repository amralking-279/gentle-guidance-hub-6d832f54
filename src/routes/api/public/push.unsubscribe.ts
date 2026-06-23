import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

const Schema = z.object({ endpoint: z.string().url().min(20).max(2048) });

export const Route = createFileRoute('/api/public/push/unsubscribe')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const data = Schema.parse(await request.json());
          const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
          await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', data.endpoint);
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
