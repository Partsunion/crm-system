/* Read-only browser smoke: all API requests are fulfilled with local fixtures. */
const { chromium } = require('../../Admin-Dashboard/node_modules/playwright');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.CRM_SMOKE_URL || 'http://127.0.0.1:5176';
const out = mkdtempSync(join(tmpdir(), 'partsunion-crm-upgrade-'));
const date = new Date();
const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const user = { id: 'sales-1', username: 'aaron', full_name: 'Aaron', email: 'aaron@example.test', role: 'sales', crm_role: 'sales', app_access: { admin: false, crm: true } };
const leads = [
  { id: 'lead-1', company: 'Autoteile Müller', contactPerson: 'Thomas Müller', email: 'm@example.test', phone: '+49301234567', city: 'Berlin', country: 'DE', dealerType: 'neuteile', status: 'Qualifiziert', source: 'Empfehlung', assignedTo: 'aaron', value: 2400, nextFollowUpDate: day, tags: [], createdAt: day, updatedAt: day },
  { id: 'lead-2', company: 'Recycling Weber', contactPerson: '', email: '', city: 'Leipzig', country: 'DE', dealerType: 'verwerter', status: 'Neu', source: 'Website', assignedTo: 'aaron', value: 1200, tags: [], createdAt: day, updatedAt: day },
  { id: 'lead-3', company: 'Werkstatt Nord', contactPerson: 'Lena Roth', email: 'roth@example.test', phone: '+4940111222', city: 'Hamburg', country: 'DE', dealerType: 'werkstatt', status: 'Angebot', source: 'Telefon', value: 1800, tags: [], createdAt: day, updatedAt: day },
];
const stages = ['Neu', 'Kontaktiert', 'Qualifiziert', 'Angebot', 'Gewonnen', 'Verloren'].map((name, index) => ({ id: String(index + 1), name, order: index + 1, color: 'blue', probability: index === 5 ? 0 : index * 20, isActive: true }));
let loggedIn = true;
const calls = [];
async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    await context.route('**/api/**', async (route) => {
      const req = route.request(); const url = new URL(req.url()); calls.push({ path: url.pathname, method: req.method(), body: req.postData() });
      let data = {}; let status = 200;
      if (url.pathname.endsWith('/admin-auth/me')) { data = { user }; if (!loggedIn) status = 401; }
      else if (url.pathname.endsWith('/admin-auth/login')) { data = { user }; loggedIn = true; }
      else if (url.pathname.endsWith('/admin-auth/logout')) { loggedIn = false; data = { ok: true }; }
      else if (url.pathname.endsWith('/crm/leads')) data = leads;
      else if (url.pathname.endsWith('/crm/settings')) data = { settings: { pipelineStages: stages, statuses: stages.map((s) => s.name), sources: ['Website', 'Empfehlung'], industries: [], tags: [], companyName: 'Partsunion', currency: 'EUR' } };
      else if (url.pathname.endsWith('/crm/teams')) data = { teams: [{ id: 'team-1', name: 'Deutschland', description: 'Händlerbetreuung Deutschland', memberIds: ['sales-1'], active: true }] };
      else if (url.pathname.endsWith('/crm/users')) data = { users: [user] };
      else if (url.pathname.endsWith('/appointments/admins')) data = { admins: [{ id: user.id, username: user.username, name: user.full_name, email: user.email }] };
      else if (url.pathname.endsWith('/appointments')) data = { appointments: [{ id: 'appt-1', type: 'sales', title: 'Produktgespräch', customer_name: 'Autoteile Müller', assignee_id: user.id, assignee_name: user.full_name, start_at: day + 'T10:00', end_at: day + 'T10:30', duration_minutes: 30, status: 'confirmed', company_id: 'lead-1' }] };
      else if (url.pathname.endsWith('/lead-lists') || url.pathname.endsWith('/activities')) data = [];
      else if (req.method() === 'PATCH') data = { ok: true };
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base); await page.getByRole('heading', { name: 'Arbeitsübersicht', exact: true }).waitFor();
    await page.getByRole('button', { name: /Autoteile Müller/ }).first().waitFor();
    assert.equal(await page.getAttribute('html', 'data-theme'), 'light');
    assert.equal(await page.locator('a[href="https://admin.partsunion.de"]').count(), 0, 'sales cannot see admin switch');
    await page.screenshot({ path: join(out, 'dashboard-desktop.png'), fullPage: true });
    await page.getByLabel('Zu dunklem Erscheinungsbild wechseln').click();
    assert.equal(await page.getAttribute('html', 'data-theme'), 'dark');
    await page.screenshot({ path: join(out, 'dashboard-dark.png'), fullPage: true });
    await page.getByLabel('Zu hellem Erscheinungsbild wechseln').click();
    await page.getByRole('button', { name: 'Leads', exact: true }).first().click();
    await page.getByRole('heading', { name: 'Leads', exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/leads');
    await page.getByLabel('Datenqualität filtern').selectOption('no_contact');
    await page.getByText('1 von 3 Leads').waitFor();
    await page.screenshot({ path: join(out, 'leads-desktop.png'), fullPage: true });
    await page.getByLabel('Datenqualität filtern').selectOption('all');
    await page.getByRole('button', { name: 'Pipeline', exact: true }).first().click();
    await page.getByLabel('Phase für Autoteile Müller').waitFor();
    await page.getByLabel('Phase für Autoteile Müller').selectOption('Angebot');
    await page.getByText('In „Angebot“ verschoben.').waitFor();
    assert(calls.some((call) => call.path.endsWith('/leads/lead-1') && call.method === 'PATCH'));
    await page.screenshot({ path: join(out, 'pipeline-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: 'Kalender', exact: true }).first().click();
    await page.getByRole('button', { name: 'Woche', exact: true }).waitFor();
    await page.screenshot({ path: join(out, 'calendar-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: 'Neuer Termin', exact: true }).click();
    await page.getByLabel('Zuständig', { exact: true }).selectOption(user.id);
    await page.getByLabel('Datum', { exact: true }).fill(day);
    await page.getByLabel('Uhrzeit', { exact: true }).fill('10:15');
    await page.getByText('Terminüberschneidung im CRM-Kalender').waitFor();
    const beforeCreate = calls.filter((call) => call.path.endsWith('/appointments') && call.method === 'POST').length;
    await page.getByRole('button', { name: 'Anlegen', exact: true }).click();
    assert.equal(calls.filter((call) => call.path.endsWith('/appointments') && call.method === 'POST').length, beforeCreate, 'collision must be reviewed before saving');
    await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
    for (const mode of ['Tag', 'Monat', 'Agenda']) { await page.getByRole('button', { name: mode, exact: true }).click(); assert.equal(await page.getByRole('button', { name: mode, exact: true }).getAttribute('aria-pressed'), 'true'); }
    await page.getByRole('button', { name: 'Vertriebsteam', exact: true }).first().click();
    await page.getByText('Deutschland · 1').waitFor();
    await page.screenshot({ path: join(out, 'team-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base); await page.getByRole('heading', { name: 'Arbeitsübersicht' }).waitFor();
    await page.screenshot({ path: join(out, 'dashboard-mobile.png'), fullPage: true });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no page overflow on mobile');
    await page.getByLabel('Benutzermenü').click(); await page.getByRole('menuitem', { name: 'Abmelden' }).click();
    await page.getByRole('button', { name: 'Anmelden', exact: true }).waitFor();
    assert(calls.some((call) => call.path.endsWith('/admin-auth/logout') && call.method === 'POST'));
    await page.getByRole('button', { name: 'Passwort vergessen?' }).click();
    await page.getByRole('heading', { name: 'Passwort zurücksetzen' }).waitFor();
    await page.screenshot({ path: join(out, 'recovery-mobile.png'), fullPage: true });
    await page.getByLabel('Benutzername oder E-Mail').fill('aaron');
    await page.getByRole('button', { name: 'Reset-Link anfordern' }).click();
    await page.getByText('Falls ein passendes Konto existiert', { exact: false }).waitFor();
    const recovery = calls.find((call) => call.path.endsWith('/admin-auth/request-reset'));
    assert.equal(JSON.parse(recovery.body).app, 'crm');
    await page.goto(base + '/reset-password#token=smoke-only-token');
    await page.getByRole('heading', { name: 'Neues Passwort festlegen' }).waitFor();
    await page.getByLabel(/Neues Passwort/).fill('a-new-smoke-passphrase');
    await page.getByLabel(/Passwort bestätigen/).fill('a-new-smoke-passphrase');
    await page.getByRole('button', { name: 'Passwort speichern' }).click();
    await page.getByText('Dein Passwort wurde geändert.', { exact: false }).waitFor();
    const reset = calls.find((call) => call.path.endsWith('/admin-auth/reset-password'));
    assert.equal(JSON.parse(reset.body).token, 'smoke-only-token');
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log(JSON.stringify({ ok: true, screenshots: out, checks: ['sales app boundary', 'light and dark themes', 'deep links', 'quality filters', 'pipeline mutation', 'calendar modes', 'calendar collision review', 'server team', 'mobile layout', 'logout revocation', 'recovery request', 'fragment token password reset'], errors }));
  } finally { await browser.close(); }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
