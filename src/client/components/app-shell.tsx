// Layout admin: header + bottom nav mobile-first. Bọc các trang đã đăng nhập.
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/auth-context.tsx';

const NAV = [
  { to: '/', label: 'Trang chủ', end: true },
  { to: '/sessions', label: 'Buổi đánh' },
  { to: '/members', label: 'Thành viên' },
  { to: '/debts', label: 'Công nợ' },
  { to: '/settings', label: 'Cài đặt' },
];

export function AppShell() {
  const { username, logout } = useAuth();
  return (
    <div className="min-h-screen flex flex-col max-w-screen-sm mx-auto">
      <header className="flex items-center justify-between px-4 h-14 border-b border-hairline sticky top-0 bg-canvas z-10">
        <span className="font-display text-xl">Cầu lông</span>
        <button onClick={() => logout()} className="text-sm text-muted hover:text-ink">
          {username} · Thoát
        </button>
      </header>

      <main className="flex-1 px-4 py-5 pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 max-w-screen-sm mx-auto bg-canvas border-t border-hairline flex">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex-1 py-3 text-center text-xs font-medium ${isActive ? 'text-primary' : 'text-muted'}`
            }
          >
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
