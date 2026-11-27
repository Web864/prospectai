'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { isWorkspacePath, prefersReducedMotion } from './motion-layer';

/** Elements that make the ring grow, as a hint that they can be clicked. */
const INTERACTIVE =
  'a, button, [role="button"], summary, label, select, [tabindex]:not([tabindex="-1"])';
/** Where the native text cursor is more useful than the custom one. */
const TEXT_ENTRY =
  'input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]';

/**
 * A dot that follows the pointer exactly, with a ring that trails it and grows over links and
 * buttons. Public pages only, and only for a fine pointer (mouse or trackpad) without
 * prefers-reduced-motion; touch devices and the workspace keep the normal cursor. The native
 * cursor comes back over text fields so typing still shows a caret position.
 */
export function CustomCursor() {
  const pathname = usePathname();
  const workspace = isWorkspacePath(pathname);
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;
    if (workspace || !fine || prefersReducedMotion() || !dot.current || !ring.current) {
      root.classList.remove('fx-cursor');
      return;
    }
    const dotNode = dot.current;
    const ringNode = ring.current;
    let x = -100;
    let y = -100;
    let rx = -100;
    let ry = -100;
    let frame = 0;
    let shown = false;

    const tick = () => {
      rx += (x - rx) * 0.2;
      ry += (y - ry) * 0.2;
      dotNode.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      ringNode.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      frame = Math.abs(x - rx) + Math.abs(y - ry) > 0.2 ? requestAnimationFrame(tick) : 0;
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      x = event.clientX;
      y = event.clientY;
      if (!shown) {
        rx = x;
        ry = y;
        shown = true;
        root.classList.add('fx-cursor');
      }
      const target = event.target as Element | null;
      const text = Boolean(target?.closest?.(TEXT_ENTRY));
      root.classList.toggle('fx-cursor-text', text);
      root.classList.toggle('fx-cursor-hover', !text && Boolean(target?.closest?.(INTERACTIVE)));
      root.classList.remove('fx-cursor-out');
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const down = () => root.classList.add('fx-cursor-down');
    const up = () => root.classList.remove('fx-cursor-down');
    const out = (event: PointerEvent) => {
      if (!event.relatedTarget) root.classList.add('fx-cursor-out');
    };

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    document.addEventListener('pointerout', out);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      document.removeEventListener('pointerout', out);
      if (frame) cancelAnimationFrame(frame);
      root.classList.remove(
        'fx-cursor',
        'fx-cursor-hover',
        'fx-cursor-text',
        'fx-cursor-down',
        'fx-cursor-out',
      );
    };
  }, [workspace]);

  if (workspace) return null;
  return (
    <>
      <div ref={ring} className="fx-cursor-ring" aria-hidden="true" />
      <div ref={dot} className="fx-cursor-dot" aria-hidden="true" />
    </>
  );
}
