
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { BookOpen, ArrowRight, ChevronDown, ChevronLeft, Mic, Sparkles } from 'lucide-react';
import { ISLAMIC_EDUCATION, type Lesson, type Topic } from '@/lib/data/islamicEducation';

export default function IslamicEducationClient() {
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  // Lesson detail view
  if (activeTopic && activeLesson) {
    return (
      <div className="pt-24 pb-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setActiveLesson(null)}
            className="mb-6 inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-cairo"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>عودة إلى {activeTopic.title}</span>
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-emerald-800/30 mb-4">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 font-cairo text-sm">{activeTopic.title}</span>
            </div>
            <h1
              className="text-4xl md:text-5xl font-bold text-white mb-3"
              style={{ fontFamily: 'Amiri, serif' }}
            >
              {activeLesson.title}
            </h1>
          </motion.div>

          <div className="space-y-5">
            {activeLesson.sections.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-2xl p-6 border border-emerald-900/40"
              >
                {s.heading && (
                  <h3
                    className="text-xl text-emerald-400 font-bold mb-3"
                    style={{ fontFamily: 'Amiri, serif' }}
                  >
                    {s.heading}
                  </h3>
                )}
                <p
                  className="text-gray-200 text-lg leading-loose whitespace-pre-line"
                  style={{ fontFamily: 'Amiri, serif', direction: 'rtl' }}
                >
                  {s.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Topic detail view (lesson list)
  if (activeTopic) {
    return (
      <div className="pt-24 pb-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setActiveTopic(null)}
            className="mb-6 inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-cairo"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>عودة إلى تعليم الإسلام</span>
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <h1
              className="text-4xl md:text-5xl font-bold text-white mb-3"
              style={{ fontFamily: 'Amiri, serif' }}
            >
              {activeTopic.title}
            </h1>
            <p className="text-gray-400 font-cairo">{activeTopic.description}</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {activeTopic.lessons.map((lesson, idx) => (
              <motion.button
                key={lesson.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setActiveLesson(lesson)}
                className="glass-card rounded-2xl p-6 border border-emerald-900/40 hover:border-emerald-600/70 transition-all text-right group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3
                      className="text-xl text-emerald-400 font-bold mb-1"
                      style={{ fontFamily: 'Amiri, serif' }}
                    >
                      {lesson.title}
                    </h3>
                    <p className="text-gray-400 font-cairo text-xs">
                      {lesson.sections.length} أقسام
                    </p>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-emerald-400 group-hover:-translate-x-1 transition-transform" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Topics overview
  return (
    <div className="pt-24 pb-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-emerald-800/30 mb-4">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-cairo text-sm">تعليم الإسلام</span>
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: 'Amiri, serif' }}
          >
            تعليم الإسلام
          </h1>
          <p className="text-gray-400 font-cairo">
            دروس متكاملة في العقيدة والفقه والسيرة والآداب
          </p>
        </motion.div>

        {/* Quran Learning highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8"
        >
          <Link
            to="/more/quran-learning"
            className="group block relative overflow-hidden rounded-3xl border border-emerald-600/50 bg-gradient-to-br from-emerald-900/60 via-emerald-950/80 to-black p-6 md:p-8 hover:border-emerald-400/70 transition-all"
          >
            <div className="absolute -top-10 -left-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl group-hover:bg-emerald-400/30 transition-all" />
            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center shadow-xl shadow-emerald-900/50 flex-shrink-0">
                <Mic className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 text-right">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 mb-2">
                  <Sparkles className="w-3 h-3 text-emerald-300" />
                  <span className="text-emerald-300 font-cairo text-xs">جديد · ذكاء اصطناعي</span>
                </div>
                <h3
                  className="text-2xl md:text-3xl font-bold text-white mb-1"
                  style={{ fontFamily: 'Amiri, serif' }}
                >
                  تعلّم تلاوة القرآن الكريم
                </h3>
                <p className="text-emerald-100/80 font-cairo text-sm">
                  اختر صوت الشيخ، استمع وكرّر، ثم اضغط الميكروفون ليراجع الذكاء الاصطناعي نطقك ويعلّمك أحكام التجويد
                </p>
              </div>
              <ChevronLeft className="w-6 h-6 text-emerald-300 group-hover:-translate-x-1 transition-transform" />
            </div>
          </Link>
        </motion.div>

        <div className="space-y-4 mb-12">
          {ISLAMIC_EDUCATION.map((topic, idx) => (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
            >
              <div className="glass-card rounded-2xl border border-emerald-900/40 hover:border-emerald-700/60 transition-all overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === idx ? null : idx)}
                  className="w-full p-6 text-right"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3
                        className="text-2xl font-bold text-emerald-400 mb-1"
                        style={{ fontFamily: 'Amiri, serif' }}
                      >
                        {topic.title}
                      </h3>
                      <p className="text-gray-400 font-cairo text-sm">{topic.description}</p>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-emerald-400 transition-transform flex-shrink-0 ${
                        expanded === idx ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                <AnimatePresence>
                  {expanded === idx && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="px-6 pb-6 pt-2 border-t border-emerald-900/30 space-y-2"
                    >
                      {topic.lessons.map(lesson => (
                        <button
                          key={lesson.id}
                          onClick={() => {
                            setActiveTopic(topic);
                            setActiveLesson(lesson);
                          }}
                          className="w-full flex items-center justify-between gap-3 py-3 px-4 rounded-lg bg-emerald-900/20 hover:bg-emerald-900/50 transition-colors text-right group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                            <span
                              className="text-white text-lg"
                              style={{ fontFamily: 'Amiri, serif' }}
                            >
                              {lesson.title}
                            </span>
                          </div>
                          <ChevronLeft className="w-4 h-4 text-emerald-400 group-hover:-translate-x-1 transition-transform" />
                        </button>
                      ))}
                      <button
                        onClick={() => setActiveTopic(topic)}
                        className="w-full mt-3 px-4 py-3 rounded-lg bg-emerald-900/40 border border-emerald-700/40 text-emerald-300 font-cairo hover:bg-emerald-900/70 transition-all"
                      >
                        فتح كل دروس {topic.title}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>

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
