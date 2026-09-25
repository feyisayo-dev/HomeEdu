import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import axios from 'axios';

const useExamples = ({ routeParams, navigation }) => {
    const { subtopicId } = routeParams;
    const [examples, setExamples] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const fetchExamples = async () => {
            try {
                const response = await axios.get(`https://homeedu.fsdgroup.com.ng/api/examples/${subtopicId}`);
                if (response.data.status === 200) setExamples(response.data.data);
                else setExamples([]);
            } catch (error) {
                Alert.alert('Error', 'Failed to fetch examples. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        fetchExamples();
    }, [subtopicId]);

    const handleNext = () => {
        if (currentIndex < examples.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // Waterfall: Final drop to Questions (Explanations already happened)
            navigation.navigate('Question', { ...routeParams, type: 'subtopicExam' });
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    };

    return { examples, loading, currentIndex, handleNext, handlePrev };
};

export default useExamples;