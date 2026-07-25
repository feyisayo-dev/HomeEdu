import { useState, useEffect } from 'react';
import axios from 'axios';

const BASE = 'https://homeedu.fsdgroup.com.ng/api';

const useExplanation = ({ subtopicId, Subtopic, subject, topic, navigation }) => {
    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [checkingNext, setCheckingNext] = useState(false);

    // ── Fetch on mount ────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchExplanation = async () => {
            try {
                const response = await axios.get(`${BASE}/explanation/${subtopicId}`);

                if (response.data.status === 200) {
                    const rawDataList = response.data.data;
                    if (rawDataList && rawDataList.length > 0) {
                        const allCards = rawDataList.flatMap(item => {
                            if (!item.Content) return [];
                            try {
                                const parsed = JSON.parse(item.Content);
                                return Array.isArray(parsed) ? parsed : [parsed];
                            } catch (e) { return []; }
                        });

                        if (allCards.length > 0) setContent(allCards);
                        else setError('No content found.');
                    } else {
                        setError('Explanation content is missing.');
                    }
                } else {
                    setError('Failed to load explanation.');
                }
            } catch (err) {
                console.error(err);
                setError('An error occurred.');
            } finally {
                setLoading(false);
            }
        };
        fetchExplanation();
    }, [subtopicId]);

    // ── Navigation to next screen (examples or questions) ─────────────────────
    const navigateToQuestion = () => {
        navigation.navigate('Question', {
            subtopicId,
            subtopic: Subtopic,
            selectedSubjects: [Subtopic],
            type: 'subtopicExam',
            subject: subject || "Unknown Subject",
            topic: topic || "Unknown Topic",
        });
    };

    const checkAndNavigate = async () => {
        setCheckingNext(true);
        try {
            const response = await axios.get(`${BASE}/examples/${subtopicId}`);

            if (response.data && response.data.status === 200 && response.data.data.length > 0) {
                navigation.navigate('Example', { subtopicId, subtopic: Subtopic, subject, topic });
            } else {
                navigateToQuestion();
            }
        } catch (error) {
            if (error.response && error.response.status === 404) {
                navigateToQuestion();
            } else {
                console.error("Error checking examples:", error);
                navigateToQuestion();
            }
        } finally {
            setCheckingNext(false);
        }
    };

    // ── Card index nav ──────────────────────────────────────────────────────
    const handleNext = () => {
        if (currentIndex < content.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            checkAndNavigate();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    };

    return {
        content, loading, error,
        currentIndex, setCurrentIndex,
        checkingNext,
        handleNext, handlePrev, checkAndNavigate,
    };
};

export default useExplanation;
