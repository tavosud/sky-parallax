import { useEffect, useRef } from 'react';

export interface UseParallaxOptions {
  /**
   * Translation speed relative to scroll.
   * Recommended range: -0.3 to 0.3.
   * @default 0.1
   */
  speed?: number;
  /** Axis on which the translation is applied. @default 'y' */
  axis?: 'x' | 'y' | 'both';
  /**
   * Lerp easing factor. 0.04 = cinematic. 0.15 = snappy. 1.0 = instant.
   * @default 0.1
   */
  easing?: number;
  /**
   * Zoom intensity at the viewport center (e.g. 0.06 → 1.0 to 1.06).
   * @default 0
   */
  scale?: number;
  /**
   * Max rotation in degrees, proportional to distance from viewport center.
   * @default 0
   */
  rotate?: number;
  /**
   * Fade the element in at the viewport center, out at the edges.
   * @default false
   */
  fade?: boolean;
  /** Disables all effects. @default false */
  disabled?: boolean;
  /**
   * Auto-disables when the user has `prefers-reduced-motion: reduce` set.
   * Reacts to runtime OS changes — WCAG 2.1 compliant.
   * @default true
   */
  respectMotionPreference?: boolean;
  /**
   * Minimum viewport width in px for effects to be active.
   * Set to `0` to always enable regardless of screen width.
   * @default 768
   */
  breakpoint?: number;
  /**
   * Custom scroll container. When provided, the effect tracks scroll within
   * this element instead of `window`. Required for layouts where the page
   * scroll lives inside a container with `overflow: auto | scroll`
   * (e.g. modals, sidebars, full-screen panels).
   *
   * @example
   * const containerRef = useRef<HTMLDivElement>(null);
   * <div ref={containerRef} style={{ overflowY: 'auto', height: '100vh' }}>
   *   <Parallax scrollContainer={containerRef} speed={0.1}>…</Parallax>
   * </div>
   */
  scrollContainer?: { current: HTMLElement | null };
  /**
   * Called when the element enters the viewport (or the scroll container).
   * Receives the full `IntersectionObserverEntry` for detailed visibility data.
   */
  onEnter?: (entry: IntersectionObserverEntry) => void;
  /**
   * Called when the element leaves the viewport (or the scroll container).
   * Receives the full `IntersectionObserverEntry` for detailed visibility data.
   */
  onLeave?: (entry: IntersectionObserverEntry) => void;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * `useParallax` — apply parallax effects directly to any DOM element via its ref.
 *
 * This is the headless version of `<Parallax>`. Use it when you already have
 * a DOM element and don't want an extra wrapper in the DOM tree.
 *
 * @example
 * const ref = useRef<HTMLImageElement>(null);
 * useParallax(ref, { speed: 0.1, scale: 0.05, fade: true });
 * return <img ref={ref} src="/hero.jpg" alt="Hero" />;
 */
export function useParallax(
  ref: { current: HTMLElement | null },
  options: UseParallaxOptions = {}
): void {
  const {
    speed = 0.1,
    axis = 'y',
    easing = 0.1,
    scale = 0,
    rotate = 0,
    fade = false,
    disabled = false,
    respectMotionPreference = true,
    breakpoint = 768,
    scrollContainer,
    onEnter,
    onLeave,
  } = options;

  // "Soft" options — read inside the rAF loop via ref so the IntersectionObserver
  // and scroll listener never need to be torn down when they change.
  const optsRef = useRef({ speed, axis, easing, scale, rotate, fade, onEnter, onLeave });
  useEffect(() => {
    optsRef.current = { speed, axis, easing, scale, rotate, fade, onEnter, onLeave };
  }, [speed, axis, easing, scale, rotate, fade, onEnter, onLeave]);

  useEffect(() => {
    const el = ref.current;
    // SSR guard — useEffect never runs on the server, but explicit is safer for
    // edge cases like Deno or Bun runtimes used as SSR environments.
    if (!el || disabled || typeof window === 'undefined') return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (respectMotionPreference && motionQuery.matches) return;

    const viewportQuery = breakpoint > 0
      ? window.matchMedia(`(min-width: ${breakpoint}px)`)
      : null;
    if (viewportQuery && !viewportQuery.matches) return;

    // Capture the container reference once — stable for the effect's lifetime.
    const container: HTMLElement | null = scrollContainer?.current ?? null;
    const scrollEl: EventTarget = container ?? window;

    // --- Animation state ---
    // target* = desired value (updated on scroll)
    // current* = interpolated value (updated each rAF frame toward target*)
    let currentX = 0, targetX = 0;
    let currentY = 0, targetY = 0;
    let currentSc = 1, targetSc = 1;
    let currentRot = 0, targetRot = 0;
    let currentOp = 1, targetOp = 1;
    let rafId: number | null = null;

    const applyStyles = () => {
      el.style.setProperty('--parallax-offset-x', `${currentX}px`);
      el.style.setProperty('--parallax-offset-y', `${currentY}px`);
      el.style.setProperty('--parallax-scale',    `${currentSc}`);
      el.style.setProperty('--parallax-rotate',   `${currentRot}deg`);
      el.style.setProperty('--parallax-opacity',  `${currentOp}`);
    };

    const animate = () => {
      const e = optsRef.current.easing ?? 0.1;
      currentX   = lerp(currentX,   targetX,   e);
      currentY   = lerp(currentY,   targetY,   e);
      currentSc  = lerp(currentSc,  targetSc,  e);
      currentRot = lerp(currentRot, targetRot, e);
      currentOp  = lerp(currentOp,  targetOp,  e);
      applyStyles();

      const settled =
        Math.abs(targetX   - currentX)   < 0.05   &&
        Math.abs(targetY   - currentY)   < 0.05   &&
        Math.abs(targetSc  - currentSc)  < 0.0005 &&
        Math.abs(targetRot - currentRot) < 0.01   &&
        Math.abs(targetOp  - currentOp)  < 0.001;

      if (!settled) {
        rafId = requestAnimationFrame(animate);
      } else {
        // Snap exactly to target to avoid permanent sub-pixel drift.
        currentX = targetX; currentY = targetY;
        currentSc = targetSc; currentRot = targetRot; currentOp = targetOp;
        applyStyles();
        rafId = null;
      }
    };

    const startLoop = () => {
      if (!rafId) rafId = requestAnimationFrame(animate);
    };

    const computeTargets = () => {
      const { speed: s, axis: a, scale: sc, rotate: r, fade: f } = optsRef.current;
      const rect = el.getBoundingClientRect();

      // When inside a custom container, measure distance relative to the container,
      // not the global viewport — fixes the X/Y axis normalization for both cases.
      let distanceY: number;
      let distanceX: number;

      if (container) {
        const cRect = container.getBoundingClientRect();
        distanceY = (rect.top  - cRect.top  + rect.height / 2) - container.clientHeight / 2;
        distanceX = (rect.left - cRect.left + rect.width  / 2) - container.clientWidth  / 2;
      } else {
        distanceY = rect.top  + rect.height / 2 - window.innerHeight / 2;
        distanceX = rect.left + rect.width  / 2 - window.innerWidth  / 2;
      }

      // Pages scroll vertically, so normalize using vertical distance for all axes.
      // axis="x" applies vertical scroll progress to the X axis (lateral drift effect).
      const primaryHalf = container ? container.clientHeight / 2 : window.innerHeight / 2;
      const normalized      = clamp(distanceY / primaryHalf, -1, 1);
      const centerProximity = 1 - Math.abs(normalized);

      targetY = a !== 'x' ? distanceY * s : 0;
      targetX = a !== 'y' ? distanceY * s : 0;
      targetSc  = sc !== 0 ? 1 + centerProximity * sc : 1;
      targetRot = r  !== 0 ? normalized * r           : 0;
      targetOp  = f        ? clamp(centerProximity * 1.4, 0, 1) : 1;
    };

    const onScroll = () => {
      computeTargets();
      startLoop();
    };

    const resetAll = () => {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      currentX = targetX = 0; currentY = targetY = 0;
      currentSc = targetSc = 1; currentRot = targetRot = 0; currentOp = targetOp = 1;
      applyStyles();
    };

    // Snap to initial position on mount (no lerp — avoids a visible slide-in).
    computeTargets();
    currentX = targetX; currentY = targetY;
    currentSc = targetSc; currentRot = targetRot; currentOp = targetOp;
    applyStyles();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            scrollEl.addEventListener('scroll', onScroll, { passive: true });
            computeTargets();
            startLoop();
            optsRef.current.onEnter?.(entry);
          } else {
            scrollEl.removeEventListener('scroll', onScroll);
            resetAll();
            optsRef.current.onLeave?.(entry);
          }
        }
      },
      { threshold: 0, root: container }
    );

    observer.observe(el);

    // React to OS-level motion preference changes at runtime.
    const onMotionChange = () => {
      if (respectMotionPreference && motionQuery.matches) {
        scrollEl.removeEventListener('scroll', onScroll);
        resetAll();
      }
    };
    motionQuery.addEventListener('change', onMotionChange);

    // React to viewport crossing the breakpoint boundary (rotation, resize, DevTools).
    const onViewportChange = (mql: MediaQueryListEvent) => {
      if (!mql.matches) {
        observer.disconnect();
        scrollEl.removeEventListener('scroll', onScroll);
        resetAll();
      } else {
        observer.observe(el);
      }
    };
    viewportQuery?.addEventListener('change', onViewportChange);

    return () => {
      observer.disconnect();
      scrollEl.removeEventListener('scroll', onScroll);
      motionQuery.removeEventListener('change', onMotionChange);
      viewportQuery?.removeEventListener('change', onViewportChange);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [disabled, respectMotionPreference, breakpoint, scrollContainer]);
}
