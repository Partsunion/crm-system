/**
 * CSV-Parse-Logik für den Lead-Import — bewusst React-frei, damit sie ohne
 * Component-Rendering testbar ist (und das ImportModal schlank bleibt).
 */

/** Eine geparste CSV-Zeile (Header→Wert). Pflichtfeld ist `company`. */
export interface ImportedRow {
  company: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  status?: string;
  website?: string;
  city?: string;
  plz?: string;
  address?: string;
  notes?: string;
  priority?: string;
  region?: string;
  niche?: string;
  source?: string;
  country?: string;
  [key: string]: string | undefined;
}

// Im UI zugesichertes Maximum pro Import. Muss mit dem Hinweistext im Modal und
// der Durchsetzung in parseRows übereinstimmen.
export const MAX_IMPORT_ROWS = 1000;

/**
 * Trennzeichen-Erkennung: deutsches Excel exportiert `;`, die alte Vorlage `,`,
 * Tab-Exporte kommen aus Kopierlisten. Gezählt wird NUR außerhalb von Quotes in
 * der Header-Zeile — ein Komma im Firmennamen kippt die Erkennung sonst.
 */
export function detectDelimiter(text: string): ';' | ',' | '\t' {
  const firstLine = text.slice(0, text.indexOf('\n') === -1 ? text.length : text.indexOf('\n'));
  const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0 };
  let inQuotes = false;
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in counts) counts[ch] += 1;
  }
  if (counts[';'] >= counts[','] && counts[';'] >= counts['\t'] && counts[';'] > 0) return ';';
  if (counts['\t'] > counts[',']) return '\t';
  return ',';
}

// RFC-4180-naher CSV-Parser: respektiert doppelte Anführungszeichen, eingebettete
// Trennzeichen, Zeilenumbrüche in gequoteten Feldern und verdoppelte Quotes ("" → ").
export function parseCsv(text: string, delim: string): string[][] {
  // BOM entfernen (Excel schreibt UTF-8-BOM voran).
  //
  // \uFEFF als Escape-Folge, NICHT als Zeichen: als Zeichen steht dort etwas
  // Unsichtbares, der Ausdruck sieht dann aus wie /^/ und tut scheinbar nichts.
  // Wer die Datei formatiert oder die Zeile neu tippt, entfernt es unbemerkt —
  // und der Excel-Import bricht ab da still an der ersten Spalte.
  const src = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { rows.push(row); row = []; };

  while (i < src.length) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 2; continue; } // escaped quote
        inQuotes = false; i += 1; continue;
      }
      field += ch; i += 1; continue;
    }
    if (ch === '"') { inQuotes = true; i += 1; continue; }
    if (ch === delim) { pushField(); i += 1; continue; }
    if (ch === '\r') { i += 1; continue; } // CRLF → \r ignorieren
    if (ch === '\n') { pushField(); pushRow(); i += 1; continue; }
    field += ch; i += 1;
  }
  // Letztes Feld/letzte Zeile (Datei ohne abschließenden Zeilenumbruch).
  pushField();
  if (row.length > 1 || row[0] !== '') pushRow();
  // Komplett leere Zeilen verwerfen.
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

// Header → bekanntes Feld. Tolerant gegenüber Schreibweise/Umlaut-Spalten, damit
// die Vorlage (company/…), deutschsprachige Exporte (Firma/Ort/…) UND die
// Anruflisten aus vertrieb/ (firma;ort;plz;strasse;telefon;website;hinweis;prio;typ)
// ohne Umbenennen funktionieren.
export const HEADER_MAP: Record<string, keyof ImportedRow> = {
  company: 'company', firma: 'company', unternehmen: 'company', name: 'company',
  contactperson: 'contactPerson', kontakt: 'contactPerson', kontaktperson: 'contactPerson', ansprechpartner: 'contactPerson',
  email: 'email', 'e-mail': 'email', mail: 'email',
  phone: 'phone', telefon: 'phone', telefonnummer: 'phone', tel: 'phone', mobil: 'phone',
  status: 'status',
  website: 'website', webseite: 'website', homepage: 'website', url: 'website', web: 'website',
  city: 'city', ort: 'city', stadt: 'city',
  plz: 'plz', postleitzahl: 'plz', zip: 'plz',
  address: 'address', adresse: 'address', anschrift: 'address', strasse: 'address', 'straße': 'address',
  notes: 'notes', hinweis: 'notes', hinweise: 'notes', notiz: 'notes', notizen: 'notes', bemerkung: 'notes', anmerkung: 'notes',
  priority: 'priority', prio: 'priority', 'priorität': 'priority', prioritaet: 'priority',
  region: 'region', bundesland: 'region',
  niche: 'niche', typ: 'niche', kategorie: 'niche', branche: 'niche', nische: 'niche',
  source: 'source', quelle: 'source',
  country: 'country', land: 'country',
};

export interface ParseResult {
  rows: ImportedRow[];
  delim: string;
  skippedNoCompany: number;
  mappedHeaders: string[];
  error: string;
}

/** Reiner Parser (auch für die Live-Vorschau): CSV-Text → Import-Zeilen. */
export function parseRows(csvData: string): ParseResult {
  const empty: ParseResult = { rows: [], delim: ',', skippedNoCompany: 0, mappedHeaders: [], error: '' };
  if (!csvData.trim()) return empty;
  const delim = detectDelimiter(csvData);
  const table = parseCsv(csvData, delim);
  if (table.length < 2) {
    return { ...empty, delim, error: 'CSV muss mindestens eine Header-Zeile und eine Daten-Zeile enthalten.' };
  }
  // Das .replace() ist hier NACHWEISLICH ueberfluessig: ECMAScript zaehlt
  // U+FEFF zu WhiteSpace, .trim() entfernt es also schon. Es bleibt als
  // Guertel-und-Hosentraeger stehen, falls der Ausdruck einmal ohne trim()
  // verwendet wird — aber es traegt nichts, und niemand sollte glauben, der
  // Import haenge daran. Tragend ist allein die Entfernung in parseCsv().
  const headers = table[0].map((h) => h.trim().replace(/^\uFEFF/, '').toLowerCase());
  const mappedHeaders = headers.filter((h) => HEADER_MAP[h]).map((h) => String(HEADER_MAP[h]));
  if (!headers.some((h) => HEADER_MAP[h] === 'company')) {
    return { ...empty, delim, mappedHeaders, error: 'Pflichtspalte „Firma" (bzw. „company"/„Name") fehlt in der Header-Zeile.' };
  }
  const rows: ImportedRow[] = [];
  let skippedNoCompany = 0;
  for (let r = 1; r < table.length; r++) {
    const cells = table[r];
    const obj: ImportedRow = { company: '' };
    headers.forEach((h, idx) => {
      const key = HEADER_MAP[h];
      const val = (cells[idx] ?? '').trim();
      if (key) { if (val) obj[key] = val; }
      else if (val) obj[h] = val; // unbekannte Spalten roh behalten
    });
    if ((obj.company || '').trim()) rows.push({ ...obj, company: obj.company.trim() });
    else skippedNoCompany += 1;
  }
  if (rows.length === 0) {
    return { ...empty, delim, mappedHeaders, error: 'Keine gültigen Zeilen gefunden (Pflichtfeld „Firma" leer).' };
  }
  // Im UI zugesichertes Limit auch durchsetzen (statt still >1000 zu senden):
  // klar abweisen, nicht stillschweigend abschneiden (kein Datenverlust).
  if (rows.length > MAX_IMPORT_ROWS) {
    return { ...empty, delim, mappedHeaders, error: `Zu viele Zeilen (${rows.length}). Maximal ${MAX_IMPORT_ROWS} Leads pro Import — bitte die Datei aufteilen.` };
  }
  return { rows, delim, skippedNoCompany, mappedHeaders, error: '' };
}
