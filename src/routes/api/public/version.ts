import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/version')({
  server: {
    handlers: {
      GET: async () => {
        const versionData = {
          version: "1.0.1",
          version_code: 10001,
          apk_url: "https://quran-foundation-prime.lovable.app/downloads/noor-quran-1.0.1.apk",
          downloadUrl: "https://quran-foundation-prime.lovable.app/downloads/noor-quran-1.0.1.apk",
          message: "تحديث جديد متاح لتطبيق نور القرآن الكريم — هوية جديدة وشعار جديد للتطبيق وشاشة بداية مميزة.",
          changelog: [
            "🎨 شعار جديد كلياً للتطبيق على شاشة الجهاز",
            "✨ شاشة بداية (Splash) جديدة عند فتح التطبيق",
            "🔊 إصلاح أصوات عدد من القراء (الشريم، جبريل، أيوب، الحذيفي)",
            "⚡ تحسين سرعة تشغيل التلاوات وتقليل محاولات الاتصال الفاشلة",
            "🐛 إصلاحات عامة وتحسينات في الأداء"
          ],
          mandatory: false,
          force_update_below: "0.9.0",
          min_android_version: 21,
          released_at: "2026-06-11"
        };

        return new Response(JSON.stringify(versionData), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Cache-Control': 'no-cache',
          },
        });
      },
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      },
    },
  },
});
