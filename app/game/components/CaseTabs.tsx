import type { CaseFilePage as Page } from './useCaseFileNavigation';
import { playSfx } from '../../lib/sfx-utils';

const playPaper = () => playSfx('/efx/paper.mp3', 0.3);

export default function CaseTabs({ page, setPage, clueCount, messageCount, unread }: {
  page: Page; setPage: (page: Page) => void; clueCount: number; messageCount: number;
  unread: { replies: number; leads: number };
}) {
  const tabs: { key: Page; label: string; badge?: number; color: string; activeColor: string }[] = [
    { key: 'case', label: 'Case', color: 'bg-[#b8a88a]', activeColor: 'bg-[#d4c4a0]' },
    { key: 'evidence', label: 'Leads', badge: clueCount > 0 ? clueCount : undefined, color: 'bg-[#8aabb8]', activeColor: 'bg-[#a0c4d4]' },
    { key: 'log', label: 'Log', badge: messageCount > 0 ? messageCount : undefined, color: 'bg-[#b88a8a]', activeColor: 'bg-[#d4a0a0]' },
  ];
  return (
      <div className="absolute top-3 right-full flex flex-col z-20">
        {tabs.map(({ key, label, badge, color, activeColor }) => (
          <button
            key={key}
            aria-pressed={page === key}
            aria-label={`${label}${key === 'evidence' && unread.leads ? `, ${unread.leads} new` : ''}${key === 'log' && unread.replies ? `, ${unread.replies} new replies` : ''}`}
            onClick={() => { if (page !== key) playPaper(); setPage(key); }}
            className={`min-w-11 px-2 py-5 text-[11px] font-bold transition-colors rounded-l-sm mb-0.5 ${
              page === key ? `${activeColor} text-black/85` : `${color} text-black/80 hover:brightness-110`
            }`}
            style={{
              writingMode: 'vertical-lr',
              textOrientation: 'mixed',
              fontFamily: 'var(--font-handwriting)',
            }}
          >
            {label}
            {badge !== undefined && (
              <span className="mt-1 text-[9px] bg-black/10 px-0.5 rounded-sm tabular-nums"
                style={{ fontFamily: 'var(--font-mono)' }}
              >{badge}</span>
            )}
          </button>
        ))}
      </div>
  );
}
