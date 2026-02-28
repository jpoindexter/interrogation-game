import { useRef } from 'react';
import CloseIcon from './CloseIcon';
import { motion, AnimatePresence, fadeUp, fadeIn, smooth, snappy } from '../../components/motion';

interface NotesPanelProps {
  show: boolean;
  notes: string;
  pos: { x: number; y: number } | null;
  onChange: (v: string) => void;
  onClose: () => void;
  onPosChange: (pos: { x: number; y: number }) => void;
}

export default function NotesPanel({ show, notes, pos, onChange, onClose, onPosChange }: NotesPanelProps) {
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="notes-panel"
          className="absolute z-30 w-[400px] bg-surface-darker border border-surface rounded-sm shadow-2xl"
          style={{
            left: pos ? pos.x : '50%',
            top: pos ? pos.y : '50%',
            transform: pos ? 'none' : 'translate(-50%, -50%)',
          }}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={snappy}
        >
          <div
            className="flex items-center justify-between px-4 py-2 border-b border-surface cursor-grab active:cursor-grabbing select-none"
            onMouseDown={(e) => {
              const panel = e.currentTarget.parentElement!;
              const rect = panel.getBoundingClientRect();
              const parentRect = panel.offsetParent!.getBoundingClientRect();
              dragRef.current = {
                startX: e.clientX, startY: e.clientY,
                origX: rect.left - parentRect.left, origY: rect.top - parentRect.top,
              };
              const onMove = (ev: MouseEvent) => {
                if (!dragRef.current) return;
                onPosChange({
                  x: dragRef.current.origX + (ev.clientX - dragRef.current.startX),
                  y: dragRef.current.origY + (ev.clientY - dragRef.current.startY),
                });
              };
              const onUp = () => {
                dragRef.current = null;
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
          >
            <span className="text-xs uppercase tracking-[0.2em] text-gray-500">Detective Notes</span>
            <button onClick={onClose} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-foreground transition-colors">
              <CloseIcon />
            </button>
          </div>
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            transition={{ ...smooth, delay: 0.1 }}
          >
            <textarea
              value={notes}
              onChange={(e) => onChange(e.target.value)}
              autoFocus
              placeholder="Write your notes here..."
              className="w-full h-[300px] bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder-gray-600 focus:outline-none resize-none"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
