import { Spinner } from '../../components/ui';
import { motion, fadeIn, gentle } from '../../components/motion';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen text-foreground font-mono flex items-center justify-center p-8 relative overflow-hidden">
      {/* Desk background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/detective/desk.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-black/60" />
      <motion.div
        className="max-w-lg text-center relative z-10"
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
        <div
          className="relative p-6 pl-10 rounded-sm text-left"
          style={{
            background: 'repeating-linear-gradient(transparent, transparent 19px, rgba(100,140,180,0.2) 19px, rgba(100,140,180,0.2) 20px), linear-gradient(180deg, #F5E6A3 0%, #EDD98B 100%)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.05)',
          }}
        >
          {/* Red margin line */}
          <div className="absolute top-0 bottom-0 left-[26px] w-[1px] pointer-events-none" style={{ background: 'rgba(196,60,60,0.35)' }} />
          {/* Torn top edge */}
          <div className="absolute -top-[1px] left-0 right-0 h-[4px] pointer-events-none" style={{
            background: 'linear-gradient(180deg, rgba(139,119,70,0.4) 0%, transparent 100%)',
          }} />
          <h3 className="text-xs uppercase tracking-[0.3em] text-gray-700 font-bold mb-3">How to Play</h3>
          <div className="space-y-3 text-[12px] text-gray-700 leading-relaxed">
            <p><span className="text-gray-900 font-bold">1. Question.</span> Tap the mic and ask the suspect questions. The stress meter tells you when you&rsquo;re getting close to the lie.</p>
            <p><span className="text-red-800 font-bold">2. Accuse.</span> When you find a contradiction, hit ACCUSE and state exactly what they lied about. Be specific.</p>
            <p><span className="text-gray-900 font-bold">3. Win.</span> Get it right and they confess. Get it wrong and you waste an attempt. You get <span className="text-gray-900 font-bold">3 tries</span>.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
