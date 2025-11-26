import React, { useEffect, useState } from 'react';
import { View, Text, Image, ActivityIndicator, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import axios from 'axios';
import { Video } from 'expo-av';
import Katex from 'react-native-katex';

const ExplanationScreen = ({ route, navigation }) => {
    const { subtopicId, Subtopic } = route.params; // Get SubtopicId from route params
    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const renderTableFromJson = (data) => {
        if (!Array.isArray(data) || data.length !== 2) return null;

        const headers = data[0];
        const columns = data[1];

        console.log("🔍 Headers:", headers);
        console.log("📦 Columns:", columns);

        return (
            <ScrollView horizontal style={styles.scrollContainer}>
                <View style={styles.table}>
                    {/* Header Row */}
                    <View style={styles.tableRow}>
                        {headers.map((header, index) => (
                            <View key={`header-${index}`} style={styles.headerCell}>
                                <Text style={styles.headerText}>{header}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Just render raw column content for now */}
                    <View style={styles.tableRow}>
                        {columns.map((columnData, colIndex) => (
                            <View key={`col-${colIndex}`} style={styles.tableCell}>
                                {/* The 'columnData' itself is the array ["H", "T", "U"] */}
                                {/* So we just map over 'columnData' directly */}
                                {Array.isArray(columnData) && ( // Keep this check if columnData might not always be an array
                                    <View style={styles.horizontalItems}>
                                        {columnData.map((item, itemIndex) => ( // Changed from columnData[0] to columnData
                                            <View key={`item-${itemIndex}`} style={styles.cellBox}>
                                                <Text style={styles.cellText}>{item}</Text>
                                            </View>

                                        ))}
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        );
    };

    const renderContentWithMath = (text, textStyle = {}) => {
        if (
            Array.isArray(text) &&
            text.length === 2 &&
            Array.isArray(text[0]) &&
            Array.isArray(text[1])
        ) {
            return renderTableFromJson(text);
        }

        if (typeof text !== 'string') return null;

        const lines = text.split('\n');
        const elements = [];
        let pendingHeaders = [];

        const renderStyledText = (rawText, keyPrefix = 'styled') => {
            if (typeof rawText !== 'string') {
                console.warn('⚠️ renderStyledText received non-string:', rawText);
                return null;
            }

            const fragments = [];
            const parts = rawText.split(/(\$\$.*?\$\$)/g).filter(Boolean); // remove falsy values like undefined or ''

            parts.forEach((part, i) => {
                if (typeof part !== 'string') return; // skip non-string fragments

                if (part.startsWith('$$') && part.endsWith('$$')) {
                    fragments.push(
                        <ErrorSafeMath key={`${keyPrefix}-math-${i}`} math={part.slice(2, -2).trim()} />
                    );
                } else {
                    const subParts = part.split(/(\*\*.*?\*\*|\{(#[0-9a-fA-F]{3,6}|[a-z]+)\}.*?\{\/\})/g).filter(Boolean);

                    subParts.forEach((sub, j) => {
                        if (typeof sub !== 'string') return; // extra guard

                        if (sub.startsWith('**') && sub.endsWith('**')) {
                            fragments.push(
                                <Text key={`${keyPrefix}-bold-${i}-${j}`} style={[textStyle, { fontWeight: 'bold' }]}>
                                    {sub.slice(2, -2)}
                                </Text>
                            );
                        } else if (sub.match(/^\{(#[0-9a-fA-F]{3,6}|[a-z]+)\}.*\{\/\}$/)) {
                            const match = sub.match(/^\{(#[0-9a-fA-F]{3,6}|[a-z]+)\}(.*?)\{\/\}$/);
                            if (match) {
                                fragments.push(
                                    <Text key={`${keyPrefix}-color-${i}-${j}`} style={[textStyle, { color: match[1] }]}>
                                        {match[2]}
                                    </Text>
                                );
                            }
                        } else {
                            fragments.push(
                                <Text key={`${keyPrefix}-text-${i}-${j}`} style={textStyle}>
                                    {sub}
                                </Text>
                            );
                        }
                    });
                }
            });

            return fragments;
        };


        lines.forEach((line, index) => {
            const trimmed = line.trim();

            // 🔸 List item
            if (trimmed.startsWith('-')) {
                elements.push(
                    <View key={`list-${index}`} style={styles.bulletItem}>
                        <Text style={styles.bulletDot}>•</Text>
                        <Text style={styles.bulletText}>
                            {renderStyledText(trimmed.slice(1).trim(), `list-${index}`)}
                        </Text>
                    </View>
                );
            }

            // 🔹 Bullet point line (starts with ~)
            else if (trimmed.startsWith('~')) {
                const bulletText = trimmed.replace(/^~\s*/, '');
                elements.push(
                    <View key={`bullet-${index}`} style={styles.bulletItem}>
                        <Text style={styles.bulletDot}>•</Text>
                        <Text style={styles.bulletText}>
                            {renderStyledText(bulletText, `bullet-${index}`)}
                        </Text>
                    </View>
                );
            }

            // 🔹 Table data ([[...) — after header lines (~)
            else if (trimmed.startsWith('[[')) {
                try {
                    const rows = JSON.parse(trimmed);
                    if (pendingHeaders.length && Array.isArray(rows)) {
                        elements.push(
                            <View key={`table-${index}`}>
                                {renderTableFromJson(pendingHeaders, rows)}
                            </View>
                        );
                        pendingHeaders = [];
                    } else {
                        elements.push(
                            <Text key={`invalid-table-${index}`} style={{ color: 'red' }}>
                                ⚠️ Invalid table format
                            </Text>
                        );
                    }
                } catch (err) {
                    elements.push(
                        <Text key={`invalid-json-${index}`} style={{ color: 'orange' }}>
                            ⚠️ Invalid JSON table data
                        </Text>
                    );
                }
            }

            // 🔹 Table headers (~) — collect only, don’t render
            else if (trimmed.startsWith('~')) {
                pendingHeaders.push(trimmed.replace(/^~+/, '').trim());
            }

            // 🔸 Paragraph or math
            else if (trimmed.length > 0) {
                elements.push(
                    <Text key={`para-${index}`} style={styles.paragraphText}>
                        {renderStyledText(trimmed, `para-${index}`)}
                    </Text>
                );
            }
        });

        return <View style={{ gap: 10 }}>{elements}</View>;
    };



    const ErrorSafeMath = ({ math }) => {
        const [hasError, setHasError] = useState(false);

        if (hasError) {
            console.warn("❌ Math rendering failed for:", math);
            return (
                <Text style={{ color: 'red', fontStyle: 'italic' }}>
                    Failed to render: {math}
                </Text>
            );
        }

        return (
            <Katex
                expression={math}
                displayMode={false}
                throwOnError={false}
                errorColor="#f00"
                style={{ minHeight: 30 }}
                inlineStyle={inlineStyle}
                onError={() => setHasError(true)}
                onLoad={() => console.log("✅ Loaded:", math)}
            />
        );
    };
    useEffect(() => {
        const fetchExplanation = async () => {
            try {
                const response = await axios.get(
                    `https://homeedu.fsdgroup.com.ng/api/explanation/${subtopicId}`
                );
                console.log("API Response:", response.data);
                if (response.data.status === 200) {
                    const explanationData = response.data.data[0]; // Get the first explanation object
                    if (explanationData && explanationData.Content) {
                        // Parse the JSON string from Content
                        setContent(JSON.parse(explanationData.Content));
                    } else {
                        setError('Explanation content is missing.');
                    }
                } else {
                    setError('Failed to load explanation.');
                }
            } catch (err) {
                console.error(err);
                setError('An error occurred while fetching the explanation.');
            } finally {
                setLoading(false);
            }
        };

        fetchExplanation();
    }, [subtopicId]);

    if (loading) return <ActivityIndicator size="large" color="#0000ff" />;
    if (error) return <Text>{error}</Text>;

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.subtopicsTitle}>{Subtopic}</Text>
            {content.map((item, index) => {
                if (item.type === 'text') {
                    return (
                        <View key={index} style={styles.text}>
                            {renderContentWithMath(item.value, styles.text)}
                        </View>
                    );
                } else if (item.type === 'image') {
                    return (
                        <Image
                            key={index}
                            source={{ uri: item.value }}
                            style={styles.image}
                        />
                    );
                } else if (item.type === 'video') {
                    return (
                        <View key={index} style={styles.videoContainer}>
                            <Video
                                source={{ uri: item.value }}
                                style={styles.video}
                                useNativeControls
                                resizeMode="contain"
                                isLooping={false}
                            />
                        </View>
                    );
                }
                return null;
            })}
            <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate('Example', { 'subtopicId': subtopicId, 'subtopic': Subtopic })}
            >
                <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>


        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fcfcfc', // Light gray background
        padding: 16,
        paddingBottom: 32,
        // marginBottom: 20,
    },
    subtopicsTitle: {
        fontSize: 24,
        // fontWeight: 'bold',
        color: '#864af9',
        marginBottom: 24,
        textAlign: 'center',
        fontFamily: 'milkyCustom',
        textTransform: 'uppercase',
        flexWrap: 'wrap',            // 👈 Wrap long text
        paddingHorizontal: 10,       // 👈 Optional: prevent edge cutoff
    },

    text: {
        fontSize: 16,
        lineHeight: 22, // Better readability with proper line spacing
        color: '#333', // Neutral text color
        marginBottom: 16, // Space between text blocks
        // fontFamily: 'milkyCustom',
    },
    image: {
        width: '100%', // Full-width images
        height: 200, // Fixed height
        borderRadius: 8,
        marginBottom: 16,
        resizeMode: 'cover', // Ensures images are well-fitted
        borderWidth: 1,
        //borderColor: '#ddd', // Light border for images
        borderColor: '#864af9', // Light border for images
        objectFit: 'contain'
    },
    videoContainer: {
        marginBottom: 16, // Space below videos
        borderRadius: 8,
        overflow: 'hidden', // Ensures rounded corners for videos
        backgroundColor: '#000', // Placeholder background for videos
    },
    video: {
        width: '100%',
        height: 200, // Fixed video height
    },
    button: {
        backgroundColor: '#864af9',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff', // White text for contrast
    },
    scrollContainer: {
        marginVertical: 10,
    },
    table: {
        flexDirection: 'column',
        borderWidth: 1,
        borderColor: '#aaa',
    },
    tableRow: {
        flexDirection: 'row',
    },
    headerCell: {
        minWidth: 120, // match column
        paddingVertical: 12, // ⬅️ More vertical space
        paddingHorizontal: 8,
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#aaa',
        alignItems: 'center',
        justifyContent: 'center',
    },

    headerText: {
        fontWeight: 'bold',
        textAlign: 'center',
    },
    tableCell: {
        minWidth: 120, // exactly same as header
        padding: 8,
        borderWidth: 1,
        borderColor: '#aaa',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cellBox: {
        paddingVertical: 4,
        paddingHorizontal: 6,
        backgroundColor: '#eee',
        borderRadius: 4,
        marginHorizontal: 2,
        borderWidth: 1,
        borderColor: '#ccc',
        minWidth: 20,
    },

    cellText: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#333',
    },

    horizontalItems: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap', // allows wrap if too wide
    },
    paragraphText: {
        fontSize: 17,
        lineHeight: 26,
        color: '#222',
        // fontFamily: 'milkyCustom',
        paddingVertical: 4,
    },

    bulletItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingLeft: 10,
        paddingRight: 5,
        marginBottom: 6,
    },

    bulletDot: {
        fontSize: 16,
        color: '#864af9',
        marginRight: 8,
        lineHeight: 24,
    },

    bulletText: {
        flex: 1,
        fontSize: 16,
        color: '#864af9',
        // fontFamily: 'milkyCustom',
        lineHeight: 24,
    },
});


export default ExplanationScreen;
