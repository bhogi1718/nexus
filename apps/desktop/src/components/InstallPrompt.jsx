import { useState, useEffect } from 'react';

export const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = () => {
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setShowPrompt(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-lg shadow-lg z-40 flex items-center justify-between gap-4 max-w-md mx-auto">
      <div>
        <p className="font-semibold text-sm">Install Nexus</p>
        <p className="text-xs text-blue-100">Get quick access on your home screen</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => {
            window.installApp?.();
            setShowPrompt(false);
          }}
          className="px-4 py-2 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors text-xs whitespace-nowrap"
        >
          Install
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="px-3 py-2 text-blue-100 hover:text-white transition-colors text-xs"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
