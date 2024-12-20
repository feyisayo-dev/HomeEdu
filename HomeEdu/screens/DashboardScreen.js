import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import React, { useEffect, useState } from 'react';
import { View, Button, Text, FlatList, StyleSheet, Image, ScrollView } from 'react-native';
import axios from 'axios';
import { useUser } from '../context/UserContext';
const DashboardScreen = ({ route, navigation }) => {
    const { userData, setUserData } = useUser(); // Access user data from context
    const [streaks, setStreaks] = useState(0);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!userData) {
            // If userData is not yet set, initialize it
            const data = route.params?.userData; // Get it from navigation params
            setUserData(data); // Save it to context
        }
    }, [userData, setUserData]);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const response = await axios.get(`https://homeedu.fsdgroup.com.ng/api/report/${userData.username}`);
                if (response.data.status === 200) {
                    setReports(response.data.data.slice(0, 5));
                } else {
                    setError('No reports found.');
                }
            } catch (err) {
                setError('An error occurred while fetching reports.');
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, [userData.username]);

    useFocusEffect(
        useCallback(() => {
            const fetchStreaks = async () => {
                try {
                    if (!userData) return;
                    const id = userData.username;
                    const response = await axios.get(
                        `https://homeedu.fsdgroup.com.ng/api/streaks?username=${id}`
                    );
                    setStreaks(response.data.streak_count);
                } catch (error) {
                    console.error('Error fetching streaks:', error);
                }
            };

            fetchStreaks();
        }, [userData])
    );



    const sections = [
        { type: 'info' },
        { type: 'streaks' },
        { type: 'reports' },
        { type: 'timetable' },
        { type: 'leaderboard' },
        { type: 'subjects' },
        { type: 'practice' },
    ];

    const renderItem = ({ item }) => {
        switch (item.type) {
            case 'info':
                return (
                    <View style={styles.row}>
                        <View style={styles.box}>
                            <Image source={{ uri: userData.avatar }} style={styles.avatar} />
                            <Text style={styles.username}>{userData.username}</Text>
                        </View>
                    </View>
                );
            case 'streaks':
                return (
                    <View style={styles.box}>
                        <Text style={styles.title}>Streaks</Text>
                        <Text style={styles.content}>{streaks} 📚</Text>
                    </View>
                );
            case 'reports':
                return (
                    <View>
                        <Text style={styles.title}>Reports</Text>
                        {loading ? (
                            <Text>Loading...</Text>
                        ) : error ? (
                            <Text style={styles.error}>{error}</Text>
                        ) : (
                            reports.map((report, index) => (
                                <View key={index} style={styles.reportItem}>
                                    <Text style={styles.reportTitle}>
                                        {report.ExamId || report.SubtopicId || 'Unknown'}
                                    </Text>
                                    <Text style={styles.reportScore}>Score: {report.Score}%</Text>
                                </View>
                            ))
                        )}
                    </View>
                );
            case 'timetable':
                return (
                    <View style={styles.box}>
                        <Text style={styles.title}>Timetable</Text>
                        <Text style={styles.content}>
                            {userData.timetable || 'No schedule available'}
                        </Text>
                    </View>
                );
            case 'leaderboard':
                return (
                    <View style={styles.box}>
                        <Text style={styles.title}>Leaderboard</Text>
                        <Text style={styles.content}>
                            {userData.leaderboard || 'No data available'}
                        </Text>
                    </View>
                );
            case 'subjects':
                return (
                    <View style={styles.box}>
                        <Text style={styles.title}>Subjects</Text>
                        <Button
                            title="Subjects"
                            onPress={() => navigation.navigate('Subject')}
                        />
                    </View>
                );
            case 'practice':
                return (
                    <View style={styles.box}>
                        <Text style={styles.title}>Practice</Text>
                        <Button
                            title="Start Practice"
                            onPress={() => navigation.navigate('Question')}
                        />
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <FlatList
            data={sections}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.container}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        padding: 16,
    },
    row: {
        marginBottom: 16,
    },
    box: {
        backgroundColor: '#fff',
        borderColor: '#007bff',
        borderWidth: 2,
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    username: {
        textAlign: 'center',
        marginTop: 8,
        fontWeight: 'bold',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    content: {
        fontSize: 14,
        textAlign: 'center',
    },
    reportItem: {
        padding: 16,
        backgroundColor: '#f8f8f8',
        marginBottom: 8,
        borderRadius: 8,
    },
    reportTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    reportScore: {
        color: '#555',
    },
    error: {
        color: 'red',
    },
});

export default DashboardScreen;
