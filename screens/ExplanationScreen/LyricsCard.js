import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import TalkingRobotHead from './TalkingRobotHead';
import { getWordSyncState } from './wordSync';
import styles from './explanationStyles';

// Rough character budget per line, tuned for the lyricsBox width/font in
// explanationStyles (20px monospace-bold in a ~270px-wide box). This is
// only a starting guess — lines are still free to wrap if it runs long,
// because scroll offsets are measured from real rendered heights
// (see handleLineLayout), not assumed from this constant.
const MAX_LINE_CHARS = 22;
const LINE_HEIGHT_FALLBACK = 45; // used only until a line's real height is measured

const buildLines = (timings) => {
    const lines = [];
    let current = [];
    let currentChars = 0;

    timings.forEach((w, i) => {
        const wordChars = w.word.length + 1; // +1 for the trailing space
        if (current.length > 0 && currentChars + wordChars > MAX_LINE_CHARS) {
            lines.push(current);
            current = [];
            currentChars = 0;
        }
        current.push({ ...w, index: i });
        currentChars += wordChars;
    });
    if (current.length > 0) lines.push(current);
    return lines;
};

const LyricsCard = ({ text, audioUrl, timingsUrl }) => {
    const soundRef = useRef(null);
    const scrollViewRef = useRef(null);
    const lineHeights = useRef([]);   // real measured height per line, filled via onLayout
    const lineOffsets = useRef([]);   // cumulative Y offset per line, derived from lineHeights

    const [timings, setTimings] = useState([]);
    const [positionSec, setPositionSec] = useState(0);
    const [durationSec, setDurationSec] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (!timingsUrl) return;
        let isMounted = true;
        axios.get(timingsUrl)
            .then(res => { if (isMounted) setTimings(Array.isArray(res.data) ? res.data : []); })
            .catch(() => { if (isMounted) setTimings([]); });
        return () => { isMounted = false; };
    }, [timingsUrl]);

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
            const { sound } = await Audio.Sound.createAsync(
                { uri: audioUrl },
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
            if (soundRef.current) soundRef.current.unloadAsync();
        };
    }, [audioUrl]);

    useFocusEffect(
        useCallback(() => {
            return () => {
                if (soundRef.current) {
                    soundRef.current.pauseAsync();
                    setIsPlaying(false);
                }
            };
        }, [])
    );

    const togglePlay = async () => {
        if (!soundRef.current) return;
        if (isPlaying) {
            await soundRef.current.pauseAsync();
        } else {
            if (durationSec > 0 && positionSec >= durationSec - 0.05) {
                await soundRef.current.setPositionAsync(0);
                if (scrollViewRef.current) scrollViewRef.current.scrollTo({ y: 0, animated: true });
            }
            await soundRef.current.playAsync();
        }
    };

    // THE ACTUAL FIX: `talking` (true only while a word is sounding) drives
    // the mouth — `isPlaying` (true for the whole clip) was the bug.
    const { activeIndex, talking } = useMemo(() => {
        if (!isPlaying) return { activeIndex: -1, talking: false };
        return getWordSyncState(timings, positionSec);
    }, [timings, positionSec, isPlaying]);

    const lines = useMemo(() => buildLines(timings), [timings]);

    const activeLineIndex = useMemo(() => {
        if (activeIndex < 0) return -1;
        return lines.findIndex(line => line.some(w => w.index === activeIndex));
    }, [lines, activeIndex]);

    // Measure each line's real height as it renders, and keep a running
    // cumulative-offset table so scrolling stays accurate even when a
    // line wraps to more than one visual row.
    const handleLineLayout = (lineIndex, e) => {
        lineHeights.current[lineIndex] = e.nativeEvent.layout.height;
        let acc = 0;
        const offsets = [];
        for (let i = 0; i < lines.length; i++) {
            offsets[i] = acc;
            acc += lineHeights.current[i] || LINE_HEIGHT_FALLBACK;
        }
        lineOffsets.current = offsets;
    };

    useEffect(() => {
        if (activeLineIndex === -1 || !scrollViewRef.current) return;
        // Keep the active line roughly one row down from the top of the box
        // instead of pinned at the very top.
        const targetLineIndex = Math.max(0, activeLineIndex - 1);
        const y = lineOffsets.current[targetLineIndex] ?? targetLineIndex * LINE_HEIGHT_FALLBACK;
        scrollViewRef.current.scrollTo({ y, animated: true });
    }, [activeLineIndex]);

    const progress = durationSec > 0 ? positionSec / durationSec : 0;

    return (
        <View style={styles.lyricsContainer}>
            {/* Mini player row: album-art-style robot, progress, play button */}
            <View style={styles.lyricsPlayerRow}>
                <View style={styles.lyricsAlbumArt}>
                    <TalkingRobotHead talking={talking} size={64} />
                </View>

                <View style={styles.lyricsPlayerInfo}>
                    <Text style={styles.lyricsNowPlayingLabel} numberOfLines={1}>NOW EXPLAINING</Text>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${Math.min(progress, 1) * 100}%` }]} />
                    </View>
                </View>

                <TouchableOpacity onPress={togglePlay} style={styles.lyricsPlayBtn} disabled={!isLoaded}>
                    <Text style={styles.playIcon}>{!isLoaded ? '⏳' : isPlaying ? '⏸' : '▶️'}</Text>
                </TouchableOpacity>
            </View>

            {/* Fixed-height lyrics window */}
            <View style={styles.lyricsBox}>
                <ScrollView
                    ref={scrollViewRef}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.lyricsScrollContent}
                >
                    {lines.length > 0 ? (
                        lines.map((line, lineIndex) => (
                            <View
                                key={`line-${lineIndex}`}
                                style={styles.lyricRow}
                                onLayout={(e) => handleLineLayout(lineIndex, e)}
                            >
                                {line.map((w) => {
                                    const isActive = w.index === activeIndex;
                                    const isPast = w.index < activeIndex;
                                    return (
                                        <Text
                                            key={`${w.word}-${w.index}`}
                                            style={[
                                                styles.lyricWord,
                                                isActive && styles.lyricWordActive,
                                                isPast && styles.lyricWordPast,
                                            ]}
                                        >
                                            {w.word + ' '}
                                        </Text>
                                    );
                                })}
                            </View>
                        ))
                    ) : (
                        <Text style={styles.lyricWordPast}>{text}</Text>
                    )}
                </ScrollView>
            </View>
        </View>
    );
};

export default LyricsCard;