import { CheckCircle2, CircleDashed, LoaderCircle, XCircle } from 'lucide-react';
import type { EventState } from '../lib/types';
import { Badge } from './ui';

/** Human-friendly label + color for an event's processing state. */
export function EventStateBadge({ state }: { state: EventState }) {
  switch (state) {
    case 'READY':
      return <Badge color="green"><CheckCircle2 className="size-3.5" />Ready for guests</Badge>;
    case 'PROCESSING':
      return <Badge color="amber"><LoaderCircle className="size-3.5 animate-spin" />Analysing faces</Badge>;
    case 'FAILED':
      return <Badge color="red"><XCircle className="size-3.5" />Processing failed</Badge>;
    default:
      return <Badge><CircleDashed className="size-3.5" />No photos yet</Badge>;
  }
}
