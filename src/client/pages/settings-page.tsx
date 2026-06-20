// Settings: Club / Payment / QR / đổi mật khẩu / backup (BackupSection nối ở P10).
import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiClientError } from '../api/client.ts';
import { QrUploader } from '../components/qr-uploader.tsx';
import { BackupSection } from '../components/backup-section.tsx';
import type { Settings } from '../../shared/types.ts';

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
      <h1 className="text-2xl">Cài đặt</h1>

      <form onSubmit={onSave} className="space-y-5">
        <section className="card space-y-3">
          <h2 className="text-lg">Câu lạc bộ</h2>
          <div><label className="label">Tên CLB</label><input className="input" value={s.club_name} onChange={f('club_name')} /></div>
          <div><label className="label">Người tổ chức</label><input className="input" value={s.host_name ?? ''} onChange={f('host_name')} /></div>
        </section>

        <section className="card space-y-3">
          <h2 className="text-lg">Thanh toán</h2>
          <div><label className="label">Ngân hàng</label><input className="input" value={s.bank_name ?? ''} onChange={f('bank_name')} /></div>
          <div><label className="label">Chủ tài khoản</label><input className="input" value={s.bank_account_name ?? ''} onChange={f('bank_account_name')} /></div>
          <div><label className="label">Số tài khoản</label><input className="input" value={s.bank_account_number ?? ''} onChange={f('bank_account_number')} /></div>
          <div><label className="label">Mẫu nội dung CK</label><input className="input" value={s.payment_note_template} onChange={f('payment_note_template')} /><p className="text-xs text-muted mt-1">{'{date}'} = ngày, {'{name}'} = tên người chơi</p></div>
          <div><label className="label">Làm tròn (VND)</label><input className="input" type="number" value={s.default_rounding} onChange={(e) => setS({ ...s, default_rounding: parseInt(e.target.value || '0', 10) })} /></div>
        </section>

        <section className="card space-y-3">
          <h2 className="text-lg">Mã QR ngân hàng</h2>
          <QrUploader
            base64={displayQr?.base64 ?? null}
            mime={displayQr?.mime ?? null}
            onChange={(base64, mime) => { setQrDraft({ base64, mime }); setClearQr(false); }}
            onClear={() => { setQrDraft(null); setClearQr(true); }}
          />
        </section>

        {msg && <p className="text-sm text-primary">{msg}</p>}
        <button type="submit" className="btn-primary w-full">Lưu cài đặt</button>
      </form>

      <PasswordSection />
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
      <h2 className="text-lg">Đổi mật khẩu</h2>
      <div><label className="label">Mật khẩu hiện tại</label><input type="password" className="input" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></div>
      <div><label className="label">Mật khẩu mới</label><input type="password" className="input" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></div>
      {msg && <p className="text-sm text-primary">{msg}</p>}
      <button type="submit" className="btn-secondary">Đổi mật khẩu</button>
    </form>
  );
}
