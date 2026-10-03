'use client';
import { ConversationPath } from '../result/ConversationPath';
import { useResult } from '../result/use-result';
import { ResultRecovery, ResultFrame, ResultStatus } from '../result/ResultFrame';
import { ResultActions } from '../result/ResultActions';
import { lossPresentation } from '../result/loss-presentation';
import { LossDetails } from './LossDetails';

export default function LosePage() {
  const { result, evaluation, error, retry, recoveryPending, recoveryError, retryRecovery } = useResult('lose');
  if (!result) return <ResultRecovery pending={recoveryPending} error={recoveryError} retry={retryRecovery} />;
  const presentation = lossPresentation(result, evaluation);
  return <ResultFrame artwork={presentation.artwork} caseNumber={result.caseData.case_number} title={presentation.title}>
    {evaluation ? <LossDetails result={result} evaluation={evaluation} /> : <ResultStatus error={error} retry={retry} />}
    {evaluation && <ConversationPath evaluation={evaluation} />}
    <ResultActions result={result} difficulty={evaluation?.stats.difficulty || result.difficulty || result.caseData.difficulty || 'medium'} won={false} />
  </ResultFrame>;
}
