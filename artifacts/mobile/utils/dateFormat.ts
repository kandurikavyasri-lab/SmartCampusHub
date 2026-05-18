/**
 * Indian date/time formatting utilities
 * Date:  DD/MM/YYYY
 * Time:  HH:MM (24-hour)
 */

export function formatIndianDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const dd   = String(d.getDate()).padStart(2, "0");
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatIndianDateTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const dd   = String(d.getDate()).padStart(2, "0");
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh   = String(d.getHours()).padStart(2, "0");
  const min  = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy}, ${hh}:${min}`;
}

export function formatTime24(time: string): string {
  // If already in HH:MM format, return as-is
  if (/^\d{2}:\d{2}$/.test(time)) return time;
  return time;
}

export function timeRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return formatIndianDate(iso);
}
