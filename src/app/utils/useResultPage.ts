import { useEffect, useState } from 'react';
import { workspaceKey } from './useWorkspacePreference';

/** Reset/clamp before children render; selection is owned by the caller. */
export function useResultPage<T>(items: T[], scope: string, options?: {remember: string; loading?: boolean}) {
  const key = options?.remember ? workspaceKey('pages.' + options.remember) : '';
  const [initial] = useState(() => {
    try {
      const stored = key ? JSON.parse(sessionStorage.getItem(key) || 'null') : null;
      if (stored && typeof stored.scope === 'string' && [25,50,100].includes(stored.size) && Number.isSafeInteger(stored.page) && stored.page > 0) return {scope:stored.scope as string,size:stored.size as number,page:stored.page as number};
    } catch { /* Ignore damaged or unavailable preference storage. */ }
    return {scope,size:25,page:1};
  });
  const [size, setSize] = useState(initial.size);
  const [request, setRequest] = useState(initial);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(pages, request.scope === scope && request.size === size ? request.page : 1);
  if (!options?.loading && (request.scope !== scope || request.size !== size || request.page !== page)) {
    setRequest({ scope, size, page });
  }
  useEffect(() => {
    if (!key || options?.loading) return;
    try { sessionStorage.setItem(key, JSON.stringify({scope,size,page})); } catch { /* UI remains usable without persistence. */ }
  }, [key, options?.loading, scope, size, page]);
  const start = (page - 1) * size;
  return {
    page, pages, size, start, end: Math.min(start + size, items.length), rows: items.slice(start, start + size),
    setPage: (next: number) => setRequest({ scope, size, page: Math.max(1, Math.min(pages, Math.floor(next) || 1)) }),
    setSize: (next: number) => { if ([25, 50, 100].includes(next)) setSize(next); },
  };
}
