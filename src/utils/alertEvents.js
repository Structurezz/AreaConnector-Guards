// Helpers for the `new_alert` socket event. The server sends the same event
// for a brand-new alert AND for status changes (payload has `action:
// 'acknowledged' | 'resolved'`), and it also echoes alerts back to whoever
// raised them. Only a brand-new alert from someone else should ever trigger
// the siren / full-screen popup.

export const isStatusUpdate = (alert) => !!alert?.action;

export const raiserIdOf = (alert) => String(alert?.residentId?._id || alert?.residentId || '');

export const isOwnAlert = (alert, userId) => !!userId && raiserIdOf(alert) === String(userId);

export const isIncomingAlert = (alert, userId) => !isStatusUpdate(alert) && !isOwnAlert(alert, userId);

// Insert or replace by _id, newest first.
export function upsertAlert(list, alert) {
  if (!alert?._id) return list;
  const i = list.findIndex((a) => a._id === alert._id);
  if (i === -1) return [alert, ...list];
  const next = list.slice();
  next[i] = { ...next[i], ...alert };
  return next;
}

export const unitLabelOf = (alert) => (alert?.unitId
  ? `${alert.unitId.block ? `Block ${alert.unitId.block} · ` : ''}Unit ${alert.unitId.unitNumber}`
  : null);
