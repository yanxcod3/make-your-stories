// CSS imports
import '../styles/styles.css';

import App from './pages/app';
import { initPushToggle } from './data/push';

// Service Worker Registration
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });

    // Auto-update check every hour
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

    return registration;
  } catch (error) {
    return null;
  }
}

// PWA Install Prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('Install prompt available');
  e.preventDefault();
  deferredPrompt = e;
  
  // Show custom install button
  showInstallPromotion();
});

function showInstallPromotion() {
  const installButton = document.createElement('button');
  installButton.id = 'install-button';
  installButton.className = 'install-button';
  installButton.innerHTML = 'Unduh Aplikasi';
  installButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 24px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
    box-shadow: 0 4px 6px rgba(0,0,0,0.2);
    z-index: 1000;
  `;

  installButton.addEventListener('click', async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response to install prompt: ${outcome}`);
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    deferredPrompt = null;
    installButton.remove();
  });

  installButton.addEventListener('mouseenter', () => {
    installButton.style.transform = 'scale(1.05)';
  });

  installButton.addEventListener('mouseleave', () => {
    installButton.style.transform = 'scale(1)';
  });

  document.body.appendChild(installButton);
}

// Track installation
window.addEventListener('appinstalled', () => {
  console.log('PWA was installed successfully');
  deferredPrompt = null;
  
  // Remove install button if exists
  const installButton = document.getElementById('install-button');
  if (installButton) {
    installButton.remove();
  }
});

// Check if running as PWA
function isPWA() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone === true;
}

if (isPWA()) {
  console.log('Running as PWA');
} else {
  console.log('Running in browser');
}

document.addEventListener('DOMContentLoaded', async () => {
  // Register Service Worker first
  await registerServiceWorker();

  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });

  const performPageTransition = async () => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        app.renderPage();
      });
    } else {
      await app.renderPage();
    }
  };

  await performPageTransition();

  window.addEventListener('hashchange', async () => {
    await performPageTransition();
  });

  // Initialize push toggle UI; module will register service worker as needed
  try {
    // initPushToggle returns an object containing refresh method; we don't strictly need it here
    await initPushToggle('push-toggle');
  } catch (err) {
    // swallow errors, push is optional
    // console.error('Push init error', err);
  }
});

