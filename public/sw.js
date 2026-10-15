/* AreaConnect service worker — rings incoming calls and shows missed calls
 * when the app is closed or in the background (Web Push). */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

const RING_VIBRATE = [900, 300, 900, 300, 900, 300, 900, 300, 900];
const ended = new Set(); // calls we know have stopped ringing (this SW's lifetime)

async function appIsVisible() {
  const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  return wins.some((w) => w.visibilityState === 'visible');
}

async function closeTag(tag) {
  const list = await self.registration.getNotifications({ tag });
  list.forEach((n) => n.close());
}

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { return; }
  event.waitUntil((async () => {
    const tag = `call-${d.callId}`;
    if (d.type === 'call_incoming') {
      if (ended.has(d.callId)) return;
      // The open app is already ringing on screen — don't double up.
      if (await appIsVisible()) return;
      const from = d.from || {};
      await self.registration.showNotification(`📞 ${from.name || 'Incoming call'}`, {
        body: d.kind === 'emergency' ? 'Emergency call — tap to answer' : `Incoming call${from.unit ? ` · ${from.unit}` : ''} — tap to answer`,
        tag, renotify: true, requireInteraction: true, silent: false,
        vibrate: RING_VIBRATE,
        icon: from.photo || '/icon-192.png', badge: '/icon-192.png',
        actions: [{ action: 'answer', title: 'Answer' }, { action: 'decline', title: 'Decline' }],
        data: d, timestamp: d.sentAt || Date.now(),
      });
      return;
    }
    if (d.type === 'call_ended') {
      ended.add(d.callId);
      await closeTag(tag);
      if (!d.missed) return;
      const from = d.from || {};
      await self.registration.showNotification('Missed call', {
        body: `${from.name || 'Someone'} tried to call you`,
        tag, renotify: true, icon: from.photo || '/icon-192.png', badge: '/icon-192.png',
        data: { ...d, url: d.url || '/' },
      });
      return;
    }
    if (d.title) {
      await self.registration.showNotification(d.title, { body: d.body || '', tag: d.tag, icon: '/icon-192.png', data: d });
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  const n = event.notification;
  const d = n.data || {};
  n.close();
  event.waitUntil((async () => {
    if (event.action === 'decline' && d.type === 'call_incoming') {
      ended.add(d.callId);
      try {
        await fetch(`${d.api}/calls/${d.callId}/push-decline`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: d.declineToken }),
        });
      } catch { /* offline — it'll time out as missed */ }
      return;
    }
    const url = d.type === 'call_incoming' ? `/?incoming=${d.callId}` : (d.url || '/');
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const win = wins[0];
    if (win) {
      win.postMessage({ type: d.type === 'call_incoming' ? 'call:open_incoming' : 'push:open', callId: d.callId });
      try { await win.focus(); } catch { /* not allowed */ }
      return;
    }
    await self.clients.openWindow(url);
  })());
});
