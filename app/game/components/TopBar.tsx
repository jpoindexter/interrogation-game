export function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

interface TopBarProps {
  timer: number;
  stressLevel: number;
}

export default function TopBar({ timer, stressLevel }: TopBarProps) {
  return (
    <div className="p-3 border-b border-[#2A2A2A] flex-shrink-0">
      <div className="flex items-center gap-6">
        <div className="text-4xl font-bold tabular-nums">
          {formatTime(timer)}
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-xs uppercase tracking-wider mb-1">
            <span className="text-gray-500">Stress Level</span>
            <span className={stressLevel > 6 ? 'text-[#C41E1E]' : 'text-gray-400'}>
              {stressLevel}/10
            </span>
          </div>
          <div className="h-3 bg-[#2A2A2A] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${(stressLevel / 10) * 100}%`,
                backgroundColor:
                  stressLevel <= 3 ? '#E8E8E8' : stressLevel <= 6 ? '#F59E0B' : '#C41E1E',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
