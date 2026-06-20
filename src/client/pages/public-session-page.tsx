// Public session page (/s/:token) — no auth, no AppShell.
// Shows session info + courts + link to join.
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, ApiClientError } from '../api/client.ts';
import { formatDate } from '../lib/format.ts';
import type { SessionCourt } from '../../shared/types.ts';

interface PublicSession {
  id: number;
  title: string;
  session_date: string;
  location: string | null;
  status: string;
  public_token: string;
  registration_enabled: 0 | 1;
}

interface PublicSessionResponse {
  session: PublicSession;
  courts: Pick<SessionCourt, 'id' | 'name' | 'start_time' | 'end_time' | 'cost'>[];
}

export function PublicSessionPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicSessionResponse | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) { setNotFound(true); return; }
    api
      .get<PublicSessionResponse>(`/public/sessions/${token}`)
      .then(setData)
      .catch((e) => {
        if (e instanceof ApiClientError && e.status === 404) setNotFound(true);
        else setNotFound(true);
      });
  }, [token]);

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-display">Không tìm thấy buổi đánh</h1>
          <p className="text-sm text-muted">Link không hợp lệ hoặc đã hết hạn.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Đang tải…</p>
      </div>
    );
  }

  const { session, courts } = data;

  return (
    <div className="min-h-screen bg-canvas max-w-screen-sm mx-auto px-4 py-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-display">{session.title}</h1>
        <div className="text-sm text-muted">
          {formatDate(session.session_date)}
          {session.location ? ` · ${session.location}` : ''}
        </div>
      </header>

      {courts.length > 0 && (
        <section className="card space-y-2">
          <h2 className="text-base font-medium">Sân</h2>
          {courts.map((c) => (
            <div key={c.id} className="flex justify-between text-sm">
              <span>{c.name}</span>
              {(c.start_time || c.end_time) && (
                <span className="text-muted">{c.start_time ?? '?'} – {c.end_time ?? '?'}</span>
              )}
            </div>
          ))}
        </section>
      )}

      {session.registration_enabled === 1 ? (
        <Link
          to={`/join/${session.public_token}`}
          className="btn-primary w-full flex items-center justify-center h-12 text-base"
        >
          Đăng ký tham gia
        </Link>
      ) : (
        <div className="card text-center text-sm text-muted">
          Đăng ký đã đóng
        </div>
      )}
    </div>
  );
}
