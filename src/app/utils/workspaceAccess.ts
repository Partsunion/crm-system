export interface WorkspaceIdentity {
  username?: string | null;
  name?: string | null;
  email?: string | null;
}

const WORKSPACE_SWITCH_IDENTITIES = new Set(['bardia', 'elias', 'fecat']);

function normalized(value: string | null | undefined): string {
  return String(value || '').trim().toLocaleLowerCase('de-DE');
}

/** UI allowlist only; the destination still enforces its server-side access. */
export function canUseWorkspaceSwitch(identity: WorkspaceIdentity | null | undefined): boolean {
  if (!identity) return false;
  const emailLocalPart = normalized(identity.email).split('@')[0];
  const displayFirstName = normalized(identity.name).split(/\s+/)[0];
  return [normalized(identity.username), emailLocalPart, displayFirstName]
    .some((part) => WORKSPACE_SWITCH_IDENTITIES.has(part));
}
