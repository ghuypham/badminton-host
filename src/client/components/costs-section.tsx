// Costs section: court costs summary + cost items CRUD (shuttle/water/extra/discount) + manual_total toggle.
import { useState, type FormEvent } from 'react';
import { api, ApiClientError } from '../api/client.ts';
import { formatVnd } from '../lib/format.ts';
import { Icon } from './icon.tsx';
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
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="section-title">Chi phí</h2>
        {!settled && (
          <button
            className="btn-primary btn-sm"
            onClick={() => { setShowForm(true); setEditItem(null); }}
          >
            <Icon name="plus" size={16} /> Thêm
          </button>
        )}
      </div>

      {err && <p className="text-sm text-danger">{err}</p>}

      {/* Court costs card */}
      {courts.length > 0 && (
        <div className="card space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wide">
            <Icon name="mapPin" size={13} />
            Chi phí sân
          </div>
          {courts.map((c) => (
            <div key={c.id} className="flex justify-between items-center text-sm">
              <span className="text-ink">
                {c.name}
                {c.start_time && (
                  <span className="text-muted ml-1">({c.start_time}–{c.end_time ?? '?'})</span>
                )}
              </span>
              <span className="tnum font-medium">{formatVnd(c.cost)}</span>
            </div>
          ))}
          <div className="flex justify-between items-center text-sm font-semibold border-t border-hairline pt-2 mt-1">
            <span>Tổng sân</span>
            <span className="tnum">{formatVnd(courtTotal)}</span>
          </div>
        </div>
      )}

      {/* Cost items card */}
      {costItems.length > 0 && (
        <div className="card space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wide">
            <Icon name="receipt" size={13} />
            Chi phí khác
          </div>
          {costItems.map((item) => (
            <div key={item.id} className="flex justify-between items-center gap-2 text-sm">
              <span className="flex-1 min-w-0 truncate">
                {TYPE_LABEL[item.type]}
                {item.label && <span className="text-muted"> – {item.label}</span>}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`tnum font-medium ${item.amount < 0 ? 'text-success' : ''}`}>
                  {formatVnd(item.amount)}
                </span>
                {!settled && (
                  <>
                    <button
                      className="icon-btn"
                      aria-label="Sửa"
                      onClick={() => { setEditItem(item); setShowForm(true); }}
                    >
                      <Icon name="pencil" size={15} />
                    </button>
                    <button
                      className="icon-btn-danger"
                      aria-label="Xóa"
                      onClick={() => deleteItem(item.id)}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state when no courts and no items */}
      {courts.length === 0 && costItems.length === 0 && (
        <div className="card flex flex-col items-center text-center py-10 gap-3">
          <span className="flex items-center justify-center h-14 w-14 rounded-full bg-surface-sunken text-muted">
            <Icon name="receipt" size={26} />
          </span>
          <p className="text-sm text-muted">Chưa có chi phí nào.</p>
        </div>
      )}

      {/* Grand total card */}
      <div className="card flex justify-between items-center">
        <span className="font-semibold">Tổng cộng</span>
        <div className="text-right">
          <span className="text-xl font-display tnum">
            {manualTotal !== null ? formatVnd(manualTotal) : formatVnd(total)}
          </span>
          {manualTotal !== null && (
            <span className="text-xs text-muted ml-1.5">(thủ công)</span>
          )}
        </div>
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
    <div className="modal-overlay">
      <form onSubmit={onSubmit} className="modal-panel space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title">{initial ? 'Sửa chi phí' : 'Thêm chi phí'}</h2>
          <button type="button" className="icon-btn" aria-label="Đóng" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

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
          <label className="label">Số tiền (VND)</label>
          <input
            type="number"
            className="input tnum"
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value || '0', 10))}
          />
          <p className="helper">Giảm giá dùng số âm (ví dụ: −50000)</p>
        </div>

        {err && <p className="text-sm text-danger">{err}</p>}

        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu'}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Hủy</button>
        </div>
      </form>
    </div>
  );
}
