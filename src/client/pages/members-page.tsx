// Members page: list + search + filter + create/edit modal + soft-delete + member detail with history.
import { useEffect, useState } from 'react';
import { api, ApiClientError } from '../api/client.ts';
import { formatDate, formatVnd } from '../lib/format.ts';
import { MemberForm } from '../components/member-form.tsx';
import type { Member, MemberType } from '../../shared/types.ts';

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
        <h1 className="text-2xl">Thành viên</h1>
        <button className="btn-primary" onClick={() => { setEditMember(null); setShowForm(true); }}>
          + Thêm
        </button>
      </div>

      {/* Search */}
      <input
        className="input"
        placeholder="Tìm tên hoặc số điện thoại…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {(['', 'fixed', 'guest'] as const).map((t) => (
          <button
            key={t}
            className={`text-xs h-7 px-3 rounded-full border ${filterType === t ? 'bg-primary text-on-primary border-primary' : 'border-hairline bg-canvas'}`}
            onClick={() => setFilterType(t)}
          >
            {t === '' ? 'Tất cả' : t === 'fixed' ? 'Cố định' : 'Khách'}
          </button>
        ))}
        <select
          className="text-xs h-7 px-2 rounded-full border border-hairline bg-canvas"
          value={filterSkill}
          onChange={(e) => setFilterSkill(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
        >
          <option value="">Trình độ: tất cả</option>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>Lv.{n}</option>
          ))}
        </select>
      </div>

      {err && <p className="text-sm text-danger">{err}</p>}

      {/* List */}
      <div className="space-y-2">
        {members.length === 0 && <p className="text-sm text-muted">Không có thành viên.</p>}
        {members.map((m) => (
          <div key={m.id} className="card flex items-center justify-between gap-2">
            <button className="flex-1 text-left" onClick={() => openDetail(m)}>
              <div className="font-medium">{m.name}</div>
              <div className="text-xs text-muted">
                {m.phone ?? '—'} · {m.member_type === 'fixed' ? 'Cố định' : 'Khách'} · Lv.{m.skill_level}
              </div>
            </button>
            <div className="flex gap-1 shrink-0">
              <button
                className="btn-ghost text-xs h-7 px-2"
                onClick={() => { setEditMember(m); setShowForm(true); }}
              >
                Sửa
              </button>
              <button
                className="btn-ghost text-xs h-7 px-2 text-danger"
                onClick={() => deleteMember(m)}
              >
                Xóa
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
      <div className="flex items-center gap-3">
        <button className="text-sm text-muted hover:text-ink" onClick={onBack}>← Danh sách</button>
      </div>

      <div className="card space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl">{member.name}</h1>
            <div className="text-sm text-muted">
              {member.phone ?? '—'} · {member.member_type === 'fixed' ? 'Cố định' : 'Khách'} · Lv.{member.skill_level}
            </div>
            {member.note && <div className="text-sm text-muted italic mt-1">{member.note}</div>}
          </div>
          <button className="btn-secondary text-xs" onClick={onEdit}>Sửa</button>
        </div>

        {totalDebt > 0 && (
          <div className="rounded-md bg-danger/10 px-3 py-2">
            <span className="text-sm text-danger font-medium">Công nợ: {formatVnd(totalDebt)}</span>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg mb-2">Lịch sử tham gia</h2>
        {loading && <p className="text-sm text-muted">Đang tải…</p>}
        {!loading && history.length === 0 && <p className="text-sm text-muted">Chưa tham gia buổi nào.</p>}
        <div className="space-y-2">
          {history.map((h) => (
            <div key={h.id} className="card py-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-sm">{h.title}</div>
                  <div className="text-xs text-muted">{formatDate(h.session_date)}</div>
                </div>
                <div className="text-right">
                  {h.should_charge === 1 && (
                    <div className="text-sm font-medium">{formatVnd(h.final_amount)}</div>
                  )}
                  <span className="badge text-xs">{h.payment_status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
