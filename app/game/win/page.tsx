'use client';
import { ScoreSubmission } from './ScoreSubmission';
import WinReveal from './WinReveal';
import { useResult } from '../result/use-result';
import { ResultRecovery, ResultFrame, ResultStatus } from '../result/ResultFrame';
import { ResultActions } from '../result/ResultActions';

export default function WinPage() {
  const { result, evaluation, error, retry, recoveryPending, recoveryError, retryRecovery } = useResult('win');
  if (!result) return <ResultRecovery pending={recoveryPending} error={recoveryError} retry={retryRecovery} />;
  const title = evaluation ? 'Case solved' : 'Case result';
  return <ResultFrame artwork="/clues/folder.png" caseNumber={result.caseData.case_number} title={title}>
    {evaluation ? <WinReveal result={result} evaluation={evaluation}>
      <ScoreSubmission result={result} evaluation={evaluation} />
    </WinReveal> : <ResultStatus error={error} retry={retry} />}
    <ResultActions result={result} difficulty={evaluation?.stats.difficulty || result.difficulty || 'medium'} won />
  </ResultFrame>;
}
