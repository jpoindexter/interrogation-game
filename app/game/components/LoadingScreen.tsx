import { Spinner } from '../../components/ui';
import { motion, fadeIn, gentle } from '../../components/motion';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-black text-foreground font-mono flex items-center justify-center p-8">
      <motion.div
        className="max-w-lg text-center"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        transition={gentle}
      >
        <motion.div
          className="mx-auto mb-6 flex justify-center"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Spinner />
        </motion.div>
        <motion.h1
          className="text-2xl font-bold mb-6"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          GENERATING CASE...
        </motion.h1>
        <div className="bg-surface-dark border border-surface p-6 rounded-lg text-left">
          <h3 className="text-xs uppercase tracking-[0.3em] text-gold mb-3">How to Play</h3>
          <div className="space-y-3 text-sm text-gray-400">
            <p><span className="text-foreground font-bold">1. Question.</span> Tap the mic and ask the suspect questions. The stress meter tells you when you&rsquo;re getting close to the lie.</p>
            <p><span className="text-accent font-bold">2. Accuse.</span> When you find a contradiction, hit ACCUSE and state exactly what they lied about. Be specific.</p>
            <p><span className="text-gray-300">3. Win.</span> Get it right and they confess. Get it wrong and you waste an attempt. You get <span className="text-foreground">3 tries</span>.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
