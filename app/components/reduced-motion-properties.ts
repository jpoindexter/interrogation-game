/** Resolve decorative keyframes to their final state without changing event callbacks. */
function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
function instantTransition(value: unknown): Record<string, unknown> {
  const transitions = object(value) ? Object.fromEntries(Object.entries(value).map(([key, item]) =>
    [key, object(item) ? instantTransition(item) : item])) : {};
  return { ...transitions, type: 'tween', duration: 0, delay: 0, repeat: 0, repeatDelay: 0, staggerChildren: 0, delayChildren: 0 };
}
function staticTarget(value: unknown): unknown {
  if (!object(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if (key === 'transition') return [key, instantTransition(item)];
    return [key, Array.isArray(item) ? item.findLast(frame => frame !== null) : item];
  }));
}
export function reducedMotionProperties(props: Record<string, unknown>): Record<string, unknown> {
  const variants = object(props.variants)
    ? Object.fromEntries(Object.entries(props.variants).map(([name, target]) => [name, staticTarget(target)])) : props.variants;
  return { ...props, initial: false, animate: staticTarget(props.animate), exit: staticTarget(props.exit),
    whileHover: staticTarget(props.whileHover), whileTap: staticTarget(props.whileTap),
    variants, transition: instantTransition(props.transition) };
}
