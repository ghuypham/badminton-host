// Sessions page: list + filter by status + create via modal.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.ts';
import { formatDate } from '../lib/format.ts';
import { SessionForm } from '../components/session-form.tsx';
import type { Session, SessionStatus } from '../../shared/types.ts';

const STATUS_LABEL: Record<SessionStatus, string> = {
  draft: 'Nháp',
  open: 'Đang mở',
  settled: 'Đã quyết toán',
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
        <h1 className="text-2xl">Buổi đánh</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Tạo</button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {(['', 'draft', 'open', 'settled'] as const).map((s) => (
          <button
            key={s}
            className={`text-xs h-7 px-3 rounded-full border ${filterStatus === s ? 'bg-primary text-on-primary border-primary' : 'border-hairline bg-canvas'}`}
            onClick={() => setFilterStatus(s)}
          >
            {s === '' ? 'Tất cả' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {sessions.length === 0 && <p className="text-sm text-muted">Chưa có buổi nào.</p>}
        {sessions.map((s) => (
          <Link key={s.id} to={`/sessions/${s.id}`} className="card flex justify-between items-center">
            <div>
              <div className="font-medium">{s.title}</div>
              <div className="text-xs text-muted">
                {formatDate(s.session_date)}{s.location ? ` · ${s.location}` : ''}
              </div>
            </div>
            <span className="badge text-xs">{STATUS_LABEL[s.status]}</span>
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
