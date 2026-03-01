import { useRef, useState } from 'react';
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
const MIN_HEIGHT = 120;
const MAX_HEIGHT = 600;

export default function NotesPanel({ show, notes, pos, onChange, onClose, onPosChange }: NotesPanelProps) {
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startY: number; origH: number } | null>(null);
  const [height, setHeight] = useState(312);

  return (
    <AnimatePresence>
      {show && (
        <>
        <div key="notes-backdrop" className="fixed inset-0 z-29" onClick={onClose} />
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

          <motion.div
            className="relative"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            transition={{ ...smooth, delay: 0.1 }}
          >
            <div
              className="relative"
              style={{
                background: '#F5E6A3',
                backgroundImage: `repeating-linear-gradient(transparent, transparent ${LINE_HEIGHT - 1}px, #d4c080 ${LINE_HEIGHT - 1}px, #d4c080 ${LINE_HEIGHT}px)`,
                backgroundPositionY: '11px',
              }}
            >
              <div className="absolute top-0 bottom-0 left-[44px] w-[1px]" style={{ background: '#d4888870' }} />

              <textarea
                value={notes}
                onChange={(e) => onChange(e.target.value)}
                autoFocus
                placeholder="Write your notes here..."
                className="w-full bg-transparent focus:outline-none resize-none"
                style={{
                  fontFamily: 'var(--font-handwriting)',
                  fontSize: '14px',
                  lineHeight: `${LINE_HEIGHT}px`,
                  padding: '12px 16px 12px 52px',
                  color: '#2a2a3a',
                  height,
                }}
              />
            </div>
          </motion.div>
          <div
            className="h-2 cursor-ns-resize flex items-center justify-center select-none"
            style={{ background: '#4a6a4a', borderTop: '1px solid #3a5a3a' }}
            onMouseDown={(e) => {
              e.preventDefault();
              resizeRef.current = { startY: e.clientY, origH: height };
              const onMove = (ev: MouseEvent) => {
                if (!resizeRef.current) return;
                const newH = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, resizeRef.current.origH + (ev.clientY - resizeRef.current.startY)));
                setHeight(newH);
              };
              const onUp = () => {
                resizeRef.current = null;
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
          >
            <div className="w-8 h-[2px] rounded-full bg-white/30" />
          </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
