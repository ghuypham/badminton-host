// Debts page: total per member + per-session debt items + needs_review group.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.ts';
import { formatVnd, formatDate } from '../lib/format.ts';
import { ShareBillButton } from '../components/share-bill-button.tsx';
import { Icon } from '../components/icon.tsx';

interface DebtItem {
  participant_id: number;
  session_id: number;
  session_title: string;
  session_date: string;
  final_amount: number;
  paid_amount: number;
  remaining: number;
  payment_status: string;
  bill_token: string | null;
  bill_url: string | null;
}

interface DebtEntry {
  member_id: number | null;
  member_name: string;
  total_remaining: number;
  items: DebtItem[];
}

interface NeedsReviewEntry {
  participant_id: number;
  name: string;
  member_id: number | null;
  session_id: number;
  session_title: string;
  session_date: string;
  previous_final_amount: number | null;
  final_amount: number;
  paid_amount: number;
  bill_token: string | null;
  bill_url: string | null;
}

interface DebtsResult {
  debts: DebtEntry[];
  needsReview: NeedsReviewEntry[];
}

export function DebtsPage() {
  const [data, setData] = useState<DebtsResult | null>(null);

  useEffect(() => {
    api.get<DebtsResult>('/admin/debts').then(setData).catch(() => setData(null));
  }, []);

  if (!data) return <p className="text-muted">Đang tải…</p>;

  const totalDebt = data.debts.reduce((s, d) => s + d.total_remaining, 0);

  return (
    <div className="space-y-5">
      <h1 className="page-title">Công nợ</h1>

      {/* Summary card */}
      <div className="card">
        <div className="text-xs text-muted mb-1">Tổng công nợ</div>
        <div className="text-2xl font-display tnum">{formatVnd(totalDebt)}</div>
      </div>

      {/* Needs review group */}
      {data.needsReview.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Cần kiểm tra</h2>
            <span className="badge-warning">{data.needsReview.length}</span>
          </div>
          {data.needsReview.map((r) => {
            const billUrl = r.bill_url
              ? r.bill_url.startsWith('/') ? `${window.location.origin}${r.bill_url}` : r.bill_url
              : undefined;
            return (
              <div key={r.participant_id} className="card space-y-2 border-warning">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{r.name}</div>
                    <Link to={`/sessions/${r.session_id}`} className="text-xs text-primary">
                      {r.session_title} · {formatDate(r.session_date)}
                    </Link>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold tnum">Mới: {formatVnd(r.final_amount)}</div>
                    {r.previous_final_amount !== null && (
                      <div className="text-xs text-muted line-through tnum">{formatVnd(r.previous_final_amount)}</div>
                    )}
                  </div>
                </div>
                {billUrl && <ShareBillButton billUrl={billUrl} />}
              </div>
            );
          })}
        </section>
      )}

      {/* Empty state: no debts and no review items */}
      {data.debts.length === 0 && data.needsReview.length === 0 && (
        <div className="card flex flex-col items-center text-center py-10 gap-3">
          <span className="flex items-center justify-center h-14 w-14 rounded-full bg-surface-sunken text-muted">
            <Icon name="wallet" size={26} />
          </span>
          <p className="text-sm text-muted">Không có công nợ.</p>
        </div>
      )}

      {/* Regular debts */}
      <div className="space-y-4">
        {data.debts.map((entry) => (
          <section key={`${entry.member_id ?? 'g'}-${entry.member_name}`} className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="section-title">{entry.member_name}</h2>
              <span className="badge-danger tnum">{formatVnd(entry.total_remaining)}</span>
            </div>

            {entry.items.map((item) => {
              const billUrl = item.bill_url
                ? item.bill_url.startsWith('/') ? `${window.location.origin}${item.bill_url}` : item.bill_url
                : undefined;
              return (
                <div key={item.participant_id} className="card space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <Link to={`/sessions/${item.session_id}`} className="text-sm text-primary font-medium truncate block">
                        {item.session_title}
                      </Link>
                      <div className="text-xs text-muted">{formatDate(item.session_date)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold tnum">Còn: {formatVnd(item.remaining)}</div>
                      <div className="text-xs text-muted tnum">/ {formatVnd(item.final_amount)}</div>
                    </div>
                  </div>
                  {billUrl && <ShareBillButton billUrl={billUrl} />}
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
