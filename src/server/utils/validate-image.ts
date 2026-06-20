// Validate ảnh QR upload: whitelist mime + size ≤ 2MB tính từ base64.
import { badRequest } from './http-error.ts';

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const MAX_BYTES = 2 * 1024 * 1024;

// Ước lượng số byte gốc từ độ dài chuỗi base64 (bỏ data-URL prefix nếu có).
function base64Bytes(b64: string): number {
  const data = b64.includes(',') ? b64.slice(b64.indexOf(',') + 1) : b64;
  const padding = (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0);
  return Math.floor((data.length * 3) / 4) - padding;
}

export function validateQrImage(base64: string, mime: string): void {
  if (!ALLOWED_MIME.has(mime)) {
    throw badRequest('Định dạng ảnh không hợp lệ. Chỉ chấp nhận PNG, JPG, WebP.');
  }
  if (base64Bytes(base64) > MAX_BYTES) {
    throw badRequest('Ảnh quá lớn. Tối đa 2MB.');
  }
}
