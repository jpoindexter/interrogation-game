'use client';

import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8] font-mono flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-6xl md:text-8xl font-bold mb-8 tracking-wider">
          INTERROGATION
        </h1>

        <div className="mb-12">
          <p className="text-lg md:text-xl mb-6 leading-relaxed">
            A voice-based detective game where you interrogate an AI suspect.
          </p>
          <p className="text-lg md:text-xl mb-6 leading-relaxed">
            The suspect is lying. You have 5 minutes to find the contradiction.
          </p>
          <p className="text-lg md:text-xl font-bold leading-relaxed">
            Use only your voice. No typing. No chat bubbles.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => router.push('/cases')}
            className="px-8 py-4 bg-[#C41E1E] text-white text-xl font-bold rounded-lg hover:bg-red-700 transition-colors transform hover:scale-105"
          >
            START NEW CASE
          </button>
          <button
            onClick={() => router.push('/leaderboard')}
            className="px-8 py-4 bg-[#2A2A2A] text-white text-lg font-bold rounded-lg hover:bg-[#3A3A3A] transition-colors"
          >
            LEADERBOARD
          </button>
        </div>

        <div className="mt-16 text-sm text-gray-400">
          <p>Powered by Mistral AI</p>
          <p className="mt-2">Built for Mistral Worldwide Hackathon 2026</p>
        </div>
      </div>
    </div>
  );
}