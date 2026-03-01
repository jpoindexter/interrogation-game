import { motion } from '../../components/motion';

export default function TapePlayer({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      className="group cursor-pointer"
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="relative">
        <img src="/ui/tape_player.png" alt="Play briefing" className="w-32 sm:w-40 drop-shadow-2xl" style={{ imageRendering: 'pixelated' }} />
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm border border-white/20">
            <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
        </motion.div>
      </div>
      <p className="text-[9px] text-white/50 uppercase tracking-wider mt-2 text-center group-hover:text-white/80 transition-colors">Play Briefing</p>
    </motion.button>
  );
}
