import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  prayerName: string;
  time12: string;
  onClose: () => void;
};

export default function AdhanModal({ open, prayerName, time12, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Background with Ken Burns zoom effect */}
          <motion.div
            initial={{ scale: 1.05 }}
            animate={{ scale: 1.18 }}
            transition={{ duration: 30, ease: 'linear' }}
            className="absolute inset-0 w-full h-full bg-gradient-to-br from-emerald-950 via-black to-emerald-950"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/85" />

          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="absolute top-6 right-6 z-10 w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10 text-center px-6">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="text-7xl md:text-9xl mb-6"
            >
              🕌
            </motion.div>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-emerald-300 font-cairo text-xl md:text-2xl mb-3"
            >
              حان الآن وقت صلاة
            </motion.p>
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-white text-6xl md:text-8xl font-bold mb-6"
              style={{ fontFamily: 'Amiri, serif' }}
            >
              {prayerName}
            </motion.h1>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-white/80 font-mono text-2xl md:text-3xl mb-10"
            >
              {time12}
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="text-emerald-200/90 font-cairo text-lg md:text-xl leading-loose max-w-2xl mx-auto"
              style={{ fontFamily: 'Amiri, serif' }}
            >
              اللّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ،
              آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="mt-10 flex items-center justify-center gap-2"
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ scale: [1, 1.6, 1], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
                  className="w-2.5 h-2.5 rounded-full bg-emerald-400"
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
