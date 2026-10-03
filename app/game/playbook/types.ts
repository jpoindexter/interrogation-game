import type { DialogueAction, DialogueResult, PublicStatement, PublicGameplayProjection } from '@/lib/gameplay/client';
export type { PublicExhibit, PublicGameplayProjection } from '@/lib/gameplay/client';

export interface EvidenceWorkbenchProps {
  publicProjection: PublicGameplayProjection;
  pinnedStatementId?: string | null;
  onPin: (source: { turnId: string; quote: string }) => Promise<PublicStatement>;
  onUnpin?: () => void;
  onAction: (action: DialogueAction) => Promise<DialogueResult>;
  onOpenSource?: (turnId: string) => void;
  disabled?: boolean;
}
