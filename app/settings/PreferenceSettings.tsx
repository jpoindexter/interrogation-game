import { motion, fadeUp, smooth } from '../components/motion';
import { playClick } from '../lib/sfx-utils';
import type { useSettingsPage } from './useSettingsPage';

type SettingsModel = ReturnType<typeof useSettingsPage>;

function ChoiceSetting<T extends string>({ label, description, value, choices, onChange }: {
  label: string;
  description: string;
  value: T;
  choices: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <motion.div variants={fadeUp} transition={smooth} className="bg-surface-darker border border-surface-dark rounded-sm p-6">
      <h3 className="text-sm text-gray-300 font-bold mb-1">{label}</h3>
      <p className="text-xs text-gray-500 mb-4">{description}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {choices.map(choice => (
          <motion.button key={choice.value} aria-pressed={value === choice.value} whileHover={{ scale: 1.03 }}
            onClick={() => { playClick(); onChange(choice.value); }}
            className={`flex-1 px-3 py-2 text-xs uppercase tracking-wider rounded-sm transition-colors ${value === choice.value ? 'bg-accent text-white' : 'bg-surface text-gray-400 hover:text-foreground'}`}>
            {choice.label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

export default function PreferenceSettings({ settings, update }: SettingsModel) {
  return <>
    <ChoiceSetting label="Text Size" description="Scale dialogue, reports, and interface text across screens" value={settings.fontSize}
      choices={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]}
      onChange={fontSize => update({ fontSize })} />
    <ChoiceSetting label="Font" description="Choose your preferred typeface" value={settings.fontFamily}
      choices={[{ value: 'mono', label: 'Mono' }, { value: 'dyslexia', label: 'Dyslexia' }, { value: 'sans', label: 'Sans' }]}
      onChange={fontFamily => update({ fontFamily })} />
    <ChoiceSetting label="Play mode" description="Applies when starting a new case. The chosen difficulty stays the same."
      value={settings.playMode} choices={[{ value: 'challenge', label: 'Timed challenge' }, { value: 'relaxed', label: 'Relaxed' }, { value: 'endurance', label: 'Endurance' }]}
      onChange={playMode => update({ playMode, timerMode: playMode === 'challenge' ? 'countdown' : 'unlimited' })} />
    <p className="text-sm text-gray-300">{settings.playMode === 'challenge'
      ? 'Timed challenge uses a countdown and can qualify for the leaderboard.'
      : settings.playMode === 'relaxed'
        ? 'Relaxed has no deadline or pressure-triggered lawyer ending. Time does not reduce your score. This mode is unranked.'
        : 'Endurance has no deadline. On Hard and Expert, four successive turns at stress 8 or higher end the interview with a lawyer request. This mode is unranked.'}</p>
    {settings.timerMode === 'unlimited' && <p className="text-xs text-warn">More turns can use more provider allowance. Unlimited does not mean unlimited provider usage.</p>}
  </>;
}
