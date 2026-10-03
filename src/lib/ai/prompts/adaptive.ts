import text from './adaptive-text.json';
import { renderText } from './render';

export function buildAdaptiveBehavior(questionCount: number, currentStress: number): string {
  const phase = questionCount <= 3 ? text.early : questionCount <= 7 ? text.middle : text.late;
  const sections = [phase];
  if (currentStress >= 4 && currentStress < 7) sections.push(text.cagey);
  if (currentStress >= 7) sections.push(text.cornered);
  return '\n\n---\n\nADAPTIVE BEHAVIOR:\n'
    + renderText(sections.join('\n\n'), { questionCount, currentStress });
}
