import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated, Platform } from 'react-native';

const { width } = Dimensions.get('window');

// ✅ HOMEEDU COLOR PALETTE
const COLORS = {
  primary: "#864AF9",
  background: "#F8F9FE",
  cardBg: "#FFFFFF",
  itemBg: "#F7F9FC",
  textDark: "#2D3748",
  textLight: "#718096",
  textWhite: "#FFFFFF",
  black: "#000000",
  success: "#C6F6D5",
  successText: "#065F46",
  border: "#000000",
  danger: "#FF4757",
  warning: "#FBBF24",
};

const NeoAlert = ({ visible, title, message, buttons = [], onClose }) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const alertButtons = buttons.length > 0 ? buttons : [
    { text: 'OK', onPress: onClose }
  ];

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      {/* ✅ STANDARD SEMI-TRANSPARENT BACKDROP */}
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: fadeAnim }
        ]}
      >
        <View style={styles.backdrop} />

        <Animated.View 
          style={[
            styles.card,
            {
              transform: [
                { 
                  scale: scaleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1]
                  })
                }
              ],
              opacity: scaleAnim
            }
          ]}
        >
          {/* ✅ SOLID BACKGROUND (Replaced BlurView) */}
          <View style={styles.cardGlass}>
            <View style={styles.cardContent}>
              <AlertContent title={title} message={message} buttons={alertButtons} onClose={onClose} />
            </View>
          </View>

          {/* ✅ GRADIENT BORDER */}
          <View style={styles.gradientBorder} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ✅ ALERT CONTENT 
const AlertContent = ({ title, message, buttons, onClose }) => (
  <>
    {/* ✅ PURPLE GLOW ACCENT */}
    <View style={styles.glowAccent} />
    
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.message}>{message}</Text>

    <View style={styles.buttonRow}>
      {buttons.map((btn, index) => {
        const isDestructive = btn.style === 'destructive';
        const isCancel = btn.style === 'cancel';
        
        let bgColor = COLORS.primary;
        let textColor = COLORS.textWhite;
        
        if (isDestructive) {
          bgColor = COLORS.danger;
          textColor = COLORS.textWhite;
        }
        if (isCancel) {
          bgColor = 'transparent';
          textColor = COLORS.textDark;
        }

        return (
          <PolymorphicButton
            key={index}
            text={btn.text}
            bgColor={bgColor}
            textColor={textColor}
            isCancel={isCancel}
            onPress={() => {
              if (btn.onPress) btn.onPress();
              onClose();
            }}
          />
        );
      })}
    </View>
  </>
);

// ✅ POLYMORPHIC BUTTON
const PolymorphicButton = ({ text, bgColor, textColor, isCancel, onPress }) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.button,
          { backgroundColor: bgColor },
          isCancel && styles.buttonCancel,
          { transform: [{ scale: scaleAnim }] }
        ]}
      >
        <Text style={[styles.buttonText, { color: textColor }]}>{text}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Standard dark overlay for both OS
  },
  card: {
    width: width * 0.88,
    maxWidth: 420,
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#864AF9',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.25,
        shadowRadius: 25,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  cardGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)', // Slightly off-white to look sleek
    borderRadius: 28,
  },
  cardContent: {
    padding: 32,
    paddingTop: 36,
  },
  gradientBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(134, 74, 249, 0.3)',
    pointerEvents: 'none',
  },
  glowAccent: {
    position: 'absolute',
    top: 0,
    left: '20%',
    right: '20%',
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
      },
    }),
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 12,
    marginTop: 8,
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 16,
    color: COLORS.textLight,
    fontWeight: '500',
    marginBottom: 28,
    lineHeight: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  buttonCancel: {
    backgroundColor: 'rgba(247, 249, 252, 0.8)',
    borderWidth: 1.5,
    borderColor: 'rgba(113, 128, 150, 0.2)',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default NeoAlert;