// Split section: calculate suggestion, edit final_amounts, finalize.
import { useState } from 'react';
import { api, ApiClientError } from '../api/client.ts';
import { formatVnd } from '../lib/format.ts';
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg">Chia tiền</h2>
        <button
          className="btn-secondary text-xs h-8 px-3"
          onClick={calculate}
          disabled={busy || chargeable.length === 0}
        >
          {busy ? 'Đang tính…' : 'Tính toán'}
        </button>
      </div>

      <div className="card grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-xs text-muted">Tổng chi phí</div>
          <div className="font-medium">{formatVnd(total)}</div>
        </div>
        <div>
          <div className="text-xs text-muted">Người tính tiền</div>
          <div className="font-medium">{chargeable.length}</div>
        </div>
      </div>

      {chargeable.length === 0 && (
        <p className="text-sm text-muted">Không có người cần chia tiền.</p>
      )}

      {err && <p className="text-sm text-danger">{err}</p>}
      {done && <p className="text-sm text-success">Đã xác nhận chia tiền!</p>}

      {result && (
        <div className="space-y-2">
          <div className="text-xs text-muted">Chỉnh sửa số tiền nếu cần:</div>
          {result.suggestions.map((s) => (
            <div key={s.participantId} className="flex items-center gap-2">
              <span className="flex-1 text-sm">{s.name}</span>
              <input
                type="number"
                className="input w-32 text-right"
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

          <div className="flex justify-between text-sm font-medium border-t border-hairline pt-2">
            <span>Tổng phân bổ</span>
            <span className={editedTotal !== total ? 'text-warning' : ''}>{formatVnd(editedTotal)}</span>
          </div>

          {editedTotal !== total && (
            <p className="text-xs text-warning">
              Lệch {formatVnd(Math.abs(editedTotal - total))} so với tổng chi phí
            </p>
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
