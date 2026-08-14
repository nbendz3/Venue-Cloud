/**
 * Date-only helpers.
 *
 * The API stores calendar dates ("2026-05-23") as plain strings with no
 * timezone component. Passing such a string straight into `new Date()` makes
 * JavaScript interpret it as UTC midnight; formatting that in any timezone west
 * of UTC then renders the PREVIOUS day. That is why an event stored as
 * May 23-25 was showing as May 22-24 on the events list and detail header.
 *
 * Always route calendar dates through these helpers. Reserve `new Date()` for
 * true instants such as createdAt / updatedAt, which really are timezone-aware.
 */

export type DateOnly = string; // "YYYY-MM-DD"

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parses "YYYY-MM-DD" into a Date anchored at LOCAL midnight, so the calendar
 * day never shifts. Values that already carry a time component are passed
 * through to the normal Date constructor.
 */
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = DATE_ONLY.exec(value.trim());
  if (match) {
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Serialises a Date back to "YYYY-MM-DD" using its LOCAL calendar day. */
export function toDateOnly(date: Date | null | undefined): DateOnly | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const PRESETS = {
  /** 5/23/2026 */
  short: { year: "numeric", month: "numeric", day: "numeric" },
  /** May 23, 2026 */
  medium: { year: "numeric", month: "short", day: "numeric" },
  /** May 23, 2026 */
  long: { year: "numeric", month: "long", day: "numeric" },
  /** Saturday, May 23, 2026 */
  full: { weekday: "long", year: "numeric", month: "long", day: "numeric" },
  /** May 23 */
  dayMonth: { month: "short", day: "numeric" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

export type DateStyle = keyof typeof PRESETS;

/** Formats a date-only string for display. Returns `fallback` when empty. */
export function formatDateOnly(
  value: string | null | undefined,
  style: DateStyle = "medium",
  fallback = "—"
): string {
  const date = parseDateOnly(value);
  if (!date) return fallback;
  return date.toLocaleDateString("en-US", PRESETS[style]);
}

/**
 * Formats a start/end pair, collapsing a single-day range to one date.
 * e.g. "May 23, 2026 – May 25, 2026" or just "May 23, 2026".
 */
export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
  style: DateStyle = "medium",
  fallback = "TBD"
): string {
  const s = formatDateOnly(start, style, "");
  if (!s) return fallback;
  const e = formatDateOnly(end, style, "");
  if (!e || e === s) return s;
  return `${s} – ${e}`;
}

/** True when the date-only value is strictly before today (local). */
export function isPastDateOnly(value: string | null | undefined): boolean {
  const date = parseDateOnly(value);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

/** Midnight-normalised copy, for day-level comparisons in calendar grids. */
export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Today as a date-only string, for defaulting form inputs. */
export function todayDateOnly(): DateOnly {
  return toDateOnly(new Date())!;
}

/** Inclusive day count between two date-only values; null when unparseable. */
export function daysBetween(start: string | null | undefined, end: string | null | undefined): number | null {
  const s = parseDateOnly(start);
  const e = parseDateOnly(end);
  if (!s || !e) return null;
  return Math.round((startOfDay(e).getTime() - startOfDay(s).getTime()) / 86_400_000);
}
