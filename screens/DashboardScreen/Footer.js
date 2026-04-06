import React from 'react';
import { View, Text } from 'react-native';
import Constants from 'expo-constants';
import styles from './dashboardStyles';

const Footer = () => {
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  return (
    <View style={styles.footerContainer}>
      <Text style={styles.footerText}>HomeEdu v{appVersion}</Text>
    </View>
  );
};

export default Footer;