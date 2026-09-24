import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AccountRecovery } from './AccountRecovery';
import { accountRequest } from '../utils/storage';

vi.mock('../utils/storage', () => ({ accountRequest: vi.fn().mockResolvedValue(undefined) }));
beforeEach(() => { window.history.replaceState(null, '', '/reset-password'); vi.clearAllMocks(); });
afterEach(cleanup);

it('handles a mailed fragment link in the same tab after requesting recovery', async () => {
  const user = userEvent.setup();
  render(<AccountRecovery onDone={vi.fn()} />);
  await user.type(screen.getByLabelText(/Benutzername oder E-Mail/), 'aaron');
  await user.click(screen.getByRole('button', { name: 'Reset-Link anfordern' }));
  await screen.findByText(/Falls ein passendes Konto existiert/);
  expect(accountRequest).toHaveBeenCalledWith('request-reset', { username: 'aaron' });
  act(() => { window.history.replaceState(null, '', '/reset-password#token=one-time-token'); window.dispatchEvent(new HashChangeEvent('hashchange')); });
  await user.type(screen.getByLabelText(/Neues Passwort/), 'a secure new passphrase');
  await user.type(screen.getByLabelText(/Passwort bestätigen/), 'a secure new passphrase');
  await user.click(screen.getByRole('button', { name: 'Passwort speichern' }));
  await waitFor(() => expect(accountRequest).toHaveBeenCalledWith('reset-password', { token: 'one-time-token', newPassword: 'a secure new passphrase' }));
  expect(window.location.hash).toBe('');
});

it('requires matching confirmation before sending a password change', async () => {
  const user = userEvent.setup();
  window.history.replaceState(null, '', '/reset-password#token=test-token');
  render(<AccountRecovery onDone={vi.fn()} />);
  await user.type(screen.getByLabelText(/Neues Passwort/), 'a secure new passphrase');
  await user.type(screen.getByLabelText(/Passwort bestätigen/), 'a different passphrase');
  await user.click(screen.getByRole('button', { name: 'Passwort speichern' }));
  expect(screen.getByRole('alert').textContent).toContain('identisch');
  expect(accountRequest).not.toHaveBeenCalled();
});
