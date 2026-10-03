'use client';
import { formatTime } from '../components/utils';
import { ScoreSubmission } from './ScoreSubmission';
import ScoreBreakdown from './ScoreBreakdown';
import CaseDetails from './CaseDetails';
import { ConversationPath } from '../result/ConversationPath';
import { useResult } from '../result/use-result';
import { ResultRecovery, ResultFrame, ResultStatus } from '../result/ResultFrame';
import { ResultActions } from '../result/ResultActions';

export default function WinPage() {
  const { result, evaluation, error, retry, recoveryPending, recoveryError, retryRecovery } = useResult('win');
  if (!result) return <ResultRecovery pending={recoveryPending} error={recoveryError} retry={retryRecovery} />;
  const title = evaluation ? `Cracked in ${formatTime(evaluation.stats.timeElapsed)}` : 'Case result';
  return <ResultFrame artwork="/clues/folder.png" caseNumber={result.caseData.case_number} title={title}>
    {evaluation ? <>
      <ScoreBreakdown stats={evaluation.stats} />
      <CaseDetails suspectName={result.caseData.suspect_name} suspectRole={result.caseData.suspect_role}
        confession={result.confession} evaluation={evaluation} />
      <ScoreSubmission result={result} evaluation={evaluation} />
    </> : <ResultStatus error={error} retry={retry} />}
    {evaluation && <ConversationPath evaluation={evaluation} />}
    <ResultActions result={result} difficulty={evaluation?.stats.difficulty || result.difficulty || 'medium'} won />
  </ResultFrame>;
}
