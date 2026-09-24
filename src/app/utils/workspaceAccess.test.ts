import { describe, expect, it } from 'vitest';
import { canUseWorkspaceSwitch } from './workspaceAccess';

describe('canUseWorkspaceSwitch', () => {
  it.each(['Bardia', 'elias', 'FECAT'])('allows the named internal operator %s', (username) => {
    expect(canUseWorkspaceSwitch({ username })).toBe(true);
  });

  it('recognises an approved email local part', () => {
    expect(canUseWorkspaceSwitch({ email: 'fecat@partsunion.de' })).toBe(true);
  });

  it.each(['aaron', 'bardia-external', 'elias2', '', undefined])('rejects %s', (username) => {
    expect(canUseWorkspaceSwitch({ username })).toBe(false);
  });
});
