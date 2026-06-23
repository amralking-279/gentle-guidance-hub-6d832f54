import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHeader, getRequestHost } from "@tanstack/react-start/server";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `أنت شيخ مُقرِئ متخصص في علم التجويد ومخارج الحروف والقراءات. مهمتك:
1) أن تستمع لما نطقه الطالب (مفرّغ نصياً من الميكروفون) وتقارنه بالآية المرجعية.
2) أن تكتب نصّاً مضبوطاً بالتشكيل الكامل (تشكيل القرآن) يمثّل ما نطقه الطالب فعلياً (heardText)، مع إبراز الهمزات بأنواعها (ء، أ، إ، ؤ، ئ، آ) كما لُفظت.
3) أن تحلّل النطق كلمة كلمة وتذكر أحكام التجويد الموجودة في الكلمة المرجعية وهل طبّقها الطالب أم لا (إظهار، إدغام، إخفاء، إقلاب، غنّة، قلقلة، مد طبيعي، مد متصل/منفصل/لازم/عارض، تفخيم، ترقيق، همزة وصل/قطع، لام شمسية/قمرية، الراء، إلخ).
4) أن تذكر مخارج الحروف المهمة التي أخطأ فيها الطالب (مثلاً: الضاد من حافة اللسان، الظاء من طرف اللسان مع أطراف الثنايا، القاف من أقصى اللسان...).
5) إعطاء تقييم مشجّع بالعربية الفصحى دون قسوة.

قواعد عامة:
- إذا كان النطق ممتازاً: status=excellent ومدح + ذكر الأحكام التي أتقنها.
- إذا كان به أخطاء بسيطة: status=minor مع تفصيل الأخطاء.
- إذا كان النطق بعيداً جداً أو غير واضح: status=wrong مع تشجيع وطلب الإعادة.
- استخدم نبرة معلّم محبّ في كل الرسائل.
- أعد الإجابة عبر استدعاء الدالة فقط.`;

export const reviewPronunciation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      expected: z.string().min(1).max(2000),
      transcript: z.string().min(0).max(2000),
      surahName: z.string().max(100).optional(),
      ayahNumber: z.number().optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    // Same-origin gate: the AI gateway costs credits per call, so refuse
    // requests that did not originate from our own pages. The app has no
    // user auth, so this origin check is the practical anti-abuse layer.
    const host = getRequestHost();
    const origin = getRequestHeader("origin") || "";
    const referer = getRequestHeader("referer") || "";
    const source = origin || referer;
    let allowed = false;
    if (source && host) {
      try {
        const u = new URL(source);
        allowed = u.host === host;
      } catch {
        allowed = false;
      }
    }
    if (!allowed) {
      throw new Error("غير مسموح");
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY غير متاح");

    const userPrompt = `الآية المرجعية (${data.surahName ?? ""} ${data.ayahNumber ?? ""}):
"${data.expected}"

ما نطقه الطالب (مفرّغاً من الميكروفون، قد يكون بدون تشكيل):
"${data.transcript || "(لم يُلتقط أي صوت واضح)"}"

اكتب heardText مضبوطاً بالتشكيل كما نطقه الطالب فعلياً، وحلّل كل كلمة من حيث أحكام التجويد ومخارج الحروف والهمزات.`;

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "give_feedback",
              description: "إعطاء تقييم تجويدي مفصّل لنطق الطالب",
              parameters: {
                type: "object",
                properties: {
                  status: { type: "string", enum: ["excellent", "minor", "wrong"] },
                  score: { type: "number", description: "نسبة 0-100" },
                  message: { type: "string", description: "رسالة عامة موجهة للطالب" },
                  tip: { type: "string", description: "نصيحة تجويدية عامة قصيرة" },
                  heardText: {
                    type: "string",
                    description: "نص ما نطقه الطالب مكتوباً بالتشكيل الكامل كما لُفظ فعلياً",
                  },
                  wordAnalysis: {
                    type: "array",
                    description: "تحليل كل كلمة من الآية المرجعية",
                    items: {
                      type: "object",
                      properties: {
                        expectedWord: { type: "string", description: "الكلمة الصحيحة بالتشكيل" },
                        heardWord: { type: "string", description: "ما نطقه الطالب لهذه الكلمة بالتشكيل" },
                        correct: { type: "boolean" },
                        rule: { type: "string", description: "حكم التجويد المتعلق بالكلمة (مثلاً: إخفاء، مد متصل، قلقلة...)" },
                        note: { type: "string", description: "ملاحظة قصيرة على النطق أو مخرج الحرف أو الهمزة" },
                      },
                      required: ["expectedWord", "correct"],
                      additionalProperties: false,
                    },
                  },
                  tajweedRules: {
                    type: "array",
                    description: "قائمة أحكام التجويد البارزة في الآية مع شرح موجز",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        explanation: { type: "string" },
                        applied: { type: "boolean", description: "هل طبّقها الطالب" },
                      },
                      required: ["name", "explanation"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["status", "score", "message", "heardText", "wordAnalysis", "tajweedRules"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "give_feedback" } },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("لقد تجاوزت الحد المسموح، حاول بعد قليل");
      if (res.status === 402) throw new Error("نفدت رصيد الذكاء الاصطناعي، الرجاء التواصل مع المشرف");
      const txt = await res.text();
      console.error("AI gateway error:", res.status, txt);
      throw new Error("تعذّر تقييم النطق حالياً");
    }

    const json = await res.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!call) throw new Error("لم يتم استلام تقييم من الذكاء الاصطناعي");
    const parsed = JSON.parse(call) as {
      status: "excellent" | "minor" | "wrong";
      score: number;
      message: string;
      tip?: string;
      heardText: string;
      wordAnalysis: Array<{
        expectedWord: string;
        heardWord?: string;
        correct: boolean;
        rule?: string;
        note?: string;
      }>;
      tajweedRules: Array<{
        name: string;
        explanation: string;
        applied?: boolean;
      }>;
    };
    return parsed;
  });
