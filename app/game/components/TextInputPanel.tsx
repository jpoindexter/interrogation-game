import { useSfx } from '../hooks/useSfx';
import type { Dispatch, SetStateAction } from 'react';
import QuestionForm from './QuestionForm';
import { motion, AnimatePresence, fadeUp, smooth } from '../../components/motion';

interface TextInputPanelProps {
  value: string;
  setValue: Dispatch<SetStateAction<string>>;
  show: boolean;
  disabled: boolean;
  onSubmit: (v: string) => boolean | Promise<boolean>;
  onMic?: () => void;
  onClickOutside?: () => void;
}

export default function TextInputPanel({ show, disabled, onSubmit, onMic, onClickOutside, value, setValue }: TextInputPanelProps) {
  const sfx = useSfx();
  const playKeystroke = () => sfx('typewriter');

  return (
    <AnimatePresence>
      {show && (
        <>
        {onClickOutside && <div key="text-input-backdrop" className="fixed inset-0 z-29" onClick={onClickOutside} />}
        <motion.div
          key="text-input-panel"
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={smooth}
        >
          <QuestionForm
            value={value}
            disabled={disabled}
            onSubmit={onSubmit}
            setValue={setValue}
            playKeystroke={playKeystroke}
            onMic={onMic}
            onClose={onClickOutside}
          />
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
