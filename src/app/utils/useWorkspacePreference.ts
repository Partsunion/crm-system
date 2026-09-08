import { useEffect, useState } from 'react';
import { getCurrentUser } from './storage';

/** UI preferences belong to the signed-in user and this browser tab. */
export function workspaceKey(name: string): string {
  const user = getCurrentUser();
  return `crm_workspace:${user?.id || user?.username || 'unknown'}:${name}`;
}

export function useWorkspacePreference<T extends string | number | boolean>(name: string, fallback: T, allowed?: readonly T[]) {
  const key = workspaceKey(name);
  const [value, setValue] = useState<T>(() => {
    try {
      const stored: unknown = JSON.parse(sessionStorage.getItem(key) || 'null');
      return typeof stored === typeof fallback && (!allowed || allowed.includes(stored as T)) ? stored as T : fallback;
    } catch { return fallback; }
  });
  useEffect(() => {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Preferences must never block work. */ }
  }, [key, value]);
  return [value, setValue] as const;
}
