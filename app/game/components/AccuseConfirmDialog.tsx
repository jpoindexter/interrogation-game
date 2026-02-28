import { motion, scaleIn, fadeUp, springy, snappy } from '../../components/motion';

interface AccuseConfirmProps {
  show: boolean;
  accusationsLeft: number;
  accuseText: string;
  onChange: (v: string) => void;
  onSubmitText: (v: string) => void;
  onVoice: () => void;
  onCancel: () => void;
}

export default function AccuseConfirmDialog({ show, accusationsLeft, accuseText, onChange, onSubmitText, onVoice, onCancel }: AccuseConfirmProps) {
  if (!show) return null;
  return (
    <motion.div
      className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-surface-dark border border-accent rounded-sm p-4 w-80 z-40"
      initial="hidden"
      animate="visible"
      variants={scaleIn}
      transition={springy}
    >
      <motion.p
        className="text-xs text-gray-300 mb-3"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ ...snappy, delay: 0.1 }}
      >
        You have <span className="text-accent font-bold">{accusationsLeft}</span> attempt{accusationsLeft !== 1 ? 's' : ''} left. State exactly what you think they lied about.
      </motion.p>
      <textarea
        value={accuseText}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your accusation here..."
        className="w-full bg-surface-darker border border-surface rounded-sm p-2 text-sm text-foreground placeholder-gray-600 resize-none mb-3 focus:outline-none focus:border-accent"
        rows={2}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && accuseText.trim()) {
            e.preventDefault();
            onSubmitText(accuseText.trim());
          }
        }}
      />
      <div className="flex gap-2">
        <button
          onClick={() => { if (accuseText.trim()) onSubmitText(accuseText.trim()); }}
          disabled={!accuseText.trim()}
          className="flex-1 px-2 py-1.5 text-xs font-bold uppercase bg-accent text-white rounded-sm hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit
        </button>
        <button
          onClick={onVoice}
          className="flex-1 px-2 py-1.5 text-xs font-bold uppercase bg-surface text-white rounded-sm hover:bg-surface-hover transition-colors flex items-center justify-center gap-1"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
          </svg>
          Voice
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 text-xs uppercase text-gray-400 border border-surface rounded-sm hover:text-foreground transition-colors">
          Cancel
        </button>
      </div>
    </motion.div>
  );
}
