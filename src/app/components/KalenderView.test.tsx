import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KalenderView } from './KalenderView';

const api = vi.hoisted(() => ({ create: vi.fn(), appointments: vi.fn(), confirm: vi.fn() }));
vi.mock('../utils/storage', () => ({
  getAppointments: api.appointments,
  getAppointmentAdmins: async () => [], getTeams: async () => [], getCurrentUser: () => ({ id: 'sales-1', username: 'anna' }),
  createAppointment: api.create, updateAppointment: vi.fn(), cancelAppointment: vi.fn(), deleteAppointment: vi.fn(),
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
});
