import { motion, scaleIn, springy } from '../../components/motion';

interface ExitConfirmProps {
  show: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ExitConfirmDialog({ show, onConfirm, onCancel }: ExitConfirmProps) {
  if (!show) return null;
  return (
    <motion.div
      className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-surface-dark border border-accent rounded-sm p-3 w-48 z-40"
      initial="hidden"
      animate="visible"
      variants={scaleIn}
      transition={springy}
    >
      <p className="text-xs text-gray-300 mb-3">Abandon this case?</p>
      <div className="flex gap-2">
        <button onClick={onConfirm} className="flex-1 px-2 py-1.5 text-xs font-bold uppercase bg-accent text-white rounded-sm hover:bg-red-700 transition-colors">
          Leave
        </button>
        <button onClick={onCancel} className="flex-1 px-2 py-1.5 text-xs uppercase text-gray-400 border border-surface rounded-sm hover:text-foreground transition-colors">
          Stay
        </button>
      </div>
    </motion.div>
  );
}
