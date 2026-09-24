import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { LeadModal } from './LeadModal';
vi.mock('../utils/storage', () => ({ getSettings: () => ({ industries: [], sources: ['Manuell'], pipelineStages: [{ name: 'Eingang', category: 'open', isActive: true, order: 1 }] }), getStatusOptions: () => ['Eingang'], getAppointmentAdmins: async () => [] }));
afterEach(cleanup);
it('requires company and displays a field error without submitting', async () => {
  const save = vi.fn(); const user = userEvent.setup();
  render(<LeadModal lead={null} onClose={vi.fn()} onSave={save} />);
  await user.click(screen.getByRole('button', { name: 'Lead erstellen' }));
  expect(screen.getByRole('alert').textContent).toContain('Firmennamen'); expect(save).not.toHaveBeenCalled();
});
it('locks submission while saving, retains inputs on failure and allows retry', async () => {
  let reject!: (error: Error) => void;
  const save = vi.fn().mockImplementationOnce(() => new Promise<void>((_, fail) => { reject = fail; })).mockResolvedValue(undefined);
  const user = userEvent.setup(); render(<LeadModal lead={null} onClose={vi.fn()} onSave={save} />);
  await user.type(screen.getByLabelText(/Firma \/ Händler/), 'Testhändler');
  await user.click(screen.getByRole('button', { name: 'Lead erstellen' }));
  expect((screen.getByRole('button', { name: 'Wird gespeichert…' }) as HTMLButtonElement).disabled).toBe(true);
  expect(save).toHaveBeenCalledTimes(1);
  await act(async () => reject(new Error('Server nicht erreichbar')));
  expect(screen.getByRole('alert').textContent).toContain('Server nicht erreichbar');
  expect((screen.getByLabelText(/Firma \/ Händler/) as HTMLInputElement).value).toBe('Testhändler');
  await user.click(screen.getByRole('button', { name: 'Lead erstellen' }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
});
