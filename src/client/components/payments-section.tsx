// Payments section: group by payment_status, actions per participant.
import { useEffect, useState } from 'react';
import { api, ApiClientError } from '../api/client.ts';
import { formatVnd } from '../lib/format.ts';
import { Icon } from './icon.tsx';
import { ShareBillButton } from './share-bill-button.tsx';

interface PaymentRow {
  id: number;
  name: string;
  phone: string | null;
  should_charge: number;
  payment_status: string;
  final_amount: number;
  paid_amount: number;
  bill_token: string | null;
  payment_note: string | null;
}

interface PaymentsResponse {
  sessionId: number;
  grouped: Record<string, PaymentRow[]>;
}

interface Props {
  sessionId: number;
  // Trigger re-fetch when parent signals changes
  refreshKey: number;
}

const STATUS_LABEL: Record<string, string> = {
  unpaid: 'Chưa trả',
  partial: 'Trả một phần',
  paid: 'Đã trả',
  waived: 'Miễn',
  needs_review: 'Cần kiểm tra',
};

// Badge class per payment status
const STATUS_BADGE: Record<string, string> = {
  paid: 'badge-success',
  partial: 'badge-warning',
  unpaid: 'badge-danger',
  needs_review: 'badge-warning',
  waived: 'badge',
};

const STATUS_ORDER = ['needs_review', 'unpaid', 'partial', 'paid', 'waived'];

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(-2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

export function PaymentsSection({ sessionId, refreshKey }: Props) {
  const [data, setData] = useState<PaymentsResponse | null>(null);
  const [err, setErr] = useState('');
  const [partialAmounts, setPartialAmounts] = useState<Record<number, number>>({});

  useEffect(() => {
    api
      .get<PaymentsResponse>(`/admin/payments/${sessionId}`)
      .then(setData)
      .catch(() => setData(null));
  }, [sessionId, refreshKey]);

  const update = async (
    id: number,
    payment_status: string,
    paid_amount?: number,
    payment_note?: string | null,
  ) => {
    setErr('');
    try {
      await api.put(`/admin/participants/${id}/payment`, {
        payment_status,
        paid_amount,
        payment_note: payment_note ?? null,
      });
      // Reload
      const fresh = await api.get<PaymentsResponse>(`/admin/payments/${sessionId}`);
      setData(fresh);
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : 'Lỗi cập nhật thanh toán');
    }
  };

  // Loading state
  if (!data) {
    return (
      <div className="card flex flex-col items-center text-center py-10 gap-3">
        <span className="flex items-center justify-center h-14 w-14 rounded-full bg-surface-sunken text-muted">
          <Icon name="wallet" size={26} />
        </span>
        <p className="text-sm text-muted">Đang tải thanh toán…</p>
      </div>
    );
  }

  const allRows = Object.values(data.grouped).flat();

  // Empty state
  if (allRows.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="section-title">Thanh toán</h2>
        <div className="card flex flex-col items-center text-center py-10 gap-3">
          <span className="flex items-center justify-center h-14 w-14 rounded-full bg-surface-sunken text-muted">
            <Icon name="wallet" size={26} />
          </span>
          <p className="text-sm text-muted">Chưa có người chơi nào.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="section-title">Thanh toán</h2>
      </div>

      {err && <p className="text-sm text-danger">{err}</p>}

      {STATUS_ORDER.filter((s) => data.grouped[s]?.length).map((status) => (
        <div key={status} className="space-y-2">
          {/* Status group label */}
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">
            {STATUS_LABEL[status] ?? status} ({data.grouped[status].length})
          </p>

          {data.grouped[status].map((row) => {
            const remaining = row.final_amount - row.paid_amount;
            const billUrl = row.bill_token
              ? `${window.location.origin}/b/${row.bill_token}`
              : undefined;

            return (
              <div key={row.id} className="card space-y-3">
                {/* Person header row */}
                <div className="flex items-start gap-3">
                  <span className="avatar shrink-0">{initials(row.name)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{row.name}</div>
                    {row.phone && <div className="text-xs text-muted">{row.phone}</div>}
                    {/* Money summary */}
                    <div className="text-xs text-muted mt-0.5 space-x-1">
                      <span>Phải trả: <span className="tnum font-medium text-ink">{formatVnd(row.final_amount)}</span></span>
                      {row.paid_amount > 0 && (
                        <span>· Đã trả: <span className="tnum font-medium text-success">{formatVnd(row.paid_amount)}</span></span>
                      )}
                      {remaining > 0 && (
                        <span>· Còn: <span className="tnum font-medium text-danger">{formatVnd(remaining)}</span></span>
                      )}
                    </div>
                    {row.payment_note && (
                      <div className="text-xs text-muted italic mt-0.5">{row.payment_note}</div>
                    )}
                  </div>
                  <span className={`${STATUS_BADGE[row.payment_status] ?? 'badge'} shrink-0`}>
                    {STATUS_LABEL[row.payment_status] ?? row.payment_status}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {billUrl && <ShareBillButton billUrl={billUrl} />}

                  {row.payment_status !== 'paid' && (
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => update(row.id, 'paid', row.final_amount)}
                    >
                      <Icon name="check" size={14} /> Đã trả
                    </button>
                  )}

                  {row.payment_status !== 'waived' && (
                    <button
                      className="btn-ghost btn-sm"
                      onClick={() => update(row.id, 'waived', 0)}
                    >
                      Miễn
                    </button>
                  )}

                  {row.payment_status !== 'unpaid' && (
                    <button
                      className="btn-ghost btn-sm text-muted"
                      onClick={() => update(row.id, 'unpaid', 0)}
                    >
                      Chưa trả
                    </button>
                  )}
                </div>

                {/* Partial payment input */}
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    inputMode="numeric"
                    className="input w-36 text-right tnum"
                    min={0}
                    placeholder="Số tiền…"
                    value={partialAmounts[row.id] ?? ''}
                    onChange={(e) =>
                      setPartialAmounts((prev) => ({
                        ...prev,
                        [row.id]: parseInt(e.target.value || '0', 10),
                      }))
                    }
                  />
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => update(row.id, 'partial', partialAmounts[row.id] ?? 0)}
                  >
                    Trả một phần
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
