
import { motion } from 'framer-motion';
import { Code2, Layout, Share2, Star, BookOpen } from 'lucide-react';

const skills = [
  { icon: Code2, label: 'تصميم وتطوير المواقع' },
  { icon: Layout, label: 'تصميم واجهات المستخدم الحديثة' },
  { icon: Share2, label: 'إدارة محتوى السوشيال ميديا' },
  { icon: Star, label: 'إنشاء مشاريع رقمية احترافية' },
];

export default function AboutSection() {
  return (
    <section id="about" className="relative py-20 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(6,95,70,0.08)_0%,transparent_60%)] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-emerald-800/30 mb-4">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-cairo text-sm">من نحن</span>
          </div>
          <h2
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: 'Amiri, serif' }}
          >
            من نحن
          </h2>
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent mx-auto" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="glass-card rounded-3xl p-8 md:p-10 space-y-6"
        >
          <p className="text-gray-200 text-lg leading-relaxed font-cairo text-center">
            مرحبًا بكم في موقع القرآن الكريم
          </p>

          <p className="text-gray-300 leading-relaxed font-cairo">
            أنا <span className="text-emerald-400 font-semibold">عمرو محمود</span>، طالب في الفرقة الأولى بـ{' '}
            <span className="text-gold-400 font-semibold" style={{ color: '#facc15' }}>كلية تكنولوجيا التعليم الصناعي</span>،
            وأهتم بمجال تصميم المواقع وكل ما يخص السوشيال ميديا والتطوير الرقمي.
          </p>

          <p className="text-gray-300 leading-relaxed font-cairo">
            تم إنشاء هذا الموقع بهدف تقديم تجربة إسلامية حديثة ومريحة تساعد المسلمين على قراءة القرآن الكريم والاستماع إليه بسهولة وبأسلوب احترافي يشبه التطبيقات والمنصات العالمية.
          </p>

          <div>
            <p className="text-gray-300 font-cairo mb-4">أسعى دائمًا إلى تطوير مهاراتي في:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {skills.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 p-3 rounded-xl bg-emerald-900/20 border border-emerald-900/30"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-800/40 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-gray-300 text-sm font-cairo">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-gray-300 leading-relaxed font-cairo">
            فكرة الموقع جاءت من رغبتي في الجمع بين التقنية الحديثة والخدمة الدينية، لتقديم منصة تساعد على التدبر وقراءة القرآن الكريم بطريقة سهلة ومميزة.
          </p>

          <div className="text-center pt-2">
            <p
              className="font-amiri text-xl"
              style={{ fontFamily: 'Amiri, serif', color: '#facc15', textShadow: '0 0 10px rgba(234,179,8,0.4)' }}
            >
              أتمنى أن يكون هذا العمل صدقة جارية وسببًا في نشر الخير والمعرفة
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
