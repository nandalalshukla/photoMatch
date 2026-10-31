/**
 * Fade-and-rise on first scroll into view. Uses CSS transitions, so the global
 * "reduce motion" rule makes it appear instantly.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

/** True once the element has been on screen (stays true). */
export function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, inView] as const;
}

/** Classes for the hidden → shown transition; pair with useInView. */
export function revealClass(inView: boolean) {
  return cn('transition duration-700 ease-out', inView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0');
}

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={cn(revealClass(inView), className)}>
      {children}
    </div>
  );
}
