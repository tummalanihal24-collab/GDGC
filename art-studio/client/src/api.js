let token = localStorage.getItem('token');
let onUnauthorized = () => {};

export const setToken = (t) => {
  token = t;
  if (t) localStorage.setItem('token', t); else localStorage.removeItem('token');
};
export const hasToken = () => !!token;
export const setOnUnauthorized = (fn) => { onUnauthorized = fn; };

export async function api(path, method = 'GET', body) {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) onUnauthorized();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const money = (n) => '₹' + Number(n).toLocaleString('en-IN');
// IST calendar day, `days` from today, as YYYY-MM-DD (matches the server's rules).
export const dateIn = (days) => new Date(Date.now() + 5.5 * 3600000 + days * 86400000).toISOString().slice(0, 10);
