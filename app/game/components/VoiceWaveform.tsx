'use client';

import { useRef, useEffect } from 'react';
import SiriWave from 'siriwave';

interface VoiceWaveformProps {
  isActive: boolean;
  stressLevel: number;
  className?: string;
}

export default function VoiceWaveform({ isActive, stressLevel, className }: VoiceWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<SiriWave | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const wave = new SiriWave({
      container: containerRef.current,
      style: 'ios9',
      width: containerRef.current.clientWidth,
      height: 44,
      amplitude: 0,
      speed: 0.03,
      autostart: true,
      color: '#E8E8E8',
    });
    waveRef.current = wave;

    const handleResize = () => {
      if (containerRef.current && waveRef.current) {
        waveRef.current.dispose();
        const newWave = new SiriWave({
          container: containerRef.current,
          style: 'ios9',
          width: containerRef.current.clientWidth,
          height: 44,
          amplitude: isActive ? 1 + stressLevel * 0.2 : 0.15,
          speed: isActive ? 0.05 + stressLevel * 0.008 : 0.02,
          autostart: true,
          color: stressLevel >= 7 ? '#C41E1E' : '#E8E8E8',
        });
        waveRef.current = newWave;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      wave.dispose();
    };
  }, []);

  useEffect(() => {
    const wave = waveRef.current;
    if (!wave) return;

    if (isActive) {
      wave.setAmplitude(1 + stressLevel * 0.2);
      wave.setSpeed(0.05 + stressLevel * 0.008);
    } else {
      wave.setAmplitude(0.15);
      wave.setSpeed(0.02);
    }
  }, [isActive, stressLevel]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: '44px', overflow: 'hidden', margin: '8px 0', opacity: isActive ? 1 : 0.3, transition: 'opacity 0.5s ease' }}
    />
  );
}
