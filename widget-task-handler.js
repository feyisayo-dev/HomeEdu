import React from 'react';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { StatsWidget } from './src/widgets/StatsWidget'; // <--- Check this path!

export async function widgetTaskHandler(props) {
  const widgetInfo = props.widgetInfo;
  const widgetName = widgetInfo.widgetName;

  if (widgetName === 'StatsWidget') {
    // Default empty state if no data passed yet
    props.renderWidget(
      <StatsWidget streaks={0} stars={0} />
    );
  }
}