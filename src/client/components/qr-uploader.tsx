// QR uploader: FileReader → base64 → preview. Báo base64+mime lên parent.
import { useRef } from 'react';

interface Props {
  base64: string | null;
  mime: string | null;
  onChange: (base64: string, mime: string) => void;
  onClear: () => void;
}

export function QrUploader({ base64, mime, onChange, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const b64 = result.includes(',') ? result.slice(result.indexOf(',') + 1) : result;
      onChange(b64, file.type);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      {base64 && mime ? (
        <div className="space-y-3">
          <img
            src={`data:${mime};base64,${base64}`}
            alt="QR ngân hàng"
            className="w-48 h-48 object-contain rounded-lg border border-hairline bg-white"
          />
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()}>Thay QR</button>
            <button type="button" className="btn-ghost text-danger" onClick={onClear}>Xóa QR</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()}>
          Tải QR lên
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
