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
        <button className="text-sm text-muted" onClick={() => navigate('/sessions')}>← Danh sách</button>
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
      <button className="text-sm text-muted" onClick={() => navigate('/sessions')}>← Danh sách</button>

      {err && <p className="text-sm text-danger">{err}</p>}

      {/* ── Info ── */}
      <section className="card space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl">{session.title}</h1>
            <div className="text-sm text-muted">
              {formatDate(session.session_date)}{session.location ? ` · ${session.location}` : ''}
            </div>
          </div>
          <span className="badge">{STATUS_LABEL[session.status] ?? session.status}</span>
        </div>

        {session.private_note && (
          <p className="text-sm text-muted italic">{session.private_note}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary text-xs h-8 px-3" onClick={() => setShowEditSession(true)}>
            Sửa thông tin
          </button>
          <button
            className={`text-xs h-8 px-3 rounded-md border font-medium ${session.registration_enabled === 1 ? 'bg-primary text-on-primary border-primary' : 'border-hairline bg-canvas text-ink'}`}
            onClick={toggleRegistration}
          >
            Đăng ký: {session.registration_enabled === 1 ? 'Đang mở' : 'Đóng'}
          </button>
          <button
            className="btn-ghost text-xs h-8 px-3 text-danger"
            onClick={deleteSession}
          >
            Xóa buổi
          </button>
        </div>

        {/* Public link */}
        <div className="rounded-md bg-surface-card px-3 py-2 space-y-1">
          <div className="text-xs text-muted">Link đăng ký công khai</div>
          <div className="flex items-center gap-2">
            <span className="text-xs break-all text-ink">{publicUrl}</span>
            <button
              className="btn-ghost text-xs h-7 px-2 shrink-0"
              onClick={() => navigator.clipboard.writeText(publicUrl)}
            >
              Copy
            </button>
          </div>
        </div>
      </section>

      {/* ── Courts ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg">Sân</h2>
          {!settled && (
            <button className="btn-secondary text-xs h-8 px-3" onClick={() => { setShowAddCourt(true); setEditCourt(null); }}>
              + Thêm sân
            </button>
          )}
        </div>

        {courts.length === 0 && <p className="text-sm text-muted">Chưa có sân.</p>}
        <div className="space-y-2">
          {courts.map((c) => (
            <div key={c.id} className="card flex items-center justify-between gap-2 py-3">
              <div>
                <div className="font-medium text-sm">{c.name}</div>
                {(c.start_time || c.end_time) && (
                  <div className="text-xs text-muted">{c.start_time ?? '?'} – {c.end_time ?? '?'}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{c.cost.toLocaleString('vi-VN')}đ</span>
                {!settled && (
                  <>
                    <button className="text-xs text-muted hover:text-ink" onClick={() => { setEditCourt(c); setShowAddCourt(true); }}>Sửa</button>
                    <button className="text-xs text-danger" onClick={() => deleteCourt(c.id)}>Xóa</button>
                  </>
                )}
              </div>
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
