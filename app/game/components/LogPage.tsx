import type { ConversationMessage } from '@/lib/mistral';
import { motion } from '../../components/motion';
import { SECTION_HEADER } from './CaseFilePage';

const LOG_HEADER_BG = { background: '#d4a0a0' };
const LABEL = 'text-[11px] uppercase tracking-wider font-bold text-black/50';
const MONO = { fontFamily: 'var(--font-mono)' };

export default function LogPage({ conversationHistory, suspectName, logEndRef }: {
  conversationHistory: ConversationMessage[]; suspectName: string;
  logEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  const pairs: { question: string; answer: string }[] = [];
  for (let i = 0; i < conversationHistory.length; i++) {
    const msg = conversationHistory[i];
    if (msg.role === 'user') {
      const next = conversationHistory[i + 1];
      pairs.push({ question: msg.content, answer: next?.role === 'assistant' ? next.content : '' });
      if (next?.role === 'assistant') i++;
    } else if (msg.role === 'assistant' && (i === 0 || conversationHistory[i - 1]?.role !== 'user')) {
      pairs.push({ question: '', answer: msg.content });
    }
  }

  return (
    <div className="p-4 text-black" style={MONO}>
      <p className="text-base font-bold text-center uppercase tracking-widest mb-1">Interview Transcript</p>
      <p className="text-xs text-black/40 text-center mb-3">Subject: {suspectName}</p>

      <hr className="border-black/20 mb-3" />

      {conversationHistory.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-xs italic text-black/40">No exchanges recorded.</p>
          <p className="text-xs italic text-black/30 mt-1">Begin questioning to populate this log.</p>
        </div>
      )}

      {pairs.length > 0 && (
        <div>
          <div className={SECTION_HEADER} style={LOG_HEADER_BG}>Exchanges</div>
          {pairs.map((pair, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.02 }}
              className={`py-2.5 ${i < pairs.length - 1 ? 'border-b border-black/15' : ''}`}
            >
              <p className="text-[10px] uppercase tracking-widest text-black/25 mb-1.5" style={MONO}>
                Exchange {String(i + 1).padStart(2, '0')}
              </p>
              {pair.question && (
                <div className="mb-2">
                  <p className={`${LABEL} underline mb-0.5`}>Detective</p>
                  <p className="text-sm leading-relaxed text-black/80">{pair.question}</p>
                </div>
              )}
              {pair.answer && (
                <div>
                  <p className={`${LABEL} underline mb-0.5`}>Subject</p>
                  <p className={`text-sm leading-relaxed ${i === pairs.length - 1 ? 'text-black' : 'text-black/65'}`}>{pair.answer}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <div ref={logEndRef} />
    </div>
  );
}
