// Payments section: group by payment_status, actions per participant.
import { useEffect, useState } from 'react';
import { api, ApiClientError } from '../api/client.ts';
import { formatVnd } from '../lib/format.ts';
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

const STATUS_ORDER = ['needs_review', 'unpaid', 'partial', 'paid', 'waived'];

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

  if (!data) return <p className="text-sm text-muted">Đang tải thanh toán…</p>;

  const allRows = Object.values(data.grouped).flat();
  if (allRows.length === 0) return <p className="text-sm text-muted">Chưa có người chơi nào.</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg">Thanh toán</h2>
      {err && <p className="text-sm text-danger">{err}</p>}

      {STATUS_ORDER.filter((s) => data.grouped[s]?.length).map((status) => (
        <div key={status} className="space-y-2">
          <h3 className="text-sm font-medium text-muted">
            {STATUS_LABEL[status] ?? status} ({data.grouped[status].length})
          </h3>

          {data.grouped[status].map((row) => {
            const remaining = row.final_amount - row.paid_amount;
            const billUrl = row.bill_token
              ? `${window.location.origin}/b/${row.bill_token}`
              : undefined;

            return (
              <div key={row.id} className="card space-y-2 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-sm">{row.name}</div>
                    {row.phone && <div className="text-xs text-muted">{row.phone}</div>}
                    <div className="text-xs text-muted mt-0.5">
                      Phải trả: {formatVnd(row.final_amount)}
                      {row.paid_amount > 0 && ` · Đã trả: ${formatVnd(row.paid_amount)}`}
                      {remaining > 0 && ` · Còn: ${formatVnd(remaining)}`}
                    </div>
                    {row.payment_note && (
                      <div className="text-xs text-muted italic">{row.payment_note}</div>
                    )}
                  </div>
                  <span className="badge text-xs shrink-0">{STATUS_LABEL[row.payment_status] ?? row.payment_status}</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {billUrl && <ShareBillButton billUrl={billUrl} />}

                  {row.payment_status !== 'paid' && (
                    <button
                      className="btn-secondary text-xs h-8 px-3"
                      onClick={() => update(row.id, 'paid', row.final_amount)}
                    >
                      Đã trả
                    </button>
                  )}

                  {row.payment_status !== 'waived' && (
                    <button
                      className="btn-ghost text-xs h-8 px-3"
                      onClick={() => update(row.id, 'waived', 0)}
                    >
                      Miễn
                    </button>
                  )}

                  {row.payment_status !== 'unpaid' && (
                    <button
                      className="btn-ghost text-xs h-8 px-3 text-muted"
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
                    className="input w-32 text-right"
                    min={0}
                    placeholder="Số tiền"
                    value={partialAmounts[row.id] ?? ''}
                    onChange={(e) =>
                      setPartialAmounts((prev) => ({
                        ...prev,
                        [row.id]: parseInt(e.target.value || '0', 10),
                      }))
                    }
                  />
                  <button
                    className="btn-secondary text-xs h-8 px-3"
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
