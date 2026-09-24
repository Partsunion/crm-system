import { useEffect, useState } from 'react';

/** Keep due-date filters current in a workspace left open across midnight. */
export function useWorkspaceTime(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  return now;
}
