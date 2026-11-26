import { type RefObject, useEffect, useState } from 'react';

export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Pointer-reactive light: writes the pointer position into CSS variables so the stylesheet can
 * paint a soft spotlight that follows the mouse across the popup (--mx/--my on the shell) and a
 * highlight inside the hovered card (--gx/--gy on any `.glow-card`). Purely decorative: it only
 * sets custom properties, batches updates per animation frame and is skipped entirely when the
 * user prefers reduced motion.
 */
export function usePointerGlow(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;
    let frame = 0;
    let last: PointerEvent | undefined;
    const paint = () => {
      frame = 0;
      if (!last) return;
      const bounds = root.getBoundingClientRect();
      root.style.setProperty('--mx', `${last.clientX - bounds.left}px`);
      root.style.setProperty('--my', `${last.clientY - bounds.top + root.scrollTop}px`);
      root.style.setProperty('--glow-opacity', '1');
      const card = (last.target as Element | null)?.closest?.('.glow-card') as HTMLElement | null;
      if (card) {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--gx', `${last.clientX - rect.left}px`);
        card.style.setProperty('--gy', `${last.clientY - rect.top}px`);
      }
    };
    const move = (event: PointerEvent) => {
      last = event;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const leave = () => root.style.setProperty('--glow-opacity', '0');
    root.addEventListener('pointermove', move, { passive: true });
    root.addEventListener('pointerleave', leave);
    return () => {
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerleave', leave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref]);
}

/** Counts up to a score once it appears; shows the final value immediately for reduced motion. */
export function useCountUp(target: number | null | undefined, durationMs = 900) {
  const [value, setValue] = useState(() =>
    target === null || target === undefined || prefersReducedMotion() ? target : 0,
  );
  useEffect(() => {
    if (target === null || target === undefined || prefersReducedMotion()) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (time: number) => {
      const progress = Math.min(1, (time - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);
  return value;
}
