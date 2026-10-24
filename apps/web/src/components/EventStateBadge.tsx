import { LoaderCircle } from 'lucide-react';
import type { EventState } from '../lib/types';
import { Badge } from './ui';

/** Human-friendly label + color for an event's processing state. */
export function EventStateBadge({ state, className }: { state: EventState; className?: string }) {
  switch (state) {
    case 'READY':
      return <Badge color="green" dot className={className}>Ready for guests</Badge>;
    case 'PROCESSING':
      return <Badge color="amber" className={className}><LoaderCircle className="size-3 animate-spin" />Analysing faces</Badge>;
    case 'FAILED':
      return <Badge color="red" dot className={className}>Processing failed</Badge>;
    default:
      return <Badge dot className={className}>No photos yet</Badge>;
  }
}
