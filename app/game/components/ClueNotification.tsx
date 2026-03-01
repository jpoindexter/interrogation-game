import { motion, scaleIn, springy } from '../../components/motion';

interface ClueNotificationProps {
  clueNumber: number | null;
  clueIcons: string[];
  cluesNeeded: number;
}

export default function ClueNotification({ clueNumber, clueIcons, cluesNeeded }: ClueNotificationProps) {
  if (!clueNumber) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
      <motion.div
        className="flex flex-col items-center gap-3 px-10 py-8 bg-surface-darker/95 border-2 border-gold/40 rounded-sm shadow-[0_0_60px_rgba(200,160,80,0.15)]"
        initial="hidden"
        animate="visible"
        variants={scaleIn}
        transition={{ ...springy, stiffness: 400, damping: 15 }}
      >
        <span className="text-[10px] uppercase tracking-[0.4em] text-gray-500">Evidence Found</span>
        <img
          src={clueIcons[clueNumber - 1] || clueIcons[0]}
          alt={`Evidence ${clueNumber}`}
          className="w-28 h-28 object-contain drop-shadow-2xl"
          style={{ imageRendering: 'pixelated' }}
        />
        <span className="text-sm uppercase tracking-[0.3em] text-gold font-bold">
          Clue {clueNumber} of {cluesNeeded}
        </span>
      </motion.div>
    </div>
  );
}
