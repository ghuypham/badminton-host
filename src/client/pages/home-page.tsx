// Trang chủ: tổng quan buổi sắp tới, pending, tổng công nợ. Số liệu nối ở P4/P9.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.ts';
import { formatVnd, formatDate } from '../lib/format.ts';

interface HomeStats {
  upcomingSessions: { id: number; title: string; session_date: string; status: string }[];
  pendingCount: number;
  totalDebt: number;
}

export function HomePage() {
  const [stats, setStats] = useState<HomeStats | null>(null);

  useEffect(() => {
    api.get<HomeStats>('/admin/sessions/home-stats').then(setStats).catch(() => setStats(null));
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl">Tổng quan</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="text-xs text-muted">Chờ duyệt</div>
          <div className="text-2xl font-display">{stats?.pendingCount ?? '–'}</div>
        </div>
        <div className="card">
          <div className="text-xs text-muted">Tổng công nợ</div>
          <div className="text-2xl font-display">{stats ? formatVnd(stats.totalDebt) : '–'}</div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg">Buổi sắp tới</h2>
          <Link to="/sessions" className="text-sm text-primary">Tất cả</Link>
        </div>
        <div className="space-y-2">
          {stats?.upcomingSessions.length ? (
            stats.upcomingSessions.map((s) => (
              <Link key={s.id} to={`/sessions/${s.id}`} className="card flex justify-between items-center">
                <div>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-muted">{formatDate(s.session_date)}</div>
                </div>
                <span className="badge">{s.status}</span>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted">Chưa có buổi nào.</p>
          )}
        </div>
      </div>
    </div>
  );
}
