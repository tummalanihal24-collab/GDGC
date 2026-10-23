import { useState } from 'react';
import { api } from '../api.js';

function AuthForm({ title, path, fields, onAuth }) {
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try { onAuth(await api(path, 'POST', Object.fromEntries(new FormData(e.target)))); }
    catch (err) { setError(err.message); }
  };
  return (
    <form className="card" onSubmit={submit}>
      <h3>{title}</h3>
      {fields.map(([name, label, type]) => (
        <label key={name}>{label}<input name={name} type={type} required minLength={type === 'password' ? 6 : undefined} /></label>
      ))}
      <button className="primary">{title}</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

export default function Auth({ onAuth }) {
  return (
    <div className="two">
      <AuthForm title="Log in" path="/auth/login" onAuth={onAuth}
        fields={[['email', 'Email', 'email'], ['password', 'Password', 'password']]} />
      <AuthForm title="Sign up" path="/auth/signup" onAuth={onAuth}
        fields={[['name', 'Name', 'text'], ['email', 'Email', 'email'], ['password', 'Password (6+ characters)', 'password']]} />
    </div>
  );
}
