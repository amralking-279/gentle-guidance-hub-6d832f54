
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import SurahList from '@/components/quran/SurahList';

export default function ReadPageClient() {
  return (
    <div className="pt-20 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-emerald-800/30 mb-4">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-cairo text-sm">قراءة القرآن</span>
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: 'Amiri, serif' }}
          >
            قراءة القرآن الكريم
          </h1>
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent mx-auto" />
          <p className="text-gray-400 font-cairo mt-4">
            اختر سورة وابدأ رحلتك مع كلام الله
          </p>
        </motion.div>

        <SurahList />
      </div>
    </div>
  );
}
