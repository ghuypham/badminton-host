// Modal form for creating/editing a court within a session.
import { useState, type FormEvent } from 'react';
import { api, ApiClientError } from '../api/client.ts';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-3">
        <h2 className="text-lg">{initial ? 'Sửa sân' : 'Thêm sân'}</h2>

        <div>
          <label className="label">Tên sân *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Giờ bắt đầu</label>
            <input type="time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div>
            <label className="label">Giờ kết thúc</label>
            <input type="time" className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Chi phí (VND)</label>
          <input
            type="number"
            className="input"
            min={0}
            value={cost}
            onChange={(e) => setCost(parseInt(e.target.value || '0', 10))}
          />
        </div>

        {err && <p className="text-sm text-danger">{err}</p>}

        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu'}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
}
