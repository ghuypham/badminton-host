// Settings: Club / Payment / QR / đổi mật khẩu / backup / public report share.
import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiClientError } from '../api/client.ts';
import { QrUploader } from '../components/qr-uploader.tsx';
import { BackupSection } from '../components/backup-section.tsx';
import { Icon } from '../components/icon.tsx';
import type { Settings } from '../../shared/types.ts';

// ── Public report share state ─────────────────────────────────────────────────

interface ReportShareState {
  enabled: boolean;
  token: string | null;
  show_guests: boolean;
}

export function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [msg, setMsg] = useState('');
  const [qrDraft, setQrDraft] = useState<{ base64: string; mime: string } | null>(null);
  const [clearQr, setClearQr] = useState(false);

  useEffect(() => {
    api.get<Settings>('/admin/settings').then(setS);
  }, []);

  if (!s) return <p className="text-muted">Đang tải…</p>;

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      const updated = await api.put<Settings>('/admin/settings', {
        club_name: s.club_name,
        host_name: s.host_name,
        bank_name: s.bank_name,
        bank_account_name: s.bank_account_name,
        bank_account_number: s.bank_account_number,
        payment_note_template: s.payment_note_template,
        default_rounding: s.default_rounding,
        clear_qr: clearQr,
        bank_qr_image_base64: qrDraft?.base64,
        bank_qr_mime: qrDraft?.mime,
      });
      setS(updated);
      setQrDraft(null);
      setClearQr(false);
      setMsg('Đã lưu.');
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Lỗi lưu');
    }
  };

  const f = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setS({ ...s, [k]: e.target.value });

  const displayQr = qrDraft
    ? { base64: qrDraft.base64, mime: qrDraft.mime }
    : clearQr
      ? null
      : s.bank_qr_image_base64 && s.bank_qr_mime
        ? { base64: s.bank_qr_image_base64, mime: s.bank_qr_mime }
        : null;

  return (
    <div className="space-y-6">
      <h1 className="page-title">Cài đặt</h1>

      <form onSubmit={onSave} className="space-y-4">
        {/* Club info */}
        <section className="card space-y-3">
          <h2 className="section-title">Câu lạc bộ</h2>
          <div>
            <label className="label">Tên CLB</label>
            <input className="input" value={s.club_name} onChange={f('club_name')} />
          </div>
          <div>
            <label className="label">Người tổ chức</label>
            <input className="input" value={s.host_name ?? ''} onChange={f('host_name')} />
          </div>
        </section>

        {/* Payment info */}
        <section className="card space-y-3">
          <h2 className="section-title">Thanh toán</h2>
          <div>
            <label className="label">Ngân hàng</label>
            <input className="input" value={s.bank_name ?? ''} onChange={f('bank_name')} />
          </div>
          <div>
            <label className="label">Chủ tài khoản</label>
            <input className="input" value={s.bank_account_name ?? ''} onChange={f('bank_account_name')} />
          </div>
          <div>
            <label className="label">Số tài khoản</label>
            <input className="input" value={s.bank_account_number ?? ''} onChange={f('bank_account_number')} />
          </div>
          <div>
            <label className="label">Mẫu nội dung CK</label>
            <input className="input" value={s.payment_note_template} onChange={f('payment_note_template')} />
            <p className="helper">{'{date}'} = ngày, {'{name}'} = tên người chơi</p>
          </div>
          <div>
            <label className="label">Làm tròn (VND)</label>
            <input
              className="input"
              type="number"
              value={s.default_rounding}
              onChange={(e) => setS({ ...s, default_rounding: parseInt(e.target.value || '0', 10) })}
            />
          </div>
        </section>

        {/* QR code */}
        <section className="card space-y-3">
          <h2 className="section-title">Mã QR ngân hàng</h2>
          <QrUploader
            base64={displayQr?.base64 ?? null}
            mime={displayQr?.mime ?? null}
            onChange={(base64, mime) => { setQrDraft({ base64, mime }); setClearQr(false); }}
            onClear={() => { setQrDraft(null); setClearQr(true); }}
          />
        </section>

        {msg && <p className="text-sm text-primary">{msg}</p>}
        <button type="submit" className="btn-primary w-full">
          <Icon name="check" size={16} /> Lưu cài đặt
        </button>
      </form>

      <PasswordSection />
      <ReportShareSection />
      <BackupSection />
    </div>
  );
}

function PasswordSection() {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      await api.put('/admin/settings/password', { current_password: cur, new_password: next });
      setCur(''); setNext('');
      setMsg('Đã đổi mật khẩu.');
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Lỗi');
    }
  };

  return (
    <form onSubmit={onSubmit} className="card space-y-3">
      <h2 className="section-title">Đổi mật khẩu</h2>
      <div>
        <label className="label">Mật khẩu hiện tại</label>
        <input type="password" className="input" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
      </div>
      <div>
        <label className="label">Mật khẩu mới</label>
        <input type="password" className="input" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
      </div>
      {msg && <p className="text-sm text-primary">{msg}</p>}
      <button type="submit" className="btn-secondary">Đổi mật khẩu</button>
    </form>
  );
}

// ── Report share section ──────────────────────────────────────────────────────

function ReportShareSection() {
  const [state, setState] = useState<ReportShareState | null>(null);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get<ReportShareState>('/admin/report-share').then(setState).catch(() => {});
  }, []);

  if (!state) return null;

  const publicUrl = state.token ? `${window.location.origin}/r/${state.token}` : null;

  const toggleEnabled = async () => {
    setMsg('');
    try {
      const next = await api.put<ReportShareState>('/admin/report-share/enable', {
        enabled: !state.enabled,
      });
      setState(next);
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Lỗi');
    }
  };

  const toggleGuests = async () => {
    setMsg('');
    try {
      const next = await api.put<ReportShareState>('/admin/report-share/guests', {
        show: !state.show_guests,
      });
      setState(next);
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Lỗi');
    }
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select input text
    }
  };

  const shareLink = async () => {
    if (!publicUrl) return;
    if (navigator.share) {
      await navigator.share({ title: 'Báo cáo tham gia cầu lông', url: publicUrl });
    } else {
      await copyLink();
    }
  };

  return (
    <section className="card space-y-3">
      <h2 className="section-title">Chia sẻ báo cáo</h2>
      <p className="text-xs text-muted">
        Tạo link công khai để thành viên xem thống kê số buổi tham gia (không hiển thị tiền hoặc SĐT).
      </p>

      {/* Enable toggle */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">Bật link công khai</span>
        <button
          type="button"
          onClick={toggleEnabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            state.enabled ? 'bg-primary' : 'bg-surface-sunken'
          }`}
          aria-pressed={state.enabled}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              state.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Link + actions — visible only when enabled */}
      {state.enabled && publicUrl && (
        <>
          <div className="flex gap-2">
            <input
              readOnly
              value={publicUrl}
              className="input flex-1 text-xs font-mono truncate"
              onFocus={(e) => e.target.select()}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary btn-sm flex-1" onClick={copyLink}>
              <Icon name="copy" size={14} />
              {copied ? 'Đã chép!' : 'Sao chép'}
            </button>
            <button type="button" className="btn-secondary btn-sm flex-1" onClick={shareLink}>
              <Icon name="share" size={14} />
              Chia sẻ
            </button>
          </div>

          {/* Show guests toggle */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-hairline">
            <span className="text-sm">Hiện khách vãng lai</span>
            <button
              type="button"
              onClick={toggleGuests}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                state.show_guests ? 'bg-primary' : 'bg-surface-sunken'
              }`}
              aria-pressed={state.show_guests}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  state.show_guests ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </>
      )}

      {msg && <p className="text-sm text-danger">{msg}</p>}
    </section>
  );
}
