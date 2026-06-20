// Public join page (/join/:token) — registration form with honeypot.
import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiClientError } from '../api/client.ts';
import { Icon } from '../components/icon.tsx';
import { SKILL_LEVELS } from '../lib/skill-levels.ts';

interface RegisterResult {
  ok: boolean;
  id: number;
  name: string;
  status: string;
}

type PageState = 'form' | 'success' | 'closed' | 'not_found' | 'rate_limited' | 'error';

// Shared outer wrapper: brand mark + centered narrow column
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-start px-4 py-8 bg-canvas">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand mark */}
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary text-on-primary">
            <Icon name="shuttlecock" size={22} />
          </span>
          <span className="font-display text-xl leading-none">Cầu lông</span>
        </div>
        {children}
      </div>
    </div>
  );
}

// Centered status card for terminal states (error, closed, success, etc.)
function StatusCard({
  iconName,
  iconClass,
  title,
  body,
}: {
  iconName: React.ComponentProps<typeof Icon>['name'];
  iconClass?: string;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center text-center gap-3 py-10">
      <span className={`flex items-center justify-center h-14 w-14 rounded-full ${iconClass ?? 'bg-surface-sunken text-muted'}`}>
        <Icon name={iconName} size={26} />
      </span>
      <div className="space-y-1">
        <h1 className="page-title">{title}</h1>
        <p className="text-sm text-muted">{body}</p>
      </div>
    </div>
  );
}

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
        // 400 có thể là "registration đã đóng" HOẶC lỗi nhập liệu → hiện message inline
        // để user sửa, không nhảy thẳng sang màn "đã đóng" gây hiểu lầm.
        setErrMsg(e.message);
      } else {
        setErrMsg('Lỗi kết nối');
      }
    } finally {
      setBusy(false);
    }
  };

  if (pageState === 'not_found') return (
    <PageShell>
      <StatusCard
        iconName="x"
        iconClass="bg-danger-soft text-danger"
        title="Không tìm thấy"
        body="Link không hợp lệ hoặc đã hết hạn."
      />
    </PageShell>
  );

  if (pageState === 'closed') return (
    <PageShell>
      <StatusCard
        iconName="x"
        title="Đăng ký đã đóng"
        body="Ban tổ chức đã đóng đăng ký buổi này."
      />
    </PageShell>
  );

  if (pageState === 'rate_limited') return (
    <PageShell>
      <StatusCard
        iconName="clock"
        title="Quá nhiều lần đăng ký"
        body="Vui lòng thử lại sau ít phút."
      />
    </PageShell>
  );

  if (pageState === 'error') return (
    <PageShell>
      <StatusCard
        iconName="x"
        title="Có lỗi xảy ra"
        body="Vui lòng thử lại."
      />
    </PageShell>
  );

  if (pageState === 'success') return (
    <PageShell>
      <StatusCard
        iconName="check"
        iconClass="bg-success-soft text-success"
        title="Đã đăng ký!"
        body={<>Xin chào <strong>{result?.name}</strong>, đăng ký của bạn đang chờ duyệt.</>}
      />
    </PageShell>
  );

  if (registrationEnabled === null) return (
    <PageShell>
      <p className="text-sm text-muted">Đang tải…</p>
    </PageShell>
  );

  return (
    <PageShell>
      <div className="card space-y-4">
        <div className="space-y-1">
          <h1 className="page-title">Đăng ký tham gia</h1>
          <p className="text-sm text-muted">Điền thông tin bên dưới để đăng ký.</p>
        </div>

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

        <form onSubmit={onSubmit} className="space-y-4">
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
            <label className="label">Trình độ</label>
            <select
              className="input"
              value={skill}
              onChange={(e) => setSkill(parseInt(e.target.value, 10))}
            >
              {SKILL_LEVELS.map((label, i) => (
                <option key={i} value={i}>{label}</option>
              ))}
            </select>
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

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Đang đăng ký…' : 'Đăng ký'}
          </button>
        </form>
      </div>
    </PageShell>
  );
}
