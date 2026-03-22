import { createElement, useRef, CSSProperties, JSX, ReactNode } from 'react';
import { useParallax, UseParallaxOptions } from './useParallax';
import './Parallax.css';

export type ParallaxProps = UseParallaxOptions & {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /**
   * HTML element to render as the wrapper.
   * Useful for semantic markup (`section`, `figure`, `span`, etc.).
   * @default 'div'
   */
  as?: keyof JSX.IntrinsicElements;
};

export function Parallax({
  children,
  className,
  style,
  as: Tag = 'div',
  ...options
}: ParallaxProps) {
  const ref = useRef<HTMLElement>(null);
  useParallax(ref, options);

  return createElement(
    Tag as string,
    {
      ref,
      className: `sky-parallax${className ? ` ${className}` : ''}`,
      style,
    },
    children
  );
}

export default Parallax;

