// End-to-end check of the real UI in headless Chromium.
// Needs: a running server on http://127.0.0.1:8080 with a FRESH database (demo data only), and 'npm i playwright'.
//   java -jar target/payroll-system-1.0.0.jar   then   node e2e/e2e.js
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8080';
let step = 0; const ok = (m) => console.log(`  ok ${++step}. ${m}`);
const must = (c, m) => { if (!c) { console.log('FAIL: ' + m); process.exitCode = 1; throw new Error(m); } ok(m); };
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const open = async () => { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); return p; };
  const signIn = async (p, u, pw) => { await p.goto(BASE + '/'); await p.fill('input[name=username]', u); await p.fill('input[name=password]', pw); await p.click('button[type=submit]'); await p.waitForSelector('.masthead'); };

  const a = await open();
  await signIn(a, 'admin', 'admin123');
  must(await a.locator('h1').innerText() === 'Overview', 'admin lands on Overview');

  // add an employee through the drawer
  await a.click('a[href="#/employees"]'); await a.waitForSelector('table.ledger');
  await a.click('[data-act=add]'); await a.waitForSelector('.drawer');
  await a.fill('input[name=name]', 'Zed <b>Test</b>'); await a.fill('input[name=email]', 'zed@company.com'); await a.fill('input[name=username]', 'zed');
  await a.fill('input[name=password]', 'zed-pass1'); await a.fill('input[name=designation]', 'Tester'); await a.fill('input[name=joiningDate]', '2025-01-01');
  await a.fill('input[name=basicSalary]', '48000'); await a.selectOption('select[name=deptId]', { label: 'Finance' });
  await a.click('.drawer button[type=submit]'); await a.waitForSelector('.drawer', { state: 'detached' });
  must(await a.locator('td b', { hasText: 'Zed' }).count() === 1, 'new employee appears in the list');
  must(await a.locator('td b b').count() === 0, 'HTML in a name is shown as text, not markup (no XSS)');
  // a bad form shows an inline error and keeps the drawer open
  await a.click('[data-act=add]'); await a.waitForSelector('.drawer'); await a.click('.drawer button[type=submit]');
  await a.waitForFunction(() => document.querySelector('.drawer .form-error').textContent.length > 0);
  must(true, 'invalid form shows an inline error'); await a.keyboard.press('Escape');

  // run payroll for last month through the UI
  await a.click('a[href="#/payroll"]'); await a.waitForSelector('.stepper');
  await a.click('[data-run]'); await a.waitForSelector('dialog[open]'); await a.click('dialog button[value=yes]');
  await a.waitForSelector('dialog[open] h2:has-text("Payroll for")'); const txt = await a.locator('dialog').innerText();
  must(/6\s+record/.test(txt), 'run creates 6 records (5 demo + Zed): ' + txt.replace(/\s+/g, ' ').slice(0, 90));
  await a.click('dialog button'); await a.waitForSelector('table.ledger');
  must(await a.locator('tbody tr').count() === 6, 'table lists 6 records');

  // bulk verify then pay
  await a.check('[data-all]'); must(await a.locator('.selection-bar').count() === 1, 'selection bar appears');
  await a.click('[data-bulk=verify]'); await a.waitForSelector('.toast');
  await a.waitForFunction(() => document.querySelectorAll('.stamp.VERIFIED').length >= 6);
  must(true, 'bulk verify moves all six to VERIFIED');
  await a.check('[data-all]'); await a.click('[data-bulk=pay]');
  await a.waitForFunction(() => document.querySelectorAll('tbody .stamp.PAID').length >= 6);
  must(true, 'bulk pay moves all six to PAID');
  // cancelling a paid record is refused and says why
  await a.check('[data-sel] >> nth=0'); await a.click('[data-bulk=cancel]'); await a.waitForSelector('dialog[open]'); await a.click('dialog button[value=yes]');
  await a.waitForSelector('dialog[open] h2:has-text("unchanged")'); must(true, 'cancelling PAID is refused with an explanation'); await a.click('dialog button');

  // employee side
  const e = await open();
  await signIn(e, 'zed', 'zed-pass1');
  await e.click('a[href="#/payslips"]'); await e.waitForSelector('.slip');
  must((await e.locator('.slip .net').innerText()).includes('53,520'), 'employee sees their payslip: net 53,520 = 62,400 gross - 5,760 PF - 3,120 tax');
  const [dl] = await Promise.all([e.waitForEvent('download'), e.click('text=Download PDF')]);
  must(dl.suggestedFilename().startsWith('payslip-'), 'PDF download: ' + dl.suggestedFilename());
  await e.click('a[href="#/account"]'); await e.waitForSelector('#password');
  await e.fill('#password input[name=current]', 'zed-pass1'); await e.fill('#password input[name=next]', 'zed-pass2'); await e.fill('#password input[name=again]', 'zed-pass2');
  await e.click('#password button'); await e.waitForSelector('.toast');
  await e.click('#signout'); await e.waitForSelector('.login');
  await e.fill('input[name=username]', 'zed'); await e.fill('input[name=password]', 'zed-pass1'); await e.click('button[type=submit]');
  await e.waitForFunction(() => document.querySelector('.form-error').textContent.includes('Invalid'));
  must(true, 'old password no longer works');
  await e.fill('input[name=password]', 'zed-pass2'); await e.click('button[type=submit]'); await e.waitForSelector('.masthead');
  must(true, 'new password works');
  // an employee cannot open admin pages by URL
  await e.goto(BASE + '/#/payroll'); await e.reload(); await e.waitForSelector('main h1');
  must(await e.locator('h1').innerText() === 'Hello, Zed', 'unknown route for an employee falls back to their overview');

  // admin deactivates Zed: existing session is refused on next request
  await a.click('a[href="#/employees"]'); await a.waitForSelector('table.ledger');
  await a.locator('tr', { hasText: 'zed@company.com' }).locator('[data-act=toggle]').click(); await a.waitForSelector('dialog[open]'); await a.click('dialog button[value=yes]');
  await a.waitForFunction(() => !document.body.innerText.includes('zed@company.com'));
  must(true, 'deactivated employee disappears from the default list');
  await e.reload(); await e.waitForSelector('.login'); must(true, 'deactivated employee is signed out on next load');
  console.log(errs.length ? 'JS errors:\n' + errs.join('\n') : 'no JS errors');
  await b.close();
})().catch((e) => { console.log('ERROR', e.message.split('\n')[0]); process.exit(1); });
