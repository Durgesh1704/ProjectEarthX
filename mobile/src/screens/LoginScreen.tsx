import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';

const LoginScreen: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      // Navigation will be handled by AuthContext
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated) {
    return null; // Will be redirected by navigator
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* Logo/Title */}
            <View style={styles.header}>
              <Text style={styles.title}>EARTHX</Text>
              <Text style={styles.subtitle}>Plastic Recycling Platform</Text>
            </View>

            {/* Login Form */}
            <Card style={styles.card}>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Sign In</Text>
                
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  mode="outlined"
                  style={styles.input}
                  placeholder="Enter your email"
                />

                <TextInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  mode="outlined"
                  style={styles.input}
                  placeholder="Enter your password"
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                />

                <Button
                  mode="contained"
                  onPress={handleLogin}
                  style={styles.button}
                  loading={isLoading}
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
              </View>
            </Card>

            {/* Demo Info */}
            <View style={styles.demoInfo}>
              <Text style={styles.demoTitle}>Demo Accounts</Text>
              <Text style={styles.demoText}>Citizen: citizen@earthx.com</Text>
              <Text style={styles.demoText}>Collector: collector@earthx.com</Text>
              <Text style={styles.demoText}>Recycler: recycler@earthx.com</Text>
              <Text style={styles.demoPassword}>Password: demo123</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#ffffff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    padding: 24,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 8,
  },
  demoInfo: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  demoText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  demoPassword: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default LoginScreen;