
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Facebook, Send, Mail, X, Phone } from 'lucide-react';

const contacts = [
  {
    id: 'whatsapp',
    label: 'واتساب',
    href: 'https://wa.me/201203225023',
    icon: Phone,
    color: 'bg-green-800 border-green-700',
  },
  {
    id: 'facebook',
    label: 'فيسبوك',
    href: 'https://www.facebook.com/share/17psuJ7LuD/',
    icon: Facebook,
    color: 'bg-blue-800 border-blue-700',
  },
  {
    id: 'telegram',
    label: 'تيليغرام',
    href: 'https://t.me/Amr_128',
    icon: Send,
    color: 'bg-sky-800 border-sky-700',
  },
  {
    id: 'email',
    label: 'البريد',
    href: 'mailto:amr012032250@gmail.com',
    icon: Mail,
    color: 'bg-red-800 border-red-700',
  },
];

const safeFixedLayer = {
  isolation: 'isolate' as const,
  contain: 'paint' as const,
  transform: 'translateZ(0)',
  willChange: 'transform',
  boxShadow: 'none',
  backgroundImage: 'none',
  filter: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
};

export function FloatingContact() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-24 left-4 z-40 flex flex-col-reverse items-center gap-3">
      <AnimatePresence>
        {open && contacts.map((contact, idx) => {
          const Icon = contact.icon;
          return (
            <motion.a
              key={contact.id}
              href={contact.href}
              target="_blank"
              rel="noopener noreferrer"
              title={contact.label}
              initial={{ opacity: 0, y: 20, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.6 }}
              transition={{ delay: idx * 0.07, type: 'spring', stiffness: 300, damping: 20 }}
              className={`w-11 h-11 rounded-full ${contact.color} border flex items-center justify-center text-white transition-colors duration-200 hover:brightness-125`}
              style={safeFixedLayer}
            >
              <Icon className="w-4 h-4" />
            </motion.a>
          );
        })}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen(prev => !prev)}
        className="w-12 h-12 rounded-full bg-emerald-800 border border-emerald-700 flex items-center justify-center text-white transition-colors duration-200 hover:brightness-125"
        style={safeFixedLayer}
        whileTap={{ scale: 0.95 }}
        aria-label="تواصل معنا"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageCircle className="w-5 h-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
