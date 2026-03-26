import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Dimensions, Animated } from 'react-native';
import { useUser } from '../context/UserContext';

const { width } = Dimensions.get('window');

const TopicScreen = ({ route, navigation }) => {
  const { subjectId, userClass, subject, isOffline, offlineTopics } = route.params; 
  
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { userData } = useUser(); 

  useEffect(() => {
    const fetchTopics = async () => {
      // 🛑 OFFLINE MODE
      if (isOffline && offlineTopics) {
        console.log(`📦 APP STATUS: OFFLINE MODE -> Loading ${offlineTopics.length} topics directly from RAM for ${subject}`);
        
        // Simulate a brief delay to show the loader (optional, for UX smoothness)
        setTimeout(() => {
          setTopics(offlineTopics);
          setLoading(false);
        }, 500);
        return;
      }

      // 🌐 ONLINE MODE
      console.log(`🌐 APP STATUS: ONLINE MODE -> Hitting the Laravel API for ${subject} topics`);
      try {
        const response = await fetch(`https://homeedu.fsdgroup.com.ng/api/userTopics/${subject}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ class: userClass }),
        });

        const data = await response.json(); 

        if (data.status === 200) {
          setTopics(data.data); 
        } else {
          setError("Failed to load topics.");
        }
      } catch (err) {
        setError("An error occurred while fetching topics.");
      } finally {
        setLoading(false);
      }
    };
    fetchTopics();
  }, [subjectId, userClass, subject, isOffline, offlineTopics]);

  const handleButtonPress = () => {
    navigation.navigate('Exam', {
      type: 'subjectExam',
      subject: subject,
      topic: null,
      subtopic: null,
      userClass: userData?.class || userClass,
      isOffline: isOffline || false,
      offlineData: isOffline ? offlineTopics : null,
    });
  }

  // === NEO-BRUTALIST LOADER ===
  if (loading) {
    return <NeoBrutalistLoader subject={subject} isOffline={isOffline} />;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.topicSelectionContainer}>
      <View style={styles.headerRow}>
        <Text style={styles.topicSelectionTitle}>
          {isOffline ? '📦 ' : ''}Topics for {subject}
        </Text>
      </View>
      
      <FlatList
        data={topics}
        keyExtractor={(item) => item.TopicId ? item.TopicId.toString() : Math.random().toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.topicItem}
            onPress={() =>
              navigation.navigate('Subtopic', { 
                topicId: item.TopicId, 
                Topic: item.Topic, 
                Subject: subject,
                isOffline: isOffline || false,
                offlineSubtopics: isOffline ? item.subtopics : null 
              })
            }
          >
            <Image source={require('../assets/education.png')} style={styles.subImg} />
            <Text style={styles.topicText}>{item.Topic}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.topicList}
        showsVerticalScrollIndicator={false}
      />
      <TouchableOpacity
        style={styles.startButton}
        onPress={handleButtonPress}>
        <Text style={styles.startButtonText}>Take Exam</Text>
      </TouchableOpacity>
    </View>
  );
};

// === NEO-BRUTALIST LOADER COMPONENT ===
const NeoBrutalistLoader = ({ subject, isOffline }) => {
  const [pulseAnim] = useState(new Animated.Value(1));
  const [rotateAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotate animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={loaderStyles.container}>
      {/* Animated Background Shapes */}
      <View style={loaderStyles.shapesContainer}>
        <View style={[loaderStyles.shape, loaderStyles.shape1]} />
        <View style={[loaderStyles.shape, loaderStyles.shape2]} />
        <View style={[loaderStyles.shape, loaderStyles.shape3]} />
      </View>

      {/* Main Loader Card */}
      <View style={loaderStyles.card}>
        {/* Spinning Icon */}
        <Animated.View 
          style={[
            loaderStyles.iconContainer,
            { transform: [{ rotate }] }
          ]}
        >
          <Text style={loaderStyles.icon}>
            {isOffline ? '📦' : '🎓'}
          </Text>
        </Animated.View>

        {/* Loading Text */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Text style={loaderStyles.title}>
            {isOffline ? 'Loading from Device' : 'Fetching Topics'}
          </Text>
        </Animated.View>

        <Text style={loaderStyles.subtitle}>
          {subject}
        </Text>

        {/* Loading Dots */}
        <View style={loaderStyles.dotsContainer}>
          <LoadingDot delay={0} />
          <LoadingDot delay={200} />
          <LoadingDot delay={400} />
        </View>

        {/* Status Text */}
        <Text style={loaderStyles.status}>
          {isOffline ? 'Reading from offline storage...' : 'Connecting to server...'}
        </Text>
      </View>
    </View>
  );
};

// === ANIMATED LOADING DOT ===
const LoadingDot = ({ delay }) => {
  const [bounceAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateY = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  return (
    <Animated.View 
      style={[
        loaderStyles.dot,
        { transform: [{ translateY }] }
      ]} 
    />
  );
};

// === LOADER STYLES ===
const loaderStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  shapesContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },

  shape: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: 'rgba(108, 99, 255, 0.1)',
  },

  shape1: {
    width: 150,
    height: 150,
    borderRadius: 75,
    top: '10%',
    left: '10%',
  },

  shape2: {
    width: 100,
    height: 100,
    bottom: '15%',
    right: '15%',
    transform: [{ rotate: '45deg' }],
  },

  shape3: {
    width: 120,
    height: 120,
    borderRadius: 60,
    top: '60%',
    left: '70%',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 24,
    padding: 40,
    width: width * 0.85,
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },

  iconContainer: {
    width: 100,
    height: 100,
    backgroundColor: '#FFD93D',
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },

  icon: {
    fontSize: 50,
  },

  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6C63FF',
    textAlign: 'center',
    marginBottom: 30,
  },

  dotsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },

  dot: {
    width: 12,
    height: 12,
    backgroundColor: '#6C63FF',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#000000',
  },

  status: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});

// === EXISTING STYLES (Enhanced) ===
const styles = StyleSheet.create({
  topicSelectionContainer: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    padding: 16,
  },

  headerRow: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },

  topicSelectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },

  topicList: {
    paddingBottom: 24,
  },

  topicItem: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    gap: 16,
  },

  subImg: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#FFD93D',
    borderWidth: 3,
    borderColor: '#000000',
  },

  topicText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    letterSpacing: 0.2,
  },

  startButton: {
    backgroundColor: '#6C63FF',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },

  startButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // === ERROR STATE ===
  errorContainer: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  errorCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 24,
    padding: 40,
    width: width * 0.85,
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },

  errorIcon: {
    fontSize: 60,
    marginBottom: 20,
  },

  errorTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
    textTransform: 'uppercase',
  },

  errorMessage: {
    fontSize: 15,
    fontWeight: '500',
    color: '#555555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },

  retryButton: {
    backgroundColor: '#FF6B9D',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },

  retryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default TopicScreen;