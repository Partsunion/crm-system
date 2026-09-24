import { describe, expect, it } from 'vitest';
import { validateAppointmentDraft } from './appointmentForm';

describe('appointment form validation', () => {
  it('requires valid scheduling fields and an address for requested invitations', () => {
    expect(validateAppointmentDraft({ date: '', time: '25:00', sendInvite: true })).toMatchObject({ date: expect.any(String), time: expect.any(String), customerEmail: expect.any(String) });
    expect(validateAppointmentDraft({ date: '2026-02-31', time: '10:30' })).toMatchObject({ date: expect.any(String) });
    expect(validateAppointmentDraft({ date: '2026-09-05', time: '10:30', sendInvite: true, customerEmail: 'kunde@example.de' })).toEqual({});
  });
  it('rejects malformed addresses and unsafe meeting links', () => {
    expect(validateAppointmentDraft({ date: '2026-09-05', time: '10:30', customerEmail: 'falsch', meetingLink: 'javascript:alert(1)' })).toMatchObject({ customerEmail: expect.any(String), meetingLink: expect.any(String) });
    expect(validateAppointmentDraft({ date: '2026-09-05', time: '10:30', meetingLink: 'teams.microsoft.com/l/meetup-join/example' })).toEqual({});
  });
});
