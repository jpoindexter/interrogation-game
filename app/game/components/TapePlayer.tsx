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
      </div>
      <p className="text-[9px] text-white/50 uppercase tracking-wider mt-1 text-center group-hover:text-white/80 transition-colors">Play Briefing</p>
    </motion.button>
  );
}
