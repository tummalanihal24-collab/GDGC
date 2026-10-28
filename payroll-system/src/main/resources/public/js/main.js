// App shell: session check, role-based navigation, hash router. Each view lives in /js/views.
import { get, post } from './api.js';
import { h, put } from './util.js';
import { toast, loading } from './ui.js';

const app = document.getElementById('app');

const ROUTES = {
  ADMIN: [
    ['overview', 'Overview', () => import('./views/admin-overview.js')],
    ['employees', 'Employees', () => import('./views/employees.js')],
    ['departments', 'Departments', () => import('./views/departments.js')],
    ['salary', 'Salary', () => import('./views/salary.js')],
    ['attendance', 'Attendance', () => import('./views/attendance.js')],
    ['payroll', 'Payroll', () => import('./views/payroll.js')],
    ['reports', 'Reports', () => import('./views/reports.js')],
    ['audit', 'Audit', () => import('./views/audit.js')],
  ],
  EMPLOYEE: [
    ['overview', 'Overview', () => import('./views/me-overview.js')],
    ['attendance', 'Attendance', () => import('./views/me-attendance.js')],
    ['payslips', 'Payslips', () => import('./views/payslips.js')],
  ],
};
const ACCOUNT = () => import('./views/account.js');

let user = null;
let mounted = 0; // guards against a slow view rendering after the user navigated away

function parseHash() {
  const [, name = '', ...rest] = location.hash.split('/');
  return { name: name || 'overview', params: rest };
}

async function showLogin() {
  user = null;
  document.title = 'Sign in - Payroll Management System';
  const mod = await import('./views/login.js');
  mod.mount(app, { onSignedIn: (u) => { user = u; location.hash = '#/overview'; boot(); } });
}

function shell() {
  const routes = ROUTES[user.role];
  const { name } = parseHash();
  put(app, h`<header class="masthead"><div class="masthead-in">
      <a class="wordmark" href="#/overview" aria-label="Payroll home"><b>Payroll</b><span>Management System</span></a>
      <nav class="nav" aria-label="Main">${routes.map(([key, label], i) =>
        h`<a href="#/${key}" ${name === key ? h`aria-current="page"` : ''}><span class="n">${String(i + 1).padStart(2, '0')}</span>${label}</a>`)}</nav>
      <div class="who"><a href="#/account" ${name === 'account' ? h`aria-current="page"` : ''}>${user.name}</a><button type="button" id="signout">Sign out</button></div>
    </div></header><main id="view" tabindex="-1"></main>`);
  document.getElementById('signout').addEventListener('click', async () => {
    try { await post('logout'); } catch { /* already signed out */ }
    showLogin();
  });
}

async function route() {
  if (!user) return;
  const { name, params } = parseHash();
  const routes = ROUTES[user.role];
  const entry = name === 'account' ? ['account', 'Account', ACCOUNT] : routes.find(([k]) => k === name);
  if (!entry) { location.hash = '#/overview'; return; }
  shell();
  const view = document.getElementById('view');
  view.onclick = null;
  loading(view);
  const token = ++mounted;
  document.title = `${entry[1]} - Payroll Management System`;
  try {
    const mod = await entry[2]();
    if (token !== mounted) return;
    await mod.mount(view, { user, params, setUser: (u) => { user = u; } });
  } catch (e) {
    if (token !== mounted) return;
    put(view, h`<div class="empty">${e.message || 'This page could not be loaded.'}</div>`);
    toast(e.message || 'Page failed to load', 'error');
  }
  window.scrollTo(0, 0);
}

async function boot() {
  if (!user) {
    try { user = (await get('session')).user; } catch { /* server unreachable: show sign-in */ }
  }
  if (!user) { showLogin(); return; }
  route();
}

window.addEventListener('hashchange', route);
window.addEventListener('payroll:unauthorized', () => { if (user) { toast('Your session has ended. Please sign in again.', 'error'); showLogin(); } });
boot();
