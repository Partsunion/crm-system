/**
 * Einstellungen speichern und ehrlich melden, was passiert ist.
 *
 * ─── Warum das eine eigene Datei ist ───────────────────────────────────────
 *
 * An sechs Stellen stand dasselbe Muster:
 *
 *     saveSettings({ … });
 *     toast.success('Stage angelegt.');
 *
 * Die Meldung kam bedingungslos. Ob der Server die Änderung überhaupt
 * angenommen hat, sah sich niemand an — konnte auch niemand, `saveSettings`
 * gab nichts zurück und prüfte `res.ok` nicht einmal.
 *
 * Damit war der teuerste Fehler möglich, den eine Einstellungsseite haben
 * kann: Man legt einen Status an, liest „gespeichert", arbeitet weiter — und
 * beim nächsten Laden ist er verschwunden. Denn beim Start holt
 * `syncSettingsFromServer` den Serverstand und überschreibt den lokalen.
 * Wem `settings.write` fehlt, dem passierte das bei JEDER Änderung.
 *
 * Sechs Stellen heisst: beim nächsten Mal wird eine davon vergessen. Deshalb
 * hier, an einer Stelle, und die sechs rufen sie auf.
 */
import { toast } from 'sonner';
import { saveSettings, type Settings } from './storage';

/**
 * Speichert und meldet. Gibt zurück, ob der Server es angenommen hat.
 *
 * `erfolg` ist der Text für den guten Fall („Stage angelegt."). Im schlechten
 * steht die Meldung nicht zur Wahl: sie muss sagen, dass die Änderung NUR
 * lokal steht — sonst denkt man, es sei bloss eine Kleinigkeit schiefgegangen,
 * und merkt den Verlust erst beim Neuladen.
 */
export async function einstellungenSichern(neu: Settings, erfolg: string): Promise<boolean> {
    const ergebnis = await saveSettings(neu);
    if (ergebnis.ok) {
        toast.success(erfolg);
        return true;
    }
    toast.error(`Nicht gespeichert: ${ergebnis.grund ?? 'unbekannter Grund'}`, {
        description: 'Der bisher gespeicherte Stand bleibt gültig. Bitte erneut versuchen.',
        duration: 8000,
    });
    return false;
}
