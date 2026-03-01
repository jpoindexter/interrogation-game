import { Spinner } from '../../components/ui';
import { motion, fadeIn, gentle } from '../../components/motion';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen text-foreground font-mono flex items-center justify-center p-8 relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/detective/desk.png)',
          backgroundSize: '60%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#000',
          imageRendering: 'pixelated',
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
        <div className="relative">
          <div className="absolute -top-3 left-1/2 z-10 w-20 h-7" style={{
            background: 'linear-gradient(180deg, rgba(210,195,150,0.7) 0%, rgba(200,185,140,0.6) 100%)',
            transform: 'translateX(-50%) rotate(-1.5deg)',
            borderRadius: '1px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
          <div
            className="relative p-6 pl-10 rounded-t-sm text-left"
            style={{
              background: 'repeating-linear-gradient(transparent, transparent 19px, rgba(100,140,180,0.2) 19px, rgba(100,140,180,0.2) 20px), linear-gradient(180deg, #F5E6A3 0%, #EDD98B 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.05)',
            }}
          >
            <div className="absolute top-0 bottom-0 left-[26px] w-[1px] pointer-events-none" style={{ background: 'rgba(196,60,60,0.35)' }} />
            <h3 className="text-xs uppercase tracking-[0.3em] text-gray-700 font-bold mb-3">How to Play</h3>
            <div className="space-y-2.5 text-[12px] text-gray-700 leading-relaxed">
              <p><span className="text-gray-900 font-bold">1. Question.</span> Tap the mic or type. Timer counts down &mdash; 5 min on Easy up to 10 min on Expert.</p>
              <p><span className="text-gray-900 font-bold">2. Collect evidence.</span> Push the right topics to raise stress. Evidence unlocks as they crack.</p>
              <p><span className="text-red-800 font-bold">3. Accuse.</span> State <span className="text-gray-900 font-bold">what</span> they lied about. Be specific. You get <span className="text-gray-900 font-bold">3 tries</span>.</p>
            </div>
            <div className="mt-3 pt-3" style={{ borderTop: '1px dashed rgba(0,0,0,0.15)' }}>
              <h3 className="text-xs uppercase tracking-[0.3em] text-gray-700 font-bold mb-2">Scoring</h3>
              <div className="space-y-1 text-[11px] text-gray-600">
                <p><span className="text-green-800">+</span> Solve fast &mdash; time is your base score</p>
                <p><span className="text-green-800">+</span> Fewer questions &mdash; efficiency bonus up to 1.5&times;</p>
                <p><span className="text-green-800">+</span> Higher difficulty &mdash; up to 2.5&times; multiplier</p>
                <p><span className="text-red-800">&minus;</span> Each hint &minus;15% &bull; Each wrong accusation &minus;10%</p>
              </div>
            </div>
          </div>
          <svg className="w-full block" viewBox="0 0 500 16" preserveAspectRatio="none" style={{ marginTop: -1, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}>
            <path d="M0,0 L500,0 L500,2 C495,5 490,3 485,6 C480,4 477,8 472,5 C468,3 465,7 460,4 C456,6 452,2 448,5 C444,8 440,3 436,6 C432,4 428,7 424,3 C420,5 416,2 412,6 C408,8 405,4 400,5 C396,3 392,7 388,4 C384,6 380,2 376,5 C372,7 368,3 364,6 C360,4 357,8 352,5 C348,3 344,6 340,4 C336,7 332,2 328,5 C324,8 320,4 316,6 C312,3 308,7 304,4 C300,6 296,2 292,5 C288,7 284,3 280,6 C276,4 273,8 268,5 C264,3 260,6 256,4 C252,7 248,2 244,5 C240,8 236,4 232,6 C228,3 224,7 220,5 C216,3 212,6 208,4 C204,7 200,2 196,5 C192,8 188,4 184,6 C180,3 176,7 172,4 C168,6 165,2 160,5 C156,7 152,3 148,6 C144,4 140,8 136,5 C132,3 128,6 124,4 C120,7 116,2 112,5 C108,8 104,4 100,6 C96,3 92,7 88,5 C84,3 80,6 76,4 C72,7 68,2 64,5 C60,8 56,4 52,6 C48,3 44,7 40,4 C36,6 32,2 28,5 C24,7 20,3 16,6 C12,4 8,8 4,5 L0,3 Z" fill="#EDD98B" />
          </svg>
        </div>
      </motion.div>
    </div>
  );
}
