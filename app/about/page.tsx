'use client';

import { useRouter } from 'next/navigation';

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8] font-mono relative">
      <button
        onClick={() => router.push('/')}
        className="absolute top-6 right-6 text-xs text-gray-500 hover:text-white uppercase tracking-wider transition-colors z-20"
      >
        &larr; Home
      </button>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <p className="text-xs uppercase tracking-[0.3em] text-[#C41E1E] mb-2">
            Solo Build
          </p>
          <h1 className="text-4xl font-bold tracking-wide mb-2">ABOUT</h1>
          <p className="text-sm text-gray-500">Mistral Worldwide Hackathon 2026 &bull; Online Track</p>
        </div>

        {/* Builder */}
        <div className="mb-12">
          <h2 className="text-xs uppercase tracking-[0.3em] text-[#C8A050] mb-6">The Builder</h2>
          <div className="bg-[#111111] border border-[#1A1A1A] rounded-sm p-6">
            <h3 className="text-xl font-bold mb-1">Jason Poindexter</h3>
            <p className="text-sm text-gray-400 mb-4">UX Designer &bull; AI Systems Builder &bull; Barcelona, ES</p>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              UX designer for 15+ years, now building AI-native systems. Shipped products at
              Apple, Google, YouTube, FedEx Digital, London Stock Exchange, Electronic Arts, Equinix, and more.
              Currently building Gripe (AI-powered market intelligence) and FABRK (production-grade SaaS foundation for AI-native products).
            </p>
            <p className="text-sm text-gray-400 leading-relaxed">
              Focus areas: agentic AI platforms, human-AI workflow systems, enterprise product architecture,
              and zero-to-one builds in compliance-sensitive environments.
            </p>
          </div>
        </div>

        {/* Experience highlights */}
        <div className="mb-12">
          <h2 className="text-xs uppercase tracking-[0.3em] text-[#C8A050] mb-6">Selected Work</h2>
          <div className="space-y-3">
            {[
              { role: 'Founder', company: 'FABRK', desc: 'Production-grade Next.js SaaS foundation — auth, billing, email, deployment patterns. 78+ reusable primitives.' },
              { role: 'Director of Product & Design', company: 'THEFT Studio', desc: 'AI product builds for London Stock Exchange, FedEx Digital, YouTube, Google Health, Waymo, Booking.com.' },
              { role: 'Lead Product Designer', company: 'Apple', desc: 'Internal experimentation platform adopted across Apple, saving $5M+ annually.' },
              { role: 'UX Design Team Lead', company: 'Electronic Arts', desc: 'Product strategy and redesign for pogo.com ($30M+ annual revenue).' },
              { role: 'Principal Product Designer', company: 'Equinix', desc: 'Enterprise SaaS modernization. Launched SmartView product offering.' },
            ].map((item) => (
              <div key={item.company} className="bg-[#111111] border border-[#1A1A1A] rounded-sm p-4">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-bold text-gray-300">{item.role}</span>
                  <span className="text-xs text-[#C41E1E]">{item.company}</span>
                </div>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Systems Launched */}
        <div className="mb-12">
          <h2 className="text-xs uppercase tracking-[0.3em] text-[#C8A050] mb-6">AI Systems Launched</h2>
          <div className="space-y-3">
            {[
              { name: 'Gripe', year: '2026', desc: 'AI-powered market intelligence and acquisition analysis. Converts distributed public signals into scored datasets for competitive and due-diligence workflows.' },
              { name: 'AgentSmith', year: '2026', desc: 'Automated codebase audit engine. Generates maintainability scoring and structured technical due-diligence reports from live repositories.' },
              { name: 'FABRK', year: '2025', desc: 'Opinionated SaaS foundation standardizing authentication, billing orchestration, email pipelines, and scalable architecture for AI-native products.' },
              { name: 'INTERROGATION', year: '2026', desc: 'Voice-based AI red-teaming game. Mistral Large 3 plays a lying suspect. You catch the lie. Built in 48 hours.' },
            ].map((item) => (
              <div key={item.name} className="bg-[#111111] border border-[#1A1A1A] rounded-sm p-4">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-bold text-gray-300">{item.name}</span>
                  <span className="text-[10px] text-gray-600">{item.year}</span>
                </div>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* About the Game */}
        <div className="mb-12">
          <h2 className="text-xs uppercase tracking-[0.3em] text-[#C8A050] mb-6">About INTERROGATION</h2>
          <div className="bg-[#111111] border border-[#1A1A1A] rounded-sm p-6 space-y-4">
            <p className="text-sm text-gray-400 leading-relaxed">
              INTERROGATION is an AI red-teaming experiment disguised as a detective noir game.
              The suspect is powered by Mistral Large 3, instructed to maintain a cover story with one hidden lie.
              Your job is to find the contradiction through voice or text-based questioning.
            </p>
            <p className="text-sm text-gray-400 leading-relaxed">
              Every case is procedurally generated &mdash; unique crime, suspect, cover story, and lie.
              The AI never confesses. You win by making a specific accusation that a separate AI judge evaluates.
            </p>
            <div className="border-t border-[#1A1A1A] pt-4 mt-4">
              <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Built With</h4>
              <div className="flex flex-wrap gap-2">
                {['Mistral Large 3', 'Voxtral STT', 'ElevenLabs TTS', 'Next.js 16', 'TypeScript', 'Tailwind v4', 'PixelLab'].map((tech) => (
                  <span key={tech} className="text-[10px] uppercase tracking-wider text-gray-500 px-2 py-1 border border-[#2A2A2A] rounded-sm">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
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
