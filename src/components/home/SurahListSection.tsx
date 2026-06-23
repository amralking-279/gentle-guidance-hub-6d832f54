
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import SurahList from '@/components/quran/SurahList';

export default function SurahListSection() {
  return (
    <section className="relative py-16 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(6,95,70,0.06)_0%,transparent_60%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-emerald-800/30 mb-4">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-cairo text-sm">سور القرآن الكريم</span>
          </div>
          <h2
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: 'Amiri, serif' }}
          >
            سور القرآن الكريم
          </h2>
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent mx-auto" />
          <p className="text-gray-400 font-cairo mt-4">
            اختر سورة للقراءة أو الاستماع
          </p>
        </motion.div>

        <SurahList />
      </div>
    </section>
  );
}
