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
        className="flex flex-col items-center gap-2"
        initial="hidden"
        animate="visible"
        variants={scaleIn}
        transition={{ ...springy, stiffness: 400, damping: 15 }}
      >
        <img
          src={clueIcons[clueNumber - 1] || clueIcons[0]}
          alt={`Evidence ${clueNumber}`}
          className="w-36 h-36 object-contain drop-shadow-2xl"
          style={{ imageRendering: 'pixelated' }}
        />
        <span className="text-xs uppercase tracking-[0.3em] text-gold font-bold">
          Clue {clueNumber} of {cluesNeeded}
        </span>
      </motion.div>
    </div>
  );
}
