export function clampDays(value) {
  const safe = Number.isFinite(value) ? Math.floor(value) : 90;
  return Math.max(1, Math.min(safe, 3650));
}
