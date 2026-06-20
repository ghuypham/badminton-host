// Token generator: crypto.randomBytes(16) → base64url (128-bit).
// Retry wrapper chỉ bắt SQLITE_CONSTRAINT_UNIQUE, tối đa 5 lần rồi throw.
import { randomBytes } from 'node:crypto';

export function generateToken(): string {
  return randomBytes(16).toString('base64url');
}

// Gọi fn(token) để insert; nếu trùng UNIQUE thì thử lại.
// fn phải throw khi conflict (better-sqlite3 ném err.code = 'SQLITE_CONSTRAINT_UNIQUE').
export function generateUniqueToken(
  fn: (token: string) => void,
  maxAttempts = 5,
): string {
  for (let i = 0; i < maxAttempts; i++) {
    const token = generateToken();
    try {
      fn(token);
      return token;
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e?.code === 'SQLITE_CONSTRAINT_UNIQUE' && i < maxAttempts - 1) continue;
      throw err;
    }
  }
  // Không bao giờ đến đây nhưng TypeScript yêu cầu.
  throw new Error('generateUniqueToken: exhausted attempts');
}
