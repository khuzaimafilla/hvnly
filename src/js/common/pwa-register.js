/**
 * PWA Service Worker Registration Module
 */
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => console.log('[PWA] ServiceWorker registered:', reg.scope))
        .catch((err) => console.warn('[PWA] ServiceWorker registration failed:', err));
    });
  }
}
