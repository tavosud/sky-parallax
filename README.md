# @tavosud/sky-parallax

A lightweight, zero-dependency React component and headless hook that apply smooth scroll-driven parallax motion to any element — images, text, divs, or any HTML tag.

Built for production: no re-renders on scroll, IntersectionObserver gating, GPU-accelerated transforms, full WCAG 2.1 accessibility support, and custom scroll container support.

## Installation

```bash
npm install @tavosud/sky-parallax
```

## Setup

Import the component's CSS once in your app entry point (or layout file):

```ts
import '@tavosud/sky-parallax/dist/index.css';
```

## Usage

```tsx
import { Parallax } from '@tavosud/sky-parallax';

// Classic depth layer — moves opposite to scroll
<Parallax speed={-0.1}>
  <img src="/clouds.png" alt="" aria-hidden="true" />
</Parallax>

// Cinematic entrance — eased zoom + fade as element enters viewport
<Parallax speed={0.08} scale={0.06} fade easing={0.07}>
  <h1>Welcome</h1>
</Parallax>

// Subtle rotation + lateral drift
<Parallax speed={0.12} axis="x" rotate={4} easing={0.05}>
  <img src="/card.png" alt="Card" />
</Parallax>

// Semantic wrapper + full combo
<Parallax as="figure" speed={0.1} scale={0.04} rotate={2} fade easing={0.08}>
  <img src="/hero.jpg" alt="Hero" />
</Parallax>

// Automatic responsive — disabled below 768px (default)
<Parallax speed={0.15}>
  <div className="bg-layer" />
</Parallax>

// Only on desktop (≥ 1024px)
<Parallax speed={0.2} breakpoint={1024}>
  <div className="bg-layer" />
</Parallax>

// Always active, even on mobile
<Parallax speed={0.05} breakpoint={0} easing={0.15}>
  <span>Floating tag</span>
</Parallax>
```

## `useParallax` hook

The headless version of `<Parallax>`. Applies all effects directly to an existing element via its `ref` — **no extra wrapper `<div>` in the DOM**.

Ideal for when you want to animate elements you already own (images, headings, custom components) without changing their DOM structure.

```tsx
import { useRef } from 'react';
import { useParallax } from '@tavosud/sky-parallax';
import '@tavosud/sky-parallax/dist/index.css';

export function Hero() {
  const imgRef = useRef<HTMLImageElement>(null);
  useParallax(imgRef, { speed: 0.1, scale: 0.05, fade: true, easing: 0.08 });

  const titleRef = useRef<HTMLHeadingElement>(null);
  useParallax(titleRef, { speed: -0.05, easing: 0.06 });

  return (
    <section>
      {/* No wrapper div — the effect is on the img itself */}
      <img ref={imgRef} src="/hero.jpg" alt="Hero" className="sky-parallax" />
      <h1 ref={titleRef} className="sky-parallax">Welcome</h1>
    </section>
  );
}
```

> **Note:** When using `useParallax` directly, add the `sky-parallax` CSS class to the element so it gets `will-change: transform` and the CSS variable transform applied.

`useParallax` accepts the same options as all props of `<Parallax>` (except `children`, `as`, `className`, `style`).

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `ReactNode` | — | Content to apply effects to. |
| `speed` | `number` | `0.1` | Translation intensity. Range: `-0.3` to `0.3`. Negative → depth (moves opposite scroll). Positive → float (moves with scroll). |
| `axis` | `'x' \| 'y' \| 'both'` | `'y'` | Axis for the translation offset. |
| `easing` | `number` | `0.1` | Lerp factor. `0.04` = cinematic & sluggish. `0.15` = snappy. `1.0` = instant (disables lerp). |
| `scale` | `number` | `0` | Zoom effect. The element scales up by this amount at the viewport center. `0.08` → ranges 1.0–1.08 across the viewport. |
| `rotate` | `number` | `0` | Max rotation in degrees. Proportional to distance from viewport center. |
| `fade` | `boolean` | `false` | Fades the element in as it approaches the viewport center and out as it moves away. |
| `as` | `keyof JSX.IntrinsicElements` | `'div'` | HTML element to render as wrapper (e.g. `'figure'`, `'section'`, `'span'`). |
| `className` | `string` | — | Additional CSS class names for the wrapper. |
| `style` | `CSSProperties` | — | Inline styles for the wrapper. |
| `disabled` | `boolean` | `false` | Completely disables all effects. |
| `respectMotionPreference` | `boolean` | `true` | Auto-disables when `prefers-reduced-motion: reduce` is set (WCAG 2.1). Reacts to runtime OS changes. |
| `breakpoint` | `number` | `768` | Minimum viewport width in px for effects to be active. Below this value the component renders as a plain wrapper — no parallax, no layout shift. Reacts live to orientation changes and DevTools responsive mode. Set to `0` to always enable. |
| `scrollContainer` | `{ current: HTMLElement \| null }` | — | Custom scroll container ref. When provided, the effect tracks scroll inside this element instead of `window`. Required for modals, sidebars, and full-screen overflow panels. |
| `onEnter` | `(entry: IntersectionObserverEntry) => void` | — | Fired when the element enters the viewport (or scroll container). |
| `onLeave` | `(entry: IntersectionObserverEntry) => void` | — | Fired when the element leaves the viewport (or scroll container). |

## Performance model

| Technique | Why |
|---|---|
| **Lerp animation loop** | The element glides toward its target value each frame (`current += (target - current) * easing`), producing organic, momentum-based motion instead of mechanical linear tracking. |
| `IntersectionObserver` | The scroll listener and the rAF loop are only active while the element is in the viewport. |
| `requestAnimationFrame` loop | Updates happen in sync with the display refresh rate. The loop self-terminates once the element has settled, burning zero CPU at rest. |
| `style.setProperty('--parallax-*', ...)` | Updates the DOM directly — **zero React re-renders** on scroll. |
| `will-change: transform, opacity` | Promotes the element to its own GPU compositor layer. |
| `transform: translateX/Y scale rotate(var(...))` | All effects are composed into a single transform, living entirely on the compositor thread — no layout, no paint. |
| `{ passive: true }` scroll listener | Guarantees the main thread scroll is never blocked. |
| `propsRef` pattern | All effect props (`speed`, `easing`, `scale`…) are kept in a ref, so they are always current inside the rAF loop without ever restarting the `IntersectionObserver`. |
| Custom `scrollContainer` | When a scroll container is provided, all distance calculations use the container's dimensions, fixing the axis normalization for both X and Y effects inside overflow panels. |

## Next.js / React Server Components

All effects run in `useEffect`, so the library is **SSR-safe** — no `window` or DOM access occurs during server rendering.

However, because `<Parallax>` and `useParallax` use React hooks, they require a **Client Component** boundary in Next.js App Router:

```tsx
// app/components/HeroSection.tsx
'use client'; // ← required when using Parallax or useParallax

import { Parallax } from '@tavosud/sky-parallax';

export function HeroSection() {
  return (
    <Parallax speed={0.1} scale={0.05}>
      <img src="/hero.jpg" alt="Hero" />
    </Parallax>
  );
}
```

Keep the `'use client'` boundary as low as possible — only the component that directly uses `<Parallax>` or `useParallax` needs it.

By default all effects are **automatically disabled on viewports narrower than `768px`**, so mobile users get a plain, performant wrapper with no layout shifts or forced GPU layers.

The check uses `window.matchMedia`, which means it reacts instantly to:
- Device orientation changes (portrait ↔ landscape)
- Browser window resize
- Chrome/Firefox DevTools responsive mode

```tsx
// Default — effects active on tablet and desktop (≥ 768px)
<Parallax speed={0.1} scale={0.05}>
  <img src="/hero.jpg" alt="Hero" />
</Parallax>

// Loosen the threshold for tablets in landscape (≥ 600px)
<Parallax speed={0.08} breakpoint={600}>
  <img src="/card.jpg" alt="Card" />
</Parallax>

// Desktop-only decoration
<Parallax speed={0.15} rotate={3} breakpoint={1024}>
  <div className="decoration" />
</Parallax>

// Zero prevents any automatic disabling — use with low speed values on mobile
<Parallax speed={0.04} easing={0.2} breakpoint={0}>
  <p>Always animated</p>
</Parallax>
```

> **Tip:** Keep `speed` below `0.06` and `easing` above `0.15` when targeting touch screens (`breakpoint={0}`) to avoid motion sickness on small displays.

## Browser support

All features (CSS custom properties, `IntersectionObserver`, `matchMedia`) are supported in every modern browser (Chrome 61+, Firefox 63+, Safari 12.1+, Edge 79+).

## License

MIT © tavosud
