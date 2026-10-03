'use client';

import ModalSurface from '../../components/ModalSurface';
import { motion } from '../../components/motion';

interface TranscriptViewerProps {
  conversationHistory: Array<{ role: string; content: string }>;
  suspectName: string;
  onClose: () => void;
}

export default function TranscriptViewer({ conversationHistory, suspectName, onClose }: TranscriptViewerProps) {
  const exchanges = conversationHistory.filter(
    (m) => m.role === 'user' || m.role === 'assistant',
  );

  return (
    <ModalSurface label="Interrogation transcript" onClose={onClose}>
    <div className="fixed inset-0 flex min-h-0 flex-col bg-black/95 text-foreground backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-surface">
        <h2 className="text-xs uppercase tracking-[0.3em] text-gray-500">
          Interrogation Transcript
        </h2>
        <button
          onClick={onClose}
          className="min-h-11 min-w-11 text-gray-300 hover:text-white transition-colors text-xl leading-none"
          aria-label="Close transcript"
        >
          &#10005;
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 sm:px-8 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {exchanges.map((msg, i) => <TranscriptRow key={i} msg={msg} index={i} suspectName={suspectName} />)}

          {exchanges.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-12">
              No exchanges recorded.
            </p>
          )}
        </div>
      </div>
    </div>
    </ModalSurface>
  );
}

function TranscriptRow({ msg, index, suspectName }: { msg: { role: string; content: string }; index: number; suspectName: string }) {
            const isUser = msg.role === 'user';
            let displayText = msg.content;
            if (!isUser) {
              try {
                const parsed = JSON.parse(msg.content);
                if (parsed.spoken_response) displayText = parsed.spoken_response;
              } catch {}
            }

            return (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.6) }}
              >
                <p
                  className={`text-xs uppercase tracking-[0.2em] mb-1 ${
                    isUser ? 'text-gold' : 'text-accent'
                  }`}
                >
                  {isUser ? 'Detective' : suspectName}
                </p>
                <p className="text-sm leading-relaxed text-gray-300">
                  {displayText}
                </p>
              </motion.div>
            );

}
