// Sanitize text input ở boundary: trim + bỏ ký tự control.
// Output luôn được text-escape ở React (cấm dangerouslySetInnerHTML toàn app).

// Dùng RegExp constructor để tránh nhúng byte control thật vào source.
const CONTROL_CHARS = new RegExp('[\\x00-\\x1F\\x7F]', 'g');

export function sanitizeText(input: string): string {
  return input.replace(CONTROL_CHARS, '').trim();
}

export function sanitizeOptional(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  const s = sanitizeText(input);
  return s === '' ? null : s;
}
