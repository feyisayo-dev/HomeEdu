/**
 * districtWindow.js  —  SINGLE SOURCE OF TRUTH (Time & Emergency Kill Switch)
 * ─────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
const DistrictContext = createContext(null);
// ── Pure function — local time check (Safe to call anywhere) ──────────────────
export const isWindowActiveNow = () => {
  const now = new Date();
  // Shift UTC → WAT (Nigeria = UTC+1)
  const wat = new Date(now.getTime() + 60 * 60 * 1000);
  const day = wat.getUTCDay(); // 0 = Sunday, 6 = Saturday

  if (day !== 6) return false; // Saturday

  const minutes = wat.getUTCHours() * 60 + wat.getUTCMinutes();
  const start   = 8 * 60 + 30;  // 08:30 WAT
  const end     = 12 * 60 + 30; // 12:30 WAT

  return minutes >= start && minutes <= end;
};


// 2. Create the Provider Wrapper
export const DistrictWindowProvider = ({ children }) => {
  const [isDistrictTime, setIsDistrictTime] = useState(isWindowActiveNow);
  const [isForcedOffline, setIsForcedOffline] = useState(false);
  const [offlineMessage, setOfflineMessage] = useState('');

  const timerRef = useRef(null);
  const forcedOfflineRef = useRef(false);

  const checkKillSwitch = async () => {
    if (forcedOfflineRef.current) return;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const response = await fetch('https://fsdgroup.com.ng/Edu/app-status.json', { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeoutId);

      if (response.ok) {
        const config = await response.json();
        if (config.forceOffline) {
          forcedOfflineRef.current = true;
          setIsForcedOffline(true);
          setOfflineMessage(config.message);
        }
      }
    } catch (error) { console.log("Health check silent fail:", error.message); }
  };

  useEffect(() => {
    setIsDistrictTime(isWindowActiveNow());
    checkKillSwitch();

    timerRef.current = setInterval(() => {
      setIsDistrictTime(isWindowActiveNow());
      checkKillSwitch();
    }, 60_000);

    return () => clearInterval(timerRef.current);
  }, []);

  // The shared state
  const value = {
    isDistrictExamWindowActive: isDistrictTime,
    isForcedOffline,
    setIsForcedOffline: (val) => {
        forcedOfflineRef.current = val;
        setIsForcedOffline(val);
    },
    offlineMessage,
    isOfflineModeActive: isDistrictTime || isForcedOffline 
  };

  return (
    <DistrictContext.Provider value={value}>
      {children}
    </DistrictContext.Provider>
  );
};

// 3. Export the custom hook
const useDistrictWindow = () => useContext(DistrictContext);

// Bring back the default export so your wrappers don't break!
export default useDistrictWindow