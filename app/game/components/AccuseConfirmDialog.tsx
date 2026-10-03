import { useId } from 'react';
import { useSfx } from '../hooks/useSfx';
import ModalSurface from '../../components/ModalSurface';
import { motion, AnimatePresence, fadeUp, smooth } from '../../components/motion';

interface AccuseConfirmProps {
  show: boolean;
  accusationsLeft: number;
  accuseText: string;
  onChange: (value: string) => void;
  onSubmitText: (value: string) => void;
  onVoice: () => void;
  onCancel: () => void;
  onClickOutside?: () => void;
}

export default function AccuseConfirmDialog(props: AccuseConfirmProps) {
  return (
    <AnimatePresence>
      {props.show && (
        <ModalSurface label="Make an accusation" onClose={props.onCancel}>
          <div className="fixed inset-0 z-39 bg-black/50" onClick={props.onClickOutside || props.onCancel} />
          <motion.div
            className="fixed left-1/2 top-1/2 z-40 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 px-4"
            variants={fadeUp} initial="hidden" animate="visible" exit="hidden" transition={smooth}>
            <AccusationForm {...props} />
          </motion.div>
        </ModalSurface>
      )}
    </AnimatePresence>
  );
}

function AccusationForm(props: AccuseConfirmProps) {
  const { accuseText, accusationsLeft, onChange, onSubmitText } = props;
  const id = useId();
  const sfx = useSfx();
  return (
    <form onSubmit={event => {
      event.preventDefault();
      if (accuseText.trim()) onSubmitText(accuseText.trim());
    }} className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-accent bg-surface-dark p-5 shadow-2xl">
      <h2 className="text-lg font-bold text-foreground">Make an accusation</h2>
      <p className="mt-1 text-sm text-gold">{accusationsLeft} attempt{accusationsLeft !== 1 ? 's' : ''} left</p>
      <p id={`${id}-help`} className="mt-3 text-sm text-gray-300">
        Explain what they lied about, what actually happened, and which evidence supports your accusation.
      </p>
      <label htmlFor={id} className="mt-4 block text-sm font-bold text-foreground">Your accusation</label>
      <textarea id={id} value={accuseText} rows={4} maxLength={1000} autoFocus
        aria-describedby={`${id}-help ${id}-count`}
        onChange={event => { sfx('typewriter'); onChange(event.target.value); }}
        placeholder="You said… but the evidence shows…"
        className="mt-2 w-full resize-y rounded-lg border border-surface bg-black/30 p-3 text-sm text-foreground placeholder-gray-400" />
      <p id={`${id}-count`} className="mt-1 text-right text-xs text-gray-400">{accuseText.length}/1000 characters</p>
      <AccusationActions {...props} />
    </form>
  );
}

function AccusationActions({ accuseText, onVoice, onCancel }: Pick<AccuseConfirmProps, 'accuseText' | 'onVoice' | 'onCancel'>) {
  const button = 'min-h-11 rounded-lg px-4 py-2 text-sm transition-colors';
  return (
    <div className="mt-4 flex flex-wrap justify-end gap-2">
      <button type="button" onClick={onCancel} className={`${button} text-gray-300 hover:bg-surface`}>Cancel</button>
      <button type="button" onClick={onVoice} className={`${button} border border-surface text-foreground hover:bg-surface-hover`}>
        Record accusation
      </button>
      <button type="submit" disabled={!accuseText.trim()}
        className={`${button} bg-accent text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40`}>
        Submit accusation
      </button>
    </div>
  );
}
