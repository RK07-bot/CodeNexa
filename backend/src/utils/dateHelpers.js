// the browser sends its own timezone, so "today" matches the admin's calendar
export const resolveTimezone = (tz) => {
  if (typeof tz !== "string" || !tz) return "UTC";

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
};

// "2026-10-31" in the given timezone
export const dayKey = (date, timeZone) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

// moves a "YYYY-MM-DD" key forward or backward by whole days
export const addDays = (key, amount) => {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};