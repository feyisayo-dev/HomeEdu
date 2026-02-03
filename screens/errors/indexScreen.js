import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView,
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Assuming you use Expo

const { width } = Dimensions.get('window');

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to your analytics service (e.g., Sentry/Firebase)
    console.log("💥 Uncaught Error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            
            {/* Header Icon */}
            <View style={styles.iconContainer}>
              <Text style={{ fontSize: 50 }}>😵</Text>
            </View>

            <Text style={styles.title}>Whoops!</Text>
            <Text style={styles.subtitle}>
              Something went wrong. It's not you, it's us.
            </Text>

            {/* Error Details Box (Scrollable) */}
            <View style={styles.errorBox}>
                <Text style={styles.errorLabel}>Technical Details:</Text>
                <ScrollView nestedScrollEnabled style={styles.scrollError}>
                    <Text style={styles.errorText}>
                        {this.state.error?.toString() || "Unknown Error"}
                    </Text>
                </ScrollView>
            </View>

            {/* Retry Button */}
            <TouchableOpacity 
              style={styles.button} 
              onPress={this.handleReset}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>

            {/* Optional Home Button (if you have navigation ref available globally) */}
            {/* <TouchableOpacity onPress={...}><Text>Go Home</Text></TouchableOpacity> */}
          
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB', // Light app background
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    // Neo-Brutalist Border & Shadow
    borderWidth: 3,
    borderColor: '#000',
    shadowColor: "#000",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0, 
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#FFE4E6', // Light Red
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#000',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    fontWeight: '500',
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    marginBottom: 24,
    padding: 12,
  },
  errorLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#888',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  scrollError: {
    maxHeight: 100, // Limit height so it doesn't take over the screen
  },
  errorText: {
    color: '#DC2626', // Red error text
    fontFamily: 'monospace', // Code-like font
    fontSize: 13,
  },
  button: {
    width: '100%',
    backgroundColor: '#864AF9', // Brand Purple
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});

export default ErrorBoundary;