// BackupSection: export (blob download) + import (file picker + confirm).
// Used inside settings-page.tsx.
import { useRef, useState } from 'react';
import { ApiClientError } from '../api/client.ts';

export function BackupSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const onExport = async () => {
    try {
      const res = await fetch('/api/admin/backup/export', { credentials: 'include' });
      if (!res.ok) throw new Error('Export thất bại');
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? 'backup.json';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMsg('Lỗi xuất dữ liệu');
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setPendingFile(f);
    e.target.value = '';
  };

  const onConfirmImport = async () => {
    if (!pendingFile) return;
    setImporting(true);
    setMsg('');
    try {
      const text = await pendingFile.text();
      const body = JSON.parse(text) as unknown;
      const res = await fetch('/api/admin/backup/import', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        setMsg(data.message ?? 'Import thất bại');
      } else {
        setMsg('Import thành công! Hãy tải lại trang để xem dữ liệu mới.');
      }
    } catch (e) {
      setMsg(e instanceof ApiClientError ? e.message : 'Lỗi đọc file');
    } finally {
      setImporting(false);
      setPendingFile(null);
    }
  };

  return (
    <section className="card space-y-3">
      <h2 className="text-lg">Sao lưu dữ liệu</h2>

      <button type="button" className="btn-secondary w-full" onClick={onExport}>
        Xuất dữ liệu (JSON)
      </button>

      <button type="button" className="btn-secondary w-full" onClick={() => fileRef.current?.click()}>
        Nhập dữ liệu từ file…
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFileChange} />

      {pendingFile && (
        <div className="space-y-2 border border-warning rounded-md p-3">
          <p className="text-sm text-ink">
            Nhập file: <strong>{pendingFile.name}</strong>. Thao tác này sẽ ghi đè toàn bộ dữ liệu hiện tại.
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn-primary flex-1" onClick={onConfirmImport} disabled={importing}>
              {importing ? 'Đang nhập…' : 'Xác nhận nhập'}
            </button>
            <button type="button" className="btn-ghost flex-1" onClick={() => setPendingFile(null)}>
              Hủy
            </button>
          </div>
        </div>
      )}

      {msg && <p className="text-sm text-primary">{msg}</p>}
    </section>
  );
}
