// Register service worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration);
      })
      .catch((error) => {
        console.log('❌ Service Worker registration failed:', error);
      });
  });
}

// PWA Install Prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event for later use
  deferredPrompt = e;
  // Show the install button
  showInstallPrompt();
});

window.addEventListener('appinstalled', () => {
  console.log('✅ PWA was installed');
  deferredPrompt = null;
  hideInstallPrompt();
});

function showInstallPrompt() {
  const installButton = document.getElementById('install-app-btn');
  if (installButton) {
    installButton.style.display = 'flex';
  }
}

function hideInstallPrompt() {
  const installButton = document.getElementById('install-app-btn');
  if (installButton) {
    installButton.style.display = 'none';
  }
}

// Global function for install button
window.installApp = async () => {
  if (!deferredPrompt) {
    return;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to the install prompt: ${outcome}`);
  deferredPrompt = null;
  hideInstallPrompt();
};
