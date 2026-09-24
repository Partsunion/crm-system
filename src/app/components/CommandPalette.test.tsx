import { useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from './CommandPalette';

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function Harness({ navigate = vi.fn() }: { navigate?: (view: string) => void }) {
  const [open, setOpen] = useState(false);
  return <>
    <button onClick={() => setOpen(true)}>Suche öffnen</button>
    <button>Hintergrundaktion</button>
    <CommandPalette open={open} onClose={() => setOpen(false)} onNavigate={navigate} onNewLead={vi.fn()} onImport={vi.fn()} />
  </>;
}

it('keeps keyboard focus in the palette and closes on Escape', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole('button', { name: 'Suche öffnen' }));
  const dialog = screen.getByRole('dialog', { name: 'Schnellsuche und Aktionen' });
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('combobox')));
  await user.tab();
  expect(dialog.contains(document.activeElement)).toBe(true);
  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Suche öffnen' })));
});

it('finds the calendar by its task name and navigates with Enter', async () => {
  const user = userEvent.setup();
  const navigate = vi.fn();
  render(<Harness navigate={navigate} />);
  await user.click(screen.getByRole('button', { name: 'Suche öffnen' }));
  await user.type(screen.getByRole('combobox'), 'termine');
  await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1));
  await user.keyboard('{Enter}');
  expect(navigate).toHaveBeenCalledWith('kalender');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
