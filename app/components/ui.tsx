'use client';

import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

function _sfxVol(): number {
  try { const s = localStorage.getItem('appSettings'); if (s) return JSON.parse(s).sfxVolume ?? 0.5; } catch {} return 0.5;
}
const clickSfx = () => {
  const m = _sfxVol(); if (m === 0) return;
  try { const a = new Audio('/efx/click.mp3'); a.volume = 0.4 * m; a.play().catch(() => {}); } catch {}
};

export function BackButton({ href = '/', label = 'Home' }: { href?: string; label?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => { clickSfx(); router.push(href); }}
      className="fixed top-6 right-6 text-xs text-gray-500 hover:text-white uppercase tracking-wider transition-colors z-20"
    >
      &larr; {label}
    </button>
  );
}

export function PageHeader({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-10">
      <p className="text-xs uppercase tracking-[0.3em] text-accent mb-2">{label}</p>
      <h1 className="text-4xl font-bold tracking-wide">{title}</h1>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin" />
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-foreground font-mono relative">
      {children}
    </div>
  );
}

export function InfoPanel({ children }: { children: ReactNode }) {
  return (
    <div className="bg-surface-darker border border-surface-dark rounded-sm p-6">
      {children}
    </div>
  );
}
