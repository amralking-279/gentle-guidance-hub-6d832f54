import { createFileRoute } from '@tanstack/react-router';

const SALAT_TEXT =
  'اللهم صلِّ وسلِّم وبارك على سيدنا محمد وعلى آله وصحبه أجمعين';

const INSTRUCTIONS =
  'Recite slowly, warmly, gently, and reverently in classical Arabic, like a calm soft-spoken male reciter. Keep the tone peaceful and beautiful.';

async function generateMp3(): Promise<Response> {
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
      input: SALAT_TEXT,
      voice: 'ash',
      instructions: INSTRUCTIONS,
      response_format: 'mp3',
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '');
    return new Response(`TTS failed: ${upstream.status} ${text}`, {
      status: upstream.status === 402 || upstream.status === 429 ? upstream.status : 502,
    });
  }

  const buf = await upstream.arrayBuffer();
  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export const Route = createFileRoute('/api/public/tts/salat-nabi.mp3')({
  server: {
    handlers: {
      GET: async () => generateMp3(),
      HEAD: async () => {
        const res = await generateMp3();
        return new Response(null, { status: res.status, headers: res.headers });
      },
    },
  },
});
