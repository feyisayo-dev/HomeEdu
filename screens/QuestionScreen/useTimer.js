import { useState, useEffect, useRef } from 'react';

/**
 * useTimer
 *
 * Handles both modes:
 *  - Countdown  (school/district work with a teacher-set duration)
 *  - Count-up   (everything else)
 *
 * Returns:
 *  { timeLeft, elapsedTime, displayTime, timerUrgent, formatTime, onTimeout }
 *
 * onTimeout fires once when countdown hits 0 — pass computeResults to it.
 */
const useTimer = ({ type, duration, isModalVisible, onTimeout }) => {
  const hasCountdown  = (type === 'schoolWork' || type === 'DistrictWork') && duration > 0;
  const totalSeconds  = duration * 60;

  const [timeLeft, setTimeLeft]       = useState(hasCountdown ? totalSeconds : null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime]     = useState(null);
  const timedOutRef                   = useRef(false);

  // Start the clock when the hook mounts
  useEffect(() => {
    setStartTime(Date.now());
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (isModalVisible) return; // pause while results are shown

      if (hasCountdown) {
        setTimeLeft((prev) => {
          if (prev <= 1 && !timedOutRef.current) {
            timedOutRef.current = true;
            clearInterval(timer);
            onTimeout?.();
            return 0;
          }
          return prev - 1;
        });
      } else if (startTime) {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, isModalVisible, hasCountdown]);

  const formatTime = (seconds) => {
    const s    = Math.max(0, seconds);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const displayTime  = hasCountdown ? (timeLeft ?? totalSeconds) : elapsedTime;
  const timerUrgent  = hasCountdown && (timeLeft ?? totalSeconds) <= 60;

  // Helper to compute how long the exam took (for the report submission)
  const getTimeTaken = () => {
    const timeTakenInSeconds = hasCountdown
      ? totalSeconds - (timeLeft ?? 0)
      : elapsedTime;
    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(Math.floor(timeTakenInSeconds / 60))}:${pad(timeTakenInSeconds % 60)}`;
  };

  return { timeLeft, elapsedTime, displayTime, timerUrgent, formatTime, getTimeTaken };
};

export default useTimer;
