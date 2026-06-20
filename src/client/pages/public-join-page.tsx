// Public join page (/join/:token) — registration form with honeypot.
import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiClientError } from '../api/client.ts';

interface RegisterResult {
  ok: boolean;
  id: number;
  name: string;
  status: string;
}

type PageState = 'form' | 'success' | 'closed' | 'not_found' | 'rate_limited' | 'error';

export function PublicJoinPage() {
  const { token } = useParams<{ token: string }>();
  const [pageState, setPageState] = useState<PageState>('form');
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);
  const [result, setResult] = useState<RegisterResult | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [skill, setSkill] = useState(0);
  const [note, setNote] = useState('');
  // Honeypot: must stay empty
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (!token) { setPageState('not_found'); return; }
    // Fetch session info to check registration status
    api
      .get<{ session: { registration_enabled: 0 | 1 } }>(`/public/sessions/${token}`)
      .then((d) => {
        if (d.session.registration_enabled === 0) setPageState('closed');
        else setRegistrationEnabled(true);
      })
      .catch((e) => {
        if (e instanceof ApiClientError && e.status === 404) setPageState('not_found');
        else setPageState('error');
      });
  }, [token]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setErrMsg('');
    try {
      const r = await api.post<RegisterResult>(`/public/sessions/${token}/register`, {
        name,
        phone: phone || null,
        skill_level: skill,
        note: note || null,
        website, // honeypot
      });
      setResult(r);
      setPageState('success');
    } catch (e) {
      if (e instanceof ApiClientError) {
        if (e.status === 429) { setPageState('rate_limited'); return; }
        if (e.status === 404) { setPageState('not_found'); return; }
        if (e.status === 400) { setPageState('closed'); return; }
        setErrMsg(e.message);
      } else {
        setErrMsg('Lỗi kết nối');
      }
    } finally {
      setBusy(false);
    }
  };

  const wrapper = (children: React.ReactNode) => (
    <div className="min-h-screen bg-canvas max-w-screen-sm mx-auto px-4 py-8">
      {children}
    </div>
  );

  if (pageState === 'not_found') return wrapper(
    <div className="text-center space-y-2 pt-16">
      <h1 className="text-2xl font-display">Không tìm thấy buổi đánh</h1>
      <p className="text-sm text-muted">Link không hợp lệ hoặc đã hết hạn.</p>
    </div>
  );

  if (pageState === 'closed') return wrapper(
    <div className="text-center space-y-2 pt-16">
      <h1 className="text-2xl font-display">Đăng ký đã đóng</h1>
      <p className="text-sm text-muted">Ban tổ chức đã đóng đăng ký buổi này.</p>
    </div>
  );

  if (pageState === 'rate_limited') return wrapper(
    <div className="text-center space-y-2 pt-16">
      <h1 className="text-2xl font-display">Quá nhiều lần đăng ký</h1>
      <p className="text-sm text-muted">Vui lòng thử lại sau ít phút.</p>
    </div>
  );

  if (pageState === 'error') return wrapper(
    <div className="text-center space-y-2 pt-16">
      <h1 className="text-2xl font-display">Có lỗi xảy ra</h1>
      <p className="text-sm text-muted">Vui lòng thử lại.</p>
    </div>
  );

  if (pageState === 'success') return wrapper(
    <div className="text-center space-y-3 pt-16">
      <h1 className="text-2xl font-display">Đã đăng ký!</h1>
      <p className="text-sm text-muted">
        Xin chào <strong>{result?.name}</strong>, đăng ký của bạn đang chờ duyệt.
      </p>
    </div>
  );

  if (registrationEnabled === null) return wrapper(<p className="text-muted">Đang tải…</p>);

  return wrapper(
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-2xl font-display">Đăng ký tham gia</h1>

      {/* Honeypot: visually hidden, bots fill it, humans don't */}
      <div style={{ display: 'none' }} aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div>
        <label className="label">Tên *</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          autoComplete="name"
        />
      </div>

      <div>
        <label className="label">Số điện thoại</label>
        <input
          className="input"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={20}
          autoComplete="tel"
        />
      </div>

      <div>
        <label className="label">Trình độ (0–5)</label>
        <input
          type="number"
          className="input"
          min={0}
          max={5}
          value={skill}
          onChange={(e) => setSkill(parseInt(e.target.value || '0', 10))}
        />
      </div>

      <div>
        <label className="label">Ghi chú</label>
        <input
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
        />
      </div>

      {errMsg && <p className="text-sm text-danger">{errMsg}</p>}

      <button type="submit" className="btn-primary w-full h-12" disabled={busy}>
        {busy ? 'Đang đăng ký…' : 'Đăng ký'}
      </button>
    </form>
  );
}
