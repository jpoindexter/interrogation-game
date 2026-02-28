import { motion, AnimatePresence } from '../../components/motion';
import CloseIcon from './CloseIcon';

interface MicPermissionBannerProps {
  show: boolean;
  onDismiss: () => void;
}

export default function MicPermissionBanner({ show, onDismiss }: MicPermissionBannerProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="px-3 py-2 border-b border-gold/30 bg-gold/10 flex items-start gap-2 text-xs"
        >
          <span className="text-gold shrink-0 mt-px">&#9432;</span>
          <p className="text-gold/90 flex-1 leading-relaxed">
            Tap the mic button and allow access to question the suspect by voice, or use the keyboard icon to type.
          </p>
          <button
            onClick={onDismiss}
            className="text-gold/60 hover:text-gold shrink-0 mt-px transition-colors"
            aria-label="Dismiss"
          >
            <CloseIcon />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
