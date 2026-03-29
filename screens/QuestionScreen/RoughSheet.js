import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import styles from './questionStyles';

const RoughSheet = ({ visible, onClose }) => {
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);

  const handleTouchStart = (evt) => {
    evt.stopPropagation();
    const { locationX, locationY } = evt.nativeEvent;
    setIsDrawing(true);
    setCurrentPath(`M${locationX},${locationY}`);
  };

  const handleTouchMove = (evt) => {
    evt.stopPropagation();
    if (!isDrawing) return;
    const { locationX, locationY } = evt.nativeEvent;
    setCurrentPath((prev) => `${prev} L${locationX},${locationY}`);
  };

  const handleTouchEnd = (evt) => {
    evt.stopPropagation();
    if (currentPath && isDrawing) {
      setPaths((prev) => [...prev, currentPath]);
    }
    setCurrentPath('');
    setIsDrawing(false);
  };

  const handleClear = () => {
    setPaths([]);
    setCurrentPath('');
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.rsContainer}>
        <View style={styles.rsHeader}>
          <Text style={styles.rsTitle}>✏️ Rough Sheet</Text>
          <View style={styles.rsControls}>
            <TouchableOpacity onPress={handleClear} style={styles.rsBtnClear}>
              <Text style={styles.rsBtnText}>Clear Page</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.rsBtnClose}>
              <Text style={[styles.rsBtnText, { color: '#fff' }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={styles.rsCanvas}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={handleTouchStart}
          onResponderMove={handleTouchMove}
          onResponderRelease={handleTouchEnd}
          onResponderTerminate={handleTouchEnd}
        >
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
            {paths.map((pathData, index) => (
              <Path key={`path-${index}`} d={pathData} stroke="#000" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {currentPath !== '' && (
              <Path d={currentPath} stroke="#000" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </Svg>
        </View>
      </View>
    </Modal>
  );
};

export default RoughSheet;
