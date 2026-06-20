// Thang trình độ cầu lông phong trào VN (index thấp → cao). Lưu DB là integer index.
export const SKILL_LEVELS = [
  'Newbie',
  'Yếu -',
  'Yếu',
  'Yếu +',
  'Trung bình yếu',
  'Trung bình -',
  'Trung bình',
  'Trung bình +',
  'Khá -',
  'Khá',
  'Khá +',
] as const;

export const SKILL_MAX = SKILL_LEVELS.length - 1;

export function skillLabel(level: number): string {
  return SKILL_LEVELS[level] ?? `Lv.${level}`;
}
