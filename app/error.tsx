'use client';

import { motion, fadeUp, smooth } from './components/motion';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-black text-foreground font-mono flex items-center justify-center p-8">
      <motion.div
        className="max-w-md text-center"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        transition={smooth}
      >
        <h1 className="text-4xl font-bold text-accent mb-4">ERROR</h1>
        <p className="text-gray-400 mb-6">{error.message || 'Something went wrong.'}</p>
        <div className="flex gap-4 justify-center">
          <button onClick={reset} className="px-6 py-3 bg-accent text-white font-bold rounded-sm hover:bg-accent-hover transition-colors">
            Try Again
          </button>
          <a href="/" className="px-6 py-3 bg-surface text-foreground font-bold rounded-sm hover:bg-surface-hover transition-colors">
            Home
          </a>
        </div>
      </motion.div>
    </div>
  );
}
