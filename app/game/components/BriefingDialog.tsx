import { motion, AnimatePresence } from '../../components/motion';
import type { BriefingSection } from './BriefingScreen';
import LeadStickies from './LeadStickies';

interface BriefingDialogProps {
  show: boolean;
  sections: BriefingSection[];
  fullText: string;
  charIndex: number;
  isPlaying: boolean;
  leads?: string[];
  onClose: () => void;
  onSkip: () => void;
  onStart: () => void;
}

function SectionedText({ sections, charIndex }: { sections: BriefingSection[]; charIndex: number }) {
  let offset = 0;
  return (
    <>
      {sections.map((s, i) => {
        const start = offset;
        const end = offset + s.text.length;
        offset = end + 1; // +1 for the space join
        const visible = charIndex > start;
        if (!visible) return null;
        const sliceEnd = Math.min(charIndex - start, s.text.length);
        const showCursor = charIndex < end;
        return (
          <div key={i} className={i > 0 ? 'mt-3' : ''}>
            <p className="text-[10px] uppercase tracking-[0.2em] text-red-800/70 font-bold mb-1">{s.label}</p>
            <p className="text-sm text-gray-800 leading-relaxed">
              {s.text.slice(0, sliceEnd)}
              {showCursor && <span className="inline-block w-[2px] h-[1em] bg-red-800 align-text-bottom animate-pulse ml-[1px]" />}
            </p>
          </div>
        );
      })}
    </>
  );
}

export default function BriefingDialog({ show, sections, fullText, charIndex, isPlaying, leads, onClose, onSkip, onStart }: BriefingDialogProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-black/70" onClick={onClose} />
          <div className="relative flex items-start justify-center gap-5">
            <motion.div
              className="relative max-w-lg w-full rounded-sm p-6 pl-10 text-left"
              style={{
                background: 'repeating-linear-gradient(transparent, transparent 19px, rgba(100,140,180,0.2) 19px, rgba(100,140,180,0.2) 20px), linear-gradient(180deg, #F5E6A3 0%, #EDD98B 100%)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.05)',
                minHeight: '420px',
              }}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div className="absolute top-0 bottom-0 left-[26px] w-[1px] pointer-events-none" style={{ background: 'rgba(196,60,60,0.35)' }} />
              <div className="absolute -top-[1px] left-0 right-0 h-[4px] pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(139,119,70,0.4) 0%, transparent 100%)' }} />

              <button onClick={onClose} className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              <div className="flex items-center gap-3 mb-4">
                {isPlaying && <div className="w-2 h-2 rounded-full bg-red-700 animate-pulse" />}
                <p className="text-xs uppercase tracking-[0.3em] text-red-800 font-bold">Case Briefing</p>
              </div>

              <div className="mb-4 min-h-[280px]">
                <SectionedText sections={sections} charIndex={charIndex} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={onClose} className="text-xs text-gray-600 hover:text-gray-900 uppercase tracking-wider transition-colors">Close</button>
                  {charIndex < fullText.length && (
                    <button onClick={onSkip} className="text-xs text-gray-500 hover:text-gray-900 uppercase tracking-wider transition-colors">Skip</button>
                  )}
                </div>
                <motion.button
                  onClick={onStart}
                  className="px-5 py-2 bg-accent text-white text-xs font-bold rounded hover:bg-red-700 transition-colors uppercase tracking-wider"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Begin Interrogation
                </motion.button>
              </div>
            </motion.div>

            {charIndex >= fullText.length && leads && leads.length > 0 && (
              <LeadStickies leads={leads} />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
