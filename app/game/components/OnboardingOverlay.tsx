'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, fadeUp, snappy } from '../../components/motion';

const STEPS = [
  {
    text: 'This is your suspect. Ask questions to find the lie.',
    target: 'top',    // suspect avatar area
    align: 'center' as const,
  },
  {
    text: 'Tap the mic to speak, or use the keyboard icon to type.',
    target: 'bottom', // dock area
    align: 'center' as const,
  },
  {
    text: 'Watch the stress meter \u2014 higher stress means you\u2019re getting close.',
    target: 'top',    // top bar area
    align: 'left' as const,
  },
  {
    text: 'Collect all clues to unlock the ACCUSE button.',
    target: 'right',  // case file area
    align: 'right' as const,
  },
  {
    text: 'Good luck, detective.',
    target: 'center',
    align: 'center' as const,
  },
];

interface OnboardingOverlayProps {
  onClose: () => void;
}

export default function OnboardingOverlay({ onClose }: OnboardingOverlayProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  const finish = useCallback(() => {
    localStorage.setItem('onboardingComplete', 'true');
    onClose();
  }, [onClose]);

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  const getPositionClasses = () => {
    switch (current.target) {
      case 'top':
        return 'top-[30%] left-1/2 -translate-x-1/2';
      case 'bottom':
        return 'bottom-[20%] left-1/2 -translate-x-1/2';
      case 'right':
        return 'top-1/2 -translate-y-1/2 right-8 lg:right-[calc(25%-140px)]';
      case 'center':
      default:
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    }
  };

  const arrowCls: Record<string, string> = {
    top: 'border-b-surface-dark -top-4 left-1/2 -translate-x-1/2',
    bottom: 'border-t-surface-dark -bottom-4 left-1/2 -translate-x-1/2',
    right: 'border-l-surface-dark -right-4 top-1/2 -translate-y-1/2',
  };
  const arrow = arrowCls[current.target];
  const getArrow = () => arrow
    ? <span className={`absolute w-0 h-0 border-8 border-transparent ${arrow}`} />
    : null;

  return (
    <div className="fixed inset-0 z-40" onClick={next}>
      <motion.div
        className="absolute inset-0 bg-black/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className={`absolute z-50 w-[280px] ${getPositionClasses()}`}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={snappy}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative bg-surface-dark border border-gold/30 rounded-sm p-4">
            {getArrow()}

            {current.target !== 'center' && (
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60 mb-2">
                Step {step + 1} of {STEPS.length - 1}
              </p>
            )}

            <p className={`text-sm text-foreground leading-relaxed ${
              current.target === 'center' ? 'text-center text-gold text-base font-bold' : ''
            }`}>
              {current.text}
            </p>

            <div className="flex items-center justify-between mt-4">
              <button onClick={finish} className="text-gray-600 text-xs uppercase tracking-wider hover:text-gray-400 transition-colors">
                Skip
              </button>

              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i === step ? 'bg-gold' : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={next}
                className="bg-gold text-black font-bold text-xs uppercase tracking-wider px-4 py-2 hover:bg-gold-hover transition-colors"
              >
                {step < STEPS.length - 1 ? 'Next' : 'Start'}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
