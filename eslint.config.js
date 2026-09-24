// ESLint 9 Flat Config — CRM-System
//
// Bis hierher hatte das CRM gar keinen Linter: nur `tsc` und `vite`. tsc prueft
// Typen, nicht Verhalten — vergessene Hook-Abhaengigkeiten, ungenutzte
// Variablen, vergessene `console.log` und leere Bloecke sieht er nicht.
//
// Bewusst dieselben Regeln wie im Admin-Dashboard: zwei Anwendungen derselben
// Firma, die von denselben Leuten gepflegt werden, sollen nicht
// unterschiedliche Vorstellungen davon haben, was ein Fehler ist.
//
// Haltung: Fehler nur, wo etwas kaputt ist. Alles Uebrige als Warnung, damit
// der Bestand nicht auf einen Schlag rot wird und die Meldungen deshalb
// niemand mehr liest.

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
    {
        ignores: [
            'dist/**',
            'build/**',
            'node_modules/**',
            'coverage/**',
            '*.config.ts',
            '*.config.js',
            // Von shadcn/ui uebernommene Bausteine. Fremder Code, unveraendert
            // gehalten, damit ein Update sich noch einspielen laesst.
            'src/app/components/ui/**',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.es2022,
            },
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

            // React-19-Diagnosen sind hier Wegweiser, keine Sperren.
            'react-hooks/set-state-in-effect': 'warn',
            'react-hooks/immutability': 'warn',
            'react-hooks/purity': 'warn',
            'react-hooks/preserve-manual-memoization': 'warn',
            'react-hooks/use-memo': 'warn',
            'react-hooks/refs': 'warn',

            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    destructuredArrayIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/ban-ts-comment': [
                'warn',
                { 'ts-expect-error': false, 'ts-ignore': 'allow-with-description' },
            ],

            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'no-debugger': 'error',
            'no-empty': ['warn', { allowEmptyCatch: true }],
            'prefer-const': 'warn',
            'react-hooks/exhaustive-deps': 'warn',
        },
    },
);
