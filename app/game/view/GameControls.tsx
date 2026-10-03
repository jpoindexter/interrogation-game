import type { GameController } from '../controller/useGameController';
import Dock from '../components/Dock';
import RecordingRecovery from '../components/RecordingRecovery';
import type { DockActions } from '../components/dock-types';

function dockHandlers(model: GameController): DockActions {
  return {
    mic: () => {
      model.sfx(model.isListening ? 'mic_off' : 'mic_on');
      if (model.isListening) model.stopListening();
      else model.startListening();
    },
    type: () => {
      model.sfx(model.showTextInput ? 'close' : 'click_short');
      model.setShowTextInput(!model.showTextInput);
    },
    notes: () => {
      model.sfx(model.showNotes ? 'close' : 'paper');
      model.setShowNotes(!model.showNotes);
    },
    hint: model.requestHint,
    accuse: () => {
      if (model.isAccusing && model.isListening) { model.stopListening(); return; }
      model.sfx('slam');
      model.setShowAccuseConfirm(true);
    },
    settings: () => {
      model.sfx(model.showSettings ? 'close' : 'click_short');
      model.setShowSettings(!model.showSettings);
    },
    giveUp: () => { model.sfx('click'); model.setShowGiveUpConfirm(true); },
    help: () => {
      model.sfx(model.showHelp ? 'close' : 'click_short');
      model.setShowHelp(!model.showHelp);
    },
    exit: () => { model.sfx('click'); model.setShowExitConfirm(true); },
  };
}

export function GameControls(model: GameController) {
  return <>
    <RecordingRecovery recovery={model.recordingRecovery} onRetry={model.retryTranscription}
      onDiscard={model.cancelRecording} disabled={model.phase !== 'active' || model.isSpeaking} />
    <Dock
    input={{
      listening: model.isListening,
      speaking: model.isSpeaking,
      accusing: model.isAccusing,
      phase: model.phase,
    }}
    panels={{
      text: model.showTextInput,
      notes: model.showNotes,
      settings: model.showSettings,
      accuseConfirm: model.showAccuseConfirm,
    }}
    progress={{
      hasCase: Boolean(model.caseData),
      clues: model.clues.length,
      required: model.cluesNeeded,
      accusationsLeft: model.accusationsLeft,
      hintsUsed: model.hintsUsed,
    }}
    actions={dockHandlers(model)}
    />
  </>;
}
