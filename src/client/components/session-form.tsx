// Modal form for creating/editing a session.
import { useState, type FormEvent } from 'react';
import { api, ApiClientError } from '../api/client.ts';
import { toDateInputValue } from '../lib/format.ts';
import type { Session } from '../../shared/types.ts';

interface Props {
  initial?: Session | null;
  onSaved: (s: Session) => void;
  onClose: () => void;
}

export function SessionForm({ initial, onSaved, onClose }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(
    initial?.session_date ? toDateInputValue(initial.session_date) : new Date().toISOString().slice(0, 10),
  );
  const [location, setLocation] = useState(initial?.location ?? '');
  const [note, setNote] = useState(initial?.private_note ?? '');
  const [regEnabled, setRegEnabled] = useState<0 | 1>(initial?.registration_enabled ?? 0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const body = {
      title,
      session_date: date,
      location: location || null,
      private_note: note || null,
      registration_enabled: regEnabled,
    };
    try {
      const saved = initial
        ? await api.put<Session>(`/admin/sessions/${initial.id}`, body)
        : await api.post<Session>('/admin/sessions', body);
      onSaved(saved);
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : 'Lỗi lưu buổi đánh');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-3">
        <h2 className="text-lg">{initial ? 'Sửa buổi đánh' : 'Tạo buổi đánh'}</h2>

        <div>
          <label className="label">Tên buổi *</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
        </div>

        <div>
          <label className="label">Ngày</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <div>
          <label className="label">Địa điểm</label>
          <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} />
        </div>

        <div>
          <label className="label">Ghi chú nội bộ</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="reg"
            checked={regEnabled === 1}
            onChange={(e) => setRegEnabled(e.target.checked ? 1 : 0)}
          />
          <label htmlFor="reg" className="text-sm">Mở đăng ký công khai</label>
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
