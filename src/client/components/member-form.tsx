// Modal form for creating/editing a member.
import { useState, type FormEvent } from 'react';
import { api, ApiClientError } from '../api/client.ts';
import { Icon } from './icon.tsx';
import { SKILL_LEVELS } from '../lib/skill-levels.ts';
import type { Member, MemberType, MemberStatus } from '../../shared/types.ts';

interface Props {
  initial?: Member | null;
  onSaved: (m: Member) => void;
  onClose: () => void;
}

export function MemberForm({ initial, onSaved, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [memberType, setMemberType] = useState<MemberType>(initial?.member_type ?? 'fixed');
  const [skillLevel, setSkillLevel] = useState(initial?.skill_level ?? 0);
  const [status, setStatus] = useState<MemberStatus>(initial?.status ?? 'active');
  const [note, setNote] = useState(initial?.note ?? '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const body = {
      name,
      phone: phone || null,
      member_type: memberType,
      skill_level: skillLevel,
      status,
      note: note || null,
    };
    try {
      const saved = initial
        ? await api.put<Member>(`/admin/members/${initial.id}`, body)
        : await api.post<Member>('/admin/members', body);
      onSaved(saved);
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : 'Lỗi lưu thành viên');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay">
      <form onSubmit={onSubmit} className="modal-panel">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">{initial ? 'Sửa thành viên' : 'Thêm thành viên'}</h2>
          <button type="button" className="icon-btn" aria-label="Đóng" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Tên *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
          </div>

          <div>
            <label className="label">Số điện thoại</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} placeholder="Tùy chọn" />
          </div>

          <div>
            <label className="label">Loại thành viên</label>
            <select className="input" value={memberType} onChange={(e) => setMemberType(e.target.value as MemberType)}>
              <option value="fixed">Cố định</option>
              <option value="guest">Khách</option>
            </select>
          </div>

          <div>
            <label className="label">Trình độ</label>
            <select
              className="input"
              value={skillLevel}
              onChange={(e) => setSkillLevel(parseInt(e.target.value, 10))}
            >
              {SKILL_LEVELS.map((label, i) => (
                <option key={i} value={i}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Trạng thái</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as MemberStatus)}>
              <option value="active">Hoạt động</option>
              <option value="inactive">Không hoạt động</option>
            </select>
          </div>

          <div>
            <label className="label">Ghi chú</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
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
