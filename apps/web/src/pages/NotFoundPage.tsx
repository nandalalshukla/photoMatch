import { SearchX } from 'lucide-react';
import { ButtonLink, EmptyState } from '../components/ui';

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center">
      <EmptyState icon={<SearchX />} title="Page not found" body="The page you're looking for doesn't exist or was moved." action={<ButtonLink to="/">Go home</ButtonLink>} />
    </div>
  );
}
