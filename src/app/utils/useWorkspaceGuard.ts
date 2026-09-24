import { useEffect } from 'react';
import { toast } from 'sonner';

/** Shared contract for sidebar, refresh, logout and browser-history navigation. */
export function mayLeaveWorkspace(): boolean {
  return window.dispatchEvent(new Event('crm:navigation-check', { cancelable: true }));
}

export function useWorkspaceGuard(dirty: boolean, busy = false): void {
  useEffect(() => {
    if (!dirty && !busy) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const navigate = (event: Event) => {
      if (event.defaultPrevented) return;
      if (busy) {
        event.preventDefault();
        toast.info('Die Bearbeitung läuft noch. Bitte das Ergebnis abwarten.');
      } else if (!window.confirm('Ungespeicherte Änderungen verwerfen und die Ansicht verlassen?')) {
        event.preventDefault();
      }
    };
    window.addEventListener('beforeunload', unload);
    window.addEventListener('crm:navigation-check', navigate);
    return () => {
      window.removeEventListener('beforeunload', unload);
      window.removeEventListener('crm:navigation-check', navigate);
    };
  }, [dirty, busy]);
}
