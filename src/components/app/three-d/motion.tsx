'use client';

import type { MouseEvent, ReactNode } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

/**
 * Shared 3D motion primitives used across the whole app.
 * Every primitive respects prefers-reduced-motion and degrades to static rendering.
 */

/** Pointer-tracking 3D tilt wrapper (springs back to flat on leave). */
export function Tilt3D({ children, className, max = 6 }: { children: ReactNode; className?: string; max?: number }) {
  const reduced = useReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rotateX = useSpring(rawX, { stiffness: 150, damping: 18 });
  const rotateY = useSpring(rawY, { stiffness: 150, damping: 18 });

  function onMove(event: MouseEvent<HTMLDivElement>) {
    if (reduced) return;
    const rect = event.currentTarget.getBoundingClientRect();
    rawY.set(((event.clientX - rect.left) / rect.width - 0.5) * max);
    rawX.set(-((event.clientY - rect.top) / rect.height - 0.5) * max);
  }

  function onLeave() {
    rawX.set(0);
    rawY.set(0);
  }

  return (
    <div className={'[perspective:1200px] ' + (className ?? '')}>
      <motion.div
        className="h-full"
        style={reduced ? undefined : { rotateX, rotateY, transformStyle: 'preserve-3d' }}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        {children}
      </motion.div>
    </div>
  );
}

/** Scroll/mount-triggered 3D rise: rises from below while un-tilting. */
export function Rise3D({
  children,
  className,
  delay = 0,
  distance = 24,
  tilt = 8,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
  tilt?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: distance, rotateX: -tilt, transformPerspective: 900 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  );
}

/** Gentle infinite float with a soft wobble — for icons, badges and empty states. */
export function Float3D({
  children,
  className,
  delay = 0,
  distance = 6,
  wobble = 2,
  duration = 4.5,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
  wobble?: number;
  duration?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -distance, 0], rotate: [-wobble, wobble, -wobble] }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      {children}
    </motion.div>
  );
}

/** Content that flips in with a 3D rotation whenever `switchKey` changes. */
export function FlipIn3D({
  children,
  className,
  switchKey,
  tilt = 10,
  distance = 14,
}: {
  children: ReactNode;
  className?: string;
  switchKey: string | number;
  tilt?: number;
  distance?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <div className={'[perspective:900px] ' + (className ?? '')}>
      <motion.div
        key={switchKey}
        initial={reduced ? { opacity: 0 } : { opacity: 0, rotateX: -tilt, y: distance }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, rotateX: 0, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={reduced ? undefined : { transformStyle: 'preserve-3d' }}
      >
        {children}
      </motion.div>
    </div>
  );
}
