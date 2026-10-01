// Lightweight offline cache + mutation queue for the guard app.
// All data is scoped by estateId so switching estates doesn't leak state.

const VISITORS_KEY = (estateId) => `ac_sec_visitors_v1:${estateId || 'nil'}`;
const QUEUE_KEY    = 'ac_sec_mutation_queue_v1';

// ── Visitor list cache (last successful fetch) ──────────────────────────────

export function saveVisitorsCache(estateId, visitors) {
  try {
    localStorage.setItem(
      VISITORS_KEY(estateId),
      JSON.stringify({ updatedAt: Date.now(), list: visitors || [] }),
    );
  } catch { /* quota/private mode — fail silently */ }
}

export function readVisitorsCache(estateId) {
  try {
    const raw = localStorage.getItem(VISITORS_KEY(estateId));
    if (!raw) return { updatedAt: 0, list: [] };
    return JSON.parse(raw);
  } catch {
    return { updatedAt: 0, list: [] };
  }
}

// Returns a visitor object compatible with the server's /verify response
// shape, or null if nothing matches. Reflects any queued mutations so the
// UI stays coherent across offline check-ins.
export function findCachedVisitorByCode(estateId, code) {
  const { list } = readVisitorsCache(estateId);
  const needle = String(code || '').trim().toUpperCase();
  if (!needle) return null;
  const match = list.find((v) => v.visitorCode === needle);
  if (!match) return null;
  // Apply pending queued updates on top
  const now = new Date().toISOString();
  const queued = readQueue().filter((q) => q.visitorId === match._id);
  let v = { ...match };
  for (const q of queued) {
    if (q.type === 'checkIn')  { v.status = 'checked-in';  v.entryTime = v.entryTime || now; }
    if (q.type === 'checkOut') { v.status = 'checked-out'; v.exitTime  = v.exitTime  || now; }
  }
  return v;
}

// ── Mutation queue (fires in order when back online) ────────────────────────

export function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch { /* ignore */ }
}

export function enqueueMutation(action) {
  const queue = readQueue();
  queue.push({
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    enqueuedAt: Date.now(),
  });
  writeQueue(queue);
  return queue.length;
}

export function removeFromQueue(id) {
  writeQueue(readQueue().filter((q) => q.id !== id));
}

export function clearQueue() {
  writeQueue([]);
}
