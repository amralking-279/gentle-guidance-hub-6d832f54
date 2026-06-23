import { createFileRoute } from '@tanstack/react-router';

const INSTRUCTIONS =
  'Recite slowly, warmly, gently, and reverently in classical Arabic Quranic style (tarteel), like a calm soft-spoken male reciter. Keep the tone peaceful, beautiful, and devotional.';

const MAX_INPUT = 3000;

async function generateMp3(text: string): Promise<Response> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    return new Response('Missing LOVABLE_API_KEY', { status: 500 });
  }

  const upstream = await fetch('https://ai.gateway.lovable.dev/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini-tts',
      input: text,
      voice: 'ash',
      instructions: INSTRUCTIONS,
      response_format: 'mp3',
    }),
  });

  if (!upstream.ok) {
    const msg = await upstream.text().catch(() => '');
    const status =
      upstream.status === 402 || upstream.status === 429 ? upstream.status : 502;
    return new Response(`TTS failed: ${upstream.status} ${msg}`, { status });
  }

  const buf = await upstream.arrayBuffer();
  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export const Route = createFileRoute('/api/public/tts/ruqyah')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { text?: unknown };
        try {
          body = await request.json();
        } catch {
          return new Response('Invalid JSON', { status: 400 });
        }
        const text = typeof body.text === 'string' ? body.text.trim() : '';
        if (!text) return new Response('Missing text', { status: 400 });
        if (text.length > MAX_INPUT) {
          return new Response('Text too long', { status: 400 });
        }
        return generateMp3(text);
      },
    },
  },
});
