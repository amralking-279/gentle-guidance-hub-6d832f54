
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { Sparkles, ArrowRight, Search } from 'lucide-react';

const NAMES_OF_ALLAH = [
  { name: 'الرحمن', transliteration: 'Ar-Rahman', meaning: 'The Most Merciful' },
  { name: 'الرحيم', transliteration: 'Ar-Rahim', meaning: 'The Most Compassionate' },
  { name: 'الملك', transliteration: 'Al-Malik', meaning: 'The Sovereign' },
  { name: 'القدوس', transliteration: 'Al-Quddus', meaning: 'The Most Holy' },
  { name: 'السلام', transliteration: 'As-Salam', meaning: 'The Source of Peace' },
  { name: 'المؤمن', transliteration: 'Al-Mu\'min', meaning: 'The Giver of Faith' },
  { name: 'المهيمن', transliteration: 'Al-Muhaymin', meaning: 'The Guardian' },
  { name: 'العزيز', transliteration: 'Al-Aziz', meaning: 'The Mighty' },
  { name: 'الجبار', transliteration: 'Al-Jabbar', meaning: 'The Compeller' },
  { name: 'المتكبر', transliteration: 'Al-Mutakabbir', meaning: 'The Greatest' },
  { name: 'الخالق', transliteration: 'Al-Khaliq', meaning: 'The Creator' },
  { name: 'البارئ', transliteration: 'Al-Bari', meaning: 'The Maker' },
  { name: 'المصور', transliteration: 'Al-Musawwir', meaning: 'The Designer' },
  { name: 'الغفار', transliteration: 'Al-Ghaffar', meaning: 'The Forgiver' },
  { name: 'القهار', transliteration: 'Al-Qahhar', meaning: 'The Subduer' },
  { name: 'الوهاب', transliteration: 'Al-Wahab', meaning: 'The Giver' },
  { name: 'الرزاق', transliteration: 'Ar-Razzaq', meaning: 'The Provider' },
  { name: 'الفتاح', transliteration: 'Al-Fattah', meaning: 'The Opener' },
  { name: 'العليم', transliteration: 'Al-Alim', meaning: 'The All-Knowing' },
  { name: 'القابض', transliteration: 'Al-Qabiz', meaning: 'The Withholder' },
];

export default function NamesClient() {
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('allah_names_favorites');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('allah_names_favorites', JSON.stringify(favorites));
    }
  }, [favorites, mounted]);

  const filtered = NAMES_OF_ALLAH.filter(
    n => n.name.includes(search) || n.meaning.toLowerCase().includes(search.toLowerCase())
  );

  const toggleFavorite = (name: string) => {
    setFavorites(prev => prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]);
  };

  if (!mounted) return null;

  return (
    <div className="pt-24 pb-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-emerald-800/30 mb-4">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-cairo text-sm">أسماء الله الحسنى</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Amiri, serif' }}>
            أسماء الله الحسنى
          </h1>
          <p className="text-gray-400 font-cairo">التسعة والتسعون اسماً لله الحسيب</p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث عن الاسم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-12 pl-4 py-3 rounded-xl glass border border-emerald-800/40 bg-emerald-900/20 text-white placeholder-gray-500 font-cairo focus:outline-none focus:border-emerald-600"
            />
          </div>
        </motion.div>

        {/* Names Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          <AnimatePresence>
            {filtered.map((item, idx) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.02 }}
                className="group glass-card rounded-2xl p-6 border border-emerald-900/40 hover:border-emerald-700/60 transition-all cursor-pointer relative overflow-hidden"
                onClick={() => toggleFavorite(item.name)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-2xl font-bold text-emerald-400" style={{ fontFamily: 'Amiri, serif' }}>
                      {item.name}
                    </h3>
                    <span className={`text-xl ${favorites.includes(item.name) ? 'text-yellow-400' : 'text-gray-600'}`}>
                      ★
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm font-cairo mb-2">{item.transliteration}</p>
                  <p className="text-gray-400 text-sm">{item.meaning}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-900/40 border border-emerald-700/40 text-emerald-400 hover:bg-emerald-900/60 transition-all"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="font-cairo">العودة للرئيسية</span>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
