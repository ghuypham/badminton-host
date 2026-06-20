// Debts page: person-centric list — one row per debtor, expandable per-session breakdown + quick payment.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.ts';
import { formatVnd, formatDate } from '../lib/format.ts';
import { Icon } from '../components/icon.tsx';
import { DebtPersonRow } from '../components/debt-person-row.tsx';
import type { DebtEntry } from '../components/debt-person-row.tsx';
import { ShareBillButton } from '../components/share-bill-button.tsx';

interface NeedsReviewEntry {
  participant_id: number;
  name: string;
  session_id: number;
  session_title: string;
  session_date: string;
  previous_final_amount: number | null;
  final_amount: number;
  bill_url: string | null;
}

interface DebtsResult {
  debts: DebtEntry[];
  needsReview: NeedsReviewEntry[];
}

export function DebtsPage() {
  const [data, setData] = useState<DebtsResult | null>(null);

  const load = useCallback(() => {
    api.get<DebtsResult>('/admin/debts').then(setData).catch(() => setData(null));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!data) return <p className="text-muted">Đang tải…</p>;

  const totalDebt = data.debts.reduce((s, d) => s + d.total_remaining, 0);
  const debtorCount = data.debts.length;
  const isEmpty = debtorCount === 0 && data.needsReview.length === 0;

  // Sort by most owed first (already from server, but enforce here)
  const sorted = [...data.debts].sort((a, b) => b.total_remaining - a.total_remaining);

  return (
    <div className="space-y-5">
      <h1 className="page-title">Công nợ</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="text-xs text-muted mb-1">Tổng công nợ</div>
          <div className="text-2xl font-display tnum">{formatVnd(totalDebt)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-muted mb-1">Số người nợ</div>
          <div className="text-2xl font-display tnum">{debtorCount}</div>
        </div>
      </div>

      {/* Needs review */}
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
                      <div className="text-xs text-muted line-through tnum">
                        {formatVnd(r.previous_final_amount)}
                      </div>
                    )}
                  </div>
                </div>
                {billUrl && <ShareBillButton billUrl={billUrl} />}
              </div>
            );
          })}
        </section>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="card flex flex-col items-center text-center py-10 gap-3">
          <span className="flex items-center justify-center h-14 w-14 rounded-full bg-surface-sunken text-muted">
            <Icon name="check" size={26} />
          </span>
          <p className="text-sm text-muted">Không còn ai nợ.</p>
        </div>
      )}

      {/* Person-centric debt list */}
      {sorted.length > 0 && (
        <section className="space-y-2">
          <h2 className="section-title">Danh sách nợ</h2>
          {sorted.map((entry) => (
            <DebtPersonRow
              key={entry.member_id !== null ? `m:${entry.member_id}` : `g:${entry.member_name}`}
              entry={entry}
              onRefresh={load}
            />
          ))}
        </section>
      )}
    </div>
  );
}
