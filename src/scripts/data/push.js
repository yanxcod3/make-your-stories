import CONFIG from '../config';
const KEY = CONFIG.VAPID_PUBLIC_KEY;

const urlBase64ToUint8Array = (base64) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Fixed = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Fixed);
  return Uint8Array.from([...raw].map(ch => ch.charCodeAt(0)));
};

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch (err) {
    console.error('SW registration failed:', err);
    return null;
  }
}

async function getSubscription(reg) {
  return reg?.pushManager?.getSubscription() ?? null;
}

async function subscribePush(reg) {
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(KEY),
  });
}

async function sendSubscriptionToServer(sub, token) {
  const raw = sub.toJSON ? sub.toJSON() : {};
  const payload = {
    endpoint: raw.endpoint || sub.endpoint,
    keys: raw.keys || {
      p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh') || []))),
      auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth') || []))),
    },
  };

  const res = await fetch(`${CONFIG.BASE_URL}/notifications/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
}

async function unsubscribeOnServer(endpoint, token) {
  const res = await fetch(`${CONFIG.BASE_URL}/notifications/subscribe`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ endpoint }),
  });
  return res.json();
}

async function initPushToggle(btnId = 'push-toggle') {
  const btn = document.getElementById(btnId);
  if (!btn || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

  const token = localStorage.getItem('token');
  if (!token) return (btn.style.display = 'none');

  const reg = await registerServiceWorker();
  if (!reg) return;

  async function updateButton() {
    const sub = await getSubscription(reg);
    btn.textContent = sub ? 'Unsubscribe' : 'Subscribe';
    btn.style.display = 'inline-block';
  }

  btn.onclick = async () => {
    const sub = await getSubscription(reg);
    try {
      if (sub) {
        await sub.unsubscribe();
        const res = await unsubscribeOnServer(sub.endpoint, token);
        localStorage.removeItem('pushSubscribed');
        alert(res.message);
      } else {
        const newSub = await subscribePush(reg);
        const res = await sendSubscriptionToServer(newSub, token);
        localStorage.setItem('pushSubscribed', 'true');
        alert(res.message);
      }
      updateButton();
    } catch (e) {
      console.error(e);
      alert('Push operation failed.');
    }
  };

  await updateButton();

  // Re-sync on login/logout
  if (!window.__pushAuthListenerAdded) {
    window.__pushAuthListenerAdded = true;
    document.addEventListener('authchange', () => updateButton());
  }

  return { refresh: updateButton };
}

export {
  registerServiceWorker,
  subscribePush,
  sendSubscriptionToServer,
  unsubscribeOnServer,
  initPushToggle,
};
