export const READING_PAGE_SIZE = 25;

/** 1-based page number from `?page=`, clamped into range; out-of-range or junk lands on page 1. */
export function readingPage(raw: string | undefined, total: number, pageSize = READING_PAGE_SIZE): { page: number; pages: number; start: number } {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const asked = Number(raw);
  const page = Number.isInteger(asked) && asked >= 1 && asked <= pages ? asked : 1;
  return { page, pages, start: (page - 1) * pageSize };
}
