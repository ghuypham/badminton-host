// Render payment note template: thay {date} và {name} theo context.
// {date} → ddMM theo timezone Asia/Ho_Chi_Minh.
// {name} → tên người dùng.

export function renderNote(template: string, ctx: { date: string; name: string }): string {
  // Parse ISO date string rồi format theo VN timezone
  const date = new Date(ctx.date);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const ddMM = `${day}${month}`;

  return template.replace(/\{date\}/g, ddMM).replace(/\{name\}/g, ctx.name);
}
