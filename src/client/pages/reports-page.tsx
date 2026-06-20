// Trang báo cáo & thống kê: finance, buổi đánh, thành viên, lịch sử thanh toán.
import { useEffect, useState } from 'react';
import { api } from '../api/client.ts';
import { formatVnd, formatDate } from '../lib/format.ts';
import { Icon } from '../components/icon.tsx';
import { ShareBillButton } from '../components/share-bill-button.tsx';

// ── Types (mirrors backend ReportResult) ─────────────────────────────────────

interface FinanceStats {
  totalCollected: number;
  totalOutstanding: number;
  totalSessionCost: number;
  totalPending: number;
}

interface SessionBreakdown {
  session_id: number;
  session_date: string;
  title: string;
  participant_count: number;
  session_total: number;
  collected: number;
  outstanding: number;
}

interface SessionsStats {
  totalSessions: number;
  totalParticipations: number;
  avgRevenuePerSession: number;
  breakdown: SessionBreakdown[];
}

interface MemberRankEntry {
  member_id: number | null;
  name: string;
  count: number;
  amount: number;
}

interface AttendanceEntry {
  member_id: number;
  name: string;
  attended: number;
  absent: number;
  total: number;
}

interface MembersStats {
  topParticipants: MemberRankEntry[];
  topDebtors: MemberRankEntry[];
  attendanceRates: AttendanceEntry[];
}

interface PaymentHistoryEntry {
  participant_id: number;
  name: string;
  session_id: number;
  session_title: string;
  session_date: string;
  paid_amount: number;
  payment_status: string;
  updated_at: string;
}

interface ReportData {
  finance: FinanceStats;
  sessions: SessionsStats;
  members: MembersStats;
  payments: PaymentHistoryEntry[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(-2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

// ── Main page ─────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = (f: string, t: string) => {
    setLoading(true);
    setErr('');
    const params = new URLSearchParams();
    if (f) params.set('from', f);
    if (t) params.set('to', t);
    const qs = params.toString();
    api
      .get<ReportData>(`/admin/reports${qs ? `?${qs}` : ''}`)
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setErr(e?.message ?? 'Lỗi tải báo cáo'); setLoading(false); });
  };

  // Initial load — no filter
  useEffect(() => { load('', ''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = () => load(from, to);

  const handleClear = () => {
    setFrom('');
    setTo('');
    load('', '');
  };

  return (
    <div className="space-y-6">
      <h1 className="page-title">Báo cáo</h1>

      {/* Date range filter */}
      <div className="card space-y-3">
        <h2 className="section-title">Lọc theo khoảng thời gian</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <label className="label">Từ ngày</label>
            <input
              type="date"
              className="input"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <label className="label">Đến ngày</label>
            <input
              type="date"
              className="input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary btn-sm" onClick={handleApply}>
            Áp dụng
          </button>
          {(from || to) && (
            <button className="btn-ghost btn-sm" onClick={handleClear}>
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      {/* Share participation report block */}
      <ReportShareSection />

      {err && <p className="text-sm text-danger">{err}</p>}

      {loading && <p className="text-sm text-muted">Đang tải…</p>}

      {!loading && data && (
        <>
          <FinanceSection stats={data.finance} />
          <SessionsSection stats={data.sessions} />
          <MembersSection stats={data.members} />
          <PaymentsSection payments={data.payments} />
        </>
      )}
    </div>
  );
}

// ── Report share section ──────────────────────────────────────────────────────

type RangePreset = 'all' | 'month' | 'custom';

interface ShareState {
  enabled: boolean;
  token: string | null;
  show_guests: boolean;
}

// Compute first and last day of current month in ICT (Asia/Ho_Chi_Minh)
function currentMonthRange(): { from: string; to: string } {
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }),
  );
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const pad = (n: number) => String(n).padStart(2, '0');
  const from = `${year}-${pad(month + 1)}-01`;
  // Last day: day 0 of next month = last day of this month
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${pad(month + 1)}-${pad(lastDay)}`;
  return { from, to };
}

// Build the shareable URL from the current share state + chosen range
function buildShareUrl(token: string, preset: RangePreset, customFrom: string, customTo: string): string {
  const base = `${window.location.origin}/r/${token}`;
  if (preset === 'all') return base;
  const qs = new URLSearchParams();
  if (preset === 'month') {
    const { from, to } = currentMonthRange();
    qs.set('from', from);
    qs.set('to', to);
  } else {
    if (customFrom) qs.set('from', customFrom);
    if (customTo) qs.set('to', customTo);
  }
  const str = qs.toString();
  return str ? `${base}?${str}` : base;
}

function ReportShareSection() {
  const [share, setShare] = useState<ShareState | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [toggling, setToggling] = useState(false);
  // Range state
  const [preset, setPreset] = useState<RangePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => {
    api
      .get<ShareState>('/admin/report-share')
      .then(setShare)
      .catch((e) => setLoadErr(e?.message ?? 'Lỗi tải trạng thái chia sẻ'));
  }, []);

  const enableShare = async () => {
    setToggling(true);
    try {
      const s = await api.put<ShareState>('/admin/report-share/enable', { enabled: true });
      setShare(s);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Lỗi bật chia sẻ';
      setLoadErr(msg);
    } finally {
      setToggling(false);
    }
  };

  const toggleGuests = async () => {
    if (!share) return;
    setToggling(true);
    try {
      const s = await api.put<ShareState>('/admin/report-share/guests', { show: !share.show_guests });
      setShare(s);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Lỗi cập nhật';
      setLoadErr(msg);
    } finally {
      setToggling(false);
    }
  };

  if (loadErr) {
    return (
      <div className="card space-y-2">
        <h2 className="section-title">Chia sẻ báo cáo tham gia</h2>
        <p className="text-sm text-danger">{loadErr}</p>
      </div>
    );
  }

  if (!share) {
    return (
      <div className="card space-y-2">
        <h2 className="section-title">Chia sẻ báo cáo tham gia</h2>
        <p className="text-sm text-muted">Đang tải…</p>
      </div>
    );
  }

  const shareUrl = share.enabled && share.token
    ? buildShareUrl(share.token, preset, customFrom, customTo)
    : null;

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="section-title mb-0">Chia sẻ báo cáo tham gia</h2>
        {share.enabled && (
          <button
            type="button"
            className="btn-ghost btn-sm text-danger"
            onClick={async () => {
              setToggling(true);
              try {
                const s = await api.put<ShareState>('/admin/report-share/enable', { enabled: false });
                setShare(s);
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'Lỗi';
                setLoadErr(msg);
              } finally {
                setToggling(false);
              }
            }}
            disabled={toggling}
          >
            Tắt
          </button>
        )}
      </div>

      {!share.enabled ? (
        /* Disabled state: show enable button */
        <div className="space-y-2">
          <p className="text-sm text-muted">
            Báo cáo tham gia chưa được chia sẻ. Bật để tạo link công khai (chỉ hiển thị số buổi tham gia, không có tiền).
          </p>
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={enableShare}
            disabled={toggling}
          >
            <Icon name="share" size={15} />
            Bật chia sẻ
          </button>
        </div>
      ) : (
        /* Enabled state: show controls */
        <div className="space-y-4">
          {/* Show guests toggle */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Hiển thị khách vãng lai</div>
              <div className="text-xs text-muted">Thêm mục "Khách vãng lai" vào báo cáo</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={share.show_guests}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none disabled:opacity-50 ${share.show_guests ? 'bg-primary' : 'bg-surface-sunken'}`}
              onClick={toggleGuests}
              disabled={toggling}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${share.show_guests ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Time range selector */}
          <div className="space-y-2">
            <div className="text-sm font-semibold">Khoảng thời gian</div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'month', 'custom'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`chip ${preset === p ? 'chip-active' : ''}`}
                  onClick={() => setPreset(p)}
                >
                  {p === 'all' ? 'Tất cả' : p === 'month' ? 'Tháng này' : 'Tùy chọn'}
                </button>
              ))}
            </div>

            {preset === 'custom' && (
              <div className="flex flex-wrap gap-3 pt-1">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <label className="label">Từ ngày</label>
                  <input
                    type="date"
                    className="input"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <label className="label">Đến ngày</label>
                  <input
                    type="date"
                    className="input"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Share URL display + copy/share */}
          {shareUrl && (
            <div className="space-y-2">
              <div className="text-xs text-muted break-all bg-surface-sunken rounded-lg px-3 py-2 font-mono select-all">
                {shareUrl}
              </div>
              <ShareBillButton billUrl={shareUrl} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Finance section ───────────────────────────────────────────────────────────

function FinanceSection({ stats }: { stats: FinanceStats }) {
  return (
    <section className="space-y-3">
      <h2 className="section-title">Tài chính</h2>
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon="wallet"
          iconColor="bg-success-soft text-success"
          value={formatVnd(stats.totalCollected)}
          label="Tổng thu"
        />
        <StatCard
          icon="receipt"
          iconColor="bg-primary-soft text-primary"
          value={formatVnd(stats.totalSessionCost)}
          label="Tổng chi phí sân"
        />
        <StatCard
          icon="clock"
          iconColor="bg-warning-soft text-warning"
          value={formatVnd(stats.totalOutstanding)}
          label="Còn nợ"
        />
        <StatCard
          icon="download"
          iconColor="bg-danger-soft text-danger"
          value={formatVnd(stats.totalPending)}
          label="Chờ thu"
        />
      </div>
    </section>
  );
}

interface StatCardProps {
  icon: 'wallet' | 'receipt' | 'clock' | 'download';
  iconColor: string;
  value: string;
  label: string;
}

function StatCard({ icon, iconColor, value, label }: StatCardProps) {
  return (
    <div className="card">
      <span className={`flex items-center justify-center h-9 w-9 rounded-lg ${iconColor}`}>
        <Icon name={icon} size={18} />
      </span>
      <div className="mt-3 text-xl font-display tnum leading-none break-all">{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}

// ── Sessions section ──────────────────────────────────────────────────────────

function SessionsSection({ stats }: { stats: SessionsStats }) {
  return (
    <section className="space-y-3">
      <h2 className="section-title">Buổi đánh</h2>

      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <div className="text-2xl font-display tnum">{stats.totalSessions}</div>
          <div className="text-xs text-muted mt-1">Số buổi</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-display tnum">{stats.totalParticipations}</div>
          <div className="text-xs text-muted mt-1">Lượt tham gia</div>
        </div>
        <div className="card text-center">
          <div className="text-sm font-display tnum">{formatVnd(stats.avgRevenuePerSession)}</div>
          <div className="text-xs text-muted mt-1">TB/buổi</div>
        </div>
      </div>

      {stats.breakdown.length === 0 ? (
        <EmptyState icon="calendar" message="Chưa có buổi đánh nào." />
      ) : (
        <div className="space-y-2">
          {stats.breakdown.map((s) => (
            <div key={s.session_id} className="card space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{s.title}</div>
                  <div className="text-xs text-muted">{formatDate(s.session_date)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold tnum">{formatVnd(s.session_total)}</div>
                  <div className="text-xs text-muted">{s.participant_count} người</div>
                </div>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="text-success tnum">Thu: {formatVnd(s.collected)}</span>
                {s.outstanding > 0 && (
                  <span className="text-danger tnum">Nợ: {formatVnd(s.outstanding)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Members section ───────────────────────────────────────────────────────────

function MembersSection({ stats }: { stats: MembersStats }) {
  return (
    <section className="space-y-3">
      <h2 className="section-title">Thành viên</h2>

      {/* Top participants */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted uppercase tracking-wide">Tham gia nhiều nhất</p>
        {stats.topParticipants.length === 0 ? (
          <EmptyState icon="users" message="Không có dữ liệu." />
        ) : (
          stats.topParticipants.map((m, i) => (
            <div key={`tp-${m.member_id ?? m.name}-${i}`} className="row">
              <span className="avatar">{initials(m.name)}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate text-sm">{m.name}</div>
              </div>
              <span className="tnum text-sm font-semibold">{m.count} buổi</span>
            </div>
          ))
        )}
      </div>

      {/* Top debtors */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted uppercase tracking-wide">Còn nợ nhiều nhất</p>
        {stats.topDebtors.length === 0 ? (
          <div className="card">
            <p className="text-sm text-muted text-center py-2">Không có công nợ.</p>
          </div>
        ) : (
          stats.topDebtors.map((m, i) => (
            <div key={`td-${m.member_id ?? m.name}-${i}`} className="row">
              <span className="avatar">{initials(m.name)}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate text-sm">{m.name}</div>
                <div className="text-xs text-muted">{m.count} buổi chưa trả</div>
              </div>
              <span className="tnum text-sm font-semibold text-danger">{formatVnd(m.amount)}</span>
            </div>
          ))
        )}
      </div>

      {/* Attendance rates */}
      {stats.attendanceRates.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">Tỉ lệ đi/vắng</p>
          {stats.attendanceRates.map((m, i) => {
            const pct = m.total > 0 ? Math.round((m.attended / m.total) * 100) : 0;
            return (
              <div key={`att-${m.member_id}-${i}`} className="row">
                <span className="avatar">{initials(m.name)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate text-sm">{m.name}</div>
                  <div className="text-xs text-muted">
                    Đi: {m.attended} · Vắng: {m.absent} / {m.total}
                  </div>
                </div>
                <span className="tnum text-sm font-semibold">{pct}%</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── Payments section ──────────────────────────────────────────────────────────

const PAYMENT_STATUS_LABEL: Record<string, [string, string]> = {
  paid:    ['badge-success', 'Đã trả'],
  partial: ['badge-warning', 'Một phần'],
  waived:  ['badge-primary', 'Miễn'],
};

function PaymentsSection({ payments }: { payments: PaymentHistoryEntry[] }) {
  return (
    <section className="space-y-3">
      <h2 className="section-title">Lịch sử thanh toán</h2>
      {payments.length === 0 ? (
        <EmptyState icon="receipt" message="Chưa có thanh toán nào." />
      ) : (
        <div className="space-y-2">
          {payments.map((p) => {
            const [badgeCls, badgeLabel] = PAYMENT_STATUS_LABEL[p.payment_status] ?? ['badge', p.payment_status];
            return (
              <div key={`pay-${p.participant_id}`} className="row">
                <span className="avatar">{initials(p.name)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate text-sm">{p.name}</div>
                  <div className="text-xs text-muted truncate">
                    {p.session_title} · {formatDate(p.session_date)}
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <div className="tnum text-sm font-semibold">{formatVnd(p.paid_amount)}</div>
                  <span className={badgeCls}>{badgeLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ icon, message }: { icon: 'calendar' | 'users' | 'receipt'; message: string }) {
  return (
    <div className="card flex flex-col items-center text-center py-8 gap-3">
      <span className="flex items-center justify-center h-14 w-14 rounded-full bg-surface-sunken text-muted">
        <Icon name={icon} size={26} />
      </span>
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
