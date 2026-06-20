// ShareBillButton: navigator.share with clipboard fallback.
// Props: billUrl (direct) OR participantId (fetched from API).
import { useState } from 'react';
import { api, ApiClientError } from '../api/client.ts';

interface PropsWithUrl {
  billUrl: string;
  participantId?: never;
}
interface PropsWithId {
  participantId: number;
  billUrl?: never;
}
type Props = PropsWithUrl | PropsWithId;

async function resolveBillUrl(props: Props): Promise<string | null> {
  if (props.billUrl !== undefined) return props.billUrl;
  const res = await api.get<{ billUrl: string | null }>(`/admin/participants/${props.participantId}/bill-link`);
  const raw = res.billUrl;
  if (!raw) return null;
  // If server returned a path (not absolute URL), prefix origin
  if (raw.startsWith('/')) return `${window.location.origin}${raw}`;
  return raw;
}

export function ShareBillButton(props: Props) {
  const [label, setLabel] = useState('Chia sẻ hóa đơn');
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    try {
      const url = await resolveBillUrl(props);
      if (!url) {
        setLabel('Chưa có link');
        return;
      }
      if (navigator.share) {
        await navigator.share({ url });
      } else {
        await navigator.clipboard.writeText(url);
        setLabel('Đã copy!');
        setTimeout(() => setLabel('Chia sẻ hóa đơn'), 2000);
      }
    } catch (e) {
      if (e instanceof ApiClientError) {
        setLabel('Lỗi lấy link');
      }
      // Ignore share abort (user cancelled)
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className="btn-secondary text-xs h-8 px-3" onClick={onClick} disabled={busy}>
      {label}
    </button>
  );
}
