// Public bill page (/b/:token) — no auth, no AppShell.
// Layout: status badge → amount → QR → CK note → bank info → session info.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiClientError } from '../api/client.ts';
import { formatVnd, formatDate } from '../lib/format.ts';
import type { PaymentStatus } from '../../shared/types.ts';

interface BillView {
  participant: {
    id: number;
    name: string;
    phone: string | null;
    final_amount: number;
    paid_amount: number;
    payment_status: PaymentStatus;
    bill_token: string | null;
    payment_note: string | null;
  };
  remaining: number;
  session: {
    id: number;
    title: string;
    session_date: string;
    location: string | null;
    status: string;
  };
  bank: {
    bank_name: string | null;
    bank_account_name: string | null;
    bank_account_number: string | null;
    bank_qr_image_base64: string | null;
    bank_qr_mime: string | null;
  };
  renderedNote: string;
}

const STATUS_CONFIG: Record<PaymentStatus, { label: string; cls: string }> = {
  unpaid:        { label: 'Chưa thanh toán', cls: 'bg-danger/10 text-danger' },
  partial:       { label: 'Thanh toán một phần', cls: 'bg-warning/10 text-warning' },
  paid:          { label: 'Đã thanh toán', cls: 'bg-success/10 text-success' },
  waived:        { label: 'Được miễn', cls: 'bg-surface-card text-muted' },
  needs_review:  { label: 'Cần kiểm tra', cls: 'bg-warning/10 text-warning' },
};

export function PublicBillPage() {
  const { token } = useParams<{ token: string }>();
  const [bill, setBill] = useState<BillView | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) { setNotFound(true); return; }
    api
      .get<BillView>(`/public/bills/${token}`)
      .then(setBill)
      .catch((e) => {
        if (e instanceof ApiClientError && e.status === 404) setNotFound(true);
        else setNotFound(true);
      });
  }, [token]);

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-display">Không tìm thấy hóa đơn</h1>
          <p className="text-sm text-muted">Link không hợp lệ hoặc đã hết hạn.</p>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Đang tải…</p>
      </div>
    );
  }

  const { participant, remaining, session, bank, renderedNote } = bill;
  const statusCfg = STATUS_CONFIG[participant.payment_status] ?? { label: participant.payment_status, cls: 'bg-surface-card text-ink' };
  const isPaid = participant.payment_status === 'paid' || participant.payment_status === 'waived';

  return (
    <div className="min-h-screen bg-canvas max-w-screen-sm mx-auto px-4 py-8 space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-display">Hóa đơn</h1>
        <p className="text-sm text-muted">{participant.name}</p>
      </header>

      {/* Status badge */}
      <div className={`inline-flex items-center rounded-pill px-4 py-1.5 text-sm font-medium ${statusCfg.cls}`}>
        {statusCfg.label}
      </div>

      {/* Amount */}
      <div className="card space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-muted">Số tiền phải trả</span>
          <span className="font-display text-xl">{formatVnd(participant.final_amount)}</span>
        </div>
        {participant.paid_amount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted">Đã thanh toán</span>
            <span>{formatVnd(participant.paid_amount)}</span>
          </div>
        )}
        {!isPaid && remaining > 0 && (
          <div className="flex justify-between text-sm font-medium border-t border-hairline pt-2">
            <span>Còn lại</span>
            <span className="text-danger">{formatVnd(remaining)}</span>
          </div>
        )}
      </div>

      {/* QR code */}
      {bank.bank_qr_image_base64 && bank.bank_qr_mime && (
        <div className="card flex flex-col items-center gap-3">
          <img
            src={`data:${bank.bank_qr_mime};base64,${bank.bank_qr_image_base64}`}
            alt="Mã QR thanh toán"
            className="w-52 h-52 object-contain"
          />
        </div>
      )}

      {/* CK note */}
      {renderedNote && (
        <div className="card space-y-1">
          <div className="text-xs text-muted">Nội dung chuyển khoản</div>
          <div className="font-medium text-sm break-words">{renderedNote}</div>
        </div>
      )}

      {/* Bank info */}
      {(bank.bank_name || bank.bank_account_number) && (
        <div className="card space-y-2">
          <div className="text-xs text-muted font-medium">Thông tin ngân hàng</div>
          {bank.bank_name && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Ngân hàng</span>
              <span>{bank.bank_name}</span>
            </div>
          )}
          {bank.bank_account_name && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Chủ tài khoản</span>
              <span>{bank.bank_account_name}</span>
            </div>
          )}
          {bank.bank_account_number && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Số tài khoản</span>
              <span className="font-mono">{bank.bank_account_number}</span>
            </div>
          )}
        </div>
      )}

      {/* Payment note from admin */}
      {participant.payment_note && (
        <div className="card">
          <div className="text-xs text-muted mb-1">Ghi chú</div>
          <p className="text-sm">{participant.payment_note}</p>
        </div>
      )}

      {/* Session info */}
      <div className="card space-y-1">
        <div className="text-xs text-muted font-medium">Thông tin buổi đánh</div>
        <div className="text-sm font-medium">{session.title}</div>
        <div className="text-xs text-muted">
          {formatDate(session.session_date)}
          {session.location ? ` · ${session.location}` : ''}
        </div>
      </div>
    </div>
  );
}
