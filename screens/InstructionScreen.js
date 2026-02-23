import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, SafeAreaView, Animated, StatusBar,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useUser } from '../context/UserContext'; // Assuming you have this

// ─── Availability Badge ────────────────────────────────────────────────────
const AvailabilityBadge = ({ availability }) => {
    const config = {
        open: { color: '#00C896', bg: '#E6FBF5', icon: 'radio-button-on', label: 'LIVE NOW' },
        upcoming: { color: '#F59E0B', bg: '#FFF8E1', icon: 'time-outline', label: 'UPCOMING' },
        closed: { color: '#EF4444', bg: '#FEF2F2', icon: 'lock-closed', label: 'CLOSED' },
    };
    const c = config[availability] ?? config.open;
    return (
        <View style={[badgeStyles.wrap, { backgroundColor: c.bg, borderColor: c.color }]}>
            <Ionicons name={c.icon} size={12} color={c.color} />
            <Text style={[badgeStyles.text, { color: c.color }]}>{c.label}</Text>
        </View>
    );
};
const badgeStyles = StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, alignSelf: 'flex-start' },
    text: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
});

// ─── Stat Pill ─────────────────────────────────────────────────────────────
const StatPill = ({ icon, label, value, accent }) => (
    <View style={[pillStyles.wrap, { borderColor: accent + '40' }]}>
        <View style={[pillStyles.iconBox, { backgroundColor: accent + '20' }]}>
            <Ionicons name={icon} size={18} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={pillStyles.label} numberOfLines={1}>{label}</Text>
            <Text style={pillStyles.value} numberOfLines={1}>{value}</Text>
        </View>
    </View>
);
const pillStyles = StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, padding: 12, flex: 1, maxWidth: '33%', },
    iconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    label: { fontSize: 10, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    value: { fontSize: 15, color: '#0F172A', fontWeight: '900', marginTop: 1 },
});

// ─── Rule Row ──────────────────────────────────────────────────────────────
const RuleRow = ({ icon, iconColor, text }) => (
    <View style={ruleStyles.row}>
        <View style={[ruleStyles.iconWrap, { backgroundColor: iconColor + '15' }]}>
            <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <Text style={ruleStyles.text}>{text}</Text>
    </View>
);
const ruleStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
    iconWrap: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
    text: { flex: 1, fontSize: 14, color: '#475569', fontWeight: '500', lineHeight: 21 },
});

// ─── Main Screen ───────────────────────────────────────────────────────────
const InstructionScreen = ({ route, navigation }) => {
    const {
        type, subtopicId, subject, title,
        duration, instructions, userClass,
        teacherName, openDate, closeDate, availability,
    } = route.params;

    const { userData } = useUser();

    // Attempt tracking state
    const [attemptsCount, setAttemptsCount] = useState(0);
    const [loadingAttempts, setLoadingAttempts] = useState(true);

    // Parse instructions safely
    let parsed = { text: '', hide_answers: false, maxAttempt: 1 };

    if (instructions) {
        if (typeof instructions === 'object') {
            // It's already an object, just merge it
            parsed = { ...parsed, ...instructions };
        } else if (typeof instructions === 'string') {
            try {
                // Try to parse it if it's a valid JSON string
                const jsonParsed = JSON.parse(instructions);
                parsed = { ...parsed, ...jsonParsed };
            } catch (e) {
                console.warn("Could not parse instructions as JSON. Using defaults.", instructions);
                // If it's just raw text that isn't JSON, maybe the teacher just typed a note
                parsed.text = instructions;
            }
        }
    }
    // Parse maximum attempts (Fallback to 0 if unlimited)
    const maxAttempts = parseInt(parsed.max_attempts) || parseInt(parsed.maxAttempt) || 0;
    const isUnlimited = maxAttempts === 0;

    // Slide-up animation
    const slideAnim = useRef(new Animated.Value(60)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();

        // Fetch User Attempts
        const fetchAttempts = async () => {
            if (!userData?.username) {
                setLoadingAttempts(false);
                return;
            }
            try {
                const response = await axios.get(`https://homeedu.fsdgroup.com.ng/api/report/${userData.username}`);
                if (response.data.status === 200) {
                    console.log(response.data);
                    const pastAttempts = response.data.data.filter(
                        (report) => report.SubtopicId === subtopicId
                    );
                    setAttemptsCount(pastAttempts.length);
                }
            } catch (err) {
                console.log("Could not fetch past attempts", err);
            } finally {
                setLoadingAttempts(false);
            }
        };

        fetchAttempts();
    }, [userData, subtopicId]);

    // Logic Gates
    const isTimeOpen = availability === 'open' || !availability;
    const isAttemptsExhausted = !isUnlimited && attemptsCount >= maxAttempts;

    // The final check to see if the button should be green/purple or locked
    const canStart = isTimeOpen && !isAttemptsExhausted;

    const handleStart = () => {
        if (!canStart || loadingAttempts) return;

        const payload = {
            type, subtopicId, subject, title, duration,
            instructions: parsed, userClass,
            selectedSubjects: [], subtopic: null, topic: null, examId: null,
        };

        navigation.replace('Question', payload);
    };

    const fmtDate = (str) => {
        if (!str) return '—';
        return new Date(str).toLocaleString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <SafeAreaView style={s.safe}>
            <StatusBar barStyle="dark-content" backgroundColor="#F0EDFF" />

            {/* ── Header ── */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Ionicons name="arrow-back-outline" size={22} color="#0F172A" />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Exam Details</Text>
                <View style={{ width: 42 }} />
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

                    {/* ── Hero Card ── */}
                    <View style={s.heroCard}>
                        <View style={s.heroTop}>
                            <View style={[s.subjectBadge, { maxWidth: 160 }]}>
                                <Text style={s.subjectText} numberOfLines={1} ellipsizeMode="tail">{subject}</Text>
                            </View>
                            <AvailabilityBadge availability={availability ?? 'open'} />
                        </View>

<Text style={s.examTitle} numberOfLines={2} ellipsizeMode="tail">{title}</Text>

                        {teacherName && (
                            <View style={s.teacherRow}>
                                <View style={s.avatar}>
                                    <Text style={s.avatarText}>{teacherName.charAt(0).toUpperCase()}</Text>
                                </View>
                                <View>
                                    <Text style={s.teacherLabel}>Set by</Text>
                                    <Text style={s.teacherName} numberOfLines={1} ellipsizeMode="tail">{teacherName}</Text>
                                </View>
                            </View>
                        )}

                        {/* Stats Row (Now includes Attempts!) */}
                        <View style={s.statsRow}>
                            <StatPill icon="time-outline" label="Duration" value={`${duration}m`} accent="#6D28D9" />
                            <StatPill icon="people-outline" label="Class" value={userClass} accent="#0EA5E9" />
                            <StatPill
                                icon="repeat-outline"
                                label="Attempts"
                                value={isUnlimited ? '∞' : `${attemptsCount}/${maxAttempts}`}
                                accent={isAttemptsExhausted ? "#EF4444" : "#10B981"}
                            />
                        </View>
                    </View>

                    {/* ── Window Card ── */}
                    {(openDate || closeDate) && (
                        <View style={s.windowCard}>
                            <View style={s.windowHeader}>
                                <Ionicons name="calendar-outline" size={18} color="#6D28D9" />
                                <Text style={s.sectionTitle}>Exam Window</Text>
                            </View>
                            <View style={s.windowRow}>
                                <View style={s.windowItem}>
                                    <Text style={s.windowLabel}>Opens</Text>
                                    <Text style={s.windowValue}>{fmtDate(openDate)}</Text>
                                </View>
                                <View style={s.divider} />
                                <View style={s.windowItem}>
                                    <Text style={s.windowLabel}>Closes</Text>
                                    <Text style={s.windowValue}>{fmtDate(closeDate)}</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* ── Teacher Instructions ── */}
                    <View style={s.instructionCard}>
                        <View style={s.windowHeader}>
                            <Text style={{ fontSize: 18 }}>📝</Text>
                            <Text style={s.sectionTitle}>Teacher's Note</Text>
                        </View>
                        <Text style={s.instructionText}>
                            {parsed.text?.trim()
                                ? parsed.text
                                : 'Read all questions carefully before answering. Manage your time wisely.'}
                        </Text>
                    </View>

                    {/* ── Rules ── */}
                    <View style={s.rulesCard}>
                        <View style={s.windowHeader}>
                            <Ionicons name="shield-checkmark-outline" size={18} color="#6D28D9" />
                            <Text style={s.sectionTitle}>Rules & Settings</Text>
                        </View>

                        <RuleRow
                            icon={parsed.hide_answers ? 'eye-off-outline' : 'eye-outline'}
                            iconColor={parsed.hide_answers ? '#EF4444' : '#10B981'}
                            text={
                                parsed.hide_answers
                                    ? 'Answers and corrections will be hidden after submission — set by your teacher.'
                                    : 'You can review your corrections and score after submitting.'
                            }
                        />
                        <RuleRow
                            icon="repeat-outline"
                            iconColor="#0EA5E9"
                            text={isUnlimited ? "You can retake this exam as many times as you want." : `You are allowed a maximum of ${maxAttempts} attempt(s) for this exam.`}
                        />
                        <RuleRow icon="calculator-outline" iconColor="#6D28D9" text="In-app calculator and scratch pad are available during the exam." />
                    </View>

                    <View style={{ height: 20 }} />
                </Animated.View>
            </ScrollView>

            {/* ── Start Button ── */}
            <View style={s.footer}>
                <TouchableOpacity
                    style={[s.startBtn, !canStart && s.startBtnDisabled]}
                    onPress={handleStart}
                    activeOpacity={canStart ? 0.85 : 1}
                    disabled={!canStart || loadingAttempts}
                >
                    {loadingAttempts ? (
                        <ActivityIndicator color="#6D28D9" />
                    ) : canStart ? (
                        <>
                            <Text style={s.startBtnText}>Begin Exam</Text>
                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                        </>
                    ) : (
                        <>
                            <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" />
                            <Text style={[s.startBtnText, { color: '#94A3B8' }]}>
                                {isAttemptsExhausted ? 'Max Attempts Reached' : (availability === 'upcoming' ? 'Not Open Yet' : 'Exam Closed')}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

// ─── Styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F8F7FF' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EDE9FE' },
    backBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', letterSpacing: 0.3 },

    scroll: { padding: 16, paddingBottom: 110 },

    // Hero
    heroCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 14, shadowColor: '#6D28D9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    subjectBadge: { backgroundColor: '#6D28D9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    subjectText: { color: '#fff', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
    examTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', lineHeight: 30, marginBottom: 16 },

    // Teacher
    teacherRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18, backgroundColor: '#F8F7FF', padding: 10, borderRadius: 12 },
    avatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#6D28D9', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontWeight: '900', fontSize: 16 },
    teacherLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },
    teacherName: { fontSize: 14, color: '#0F172A', fontWeight: '800' },

statsRow: { flexDirection: 'row', gap: 8, overflow: 'hidden' },

    // Window
    windowCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, borderLeftWidth: 4, borderLeftColor: '#6D28D9', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    windowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
    windowRow: { flexDirection: 'row' },
    windowItem: { flex: 1 },
    windowLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
    windowValue: { fontSize: 13, color: '#334155', fontWeight: '700', lineHeight: 18 },
    divider: { width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 16 },

    // Instructions
    instructionCard: { backgroundColor: '#FFFBEB', borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1.5, borderColor: '#FCD34D' },
    instructionText: { fontSize: 15, color: '#78350F', lineHeight: 23, fontWeight: '500' },

    // Rules
    rulesCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },

    // Footer
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#EDE9FE' },
    startBtn: {
        backgroundColor: '#6D28D9', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', padding: 17, borderRadius: 16, gap: 10,
        shadowColor: '#6D28D9', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
    },
    startBtnDisabled: { backgroundColor: '#F1F5F9', shadowOpacity: 0, elevation: 0 },
    startBtnText: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
});

export default InstructionScreen;