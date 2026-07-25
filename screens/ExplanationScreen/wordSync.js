/**
 * wordSync.js
 *
 * Small helpers for driving karaoke-style captions and mouth-flap timing
 * off word-level timing data (the JSON your generation pipeline saves
 * alongside each edge-tts audio file):
 *   [{ word: "Hi", start: 0.1026, end: 0.4052 }, ...]
 * (start/end are in SECONDS, matching edge-tts word-boundary events.)
 *
 * No audio analysis, no transcription — this just answers "which word is
 * sounding right now" given the audio's current position.
 */

/**
 * Binary search for the index of the word active at `positionSec`.
 * Returns -1 if we're in a gap (no word is currently sounding).
 */
export function findActiveWordIndex(timings, positionSec) {
    if (!timings || timings.length === 0) return -1;

    let lo = 0;
    let hi = timings.length - 1;

    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const w = timings[mid];
        if (positionSec < w.start) {
            hi = mid - 1;
        } else if (positionSec > w.end) {
            lo = mid + 1;
        } else {
            return mid;
        }
    }
    return -1;
}

/**
 * Given the full timings array and a position in seconds, returns:
 *  - activeIndex: index of the word sounding right now, or -1 in a gap
 *  - talking: boolean, true if a word is sounding (feeds straight into
 *    <TalkingRobotHead talking={...} />)
 */
export function getWordSyncState(timings, positionSec) {
    const activeIndex = findActiveWordIndex(timings, positionSec);
    return { activeIndex, talking: activeIndex !== -1 };
}
