/**
 * districtWindow.js  —  SINGLE SOURCE OF TRUTH
 * ─────────────────────────────────────────────
 * Place this at:  src/utils/districtWindow.js
 *
 * Import the hook anywhere you need reactive state:
 *   import useDistrictWindow from '../src/utils/districtWindow';
 *   const isDistrictExamWindowActive = useDistrictWindow();
 *
 * Import the raw checker when you need a one-shot boolean
 * (e.g. inside submitReport before an async operation):
 *   import { isWindowActiveNow } from '../src/utils/districtWindow';
 *   if (isWindowActiveNow()) { ... }
 *
 * Window: Sunday 08:30 – 12:30 WAT (UTC+1)
 * ─────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from 'react';

// ── Pure function — no React, safe to call anywhere ───────────────────────────
export const isWindowActiveNow = () => {
  const now = new Date();
  // Shift UTC → WAT (Nigeria = UTC+1)
  const wat = new Date(now.getTime() + 60 * 60 * 1000);
  const day = wat.getUTCDay(); // 0 = Sunday

  if (day !== 7) return false; // Only Saturday

  const minutes = wat.getUTCHours() * 60 + wat.getUTCMinutes();
  const start   = 8 * 60 + 30;  // 08:30 WAT
  const end     = 12 * 60 + 30; // 12:30 WAT

  return minutes >= start && minutes <= end;
};

// ── React hook — re-checks every 60 s, auto-flips when window opens/closes ───
const useDistrictWindow = () => {
  const [active, setActive] = useState(isWindowActiveNow);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActive(isWindowActiveNow());
    }, 60_000);
    return () => clearInterval(timerRef.current);
  }, []);

  return active;
};

export default useDistrictWindow;