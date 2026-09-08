import { getToken } from './storage';
import type { CrmMailDraft } from './crmMail';
const base = import.meta.env.VITE_API_BASE_URL || 'https://api.partsunion.de';
async function request<T>(leadId: string, operation: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const token = getToken(), audio = body instanceof Blob;
  const response = await fetch(base + '/api/crm/workflow/leads/' + encodeURIComponent(leadId) + '/' + operation, {
    credentials: 'include',
    method: 'POST', signal,
    headers: {'Content-Type': audio ? body.type : 'application/json', 'X-Partsunion-App': 'crm', ...(token ? {Authorization: `Bearer ${token}`} : {})},
    body: audio ? body : JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || result.message || 'Die Bearbeitung ist gerade nicht möglich. Bitte erneut versuchen.');
  return result;
}
export const personalizeCrmMail = (leadId: string, input: {conversationNotes?: string; instructions?: string; subject?: string; body?: string}, signal?: AbortSignal) => request<CrmMailDraft>(leadId, 'personalize', input, signal);
export const transcribeCrmNote = (leadId: string, audio: Blob, signal?: AbortSignal) => request<{text: string}>(leadId, 'transcription', audio, signal);
