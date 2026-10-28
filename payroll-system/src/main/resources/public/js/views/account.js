import { get, put as putApi, post } from '../api.js';
import { h, put, fmtDate, amt } from '../util.js';
import { pageHead, toast } from '../ui.js';

export async function mount(root, ctx) {
  const { user } = await get('me');
  const isEmp = user.role === 'EMPLOYEE';
  put(root, h`${pageHead({ eyebrow: user.role === 'ADMIN' ? 'Administrator' : 'Employee', title: 'Your account' })}
    <div class="cols even">
      <section class="block"><header><h2>Profile</h2></header>
        <form id="profile" novalidate>
          <label class="field"><span>Full name</span><input name="name" type="text" value="${user.name}" required></label>
          <label class="field"><span>Email</span><input name="email" type="email" value="${user.email}" required></label>
          <p class="form-error" role="alert"></p>
          <button class="btn primary" type="submit">Save profile</button>
        </form>
        <dl class="facts">
          <div><dt>Username</dt><dd class="mono">${user.username}</dd></div>
          ${isEmp ? h`<div><dt>Designation</dt><dd>${user.designation}</dd></div>
            <div><dt>Department</dt><dd>${user.deptName || 'None'}</dd></div>
            <div><dt>Joined</dt><dd>${fmtDate(user.joiningDate)}</dd></div>
            <div><dt>Basic salary</dt><dd>${amt(user.basicSalary)}</dd></div>` : ''}
        </dl>
      </section>
      <section class="block"><header><h2>Change password</h2></header>
        <form id="password" novalidate>
          <label class="field"><span>Current password</span><input name="current" type="password" autocomplete="current-password" required></label>
          <label class="field"><span>New password</span><input name="next" type="password" autocomplete="new-password" required><small class="hint">At least 6 characters.</small></label>
          <label class="field"><span>Confirm new password</span><input name="again" type="password" autocomplete="new-password" required></label>
          <p class="form-error" role="alert"></p>
          <button class="btn primary" type="submit">Update password</button>
        </form>
      </section>
    </div>`);

  const bind = (form, handler) => form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = form.querySelector('.form-error');
    err.textContent = '';
    try { await handler(form); } catch (ex) { err.textContent = ex.message; }
  });
  bind(root.querySelector('#profile'), async (f) => {
    const res = await putApi('me/profile', { name: f.name.value, email: f.email.value });
    ctx.setUser(res.user);
    toast('Profile saved');
    location.reload();
  });
  bind(root.querySelector('#password'), async (f) => {
    if (f.next.value !== f.again.value) throw new Error('The new passwords do not match');
    await post('me/password', { current: f.current.value, next: f.next.value });
    f.reset();
    toast('Password updated');
  });
}
