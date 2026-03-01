'use client';

import { motion } from 'framer-motion';

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export const fadeDown = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0 },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

export const slideLeft = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0 },
};

export const slideRight = {
  hidden: { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0 },
};

export const stagger = (staggerDelay = 0.08) => ({
  hidden: {},
  visible: { transition: { staggerChildren: staggerDelay } },
});

export const smooth = { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] };
export const snappy = { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] };
export const springy = { type: 'spring' as const, stiffness: 300, damping: 20 };
export const gentle = { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] };

export function PageMotion({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  );
}

export { motion, AnimatePresence } from 'framer-motion';
