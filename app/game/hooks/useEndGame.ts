import type { EndGameDeps } from './endgame-types';
import { useExitCeremony } from './useExitCeremony';
import { endings } from './end-remark';
import { useEndRequest } from './useEndRequest';

export function useEndGame(deps: EndGameDeps) {
  const exit = useExitCeremony(deps);
  const request = useEndRequest(deps, exit);
  return {
    endGameError: request.endGameError, retryEnd: request.retryEnd,
    handleLose: () => request.run(endings.accusations),
    handleTimeUp: () => request.run(endings.time),
    handleGiveUp: () => { deps.setShowGiveUpConfirm(false); return request.run(endings.giveup); },
    handleLawyerUp: () => request.run({ ...endings.accusations, extra: { lawyeredUp: true } }),
  };
}
