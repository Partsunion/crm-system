import { useMemo, useState } from 'react';
import { Upload, Download, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { Modal, Button, cn } from './ui-kit';
import { parseRows, MAX_IMPORT_ROWS, type ImportedRow } from '../utils/importCsv';

export type { ImportedRow };

interface ImportModalProps {
  onClose: () => void;
  onImport: (rows: ImportedRow[]) => void | Promise<void>;
}

export function ImportModal({ onClose, onImport }: ImportModalProps) {
  const [csvData, setCsvData] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Live-Vorschau: parst bei jeder Dateiwahl neu — der Nutzer sieht VOR dem Import,
  // wie viele Zeilen erkannt wurden und ob die Spalten richtig zugeordnet sind.
  const preview = useMemo(() => parseRows(csvData), [csvData]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvData(event.target?.result as string);
        setError('');
      };
      reader.readAsText(file);
    }
  };

  const handleImport = async () => {
    if (!csvData) {
      setError('Bitte wählen Sie eine CSV-Datei aus.');
      return;
    }
    if (preview.error) { setError(preview.error); return; }
    setBusy(true);
    try {
      await onImport(preview.rows);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Import fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  // Vorlage im deutschen Excel-Format (Semikolon) — Komma-Dateien werden über die
  // Trennzeichen-Erkennung genauso akzeptiert.
  const sampleCSV = `firma;ansprechpartner;telefon;email;website;ort;plz;strasse;hinweis;status
Müller Autoteile GmbH;Max Mustermann;+49 123 456789;max@mueller.de;https://mueller-autoteile.de;Mainz;55116;Musterstraße 1;Rückruf vormittags;Neu
Schmidt Parts AG;Anna Schmidt;+49 987 654321;;;Koblenz;;;Gebrauchtteile-Schwerpunkt;Neu`;

  const downloadSample = () => {
    const blob = new Blob(['﻿' + sampleCSV], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads_vorlage.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const delimLabel = preview.delim === ';' ? 'Semikolon (;)' : preview.delim === '\t' ? 'Tabulator' : 'Komma (,)';

  return (
    <Modal
      onClose={onClose}
      title="Leads importieren"
      subtitle="CSV-Datei hochladen"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Abbrechen
          </Button>
          <Button onClick={handleImport} disabled={busy || !csvData || !!preview.error}>
            {busy ? 'Importiere…' : preview.rows.length > 0 ? `${preview.rows.length} Lead(s) importieren` : 'Importieren'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Template */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-accent-500/25 bg-accent-500/10 p-4">
          <div className="flex items-center gap-3">
            <FileText className="size-5 shrink-0 text-accent-500" />
            <div>
              <p className="text-sm font-medium text-text-primary">CSV-Vorlage herunterladen</p>
              <p className="text-xs text-text-muted">Excel-tauglich (Semikolon). Anruflisten aus dem Vertrieb funktionieren direkt.</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={downloadSample}>
            <Download className="size-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        </div>

        {/* Dropzone */}
        <div className="rounded-lg border-2 border-dashed border-border-strong p-8 text-center transition-colors hover:border-accent-500/50 hover:bg-elevated/40">
          <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" id="file-upload" />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="mx-auto mb-3 size-10 text-text-muted" />
            <p className="text-sm font-medium text-text-primary">Datei hierher ziehen oder klicken</p>
            <p className="mt-1 text-xs text-text-muted">Unterstütztes Format: CSV (Komma, Semikolon oder Tab)</p>
            {csvData && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-status-success">
                <CheckCircle2 className="size-4" /> {fileName || 'Datei geladen'}
              </p>
            )}
          </label>
        </div>

        {/* Live-Vorschau */}
        {csvData && !preview.error && preview.rows.length > 0 && (
          <div className="rounded-lg border border-border-subtle bg-elevated/40 p-4">
            <p className="mb-2 text-sm font-medium text-text-primary">
              Vorschau — {preview.rows.length} Zeile(n) erkannt · Trennzeichen: {delimLabel}
              {preview.skippedNoCompany > 0 && (
                <span className="text-text-muted"> · {preview.skippedNoCompany} ohne Firmenname übersprungen</span>
              )}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-text-muted">
                    <th className="py-1 pr-3 font-medium">Firma</th>
                    <th className="py-1 pr-3 font-medium">Telefon</th>
                    <th className="py-1 pr-3 font-medium">Ort</th>
                    <th className="py-1 pr-3 font-medium">Website</th>
                    <th className="py-1 font-medium">Hinweis</th>
                  </tr>
                </thead>
                <tbody className="text-text-secondary">
                  {preview.rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t border-border-subtle">
                      <td className="py-1 pr-3 text-text-primary">{r.company}</td>
                      <td className="py-1 pr-3 whitespace-nowrap">{r.phone || '—'}</td>
                      <td className="py-1 pr-3">{r.city || '—'}</td>
                      <td className="max-w-[140px] truncate py-1 pr-3">{r.website || '—'}</td>
                      <td className="max-w-[160px] truncate py-1">{r.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.rows.length > 5 && (
              <p className="mt-1.5 text-xs text-text-muted">… und {preview.rows.length - 5} weitere</p>
            )}
          </div>
        )}

        {/* Error */}
        {(error || preview.error) && (
          <div className="flex items-center gap-3 rounded-lg border border-status-danger/30 bg-status-danger/10 p-4">
            <AlertCircle className="size-5 shrink-0 text-status-danger" />
            <p className="text-sm text-status-danger">{error || preview.error}</p>
          </div>
        )}

        {/* Info */}
        <div className={cn('rounded-lg border border-border-subtle bg-elevated/40 p-4')}>
          <p className="mb-2 text-sm font-medium text-text-primary">Hinweise</p>
          <ul className="space-y-1 text-sm text-text-secondary">
            <li>• Die erste Zeile muss die Spaltennamen enthalten. Pflichtspalte: <b>Firma</b> (bzw. company/Name).</li>
            <li>• Erkannt werden u.&nbsp;a.: Ansprechpartner, Telefon, E-Mail, Website, Ort, PLZ, Straße, Hinweis/Notizen, Prio, Typ, Status, Quelle.</li>
            <li>• Trennzeichen (Komma/Semikolon/Tab) wird automatisch erkannt — deutsches Excel funktioniert direkt.</li>
            <li>• Bereits vorhandene Leads (gleiche Telefonnummer oder Firma+Ort) werden übersprungen, nicht doppelt angelegt.</li>
            <li>• Maximal {MAX_IMPORT_ROWS} Leads pro Import.</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
