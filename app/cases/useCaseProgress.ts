import { useBrowserStorage } from '../components/useBrowserStorage';
import { summarizeCaseProgress } from './case-progress';

export function useCaseProgress() {
  const history = useBrowserStorage('caseHistory');
  const solved = useBrowserStorage('solvedCases');
  return summarizeCaseProgress(history, solved);
}
