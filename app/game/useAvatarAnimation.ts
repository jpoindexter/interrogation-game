import { useEffect, useRef } from 'react';
import { advanceAvatar, avatarTransform, createAvatarAnimation } from './avatar-animation';
import { drawAvatarEffects } from './avatar-effects';
import { useMotionPreference } from '../components/useMotionPreference';

type AnimationOptions = { width: number; height: number; scale: number; stress: number; speaking: boolean };

export function useAvatarAnimation(options: AnimationOptions) {
  const { width, height, scale, stress, speaking } = options;
  const reducedMotion = useMotionPreference();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const stateRef = useRef({ stress, speaking });
  useEffect(() => { stateRef.current = { stress, speaking }; }, [stress, speaking]);
  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imgRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !image || !ctx) return;
    const anim = createAvatarAnimation();
    let raf = 0;
    let lastTime = 0;
    const tick = (timestamp: number) => {
      const dt = lastTime === 0 ? 1 / 60 : Math.min((timestamp - lastTime) / 1000, 0.1);
      lastTime = timestamp;
      const input = { ...stateRef.current, dt };
      advanceAvatar(anim, input);
      image.style.transform = avatarTransform(anim, input.speaking, scale);
      drawAvatarEffects({ ctx, width, height }, anim, input);
      raf = requestAnimationFrame(tick);
    };
    const syncMotion = () => {
      cancelAnimationFrame(raf);
      lastTime = 0;
      image.style.transform = '';
      ctx.clearRect(0, 0, width, height);
      if (!reducedMotion) raf = requestAnimationFrame(tick);
    };
    syncMotion();
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [width, height, scale, reducedMotion]);
  return { canvasRef, imgRef };
}
