import { RefreshCw } from 'lucide-react';
import { Button } from './ui-kit';

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-status-danger/30 bg-surface px-4 py-3 text-sm"><p>{message} Vorhandene Daten bleiben unverändert.</p><Button variant="secondary" size="sm" onClick={onRetry}><RefreshCw className="size-4" />Erneut versuchen</Button></div>;
}
