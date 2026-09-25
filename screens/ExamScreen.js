import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    ActivityIndicator,
    Image,
    Animated,
    Dimensions,
} from 'react-native';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import Checkbox from 'expo-checkbox';

const { width } = Dimensions.get('window');

// ─── Animated Subject Item ─────────────────────────────────────────────────
const AnimatedSubjectItem = ({ item, index, isSelected, onPress, type }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const checkboxScale = useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 1, delay: index * 80, tension: 50, friction: 7, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, delay: index * 80, duration: 400, useNativeDriver: true }),
        ]).start();
    }, []);

    React.useEffect(() => {
        if (isSelected) {
            Animated.sequence([
                Animated.spring(checkboxScale, { toValue: 1.3, tension: 100, friction: 3, useNativeDriver: true }),
                Animated.spring(checkboxScale, { toValue: 1, tension: 100, friction: 5, useNativeDriver: true }),
            ]).start();
        }
    }, [isSelected]);

    const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
    const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 5, useNativeDriver: true }).start();

    let displayText = '';
    let itemId = '';

    if (type === 'classExam') { displayText = item.Subject; itemId = item.Subject; }
    else if (type === 'subjectExam') { displayText = item.Topic; itemId = item.Topic; }
    else if (type === 'topicExam') { displayText = item.Subtopic; itemId = item.Subtopic; }
    else if (type === 'JAMB') { displayText = item.Subject; itemId = item.Subject; } // ← JAMB uses Subject too

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={[styles.subjectItem, isSelected && styles.subjectItemSelected]}
                onPress={() => onPress(itemId)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.9}
            >
                <Animated.View style={{ transform: [{ scale: checkboxScale }] }}>
                    <Checkbox
                        value={isSelected}
                        onValueChange={() => onPress(itemId)}
                        color={isSelected ? '#864AF9' : undefined}
                    />
                </Animated.View>

                <View style={styles.subCont}>
                    {(type === 'classExam' || type === 'subjectExam' || type === 'JAMB') && (
                        <Image
                            source={item.Icon ? { uri: item.Icon } : require('../assets/education.png')}
                            style={styles.subImg}
                        />
                    )}
                    <Text style={styles.subjectText}>{displayText}</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

// ─── Animated Start Button ─────────────────────────────────────────────────
const AnimatedStartButton = ({ onPress, disabled, selectedCount }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        if (!disabled) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        } else {
            pulseAnim.setValue(1);
        }
    }, [disabled]);

    const handlePressIn = () => { if (!disabled) Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start(); };
    const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 5, useNativeDriver: true }).start();

    return (
        <Animated.View style={{ transform: [{ scale: disabled ? 1 : Animated.multiply(scaleAnim, pulseAnim) }] }}>
            <TouchableOpacity
                style={[styles.startButton, disabled && styles.startButtonDisabled]}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.9}
                disabled={disabled}
            >
                <Text style={styles.startButtonText}>
                    Start Exam {selectedCount > 0 && `(${selectedCount})`}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

// ─── Main ExamScreen ───────────────────────────────────────────────────────
const ExamScreen = ({ route, navigation }) => {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [examLabel, setExamLabel] = useState('');
    const [selectedSubjects, setSelectedSubjects] = useState([]);

    const { userData } = useUser();
    const { type, subject, topic, topicId, subtopic, userClass } = route.params;

    // ── Selection limits ──────────────────────────────────────────────────
    const MAX_SELECTIONS = {
        JAMB: 4,
        classExam: userData.class?.toLowerCase() === 'jamb' ? 4 : 1,
        subjectExam: Infinity,
        topicExam: Infinity,
    };

    const toggleSubject = (id) => {
        const isSelected = selectedSubjects.includes(id);
        const limit = MAX_SELECTIONS[type] ?? 1;

        if (!isSelected && selectedSubjects.length >= limit) {
            Alert.alert('Limit Reached', `You can only select up to ${limit} subject${limit > 1 ? 's' : ''}.`);
            return;
        }

        // classExam (non-JAMB) replaces selection instead of toggling
        if (type === 'classExam' && !isSelected) {
            setSelectedSubjects([id]);
        } else {
            setSelectedSubjects(prev => isSelected ? prev.filter(s => s !== id) : [...prev, id]);
        }
    };

    // "Select All" only makes sense where there's no selection cap — picking
    // every topic/subtopic one by one is tedious; JAMB/classExam have a fixed
    // subject cap set by the exam board, so that toggle doesn't apply there.
    const canSelectAll = (MAX_SELECTIONS[type] ?? 1) === Infinity;
    const getItemId = (item) => {
        if (type === 'subjectExam') return item.Topic;
        if (type === 'topicExam') return item.Subtopic;
        return null;
    };
    const allSelected = canSelectAll && subjects.length > 0 && selectedSubjects.length === subjects.length;
    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedSubjects([]);
        } else {
            setSelectedSubjects(subjects.map(getItemId).filter(Boolean));
        }
    };

    // ── Exam label ────────────────────────────────────────────────────────
    useEffect(() => {
        const labels = { classExam: 'subject', subjectExam: 'topic', topicExam: 'subtopic', JAMB: 'JAMB subject' };
        setExamLabel(labels[type] ?? type);
    }, [type]);

    // ── Start exam ────────────────────────────────────────────────────────
    const handleStartExam = () => {
        if (selectedSubjects.length < 1) {
            Alert.alert('No Subject Selected', 'Select at least 1 subject.');
            return;
        }
        if (type === 'JAMB' && selectedSubjects.length > 4) {
            Alert.alert('Limit Reached', 'You can only select a maximum of 4 subjects for JAMB.');
            return;
        }

        // ==========================================
        // 🚀 PRIORITIZE ENGLISH LOGIC
        // ==========================================
        let prioritizedSubjects = [...selectedSubjects]; // Clone to avoid mutating state directly

        const englishIndex = prioritizedSubjects.findIndex(
            sub => sub.toLowerCase() === 'english'
        );

        // If English is found AND it's not already at index 0
        if (englishIndex > 0) {
            const englishSub = prioritizedSubjects.splice(englishIndex, 1)[0]; // Remove it
            prioritizedSubjects.unshift(englishSub); // Paste it at the front
        }
        // ==========================================

        // Use the new `prioritizedSubjects` array for the prefix
        const prefix = prioritizedSubjects[0].slice(0, 3).toUpperCase();
        const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        const examId = `${prefix}${randomCode}`;

        // Pass `prioritizedSubjects` to the base payload instead of the old array
        const base = { examId, type, selectedSubjects: prioritizedSubjects };

        const payloads = {
            JAMB: { ...base, subtopicId: null, subtopic: null, subject: null, topic: null },
            classExam: { ...base, subtopicId: null, subtopic: null, subject: prioritizedSubjects, topic: null },
            subjectExam: { ...base, subtopicId: null, subtopic: null, subject, topic: prioritizedSubjects },
            topicExam: { ...base, subtopicId: null, subtopic: prioritizedSubjects, subject, topic },
        };

        const payload = payloads[type];
        if (!payload) {
            Alert.alert('Error', 'Unknown exam type.');
            return;
        }

        navigation.navigate('Question', payload);
    };
    // ── Fetch data ────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError('');
            try {
                let data;

                switch (type) {
                    // ── classExam: fetch subjects for the student's class ──
                    case 'classExam': {
                        const res = await axios.post('https://homeedu.fsdgroup.com.ng/api/subjects', {
                            class: userData.class,
                        });
                        if (res.data.status === 200) { setSubjects(res.data.data); }
                        else { setError('Failed to load subjects.'); }
                        break;
                    }

                    // ── JAMB: same endpoint as classExam but with 'JAMB' class ──
                    // FIX: JAMB was hitting the default case and showing "Invalid type"
                    case 'JAMB': {
                        const res = await axios.post('https://homeedu.fsdgroup.com.ng/api/subjects', {
                            class: 'JAMB',
                        });

                        if (res.data.status === 200) {
                            let fetchedSubjects = [...res.data.data];

                            const englishIndex = fetchedSubjects.findIndex(sub => {
                                // FIX: Added sub.Subject (Capital S) to match your API payload
                                const subjectName = typeof sub === 'string' ? sub : (sub.Subject || sub.subject || sub.name || '');
                                return subjectName.toLowerCase().includes('english');
                            });

                            if (englishIndex > 0) {
                                const englishItem = fetchedSubjects.splice(englishIndex, 1)[0];
                                fetchedSubjects.unshift(englishItem);
                            }

                            setSubjects(fetchedSubjects);
                        }
                        else { setError('Failed to load JAMB subjects.'); }
                        break;
                    }
                    // ── subjectExam: fetch topics for a subject ──
                    case 'subjectExam': {
                        const res = await fetch('https://homeedu.fsdgroup.com.ng/api/topics/' + subject, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ class: userClass }),
                        });
                        data = await res.json();
                        if (data.status === 200) { setSubjects(data.data); }
                        else { setError('Failed to load topics.'); }
                        break;
                    }

                    // ── topicExam: fetch subtopics for a topic ──
                    case 'topicExam': {
                        const res = await axios.get(`https://homeedu.fsdgroup.com.ng/api/userSubtopics/${topicId}`);
                        if (res.data.status === 200) { setSubjects(res.data.data); }
                        else { setError('Failed to load subtopics.'); }
                        break;
                    }

                    default:
                        // Log it so you can see exactly what type value arrived
                        console.warn('[ExamScreen] Unhandled exam type:', type, '— route params:', route.params);
                        setError(`Unknown exam type: "${type}". Please go back and try again.`);
                }
            } catch (err) {
                console.error('[ExamScreen] Fetch error:', err);
                setError('Network error — check your connection and try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [type, subject, topic, userData.class]);

    // ── Render states ─────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#864AF9" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.subjectSelectionContainer}>
            <View style={styles.headerCard}>
                <Text style={styles.subjectSelectionTitle}>
                    Select {examLabel} for {userData.class}
                </Text>
                {selectedSubjects.length > 0 && (
                    <Text style={styles.selectionCount}>{selectedSubjects.length} selected</Text>
                )}
                {canSelectAll && subjects.length > 0 && (
                    <TouchableOpacity style={styles.selectAllBtn} onPress={toggleSelectAll}>
                        <Text style={styles.selectAllBtnText}>{allSelected ? 'Deselect All' : 'Select All'}</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={subjects}
                keyExtractor={(item) => {
                    if (type === 'classExam' || type === 'JAMB') return item.SubjectId?.toString() ?? item.Subject;
                    if (type === 'subjectExam') return item.TopicId?.toString() ?? item.Topic;
                    if (type === 'topicExam') return item.SubtopicId?.toString() ?? item.Subtopic;
                    return item.id?.toString();
                }}
                renderItem={({ item, index }) => {
                    let itemId = '';
                    if (type === 'classExam' || type === 'JAMB') itemId = item.Subject;
                    else if (type === 'subjectExam') itemId = item.Topic;
                    else if (type === 'topicExam') itemId = item.Subtopic;

                    return (
                        <AnimatedSubjectItem
                            item={item}
                            index={index}
                            isSelected={selectedSubjects.includes(itemId)}
                            onPress={toggleSubject}
                            type={type}
                        />
                    );
                }}
                contentContainerStyle={styles.subjectList}
                showsVerticalScrollIndicator={false}
            />

            <AnimatedStartButton
                onPress={handleStartExam}
                disabled={selectedSubjects.length === 0}
                selectedCount={selectedSubjects.length}
            />
        </View>
    );
};

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    subjectSelectionContainer: { flex: 1, backgroundColor: '#F8F9FE', padding: 16 },
    headerCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, alignItems: 'center' },
    subjectSelectionTitle: { fontSize: 22, fontWeight: '700', color: '#2D3748', textAlign: 'center', letterSpacing: 0.3 },
    selectionCount: { fontSize: 14, fontWeight: '600', color: '#864AF9', marginTop: 8, backgroundColor: '#F7F3FF', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 },
    selectAllBtn: { marginTop: 10, borderWidth: 1.5, borderColor: '#864AF9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    selectAllBtnText: { fontSize: 13, fontWeight: '700', color: '#864AF9', letterSpacing: 0.3 },
    subjectList: { paddingBottom: 24 },
    subjectItem: { backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: '#E2E8F0', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, gap: 12 },
    subjectItemSelected: { borderLeftColor: '#864AF9', backgroundColor: '#F7F3FF', shadowColor: '#864AF9', shadowOpacity: 0.15, elevation: 4 },
    subCont: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    subImg: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#F7F9FC' },
    subjectText: { fontSize: 17, fontWeight: '600', color: '#2D3748', flex: 1, letterSpacing: 0.2 },
    startButton: { backgroundColor: '#864AF9', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 16, shadowColor: '#864AF9', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
    startButtonDisabled: { backgroundColor: '#CBD5E0', shadowOpacity: 0.1 },
    startButtonText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FE' },
    errorText: { fontSize: 16, color: '#F56565', textAlign: 'center', marginTop: 20, marginHorizontal: 24 },
    backButton: { marginTop: 20, backgroundColor: '#864AF9', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
    backButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default ExamScreen;