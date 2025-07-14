import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    Image,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
} from 'react-native';
import axios from 'axios';
import Katex from 'react-native-katex';

const ExampleScreen = ({ route, navigation }) => {
    const { subtopicId, subtopic } = route.params; // Passed from the previous screen
    const [examples, setExamples] = useState([]);
    const [loading, setLoading] = useState(true);

    const renderTableFromJson = (headers, rows) => {
        if (!Array.isArray(headers) || !Array.isArray(rows)) return null;

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

                    {/* Body Rows */}
                    {rows.map((row, rowIndex) => (
                        <View key={`row-${rowIndex}`} style={styles.tableRow}>
                            {row.map((cell, cellIndex) => (
                                <View key={`cell-${rowIndex}-${cellIndex}`} style={styles.tableCell}>
                                    {Array.isArray(cell) ? (
                                        <View style={styles.horizontalItems}>
                                            {cell.map((item, itemIndex) => (
                                                <View key={`item-${itemIndex}`} style={styles.cellBox}>
                                                    <Text style={styles.cellText}>{item}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    ) : (
                                        <Text style={styles.cellText}>{cell}</Text>
                                    )}
                                </View>
                            ))}
                        </View>
                    ))}
                </View>
            </ScrollView>
        );
    };


    useEffect(() => {
        fetchExamples();
    }, []);
    const renderContentWithMath = (text, textStyle = {}) => {
        if (typeof text !== 'string') return null;

        const lines = text.split('\n');
        const elements = [];
        let pendingHeaders = [];

        // Helper to render inline text with **bold** and {color}text{/}
        const renderStyledText = (rawText, keyPrefix = 'styled') => {
            const fragments = [];

            // Step 1: Split by LaTeX
            const parts = rawText.split(/(\$\$.*?\$\$)/g);

            parts.forEach((part, i) => {
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    fragments.push(
                        <ErrorSafeMath key={`${keyPrefix}-math-${i}`} math={part.slice(2, -2).trim()} />
                    );
                } else {
                    // Step 2: Handle bold and color
                    const subParts = part.split(/(\*\*.*?\*\*|\{(#[0-9a-fA-F]{3,6}|[a-z]+)\}.*?\{\/\})/g);

                    subParts.forEach((sub, j) => {
                        if (sub.startsWith('**') && sub.endsWith('**')) {
                            const boldText = sub.slice(2, -2);
                            fragments.push(
                                <Text key={`${keyPrefix}-bold-${i}-${j}`} style={[textStyle, { fontWeight: 'bold' }]}>
                                    {boldText}
                                </Text>
                            );
                        } else if (sub.match(/^\{(#[0-9a-fA-F]{3,6}|[a-z]+)\}.*\{\/\}$/)) {
                            const colorMatch = sub.match(/^\{(#[0-9a-fA-F]{3,6}|[a-z]+)\}(.*)\{\/\}$/);
                            const color = colorMatch[1];
                            const content = colorMatch[2];
                            fragments.push(
                                <Text key={`${keyPrefix}-color-${i}-${j}`} style={[textStyle, { color }]}>
                                    {content}
                                </Text>
                            );
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

            // 🔹 List item
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

            // 🔹 Table headers
            else if (trimmed.startsWith('~')) {
                pendingHeaders.push(trimmed.replace(/^~+/, '').trim());
            }

            // 🔹 Table data
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

            // 🔸 Regular styled paragraph
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
    const fetchExamples = async () => {
        try {
            const response = await axios.get(
                `https://homeedu.fsdgroup.com.ng/api/examples/${subtopicId}`
            );
            if (response.data.status === 200) {
                setExamples(response.data.data);
            } else {
                Alert.alert('No Examples', response.data.message);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch examples. Please try again later.');
        } finally {
            setLoading(false);
        }
    };
    const ExampleCard = ({ example }) => (
        <View style={styles.card}>
            {example.Image ? (
                <Image source={{ uri: example.Image }} style={styles.image} />
            ) : null}
            <Text style={styles.text}>Instruction: {example.Instruction}</Text>
            {renderContentWithMath(example.Text, styles.text)}
        </View>
    );


    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Examples for Subtopic: {subtopic}</Text>
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#864af9" />
                </View>
            ) : examples.length > 0 ? (
                <FlatList
                    data={examples}
                    keyExtractor={(item) => item.ExampleId.toString()}
                    renderItem={({ item }) => <ExampleCard example={item} />}
                    contentContainerStyle={styles.list}
                />
            ) : (
                <Text style={styles.noExamplesText}>No examples found.</Text>
            )}
            <TouchableOpacity
                style={styles.button}
                onPress={() =>
                    navigation.navigate('Question', {
                        subtopicId: subtopicId,
                        subtopic: subtopic,
                        selectedSubjects: null,
                        type: null,
                    })

                }
            >
                <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
        </View>
    );

};
const inlineStyle = `
        html, body {
        background-color: transparent;
        margin: 0;
        padding: 0;
        }
        .katex {
        font-size: 4em;
        }
`;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f4f4f4f', // Light background
        padding: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        //color: '#007bff', // Themed blue color
        color: '#864af9', // Themed blue color
        marginBottom: 24,
        textAlign: 'center',
    },
    list: {
        paddingBottom: 16,
    },
    card: {
        backgroundColor: '#fcfcfc', // Card background
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#ddd', // Light border
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2, // Android shadow
    },
    image: {
        width: '100%',
        height: 200, // Fixed height for uniform images
        borderRadius: 8,
        marginBottom: 12,
        resizeMode: 'cover', // Fit image within boundaries
        borderWidth: 1,
        borderColor: '#864af9',
        objectFit: 'contain',
        tintColor: '864af9'
    },
    text: {
        fontSize: 16,
        lineHeight: 24, // Improved readability
        color: '#333', // Neutral text color
        marginBottom: 8,
        fontFamily: 'latto'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
    },
    noExamplesText: {
        fontSize: 16,
        color: '#888', // Subtle color for no examples message
        textAlign: 'center',
        marginTop: 20,
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
        fontFamily: 'milkyCustom',
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
        color: '#333',
        fontFamily: 'milkyCustom',
        lineHeight: 24,
    },
});


export default ExampleScreen;
