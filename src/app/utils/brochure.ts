/**
 * Broschüren-Versand über Resend.
 *
 * POST /api/crm/leads/:id/brochure selects the stored recipient, approved
 * country template and centrally managed PDF on the server. CRM sessions
 * do not receive general admin mailbox privileges.
 *
 * Rechtlicher Rahmen: E-Mail-Werbung ohne vorherige Einwilligung ist nach
 * UWG §7 Abs. 2 unzulässig. Der Knopf gehört an Interessenten, die nach
 * Unterlagen gefragt haben, nicht an eine gescrapte Liste. Vgl. den Hinweis in
 * der Outreach-Ansicht, die inzwischen im Admin-System liegt.
 *
 * Es gibt seit dem Sammelversand ZWEI Wege hier hinein: sendBrochure() für
 * einen Lead und sendBrochureBatch() für eine Auswahl. Am rechtlichen Rahmen
 * ändert das nichts — die Auswahl muss aus Leuten bestehen, die gefragt haben.
 * Die Oberfläche sagt das beim Bestätigen noch einmal ausdrücklich.
 */
import { getToken, getCurrentUser, type Lead } from './storage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.partsunion.de';

/**
 * Feste Adresse der Broschüre.
 *
 * Bewusst KEINE Build-Variable: die würde beim Bauen des Containers eingebacken,
 * und jeder Austausch der PDF erforderte ein neues Deployment. Stattdessen liegt
 * die Datei serverseitig und wird im Admin-Dashboard unter Postfach-Rechte
 * hochgeladen. Der Link bleibt gleich — auch bereits verschickte Mails zeigen
 * dann die neue Fassung.
 */
export const BROCHURE_URL: string =
  import.meta.env.VITE_BROCHURE_URL || `${API_BASE_URL}/dokumente/broschuere`;

export type BrochureLocale = 'de' | 'fr';

export interface BrochureVariant {
  locale: BrochureLocale;
  slug: 'broschuere' | 'broschuere-fr';
  url: string;
}

const COUNTRY_ALIASES: Record<string, BrochureLocale> = {
  DE: 'de', DEU: 'de', DEUTSCHLAND: 'de', GERMANY: 'de', ALLEMAGNE: 'de',
  AT: 'de', AUT: 'de', OESTERREICH: 'de', OSTERREICH: 'de', AUSTRIA: 'de', AUTRICHE: 'de',
  CH: 'de', CHE: 'de', SCHWEIZ: 'de', SWITZERLAND: 'de', SUISSE: 'de', SVIZZERA: 'de',
  FR: 'fr', FRA: 'fr', FRANKREICH: 'fr', FRANCE: 'fr',
};

function normalizedCountry(value?: string): string {
  return (value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');
}

/** Die im CRM gepflegten Märkte DE/AT/CH/FR bestimmen Mail und PDF. */
export function brochureVariantForLead(lead: Pick<Lead, 'country'>): BrochureVariant {
  const locale = COUNTRY_ALIASES[normalizedCountry(lead.country)] || 'de';
  const slug = locale === 'fr' ? 'broschuere-fr' : 'broschuere';
  return { locale, slug, url: `${API_BASE_URL}/dokumente/${slug}` };
}

/** Absenderadresse — muss in Resend als Sending-Address freigegeben sein. */


export function isBrochureConfigured(): boolean {
  return BROCHURE_URL.trim().length > 0;
}

function greeting(lead: Lead, locale: BrochureLocale): string {
  const person = lead.contactPerson?.trim();
  if (locale === 'fr') {
    if (person) return `Bonjour ${person}`;
    const company = lead.company?.trim();
    return company ? `Bonjour à l'équipe de ${company}` : 'Bonjour';
  }
  if (person) return `Guten Tag ${person}`;
  const company = lead.company?.trim();
  return company ? `Guten Tag, liebes Team von ${company}` : 'Guten Tag';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface BrochureEmail {
  subject: string;
  text: string;
  html: string;
}

/** Baut Betreff und Inhalt. Exportiert, damit die UI eine Vorschau zeigen kann. */
export function buildBrochureEmail(lead: Lead): BrochureEmail {
  const variant = brochureVariantForLead(lead);
  const hello = greeting(lead, variant.locale);

  if (variant.locale === 'fr') {
    const subject = 'Partsunion en bref : une demande, un seul dossier';
    const text = [
      `${hello},`, '',
      'merci de votre intérêt pour Partsunion.', '',
      'Vous trouverez en pièce jointe une présentation concise de Partsunion :',
      'la plateforme structure les demandes de pièces, assiste la recherche de',
      'références OE vérifiables et poursuit le dossier confirmé dans les ventes,',
      'la gestion des stocks, le bureau et la finance — le tout dans une seule application.', '',
      'Lors d’un diagnostic pratique sans engagement, nous vous montrons notre produit',
      'Partsunion sur un cas réel et vérifions avec vous s’il correspond à votre activité.', '',
      'Si la pièce jointe ne s’ouvre pas, la brochure est également disponible ici:', '',
      variant.url, '',
      'Pour toute question, répondez simplement à cet e-mail.', '',
      'Cordialement', 'Partsunion',
    ].join('\n');
    const html = [
      '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">',
      `<p>${escapeHtml(hello)},</p>`,
      '<p>merci de votre intérêt pour Partsunion.</p>',
      '<p>Vous trouverez en pièce jointe une présentation concise de Partsunion : la plateforme structure les demandes de pièces, assiste la recherche de références OE vérifiables et poursuit le dossier confirmé dans les ventes, la gestion des stocks, le bureau et la finance — <strong>le tout dans une seule application</strong>.</p>',
      '<p>Lors d’un diagnostic pratique sans engagement, nous vous montrons notre produit Partsunion sur un cas réel et vérifions avec vous s’il correspond à votre activité.</p>',
      `<p><a href="${escapeHtml(variant.url)}" style="display:inline-block;padding:12px 20px;background:#4378ff;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:700">Ouvrir la brochure&nbsp; →</a></p>`,
      `<p style="font-size:13px;color:#64748b">Si la pièce jointe ne s’ouvre pas : <a href="${escapeHtml(variant.url)}" style="color:#2563eb">${escapeHtml(variant.url)}</a></p>`,
      '<p>Pour toute question, répondez simplement à cet e-mail.</p>',
      '<p>Cordialement<br>Partsunion</p></div>',
    ].join('');
    return { subject, text, html };
  }

  const subject = 'Partsunion kompakt: Eine Anfrage. Ein Vorgang.';

  const text = [
    `${hello},`,
    '',
    'vielen Dank für Ihr Interesse an Partsunion.',
    '',
    'Im Anhang finden Sie einen kompakten Überblick darüber, wie Partsunion',
    'Teileanfragen strukturiert, die OE-Ermittlung unterstützt und den bestätigten',
    'Vorgang in Verkauf, Warenwirtschaft, Büro und Finanzen weiterführt — alles',
    'in einer App.',
    '',
    'Im unverbindlichen Praxischeck zeigen wir unser festes Partsunion-System an',
    'einem echten Fall und prüfen gemeinsam, ob es fachlich zu Ihrem Betrieb passt.',
    '',
    'Falls der Anhang nicht geöffnet werden kann, finden Sie die Broschüre auch hier:',
    '',
    variant.url,
    '',
    'Bei Fragen antworten Sie einfach auf diese E-Mail.',
    '',
    'Freundliche Grüße',
    'Partsunion',
  ].join('\n');

  const html = [
    '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">',
    `<p>${escapeHtml(hello)},</p>`,
    '<p>vielen Dank für Ihr Interesse an Partsunion.</p>',
    '<p>Im Anhang finden Sie einen kompakten Überblick darüber, wie Partsunion Teileanfragen strukturiert, die OE-Ermittlung unterstützt und den bestätigten Vorgang in Verkauf, Warenwirtschaft, Büro und Finanzen weiterführt — <strong>alles in einer App</strong>.</p>',
    '<p>Im unverbindlichen Praxischeck zeigen wir unser festes Partsunion-System an einem echten Fall und prüfen gemeinsam, ob es fachlich zu Ihrem Betrieb passt.</p>',
    `<p><a href="${escapeHtml(variant.url)}" style="display:inline-block;padding:12px 20px;background:#4378ff;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:700">Broschüre online öffnen&nbsp; →</a></p>`,
    `<p style="font-size:13px;color:#64748b">Falls der Anhang nicht geöffnet werden kann: <a href="${escapeHtml(variant.url)}" style="color:#2563eb">${escapeHtml(variant.url)}</a></p>`,
    '<p>Bei Fragen antworten Sie einfach auf diese E-Mail.</p>',
    '<p>Freundliche Grüße<br>Partsunion</p>',
    '</div>',
  ].join('');

  return { subject, text, html };
}

export interface SendBrochureResult {
  success: boolean;
  messageId: string;
  recipient: string;
  recipientSource: string;
}

const pendingRequests = new Map<string, string>();

/** Recipient and approved templates are selected on the server. No arbitrary mail grants. */
export async function sendBrochure(lead: Lead): Promise<SendBrochureResult> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email?.trim() || '')) {
    throw new Error('Bitte eine gültige E-Mail-Adresse im E-Mail-Feld des Leads hinterlegen.');
  }
  const requestKey = (getCurrentUser()?.id || getCurrentUser()?.username || 'session') + ':' + lead.id;
  const requestId = pendingRequests.get(requestKey) || crypto.randomUUID();
  pendingRequests.set(requestKey, requestId);
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/crm/leads/${encodeURIComponent(lead.id)}/brochure`, {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Partsunion-App': 'crm', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ requestId }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new Error('Versandstatus unklar. Bitte denselben Versand erneut prüfen; die Anfrage wird nicht doppelt ausgelöst.');
  }
  if (!res.ok) {
    let message = res.status === 409 ? 'Versand wird noch verarbeitet. Bitte denselben Versand erneut prüfen.' : 'Broschüre konnte nicht versendet werden.';
    try { const body = await res.json(); message = body?.error || body?.message || message; if (body?.code === 'BROCHURE_SEND_FAILED') pendingRequests.delete(requestKey); } catch { /* Keep explicit failure. */ }
    if ([400, 401, 403, 404, 422].includes(res.status)) pendingRequests.delete(requestKey);
    throw new Error(message);
  }
  const result = await res.json();
  if (!result.success || !result.messageId) throw new Error('Der Versand wurde noch nicht bestätigt. Bitte denselben Versand erneut prüfen.');
  pendingRequests.delete(requestKey);
  return { ...result, recipient: result.recipient || lead.email.trim(), recipientSource: result.recipientSource || 'E-Mail-Feld' };
}

/** Pause zwischen zwei Mails. 600 ms ist unauffaellig und bleibt erträglich:
 *  fünfzig Leads dauern damit rund eine halbe Minute. */
const VERSAND_PAUSE_MS = 600;

export interface BatchResult {
  gesendet: number;
  ohneAdresse: number;
  fehler: Array<{ lead: string; grund: string }>;
}

/**
 * Verschickt die Broschüre an mehrere Leads.
 *
 * NACHEINANDER UND MIT PAUSE, nicht parallel: Resend nimmt zwar mehr entgegen,
 * aber ein Schwall gleichartiger Mails aus derselben Domain ist genau das
 * Muster, das Empfänger-Server als Massenversand einstufen. Der Unterschied
 * zwischen fünf Sekunden und einer halben Minute ist hier belanglos, der
 * zwischen "zugestellt" und "im Spam" nicht.
 *
 * Die Pause ist nicht kosmetisch: "nacheinander" allein heisst nur, so schnell
 * wie die API antwortet — bei fünfzig Leads also ein gutes Dutzend Mails pro
 * Sekunde, was sich von parallelem Versand nicht unterscheidet. Nach der
 * letzten Mail wird nicht mehr gewartet.
 *
 * Fehler brechen den Lauf NICHT ab — sonst hinge nach dem dritten von fünfzig
 * Leads alles, und niemand wüsste, welche schon eine Mail bekommen haben.
 * Stattdessen wird je Lead festgehalten, was passiert ist.
 *
 * Rechtlicher Rahmen unverändert: das gehört an eine Liste von Leuten, die nach
 * Unterlagen gefragt haben. E-Mail-Werbung ohne vorherige Einwilligung ist
 * nach UWG §7 Abs. 2 unzulässig — daran ändert ein Knopf nichts.
 */
export async function sendBrochureBatch(
  leads: Lead[],
  onProgress?: (erledigt: number, gesamt: number) => void,
): Promise<BatchResult> {
  const ergebnis: BatchResult = { gesendet: 0, ohneAdresse: 0, fehler: [] };
  for (let i = 0; i < leads.length; i += 1) {
    const lead = leads[i];
    try {
      await sendBrochure(lead);
      ergebnis.gesendet += 1;
    } catch (e) {
      const grund = e instanceof Error ? e.message : 'Unbekannter Fehler';
      if (grund.includes('E-Mail-Feld des Leads hinterlegen')) ergebnis.ohneAdresse += 1;
      else ergebnis.fehler.push({ lead: lead.company || lead.email || 'Unbenannter Lead', grund });
    }
    onProgress?.(i + 1, leads.length);

    if (i < leads.length - 1) {
      await new Promise((r) => setTimeout(r, VERSAND_PAUSE_MS));
    }
  }

  return ergebnis;
}
