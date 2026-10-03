/** Decorative case-note index. It never implies a physical object was discovered. */
export default function ClueMarker({ number, className = 'h-12 w-10' }: {
  number: number;
  className?: string;
}) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 56 64" fill="none" className={className}>
      <path d="M7 3h29l13 13v45H7z" stroke="currentColor" strokeWidth="2" />
      <path d="M36 3v13h13M15 51h26" stroke="currentColor" strokeWidth="2" />
      <text x="28" y="40" textAnchor="middle" fill="currentColor" fontFamily="inherit" fontSize="18">
        {String(number).padStart(2, '0')}
      </text>
    </svg>
  );
}
