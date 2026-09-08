import { afterEach, expect, it, vi } from 'vitest';
import { getLeads, updateAppointment } from './storage';
import { vergessen } from './zwischenspeicher';

afterEach(() => { vergessen(); vi.unstubAllGlobals(); });

it('refreshes cached lead follow-ups after a callback is completed', async () => {
  vergessen();
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ([{ id: 'lead', company: 'Firma', nextFollowUpDate: '2026-07-27' }]) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ appointment: { id: 'call', status: 'completed' } }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ([{ id: 'lead', company: 'Firma', nextFollowUpDate: '' }]) });
  vi.stubGlobal('fetch', fetchMock);
  expect((await getLeads())[0].nextFollowUpDate).toBe('2026-07-27');
  await updateAppointment('call', { status: 'completed' });
  expect((await getLeads())[0].nextFollowUpDate).toBe('');
  expect(fetchMock).toHaveBeenCalledTimes(3);
});
