/** Scroll-driven motion: reveal on scroll, and a hook for scroll progress through an element. */
import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

/** True once the element has scrolled into view (stays true). */
export function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || inView) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setInView(true), { threshold });
    observer.observe(element);
    return () => observer.disconnect();
  }, [inView, threshold]);
  return { ref, inView };
}

/**
 * Fades its content up as it scrolls into view. `develop` makes images inside
 * develop like a print (grey and soft → sharp and in color). `delay` in ms.
 */
export function Reveal({ as: Tag = 'div', delay = 0, develop, className, style, children }: {
  as?: ElementType;
  delay?: number;
  develop?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { ref, inView } = useInView<HTMLElement>(0.15);
  return (
    <Tag
      ref={ref}
      data-visible={inView || undefined}
      className={cn('reveal', develop && 'reveal-develop', className)}
      style={{ '--reveal-delay': `${delay}ms`, ...style } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

/**
 * How far the page has scrolled through an element: 0 when its top reaches the
 * bottom of the screen, 1 when its bottom reaches the top. Updated once per frame.
 */
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const element = ref.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const total = rect.height + window.innerHeight;
      setProgress(Math.min(1, Math.max(0, (window.innerHeight - rect.top) / total)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return { ref, progress };
}
