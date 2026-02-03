// TutorialSystem.js
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const TutorialContext = createContext(null);

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    return {
      start: () => {},
      stop: () => {},
      canStart: false,
      isActive: false,
      scrollViewRef: null,
    };
  }
  return context;
};

// Custom Tooltip Component
const CustomTooltip = ({ isLastStep, handleNext, handleStop, currentStep }) => {
  return (
    <View style={styles.tooltipBox}>
      <View style={styles.tooltipHeader}>
        <Text style={styles.tooltipTitle}>
          {currentStep && currentStep.name ? currentStep.name.toUpperCase() : 'TUTORIAL'}
        </Text>
        <Ionicons name="sparkles" size={16} color="#864AF9" />
      </View>
      
      <Text style={styles.tooltipText}>{currentStep ? currentStep.text : ''}</Text>
      
      <View style={styles.tooltipButtons}>
        <TouchableOpacity onPress={handleStop} style={styles.skipBtn}>
          <Text style={styles.skipBtnText}>SKIP</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={isLastStep ? handleStop : handleNext} 
          style={[styles.nextBtn, isLastStep && styles.finishBtn]}
        >
          <Text style={styles.nextBtnText}>
            {isLastStep ? "FINISH 🏁" : "NEXT 👉"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const TutorialProvider = ({ children, steps = [] }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepLayouts, setStepLayouts] = useState({});
  const scrollViewRef = useRef(null);

  const start = useCallback(() => {
    if (steps.length > 0) {
      setCurrentStepIndex(0);
      setIsActive(true);
    }
  }, [steps.length]);

  const stop = useCallback(() => {
    setIsActive(false);
    setCurrentStepIndex(0);
  }, []);

  const next = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      stop();
    }
  }, [currentStepIndex, steps.length, stop]);

  const registerStep = useCallback((stepId, layout) => {
    setStepLayouts(prev => ({
      ...prev,
      [stepId]: layout,
    }));
  }, []);

  const value = {
    isActive,
    start,
    stop,
    next,
    registerStep,
    currentStepIndex,
    canStart: steps.length > 0,
    steps,
    scrollViewRef,
  };

  const currentStep = steps[currentStepIndex];
  const currentLayout = stepLayouts[currentStep?.id];
  const isLastStep = currentStepIndex === steps.length - 1;

  // Auto-scroll to current step when it changes
  React.useEffect(() => {
    if (isActive && currentLayout && scrollViewRef.current) {
      // Add delay to ensure layout is ready
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, currentLayout.y - 100),
          animated: true,
        });
      }, 300);
    }
  }, [currentStepIndex, isActive, currentLayout]);

  return (
    <TutorialContext.Provider value={value}>
      {children}
      
      {isActive && currentLayout && (
        <Modal
          transparent
          visible={isActive}
          animationType="fade"
          onRequestClose={stop}
        >
          <View style={styles.overlay}>
            {/* Dark backdrop */}
            <View style={styles.backdrop} />
            
            {/* Highlighted area - cutout effect */}
            <View
              style={[
                styles.highlightBox,
                {
                  top: currentLayout.y - 8,
                  left: currentLayout.x - 8,
                  width: currentLayout.width + 16,
                  height: currentLayout.height + 16,
                },
              ]}
            >
              {/* Inner transparent area */}
              <View style={styles.highlightInner} />
            </View>
            
            {/* Tooltip - positioned below the highlighted element */}
            <View
              style={[
                styles.tooltipContainer,
                {
                  top: Math.min(
                    currentLayout.y + currentLayout.height + 20,
                    height - 250 // Keep tooltip visible on screen
                  ),
                },
              ]}
            >
              <CustomTooltip
                currentStep={currentStep}
                isLastStep={isLastStep}
                handleNext={next}
                handleStop={stop}
              />
            </View>
          </View>
        </Modal>
      )}
    </TutorialContext.Provider>
  );
};

export const TutorialStep = ({ stepId, children }) => {
  const { registerStep, isActive, currentStepIndex, steps } = useTutorial();
  const viewRef = useRef(null);

  const measureLayout = useCallback(() => {
    if (viewRef.current) {
      viewRef.current.measureInWindow((x, y, width, height) => {
        registerStep(stepId, { x, y, width, height });
      });
    }
  }, [stepId, registerStep]);

  // Measure when tutorial becomes active
  React.useEffect(() => {
    if (isActive) {
      // Delay to ensure layout is complete
      const timer = setTimeout(measureLayout, 200);
      return () => clearTimeout(timer);
    }
  }, [isActive, measureLayout]);

  // Re-measure when it's this step's turn
  React.useEffect(() => {
    const currentStep = steps[currentStepIndex];
    if (isActive && currentStep?.id === stepId) {
      const timer = setTimeout(measureLayout, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStepIndex, isActive, stepId, steps, measureLayout]);

  return (
    <View 
      ref={viewRef} 
      onLayout={measureLayout}
      collapsable={false}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  highlightBox: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#864AF9',
    backgroundColor: 'transparent',
    // Glow effect
    shadowColor: '#864AF9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  highlightInner: {
    flex: 1,
    backgroundColor: 'rgba(134, 74, 249, 0.1)',
    borderRadius: 13,
  },
  tooltipContainer: {
    position: 'absolute',
    width: width * 0.85,
    alignSelf: 'center',
    left: (width * 0.15) / 2,
    zIndex: 1000,
  },
  tooltipBox: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#000',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 6, height: 6 },
    elevation: 10,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 5,
  },
  tooltipTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#864AF9',
    letterSpacing: 1,
  },
  tooltipText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 20,
  },
  tooltipButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipBtn: {
    padding: 8,
  },
  skipBtnText: {
    color: '#999',
    fontWeight: '700',
    fontSize: 12,
  },
  nextBtn: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
  },
  finishBtn: {
    backgroundColor: '#10B981',
    borderColor: '#000',
  },
  nextBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
});