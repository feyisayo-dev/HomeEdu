import React, { memo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import styles from './questionStyles';

const Breadcrumb = memo(
  ({ currentQuestion }) => {
    if (!currentQuestion) return null;

    const breadcrumbItems = [
      { label: currentQuestion.class,    icon: '🎓' },
      { label: currentQuestion.subject,  icon: '📚' },
      { label: currentQuestion.topic,    icon: '📖' },
      { label: currentQuestion.subtopic, icon: '📝' },
    ].filter((item) => item.label);

    return (
      <View style={styles.breadcrumbContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.breadcrumbScroll}
          overScrollMode="never"
          bounces={true}
        >
          {breadcrumbItems.map((item, index) => (
            <React.Fragment key={index}>
              <View style={styles.breadcrumbItem}>
                <Text style={styles.breadcrumbIcon}>{item.icon}</Text>
                <Text style={styles.breadcrumbText} numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
              {index < breadcrumbItems.length - 1 && (
                <Text style={styles.breadcrumbSeparator}>›</Text>
              )}
            </React.Fragment>
          ))}
        </ScrollView>
      </View>
    );
  },
  // Only re-render if the QuestionId changes
  (prevProps, nextProps) =>
    prevProps.currentQuestion?.QuestionId === nextProps.currentQuestion?.QuestionId
);

export default Breadcrumb;
