// ShareBillButton: navigator.share with clipboard fallback.
// Props: billUrl (direct) OR participantId (fetched from API).
import { useState } from 'react';
import { api, ApiClientError } from '../api/client.ts';
import { Icon } from './icon.tsx';

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
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [noLink, setNoLink] = useState(false);
  const [errShare, setErrShare] = useState(false);

  const flashCopied = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Nút Copy riêng cho desktop (constraint: luôn có cách copy link rõ ràng)
  const onCopy = async () => {
    setBusy(true);
    setNoLink(false);
    setErrShare(false);
    try {
      const url = await resolveBillUrl(props);
      if (!url) {
        setNoLink(true);
        return;
      }
      await navigator.clipboard.writeText(url);
      flashCopied();
    } catch (e) {
      setErrShare(true);
      setTimeout(() => setErrShare(false), 2000);
      if (!(e instanceof ApiClientError)) console.error('share-bill-button:', e);
    } finally {
      setBusy(false);
    }
  };

  const onShare = async () => {
    setBusy(true);
    setNoLink(false);
    setErrShare(false);
    try {
      const url = await resolveBillUrl(props);
      if (!url) {
        setNoLink(true);
        return;
      }
      // Thử Web Share trước; nếu trình duyệt không hỗ trợ HOẶC share fail
      // (desktop) → fallback copy link. Bỏ qua khi user tự hủy (AbortError).
      let shared = false;
      if (navigator.share) {
        try {
          await navigator.share({ url });
          shared = true;
        } catch (shareErr) {
          if (shareErr instanceof DOMException && shareErr.name === 'AbortError') {
            shared = true; // user cancel — không cần fallback
          }
        }
      }
      if (!shared) {
        await navigator.clipboard.writeText(url);
        flashCopied();
      }
    } catch (e) {
      setErrShare(true);
      setTimeout(() => setErrShare(false), 2000);
      // Log for debugging without leaking to UI
      if (!(e instanceof ApiClientError)) console.error('share-bill-button:', e);
    } finally {
      setBusy(false);
    }
  };

  // Derive label from state flags
  const shareLabel = noLink ? 'Chưa có link' : errShare ? 'Lỗi chia sẻ' : 'Chia sẻ bill';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {/* Primary share action */}
        <button
          type="button"
          className="btn-primary flex-1"
          onClick={onShare}
          disabled={busy || noLink}
        >
          <Icon name="share" size={18} />
          {shareLabel}
        </button>
        {/* Copy-link luôn hiển thị cho desktop (không có Web Share) */}
        <button
          type="button"
          className="btn-secondary"
          onClick={onCopy}
          disabled={busy || noLink}
          aria-label="Copy link bill"
        >
          <Icon name="copy" size={16} />
          Copy
        </button>
      </div>

      {copied && (
        <div className="flex items-center justify-center gap-1.5 text-sm text-success">
          <Icon name="check" size={15} />
          Đã copy link!
        </div>
      )}
    </div>
  );
}
