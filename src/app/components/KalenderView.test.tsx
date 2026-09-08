import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KalenderView } from './KalenderView';

const api = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), appointments: vi.fn(), confirm: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: api.success, error: api.error, warning: vi.fn() } }));
vi.mock('../utils/storage', () => ({
  getAppointments: api.appointments,
  getAppointmentAdmins: async () => [{ id: 'sales-1', username: 'anna', name: 'Anna' }], getTeams: async () => [], getCurrentUser: () => ({ id: 'sales-1', username: 'anna' }),
  createAppointment: api.create, updateAppointment: api.update, cancelAppointment: vi.fn(), deleteAppointment: vi.fn(),
}));
vi.mock('../utils/useAppointmentConflicts', () => ({ useAppointmentConflicts: () => ({ loading: false, error: false, conflicts: [], confirmed: false, verify: async () => true }) }));
vi.mock('./CalendarTimeGrid', () => ({ CalendarTimeGrid: () => <div>Kalender-Zeitachse</div> }));
vi.mock('./AppointmentConflictReview', () => ({ AppointmentConflictReview: () => null }));

describe('calendar appointment editor', () => {
  beforeEach(() => { sessionStorage.clear(); vi.clearAllMocks(); api.appointments.mockResolvedValue([]); api.create.mockResolvedValue({ appointment: {}, inviteSent: true }); api.confirm.mockReturnValue(false); vi.stubGlobal('confirm', api.confirm); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('requires a valid invitation address and normalizes a safe meeting link', async () => {
    render(<KalenderView />);
    fireEvent.click(screen.getByRole('button', { name: 'Neuer Termin' }));
    fireEvent.click(screen.getByRole('button', { name: 'Anlegen' }));
    expect(await screen.findByText('Für eine Einladung wird eine Kunden-E-Mail benötigt.')).toBeInTheDocument();
    expect(api.create).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('E-Mail (für die Einladung)'), { target: { value: 'kunde@example.de' } });
    fireEvent.change(screen.getByLabelText('Meeting-Link'), { target: { value: 'teams.microsoft.com/l/meetup-join/test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anlegen' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ customerEmail: 'kunde@example.de', meetingLink: 'https://teams.microsoft.com/l/meetup-join/test' })));
  });

  it('keeps an edited appointment open when discarding is rejected', async () => {
    render(<KalenderView />);
    fireEvent.click(screen.getByRole('button', { name: 'Neuer Termin' }));
    fireEvent.change(screen.getByLabelText('Titel (optional)'), { target: { value: 'Angebot besprechen' } });
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(api.confirm).toHaveBeenCalledWith('Ungespeicherte Terminänderungen verwerfen?');
    expect(screen.getByLabelText('Titel (optional)')).toHaveValue('Angebot besprechen');
  });

  it('prefills lead contact and owner, saves the lead association and protects internal notes', async () => {
    render(<KalenderView lead={{ id: 'lead-1', company: 'Teile Müller', contactPerson: 'Frau Müller', email: 'kunde@example.de', phone: '02232 123', assignedTo: 'anna', status: 'Neu', source: 'Manuell', tags: [], createdAt: '', updatedAt: '', notes: 'Interne Verhandlung' }} />);
    await waitFor(() => expect(screen.getByRole('option', { name: 'Anna' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Termin für Lead planen' }));
    expect(screen.getByLabelText('Name')).toHaveValue('Frau Müller');
    expect(screen.getByLabelText('Zuständig')).toHaveValue('sales-1');
    expect(screen.getByLabelText('Interne Notizen')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Anlegen' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ companyId: 'lead-1', customerName: 'Frau Müller', customerPhone: '02232 123', customerEmail: 'kunde@example.de', assigneeId: 'sales-1' })));
  });

  it('retries a failed invitation on the saved appointment without creating a duplicate or reporting false success', async () => {
    const appointment = { id: 'appt-1', type: 'sales', title: 'Einladung', start_at: '2026-09-09T10:00', end_at: '2026-09-09T10:30', duration_minutes: 30, status: 'proposed', customer_email: 'kunde@example.de' };
    api.create.mockResolvedValue({ appointment, inviteSent: false, inviteError: 'Versanddienst nicht erreichbar' });
    api.update.mockResolvedValueOnce({ appointment, inviteSent: false, inviteError: 'Versanddienst nicht erreichbar' }).mockResolvedValueOnce({ appointment: { ...appointment, invite_sent_at: '2026-09-08T01:00:00Z' }, inviteSent: true });
    render(<KalenderView />);
    fireEvent.click(screen.getByRole('button', { name: 'Neuer Termin' }));
    fireEvent.change(screen.getByLabelText('E-Mail (für die Einladung)'), { target: { value: 'kunde@example.de' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anlegen' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Termin gespeichert, Einladung nicht versendet');
    fireEvent.click(screen.getByRole('button', { name: 'Einladung senden' }));
    await waitFor(() => expect(api.error).toHaveBeenCalledWith('Einladung konnte nicht versendet werden.'));
    expect(api.success).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Einladung senden' }));
    await waitFor(() => expect(api.success).toHaveBeenCalledWith('Einladung per E-Mail verschickt.'));
    expect(api.update).toHaveBeenLastCalledWith('appt-1', { resendInvite: true });
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText(/Zuletzt per E-Mail verschickt/)).toBeInTheDocument();
  });
});
