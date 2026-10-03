/** Open the ref-bound exchange and focus its native summary without animated scrolling. */
export function openRecordedExchange(details: HTMLDetailsElement | null): void {
  const summary = details?.firstElementChild;
  if (!details || summary?.tagName !== 'SUMMARY') return;
  details.open = true;
  const target = summary as HTMLElement;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'nearest', behavior: 'instant' });
}
