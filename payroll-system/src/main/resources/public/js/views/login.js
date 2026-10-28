import { post } from '../api.js';
import { h, put } from '../util.js';

export function mount(root, { onSignedIn }) {
  put(root, h`<div class="login">
    <section>
      <div class="mark">Payroll</div>
      <div class="mark-sub">Management System</div>
      <p class="pitch">Attendance, salary and payslips for one company, kept in a single ledger.</p>
    </section>
    <form class="sheet" novalidate>
      <h2>Sign in</h2><p class="muted">Use the account your administrator gave you.</p>
      <label class="field"><span>Username</span><input name="username" type="text" autocomplete="username" autofocus required></label>
      <label class="field"><span>Password</span><input name="password" type="password" autocomplete="current-password" required></label>
      <p class="form-error" role="alert"></p>
      <button class="btn primary" type="submit">Open the ledger</button>
    </form></div>`);
  const form = root.querySelector('form');
  const err = form.querySelector('.form-error');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true; err.textContent = '';
    try {
      const res = await post('login', { username: form.username.value.trim(), password: form.password.value });
      onSignedIn(res.user);
    } catch (ex) {
      err.textContent = ex.message;
      form.password.value = '';
      form.password.focus();
    } finally { btn.disabled = false; }
  });
}
