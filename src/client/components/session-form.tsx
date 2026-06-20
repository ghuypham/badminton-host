// Modal form for creating/editing a session.
import { useState, type FormEvent } from 'react';
import { api, ApiClientError } from '../api/client.ts';
import { toDateInputValue } from '../lib/format.ts';
import { Icon } from './icon.tsx';
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
    <div className="modal-overlay">
      <form onSubmit={onSubmit} className="modal-panel">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">{initial ? 'Sửa buổi đánh' : 'Tạo buổi đánh'}</h2>
          <button type="button" className="icon-btn" aria-label="Đóng" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="space-y-4">
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
            <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} placeholder="VD: Sân Phú Thọ, 219 Lý Thường Kiệt, Q11" />
            <p className="helper">Nhập địa chỉ tìm được trên Google Maps để member xem bản đồ.</p>
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
