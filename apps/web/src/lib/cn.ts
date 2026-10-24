/** Join class names, skipping empty ones: cn('a', cond && 'b', undefined) → 'a b'. */
export function cn(...classes: (string | false | null | undefined | 0)[]) {
  return classes.filter(Boolean).join(' ');
}
