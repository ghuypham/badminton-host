import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context.tsx';
import { ApiClientError } from '../api/client.ts';

export function LoginPage() {
  const { login, authenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (authenticated) navigate('/', { replace: true });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Đăng nhập thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm card">
        <h1 className="text-2xl mb-1">Cầu lông Host</h1>
        <p className="text-sm text-muted mb-6">Đăng nhập quản trị</p>

        <label className="label" htmlFor="username">Tài khoản</label>
        <input id="username" className="input mb-4" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />

        <label className="label" htmlFor="password">Mật khẩu</label>
        <input id="password" type="password" className="input mb-4" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />

        {error && <p className="text-sm text-danger mb-4">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Đang vào…' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
}
