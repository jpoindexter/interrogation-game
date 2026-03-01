import { motion, scaleIn, springy } from '../../components/motion';

interface GiveUpConfirmProps {
  show: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function GiveUpConfirmDialog({ show, onConfirm, onCancel }: GiveUpConfirmProps) {
  if (!show) return null;
  return (
    <>
    <div className="fixed inset-0 z-39" onClick={onCancel} />
    <motion.div
      className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-surface-dark border border-accent rounded-sm p-3 w-64 z-40"
      initial="hidden"
      animate="visible"
      variants={scaleIn}
      transition={springy}
    >
      <p className="text-xs text-gray-300 mb-3">Surrender? You&apos;ll see what you missed, but it counts as a loss.</p>
      <div className="flex gap-2">
        <button onClick={onConfirm} className="flex-1 px-2 py-1.5 text-xs font-bold uppercase bg-accent text-white rounded-sm hover:bg-red-700 transition-colors">
          I Give Up
        </button>
        <button onClick={onCancel} className="flex-1 px-2 py-1.5 text-xs uppercase bg-surface text-gray-400 rounded-sm hover:text-foreground transition-colors">
          Keep Going
        </button>
      </div>
    </motion.div>
    </>
  );
}
