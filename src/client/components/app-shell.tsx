// Layout admin: header có logo + bottom nav icon, mobile-first. Bọc các trang đã đăng nhập.
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/auth-context.tsx';
import { Icon, type IconName } from './icon.tsx';

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Trang chủ', icon: 'home', end: true },
  { to: '/sessions', label: 'Buổi đánh', icon: 'calendar' },
  { to: '/members', label: 'Thành viên', icon: 'users' },
  { to: '/debts', label: 'Công nợ', icon: 'wallet' },
  { to: '/settings', label: 'Cài đặt', icon: 'settings' },
];

export function AppShell() {
  const { username, logout } = useAuth();
  return (
    <div className="min-h-dvh flex flex-col max-w-screen-sm mx-auto bg-canvas">
      <header className="flex items-center justify-between px-4 h-14 border-b border-hairline sticky top-0 bg-canvas/90 backdrop-blur-md z-20">
        <span className="flex items-center gap-2">
          <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-on-primary">
            <Icon name="shuttlecock" size={18} />
          </span>
          <span className="font-display text-lg leading-none">Cầu lông</span>
        </span>
        <button
          onClick={() => logout()}
          className="text-xs text-muted hover:text-ink transition-colors px-2 py-1 rounded-md hover:bg-surface-sunken"
        >
          {username} · Thoát
        </button>
      </header>

      <main className="flex-1 px-4 py-5 pb-28">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 max-w-screen-sm mx-auto bg-surface-card/95 backdrop-blur-md border-t border-hairline shadow-nav flex pb-[env(safe-area-inset-bottom)] z-20">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-muted hover:text-ink'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex items-center justify-center h-8 w-12 rounded-pill transition-colors ${
                    isActive ? 'bg-primary-soft' : ''
                  }`}
                >
                  <Icon name={n.icon} size={20} />
                </span>
                {n.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
