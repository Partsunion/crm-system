import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LeadBatchDialog } from './LeadBatchDialog';
import { deleteLead, saveLead } from '../utils/storage';
import { mayLeaveWorkspace } from '../utils/useWorkspaceGuard';

vi.mock('../utils/storage', () => ({ deleteLead: vi.fn(), saveLead: vi.fn() }));
const targets = [{ id: 'a', company: 'Firma A' }, { id: 'b', company: 'Firma B' }];
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

it('requires an explicit selection check and retries only unconfirmed deletions', async () => {
  vi.mocked(deleteLead).mockImplementation(async (id) => { if (id === 'b') throw new Error('Nicht berechtigt'); });
  const result = vi.fn();
  render(<LeadBatchDialog targets={targets} operation={{ kind: 'delete' }} onClose={vi.fn()} onResult={result} />);
  expect((screen.getByRole('button', { name: '2 Leads löschen' }) as HTMLButtonElement).disabled).toBe(true);
  expect(deleteLead).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: '2 Leads löschen' }));
  await screen.findByText(/1 von 2 Änderungen bestätigt/);
  expect(screen.getByText('Nicht berechtigt')).toBeTruthy();
  expect(result).toHaveBeenCalledWith([{ item: targets[0], ok: true }, { item: targets[1], ok: false, error: 'Nicht berechtigt' }]);
  vi.mocked(deleteLead).mockResolvedValue(undefined);
  fireEvent.click(screen.getByRole('button', { name: 'Nur fehlgeschlagene erneut versuchen' }));
  await screen.findByText(/2 von 2 Änderungen bestätigt/);
  expect(vi.mocked(deleteLead).mock.calls.map((call) => call[0])).toEqual(['a', 'b', 'b']);
});

it('locks duplicate submissions and navigation until every assignment request settles', async () => {
  let finish!: () => void;
  vi.mocked(saveLead).mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
  const close = vi.fn();
  render(<LeadBatchDialog targets={[targets[0]]} operation={{ kind: 'assign', username: 'Sales Person' }} onClose={close} onResult={vi.fn()} />);
  const submit = screen.getByRole('button', { name: 'Zuständigkeit speichern' });
  fireEvent.click(submit); fireEvent.click(submit);
  expect(saveLead).toHaveBeenCalledTimes(1);
  expect(saveLead).toHaveBeenCalledWith({ id: 'a', assignedTo: 'Sales Person' });
  expect(mayLeaveWorkspace()).toBe(false);
  fireEvent.keyDown(window, { key: 'Escape' }); expect(close).not.toHaveBeenCalled();
  await act(async () => finish());
  await waitFor(() => expect(mayLeaveWorkspace()).toBe(true));
});
