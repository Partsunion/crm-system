# CRM upgrade verification — 2026-09-04

This remains the standalone Partsunion CRM. Its restrained light/dark workspace design is coordinated with the separate Admin platform.

## Implemented

- Server-validated, CRM-specific sessions; cookie logout; expired-session handling; forced password change; reset request/completion; MFA challenge support.
- Route/deep-link navigation, actionable work overview, coherent responsive layout and readable shared form controls.
- Explainable lead completeness, actionable quality filters, deterministic sorting and personal named views. Numeric lead scores are no longer presented as qualification evidence.
- Persistent pipeline transitions, stage safeguards and server-backed teams with manager-only editing.
- Day/week/month/agenda calendar, staff/team filters, fresh CRM conflict checks and explicit conflict acknowledgement.
- Server-owned brochure delivery through the narrow CRM endpoint, with uncertain-delivery handling and no duplicate client audit entries.
- Safer failed-mutation behavior and external website links; dependency lockfile security updates.

## Verification

- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npx vitest run --maxWorkers=2`: **282 passed, 0 failed** (complete suite, including account recovery regression tests).
- `npm run lint`: **0 errors, 65 warnings**. Existing warning debt remains; this is not a warning-free codebase.
- `npm audit`: **0 reported vulnerabilities**, including development dependencies, at verification time.
- `git diff --check`: passed.
- Browser smoke: **12 workflows passed, 0 page errors**, using system Chrome with every API request intercepted locally. Covers sales/admin UI boundary, light/dark appearance, routes, lead filters, pipeline mutation, calendar modes/conflict review, team data, mobile overflow, logout and reset request/completion.

Run browser smoke against a local preview with `CRM_SMOKE_URL` set, then `node scripts/upgrade-smoke.cjs`. The script uses the existing sibling `Admin-Dashboard/node_modules/playwright` installation and Chrome. Screenshots here contain fixtures only, not production data.

## Activation and limits

- Deploy with the coordinated backend identity, CRM teams/stages and brochure changes and required migrations. No deployment or production account mutation was performed from this repository.
- Microsoft Teams/Outlook Graph synchronization is **not configured**. Existing meeting links can be entered manually; calendar checks cover CRM appointments only. Stored appointment times retain the backend's Europe/Berlin wall-time convention.
- Completeness indicators describe recorded data, not independently verified lead authenticity, reachability or acquisition quality.
- Personal named filter views remain local to this browser/user; team membership and operational data are server-backed.
- MFA enrollment is managed through the central identity/Admin profile; this CRM supports the login challenge and recovery code entry.
- The browser run uses fixtures, not live API integration. Production mail delivery, database migrations and tenant setup need release-time verification.
