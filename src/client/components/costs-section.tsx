// Costs section: court costs summary + cost items CRUD (shuttle/water/extra/discount) + manual_total toggle.
import { useState, type FormEvent } from 'react';
import { api, ApiClientError } from '../api/client.ts';
import { formatVnd } from '../lib/format.ts';
import type { SessionCourt, CostItem, CostItemType } from '../../shared/types.ts';

interface Props {
  sessionId: number;
  courts: SessionCourt[];
  costItems: CostItem[];
  total: number;
  manualTotal: number | null;
  settled: boolean;
  onChange: () => void;
}

const TYPE_LABEL: Record<CostItemType, string> = {
  shuttle: 'Cầu',
  water: 'Nước',
  extra: 'Khác',
  discount: 'Giảm giá',
};

export function CostsSection({ sessionId, courts, costItems, total, manualTotal, settled, onChange }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<CostItem | null>(null);
  const [err, setErr] = useState('');

  const courtTotal = courts.reduce((s, c) => s + c.cost, 0);

  const deleteItem = async (id: number) => {
    if (!confirm('Xóa mục chi phí này?')) return;
    try {
      await api.del(`/admin/cost-items/${id}`);
      onChange();
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : 'Lỗi xóa');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">Chi phí</h2>
        {!settled && (
          <button className="btn-secondary text-xs h-8 px-3" onClick={() => { setShowForm(true); setEditItem(null); }}>
            + Thêm
          </button>
        )}
      </div>

      {err && <p className="text-sm text-danger">{err}</p>}

      {/* Court costs */}
      {courts.length > 0 && (
        <div className="card space-y-1">
          <div className="text-xs text-muted font-medium">Chi phí sân</div>
          {courts.map((c) => (
            <div key={c.id} className="flex justify-between text-sm">
              <span>{c.name}{c.start_time ? ` (${c.start_time}–${c.end_time ?? '?'})` : ''}</span>
              <span>{formatVnd(c.cost)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-medium border-t border-hairline pt-1 mt-1">
            <span>Tổng sân</span>
            <span>{formatVnd(courtTotal)}</span>
          </div>
        </div>
      )}

      {/* Cost items */}
      {costItems.length > 0 && (
        <div className="card space-y-1">
          <div className="text-xs text-muted font-medium">Chi phí khác</div>
          {costItems.map((item) => (
            <div key={item.id} className="flex justify-between items-center text-sm">
              <span>{TYPE_LABEL[item.type]}{item.label ? ` – ${item.label}` : ''}</span>
              <div className="flex items-center gap-2">
                <span className={item.amount < 0 ? 'text-success' : ''}>{formatVnd(item.amount)}</span>
                {!settled && (
                  <>
                    <button className="text-xs text-muted hover:text-ink" onClick={() => { setEditItem(item); setShowForm(true); }}>Sửa</button>
                    <button className="text-xs text-danger" onClick={() => deleteItem(item.id)}>Xóa</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      <div className="card flex justify-between items-center">
        <span className="font-medium">Tổng cộng</span>
        <span className="text-xl font-display">
          {manualTotal !== null ? formatVnd(manualTotal) : formatVnd(total)}
          {manualTotal !== null && <span className="text-xs text-muted ml-1">(thủ công)</span>}
        </span>
      </div>

      {/* Cost item form modal */}
      {showForm && (
        <CostItemForm
          sessionId={sessionId}
          initial={editItem}
          onSaved={() => { setShowForm(false); setEditItem(null); onChange(); }}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}

// ── CostItemForm modal ───────────────────────────────────────────────────────

interface FormProps {
  sessionId: number;
  initial: CostItem | null;
  onSaved: () => void;
  onClose: () => void;
}

function CostItemForm({ sessionId, initial, onSaved, onClose }: FormProps) {
  const [type, setType] = useState<CostItemType>(initial?.type ?? 'shuttle');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const body = { session_id: sessionId, type, label: label || null, amount };
    try {
      if (initial) {
        await api.put<CostItem>(`/admin/cost-items/${initial.id}`, { type, label: label || null, amount });
      } else {
        await api.post<CostItem>('/admin/cost-items', body);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : 'Lỗi lưu');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-3">
        <h2 className="text-lg">{initial ? 'Sửa chi phí' : 'Thêm chi phí'}</h2>

        <div>
          <label className="label">Loại</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as CostItemType)}>
            {(Object.keys(TYPE_LABEL) as CostItemType[]).map((t) => (
              <option key={t} value={t}>{TYPE_LABEL[t]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Nhãn</label>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={200} />
        </div>

        <div>
          <label className="label">Số tiền (VND, giảm giá dùng số âm)</label>
          <input
            type="number"
            className="input"
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value || '0', 10))}
          />
        </div>

        {err && <p className="text-sm text-danger">{err}</p>}

        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Hủy</button>
        </div>
      </form>
    </div>
  );
}
