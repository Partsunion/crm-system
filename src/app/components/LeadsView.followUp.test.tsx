import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { LeadsView } from './LeadsView';

const state = vi.hoisted(() => ({ date: '2026-07-27' }));
vi.mock('../utils/storage', () => ({
  getLeads: async () => [{ id: 'lead', company: 'Testfirma', email: '', contactPerson: '', tags: [], status: 'Kontaktiert', createdAt: '2026-07-01', nextFollowUpDate: state.date }],
  getLeadLists: async () => [], getAppointmentAdmins: async () => [], getStatusOptions: () => ['Kontaktiert'],
  getCurrentUser: () => ({ id: 'follow-up-test' }), getSettings: () => ({ pipelineStages: [] }),
}));
vi.mock('./LeadDetailModal', () => ({
  LeadDetailModal: ({ lead, onLeadChanged }: any) => <div>
    <output data-testid="detail-date">{lead.nextFollowUpDate || 'Kein Rückruf'}</output>
    <button onClick={() => { state.date = ''; onLeadChanged(); }}>Rückruf erledigen</button>
  </div>,
}));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('refreshes both the lead row and its open details after completing a callback', async () => {
  localStorage.clear(); sessionStorage.clear();
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  render(<LeadsView />);
  fireEvent.click((await screen.findAllByLabelText('Lead Testfirma öffnen'))[0]);
  expect(screen.getByTestId('detail-date')).toHaveTextContent('2026-07-27');
  fireEvent.click(screen.getByRole('button', { name: 'Rückruf erledigen' }));
  await waitFor(() => expect(screen.getByTestId('detail-date')).toHaveTextContent('Kein Rückruf'));
  expect(screen.getAllByText('Noch nicht geplant').length).toBeGreaterThan(0);
  expect(screen.queryByText('27.7.2026')).not.toBeInTheDocument();
});
