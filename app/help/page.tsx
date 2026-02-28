'use client';

import { useRouter } from 'next/navigation';

export default function HelpPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8] font-mono">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#C41E1E] mb-2">
              Field Manual
            </p>
            <h1 className="text-4xl font-bold tracking-wide">HOW TO PLAY</h1>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-xs text-gray-500 hover:text-white uppercase tracking-wider transition-colors mt-2"
          >
            &larr; Home
          </button>
        </div>

        {/* Step 1 — Choose a Case */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl font-bold text-[#C41E1E]">01</span>
            <h2 className="text-sm font-bold uppercase tracking-wider">Choose a Case</h2>
          </div>
          <p className="text-sm text-gray-400 mb-5 leading-relaxed">
            Pick a location. Each one generates a unique crime, suspect, and hidden lie.
          </p>
          {/* Location thumbnails */}
          <div className="grid grid-cols-4 gap-2">
            {['office', 'trade', 'lawfirm', 'police'].map((loc) => (
              <div
                key={loc}
                className="relative overflow-hidden rounded-sm border border-[#2A2A2A]"
                style={{ aspectRatio: '16 / 10' }}
              >
                <img
                  src={`/bg/${loc}.png`}
                  alt={loc}
                  className="w-full h-full object-cover"
                  style={{ imageRendering: 'pixelated' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <span className="absolute bottom-1 left-1.5 text-[9px] uppercase tracking-wider text-gray-300">
                  {loc === 'lawfirm' ? 'Law Firm' : loc === 'trade' ? 'Trading' : loc}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step 2 — Interrogate */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl font-bold text-[#C41E1E]">02</span>
            <h2 className="text-sm font-bold uppercase tracking-wider">Interrogate the Suspect</h2>
          </div>
          <p className="text-sm text-gray-400 mb-5 leading-relaxed">
            You have 10 minutes. Ask questions using your voice. The suspect will respond &mdash; but they&apos;re hiding something.
          </p>
          {/* Mock interrogation scene */}
          <div className="relative bg-[#111111] border border-[#1A1A1A] rounded-sm p-5 flex items-center gap-5">
            {/* Room bg */}
            <div
              className="absolute inset-0 opacity-15 rounded-sm"
              style={{
                backgroundImage: 'url(/bg/police.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                imageRendering: 'pixelated',
              }}
            />
            {/* Suspect portrait */}
            <div className="relative shrink-0">
              <img
                src="/suspects/suspect-03-m.png"
                alt="Suspect"
                className="w-20 h-20 rounded-sm border border-[#2A2A2A] object-cover"
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="absolute -bottom-1 -right-1 bg-[#C41E1E] text-[8px] text-white px-1 py-0.5 uppercase">
                Suspect
              </div>
            </div>
            {/* Dialogue mockup */}
            <div className="relative flex-1">
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-sm p-3 mb-2">
                <p className="text-[11px] text-gray-300 italic">
                  &ldquo;I was at the office until 9pm. You can check the security logs...&rdquo;
                </p>
              </div>
              {/* Stress meter mock */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-gray-500 uppercase">Stress</span>
                <div className="flex-1 h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#C41E1E] to-[#ff4444] rounded-full" style={{ width: '40%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 — Find Clues */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl font-bold text-[#C41E1E]">03</span>
            <h2 className="text-sm font-bold uppercase tracking-wider">Collect 3 Clues</h2>
          </div>
          <p className="text-sm text-gray-400 mb-5 leading-relaxed">
            Press on suspicious topics. As stress rises, you&apos;ll unlock detective badges. You need all 3 to make an accusation.
          </p>
          {/* Badge progression */}
          <div className="flex items-end justify-center gap-8 bg-[#111111] border border-[#1A1A1A] rounded-sm py-6 px-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex flex-col items-center gap-2">
                <img
                  src={`/clues/clue${n}.png`}
                  alt={`Clue ${n}`}
                  className="object-contain drop-shadow-lg"
                  style={{
                    imageRendering: 'pixelated',
                    width: `${40 + n * 12}px`,
                    height: `${40 + n * 12}px`,
                  }}
                />
                <span className="text-[9px] text-gray-500 uppercase tracking-wider">
                  Clue {n}
                </span>
                <span className="text-[8px] text-gray-600">
                  {n === 1 ? 'Stress 3+' : n === 2 ? 'Stress 5+' : 'Stress 7+'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step 4 — Accuse */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl font-bold text-[#C41E1E]">04</span>
            <h2 className="text-sm font-bold uppercase tracking-wider">Make Your Accusation</h2>
          </div>
          <p className="text-sm text-gray-400 mb-5 leading-relaxed">
            Once you have all 3 clues, hit ACCUSE and call out the lie. Be specific &mdash; the AI judges your accuracy.
          </p>
          {/* Case closed visual */}
          <div className="flex items-center justify-center bg-[#111111] border border-[#1A1A1A] rounded-sm py-8">
            <img
              src="/solved/case_closed.png"
              alt="Case Closed"
              className="w-36 -rotate-6"
            />
          </div>
        </div>

        {/* Tips */}
        <div className="mb-12 bg-[#111111] border border-[#1A1A1A] rounded-sm p-6">
          <h2 className="text-xs uppercase tracking-[0.3em] text-[#C8A050] mb-4">
            Detective Tips
          </h2>
          <ul className="space-y-3">
            <li className="flex gap-3 text-sm text-gray-400">
              <span className="text-[#C8A050] shrink-0">&bull;</span>
              Ask open-ended questions first, then drill into details.
            </li>
            <li className="flex gap-3 text-sm text-gray-400">
              <span className="text-[#C8A050] shrink-0">&bull;</span>
              If the suspect gets nervous (stress rises), you&apos;re on the right track.
            </li>
            <li className="flex gap-3 text-sm text-gray-400">
              <span className="text-[#C8A050] shrink-0">&bull;</span>
              Listen for inconsistencies &mdash; times, places, names that don&apos;t add up.
            </li>
            <li className="flex gap-3 text-sm text-gray-400">
              <span className="text-[#C8A050] shrink-0">&bull;</span>
              You get 3 hints. Use them wisely &mdash; each one costs points.
            </li>
            <li className="flex gap-3 text-sm text-gray-400">
              <span className="text-[#C8A050] shrink-0">&bull;</span>
              Speed matters. More time remaining = higher score.
            </li>
          </ul>
        </div>

        {/* Scoring */}
        <div className="mb-12 p-5 bg-[#111111] border border-[#1A1A1A] rounded-sm">
          <h2 className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">
            Scoring
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm text-gray-400">
            <span>Time remaining &times; 100</span>
            <span className="text-green-500 text-right">+ points</span>
            <span>Clues found &times; 200</span>
            <span className="text-green-500 text-right">+ points</span>
            <span>Hints used &times; 150</span>
            <span className="text-[#C41E1E] text-right">&minus; points</span>
            <span>Failed accusations &times; 300</span>
            <span className="text-[#C41E1E] text-right">&minus; points</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push('/cases')}
            className="px-8 py-4 bg-[#C41E1E] text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
          >
            PLAY
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-4 bg-[#2A2A2A] text-white font-bold rounded-lg hover:bg-[#3A3A3A] transition-colors"
          >
            BACK
          </button>
        </div>
      </div>
    </div>
  );
}
