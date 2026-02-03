import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';

export function StatsWidget({ streaks, stars }) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderWidth: 4,     // Neo-Brutalist Border
        borderColor: '#000000',
      }}
    >
      {/* LEFT: STREAKS */}
      <FlexWidget style={{ alignItems: 'center', flexDirection: 'row' }}>
        <TextWidget
          text="🔥"
          style={{ fontSize: 32, marginRight: 8 }}
        />
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget
            text={`${streaks}`}
            style={{ fontSize: 28, fontWeight: 'bold', color: '#000000' }}
          />
          <TextWidget
            text="Day Streak"
            style={{ fontSize: 12, color: '#864AF9', fontWeight: 'bold' }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* DIVIDER */}
      <FlexWidget
        style={{
          width: 2,
          height: 40,
          backgroundColor: '#E2E8F0',
          marginHorizontal: 16,
        }}
      />

      {/* RIGHT: STARS */}
      <FlexWidget style={{ alignItems: 'center', flexDirection: 'row' }}>
        <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
          <TextWidget
            text={`${stars}`}
            style={{ fontSize: 28, fontWeight: 'bold', color: '#000000' }}
          />
          <TextWidget
            text="Total Stars"
            style={{ fontSize: 12, color: '#FFD700', fontWeight: 'bold' }}
          />
        </FlexWidget>
        <TextWidget
          text="⭐"
          style={{ fontSize: 32, marginLeft: 8 }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}