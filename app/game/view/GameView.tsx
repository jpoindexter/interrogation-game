import EvidenceWorkbench from '../playbook/EvidenceWorkbench';
import type { GameController } from '../controller/useGameController';
import TopBar from '../components/TopBar';
import MicPermissionBanner from '../components/MicPermissionBanner';
import SuspectZone from '../components/SuspectZone';
import CaseFile from '../components/CaseFile';
import OnboardingOverlay from '../components/OnboardingOverlay';
import LoadingScreen from '../components/LoadingScreen';
import CasePreparationError from '../components/CasePreparationError';
import BriefingScreen from '../components/BriefingScreen';
import { motion, fadeIn, smooth } from '../../components/motion';
import { GamePanels } from './GamePanels';
import { GameControls } from './GameControls';
import { GameFeedback } from './GameFeedback';

function CaseLayout(model: GameController) {
  if (!model.caseData) return null;
  return <div className="flex-1 min-h-0 flex flex-col overflow-y-auto lg:grid lg:grid-cols-3 lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
    <SuspectZone caseData={model.caseData} stressLevel={model.stressLevel}
      isSpeaking={model.isSpeaking} isListening={model.isListening} lastTranscript={model.lastTranscript}
      lastResponse={model.lastResponse} phase={model.phase} onSkipSpeech={model.skipSpeech} />
    {model.gameplay ? <div className="shrink-0 lg:col-span-1 lg:min-h-0 lg:overflow-y-auto">
      <EvidenceWorkbench publicProjection={model.gameplay} onPin={model.evidenceGameplay.onPin}
        onAction={model.evidenceGameplay.onAction} disabled={model.phase !== 'active' || model.isSpeaking || model.isListening} />
    </div> : <div className="shrink-0 min-h-96 h-[60dvh] pl-8 lg:pl-0 lg:min-h-0 lg:h-full"><CaseFile caseData={model.caseData} clues={model.clues} clueIcons={model.clueIcons}
      cluesNeeded={model.cluesNeeded} hintsUsed={model.hintsUsed} hintTexts={model.hintTexts}
      conversationHistory={model.conversationHistory} /></div>}
  </div>;
}

function ActiveGame(model: GameController) {
  const { settings } = model;
  const font = settings.fontFamily === 'dyslexia' ? '"OpenDyslexic", sans-serif'
    : settings.fontFamily === 'sans' ? 'system-ui, sans-serif' : 'var(--font-mono)';
  const size = settings.fontSize === 'small' ? 'text-xs' : settings.fontSize === 'large' ? 'text-lg' : 'text-base';
  return <motion.div initial="hidden" animate="visible" variants={fadeIn} transition={smooth}
    className={`h-dvh flex flex-col overflow-hidden max-w-[1400px] mx-auto w-full relative border border-surface-darker bg-black ${size} ${settings.highContrast ? 'text-white high-contrast' : 'text-foreground'}`}
    style={{ fontFamily: font }}>
    <TopBar remaining={model.remaining} elapsed={model.elapsed} timeLimit={model.timeLimit}
      isUnlimited={model.isUnlimited} stressLevel={model.stressLevel}
      audioMuted={settings.musicVolume === 0 && settings.voiceVolume === 0 && settings.sfxVolume === 0}
      onAudioToggle={model.toggleMasterMute} />
    <MicPermissionBanner show={model.showMicHint} onDismiss={() => {
      model.setShowMicHint(false);
      try { sessionStorage.setItem('micHintDismissed', '1'); } catch { /* Dismissal still applies for this view. */ }
    }} />
    <CaseLayout {...model} />
    <GamePanels {...model} />
    <GameControls {...model} />
    <GameFeedback {...model} />
  </motion.div>;
}

export function GameView(model: GameController) {
  if (model.phase === 'loading' && model.caseLoader.error) return <CasePreparationError message={model.caseLoader.error}
    code={model.caseLoader.errorCode} retry={model.caseLoader.retry} retryLabel={model.caseLoader.retryLabel} />;
  if (model.phase === 'loading') return <LoadingScreen phase={model.caseLoader.preparationPhase} />;
  if (model.phase === 'briefing' && model.caseData) return <>
    <BriefingScreen caseData={model.caseData} difficulty={model.difficulty}
      onStart={() => { void model.sendQuestion('*Detective sits down and opens the case file*', true); }}
      onBack={() => model.router.push('/cases')} />
    {model.showOnboarding && <OnboardingOverlay onClose={() => model.setShowOnboarding(false)} />}
  </>;
  return <ActiveGame {...model} />;
}
