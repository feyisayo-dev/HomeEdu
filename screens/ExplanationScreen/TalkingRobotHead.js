import React, { useEffect } from 'react';
import Svg, { Rect, Circle, Line } from 'react-native-svg';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedProps,
    withRepeat,
    withTiming,
    withSequence,
    cancelAnimation,
    Easing,
} from 'react-native-reanimated';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

// Colors lifted straight from the RobotMascot manim class so the head
// matches the video mascot the kids already recognize.
const COLORS = {
    lightBlue: '#5CACEE',
    orange: '#FF8C00',
    yellow: '#FFD700',
    navy: '#1A2A4A',
    white: '#FFFFFF',
};

/**
 * TalkingRobotHead
 * A lightweight, head-only version of the Manim mascot for the "audio" card
 * type. It does NOT analyze the audio waveform or run any transcription.
 *
 * Prop `talking` should be true only while a word is actually sounding
 * (driven by word-level timing data from wordSync.js), false during
 * silences/pauses. The flap loop starts/stops exactly on word boundaries
 * rather than running for the whole clip, so real pauses (long gaps
 * between sentences) actually show the mouth closing.
 *
 * Props:
 *  - talking: boolean, true while a word is currently sounding
 *  - size: number, width/height of the head in px (default 160)
 */
const TalkingRobotHead = ({ talking, size = 160 }) => {
    const mouthScale = useSharedValue(0.3);
    const bob = useSharedValue(0);

    useEffect(() => {
        bob.value = withRepeat(
            withSequence(
                withTiming(-3, { duration: 700, easing: Easing.inOut(Easing.sin) }),
                withTiming(3, { duration: 700, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            true
        );
        return () => cancelAnimation(bob);
    }, []);

    useEffect(() => {
        if (talking) {
            mouthScale.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 90, easing: Easing.inOut(Easing.quad) }),
                    withTiming(0.25, { duration: 90, easing: Easing.inOut(Easing.quad) })
                ),
                -1,
                true
            );
        } else {
            cancelAnimation(mouthScale);
            mouthScale.value = withTiming(0.15, { duration: 120 });
        }
        return () => cancelAnimation(mouthScale);
    }, [talking]);

    const headStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: bob.value }],
    }));

    const MOUTH_CENTER_Y = 104;
    const mouthProps = useAnimatedProps(() => {
        const h = 4 + mouthScale.value * 18;
        return { height: h, y: MOUTH_CENTER_Y - h / 2 };
    });

    return (
        <Animated.View style={[{ width: size, height: size }, headStyle]}>
            <Svg width={size} height={size} viewBox="0 0 160 160">
                <Line x1={55} y1={30} x2={35} y2={5} stroke={COLORS.lightBlue} strokeWidth={6} strokeLinecap="round" />
                <Line x1={105} y1={30} x2={125} y2={5} stroke={COLORS.lightBlue} strokeWidth={6} strokeLinecap="round" />
                <Circle cx={35} cy={5} r={7} fill={COLORS.orange} />
                <Circle cx={125} cy={5} r={7} fill={COLORS.orange} />

                <Circle cx={20} cy={80} r={14} fill={COLORS.yellow} />
                <Circle cx={140} cy={80} r={14} fill={COLORS.yellow} />

                <Rect x={20} y={25} width={120} height={110} rx={45} fill={COLORS.lightBlue} />

                <Line x1={38} y1={118} x2={122} y2={118} stroke={COLORS.navy} strokeWidth={3} />

                <Circle cx={60} cy={75} r={16} fill={COLORS.white} stroke={COLORS.navy} strokeWidth={2} />
                <Circle cx={60} cy={75} r={8} fill={COLORS.navy} />
                <Circle cx={100} cy={75} r={16} fill={COLORS.white} stroke={COLORS.navy} strokeWidth={2} />
                <Circle cx={100} cy={75} r={8} fill={COLORS.navy} />

                <AnimatedRect
                    x={70}
                    width={20}
                    rx={6}
                    fill={COLORS.navy}
                    animatedProps={mouthProps}
                />
            </Svg>
        </Animated.View>
    );
};

export default TalkingRobotHead;
