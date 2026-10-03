'use client';
import { useEffect, useRef } from 'react';
import SiriWave from 'siriwave';
import { useMotionPreference } from '../../components/useMotionPreference';

interface VoiceWaveformProps { isActive: boolean; stressLevel: number; className?: string }
export default function VoiceWaveform({ isActive, stressLevel, className }: VoiceWaveformProps) {
  const container = useRef<HTMLDivElement>(null);
  const reduced = useMotionPreference();
  useEffect(() => {
    const element = container.current;
    if (!element || reduced || !isActive) return;
    let wave: SiriWave | null = null;
    const redraw = () => {
      wave?.dispose();
      wave = new SiriWave({ container: element, style: 'ios9', width: element.clientWidth, height: 44,
        amplitude: 1 + stressLevel * 0.2, speed: 0.05, autostart: true, color: '#E8E8E8' });
    };
    const observer = new ResizeObserver(redraw);
    observer.observe(element);
    return () => { observer.disconnect(); wave?.dispose(); };
  }, [reduced, isActive, stressLevel]);
  return <div className={className}>
    <div ref={container} aria-hidden="true" className="my-2 h-11 w-full overflow-hidden" />
    <p className="text-center text-xs text-gray-300">{isActive ? 'Spoken response playing' : 'Voice idle'}</p>
  </div>;
}
