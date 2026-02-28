import type { Case } from '@/lib/game-state';
import type { ConversationMessage } from '@/lib/mistral';

interface CaseFileProps {
  caseData: Case;
  clues: string[];
  clueIcons: string[];
  cluesNeeded: number;
  hintsUsed: number;
  conversationHistory: ConversationMessage[];
}

export default function CaseFile({
  caseData,
  clues,
  clueIcons,
  cluesNeeded,
  hintsUsed,
  conversationHistory,
}: CaseFileProps) {
  return (
    <div className="p-4 bg-[#111111] overflow-y-auto border-l border-[#2A2A2A]">
      <h2 className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">
        Case File
      </h2>

      <div className="space-y-6">
        <div>
          <h3 className="text-xs uppercase tracking-wider text-[#C41E1E] mb-2">Crime</h3>
          <p className="text-sm text-gray-300">{caseData.crime}</p>
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-wider text-[#C41E1E] mb-2">Suspect</h3>
          <p className="text-sm text-gray-300">{caseData.suspect_name}</p>
          <p className="text-xs text-gray-500">{caseData.suspect_role}</p>
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-wider text-[#C41E1E] mb-2">Evidence</h3>
          <div className="flex items-center gap-3 mb-3">
            {clueIcons.map((icon, i) => (
              <div key={i} className="flex flex-col items-center">
                <img
                  src={icon}
                  alt={`Evidence ${i + 1}`}
                  className={`w-20 h-20 object-contain transition-all duration-500 ${
                    clues.length >= i + 1 ? 'opacity-100' : 'opacity-20 grayscale'
                  }`}
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
            ))}
          </div>
          {clues.length > 0 ? (
            <div className="space-y-2">
              {clues.map((clue, i) => (
                <div key={i} className="p-3 bg-[#1A1A1A] rounded border-l-2 border-[#C41E1E]">
                  <p className="text-sm text-gray-300">{clue}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">Find {cluesNeeded} clues to unlock accusation.</p>
          )}
        </div>

        {hintsUsed > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-[#F59E0B] mb-2">Hints</h3>
            <div className="space-y-2">
              {caseData.stress_triggers.slice(0, hintsUsed).map((trigger, i) => (
                <div key={i} className="p-3 bg-[#1A1A1A] rounded border-l-2 border-[#F59E0B]">
                  <p className="text-sm text-gray-300">Try asking about: {trigger}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xs uppercase tracking-wider text-gray-600 mb-2">Exchange Log</h3>
          <div className="space-y-2">
            {conversationHistory
              .filter((msg) => !(msg.role === 'user' && msg.content.startsWith('*')))
              .map((msg, i) => (
                <div key={i} className={`text-xs ${msg.role === 'user' ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span className={msg.role === 'user' ? 'text-gray-500' : 'text-[#C8A050]'}>
                    {msg.role === 'user' ? 'You' : caseData.suspect_name?.split(' ')[0] ?? 'Suspect'}:
                  </span>{' '}
                  {msg.content}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
