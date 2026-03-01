'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Spinner } from '../../components/ui';
import { motion, AnimatePresence, fadeUp, smooth } from '../../components/motion';
import TranscriptViewer from '../components/TranscriptViewer';
import ShareModal from '../components/ShareModal';
import { saveCaseResult } from '../../data/case-history';

import { playClick, playSfx } from '../../lib/sfx-utils';
import { getUserApiHeaders } from '../../lib/api-keys';

interface GameResult {
  caseData: {
    case_number: string;
    suspect_name: string;
    suspect_role: string;
    setting: string;
    crime: string;
  };
  sessionId?: string;
  conversationHistory: Array<{ role: string; content: string }>;
  maxStress: number;
  gaveUp?: boolean;
  timeUp?: boolean;
  lawyeredUp?: boolean;
  timeUpRemark?: string;
  cleverRemark?: string;
}

export default function LosePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-foreground font-mono flex items-center justify-center"><Spinner /></div>}>
      <LoseContent />
    </Suspense>
  );
}

const staggerChildren = { visible: { transition: { staggerChildren: 0.15 } } };
const FALLBACK_SUMMARY = { detective_rating: 'Rookie', the_lie_revealed: 'Unable to retrieve.', the_truth_revealed: 'Unable to retrieve.', closest_moment: 'Unable to analyze.', what_they_missed: 'Unable to retrieve.' };

function LoseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<GameResult | null>(null);
  const [stampVisible, setStampVisible] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [summary, setSummary] = useState<{
    detective_rating: string;
    the_lie_revealed: string;
    the_truth_revealed: string;
    closest_moment: string;
    what_they_missed: string;
  } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('gameResult');
    if (!stored) { router.push('/'); return; }

    let parsed: GameResult;
    try { parsed = JSON.parse(stored) as GameResult; } catch { router.push('/'); return; }
    setResult(parsed);

    setTimeout(() => {
      setStampVisible(true);
      playSfx('/efx/walking.mp3', 0.25);
      setTimeout(() => playSfx('/efx/door_open_close.mp3', 0.25), 1200);
    }, 300);

    try {
      const diff = searchParams.get('difficulty') || 'medium';
      saveCaseResult({
        setting: parsed.caseData.setting || '',
        won: false,
        difficulty: diff,
        timestamp: Date.now(),
      });
    } catch { /* private browsing */ }

    fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getUserApiHeaders() },
      body: JSON.stringify({
        type: 'lose',
        sessionId: parsed.sessionId,
        maxStress: parsed.maxStress,
      }),
    })
      .then((res) => res.json())
      .then((data) => setSummary(data.error ? FALLBACK_SUMMARY : data))
      .catch(() => setSummary(FALLBACK_SUMMARY));
  }, [router]);

  if (!result) {
    return <div className="min-h-screen bg-black text-foreground font-mono flex items-center justify-center"><Spinner /></div>;
  }

  const caseSetting = result.caseData.setting || '';
  const difficulty = searchParams.get('difficulty') || 'medium';

  return (
    <div className="min-h-screen bg-black text-foreground font-mono overflow-y-auto relative">
      <button
        onClick={() => { playClick(); sessionStorage.removeItem('gameResult'); router.push('/'); }}
        className="absolute top-6 right-6 text-xs text-gray-500 hover:text-white uppercase tracking-wider transition-colors z-20"
      >
        &larr; Home
      </button>

      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 z-0 pointer-events-none"
        initial={{ opacity: 0, scale: 1.5 }}
        animate={stampVisible ? { opacity: result.lawyeredUp ? 0.25 : 0.15, scale: 1 } : {}}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <img
          src={result.lawyeredUp ? '/solved/lawyered_up.png' : '/solved/escaped.png'}
          alt=""
          className="w-[600px] sm:w-[800px] md:w-[900px]"
          style={{ imageRendering: 'auto' }}
        />
      </motion.div>
      <div className="absolute top-48 sm:top-64 left-0 right-0 h-32 z-[1] pointer-events-none bg-gradient-to-b from-transparent to-black" />

      <div className="max-w-2xl mx-auto px-6 sm:px-8 pb-6 sm:pb-8 relative z-10">
        <motion.div
          className="text-center pt-40 sm:pt-56 mb-8"
          initial="hidden"
          animate="visible"
          variants={staggerChildren}
        >
          <motion.p
            className="text-lg sm:text-xl uppercase tracking-[0.3em] text-gray-400 font-bold mb-2"
            variants={fadeUp}
            transition={{ duration: 0.6 }}
          >
            Case #{result.caseData.case_number}
          </motion.p>
          <motion.p
            className="text-xl sm:text-2xl font-semibold text-foreground"
            variants={fadeUp}
            transition={{ duration: 0.6 }}
          >
            {result.lawyeredUp ? 'The suspect lawyered up. Interview over.' : result.timeUp ? 'Time\u2019s up. The suspect walks free.' : result.gaveUp ? 'You gave up. The suspect walks free.' : 'Out of accusations. The suspect walks free.'}
          </motion.p>
        </motion.div>

        {summary ? (
          <motion.div
            className="bg-surface-dark/80 backdrop-blur-sm rounded-sm p-6 sm:p-8 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <h2 className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-5">Case Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Max stress reached</span>
                <span className="text-sm font-bold tabular-nums">{result.maxStress}/10</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Closest moment</span>
                <span className="text-sm font-bold text-gold">Almost</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Outcome</span>
                <span className="text-sm font-bold text-accent">{result.lawyeredUp ? 'Lawyered up' : result.timeUp ? 'Time expired' : result.gaveUp ? 'Surrendered' : 'Out of attempts'}</span>
              </div>
              <div className="border-t border-surface my-3" />
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">Rating</span>
                <span className="text-3xl font-bold text-gray-400 tabular-nums">{summary.detective_rating}</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="flex justify-center py-12"><Spinner /></div>
        )}

        <motion.div
          className="bg-surface-dark/80 backdrop-blur-sm rounded-sm p-6 sm:p-8 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={summary ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h2 className="text-xs uppercase tracking-[0.3em] text-accent mb-1">{result.caseData.suspect_name}</h2>
          <p className="text-xs text-gray-500 mb-3">{result.caseData.suspect_role}</p>
          <p className="text-base leading-relaxed italic text-gray-200">
            &ldquo;{result.timeUpRemark || result.cleverRemark || 'You had your chance, detective. Better luck next time.'}&rdquo;
          </p>
        </motion.div>

        {summary ? (
          <motion.div
            className="bg-surface-dark/80 backdrop-blur-sm rounded-sm p-6 sm:p-8 space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            <div>
              <h3 className="text-xs uppercase tracking-[0.3em] text-accent mb-1">The Lie You Missed</h3>
              <p className="text-sm text-gray-300">&ldquo;{summary.the_lie_revealed}&rdquo;</p>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-1">The Truth</h3>
              <p className="text-sm text-gray-300">{summary.the_truth_revealed}</p>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-1">What Would Have Cracked Them</h3>
              <p className="text-sm text-gray-400">{summary.what_they_missed}</p>
            </div>
          </motion.div>
        ) : (
          <div className="flex justify-center py-12"><Spinner /></div>
        )}

        <motion.div
          className="mt-10 space-y-3"
          initial={{ opacity: 0 }}
          animate={summary ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 1.5 }}
        >
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => {
                playClick();
                sessionStorage.removeItem('gameResult');
                router.push(`/game?setting=${encodeURIComponent(caseSetting)}&difficulty=${difficulty}`);
              }}
              className="px-5 py-2 bg-accent text-white text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-accent-hover transition-colors"
            >
              Retry Case
            </button>
            {difficulty !== 'easy' && (
              <button
                onClick={() => {
                  playClick();
                  sessionStorage.removeItem('gameResult');
                  const easier = difficulty === 'expert' ? 'hard' : difficulty === 'hard' ? 'medium' : 'easy';
                  router.push(`/game?setting=${encodeURIComponent(caseSetting)}&difficulty=${easier}`);
                }}
                className="px-5 py-2 bg-gold text-black text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-gold-hover transition-colors"
              >
                Try Easier
              </button>
            )}
            <button
              onClick={() => { playClick(); sessionStorage.removeItem('gameResult'); router.push('/cases'); }}
              className="px-5 py-2 bg-surface text-gray-400 text-xs font-bold uppercase tracking-wider rounded-sm hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              Other Cases
            </button>
            <button
              onClick={() => { playClick(); setShowShare(true); }}
              className="px-5 py-2 bg-surface text-gray-400 text-xs font-bold uppercase tracking-wider rounded-sm hover:text-foreground hover:bg-surface-hover transition-colors"
            >Share</button>
            <button
              onClick={() => { playClick(); setShowTranscript(true); }}
              className="px-5 py-2 bg-surface text-gray-400 text-xs font-bold uppercase tracking-wider rounded-sm hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              Transcript
            </button>
          </div>
        </motion.div>
      </div>
      <AnimatePresence>
        {showTranscript && (
          <TranscriptViewer
            conversationHistory={result.conversationHistory}
            suspectName={result.caseData.suspect_name}
            onClose={() => setShowTranscript(false)}
          />
        )}
      </AnimatePresence>
      <ShareModal
        show={showShare}
        text={`\ud83d\udd0d INTERROGATION \u2014 ${result.lawyeredUp ? `The suspect in Case #${result.caseData.case_number} lawyered up on me. ${result.caseData.suspect_name} walked out. Can you crack them without pushing too hard?` : result.timeUp ? `Ran out of time on Case #${result.caseData.case_number}. ${result.caseData.suspect_name} escaped. Can you do better?` : result.gaveUp ? `I surrendered on Case #${result.caseData.case_number}. The suspect walked free. Think you can crack them?` : `Case #${result.caseData.case_number} defeated me. ${result.caseData.suspect_name} escaped. Can you do better?`}`}
        url={typeof window !== 'undefined' ? window.location.origin : ''}
        onClose={() => setShowShare(false)}
      />
    </div>
  );
}
