// Split section: calculate suggestion, edit final_amounts, finalize.
import { useState } from 'react';
import { api, ApiClientError } from '../api/client.ts';
import { formatVnd } from '../lib/format.ts';
import { Icon } from './icon.tsx';
import type { SessionParticipant } from '../../shared/types.ts';

interface SplitSuggestion {
  participantId: number;
  name: string;
  calculatedAmount: number;
}

interface SplitResult {
  suggestions: SplitSuggestion[];
  allocatedTotal: number;
  difference: number;
}

interface Props {
  sessionId: number;
  participants: SessionParticipant[];
  total: number;
  onChange: () => void;
}

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(-2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

export function SplitSection({ sessionId, participants, total, onChange }: Props) {
  const [result, setResult] = useState<SplitResult | null>(null);
  // Map participantId → editable final amount
  const [finals, setFinals] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  const chargeable = participants.filter((p) => p.should_charge === 1);

  const calculate = async () => {
    setErr('');
    setBusy(true);
    try {
      const r = await api.post<SplitResult>(`/admin/split/${sessionId}/calculate`);
      setResult(r);
      // Pre-fill finals with suggested amounts
      const map: Record<number, number> = {};
      for (const s of r.suggestions) map[s.participantId] = s.calculatedAmount;
      setFinals(map);
      setDone(false);
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : 'Lỗi tính toán');
    } finally {
      setBusy(false);
    }
  };

  const finalize = async () => {
    if (!result) return;
    const diff = Object.values(finals).reduce((s, a) => s + a, 0) - total;
    if (diff !== 0 && !confirm(`Tổng phân bổ lệch ${formatVnd(Math.abs(diff))} so với tổng chi phí. Vẫn xác nhận?`)) return;
    setBusy(true);
    setErr('');
    try {
      const entries = result.suggestions.map((s) => ({
        participantId: s.participantId,
        finalAmount: finals[s.participantId] ?? s.calculatedAmount,
      }));
      await api.post(`/admin/split/${sessionId}/finalize`, entries);
      setDone(true);
      onChange();
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : 'Lỗi xác nhận');
    } finally {
      setBusy(false);
    }
  };

  const editedTotal = result
    ? result.suggestions.reduce((s, sg) => s + (finals[sg.participantId] ?? sg.calculatedAmount), 0)
    : 0;

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="section-title">Chia tiền</h2>
        <button
          className="btn-secondary btn-sm"
          onClick={calculate}
          disabled={busy || chargeable.length === 0}
        >
          {busy ? 'Đang tính…' : 'Tính toán'}
        </button>
      </div>

      {/* Summary stats card */}
      <div className="card grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-muted">Tổng chi phí</div>
          <div className="font-semibold tnum mt-0.5">{formatVnd(total)}</div>
        </div>
        <div>
          <div className="text-xs text-muted">Người tính tiền</div>
          <div className="font-semibold mt-0.5">{chargeable.length}</div>
        </div>
      </div>

      {/* No chargeable participants */}
      {chargeable.length === 0 && (
        <div className="card flex flex-col items-center text-center py-8 gap-3">
          <span className="flex items-center justify-center h-14 w-14 rounded-full bg-surface-sunken text-muted">
            <Icon name="wallet" size={26} />
          </span>
          <p className="text-sm text-muted">Không có người cần chia tiền.</p>
        </div>
      )}

      {err && <p className="text-sm text-danger">{err}</p>}

      {/* Success banner */}
      {done && (
        <div className="flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2.5">
          <Icon name="check" size={16} className="text-success shrink-0" />
          <span className="text-sm text-success font-semibold">Đã xác nhận chia tiền!</span>
        </div>
      )}

      {/* Split result — editable per-person rows */}
      {result && (
        <div className="space-y-2">
          <p className="text-xs text-muted">Chỉnh sửa số tiền nếu cần:</p>

          {result.suggestions.map((s) => (
            <div key={s.participantId} className="card flex items-center gap-3">
              <span className="avatar shrink-0">{initials(s.name)}</span>
              <span className="flex-1 min-w-0 text-sm font-medium truncate">{s.name}</span>
              <input
                type="number"
                className="input w-32 text-right tnum"
                min={0}
                value={finals[s.participantId] ?? s.calculatedAmount}
                onChange={(e) =>
                  setFinals((prev) => ({
                    ...prev,
                    [s.participantId]: parseInt(e.target.value || '0', 10),
                  }))
                }
              />
            </div>
          ))}

          {/* Allocated total row */}
          <div className="card flex justify-between items-center">
            <span className="text-sm font-semibold">Tổng phân bổ</span>
            <span className={`tnum font-semibold ${editedTotal !== total ? 'text-warning' : 'text-success'}`}>
              {formatVnd(editedTotal)}
            </span>
          </div>

          {/* Rounding difference warning */}
          {editedTotal !== total && (
            <div className="flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2">
              <Icon name="clock" size={15} className="text-warning shrink-0" />
              <p className="text-xs text-warning">
                Lệch <span className="tnum font-semibold">{formatVnd(Math.abs(editedTotal - total))}</span> so với tổng chi phí
              </p>
            </div>
          )}

          <button
            className="btn-primary w-full"
            onClick={finalize}
            disabled={busy}
          >
            {busy ? 'Đang xác nhận…' : 'Xác nhận chia tiền'}
          </button>
        </div>
      )}
    </div>
  );
}
