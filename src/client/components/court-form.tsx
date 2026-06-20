// Modal form for creating/editing a court within a session.
import { useState, type FormEvent } from 'react';
import { api, ApiClientError } from '../api/client.ts';
import { Icon } from './icon.tsx';
import type { SessionCourt } from '../../shared/types.ts';

interface Props {
  sessionId: number;
  initial?: SessionCourt | null;
  onSaved: (c: SessionCourt) => void;
  onClose: () => void;
}

export function CourtForm({ sessionId, initial, onSaved, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [startTime, setStartTime] = useState(initial?.start_time ?? '');
  const [endTime, setEndTime] = useState(initial?.end_time ?? '');
  const [cost, setCost] = useState(initial?.cost ?? 0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const body = {
      name,
      start_time: startTime || null,
      end_time: endTime || null,
      cost,
    };
    try {
      const saved = initial
        ? await api.put<SessionCourt>(`/admin/sessions/${sessionId}/courts/${initial.id}`, body)
        : await api.post<SessionCourt>(`/admin/sessions/${sessionId}/courts`, body);
      onSaved(saved);
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : 'Lỗi lưu sân');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay">
      <form onSubmit={onSubmit} className="modal-panel">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">{initial ? 'Sửa sân' : 'Thêm sân'}</h2>
          <button type="button" className="icon-btn" aria-label="Đóng" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Tên sân *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Giờ bắt đầu</label>
              <div className="relative">
                <Icon name="clock" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input type="time" className="input pl-9" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Giờ kết thúc</label>
              <div className="relative">
                <Icon name="clock" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input type="time" className="input pl-9" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Chi phí (VND)</label>
            <input
              type="number"
              className="input tnum"
              min={0}
              value={cost}
              onChange={(e) => setCost(parseInt(e.target.value || '0', 10))}
            />
          </div>

          {err && <p className="text-sm text-danger">{err}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-2 mt-5">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>Hủy</button>
          <button type="submit" className="btn-primary flex-1" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu'}
          </button>
        </div>
      </form>
    </div>
  );
}
