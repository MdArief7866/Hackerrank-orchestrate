export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function dateDiffDays(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}

export function isAfter(a: Date, b: Date): boolean {
  return a.getTime() > b.getTime();
}

export function isSameOrBefore(a: Date, b: Date): boolean {
  return a.getTime() <= b.getTime();
}

export function isSameOrAfter(a: Date, b: Date): boolean {
  return a.getTime() >= b.getTime();
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}

export function maxDate(a: Date, b: Date): Date {
  return a.getTime() > b.getTime() ? a : b;
}

export function minDate(a: Date, b: Date): Date {
  return a.getTime() < b.getTime() ? a : b;
}
