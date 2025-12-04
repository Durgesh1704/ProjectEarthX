import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';

const ProfileScreen: React.FC = () => {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <Card style={styles.profileCard}>
          <View style={styles.profileContent}>
            <Text style={styles.userName}>{user?.full_name || user?.username}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.roleContainer}>
              <Text style={styles.roleLabel}>Role:</Text>
              <Text style={styles.roleValue}>{user?.role?.toUpperCase()}</Text>
            </View>
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceLabel}>EIU Balance:</Text>
              <Text style={styles.balanceValue}>
                {user?.eiu_balance?.toFixed(2) || '0.00'}
              </Text>
            </View>
          </View>
        </Card>

        <Card style={styles.infoCard}>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Account Information</Text>
            {user?.phone && (
              <Text style={styles.infoText}>Phone: {user.phone}</Text>
            )}
            {user?.address && (
              <Text style={styles.infoText}>Address: {user.address}</Text>
            )}
            <Text style={styles.infoText}>
              Member since: {new Date(user?.created_at || '').toLocaleDateString()}
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#10b981',
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileCard: {
    margin: 20,
    backgroundColor: '#ffffff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileContent: {
    padding: 24,
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  roleLabel: {
    fontSize: 16,
    color: '#6b7280',
    marginRight: 8,
  },
  roleValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  balanceContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10b981',
  },
  infoCard: {
    margin: 20,
    marginTop: 0,
    backgroundColor: '#ffffff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoContent: {
    padding: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
});

export default ProfileScreen;