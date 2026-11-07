// Server-owned co-op rules. The standalone Game and its balance stay unchanged.
export const HEALTH_SCALE = Object.freeze([1, 2, 3.25, 4.5, 6]);
export function healthScale(players) {
  return HEALTH_SCALE[Math.max(0, Math.min(4, Math.floor(players) - 1))];
}
export function splitXP(total, ids) {
  if (!Number.isSafeInteger(total) || total < 0) throw Error('Invalid XP pool.');
  const ordered = [...new Set(ids)].sort();
  if (!ordered.length) return new Map();
  const base = Math.floor(total / ordered.length), remainder = total % ordered.length;
  return new Map(ordered.map((id, i) => [id, base + (i < remainder ? 1 : 0)]));
}
