# CRM workspace upgrade v2 — 2026-09-04

This is the standalone CRM upgrade. It builds on the earlier upgrade without merging Admin and CRM.

## Delivered

- Compact lead workspace: one contextual create action, secondary tools menu, progressive filters, removable filter chips, saved personal views and more room for records.
- Useful default list columns: company, contact, factual data completeness, phase, owner and next step. Additional metadata remains available in contact details and wide layouts.
- Lead details split into Activities, Next steps and Contact data. Contact actions remain immediately available; keyboard users can open a record from its company button.
- Awaited lead saves with duplicate-submit protection, field validation, preserved draft on API failure and explicit retry. Dialog headers/actions remain visible while the form body scrolls; focus stays inside the dialog.
- Main lead API failures are no longer represented as an empty database. Overview, reports, pipeline and lead detail have visible error/retry states.
- Native accessible selection controls replace the custom click-only picker.
- True day/week hour grid, appointment duration positioning, consistent overlap lanes and keyboard-accessible time-slot creation.
- Shared fresh conflict review in calendar booking and lead callback booking, including another availability check immediately before submission.
- Stable server phase categories (`open`, `won`, `lost`) drive outcome classification; pipeline settings expose the category and board cards show recorded stage age.
- CRM-only Account security page: MFA status, password-confirmed enrollment, authenticator confirmation, once-only recovery-code display with acknowledgement and password change.
- Remaining source/import numeric scores replaced with factual recorded-contact information.
- Calm neutral styling, normal mixed-case labels, readable controls, compact headings and fewer decorative cards.

## Verification

- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run lint`: **0 errors, 68 warnings**.
- Complete `npx vitest run --maxWorkers=2`: **295 passed, 0 failed**.
- Production-preview Chrome smoke: **18 workflows passed, 0 page errors**. Includes progressive filters, single create action, lead detail tabs, callback/calendar conflicts, failed save with retry, failed data load with retry, CRM-only MFA enrollment, mobile layouts, logout and password recovery.
- `git diff --check`: passed.
- `npm audit --audit-level=low`: 0 reported vulnerabilities (all installed dependencies).
- Desktop and mobile screenshots inspected after rendering; the form error remains visible and the dialog's save/cancel actions stay fixed.

All browser API requests are intercepted with test fixtures; screenshots do not contain production records or actual credentials. Reproduce with a local production preview, set `CRM_SMOKE_URL`, then run `node scripts/upgrade-v2-smoke.cjs`. The script uses the sibling Admin-Dashboard Playwright installation and local Chrome.

## Limits / release notes

- No production deployment, database changes or account mutation from this repository.
- Requires the coordinated backend stage-category and existing CRM-scoped MFA endpoints.
- Microsoft Graph/Outlook synchronization remains unconfigured. Availability checks cover CRM only and are not a server-side concurrency lock.
- Existing appointment storage still uses Europe/Berlin wall time; no zoned-time migration performed.
- Completeness is not external verification of lead authenticity or reachability. No new lead provider or acquisition channel introduced.
- Personal saved filters remain browser-local. Reporting remains current-stock reporting, not historical cohorts.
- MFA enrollment and confirmation are supported; no MFA-disable or device-session-management API has been invented.
- Existing lint warnings remain; passing checks are not a guarantee of complete security.

## Screenshots

See the PNG files in this directory for desktop/mobile lead workspaces, contact details, failure handling, calendar, team and account security.
