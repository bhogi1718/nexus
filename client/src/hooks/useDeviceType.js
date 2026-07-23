import { useState, useEffect } from 'react';

const detectDeviceSignals = () => {
  if (typeof window === 'undefined') return { device: 'desktop', signals: {} };

  // Signal 1: Viewport width
  const width = window.innerWidth;
  const widthSignal = width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';

  // Signal 2: Touch capability
  const touchPoints = navigator.maxTouchPoints || 0;
  const hasTouch = touchPoints > 0;

  // Signal 3: User-Agent analysis
  const ua = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(ua);
  const isTabletUA = /ipad|android(?!.*mobile)/.test(ua);

  // Signal 4: Device orientation support (mobile indicator)
  const supportsOrientation = 'orientation' in window;

  // Signal 5: Accelerometer/Gyroscope (mobile sensors)
  const supportsMotion = 'DeviceMotionEvent' in window;

  // Signal 6: Battery API (mobile indicator)
  const supportsBattery = 'getBattery' in navigator || 'battery' in navigator;

  // Signal 7: Screen aspect ratio (mobile devices typically portrait)
  const aspectRatio = window.innerHeight / window.innerWidth;
  const isTallScreen = aspectRatio > 1.2;

  const signals = {
    width,
    widthSignal,
    touchPoints,
    hasTouch,
    isMobileUA,
    isTabletUA,
    supportsOrientation,
    supportsMotion,
    supportsBattery,
    isTallScreen,
    userAgent: ua,
  };

  // Scoring system: Combine signals
  let mobileScore = 0;
  let tabletScore = 0;
  let desktopScore = 0;

  // Width-based scoring (40% weight)
  if (widthSignal === 'mobile') mobileScore += 40;
  else if (widthSignal === 'tablet') tabletScore += 40;
  else desktopScore += 40;

  // Touch support (20% weight) - strong mobile/tablet indicator
  if (hasTouch) {
    if (isMobileUA) mobileScore += 20;
    else if (isTabletUA) tabletScore += 20;
    else tabletScore += 10; // Unknown touch device, lean tablet
  } else {
    desktopScore += 20;
  }

  // User-Agent (20% weight)
  if (isMobileUA && !isTabletUA) mobileScore += 20;
  else if (isTabletUA) tabletScore += 20;
  else desktopScore += 20;

  // Mobile sensors (10% weight)
  if (supportsMotion || supportsBattery) mobileScore += 5;
  if (supportsOrientation) mobileScore += 5;

  // Aspect ratio (10% weight) - tall screens often mobile
  if (isTallScreen && width < 900) mobileScore += 5;
  else if (!isTallScreen && width > 1024) desktopScore += 5;

  // Determine device type based on highest score
  const maxScore = Math.max(mobileScore, tabletScore, desktopScore);
  let device = 'desktop';

  if (maxScore === mobileScore && mobileScore > 0) {
    device = 'mobile';
  } else if (maxScore === tabletScore && tabletScore > 0) {
    device = 'tablet';
  }

  return { device, signals };
};

export const useDeviceType = () => {
  const [device, setDevice] = useState(() => {
    const { device } = detectDeviceSignals();
    return device;
  });

  const [signals, setSignals] = useState(() => {
    const { signals } = detectDeviceSignals();
    return signals;
  });

  useEffect(() => {
    const handleDetection = () => {
      const { device, signals } = detectDeviceSignals();
      setDevice(device);
      setSignals(signals);
    };

    window.addEventListener('resize', handleDetection);
    window.addEventListener('orientationchange', handleDetection);

    return () => {
      window.removeEventListener('resize', handleDetection);
      window.removeEventListener('orientationchange', handleDetection);
    };
  }, []);

  return device;
};

export const useDeviceSignals = () => {
  const [signals, setSignals] = useState(() => {
    const { signals } = detectDeviceSignals();
    return signals;
  });

  useEffect(() => {
    const handleDetection = () => {
      const { signals } = detectDeviceSignals();
      setSignals(signals);
    };

    window.addEventListener('resize', handleDetection);
    window.addEventListener('orientationchange', handleDetection);

    return () => {
      window.removeEventListener('resize', handleDetection);
      window.removeEventListener('orientationchange', handleDetection);
    };
  }, []);

  return signals;
};
