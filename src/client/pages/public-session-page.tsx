// Public session page (/s/:token) — no auth, no AppShell.
// Shows session info + courts + link to join.
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, ApiClientError } from '../api/client.ts';
import { formatDate } from '../lib/format.ts';
import { Icon } from '../components/icon.tsx';
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

  // Loading
  if (!notFound && !data) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-canvas">
        <p className="text-sm text-muted">Đang tải…</p>
      </div>
    );
  }

  // Not-found — generic message
  if (notFound) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-canvas">
        <div className="card flex flex-col items-center text-center gap-3 py-10 w-full max-w-sm">
          <span className="flex items-center justify-center h-14 w-14 rounded-full bg-surface-sunken text-muted">
            <Icon name="calendar" size={26} />
          </span>
          <div className="space-y-1">
            <h1 className="page-title">Không tìm thấy</h1>
            <p className="text-sm text-muted">Link không hợp lệ hoặc đã hết hạn.</p>
          </div>
        </div>
      </div>
    );
  }

  const { session, courts } = data!;

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

        {/* Session header */}
        <div className="space-y-2">
          <h1 className="page-title">{session.title}</h1>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
            <span className="flex items-center gap-1.5">
              <Icon name="calendar" size={14} />
              {formatDate(session.session_date)}
            </span>
            {session.location && (
              <span className="flex items-center gap-1.5">
                <Icon name="mapPin" size={14} />
                {session.location}
              </span>
            )}
          </div>
        </div>

        {/* Địa chỉ + bản đồ — host gửi link để member nắm vị trí sân */}
        {session.location && (
          <div className="card space-y-3">
            <h2 className="section-title flex items-center gap-2">
              <Icon name="mapPin" size={16} className="text-muted" />
              Địa chỉ sân
            </h2>
            <p className="text-sm">{session.location}</p>
            <div className="overflow-hidden rounded-lg border border-hairline">
              <iframe
                title="Bản đồ sân"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(session.location)}&z=15&output=embed`}
                className="w-full h-48 border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(session.location)}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary w-full"
            >
              <Icon name="mapPin" size={16} />
              Mở Google Maps
            </a>
          </div>
        )}

        {/* Courts */}
        {courts.length > 0 && (
          <div className="card space-y-3">
            <h2 className="section-title flex items-center gap-2">
              <Icon name="home" size={16} className="text-muted" />
              Sân
            </h2>
            <div className="space-y-2">
              {courts.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm py-1 border-b border-hairline last:border-0">
                  <span className="font-medium">{c.name}</span>
                  {(c.start_time || c.end_time) && (
                    <span className="text-muted flex items-center gap-1">
                      <Icon name="clock" size={12} />
                      {c.start_time ?? '?'} – {c.end_time ?? '?'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA or closed notice */}
        {session.registration_enabled === 1 ? (
          <Link
            to={`/join/${session.public_token}`}
            className="btn-primary w-full"
          >
            <Icon name="users" size={18} />
            Đăng ký tham gia
          </Link>
        ) : (
          <div className="card flex items-center justify-center gap-2 py-4 text-sm text-muted">
            <Icon name="x" size={16} />
            Đăng ký đã đóng
          </div>
        )}
      </div>
    </div>
  );
}
