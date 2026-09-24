import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { accountRequest, authenticate, AuthenticationChallenge, getCurrentUser, logout, saveLead, validateSession, getLeads, mfaRequest } from './storage';
import { vergessen } from './zwischenspeicher';

const request = vi.fn();
beforeEach(() => { sessionStorage.clear(); localStorage.clear(); vergessen(); vi.stubGlobal('fetch', request); request.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); });
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

describe('CRM account boundary', () => {
  it('does not represent a failed lead request as an empty database', async () => {
    request.mockResolvedValue(response({ error: 'offline' }, 503));
    await expect(getLeads()).rejects.toThrow();
  });
  it('uses CRM scope for MFA without persisting the setup secret', async () => {
    request.mockResolvedValue(response({ secret: 'TEST-ONLY', otpauth_url: 'otpauth://test' }));
    await mfaRequest('enroll', { password: 'test-passphrase' });
    expect(request.mock.calls[0][1].headers['X-Partsunion-App']).toBe('crm');
    expect(JSON.parse(request.mock.calls[0][1].body).app).toBe('crm');
    expect(JSON.stringify(sessionStorage)).not.toContain('TEST-ONLY');
  });
  it('uses CRM-specific login and supports cookie-only sessions', async () => {
    request.mockResolvedValue(response({ user: { id: 'sales-1', username: 'aaron', role: 'sales', app_access: { admin: false, crm: true } } }));
    const user = await authenticate('aaron', 'a passphrase');
    expect(user?.role).toBe('sales');
    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({ username: 'aaron', password: 'a passphrase', app: 'crm' });
  });
  it('challenges MFA instead of treating a valid password as invalid', async () => {
    request.mockResolvedValue(response({ code: 'MFA_REQUIRED', requires_2fa: true }, 401));
    await expect(authenticate('seller', 'a passphrase')).rejects.toBeInstanceOf(AuthenticationChallenge);
  });
  it('validates cookie session and clears cached identity when revoked', async () => {
    sessionStorage.setItem('haendler_crm_current_user', JSON.stringify({ username: 'stale' }));
    request.mockResolvedValue(response({ authenticated: false, user: null }));
    expect(await validateSession()).toBeNull(); expect(getCurrentUser()).toBeNull();
    expect(request.mock.calls[0][0]).toContain('/session?app=crm');
  });
  it('restores a matching CRM cookie through the quiet session probe', async () => {
    request.mockResolvedValue(response({ authenticated: true, user: {
      id: 'sales-1', username: 'aaron', full_name: 'Aaron Vertrieb', role: 'sales', app_access: { admin: false, crm: true },
    } }));
    expect(await validateSession()).toMatchObject({ id: 'sales-1', username: 'aaron', name: 'Aaron Vertrieb', role: 'sales' });
    expect(request.mock.calls[0][0]).toContain('/session?app=crm');
  });
  it('revokes the server session on logout even without a bearer token', async () => {
    request.mockResolvedValue(response({ ok: true }));
    sessionStorage.setItem('haendler_crm_current_user', JSON.stringify({ username: 'seller' }));
    await logout();
    expect(getCurrentUser()).toBeNull();
    expect(request.mock.calls[0][0]).toContain('/admin-auth/logout');
    expect(request.mock.calls[0][1]).toMatchObject({ method: 'POST', credentials: 'include', headers: { 'X-Partsunion-App': 'crm' } });
  });
  it('requests recovery for the correct application', async () => {
    request.mockResolvedValue(response({ ok: true }));
    await accountRequest('request-reset', { email: 'seller@example.de' });
    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({ email: 'seller@example.de', app: 'crm' });
  });
  it('creates leads internally and does not report a rejected mutation as success', async () => {
    request.mockResolvedValue(response({ error: 'forbidden' }, 403));
    await expect(saveLead({ company: 'Test' })).rejects.toThrow('angelegt');
    expect(request.mock.calls[0][0]).toContain('/api/crm/leads/internal');
    request.mockResolvedValue(response({ error: 'failed' }, 500));
    await expect(saveLead({ id: '1', status: 'Angebot' })).rejects.toThrow('gespeichert');
  });
});
