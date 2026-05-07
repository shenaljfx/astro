import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';

/**
 * Global error boundary — catches JS crashes in the React tree and shows
 * a recovery screen instead of a white screen / app crash.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error };
  }

  componentDidCatch(error, errorInfo) {
    if (__DEV__) {
      console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <View style={s.card}>
            <Text style={s.icon}>⚠️</Text>
            <Text style={s.title}>Something went wrong</Text>
            <Text style={s.subtitle}>යම් දෝෂයක් සිදු විය</Text>
            {__DEV__ && this.state.error ? (
              <ScrollView style={s.errorBox} contentContainerStyle={{ padding: 12 }}>
                <Text style={s.errorText}>{String(this.state.error)}</Text>
              </ScrollView>
            ) : (
              <Text style={s.message}>
                The app encountered an unexpected error. Please try again.
              </Text>
            )}
            <TouchableOpacity style={s.button} onPress={this.handleRetry} activeOpacity={0.7}>
              <Text style={s.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

var s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#04030C',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: 'rgba(147,51,234,0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(147,51,234,0.2)',
    padding: 32,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    color: '#FBBF24',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  errorBox: {
    maxHeight: 120,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    marginBottom: 24,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  button: {
    backgroundColor: '#9333EA',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ErrorBoundary;
