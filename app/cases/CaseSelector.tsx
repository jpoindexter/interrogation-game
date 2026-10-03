'use client';

import { useEffect, useRef, type ReactNode, type KeyboardEvent } from 'react';
import { CASES, DIFFICULTY_CONFIG } from '../data/cases';

/** Only marked native browsing buttons own these keys; links and editors do not. */
export function navigateCaseKey(event: KeyboardEvent<HTMLElement>, navigate: (direction: number) => void) {
  const target = event.target as HTMLElement;
  if ([event.defaultPrevented, event.altKey, event.ctrlKey, event.metaKey, event.shiftKey, event.nativeEvent.isComposing].some(Boolean)) return false;
  if (target.tagName !== 'BUTTON' || target.dataset.caseNavigation !== 'true' || target.isContentEditable) return false;
  const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
  if (!direction) return false;
  event.preventDefault();
  navigate(direction);
  return true;
}

export default function CaseSelector({ current, onNavigate, children }: {
  current: number;
  onNavigate: (direction: number) => void;
  children: ReactNode;
}) {
  const region = useRef<HTMLDivElement>(null);
  const followPhoto = useRef(false);
  useEffect(() => {
    if (!followPhoto.current) return;
    followPhoto.current = false;
    region.current?.querySelector<HTMLButtonElement>('button[data-active-case="true"]')?.focus({ preventScroll: true });
  }, [current]);
  const active = CASES[current];
  return <div ref={region} role="region" aria-label="Case selector" className="flex w-full flex-col items-center"
    onKeyDown={event => {
      const fromPhoto = (event.target as HTMLElement).dataset.casePhoto === 'true';
      if (navigateCaseKey(event, onNavigate)) followPhoto.current = fromPhoto;
    }}>
    <p role="status" aria-atomic="true" className="sr-only">
      {active.title}, {DIFFICULTY_CONFIG[active.difficulty].label}. Case {current + 1} of {CASES.length} selected.
    </p>
    {children}
  </div>;
}
