import { useEffect, type RefObject } from 'react';

/**
 * Close something (menu, dialog, lightbox) when the user presses Escape or —
 * if `ref` is given — clicks outside of it.
 */
export function useDismiss(onDismiss: () => void, { ref, enabled = true }: { ref?: RefObject<HTMLElement | null>; enabled?: boolean } = {}) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onDismiss();
    const onPointer = (event: PointerEvent) => {
      if (ref?.current && !ref.current.contains(event.target as Node)) onDismiss();
    };
    document.addEventListener('keydown', onKey);
    if (ref) document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [onDismiss, ref, enabled]);
}

/** Stop the page behind an overlay from scrolling while it's open. */
export function useScrollLock(locked = true) {
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);
}
