import React from 'react';
import { StatsWidget } from './src/widgets/StatsWidget';

export async function widgetTaskHandler(props) {
  const { widgetInfo } = props;
  const widgetName = widgetInfo.widgetName;

  console.log('📱 Widget task handler called:', widgetName);

  if (widgetName === 'StatsWidget') {
    // Get data from widgetInfo, default to 0 if not provided
    const streaks = widgetInfo.streaks || 0;
    const stars = widgetInfo.stars || 0;

    console.log('✅ Rendering StatsWidget with:', { streaks, stars });

    await props.renderWidget(
      <StatsWidget streaks={streaks} stars={stars} />
    );
  }
}