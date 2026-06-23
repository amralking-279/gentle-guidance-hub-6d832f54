
import { motion } from 'framer-motion';
import { Phone, Facebook, Send, Mail, MessageSquare } from 'lucide-react';

const contactItems = [
  {
    icon: Phone,
    label: 'واتساب',
    value: '+20 120 322 5023',
    href: 'https://wa.me/201203225023',
    color: 'bg-green-950',
    border: 'border-green-800',
    iconColor: 'text-green-400',
    hoverGlow: 'hover:shadow-[0_0_15px_rgba(34,197,94,0.15)]',
  },
  {
    icon: Facebook,
    label: 'فيسبوك',
    value: 'صفحتنا على فيسبوك',
    href: 'https://www.facebook.com/share/17psuJ7LuD/',
    color: 'bg-blue-950',
    border: 'border-blue-800',
    iconColor: 'text-blue-400',
    hoverGlow: 'hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]',
  },
  {
    icon: Send,
    label: 'تيليغرام',
    value: '@Amr_128',
    href: 'https://t.me/Amr_128',
    color: 'bg-sky-950',
    border: 'border-sky-800',
    iconColor: 'text-sky-400',
    hoverGlow: 'hover:shadow-[0_0_15px_rgba(14,165,233,0.15)]',
  },
  {
    icon: Mail,
    label: 'البريد الإلكتروني',
    value: 'amr012032250@gmail.com',
    href: 'mailto:amr012032250@gmail.com',
    color: 'bg-red-950',
    border: 'border-red-800',
    iconColor: 'text-red-400',
    hoverGlow: 'hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]',
  },
];

export default function ContactSection() {
  return (
    <section
      id="contact"
      className="relative py-20 px-4 overflow-hidden bg-[#030a06]"
      style={{ isolation: 'isolate' }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(6,95,70,0.06)_0%,transparent_60%)] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-emerald-800/30 mb-4">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-cairo text-sm">تواصل معنا</span>
          </div>
          <h2
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: 'Amiri, serif' }}
          >
            تواصل معنا
          </h2>
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent mx-auto" />
          <p className="text-gray-400 font-cairo mt-4">
            نسعد بتواصلكم في أي وقت
          </p>
        </motion.div>

        <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
          {contactItems.map(({ icon: Icon, label, value, href, color, border, iconColor, hoverGlow }, idx) => (
            <motion.a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              viewport={{ once: true }}
              className={`relative z-10 flex items-center gap-4 p-5 rounded-2xl ${color} border ${border} ${hoverGlow} hover:-translate-y-0.5 transition-all duration-300 group`}
              style={{ transform: 'translateZ(0)' }}
            >
              <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>
              <div>
                <p className={`font-semibold font-cairo ${iconColor}`}>{label}</p>
                <p className="text-gray-400 text-sm font-cairo mt-0.5">{value}</p>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
