/**
 * Erscheinungsbild setzen, BEVOR das erste Bild gezeichnet wird.
 *
 * ─── Warum eine eigene Datei und kein Inline-Script ────────────────────────
 *
 * Das stand als <script> direkt in der index.html. Seit der Haertung der
 * Auslieferung (nginx.conf, script-src 'self') weigert sich der Browser,
 * Inline-Skripte auszufuehren:
 *
 *     Refused to execute a script because its hash, its nonce, or
 *     'unsafe-inline' does not appear in the script-src directive
 *
 * Folge: das gespeicherte Erscheinungsbild wurde nicht mehr angewandt. Wer
 * hell eingestellt hatte, sah beim Laden erst Dunkel und dann den Sprung.
 *
 * ─── Warum in public/ und nicht in src/ ────────────────────────────────────
 *
 * Aus src/ zieht Vite die Datei ins Hauptbuendel — dann laeuft sie erst, wenn
 * das Buendel geladen ist, also nach dem ersten Bild. Genau das soll sie
 * verhindern. Aus public/ wird sie unveraendert ausgeliefert und laeuft als
 * blockierendes Skript im <head>, noch bevor irgendetwas gezeichnet wird.
 *
 * Bewusst KEIN 'unsafe-inline' in der Sicherheitsregel: das waere der bequeme
 * Weg gewesen und haette den Schutz fuer jedes eingeschleuste Skript geoeffnet.
 */
(function () {
    try {
        var gespeichert = localStorage.getItem('crm_theme');
        document.documentElement.setAttribute(
            'data-theme',
            gespeichert === 'dark' ? 'dark' : 'light'
        );
    } catch (e) {
        /* Privater Modus: Es bleibt bei der Vorgabe aus dem Attribut in index.html. */
    }
})();
