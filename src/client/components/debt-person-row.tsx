// Debt person row: expandable per-person debt card with per-session breakdown + quick payment actions.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiClientError } from '../api/client.ts';
import { formatVnd, formatDate } from '../lib/format.ts';
import { Icon } from './icon.tsx';
import { ShareBillButton } from './share-bill-button.tsx';

export interface DebtItem {
  participant_id: number;
  session_id: number;
  session_title: string;
  session_date: string;
  final_amount: number;
  paid_amount: number;
  remaining: number;
  payment_status: string;
}

export interface DebtEntry {
  member_id: number | null;
  member_name: string;
  total_remaining: number;
  items: DebtItem[];
}

interface Props {
  entry: DebtEntry;
  onRefresh: () => void;
}

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(-2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

export function DebtPersonRow({ entry, onRefresh }: Props) {
  const [open, setOpen] = useState(false);
  const [partialAmounts, setPartialAmounts] = useState<Record<number, string>>({});
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState<number | null>(null);

  const updatePayment = async (
    participantId: number,
    status: string,
    paid_amount?: number,
  ) => {
    setErr('');
    setLoading(participantId);
    try {
      await api.put(`/admin/participants/${participantId}/payment`, {
        payment_status: status,
        ...(paid_amount !== undefined ? { paid_amount } : {}),
      });
      onRefresh();
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : 'Lỗi cập nhật thanh toán');
    } finally {
      setLoading(null);
    }
  };

  const markPaid = (item: DebtItem) =>
    updatePayment(item.participant_id, 'paid');

  const markPartial = (item: DebtItem) => {
    const raw = partialAmounts[item.participant_id] ?? '';
    const amount = parseInt(raw, 10);
    if (!amount || amount <= 0) { setErr('Nhập số tiền hợp lệ'); return; }
    updatePayment(item.participant_id, 'partial', amount);
  };

  return (
    <div className="card space-y-0 p-0 overflow-hidden">
      {/* Person header row — tap to expand */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-sunken transition-colors"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="avatar shrink-0">{initials(entry.member_name)}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{entry.member_name}</div>
          <div className="text-xs text-muted">{entry.items.length} buổi</div>
        </div>
        <span className="badge-danger tnum shrink-0">{formatVnd(entry.total_remaining)}</span>
        <Icon
          name="chevronRight"
          size={16}
          className={`text-muted shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>

      {/* Per-session breakdown */}
      {open && (
        <div className="border-t border-hairline divide-y divide-hairline">
          {err && (
            <p className="px-4 py-2 text-xs text-danger">{err}</p>
          )}
          {entry.items.map((item) => {
            const partialVal = partialAmounts[item.participant_id] ?? '';
            const isLoading = loading === item.participant_id;

            return (
              <div key={item.participant_id} className="px-4 py-3 space-y-2">
                {/* Session info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to={`/sessions/${item.session_id}`}
                      className="text-sm text-primary font-medium truncate block"
                    >
                      {item.session_title}
                    </Link>
                    <div className="text-xs text-muted">{formatDate(item.session_date)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold tnum text-danger">
                      Còn {formatVnd(item.remaining)}
                    </div>
                    <div className="text-xs text-muted tnum">/ {formatVnd(item.final_amount)}</div>
                  </div>
                </div>

                {/* Share bill link */}
                <ShareBillButton participantId={item.participant_id} />

                {/* Action row */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => markPaid(item)}
                    disabled={isLoading}
                  >
                    <Icon name="check" size={13} />
                    Đã trả
                  </button>

                  {/* Partial payment */}
                  <input
                    type="number"
                    inputMode="numeric"
                    className="input w-28 text-right tnum"
                    style={{ height: '2.25rem', fontSize: '0.75rem' }}
                    min={1}
                    placeholder="Trả một phần…"
                    value={partialVal}
                    onChange={(e) =>
                      setPartialAmounts((prev) => ({
                        ...prev,
                        [item.participant_id]: e.target.value,
                      }))
                    }
                  />
                  <button
                    className="btn-ghost btn-sm"
                    onClick={() => markPartial(item)}
                    disabled={isLoading || !partialVal}
                  >
                    Ghi nhận
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
