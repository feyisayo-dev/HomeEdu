// components/QuestionNumberStrip.js
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';

const QuestionNumberStrip = ({ total, currentIndex, onPressNumber }) => {
    const numbers = Array.from({ length: total }, (_, i) => i + 1);

    return (
        <FlatList
            horizontal
            data={numbers}
            keyExtractor={(item) => item.toString()}
            contentContainerStyle={styles.container}
            renderItem={({ item, index }) => (
                <TouchableOpacity
                    style={[
                        styles.numberBox,
                        currentIndex === index && styles.activeBox,
                    ]}
                    onPress={() => onPressNumber(index)}
                >
                    <Text
                        style={[
                            styles.numberText,
                            currentIndex === index && styles.activeText,
                        ]}
                    >
                        {item}
                    </Text>
                </TouchableOpacity>
            )}
            showsHorizontalScrollIndicator={false}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },

    numberBox: {
        width: 38,
        height: 38,
        borderRadius: 8,
        marginHorizontal: 5,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f2f2f2',
        borderWidth: 1,
        borderColor: '#ccc',
    },
    activeBox: {
        backgroundColor: '#864af9',
        borderColor: 'transparent',
    },
    numberText: {
        fontWeight: 'bold',
        color: '#333',
    },
    activeText: {
        color: '#fff',
    },
});

export default QuestionNumberStrip;
