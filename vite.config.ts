import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

/// <reference types="vitest" />

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    ...(process.env.VITEST ? [] : [nodePolyfills({ include: ['buffer', 'process', 'util', 'url', 'querystring', 'stream', 'crypto', 'events', 'assert'], globals: { Buffer: true, global: true, process: true } })]),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * Fremdbibliotheken vom eigenen Code trennen.
         *
         * ─── Warum das die gefühlte Wartezeit senkt ────────────────────────
         *
         * Vorher lag alles in einem Bündel von 473 KB. Jede Auslieferung —
         * auch eine, die nur eine Farbe ändert — bekam einen neuen Dateinamen,
         * und der Browser lud die vollen 473 KB erneut. Dabei ändern sich
         * React, die Symbole und die Diagrammbibliothek über Monate nicht.
         *
         * Aufgeteilt bleibt beim nächsten Mal alles im Zwischenspeicher des
         * Browsers, was sich nicht geändert hat. Der erste Aufruf wird davon
         * nicht schneller — jeder weitere schon, und das ist der Fall, der
         * täglich vorkommt.
         *
         * Gleiche Aufteilung wie Admin-Dashboard/vite.config.ts, damit man
         * beim Vergleich der beiden nicht raten muss.
         */
        /**
         * NUR was ohnehin beim Start geladen wird.
         *
         * ─── Die Falle, in die ich hier getreten bin ──────────────────────
         *
         * Der erste Versuch hatte `'vendor-charts': ['recharts']` stehen. Das
         * sah vernünftig aus — 420 KB in ein eigenes Bündel. Tatsächlich war
         * es das Gegenteil: ein benanntes Bündel wird Teil des festen
         * Abhängigkeitsbaums, Vite schreibt ein `modulepreload` dafür in die
         * index.html, und der Browser holt die 420 KB bei JEDEM Seitenaufruf.
         *
         * Die Berichte werden nachgeladen, damit genau das nicht passiert.
         * Der Eintrag hat die Aufteilung also nicht verbessert, sondern
         * aufgehoben — und zwar unsichtbar, weil die Bündelgrössen danach
         * ordentlich aussahen.
         *
         * Merksatz: hier gehört nur hinein, was der Browser beim Start
         * sowieso braucht. Alles Nachgeladene lässt man Vite selbst schneiden.
         *
         * ─── Warum als Funktion und nicht als Liste ──────────────────────
         *
         * `{'vendor-react': ['react', 'react-dom']}` sah richtig aus und
         * erzeugte ein Bündel von 0 Byte. Der Grund: die Anwendung importiert
         * `react-dom/client`, nicht `react-dom` — der Listeneintrag traf den
         * Namen nicht, und React wanderte stattdessen in `vendor-ui`, weil
         * `sonner` es mitzieht. Ein leeres Bündel kostet eine Anfrage für
         * nichts, und der Name log über den Inhalt.
         *
         * Über den Pfad zu gehen trifft auch die Unterpfade.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // Ändert sich praktisch nie.
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react';
          // Gross, aber stabil.
          if (id.includes('node_modules/lucide-react/')) return 'vendor-icons';
          // Meldungen.
          if (id.includes('node_modules/sonner/')) return 'vendor-ui';
          return undefined;
        },
      },
    },
  },
  test: {
    // jsdom, NICHT die Standardumgebung node: storage.ts greift auf
    // localStorage/sessionStorage zu, sobald irgendwer getToken() aufruft.
    // In node existiert beides nicht, und der Fehler kommt dann als
    // "0 gesendet" an — also als scheinbarer Fachfehler statt als das, was er
    // ist: eine fehlende Umgebung.
    environment: 'jsdom',
    // jsdom bringt hier kein localStorage mit — siehe src/test/setup.ts.
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
