// Participants section for session-detail-page: list by status, add member/guest, approve/reject, attendance + charge toggle.
import { useEffect, useState } from 'react';
import { api, ApiClientError } from '../api/client.ts';
import { Icon } from './icon.tsx';
import { SKILL_LEVELS, skillLabel } from '../lib/skill-levels.ts';
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

// Maps attendance status to badge style
const STATUS_BADGE: Record<string, string> = {
  attended: 'badge-success',
  absent: 'badge',
  going: 'badge-primary',
  cancelled: 'badge',
  rejected: 'badge',
};

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(-2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

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

  // Approve payer; if payer has followers use ?group=1 for atomic server-side approval.
  const approve = async (id: number, hasFollowers: boolean = false) => {
    try {
      await api.post(`/admin/participants/${id}/approve${hasFollowers ? '?group=1' : ''}`);
      onChange();
    } catch (e) { setErr(e instanceof ApiClientError ? e.message : 'Lỗi'); }
  };

  // Reject payer; server uses ?group=1 to also reject pending followers atomically
  const reject = async (id: number, hasFollowers: boolean = false) => {
    try {
      await api.post(`/admin/participants/${id}/reject${hasFollowers ? '?group=1' : ''}`);
      onChange();
    } catch (e) { setErr(e instanceof ApiClientError ? e.message : 'Lỗi'); }
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
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="section-title">Người chơi ({participants.length})</h2>
        {!settled && (
          <div className="flex gap-2">
            <button
              className="btn-secondary btn-sm"
              onClick={() => { setShowAddMember(true); setShowAddGuest(false); }}
            >
              <Icon name="plus" size={16} /> Thành viên
            </button>
            <button
              className="btn-secondary btn-sm"
              onClick={() => { setShowAddGuest(true); setShowAddMember(false); }}
            >
              <Icon name="plus" size={16} /> Khách
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

      {/* Pending approval queue — group payers with their followers */}
      {pending.length > 0 && (() => {
        const pendingPayers = pending.filter((p) => p.paid_by === null);
        const pendingFollowersByPayer = new Map<number, SessionParticipant[]>();
        for (const p of pending) {
          if (p.paid_by !== null) {
            const list = pendingFollowersByPayer.get(p.paid_by) ?? [];
            list.push(p);
            pendingFollowersByPayer.set(p.paid_by, list);
          }
        }
        const pendingOrphans = pending.filter(
          (p) => p.paid_by !== null && !pendingFollowersByPayer.has(p.paid_by ?? -1),
        );

        const renderPendingCard = (
          p: SessionParticipant,
          isFollower: boolean,
          hasFollowers: boolean,
        ) => (
          <div key={p.id} className={`card flex items-center gap-3 ${isFollower ? 'ml-6 border-l-2 border-primary/30' : ''}`}>
            <span className="avatar">{initials(p.name)}</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{p.name}</div>
              {p.phone && <div className="text-xs text-muted">{p.phone}</div>}
              {p.note && <div className="text-xs text-muted italic">{p.note}</div>}
              {isFollower && <div className="text-xs text-muted italic">đi cùng nhóm</div>}
            </div>
            {/* Only payer gets approve/reject buttons; ?group=1 handles followers atomically */}
            {!isFollower && (
              <div className="flex gap-1.5 shrink-0">
                <button className="btn-primary btn-sm" onClick={() => approve(p.id, hasFollowers)}>
                  <Icon name="check" size={14} /> Duyệt{hasFollowers ? ' nhóm' : ''}
                </button>
                <button className="btn-danger btn-sm" onClick={() => reject(p.id, hasFollowers)}>
                  <Icon name="x" size={14} /> Từ chối{hasFollowers ? ' nhóm' : ''}
                </button>
              </div>
            )}
          </div>
        );

        return (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide">
              Chờ duyệt ({pending.length})
            </p>
            {pendingPayers.map((p) => {
              const followers = pendingFollowersByPayer.get(p.id) ?? [];
              return (
                <div key={p.id} className="space-y-1">
                  {renderPendingCard(p, false, followers.length > 0)}
                  {followers.map((f) => renderPendingCard(f, true, false))}
                </div>
              );
            })}
            {pendingOrphans.map((p) => renderPendingCard(p, false, false))}
          </div>
        );
      })()}

      {/* Active participants list — payers first, followers indented under their payer */}
      {active.length > 0 && (() => {
        // Separate payers (paid_by === null) and followers (paid_by !== null)
        const payers = active.filter((p) => p.paid_by === null);
        const followersByPayer = new Map<number, SessionParticipant[]>();
        for (const p of active) {
          if (p.paid_by !== null) {
            const list = followersByPayer.get(p.paid_by) ?? [];
            list.push(p);
            followersByPayer.set(p.paid_by, list);
          }
        }
        // Participants with no payer in active list (edge: payer not yet approved / deleted)
        const orphans = active.filter(
          (p) => p.paid_by !== null && !followersByPayer.has(p.paid_by ?? -1),
        );

        const renderParticipantCard = (p: SessionParticipant, isFollower = false) => (
          <div key={p.id} className={`card space-y-3 ${isFollower ? 'ml-6 border-l-2 border-primary/30' : ''}`}>
            {/* Name row */}
            <div className="flex items-center gap-3">
              <span className={`avatar ${isFollower ? 'h-7 w-7 text-xs' : ''}`}>{initials(p.name)}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{p.name}</div>
                {p.phone && <div className="text-xs text-muted">{p.phone}</div>}
                {isFollower && (
                  <div className="text-xs text-muted italic">đi cùng nhóm</div>
                )}
              </div>
              <span className={STATUS_BADGE[p.status] ?? 'badge'}>
                {STATUS_LABEL[p.status]}
              </span>
              {!settled && (
                <button
                  className="icon-btn-danger"
                  aria-label="Xóa"
                  onClick={() => remove(p.id)}
                >
                  <Icon name="trash" size={16} />
                </button>
              )}
            </div>

            {/* Attendance + charge chips */}
            {!settled && (
              <div className="flex flex-wrap gap-1.5">
                {(['attended', 'absent', 'cancelled'] as ParticipantStatus[]).map((s) => (
                  <button
                    key={s}
                    className={`chip ${p.status === s ? 'chip-active' : ''}`}
                    onClick={() => setStatus(p.id, s)}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
                {/* Charge toggle chip */}
                <button
                  className={`chip ${p.should_charge === 1 ? 'chip-active' : ''}`}
                  onClick={() => toggleCharge(p)}
                >
                  {p.should_charge === 1 ? 'Tính tiền' : 'Không tính'}
                </button>
              </div>
            )}
          </div>
        );

        return (
          <div className="space-y-2">
            {payers.map((p) => (
              <div key={p.id} className="space-y-1">
                {renderParticipantCard(p, false)}
                {(followersByPayer.get(p.id) ?? []).map((f) => renderParticipantCard(f, true))}
              </div>
            ))}
            {/* Orphans: followers whose payer is not in the active list */}
            {orphans.map((p) => renderParticipantCard(p, false))}
          </div>
        );
      })()}

      {/* Empty state */}
      {participants.length === 0 && (
        <div className="card flex flex-col items-center text-center py-10 gap-3">
          <span className="flex items-center justify-center h-14 w-14 rounded-full bg-surface-sunken text-muted">
            <Icon name="users" size={26} />
          </span>
          <p className="text-sm text-muted">Chưa có người chơi.</p>
        </div>
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
    <div className="card space-y-3 border-primary">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Chọn thành viên</h3>
        <button className="icon-btn" aria-label="Đóng" onClick={onClose}>
          <Icon name="x" size={16} />
        </button>
      </div>
      {err && <p className="text-xs text-danger">{err}</p>}
      {available.length === 0 && (
        <p className="text-sm text-muted">Không còn thành viên nào.</p>
      )}
      <div className="space-y-1 max-h-48 overflow-y-auto -mx-1">
        {available.map((m) => (
          <button
            key={m.id}
            className="w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-lg hover:bg-surface-sunken transition-colors"
            disabled={busy}
            onClick={() => add(m.id)}
          >
            <span className="avatar h-8 w-8 text-xs shrink-0">{m.name.trim()[0]?.toUpperCase() ?? '?'}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium truncate">{m.name}</span>
              <span className="text-xs text-muted">{m.phone ? `${m.phone} · ` : ''}{skillLabel(m.skill_level)}</span>
            </span>
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
    <form onSubmit={onSubmit} className="card space-y-3 border-primary">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Thêm khách</h3>
        <button type="button" className="icon-btn" aria-label="Đóng" onClick={onClose}>
          <Icon name="x" size={16} />
        </button>
      </div>
      <div>
        <label className="label">Tên *</label>
        <input className="input" placeholder="Nguyễn Văn A" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="label">Số điện thoại</label>
        <input className="input" placeholder="09xx…" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div>
        <label className="label">Trình độ</label>
        <select className="input" value={skill} onChange={(e) => setSkill(parseInt(e.target.value, 10))}>
          {SKILL_LEVELS.map((label, i) => (
            <option key={i} value={i}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Ghi chú</label>
        <input className="input" placeholder="Thông tin thêm…" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {err && <p className="text-xs text-danger">{err}</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? 'Đang thêm…' : 'Thêm khách'}
      </button>
    </form>
  );
}
