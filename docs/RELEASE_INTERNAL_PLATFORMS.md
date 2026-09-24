# CRM / Admin coordinated release

This source release contains the complete CRM upgrade: shared internal shell,
lead filtering and quality indicators, pipeline and team workflows, calendar,
guarded bulk actions, account recovery, MFA and application-scoped sessions.

Deploy only with the corresponding API and the matching Admin frontend. The
backend owns application grants, sales/manager permissions, team persistence,
pipeline validation, recovery and MFA, and controlled brochure delivery. A new
frontend alone cannot revoke an existing administrator's live access.

The `release/internal-platforms-*` branch runs typecheck, lint, unit tests,
dependency audit and production build. A successful source CI does not replace
database, account or provider acceptance. Set
`VITE_API_BASE_URL=https://api.partsunion.de` when building the production image.

Before production rollout, verify a backup and restore plan and test both
platforms against the exact API revision after migrations. Confirm that a normal
sales account cannot access Admin or manage teams and pipeline settings.
Use controlled test contacts for mail verification; unit tests do not send mail.

The central dealer-app `services=all` workflow currently excludes Admin and CRM.
It is not a deployment route for these interfaces without a reviewed extension
or a separate, coordinated rollout. The desktop-app release is independent.
