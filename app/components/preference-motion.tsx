'use client';
import { createElement, type ElementType } from 'react';
import { motion as baseMotion } from 'motion/react';
import { useMotionPreference } from './useMotionPreference';
import { reducedMotionProperties } from './reduced-motion-properties';

const elements = new Map<string, ElementType>();
/** Keep Motion's DOM API while applying the same reduced-motion rule on every screen. */
export const motion = new Proxy(baseMotion, {
  get(target, name, receiver) {
    const original = Reflect.get(target, name, receiver);
    if (typeof name !== 'string' || ['create', 'isMotionComponent'].includes(name)) return original;
    const existing = elements.get(name);
    if (existing) return existing;
    function PreferenceMotion(props: Record<string, unknown>) {
      const reduced = useMotionPreference();
      return createElement(original as ElementType, reduced ? reducedMotionProperties(props) : props);
    }
    elements.set(name, PreferenceMotion);
    return PreferenceMotion;
  },
});
