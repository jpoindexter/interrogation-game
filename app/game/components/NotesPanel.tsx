import { useRef } from 'react';
import { motion, AnimatePresence, fadeUp, fadeIn, smooth, snappy } from '../../components/motion';

interface NotesPanelProps {
  show: boolean;
  notes: string;
  pos: { x: number; y: number } | null;
  onChange: (v: string) => void;
  onClose: () => void;
  onPosChange: (pos: { x: number; y: number }) => void;
}

const LINE_HEIGHT = 24;

export default function NotesPanel({ show, notes, pos, onChange, onClose, onPosChange }: NotesPanelProps) {
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="notes-panel"
          className="absolute z-30 w-[360px] rounded-sm overflow-hidden"
          style={{
            left: pos ? pos.x : '50%',
            top: pos ? pos.y : '50%',
            transform: pos ? 'none' : 'translate(-50%, -50%)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
          }}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={snappy}
        >
          {/* Top binding strip */}
          <div
            className="flex items-center justify-between px-4 py-1.5 cursor-grab active:cursor-grabbing select-none"
            style={{ background: '#4a6a4a', borderBottom: '2px solid #3a5a3a' }}
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
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/70" style={{ fontFamily: 'var(--font-mono)' }}>Detective Notes</span>
            <button onClick={onClose} className="w-5 h-5 flex items-center justify-center text-white/50 hover:text-white transition-colors">
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M1 1L7 7M7 1L1 7" />
              </svg>
            </button>
          </div>

          {/* Notepad body */}
          <motion.div
            className="relative"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            transition={{ ...smooth, delay: 0.1 }}
          >
            {/* Yellow paper with ruled lines */}
            <div
              className="relative"
              style={{
                background: '#F5E6A3',
                backgroundImage: `repeating-linear-gradient(transparent, transparent ${LINE_HEIGHT - 1}px, #d4c080 ${LINE_HEIGHT - 1}px, #d4c080 ${LINE_HEIGHT}px)`,
                backgroundPositionY: '11px',
              }}
            >
              {/* Red margin line */}
              <div className="absolute top-0 bottom-0 left-[44px] w-[1px]" style={{ background: '#d4888870' }} />

              <textarea
                value={notes}
                onChange={(e) => onChange(e.target.value)}
                autoFocus
                placeholder="Write your notes here..."
                className="w-full h-[312px] bg-transparent focus:outline-none resize-none"
                style={{
                  fontFamily: 'var(--font-handwriting)',
                  fontSize: '14px',
                  lineHeight: `${LINE_HEIGHT}px`,
                  padding: '12px 16px 12px 52px',
                  color: '#2a2a3a',
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
