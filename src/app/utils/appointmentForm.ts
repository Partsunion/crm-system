import { safeWebsiteUrl } from './safeUrl';

export interface AppointmentDraftFields {
  date?: string;
  time?: string;
  customerEmail?: string;
  meetingLink?: string;
  sendInvite?: boolean;
}

export function validateAppointmentDraft(draft: AppointmentDraftFields): Record<string, string> {
  const errors: Record<string, string> = {};
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(draft.date || '');
  const calendarDay = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
  if (!match || !calendarDay || calendarDay.getUTCFullYear() !== Number(match[1]) || calendarDay.getUTCMonth() !== Number(match[2]) - 1 || calendarDay.getUTCDate() !== Number(match[3])) errors.date = 'Bitte ein gültiges Datum wählen.';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time || '')) errors.time = 'Bitte eine gültige Uhrzeit wählen.';
  const email = draft.customerEmail?.trim() || '';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.customerEmail = 'Bitte eine gültige E-Mail-Adresse eintragen.';
  if (draft.sendInvite && !email) errors.customerEmail = 'Für eine Einladung wird eine Kunden-E-Mail benötigt.';
  if (draft.meetingLink?.trim() && !safeWebsiteUrl(draft.meetingLink)) errors.meetingLink = 'Nur ein gültiger HTTP- oder HTTPS-Link ist erlaubt.';
  return errors;
}
