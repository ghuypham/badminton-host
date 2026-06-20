// Public report page (/r/:token) — no auth, no AppShell.
// Shows all-time participation stats: CLB members + guests (if returned by server).
// Privacy: server never returns money or phone; this page renders counts only.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiClientError } from '../api/client.ts';
import { Icon } from '../components/icon.tsx';

interface ParticipationEntry {
  name: string;
  sessionCount: number;
}

interface PublicReportResponse {
  club: { name: string };
  generatedAllTime: true;
  members: ParticipationEntry[];
  guests?: ParticipationEntry[];
}

// Avatar initials: last 2 words, first char each
const initials = (name: string) =>
  name.trim().split(/\s+/).slice(-2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

function RankList({ entries, emptyMsg }: { entries: ParticipationEntry[]; emptyMsg: string }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted text-center py-4">{emptyMsg}</p>;
  }
  return (
    <div className="space-y-2">
      {entries.map((e, i) => (
        <div key={`${e.name}-${i}`} className="row">
          <span className="avatar">{initials(e.name)}</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate text-sm">{e.name}</div>
          </div>
          <span className="badge">{e.sessionCount} buổi</span>
        </div>
      ))}
    </div>
  );
}

export function PublicReportPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicReportResponse | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) { setNotFound(true); return; }
    api
      .get<PublicReportResponse>(`/public/report/${token}`)
      .then(setData)
      .catch((e) => {
        if (e instanceof ApiClientError && e.status === 404) setNotFound(true);
        else setNotFound(true);
      });
  }, [token]);

  // Loading
  if (!notFound && !data) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-canvas">
        <p className="text-sm text-muted">Đang tải…</p>
      </div>
    );
  }

  // Not-found / disabled / wrong token — generic, no info leak
  if (notFound) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-canvas">
        <div className="card flex flex-col items-center text-center gap-3 py-10 w-full max-w-sm">
          <span className="flex items-center justify-center h-14 w-14 rounded-full bg-surface-sunken text-muted">
            <Icon name="users" size={26} />
          </span>
          <div className="space-y-1">
            <h1 className="page-title">Không tìm thấy</h1>
            <p className="text-sm text-muted">Link không hợp lệ hoặc đã hết hạn.</p>
          </div>
        </div>
      </div>
    );
  }

  const { club, members, guests } = data!;

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

        {/* Header */}
        <div className="space-y-1">
          <h1 className="page-title">Thống kê tham gia</h1>
          <p className="text-sm text-muted">{club.name} · Tất cả thời gian</p>
        </div>

        {/* CLB members section */}
        <section className="card space-y-3">
          <h2 className="section-title flex items-center gap-2">
            <Icon name="users" size={16} className="text-muted" />
            Thành viên CLB
          </h2>
          <RankList entries={members} emptyMsg="Chưa có dữ liệu thành viên." />
        </section>

        {/* Guests section — only rendered when server returns it (show_guests=1) */}
        {guests !== undefined && (
          <section className="card space-y-3">
            <h2 className="section-title flex items-center gap-2">
              <Icon name="users" size={16} className="text-muted" />
              Khách vãng lai
            </h2>
            <RankList entries={guests} emptyMsg="Chưa có khách vãng lai." />
          </section>
        )}
      </div>
    </div>
  );
}
