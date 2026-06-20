// Participants section for session-detail-page: list by status, add member/guest, approve/reject, attendance + charge toggle.
import { useEffect, useState } from 'react';
import { api, ApiClientError } from '../api/client.ts';
import type { Member, SessionParticipant, ParticipantStatus } from '../../shared/types.ts';

interface Props {
  sessionId: number;
  participants: SessionParticipant[];
  onChange: () => void;
  settled: boolean;
}

const STATUS_LABEL: Record<ParticipantStatus, string> = {
  pending: 'Chờ duyệt',
  going: 'Sẽ đến',
  attended: 'Có mặt',
  absent: 'Vắng',
  cancelled: 'Hủy',
  rejected: 'Từ chối',
};

export function ParticipantsSection({ sessionId, participants, onChange, settled }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get<Member[]>('/admin/members').then(setMembers).catch(() => setMembers([]));
  }, []);

  const pending = participants.filter((p) => p.status === 'pending');
  const active = participants.filter((p) => p.status !== 'pending');

  const approve = async (id: number) => {
    try { await api.post(`/admin/participants/${id}/approve`); onChange(); }
    catch (e) { setErr(e instanceof ApiClientError ? e.message : 'Lỗi'); }
  };

  const reject = async (id: number) => {
    try { await api.post(`/admin/participants/${id}/reject`); onChange(); }
    catch (e) { setErr(e instanceof ApiClientError ? e.message : 'Lỗi'); }
  };

  const setStatus = async (id: number, status: ParticipantStatus) => {
    try { await api.put(`/admin/participants/${id}`, { status }); onChange(); }
    catch (e) { setErr(e instanceof ApiClientError ? e.message : 'Lỗi'); }
  };

  const toggleCharge = async (p: SessionParticipant) => {
    try { await api.put(`/admin/participants/${p.id}`, { should_charge: p.should_charge === 1 ? 0 : 1 }); onChange(); }
    catch (e) { setErr(e instanceof ApiClientError ? e.message : 'Lỗi'); }
  };

  const remove = async (id: number) => {
    if (!confirm('Xóa người chơi này?')) return;
    try { await api.del(`/admin/participants/${id}`); onChange(); }
    catch (e) { setErr(e instanceof ApiClientError ? e.message : 'Lỗi'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">Người chơi ({participants.length})</h2>
        {!settled && (
          <div className="flex gap-2">
            <button className="btn-secondary text-xs h-8 px-3" onClick={() => { setShowAddMember(true); setShowAddGuest(false); }}>
              + Thành viên
            </button>
            <button className="btn-secondary text-xs h-8 px-3" onClick={() => { setShowAddGuest(true); setShowAddMember(false); }}>
              + Khách
            </button>
          </div>
        )}
      </div>

      {err && <p className="text-sm text-danger">{err}</p>}

      {showAddMember && (
        <AddMemberPicker
          sessionId={sessionId}
          members={members}
          existing={participants.map((p) => p.member_id).filter((id): id is number => id !== null)}
          onAdded={() => { setShowAddMember(false); onChange(); }}
          onClose={() => setShowAddMember(false)}
        />
      )}

      {showAddGuest && (
        <AddGuestForm
          sessionId={sessionId}
          onAdded={() => { setShowAddGuest(false); onChange(); }}
          onClose={() => setShowAddGuest(false)}
        />
      )}

      {pending.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted">Chờ duyệt ({pending.length})</h3>
          {pending.map((p) => (
            <div key={p.id} className="card flex items-center justify-between gap-2 py-3">
              <div>
                <div className="font-medium text-sm">{p.name}</div>
                {p.phone && <div className="text-xs text-muted">{p.phone}</div>}
                {p.note && <div className="text-xs text-muted italic">{p.note}</div>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button className="btn-primary text-xs h-7 px-2" onClick={() => approve(p.id)}>Duyệt</button>
                <button className="btn-ghost text-xs h-7 px-2 text-danger" onClick={() => reject(p.id)}>Từ chối</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-2">
          {active.map((p) => (
            <div key={p.id} className="card space-y-2 py-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium text-sm">{p.name}</div>
                  {p.phone && <div className="text-xs text-muted">{p.phone}</div>}
                </div>
                <span className="badge text-xs">{STATUS_LABEL[p.status]}</span>
              </div>

              {!settled && (
                <div className="flex flex-wrap gap-1">
                  {(['attended', 'absent', 'cancelled'] as ParticipantStatus[]).map((s) => (
                    <button
                      key={s}
                      className={`text-xs h-7 px-2 rounded-md border ${p.status === s ? 'bg-primary text-on-primary border-primary' : 'border-hairline bg-canvas text-ink'}`}
                      onClick={() => setStatus(p.id, s)}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                  <button
                    className={`text-xs h-7 px-2 rounded-md border ${p.should_charge === 1 ? 'bg-surface-card border-hairline text-ink' : 'border-hairline bg-canvas text-muted'}`}
                    onClick={() => toggleCharge(p)}
                  >
                    {p.should_charge === 1 ? 'Tính tiền' : 'Không tính'}
                  </button>
                  <button
                    className="text-xs h-7 px-2 rounded-md border border-hairline text-danger"
                    onClick={() => remove(p.id)}
                  >
                    Xóa
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {participants.length === 0 && (
        <p className="text-sm text-muted">Chưa có người chơi.</p>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

interface AddMemberPickerProps {
  sessionId: number;
  members: Member[];
  existing: number[];
  onAdded: () => void;
  onClose: () => void;
}

function AddMemberPicker({ sessionId, members, existing, onAdded, onClose }: AddMemberPickerProps) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const available = members.filter((m) => !existing.includes(m.id) && m.status === 'active');

  const add = async (memberId: number) => {
    setBusy(true);
    try {
      await api.post(`/admin/participants`, { session_id: sessionId, member_id: memberId, status: 'going' });
      onAdded();
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : 'Lỗi thêm thành viên');
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-2 border-primary">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Chọn thành viên</h3>
        <button className="text-xs text-muted" onClick={onClose}>Đóng</button>
      </div>
      {err && <p className="text-xs text-danger">{err}</p>}
      {available.length === 0 && <p className="text-xs text-muted">Không còn thành viên nào.</p>}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {available.map((m) => (
          <button
            key={m.id}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-card text-sm"
            disabled={busy}
            onClick={() => add(m.id)}
          >
            {m.name} {m.phone ? `· ${m.phone}` : ''} · Lv.{m.skill_level}
          </button>
        ))}
      </div>
    </div>
  );
}

interface AddGuestFormProps {
  sessionId: number;
  onAdded: () => void;
  onClose: () => void;
}

function AddGuestForm({ sessionId, onAdded, onClose }: AddGuestFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [skill, setSkill] = useState(0);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/admin/participants', {
        session_id: sessionId,
        name,
        phone: phone || null,
        skill_level: skill,
        note: note || null,
        status: 'going',
      });
      onAdded();
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : 'Lỗi thêm khách');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="card space-y-2 border-primary">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Thêm khách</h3>
        <button type="button" className="text-xs text-muted" onClick={onClose}>Đóng</button>
      </div>
      <input className="input" placeholder="Tên *" value={name} onChange={(e) => setName(e.target.value)} required />
      <input className="input" placeholder="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <input type="number" className="input" placeholder="Trình độ (0-5)" min={0} max={5} value={skill} onChange={(e) => setSkill(parseInt(e.target.value || '0', 10))} />
      <input className="input" placeholder="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} />
      {err && <p className="text-xs text-danger">{err}</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? 'Đang thêm…' : 'Thêm khách'}</button>
    </form>
  );
}
