'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Cards that pick up the pointer highlight. Kept as one list so the stylesheet (app/motion.css)
 * and the pointer tracker agree on what counts as a card.
 */
export const FX_CARD_SELECTOR = [
  '.ch-card',
  '.ch-sample',
  '.ch-insight',
  '.reference-feature-card',
  '.reference-resource-card',
  '.reference-plan',
  '.blog-card',
  '.v3-stat',
  '.v3-surface',
  '.fx-card',
].join(',');

/** Sections that fade up as they scroll into view on public pages. */
const REVEAL_SELECTOR = 'main > section, main > div > section, .blog-card';

export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  );
}

export function isWorkspacePath(pathname: string | null) {
  return Boolean(pathname && /^\/(app|admin|onboarding)(\/|$)/.test(pathname));
}

/**
 * Pointer-reactive light for the whole site, ported from the Chrome extension popup.
 *
 * It only writes CSS custom properties (batched per animation frame) and toggles classes on
 * <html>, so it never re-renders React. Everything is decorative: without JavaScript, or when the
 * visitor prefers reduced motion, the page renders fully visible and static.
 */
export function MotionLayer() {
  const pathname = usePathname();
  const workspace = isWorkspacePath(pathname);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.fxSurface = workspace ? 'workspace' : 'public';
    if (prefersReducedMotion()) return;
    root.classList.add('fx-ready');

    let frame = 0;
    let last: PointerEvent | undefined;
    const paint = () => {
      frame = 0;
      if (!last) return;
      root.style.setProperty('--fx-mx', `${last.clientX}px`);
      root.style.setProperty('--fx-my', `${last.clientY}px`);
      root.style.setProperty('--fx-glow', '1');
      const card = (last.target as Element | null)?.closest?.(
        FX_CARD_SELECTOR,
      ) as HTMLElement | null;
      if (card) {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--fx-gx', `${last.clientX - rect.left}px`);
        card.style.setProperty('--fx-gy', `${last.clientY - rect.top}px`);
      }
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      last = event;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const leave = () => root.style.setProperty('--fx-glow', '0');
    const scrolled = () => root.classList.toggle('fx-scrolled', window.scrollY > 8);

    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    window.addEventListener('scroll', scrolled, { passive: true });
    scrolled();

    // Reveal on scroll, public pages only: the workspace stays instant.
    let observer: IntersectionObserver | undefined;
    if (!workspace && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add('fx-in');
            observer?.unobserve(entry.target);
          }
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
      );
      const viewport = window.innerHeight;
      for (const element of document.querySelectorAll(REVEAL_SELECTOR)) {
        // Content already on screen never hides, so there is no flash on first paint.
        if (element.getBoundingClientRect().top < viewport) continue;
        element.classList.add('fx-reveal');
        observer.observe(element);
      }
    }

    return () => {
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
      window.removeEventListener('scroll', scrolled);
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
      for (const element of document.querySelectorAll('.fx-reveal:not(.fx-in)'))
        element.classList.add('fx-in');
    };
  }, [pathname, workspace]);

  return (
    <div className="fx-layer" aria-hidden="true">
      <div className="fx-spotlight" />
      {!workspace && <div className="fx-aurora" />}
    </div>
  );
}
