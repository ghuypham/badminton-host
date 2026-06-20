// Public bill page (/b/:token) — no auth, no AppShell.
// Layout: brand mark → status badge → amount → QR → CK note → bank info → session info.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiClientError } from '../api/client.ts';
import { formatVnd, formatDate } from '../lib/format.ts';
import { Icon } from '../components/icon.tsx';
import type { PaymentStatus } from '../../shared/types.ts';

interface GroupBillLine {
  participant_id: number;
  name: string;
  final_amount: number;
  paid_amount: number;
  payment_status: string; // 'waived' lines are excluded from money totals; rendered as "Miễn"
}

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
  // Group billing fields (present when payer has followers)
  group_lines?: GroupBillLine[];
  group_total?: number;
  group_paid?: number;
  group_remaining?: number;
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

const STATUS_CONFIG: Record<PaymentStatus, { label: string; badgeCls: string }> = {
  unpaid:       { label: 'Chưa trả',            badgeCls: 'badge-danger' },
  partial:      { label: 'Một phần',             badgeCls: 'badge-warning' },
  paid:         { label: 'Đã trả',               badgeCls: 'badge-success' },
  waived:       { label: 'Được miễn',            badgeCls: 'badge' },
  needs_review: { label: 'Cần kiểm tra',         badgeCls: 'badge-warning' },
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

  // Loading state
  if (!notFound && !bill) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-canvas">
        <p className="text-muted text-sm">Đang tải…</p>
      </div>
    );
  }

  // Not-found / invalid token — generic message, no info leak
  if (notFound) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-canvas">
        <div className="card flex flex-col items-center text-center gap-3 py-10 w-full max-w-sm">
          <span className="flex items-center justify-center h-14 w-14 rounded-full bg-surface-sunken text-muted">
            <Icon name="receipt" size={26} />
          </span>
          <div className="space-y-1">
            <h1 className="page-title">Không tìm thấy</h1>
            <p className="text-sm text-muted">Link không hợp lệ hoặc đã hết hạn.</p>
          </div>
        </div>
      </div>
    );
  }

  const { participant, remaining, session, bank, renderedNote, group_lines, group_total, group_paid, group_remaining } = bill!;
  const statusCfg = STATUS_CONFIG[participant.payment_status] ?? { label: participant.payment_status, badgeCls: 'badge' };
  const isPaid = participant.payment_status === 'paid' || participant.payment_status === 'waived';
  const isGroupBill = group_lines !== undefined && group_lines.length > 1;

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="max-w-screen-sm mx-auto px-4 py-8 space-y-5">

        {/* Brand mark */}
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary text-on-primary">
            <Icon name="shuttlecock" size={22} />
          </span>
          <span className="font-display text-xl leading-none">Cầu lông</span>
        </div>

        {/* Header: name + status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h1 className="page-title">Hóa đơn</h1>
            <span className={statusCfg.badgeCls}>{statusCfg.label}</span>
          </div>
          <p className="text-sm text-muted">{participant.name}</p>
        </div>

        {/* Amount card — prominent display */}
        <div className="card space-y-3">
          <div className="flex items-center gap-2 text-muted">
            <Icon name="receipt" size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">Chi tiết thanh toán</span>
          </div>

          {/* Group bill: show per-member breakdown */}
          {isGroupBill ? (
            <>
              <div className="space-y-1.5">
                {group_lines!.map((line, idx) => (
                  <div key={line.participant_id} className="flex justify-between text-sm">
                    <span className={idx === 0 ? 'font-medium' : 'text-muted'}>{line.name}</span>
                    {/* Waived: paid_amount=final in DB but NOT real money — show label only */}
                    {line.payment_status === 'waived'
                      ? <span className="text-muted italic">Miễn</span>
                      : <span className="tnum">{formatVnd(line.final_amount)}</span>
                    }
                  </div>
                ))}
              </div>
              <div className="flex items-baseline justify-between border-t border-hairline pt-2">
                <span className="text-sm font-semibold">Tổng cộng</span>
                <span className="font-display text-2xl tnum">{formatVnd(group_total!)}</span>
              </div>
              {(group_paid ?? 0) > 0 && participant.payment_status !== 'waived' && (
                <div className="flex justify-between text-sm border-t border-hairline pt-2">
                  <span className="text-muted flex items-center gap-1.5">
                    <Icon name="check" size={14} className="text-success" /> Đã thanh toán
                  </span>
                  <span className="tnum">{formatVnd(group_paid!)}</span>
                </div>
              )}
              {!isPaid && (group_remaining ?? 0) > 0 && (
                <div className="flex justify-between text-sm font-semibold border-t border-hairline pt-2">
                  <span className="flex items-center gap-1.5">
                    <Icon name="wallet" size={14} className="text-danger" /> Còn lại
                  </span>
                  <span className="tnum text-danger">{formatVnd(group_remaining!)}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted">Số tiền phải trả</span>
                <span className="font-display text-2xl tnum">{formatVnd(participant.final_amount)}</span>
              </div>

              {/* Waived: paid_amount=final ở DB nhưng KHÔNG phải tiền thật → không hiển thị "đã thanh toán" */}
              {participant.paid_amount > 0 && participant.payment_status !== 'waived' && (
                <div className="flex justify-between text-sm border-t border-hairline pt-2">
                  <span className="text-muted flex items-center gap-1.5">
                    <Icon name="check" size={14} className="text-success" /> Đã thanh toán
                  </span>
                  <span className="tnum">{formatVnd(participant.paid_amount)}</span>
                </div>
              )}

              {participant.payment_status === 'waived' && (
                <p className="text-sm text-muted border-t border-hairline pt-2">Khoản này đã được miễn.</p>
              )}

              {!isPaid && remaining > 0 && (
                <div className="flex justify-between text-sm font-semibold border-t border-hairline pt-2">
                  <span className="flex items-center gap-1.5">
                    <Icon name="wallet" size={14} className="text-danger" /> Còn lại
                  </span>
                  <span className="tnum text-danger">{formatVnd(remaining)}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Payment instructions — hidden when already paid/waived */}
        {!isPaid && (
          <>
            {/* QR code */}
            {bank.bank_qr_image_base64 && bank.bank_qr_mime && (
              <div className="card flex flex-col items-center gap-3">
                <p className="text-xs text-muted font-medium self-start">Quét mã QR để thanh toán</p>
                <img
                  src={`data:${bank.bank_qr_mime};base64,${bank.bank_qr_image_base64}`}
                  alt="Mã QR thanh toán"
                  className="w-52 h-52 object-contain rounded-lg"
                />
              </div>
            )}

            {/* CK note */}
            {renderedNote && (
              <div className="card space-y-1.5">
                <div className="text-xs text-muted font-medium">Nội dung chuyển khoản</div>
                <div className="font-semibold text-sm break-words">{renderedNote}</div>
              </div>
            )}

            {/* Bank info */}
            {(bank.bank_name || bank.bank_account_number) && (
              <div className="card space-y-2.5">
                <div className="flex items-center gap-1.5 text-muted">
                  <Icon name="wallet" size={14} />
                  <span className="text-xs font-medium">Thông tin ngân hàng</span>
                </div>

                {bank.bank_name && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted">Ngân hàng</span>
                    <span className="font-medium">{bank.bank_name}</span>
                  </div>
                )}
                {bank.bank_account_name && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted">Chủ tài khoản</span>
                    <span className="font-medium">{bank.bank_account_name}</span>
                  </div>
                )}
                {bank.bank_account_number && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted">Số tài khoản</span>
                    <span className="font-mono font-semibold tnum">{bank.bank_account_number}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Admin payment note */}
        {participant.payment_note && (
          <div className="card space-y-1">
            <div className="text-xs text-muted font-medium">Ghi chú từ ban tổ chức</div>
            <p className="text-sm">{participant.payment_note}</p>
          </div>
        )}

        {/* Session info */}
        <div className="card space-y-2">
          <div className="flex items-center gap-1.5 text-muted">
            <Icon name="calendar" size={14} />
            <span className="text-xs font-medium">Thông tin buổi đánh</span>
          </div>
          <div className="text-sm font-semibold">{session.title}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Icon name="calendar" size={12} /> {formatDate(session.session_date)}
            </span>
            {session.location && (
              <span className="flex items-center gap-1">
                <Icon name="mapPin" size={12} /> {session.location}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
