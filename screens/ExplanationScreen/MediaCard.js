import React from 'react';
import { View, Image } from 'react-native';
import { Video } from 'expo-av';
import styles from './explanationStyles';

export const ImageCard = ({ value }) => (
    <Image source={{ uri: value }} style={styles.image} />
);

export const VideoCard = ({ value }) => (
    <View style={styles.videoContainer}>
        <Video source={{ uri: value }} style={styles.video} useNativeControls resizeMode="contain" isLooping={false} />
    </View>
);
