import type { Evaluation, GameResult } from './types';
const lossCopy = {
  lose_lawyer: { artwork: '/clues/folder.png', title: 'The suspect lawyered up. Interview over.', label: 'Lawyered up' },
  lose_time: { artwork: '/clues/folder.png', title: 'Time’s up. The suspect walks free.', label: 'Time expired' },
  lose_giveup: { artwork: '/clues/folder.png', title: 'You ended the interview. The suspect walks free.', label: 'Surrendered' },
  lose_accusations: { artwork: '/clues/folder.png', title: 'Out of accusations. The suspect walks free.', label: 'Out of attempts' },
};
export function lossPresentation(result: GameResult, evaluation?: Evaluation) {
  const outcome = evaluation?.outcome || (result.lawyeredUp ? 'lose_lawyer' : result.timeUp ? 'lose_time'
    : result.gaveUp ? 'lose_giveup' : 'lose_accusations');
  return lossCopy[outcome === 'win' ? 'lose_accusations' : outcome];
}
