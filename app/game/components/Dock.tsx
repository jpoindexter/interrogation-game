import { MicIcon, KeyboardIcon, PenIcon, HintIcon, AccuseIcon, GearIcon, FlagIcon, ExitIcon } from './icons';
import { motion, fadeUp, stagger, snappy } from '../../components/motion';
import type { DockAction, DockProps } from './dock-types';

function RecordingStop() { return <div className="w-4 h-4 bg-white rounded-sm" />; }

function accusationAction({ input, panels, progress, actions }: DockProps, busy: boolean): DockAction {
  const available = progress.accusationsLeft > 0 && progress.clues >= progress.required;
  const recording = input.accusing && input.listening;
  let label = `Accuse (${progress.accusationsLeft})`;
  if (!available) label = 'Collect more evidence or no attempts remain';
  if (recording) label = 'Stop recording accusation';
  return {
    id: 'accuse', label,
    icon: recording ? <RecordingStop /> : <AccuseIcon />,
    onClick: actions.accuse,
    disabled: input.accusing ? !input.listening : busy || !available || panels.accuseConfirm,
    selected: input.accusing,
    className: 'text-accent',
  };
}

function conversationActions({ input, panels, actions }: DockProps, busy: boolean): DockAction[] {
  return [
    {
      id: 'mic', label: input.listening ? 'Stop recording' : 'Speak',
      icon: input.listening ? <RecordingStop /> : <MicIcon />,
      onClick: actions.mic, disabled: busy || input.accusing, selected: input.listening,
    },
    { id: 'type', label: 'Type', icon: <KeyboardIcon />, onClick: actions.type, selected: panels.text },
  ];
}

function investigationActions(props: DockProps, busy: boolean): DockAction[] {
  const { panels, progress, actions } = props;
  return [
    { id: 'notes', label: 'Notes', icon: <PenIcon />, onClick: actions.notes, selected: panels.notes },
    {
      id: 'hint', label: `Hint (${progress.hintsUsed}/${progress.required})`, icon: <HintIcon />,
      onClick: actions.hint,
      disabled: busy || !progress.hasCase || progress.hintsUsed >= progress.required,
      className: 'text-warn',
    },
    accusationAction(props, busy),
  ];
}

function utilityActions({ panels, actions }: DockProps, busy: boolean): DockAction[] {
  return [
    { id: 'settings', label: 'Settings', icon: <GearIcon />, onClick: actions.settings, selected: panels.settings },
    { id: 'help', label: 'How to Play', icon: <HintIcon />, onClick: actions.help },
    { id: 'giveUp', label: 'Give Up', icon: <FlagIcon />, onClick: actions.giveUp, disabled: busy },
    { id: 'exit', label: 'Exit', icon: <ExitIcon />, onClick: actions.exit },
  ];
}

function dockActions(props: DockProps): DockAction[] {
  const busy = props.input.phase === 'processing' || props.input.speaking;
  return [...conversationActions(props, busy), ...investigationActions(props, busy), ...utilityActions(props, busy)];
}

function DockButton({ action }: { action: DockAction }) {
  return <motion.button
    variants={fadeUp}
    whileHover={{ scale: 1.05 }}
    transition={snappy}
    onClick={action.onClick}
    disabled={action.disabled}
    data-tooltip={action.label}
    aria-label={action.label}
    aria-pressed={action.selected}
    className={`dock-icon bg-surface ${action.selected ? 'text-foreground ring-1 ring-gold' : 'text-gray-300'} ${action.className || ''} disabled:opacity-40 disabled:cursor-not-allowed`}
  >
    {action.icon}
  </motion.button>;
}

export default function Dock(props: DockProps) {
  return <motion.div
    className="flex-shrink-0 flex justify-center p-3 border-t border-surface-darker"
    initial="hidden" animate="visible" variants={fadeUp} transition={snappy}
  >
    <motion.div
      className="flex max-w-full flex-wrap justify-center items-end gap-1 px-3 py-2 bg-surface-dark/80 backdrop-blur-sm border border-surface-darker rounded-2xl"
      variants={stagger(0.04)} initial="hidden" animate="visible"
    >
      {dockActions(props).map(action => <DockButton key={action.id} action={action} />)}
    </motion.div>
  </motion.div>;
}
