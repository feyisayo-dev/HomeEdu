import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import axios from 'axios';
import TalkingRobotHead from './TalkingRobotHead';
import { getWordSyncState } from './wordSync';
import styles from './explanationStyles';

/**
 * AudioExplanationCard
 *
 * Props (straight off the content item the backend now emits):
 *  - value: string, the mp3 url
 *  - timingsUrl: string | undefined, url to the word-timings JSON
 *
 * If timingsUrl is missing (older explanations, or generation ran without
 * word-boundary capture), this still plays fine — it just falls back to no
 * captions and a generic idle-mouth loop instead of per-word flapping.
 *
 * Sync approach: expo-av reports playback position at 50ms resolution
 * (the default 500ms is too coarse — some words here are ~130ms long). On
 * every update we binary-search the timings for the word whose
 * [start, end] contains the current position, and use that to drive both
 * the caption highlight and the robot's mouth. No transcription, no
 * waveform/amplitude analysis.
 */
const AudioExplanationCard = ({ value, timingsUrl }) => {
    const soundRef = useRef(null);
    const [timings, setTimings] = useState([]);
    const [positionSec, setPositionSec] = useState(0);
    const [durationSec, setDurationSec] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Fetch timings JSON once, if provided
    useEffect(() => {
        if (!timingsUrl) { setTimings([]); return; }
        let isMounted = true;
        axios.get(timingsUrl)
            .then(res => { if (isMounted) setTimings(Array.isArray(res.data) ? res.data : []); })
            .catch(() => { if (isMounted) setTimings([]); });
        return () => { isMounted = false; };
    }, [timingsUrl]);

    // Load + play audio
    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

            const { sound } = await Audio.Sound.createAsync(
                { uri: value },
                { shouldPlay: true, progressUpdateIntervalMillis: 50 },
                (status) => {
                    if (!isMounted || !status.isLoaded) return;
                    setPositionSec((status.positionMillis ?? 0) / 1000);
                    setDurationSec((status.durationMillis ?? 0) / 1000);
                    setIsPlaying(status.isPlaying ?? false);
                    if (status.didJustFinish) setIsPlaying(false);
                }
            );
            soundRef.current = sound;
            setIsLoaded(true);
        };

        load();

        return () => {
            isMounted = false;
            soundRef.current?.unloadAsync();
        };
    }, [value]);

    const togglePlay = async () => {
        if (!soundRef.current) return;
        if (isPlaying) {
            await soundRef.current.pauseAsync();
        } else {
            if (durationSec > 0 && positionSec >= durationSec - 0.05) {
                await soundRef.current.setPositionAsync(0);
            }
            await soundRef.current.playAsync();
        }
    };

    const { activeIndex, talking } = useMemo(() => {
        if (!isPlaying) return { activeIndex: -1, talking: false };
        return getWordSyncState(timings, positionSec);
    }, [timings, positionSec, isPlaying]);

    const progress = durationSec > 0 ? positionSec / durationSec : 0;

    return (
        <View style={styles.audioContainer}>
            <TalkingRobotHead talking={talking} size={150} />

            <TouchableOpacity onPress={togglePlay} style={styles.playButton} disabled={!isLoaded}>
                <Text style={styles.playIcon}>
                    {!isLoaded ? '…' : isPlaying ? '⏸' : '▶️'}
                </Text>
            </TouchableOpacity>

            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(progress, 1) * 100}%` }]} />
            </View>

            {timings.length > 0 && (
                <View style={styles.captionWrap}>
                    {timings.map((w, i) => (
                        <Text
                            key={`${w.word}-${i}`}
                            style={[
                                styles.word,
                                i === activeIndex && styles.wordActive,
                                i < activeIndex && styles.wordSpoken,
                            ]}
                        >
                            {w.word + ' '}
                        </Text>
                    ))}
                </View>
            )}
        </View>
    );
};

export default AudioExplanationCard;
