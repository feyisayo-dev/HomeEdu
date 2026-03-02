import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import React from 'react';
import { StatsWidget } from '../widgets/StatsWidget';

/**
 * Updates the home screen widget with latest user stats
 * @param {number} streaks - Current day streak count
 * @param {number} stars - Total stars earned
 */
export const updateStatsWidget = async (streaks = 0, stars = 0) => {
  // Only works on Android
  if (Platform.OS !== 'android') {
    console.log('ℹ️ Widgets only available on Android');
    return;
  }

  try {
    await requestWidgetUpdate({
      widgetName: 'StatsWidget',
      renderWidget: () => <StatsWidget streaks={streaks} stars={stars} />,
      widgetInfo: {
        minWidth: 320,
        minHeight: 100,
        targetCellWidth: 4,
        targetCellHeight: 1,
      },
      widgetNotFound: () => {
        console.log('ℹ️ Widget not added to home screen yet');
      },
    });
    console.log('✅ Widget updated:', { streaks, stars });
  } catch (error) {
    // Suppress error in development/Expo Go
    if (__DEV__) {
      console.log('⚠️ Widget update failed (ignore if using Expo Go):', error.message);
    } else {
      console.error('❌ Widget update failed:', error);
    }
  }
};