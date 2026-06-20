// Members page: list + search + filter + create/edit modal + soft-delete + member detail with history.
import { useEffect, useState } from 'react';
import { api, ApiClientError } from '../api/client.ts';
import { formatDate, formatVnd } from '../lib/format.ts';
import { MemberForm } from '../components/member-form.tsx';
import { Icon } from '../components/icon.tsx';
import { SKILL_LEVELS, skillLabel } from '../lib/skill-levels.ts';
import type { Member, MemberType } from '../../shared/types.ts';

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(-2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

interface HistoryRow {
  id: number;
  session_id: number;
  title: string;
  session_date: string;
  session_status: string;
  status: string;
  should_charge: number;
  final_amount: number;
  payment_status: string;
  paid_amount: number;
}

export function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<MemberType | ''>('');
  const [filterSkill, setFilterSkill] = useState<number | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [detailMember, setDetailMember] = useState<Member | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [err, setErr] = useState('');

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterType) params.set('member_type', filterType);
    if (filterSkill !== '') params.set('skill_level', String(filterSkill));
    api
      .get<Member[]>(`/admin/members?${params}`)
      .then(setMembers)
      .catch(() => setMembers([]));
  };

  useEffect(() => { load(); }, [search, filterType, filterSkill]); // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = async (m: Member) => {
    setDetailMember(m);
    setLoadingHistory(true);
    try {
      const h = await api.get<HistoryRow[]>(`/admin/members/${m.id}/history`);
      setHistory(h);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const deleteMember = async (m: Member) => {
    if (!confirm(`Xóa thành viên "${m.name}"?`)) return;
    try {
      await api.del(`/admin/members/${m.id}`);
      load();
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : 'Lỗi xóa');
    }
  };

  if (detailMember) {
    return (
      <MemberDetail
        member={detailMember}
        history={history}
        loading={loadingHistory}
        onBack={() => { setDetailMember(null); load(); }}
        onEdit={() => { setEditMember(detailMember); setShowForm(true); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Thành viên</h1>
        <button className="btn-primary btn-sm" onClick={() => { setEditMember(null); setShowForm(true); }}>
          <Icon name="plus" size={16} /> Thêm
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className="input pl-10"
          placeholder="Tìm tên hoặc số điện thoại…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {(['', 'fixed', 'guest'] as const).map((t) => (
          <button
            key={t}
            className={`chip ${filterType === t ? 'chip-active' : ''}`}
            onClick={() => setFilterType(t)}
          >
            {t === '' ? 'Tất cả' : t === 'fixed' ? 'Cố định' : 'Khách'}
          </button>
        ))}
        <select
          className="chip"
          value={filterSkill}
          onChange={(e) => setFilterSkill(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
        >
          <option value="">Trình độ: tất cả</option>
          {SKILL_LEVELS.map((label, i) => (
            <option key={i} value={i}>{label}</option>
          ))}
        </select>
      </div>

      {err && <p className="text-sm text-danger">{err}</p>}

      {/* List */}
      <div className="space-y-2">
        {members.length === 0 && (
          <div className="card flex flex-col items-center text-center py-10 gap-3">
            <span className="flex items-center justify-center h-14 w-14 rounded-full bg-surface-sunken text-muted">
              <Icon name="users" size={26} />
            </span>
            <p className="text-sm text-muted">Không có thành viên.</p>
          </div>
        )}
        {members.map((m) => (
          <div key={m.id} className="row">
            <span className="avatar">{initials(m.name)}</span>
            <button className="flex-1 min-w-0 text-left" onClick={() => openDetail(m)}>
              <div className="font-semibold truncate">{m.name}</div>
              <div className="text-xs text-muted truncate">
                {m.phone ?? '—'} · {m.member_type === 'fixed' ? 'Cố định' : 'Khách'} · {skillLabel(m.skill_level)}
              </div>
            </button>
            <div className="flex gap-0.5 shrink-0">
              <button
                className="icon-btn"
                aria-label="Sửa"
                onClick={() => { setEditMember(m); setShowForm(true); }}
              >
                <Icon name="pencil" size={18} />
              </button>
              <button
                className="icon-btn-danger"
                aria-label="Xóa"
                onClick={() => deleteMember(m)}
              >
                <Icon name="trash" size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <MemberForm
          initial={editMember}
          onSaved={() => { setShowForm(false); setEditMember(null); load(); }}
          onClose={() => { setShowForm(false); setEditMember(null); }}
        />
      )}
    </div>
  );
}

// ── Member detail view ───────────────────────────────────────────────────────

interface DetailProps {
  member: Member;
  history: HistoryRow[];
  loading: boolean;
  onBack: () => void;
  onEdit: () => void;
}

function MemberDetail({ member, history, loading, onBack, onEdit }: DetailProps) {
  const totalDebt = history
    .filter((h) => h.payment_status === 'unpaid' || h.payment_status === 'partial')
    .reduce((s, h) => s + (h.final_amount - h.paid_amount), 0);

  return (
    <div className="space-y-4">
      <button className="btn-ghost btn-sm -ml-2" onClick={onBack}>
        <Icon name="arrowLeft" size={16} /> Danh sách
      </button>

      <div className="card space-y-3">
        <div className="flex items-start gap-3">
          <span className="avatar h-12 w-12 text-base">{initials(member.name)}</span>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl leading-tight">{member.name}</h1>
            <div className="text-sm text-muted">
              {member.phone ?? '—'} · {member.member_type === 'fixed' ? 'Cố định' : 'Khách'} · {skillLabel(member.skill_level)}
            </div>
            {member.note && <div className="text-sm text-muted italic mt-1">{member.note}</div>}
          </div>
          <button className="btn-secondary btn-sm shrink-0" onClick={onEdit}>
            <Icon name="pencil" size={15} /> Sửa
          </button>
        </div>

        {totalDebt > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-danger-soft px-3 py-2.5">
            <Icon name="wallet" size={18} className="text-danger" />
            <span className="text-sm text-danger font-semibold tnum">Công nợ: {formatVnd(totalDebt)}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="section-title">Lịch sử tham gia</h2>
        {loading && <p className="text-sm text-muted">Đang tải…</p>}
        {!loading && history.length === 0 && <p className="text-sm text-muted">Chưa tham gia buổi nào.</p>}
        {history.map((h) => (
          <div key={h.id} className="card flex justify-between items-start gap-2">
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{h.title}</div>
              <div className="text-xs text-muted">{formatDate(h.session_date)}</div>
            </div>
            <div className="text-right shrink-0">
              {h.should_charge === 1 && (
                <div className="text-sm font-semibold tnum">{formatVnd(h.final_amount)}</div>
              )}
              <PaymentBadge status={h.payment_status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    paid: ['badge-success', 'Đã trả'],
    partial: ['badge-warning', 'Một phần'],
    unpaid: ['badge-danger', 'Chưa trả'],
    needs_review: ['badge-warning', 'Cần kiểm'],
  };
  const [cls, label] = map[status] ?? ['badge', status];
  return <span className={cls}>{label}</span>;
}
