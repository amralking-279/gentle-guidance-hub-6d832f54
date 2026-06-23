import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { BookMarked, ArrowRight, RotateCcw } from 'lucide-react';
import { AZKAR } from '@/lib/data/azkar';

export default function AthkarClient() {
  const [activeId, setActiveId] = useState(AZKAR[0].id);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const active = AZKAR.find(c => c.id === activeId)!;

  const key = (i: number) => `${activeId}:${i}`;
  const inc = (i: number, max: number) =>
    setCounts(c => ({ ...c, [key(i)]: Math.min((c[key(i)] ?? 0) + 1, max) }));
  const reset = (i: number) => setCounts(c => ({ ...c, [key(i)]: 0 }));

  return (
    <div className="pt-24 pb-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-emerald-800/30 mb-4">
            <BookMarked className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-cairo text-sm">الأذكار</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3" style={{ fontFamily: 'Amiri, serif' }}>
            الأذكار اليومية
          </h1>
          <p className="text-gray-400 font-cairo">اذكر الله يذكرك</p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {AZKAR.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveId(cat.id)}
              className={`px-4 py-2 rounded-xl font-cairo text-sm border transition-all ${
                activeId === cat.id
                  ? 'bg-emerald-900/60 border-emerald-600 text-emerald-200'
                  : 'glass border-emerald-900/40 text-gray-300 hover:border-emerald-700/60'
              }`}
            >
              {cat.title}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {active.items.map((item, i) => {
            const c = counts[key(i)] ?? 0;
            const done = c >= item.count;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`glass-card rounded-2xl p-6 border ${done ? 'border-emerald-600/60' : 'border-emerald-900/40'}`}
              >
                <p
                  className="text-white text-lg leading-loose mb-4"
                  style={{ fontFamily: 'Amiri, serif', direction: 'rtl' }}
                >
                  {item.text}
                </p>
                {item.note && (
                  <p className="text-emerald-400/80 text-xs font-cairo mb-3">{item.note}</p>
                )}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => inc(i, item.count)}
                    disabled={done}
                    className={`px-5 py-2 rounded-xl font-cairo text-sm border transition-all ${
                      done
                        ? 'bg-emerald-900/40 border-emerald-700/40 text-emerald-300 cursor-default'
                        : 'bg-emerald-900/40 border-emerald-700/40 text-emerald-300 hover:bg-emerald-900/70'
                    }`}
                  >
                    {done ? '✓ تم' : `اضغط للعد (${c} / ${item.count})`}
                  </button>
                  <button
                    onClick={() => reset(i)}
                    className="p-2 text-gray-400 hover:text-emerald-400 transition-colors"
                    aria-label="إعادة"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-900/40 border border-emerald-700/40 text-emerald-400 hover:bg-emerald-900/60 transition-all"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="font-cairo">العودة للرئيسية</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
