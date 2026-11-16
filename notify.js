// Permissions (steps, location, alerts) and the prototype's pretend notifications.
// Real notifications that arrive while the app is fully closed need a server (Firebase, later).
// On iPhone, notifications only work after Safari > Share > Add to Home Screen (iOS 16.4+).

let reg = null;
export function initNotify() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').then((r) => { reg = r; }).catch(() => {});
  }
}

// ---------------- Asking for permission (each one must come from a tap) ----------------
export async function askMotion() {
  const M = window.DeviceMotionEvent;
  if (!M) return 'none';
  if (typeof M.requestPermission !== 'function') return 'granted'; // Android and older iPhones: no question needed
  try { return await M.requestPermission(); } catch { return 'denied'; }
}
export function askLocation() {
  return new Promise((res) => {
    if (!('geolocation' in navigator)) { res('none'); return; }
    navigator.geolocation.getCurrentPosition(() => res('granted'), (err) => res(err.code === 1 ? 'denied' : 'granted'),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  });
}
export async function askAlerts() {
  if (!('Notification' in window)) return 'none';
  if (Notification.permission !== 'default') return Notification.permission;
  try { return await Notification.requestPermission(); } catch { return 'denied'; }
}
export const alertsState = () => ('Notification' in window ? Notification.permission : 'none');

// ---------------- Showing one ----------------
// Shows a phone notification when allowed, otherwise falls back to the in-app toast.
export async function notify(title, body, { toast, tag } = {}) {
  if (alertsState() === 'granted') {
    try {
      const r = reg || (await navigator.serviceWorker?.ready);
      if (r) { await r.showNotification(title, { body, tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' }); return 'phone'; }
      new Notification(title, { body, tag, icon: 'icons/icon-192.png' });
      return 'phone';
    } catch {}
  }
  toast?.(`${title}: ${body}`);
  return 'toast';
}
