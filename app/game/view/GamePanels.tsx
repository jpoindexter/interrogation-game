import type { GameController } from '../controller/useGameController';
import AccuseConfirmDialog from '../components/AccuseConfirmDialog';
import ClueNotification from '../components/ClueNotification';
import ExitConfirmDialog from '../components/ExitConfirmDialog';
import GiveUpConfirmDialog from '../components/GiveUpConfirmDialog';
import HelpPanel from '../components/HelpPanel';
import NotesPanel from '../components/NotesPanel';
import SettingsPanel from '../components/SettingsPanel';
import TextInputPanel from '../components/TextInputPanel';

function ConfirmationPanels(m: GameController) {
  return <>
    <ExitConfirmDialog show={m.showExitConfirm} onConfirm={m.exitGame}
      onCancel={() => m.setShowExitConfirm(false)} />
    <GiveUpConfirmDialog show={m.showGiveUpConfirm} onConfirm={m.handleGiveUp}
      onCancel={() => m.setShowGiveUpConfirm(false)} />
    <AccuseConfirmDialog show={m.showAccuseConfirm} accusationsLeft={m.accusationsLeft}
      accuseText={m.accuseText} onChange={m.setAccuseText}
      onSubmitText={text => {
        m.setShowAccuseConfirm(false);
        m.setIsAccusing(true);
        void m.submitAccusation(text);
      }}
      onVoice={() => { m.setShowAccuseConfirm(false); m.startAccusation(); }}
      onCancel={() => m.setShowAccuseConfirm(false)}
      onClickOutside={() => m.setShowAccuseConfirm(false)} />
  </>;
}

function UtilityPanels(m: GameController) {
  return <>
    <NotesPanel show={m.showNotes} notes={m.notes} pos={m.notesPos}
      onChange={m.setNotes} onClose={() => m.setShowNotes(false)} onPosChange={m.setNotesPos} />
    <SettingsPanel show={m.showSettings} settings={m.settings} pos={m.settingsPos}
      onSettingsChange={m.updateSettings} onClose={() => m.setShowSettings(false)} onPosChange={m.setSettingsPos} />
    <HelpPanel authored={m.caseData?.mode === 'redteam' || Boolean(m.gameplay)} playMode={m.caseData?.playMode} show={m.showHelp} pos={m.helpPos} cluesNeeded={m.cluesNeeded}
      isUnlimited={m.isUnlimited} difficulty={m.difficulty}
      onClose={() => m.setShowHelp(false)} onPosChange={m.setHelpPos} />
  </>;
}

export function GamePanels(m: GameController) {
  return <>
    <ClueNotification authored={m.caseData?.mode === 'redteam' || Boolean(m.gameplay)} clueNumber={m.clueNotification} cluesNeeded={m.cluesNeeded} />
    <TextInputPanel value={m.questionDraft} setValue={m.setQuestionDraft} show={m.showTextInput} disabled={m.phase !== 'active' || m.isSpeaking || m.isAccusing}
      onSubmit={text => { m.sfx('click_short'); return m.sendQuestion(text); }}
      onMic={() => { m.setShowTextInput(false); m.startListening(); }}
      onClickOutside={() => m.setShowTextInput(false)} />
    <ConfirmationPanels {...m} />
    <UtilityPanels {...m} />
  </>;
}
