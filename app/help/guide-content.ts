export const QUESTION_TIPS = [
  'Ask about a specific time, action or detail in the account. Keep the original answer available in the log.',
  'Clarify asks for detail. Leave space invites another response. Neither option establishes evidence on its own.',
  'Present evidence compares a pinned statement with an exhibit. An unrelated exhibit may be consistent with the story.',
  'Write the contradiction in your own words. Stress, long answers and nervous delivery are fictional signals, not proof.',
];

export const OUTCOMES = [
  { title: 'Case solved', image: '/clues/folder.png', description: 'The accepted accusation identifies the lie. Review the result and save a score if offered.' },
  { title: 'Time expired', image: '/clues/folder.png', description: 'The countdown reached its deadline before the case was solved.' },
  { title: 'No attempts remain', image: '/clues/folder.png', description: 'The available accusations were spent on incorrect claims.' },
  { title: 'Case abandoned', image: '/clues/folder.png', description: 'You chose to end the interrogation. The result explains the case.' },
  { title: 'Lawyer requested', image: '/clues/folder.png', description: 'Some generated-case rules allow the suspect to stop answering after sustained pressure.' },
];
