// Provided by tslings and restored before each check, so don't edit this file.
// Date helpers, shared by the exercises of this chapter.

/** `format(new Date("2026-11-01T09:30:00Z"))` is `"2026-11-01"`, the day in UTC. */
export function format(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}
