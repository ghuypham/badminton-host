// Trang chủ: tổng quan buổi sắp tới, pending, tổng công nợ.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.ts';
import { formatVnd, formatDate } from '../lib/format.ts';
import { Icon } from '../components/icon.tsx';

interface HomeStats {
  upcomingSessions: { id: number; title: string; session_date: string; status: string }[];
  pendingCount: number;
  totalDebt: number;
}

const STATUS: Record<string, string> = { draft: 'Nháp', open: 'Đang mở', settled: 'Quyết toán' };

export function HomePage() {
  const [stats, setStats] = useState<HomeStats | null>(null);

  useEffect(() => {
    api.get<HomeStats>('/admin/sessions/home-stats').then(setStats).catch(() => setStats(null));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="page-title">Tổng quan</h1>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/sessions" className="card-tap">
          <div className="flex items-center justify-between">
            <span className="flex items-center justify-center h-9 w-9 rounded-lg bg-warning-soft text-warning">
              <Icon name="clock" size={18} />
            </span>
            <Icon name="chevronRight" size={16} className="text-muted" />
          </div>
          <div className="mt-3 text-3xl font-display tnum leading-none">{stats?.pendingCount ?? '–'}</div>
          <div className="mt-1 text-xs text-muted">Chờ duyệt</div>
        </Link>

        <Link to="/debts" className="card-tap">
          <div className="flex items-center justify-between">
            <span className="flex items-center justify-center h-9 w-9 rounded-lg bg-danger-soft text-danger">
              <Icon name="wallet" size={18} />
            </span>
            <Icon name="chevronRight" size={16} className="text-muted" />
          </div>
          <div className="mt-3 text-2xl font-display tnum leading-none">
            {stats ? formatVnd(stats.totalDebt) : '–'}
          </div>
          <div className="mt-1 text-xs text-muted">Tổng công nợ</div>
        </Link>
      </div>

      {/* Reports shortcut */}
      <Link to="/reports" className="row card-tap">
        <span className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary-soft text-primary shrink-0">
          <Icon name="receipt" size={18} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">Báo cáo & thống kê</div>
          <div className="text-xs text-muted">Xem tổng quan tài chính, buổi đánh, thành viên</div>
        </div>
        <Icon name="chevronRight" size={16} className="text-muted shrink-0" />
      </Link>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Buổi sắp tới</h2>
          <Link to="/sessions" className="text-sm text-primary font-medium">Tất cả</Link>
        </div>

        {stats?.upcomingSessions.length ? (
          <div className="space-y-2">
            {stats.upcomingSessions.map((s) => (
              <Link key={s.id} to={`/sessions/${s.id}`} className="row">
                <span className="avatar">
                  <Icon name="calendar" size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{s.title}</div>
                  <div className="text-xs text-muted">{formatDate(s.session_date)}</div>
                </div>
                <span className="badge-primary">{STATUS[s.status] ?? s.status}</span>
                <Icon name="chevronRight" size={18} className="text-muted shrink-0" />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center text-center py-10 gap-3">
      <span className="flex items-center justify-center h-14 w-14 rounded-full bg-surface-sunken text-muted">
        <Icon name="calendar" size={26} />
      </span>
      <p className="text-sm text-muted">Chưa có buổi đánh nào.</p>
      <Link to="/sessions" className="btn-primary btn-sm">
        <Icon name="plus" size={16} /> Tạo buổi đầu tiên
      </Link>
    </div>
  );
}
