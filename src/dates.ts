export function formatDateIn(iso: string, timeZone: string): string {
  const opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
  try {
    return new Date(iso).toLocaleDateString("en-US", { ...opts, timeZone: timeZone || "UTC" });
  } catch {
    return new Date(iso).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
  }
}
