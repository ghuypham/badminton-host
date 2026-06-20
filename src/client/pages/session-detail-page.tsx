// Session detail: Info + Courts + Players + Costs + Split + Payments sections.
import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, ApiClientError } from '../api/client.ts';
import { formatDate } from '../lib/format.ts';
import { SessionForm } from '../components/session-form.tsx';
import { CourtForm } from '../components/court-form.tsx';
import { ParticipantsSection } from '../components/participants-section.tsx';
import { CostsSection } from '../components/costs-section.tsx';
import { SplitSection } from '../components/split-section.tsx';
import { PaymentsSection } from '../components/payments-section.tsx';
import { Icon } from '../components/icon.tsx';
import type { Session, SessionCourt, SessionParticipant, CostItem } from '../../shared/types.ts';

interface SessionDetail {
  session: Session;
  courts: SessionCourt[];
  participants: SessionParticipant[];
  costItems: CostItem[];
  total: number;
  splitSummary: {
    chargeableCount: number;
    totalAmount: number;
    settledCount: number;
    pendingPaymentCount: number;
  };
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp',
  open: 'Đang mở',
  settled: 'Đã quyết toán',
};

const STATUS_BADGE: Record<string, string> = {
  draft: 'badge',
  open: 'badge-primary',
  settled: 'badge-success',
};

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showEditSession, setShowEditSession] = useState(false);
  const [showAddCourt, setShowAddCourt] = useState(false);
  const [editCourt, setEditCourt] = useState<SessionCourt | null>(null);
  const [paymentsKey, setPaymentsKey] = useState(0);
  const [err, setErr] = useState('');

  const sessionId = parseInt(id ?? '0', 10);

  const load = useCallback(() => {
    api
      .get<SessionDetail>(`/admin/sessions/${sessionId}`)
      .then(setDetail)
      .catch((e) => {
        if (e instanceof ApiClientError && e.status === 404) setNotFound(true);
      });
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  const handleChange = () => {
    load();
    setPaymentsKey((k) => k + 1);
  };

  if (notFound) {
    return (
      <div className="space-y-3">
        <button className="btn-ghost btn-sm -ml-2" onClick={() => navigate('/sessions')}>
          <Icon name="arrowLeft" size={16} /> Danh sách
        </button>
        <p className="text-danger">Không tìm thấy buổi đánh.</p>
      </div>
    );
  }

  if (!detail) return <p className="text-muted">Đang tải…</p>;

  const { session, courts, participants, costItems, total } = detail;
  const settled = session.status === 'settled';
  const publicUrl = `${window.location.origin}/s/${session.public_token}`;

  const toggleRegistration = async () => {
    try {
      await api.put(`/admin/sessions/${sessionId}/registration`, {
        enabled: session.registration_enabled === 1 ? 0 : 1,
      });
      load();
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : 'Lỗi');
    }
  };

  const deleteCourt = async (courtId: number) => {
    if (!confirm('Xóa sân này?')) return;
    try {
      await api.del(`/admin/sessions/${sessionId}/courts/${courtId}`);
      load();
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : 'Lỗi xóa sân');
    }
  };

  const deleteSession = async () => {
    if (!confirm('Xóa buổi đánh này?')) return;
    try {
      await api.del(`/admin/sessions/${sessionId}`);
      navigate('/sessions');
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : 'Lỗi xóa buổi');
    }
  };

  return (
    <div className="space-y-6">
      {/* Back */}
      <button className="btn-ghost btn-sm -ml-2" onClick={() => navigate('/sessions')}>
        <Icon name="arrowLeft" size={16} /> Danh sách
      </button>

      {err && <p className="text-sm text-danger">{err}</p>}

      {/* ── Info ── */}
      <section className="card space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="page-title leading-tight">{session.title}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted">
              {session.session_date && (
                <span className="flex items-center gap-1">
                  <Icon name="calendar" size={14} />
                  {formatDate(session.session_date)}
                </span>
              )}
              {session.location && (
                <span className="flex items-center gap-1">
                  <Icon name="mapPin" size={14} />
                  {session.location}
                </span>
              )}
            </div>
          </div>
          <span className={STATUS_BADGE[session.status] ?? 'badge'}>
            {STATUS_LABEL[session.status] ?? session.status}
          </span>
        </div>

        {session.private_note && (
          <p className="text-sm text-muted italic">{session.private_note}</p>
        )}

        {/* Action row */}
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary btn-sm" onClick={() => setShowEditSession(true)}>
            <Icon name="pencil" size={15} /> Sửa thông tin
          </button>
          <button
            className={`btn-sm ${session.registration_enabled === 1 ? 'btn-primary' : 'btn-secondary'}`}
            onClick={toggleRegistration}
          >
            Đăng ký: {session.registration_enabled === 1 ? 'Đang mở' : 'Đóng'}
          </button>
          <button className="btn-danger btn-sm" onClick={deleteSession}>
            <Icon name="trash" size={15} /> Xóa buổi
          </button>
        </div>

        {/* Public link */}
        <div className="rounded-lg bg-surface-sunken px-3 py-2.5 space-y-1">
          <div className="text-xs text-muted font-medium">Link đăng ký công khai</div>
          <div className="flex items-center gap-2">
            <span className="text-xs break-all text-ink flex-1">{publicUrl}</span>
            <button
              className="btn-ghost btn-sm shrink-0"
              onClick={() => navigator.clipboard.writeText(publicUrl)}
            >
              <Icon name="copy" size={15} /> Copy
            </button>
          </div>
        </div>
      </section>

      {/* ── Courts ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Sân</h2>
          {!settled && (
            <button
              className="btn-secondary btn-sm"
              onClick={() => { setShowAddCourt(true); setEditCourt(null); }}
            >
              <Icon name="plus" size={16} /> Thêm sân
            </button>
          )}
        </div>

        {courts.length === 0 && (
          <p className="text-sm text-muted">Chưa có sân.</p>
        )}

        <div className="space-y-2">
          {courts.map((c) => (
            <div key={c.id} className="row">
              <span className="avatar">
                <Icon name="mapPin" size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{c.name}</div>
                {(c.start_time || c.end_time) && (
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <Icon name="clock" size={12} />
                    {c.start_time ?? '?'} – {c.end_time ?? '?'}
                  </div>
                )}
              </div>
              <span className="text-sm font-semibold tnum shrink-0">
                {c.cost.toLocaleString('vi-VN')}đ
              </span>
              {!settled && (
                <div className="flex gap-0.5 shrink-0">
                  <button
                    className="icon-btn"
                    aria-label="Sửa sân"
                    onClick={() => { setEditCourt(c); setShowAddCourt(true); }}
                  >
                    <Icon name="pencil" size={16} />
                  </button>
                  <button
                    className="icon-btn-danger"
                    aria-label="Xóa sân"
                    onClick={() => deleteCourt(c.id)}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Players ── */}
      <section>
        <ParticipantsSection
          sessionId={sessionId}
          participants={participants}
          onChange={handleChange}
          settled={settled}
        />
      </section>

      {/* ── Costs ── */}
      <section>
        <CostsSection
          sessionId={sessionId}
          courts={courts}
          costItems={costItems}
          total={total}
          manualTotal={session.manual_total ?? null}
          settled={settled}
          onChange={handleChange}
        />
      </section>

      {/* ── Split ── */}
      <section>
        <SplitSection
          sessionId={sessionId}
          participants={participants}
          total={session.manual_total ?? total}
          onChange={handleChange}
        />
      </section>

      {/* ── Payments ── */}
      <section>
        <PaymentsSection sessionId={sessionId} refreshKey={paymentsKey} />
      </section>

      {/* Modals */}
      {showEditSession && (
        <SessionForm
          initial={session}
          onSaved={() => { setShowEditSession(false); load(); }}
          onClose={() => setShowEditSession(false)}
        />
      )}
      {showAddCourt && (
        <CourtForm
          sessionId={sessionId}
          initial={editCourt}
          onSaved={() => { setShowAddCourt(false); setEditCourt(null); load(); }}
          onClose={() => { setShowAddCourt(false); setEditCourt(null); }}
        />
      )}
    </div>
  );
}
