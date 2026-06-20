// Sessions page: list + filter by status + create via modal.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.ts';
import { formatDate } from '../lib/format.ts';
import { SessionForm } from '../components/session-form.tsx';
import { Icon } from '../components/icon.tsx';
import type { Session, SessionStatus } from '../../shared/types.ts';

const STATUS_LABEL: Record<SessionStatus, string> = {
  draft: 'Nháp',
  open: 'Đang mở',
  settled: 'Đã quyết toán',
};

// Maps session status → badge class
const STATUS_BADGE: Record<SessionStatus, string> = {
  draft: 'badge',
  open: 'badge-primary',
  settled: 'badge-success',
};

export function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filterStatus, setFilterStatus] = useState<SessionStatus | ''>('');
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    const params = filterStatus ? `?status=${filterStatus}` : '';
    api.get<Session[]>(`/admin/sessions${params}`).then(setSessions).catch(() => setSessions([]));
  };

  useEffect(() => { load(); }, [filterStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Buổi đánh</h1>
        <button className="btn-primary btn-sm" onClick={() => setShowForm(true)}>
          <Icon name="plus" size={16} /> Tạo
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {(['', 'draft', 'open', 'settled'] as const).map((s) => (
          <button
            key={s}
            className={`chip ${filterStatus === s ? 'chip-active' : ''}`}
            onClick={() => setFilterStatus(s)}
          >
            {s === '' ? 'Tất cả' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {sessions.length === 0 && (
          <div className="card flex flex-col items-center text-center py-10 gap-3">
            <span className="flex items-center justify-center h-14 w-14 rounded-full bg-surface-sunken text-muted">
              <Icon name="calendar" size={26} />
            </span>
            <p className="text-sm text-muted">Chưa có buổi nào.</p>
            <button className="btn-primary btn-sm" onClick={() => setShowForm(true)}>
              <Icon name="plus" size={16} /> Tạo buổi đầu tiên
            </button>
          </div>
        )}
        {sessions.map((s) => (
          <Link key={s.id} to={`/sessions/${s.id}`} className="row">
            <span className="avatar">
              <Icon name="calendar" size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{s.title}</div>
              <div className="text-xs text-muted">
                {formatDate(s.session_date)}{s.location ? ` · ${s.location}` : ''}
              </div>
            </div>
            <span className={STATUS_BADGE[s.status]}>{STATUS_LABEL[s.status]}</span>
            <Icon name="chevronRight" size={18} className="text-muted shrink-0" />
          </Link>
        ))}
      </div>

      {showForm && (
        <SessionForm
          onSaved={(s) => { setShowForm(false); setSessions((prev) => [s, ...prev]); }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
