// Debts page: total per member + per-session debt items + needs_review group.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.ts';
import { formatVnd, formatDate } from '../lib/format.ts';
import { ShareBillButton } from '../components/share-bill-button.tsx';

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
      <h1 className="text-2xl">Công nợ</h1>

      <div className="card">
        <div className="text-xs text-muted">Tổng công nợ</div>
        <div className="text-2xl font-display">{formatVnd(totalDebt)}</div>
      </div>

      {/* Needs review group */}
      {data.needsReview.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-base font-medium text-warning">Cần kiểm tra ({data.needsReview.length})</h2>
          {data.needsReview.map((r) => {
            const billUrl = r.bill_url
              ? r.bill_url.startsWith('/') ? `${window.location.origin}${r.bill_url}` : r.bill_url
              : undefined;
            return (
              <div key={r.participant_id} className="card space-y-2 border-warning py-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-sm">{r.name}</div>
                    <Link to={`/sessions/${r.session_id}`} className="text-xs text-primary">
                      {r.session_title} · {formatDate(r.session_date)}
                    </Link>
                  </div>
                  <div className="text-right text-sm">
                    <div>Mới: {formatVnd(r.final_amount)}</div>
                    {r.previous_final_amount !== null && (
                      <div className="text-xs text-muted line-through">{formatVnd(r.previous_final_amount)}</div>
                    )}
                  </div>
                </div>
                {billUrl && <ShareBillButton billUrl={billUrl} />}
              </div>
            );
          })}
        </section>
      )}

      {/* Regular debts */}
      {data.debts.length === 0 && data.needsReview.length === 0 && (
        <p className="text-sm text-muted">Không có công nợ.</p>
      )}

      <div className="space-y-4">
        {data.debts.map((entry) => (
          <section key={`${entry.member_id ?? 'g'}-${entry.member_name}`} className="space-y-2">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-medium">{entry.member_name}</h2>
              <span className="text-sm font-medium text-danger">{formatVnd(entry.total_remaining)}</span>
            </div>

            {entry.items.map((item) => {
              const billUrl = item.bill_url
                ? item.bill_url.startsWith('/') ? `${window.location.origin}${item.bill_url}` : item.bill_url
                : undefined;
              return (
                <div key={item.participant_id} className="card py-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link to={`/sessions/${item.session_id}`} className="text-sm text-primary font-medium">
                        {item.session_title}
                      </Link>
                      <div className="text-xs text-muted">{formatDate(item.session_date)}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div>Còn: {formatVnd(item.remaining)}</div>
                      <div className="text-xs text-muted">/ {formatVnd(item.final_amount)}</div>
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
