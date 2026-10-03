import type { RefObject } from 'react';
import type { Evaluation } from './types';
import { pathLabel, type ConversationPathNode } from './conversation-path';

const styles = {
  neutral: 'border-gray-600 text-gray-300',
  supported: 'border-gold text-gold',
  unsupported: 'border-accent text-accent',
  unverified: 'border-gray-500 text-gray-300',
};

interface FocusEntry { id: string; ref: RefObject<HTMLDetailsElement | null> }

function PathStep({ node, index, focusEntry }: { node: ConversationPathNode; index: number; focusEntry?: FocusEntry }) {
  const branch = node.status === 'unsupported';
  return <li className="relative pl-6 pb-5 last:pb-0">
    <span aria-hidden="true" className={`absolute -left-[5px] top-2 h-2 w-2 rounded-full border bg-black ${styles[node.status]}`} />
    <div className={`${branch ? 'ml-3 border-l-2 pl-3' : ''} ${styles[node.status]}`}>
      <p className="text-xs uppercase tracking-wider">{index + 1}. {pathLabel(node)}</p>
      <details ref={node.id === focusEntry?.id ? focusEntry.ref : undefined} className="mt-2 text-foreground">
        <summary className="cursor-pointer text-sm leading-relaxed focus-visible:outline-2 focus-visible:outline-gold">
          {node.question.length > 160 ? `${node.question.slice(0, 157)}…` : node.question}
        </summary>
        <div className="mt-3 space-y-2 border-l border-white/15 pl-3 text-sm text-gray-300">
          <p><span className="text-gold">Detective:</span> {node.question}</p>
          {node.answer && <p><span className="text-gold">Suspect:</span> {node.answer}</p>}
          {node.evidence && <div className="space-y-2 border-t border-white/15 pt-3">
            <p><span className="text-gold">Pinned statement:</span> “{node.evidence.statement}”</p>
            <p><span className="text-gold">{node.evidence.exhibitTitle}:</span> {node.evidence.exhibitText}</p>
          </div>}
          {node.explanation && <p><span className="text-gold">Recorded verdict:</span> {node.explanation}</p>}
        </div>
      </details>
      {branch && <p className="mt-2 text-xs">{node.kind === 'accusation' ? 'This accusation was rejected by the recorded judgment.' : 'This exhibit did not establish a contradiction with the statement.'}</p>}
    </div>
  </li>;
}

export function ConversationPath({ evaluation, focusEntry }: { evaluation: Evaluation; focusEntry?: FocusEntry }) {
  const nodes = evaluation.conversationPath;
  return <section aria-labelledby="conversation-path-title" className="mt-6 mb-6 border border-white/15 bg-surface-dark p-5 rounded-sm">
    <h2 id="conversation-path-title" className="text-gold uppercase tracking-wider text-sm font-bold">Conversation path</h2>
    <p className="mt-2 mb-5 text-xs leading-relaxed text-gray-300">The route you took. Gold marks supported findings; red marks rejected accusations or challenges that did not establish a contradiction. Ordinary dialogue has no verdict. Expand any step for its recorded exchange.</p>
    {nodes?.length ? <>
      <p className="text-xs uppercase text-gray-300 mb-3">Interview opened</p>
      <ol aria-label="Recorded interrogation steps" className="ml-1 border-l border-gray-600">
        {nodes.map((node, index) => <PathStep key={node.id} node={node} index={index} focusEntry={focusEntry} />)}
      </ol>
    </> : <p className="text-sm text-gray-300">{nodes ? 'No dialogue was recorded.' : 'This older result has no recorded path verdicts.'}</p>}
    <p className="mt-5 border-t border-white/15 pt-4 text-sm font-bold">{evaluation.outcome === 'win' ? 'Case solved' : 'Interview ended · case unresolved'}</p>
  </section>;
}
