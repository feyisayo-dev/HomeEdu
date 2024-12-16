
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import React, { useEffect, useState } from 'react';
import { View, Button, Text, StyleSheet, Image, ScrollView } from 'react-native';
import axios from 'axios';
import { useUser } from '../context/UserContext';

const DashboardScreen = ({ route, navigation }) => {
    const { userData, setUserData } = useUser(); // Access user data from context
    const [streaks, setStreaks] = useState(0);

    useEffect(() => {
        if (!userData) {
            // If userData is not yet set, initialize it
            const data = route.params?.userData; // Get it from navigation params
            setUserData(data); // Save it to context
        }
    }, [userData, setUserData]);

    useFocusEffect(
        useCallback(() => {
            const fetchStreaks = async () => {
                try {
                    if (!userData) return;
                    const id = userData.username;
                    const response = await axios.get(
                        `https://homeedu.fsdgroup.com.ng/api/streaks?id=${id}`
                    );
                    setStreaks(response.data.streak_count);
                } catch (error) {
                    console.error('Error fetching streaks:', error);
                }
            };

            fetchStreaks();
        }, [userData])
    );



    return (
        <ScrollView style={styles.container}>
            {/* First Row: User Info */}
            <View style={styles.row}>
                {/* User Info Box */}
                <View style={styles.box}>
                    <Image source={{ uri: userData.avatar }} style={styles.avatar} />
                    <Text style={styles.username}>{userData.username}</Text>
                </View>
                {/* Streaks Box */}
                <View style={styles.box}>
                    <Text style={styles.title}>Streaks</Text>
                    <Text style={styles.content}>{streaks} 📚</Text>
                </View>
            </View>

            {/* Second Row: Report */}
            <View style={styles.row}>
                <View style={[styles.box, styles.fullWidth]}>
                    <Text style={styles.title}>Report</Text>
                    <Text style={styles.content}>{userData.report || "No reports yet"}</Text>
                </View>
            </View>

            {/* Third Row: Timetable */}
            <View style={styles.row}>
                <View style={[styles.box, styles.fullWidth]}>
                    <Text style={styles.title}>Timetable</Text>
                    <Text style={styles.content}>
                        {userData.timetable || "No schedule available"}
                    </Text>
                </View>
            </View>

            {/* Fourth Row: Leaderboard */}
            <View style={styles.row}>
                <View style={[styles.box, styles.fullWidth]}>
                    <Text style={styles.title}>Leaderboard</Text>
                    <Text style={styles.content}>
                        {userData.leaderboard || "No data available"}
                    </Text>
                </View>
            </View>

            {/* Fifth Row: Subjects */}
            <View style={styles.row}>
                <View style={[styles.box, styles.fullWidth]}>
                    <Text style={styles.title}>Subjects</Text>
                    <Text style={styles.content}>See your subjects</Text>
                    <Button
                        title="Subjects"
                        onPress={() => navigation.navigate('Subject')} // Ensure navigation is passed as a prop
                    />
                </View>
            </View>


            {/* Practice Row */}
            <View style={styles.row}>
                <View style={[styles.box, styles.fullWidth]}>
                    <Text style={styles.title}>Practice</Text>
                    <Text style={styles.content}>Start practicing by answering questions below!</Text>
                    {/* Button to navigate to the QuestionScreen */}
                    <Button
                        title="Start Practice"
                        onPress={() => navigation.navigate('Question')} // Ensure navigation is passed as a prop
                    />
                </View>
            </View>


        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    box: {
        flex: 1,
        backgroundColor: '#fff',
        borderColor: '#007bff', // Blue border
        borderWidth: 2,
        borderRadius: 8,
        padding: 16,
        margin: 4,
    },
    fullWidth: {
        flex: 1,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignSelf: 'center',
    },
    username: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    content: {
        fontSize: 14,
        textAlign: 'center',
    },
});

export default DashboardScreen;
