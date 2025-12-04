import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../../../shared/types';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CitizenHome from '../screens/CitizenHome';
import CollectorHome from '../screens/CollectorHome';
import RecyclerHome from '../screens/RecyclerHome';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Stack Navigator for authentication
const AuthStack = createNativeStackNavigator();
const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

// Tab Navigator for authenticated users
const AppTabs = createBottomTabNavigator();
const AppNavigator = () => {
  const { user } = useAuth();

  if (!user) return null; // This shouldn't happen if navigator is properly protected

  const getHomeScreen = () => {
    switch (user.role) {
      case UserRole.CITIZEN:
        return CitizenHome;
      case UserRole.COLLECTOR:
        return CollectorHome;
      case UserRole.RECYCLER:
        return RecyclerHome;
      default:
        return CitizenHome;
    }
  };

  const getHomeTabName = () => {
    switch (user.role) {
      case UserRole.CITIZEN:
        return 'CitizenHome';
      case UserRole.COLLECTOR:
        return 'CollectorHome';
      case UserRole.RECYCLER:
        return 'RecyclerHome';
      default:
        return 'CitizenHome';
    }
  };

  const getHomeTabLabel = () => {
    switch (user.role) {
      case UserRole.CITIZEN:
        return 'My EIU';
      case UserRole.COLLECTOR:
        return 'Collect';
      case UserRole.RECYCLER:
        return 'Verify';
      default:
        return 'Home';
    }
  };

  const getHomeIcon = ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
    let iconName: keyof typeof Ionicons.glyphMap;
    
    switch (user.role) {
      case UserRole.CITIZEN:
        iconName = focused ? 'wallet' : 'wallet-outline';
        break;
      case UserRole.COLLECTOR:
        iconName = focused ? 'scan' : 'scan-outline';
        break;
      case UserRole.RECYCLER:
        iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
        break;
      default:
        iconName = focused ? 'home' : 'home-outline';
    }

    return <Ionicons name={iconName} size={size} color={color} />;
  };

  return (
    <AppTabs.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === getHomeTabName()) {
            return getHomeIcon({ focused, color, size });
          }
          
          let iconName: keyof typeof Ionicons.glyphMap;
          if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 80,
        },
        headerStyle: {
          backgroundColor: '#10b981',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <AppTabs.Screen 
        name={getHomeTabName()} 
        component={getHomeScreen()}
        options={{ 
          title: getHomeTabLabel(),
          headerShown: false // Home screens have custom headers
        }} 
      />
      <AppTabs.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <AppTabs.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </AppTabs.Navigator>
  );
};

// Root Navigator
const RootStack = createNativeStackNavigator();
const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // You could return a loading screen here
    return null;
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#10b981" />
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="App" component={AppNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;