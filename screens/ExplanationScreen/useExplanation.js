import { useState, useEffect } from 'react';
import axios from 'axios';

const BASE = 'https://homeedu.fsdgroup.com.ng/api';

const useExplanation = ({ routeParams, navigation }) => {
    const { subtopicId } = routeParams;
    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [checkingNext, setCheckingNext] = useState(false); // Brought this back!

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
                                if (Array.isArray(parsed) && parsed.length === 3 && parsed[2].type === 'timings') {
                                    return [{ type: 'lyrics', text: parsed[0].value, audioUrl: parsed[1].value, timingsUrl: parsed[2].value }];
                                }
                                return Array.isArray(parsed) ? parsed : [parsed];
                            } catch (e) { return []; }
                        });
                        if (allCards.length > 0) setContent(allCards);
                        else setError('No content found.');
                    } else { setError('Explanation content is missing.'); }
                } else { setError('Failed to load explanation.'); }
            } catch (err) {
                setError('An error occurred.');
            } finally {
                setLoading(false);
            }
        };
        fetchExplanation();
    }, [subtopicId]);

    const handleNext = async () => {
        if (currentIndex < content.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // Waterfall: Check Examples -> Fallback to Questions
            setCheckingNext(true);
            try {
                const response = await axios.get(`${BASE}/examples/${subtopicId}`);
                if (response.data && response.data.status === 200 && response.data.data.length > 0) {
                    navigation.navigate('Example', { ...routeParams });
                    return;
                }
            } catch (error) {}
            finally {
                setCheckingNext(false);
            }
            
            navigation.navigate('Question', { ...routeParams, type: 'subtopicExam' });
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    };

    return { content, loading, error, currentIndex, checkingNext, handleNext, handlePrev };
};

export default useExplanation;