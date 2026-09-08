# Lead calendar and invitation verification

Lead details in the lead workspace, mobile dialog and pipeline now include **Zum Kalender** next to phone and email. The calendar retains the lead context and opens a draft with contact, owner and company ID. Unsaved lead notes still require an explicit decision before navigating. The full calendar remains visible for checking availability.

Appointment creation/editing retains the lead association. Failed invitation delivery opens the saved appointment with a retry action. Retrying uses PATCH on that same appointment; it does not create a duplicate. Provider failures are shown as errors, concurrent retry clicks are blocked, and successful sends show the stored timestamp.

The current backend does **not** create Microsoft Teams meetings. An existing meeting URL can be included in the email and calendar attachment. The editor now explains that requirement instead of suggesting automatic Teams creation.

Companion backend fixes:

- Standalone `resendInvite: true` previously returned before sending unless another field changed.
- Explicit invitation opt-out is respected when moving a meeting.
- Resending an unchanged appointment no longer calls it a reschedule.
- Meeting links appear in both text and HTML emails, with a clickable HTML action.
- ICS uses Europe/Berlin daylight/standard rules and UTF-8-safe line folding for long Teams URLs. Revisions advance when appointments change. Website invitation conversion preserves timezone rules.

Validation: frontend typecheck and production build; 377 frontend tests passed (6 skipped); 41 focused backend tests; backend production build; five browser workflows covering navigation, dirty drafts, prefill, failed sends/retry and mobile layout. Browser fixtures prevent external writes.

Live mail test is authorized only for **rechnung@partsunion.de**. Its receipt and deployment checks are retained separately under `.artifacts/crm-calendar-invitations-20260908`. Sending an invitation and creating an actual Teams meeting are separate capabilities; the latter is not claimed as verified.
