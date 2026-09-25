import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import Katex from 'react-native-katex';
import styles from './exampleStyles';
import ExampleQuestionRenderer from '../../renderer/ExampleQuestionRenderer';

const inlineStyle = `
  html, body { background-color: transparent; margin: 0; padding: 0; }
  .katex { font-size: 4em; }
`;

const ErrorSafeMath = ({ math }) => {
    const [hasError, setHasError] = useState(false);
    if (hasError) return <Text style={{ color: 'red', fontStyle: 'italic' }}>Failed to render: {math}</Text>;
    return (
        <Katex
            expression={math} displayMode={false} throwOnError={false} errorColor="#f00"
            style={{ minHeight: 30 }} inlineStyle={inlineStyle}
            onError={() => setHasError(true)}
        />
    );
};

const ExampleCardContent = ({ example }) => {
    // --- Table Renderer ---
    const renderTableFromJson = (headers, rows) => {
        if (!Array.isArray(headers) || !Array.isArray(rows)) return null;
        return (
            <ScrollView horizontal style={styles.scrollContainer} showsHorizontalScrollIndicator={false}>
                <View style={styles.table}>
                    <View style={styles.tableRow}>
                        {headers.map((h, i) => (
                            <View key={`header-${i}`} style={[styles.headerCell, i === headers.length - 1 && { borderRightWidth: 0 }]}>
                                <Text style={styles.headerText}>{h}</Text>
                            </View>
                        ))}
                    </View>
                    {rows.map((row, rowIndex) => (
                        <View key={`row-${rowIndex}`} style={styles.tableRow}>
                            {row.map((cell, cellIndex) => (
                                <View key={`cell-${rowIndex}-${cellIndex}`} style={[styles.tableCell, cellIndex === row.length - 1 && { borderRightWidth: 0 }, rowIndex === rows.length - 1 && { borderBottomWidth: 0 }]}>
                                    {Array.isArray(cell) ? (
                                        <View style={styles.horizontalItems}>
                                            {cell.map((item, itemIndex) => (
                                                <View key={`item-${itemIndex}`} style={styles.cellBox}>
                                                    <Text style={styles.cellText}>{item}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    ) : <Text style={styles.cellText}>{cell}</Text>}
                                </View>
                            ))}
                        </View>
                    ))}
                </View>
            </ScrollView>
        );
    };

    // --- Complex Text/Math Renderer ---
    const renderContentWithMath = (text) => {
        if (typeof text !== 'string') return null;
        const lines = text.split('\n');
        const elements = [];
        let pendingHeaders = [];

        const renderStyledText = (rawText, keyPrefix = 'styled') => {
            const fragments = [];
            const parts = rawText.split(/(\$\$.*?\$\$)/g);
            parts.forEach((part, i) => {
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    fragments.push(<ErrorSafeMath key={`${keyPrefix}-math-${i}`} math={part.slice(2, -2).trim()} />);
                } else {
                    const subParts = part.split(/(\*\*.*?\*\*|\{(#[0-9a-fA-F]{3,6}|[a-z]+)\}.*?\{\/\})/g);
                    subParts.forEach((sub, j) => {
                        if (sub.startsWith('**') && sub.endsWith('**')) {
                            fragments.push(<Text key={`${keyPrefix}-bold-${i}-${j}`} style={[styles.paragraphText, { fontWeight: '900' }]}>{sub.slice(2, -2)}</Text>);
                        } else if (sub.match(/^\{(#[0-9a-fA-F]{3,6}|[a-z]+)\}.*\{\/\}$/)) {
                            const match = sub.match(/^\{(#[0-9a-fA-F]{3,6}|[a-z]+)\}(.*)\{\/\}$/);
                            fragments.push(<Text key={`${keyPrefix}-color-${i}-${j}`} style={[styles.paragraphText, { color: match[1], fontWeight: 'bold' }]}>{match[2]}</Text>);
                        } else if (sub) {
                            fragments.push(<Text key={`${keyPrefix}-text-${i}-${j}`} style={styles.paragraphText}>{sub}</Text>);
                        }
                    });
                }
            });
            return fragments;
        };

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('-')) {
                elements.push(
                    <View key={`list-${index}`} style={styles.bulletItem}>
                        <Text style={styles.bulletDot}>•</Text>
                        <Text style={styles.bulletText}>{renderStyledText(trimmed.slice(1).trim(), `list-${index}`)}</Text>
                    </View>
                );
            } else if (trimmed.startsWith('~')) {
                pendingHeaders.push(trimmed.replace(/^~+/, '').trim());
            } else if (trimmed.startsWith('[[')) {
                try {
                    const rows = JSON.parse(trimmed);
                    if (pendingHeaders.length && Array.isArray(rows)) {
                        elements.push(<View key={`table-${index}`}>{renderTableFromJson(pendingHeaders, rows)}</View>);
                        pendingHeaders = [];
                    }
                } catch (err) {
                    elements.push(<Text key={`invalid-${index}`} style={{ color: 'red' }}>⚠️ Invalid JSON table</Text>);
                }
            } else if (trimmed.length > 0) {
                elements.push(<Text key={`para-${index}`} style={styles.paragraphText}>{renderStyledText(trimmed, `para-${index}`)}</Text>);
            }
        });
        return <View style={{ gap: 10, marginBottom: 20 }}>{elements}</View>;
    };

    return (
        <View style={{ width: '100%' }}>
            {example.Instruction && (
                <Text style={styles.instructionText}>📝 {example.Instruction}</Text>
            )}
            
            {/* The duplicate Image and Text rendering has been removed from here. */}
            {/* We now pass the advanced text parser down to the renderer. */}
            <ExampleQuestionRenderer 
                example={example} 
                customRenderer={renderContentWithMath} 
            />
        </View>
    );
};

export default ExampleCardContent;