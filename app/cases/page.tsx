'use client';

import { useRouter } from 'next/navigation';

const CASES = [
  {
    id: 'office',
    title: 'CORPORATE OFFICE',
    subtitle: 'Embezzlement, fraud, cover-ups',
    bg: '/bg/office.png',
    setting: 'corporate office',
  },
  {
    id: 'trade',
    title: 'TRADING FLOOR',
    subtitle: 'Insider trading, market manipulation',
    bg: '/bg/trade.png',
    setting: 'bank or financial trading firm',
  },
  {
    id: 'lawfirm',
    title: 'LAW FIRM',
    subtitle: 'Evidence tampering, witness fraud',
    bg: '/bg/lawfirm.png',
    setting: 'law firm',
  },
  {
    id: 'medical',
    title: 'HOSPITAL',
    subtitle: 'Record falsification, malpractice cover-up',
    bg: '/bg/medical.png',
    setting: 'hospital or medical facility',
  },
  {
    id: 'server',
    title: 'TECH COMPANY',
    subtitle: 'Data theft, sabotage, IP leaks',
    bg: '/bg/server.png',
    setting: 'tech company',
  },
  {
    id: 'startup',
    title: 'STARTUP',
    subtitle: 'Fraud, stolen code, faked metrics',
    bg: '/bg/startup.png',
    setting: 'startup',
  },
  {
    id: 'police',
    title: 'POLICE PRECINCT',
    subtitle: 'Corruption, planted evidence, internal affairs',
    bg: '/bg/police.png',
    setting: 'police precinct',
  },
];

export default function CaseSelectPage() {
  const router = useRouter();

  const selectCase = (setting: string) => {
    router.push(`/game?setting=${encodeURIComponent(setting)}`);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8] font-mono">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-[#C41E1E] mb-2">
            Select Location
          </p>
          <h1 className="text-4xl font-bold tracking-wide">CHOOSE YOUR CASE</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CASES.map((c) => (
            <button
              key={c.id}
              onClick={() => selectCase(c.setting)}
              className="group relative overflow-hidden rounded-sm border border-[#2A2A2A] hover:border-[#C41E1E] transition-colors text-left"
              style={{ aspectRatio: '16 / 10' }}
            >
              {/* Background image */}
              <div
                className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
                style={{
                  backgroundImage: `url(${c.bg})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  imageRendering: 'pixelated',
                }}
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 group-hover:from-black/80 transition-colors" />
              {/* Text */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h2 className="text-lg font-bold tracking-wider mb-1 group-hover:text-[#C41E1E] transition-colors">
                  {c.title}
                </h2>
                <p className="text-xs text-gray-400">{c.subtitle}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-10 text-center">
          <button
            onClick={() => selectCase('random')}
            className="px-6 py-3 border border-[#2A2A2A] hover:border-[#C41E1E] text-sm uppercase tracking-wider text-gray-400 hover:text-[#E8E8E8] transition-colors rounded-sm"
          >
            Random Case
          </button>
        </div>
      </div>
    </div>
  );
}
