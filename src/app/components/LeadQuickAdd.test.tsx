import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LeadQuickAdd } from './LeadQuickAdd';
afterEach(cleanup);
function open(onAdd: (company: string) => Promise<void>) {
  render(<LeadQuickAdd onAdd={onAdd} />);
  fireEvent.click(screen.getByRole('button', { name: 'Lead hinzufügen' }));
  const input = screen.getByRole('textbox', { name: 'Firmenname für neuen Lead' });
  fireEvent.change(input, { target: { value: 'Nord GmbH' } });
  return input;
}
describe('Lead quick creation', () => {
  it('keeps input and presents a retryable error instead of losing the company name', async () => {
    const save = vi.fn().mockRejectedValue(new Error('Keine Verbindung'));
    const input = open(save);
    fireEvent.submit(input.closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Keine Verbindung');
    expect(input).toHaveValue('Nord GmbH');
    expect(input).toBeEnabled();
    expect(save).toHaveBeenCalledWith('Nord GmbH');
  });
  it('locks repeated submissions and cancellation until the server responds', async () => {
    let finish!: () => void;
    const save = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const input = open(save);
    fireEvent.submit(input.closest('form')!);
    fireEvent.submit(input.closest('form')!);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(save).toHaveBeenCalledTimes(1);
    expect(input).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Anlegen abbrechen' })).toBeDisabled();
    await act(async () => finish());
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Lead hinzufügen' })).toBeInTheDocument();
  });
});
