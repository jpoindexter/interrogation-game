import { useRef } from 'react';

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// --- Clue Notification ---

interface ClueNotificationProps {
  clueNumber: number | null;
  clueIcons: string[];
  cluesNeeded: number;
}

export function ClueNotification({ clueNumber, clueIcons, cluesNeeded }: ClueNotificationProps) {
  if (!clueNumber) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
      <div className="flex flex-col items-center gap-2" style={{ animation: 'clueReveal 0.6s ease-out' }}>
        <img
          src={clueIcons[clueNumber - 1] || clueIcons[0]}
          alt={`Evidence ${clueNumber}`}
          className="w-36 h-36 object-contain drop-shadow-2xl"
          style={{ imageRendering: 'pixelated' }}
        />
        <span className="text-xs uppercase tracking-[0.3em] text-[#C8A050] font-bold">
          Clue {clueNumber} of {cluesNeeded}
        </span>
      </div>
    </div>
  );
}

// --- Text Input ---

interface TextInputPanelProps {
  show: boolean;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
}

export function TextInputPanel({ show, value, disabled, onChange, onSubmit }: TextInputPanelProps) {
  if (!show) return null;
  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim() && !disabled) {
            onSubmit(value.trim());
            onChange('');
          }
        }}
        className="flex items-center gap-2 bg-[#1A1A1A]/95 backdrop-blur-sm border border-[#2A2A2A] rounded-xl px-3 py-2 shadow-2xl"
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={!disabled ? 'Type a question and press Enter...' : '...'}
          disabled={disabled}
          autoFocus
          className="flex-1 bg-transparent px-2 py-1 text-sm text-[#E8E8E8] placeholder-gray-600 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className="px-3 py-1.5 text-xs uppercase tracking-wider bg-[#2A2A2A] text-gray-400 hover:text-[#E8E8E8] hover:bg-[#3A3A3A] rounded-lg border border-[#2A2A2A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Ask
        </button>
      </form>
    </div>
  );
}

// --- Notes Panel ---

interface NotesPanelProps {
  show: boolean;
  notes: string;
  pos: { x: number; y: number } | null;
  onChange: (v: string) => void;
  onClose: () => void;
  onPosChange: (pos: { x: number; y: number }) => void;
}

export function NotesPanel({ show, notes, pos, onChange, onClose, onPosChange }: NotesPanelProps) {
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  if (!show) return null;
  return (
    <div
      className="absolute z-30 w-[400px] bg-[#111111] border border-[#2A2A2A] rounded-sm shadow-2xl"
      style={{
        left: pos ? pos.x : '50%',
        top: pos ? pos.y : '50%',
        transform: pos ? 'none' : 'translate(-50%, -50%)',
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-2 border-b border-[#2A2A2A] cursor-grab active:cursor-grabbing select-none"
        onMouseDown={(e) => {
          const panel = e.currentTarget.parentElement!;
          const rect = panel.getBoundingClientRect();
          const parentRect = panel.offsetParent!.getBoundingClientRect();
          dragRef.current = {
            startX: e.clientX, startY: e.clientY,
            origX: rect.left - parentRect.left, origY: rect.top - parentRect.top,
          };
          const onMove = (ev: MouseEvent) => {
            if (!dragRef.current) return;
            onPosChange({
              x: dragRef.current.origX + (ev.clientX - dragRef.current.startX),
              y: dragRef.current.origY + (ev.clientY - dragRef.current.startY),
            });
          };
          const onUp = () => {
            dragRef.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
          };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        }}
      >
        <span className="text-xs uppercase tracking-[0.2em] text-gray-500">Detective Notes</span>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-[#E8E8E8] transition-colors">
          <CloseIcon />
        </button>
      </div>
      <textarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
        placeholder="Write your notes here..."
        className="w-full h-[300px] bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-[#E8E8E8] placeholder-gray-600 focus:outline-none resize-none"
      />
    </div>
  );
}

// --- Exit Confirm ---

interface ExitConfirmProps {
  show: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ExitConfirmDialog({ show, onConfirm, onCancel }: ExitConfirmProps) {
  if (!show) return null;
  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-[#1A1A1A] border border-[#C41E1E] rounded-sm p-3 w-48 z-40">
      <p className="text-xs text-gray-300 mb-3">Abandon this case?</p>
      <div className="flex gap-2">
        <button onClick={onConfirm} className="flex-1 px-2 py-1.5 text-xs font-bold uppercase bg-[#C41E1E] text-white rounded-sm hover:bg-red-700 transition-colors">
          Leave
        </button>
        <button onClick={onCancel} className="flex-1 px-2 py-1.5 text-xs uppercase text-gray-400 border border-[#2A2A2A] rounded-sm hover:text-[#E8E8E8] transition-colors">
          Stay
        </button>
      </div>
    </div>
  );
}

// --- Accuse Confirm ---

interface AccuseConfirmProps {
  show: boolean;
  accusationsLeft: number;
  accuseText: string;
  onChange: (v: string) => void;
  onSubmitText: (v: string) => void;
  onVoice: () => void;
  onCancel: () => void;
}

export function AccuseConfirmDialog({ show, accusationsLeft, accuseText, onChange, onSubmitText, onVoice, onCancel }: AccuseConfirmProps) {
  if (!show) return null;
  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-[#1A1A1A] border border-[#C41E1E] rounded-sm p-4 w-80 z-40">
      <p className="text-xs text-gray-300 mb-3">
        You have <span className="text-[#C41E1E] font-bold">{accusationsLeft}</span> attempt{accusationsLeft !== 1 ? 's' : ''} left. State exactly what you think they lied about.
      </p>
      <textarea
        value={accuseText}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your accusation here..."
        className="w-full bg-[#111111] border border-[#2A2A2A] rounded-sm p-2 text-sm text-[#E8E8E8] placeholder-gray-600 resize-none mb-3 focus:outline-none focus:border-[#C41E1E]"
        rows={2}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && accuseText.trim()) {
            e.preventDefault();
            onSubmitText(accuseText.trim());
          }
        }}
      />
      <div className="flex gap-2">
        <button
          onClick={() => { if (accuseText.trim()) onSubmitText(accuseText.trim()); }}
          disabled={!accuseText.trim()}
          className="flex-1 px-2 py-1.5 text-xs font-bold uppercase bg-[#C41E1E] text-white rounded-sm hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit
        </button>
        <button
          onClick={onVoice}
          className="flex-1 px-2 py-1.5 text-xs font-bold uppercase bg-[#2A2A2A] text-white rounded-sm hover:bg-[#3A3A3A] transition-colors flex items-center justify-center gap-1"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
          </svg>
          Voice
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 text-xs uppercase text-gray-400 border border-[#2A2A2A] rounded-sm hover:text-[#E8E8E8] transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// --- Settings Panel ---

interface SettingsProps {
  show: boolean;
  settings: { ttsEnabled: boolean; fontSize: 'small' | 'medium' | 'large'; fontFamily: 'mono' | 'dyslexia' | 'sans'; highContrast: boolean };
  onSettingsChange: (s: SettingsProps['settings']) => void;
  onClose: () => void;
}

export function SettingsPanel({ show, settings, onSettingsChange, onClose }: SettingsProps) {
  if (!show) return null;
  const update = (patch: Partial<SettingsProps['settings']>) => onSettingsChange({ ...settings, ...patch });

  return (
    <div className="absolute bottom-20 right-4 z-40 w-[320px] bg-[#111111] border border-[#2A2A2A] rounded-sm shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#2A2A2A]">
        <span className="text-xs uppercase tracking-[0.2em] text-gray-500">Settings</span>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-[#E8E8E8] transition-colors">
          <CloseIcon />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Voice (TTS)</span>
          <button
            onClick={() => update({ ttsEnabled: !settings.ttsEnabled })}
            className={`w-10 h-5 rounded-full transition-colors relative ${settings.ttsEnabled ? 'bg-[#C41E1E]' : 'bg-[#2A2A2A]'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${settings.ttsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div>
          <span className="text-sm text-gray-300 block mb-2">Text Size</span>
          <div className="flex gap-1">
            {(['small', 'medium', 'large'] as const).map((size) => (
              <button
                key={size}
                onClick={() => update({ fontSize: size })}
                className={`flex-1 px-2 py-1.5 text-xs uppercase tracking-wider rounded-sm transition-colors ${
                  settings.fontSize === size ? 'bg-[#C41E1E] text-white' : 'bg-[#2A2A2A] text-gray-400 hover:text-[#E8E8E8]'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="text-sm text-gray-300 block mb-2">Font</span>
          <div className="flex gap-1">
            {([{ key: 'mono', label: 'Mono' }, { key: 'dyslexia', label: 'Dyslexia' }, { key: 'sans', label: 'Sans' }] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => update({ fontFamily: key })}
                className={`flex-1 px-2 py-1.5 text-xs uppercase tracking-wider rounded-sm transition-colors ${
                  settings.fontFamily === key ? 'bg-[#C41E1E] text-white' : 'bg-[#2A2A2A] text-gray-400 hover:text-[#E8E8E8]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">High Contrast</span>
          <button
            onClick={() => update({ highContrast: !settings.highContrast })}
            className={`w-10 h-5 rounded-full transition-colors relative ${settings.highContrast ? 'bg-[#C41E1E]' : 'bg-[#2A2A2A]'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${settings.highContrast ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Help Panel ---

interface HelpPanelProps {
  show: boolean;
  pos: { x: number; y: number } | null;
  cluesNeeded: number;
  clueIcons: string[];
  onClose: () => void;
  onPosChange: (pos: { x: number; y: number } | null) => void;
}

export function HelpPanel({ show, pos, cluesNeeded, clueIcons, onClose, onPosChange }: HelpPanelProps) {
  if (!show) return null;
  return (
    <div
      className="absolute z-40 w-[340px] max-h-[70vh] overflow-y-auto bg-[#111111] border border-[#2A2A2A] rounded-sm shadow-2xl"
      style={{
        left: pos ? pos.x : '50%',
        top: pos ? pos.y : '50%',
        transform: pos ? 'none' : 'translate(-50%, -50%)',
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-2 border-b border-[#2A2A2A] cursor-grab active:cursor-grabbing select-none"
        onMouseDown={(e) => {
          const panel = e.currentTarget.parentElement!;
          const rect = panel.getBoundingClientRect();
          const parentRect = panel.offsetParent!.getBoundingClientRect();
          const startX = e.clientX;
          const startY = e.clientY;
          const origX = rect.left - parentRect.left;
          const origY = rect.top - parentRect.top;
          const onMove = (ev: MouseEvent) => {
            onPosChange({ x: origX + (ev.clientX - startX), y: origY + (ev.clientY - startY) });
          };
          const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
          };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        }}
      >
        <span className="text-xs uppercase tracking-[0.2em] text-gray-500">How to Play</span>
        <button onClick={() => { onClose(); onPosChange(null); }} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-[#E8E8E8] transition-colors">
          <CloseIcon />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex gap-3">
          <span className="text-sm font-bold text-[#C41E1E] shrink-0">01</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-1">Ask Questions</p>
            <p className="text-[11px] text-gray-400 leading-relaxed">Tap the mic and ask the suspect questions. Look for inconsistencies in their story.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <span className="text-sm font-bold text-[#C41E1E] shrink-0">02</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-1">Collect {cluesNeeded} Clues</p>
            <p className="text-[11px] text-gray-400 leading-relaxed">As you press on the right topics, the stress meter rises and you unlock detective badges.</p>
            <div className="flex items-center gap-3 mt-2">
              {clueIcons.map((icon, i) => (
                <img key={i} src={icon} alt="" className="w-16 h-16 object-contain" style={{ imageRendering: 'pixelated' }} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <span className="text-sm font-bold text-[#C41E1E] shrink-0">03</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-1">Make Your Accusation</p>
            <p className="text-[11px] text-gray-400 leading-relaxed">Once you have all {cluesNeeded} clues, the ACCUSE button unlocks. Call out the lie. You get 3 attempts.</p>
          </div>
        </div>
        <div className="border-t border-[#2A2A2A] pt-3">
          <p className="text-[10px] uppercase tracking-wider text-[#C8A050] mb-2">Tips</p>
          <ul className="space-y-1.5">
            <li className="text-[11px] text-gray-400 flex gap-2"><span className="text-[#C8A050]">&bull;</span>Ask open-ended questions first</li>
            <li className="text-[11px] text-gray-400 flex gap-2"><span className="text-[#C8A050]">&bull;</span>Rising stress = right track</li>
            <li className="text-[11px] text-gray-400 flex gap-2"><span className="text-[#C8A050]">&bull;</span>Use hints sparingly (-15% score each)</li>
            <li className="text-[11px] text-gray-400 flex gap-2"><span className="text-[#C8A050]">&bull;</span>Faster solve = higher score</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
