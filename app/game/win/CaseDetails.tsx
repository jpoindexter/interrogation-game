import { motion } from 'framer-motion';
import { Spinner } from '../../components/ui';

interface CaseDetailsProps {
  suspectName: string;
  suspectRole: string;
  confession: string;
  evaluation: {
    reveal_the_lie: string;
    reveal_the_truth: string;
    reveal_the_clue: string;
  } | null;
  revealStep: number;
}

export default function CaseDetails({ suspectName, suspectRole, confession, evaluation, revealStep }: CaseDetailsProps) {
  return (
    <>
      {confession && (
        <motion.div
          className="bg-surface-dark/80 backdrop-blur-sm rounded-sm p-6 sm:p-8 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={revealStep >= 5 ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h2 className="text-xs uppercase tracking-[0.3em] text-accent mb-1">{suspectName}</h2>
          <p className="text-xs text-gray-500 mb-3">{suspectRole}</p>
          <p className="text-base leading-relaxed italic text-gray-200">&ldquo;{confession}&rdquo;</p>
        </motion.div>
      )}

      {evaluation ? (
        <motion.div
          className="bg-surface-dark/80 backdrop-blur-sm rounded-sm p-6 sm:p-8 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={revealStep >= 5 ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1.0 }}
        >
          <div>
            <h3 className="text-xs uppercase tracking-[0.3em] text-accent mb-1">The Lie</h3>
            <p className="text-sm text-gray-300">&ldquo;{evaluation.reveal_the_lie}&rdquo;</p>
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-1">The Truth</h3>
            <p className="text-sm text-gray-300">{evaluation.reveal_the_truth}</p>
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-1">How You Caught It</h3>
            <p className="text-sm text-gray-400">{evaluation.reveal_the_clue}</p>
          </div>
        </motion.div>
      ) : (
        <div className="flex justify-center py-12"><Spinner /></div>
      )}
    </>
  );
}
