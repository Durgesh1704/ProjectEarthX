import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { Card, Button, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { Transaction } from '../../../shared/types';

const { width } = Dimensions.get('window');

interface CitizenHomeProps {
  navigation: any;
}

const CitizenHome: React.FC<CitizenHomeProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const response = await apiService.getTransactions(1, 10);
      if (response.success && response.data) {
        setTransactions(response.data.items);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load transactions');
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatWeight = (weightGrams: number) => {
    if (weightGrams >= 1000) {
      return `${(weightGrams / 1000).toFixed(1)} kg`;
    }
    return `${weightGrams} g`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#10b981';
      case 'pending':
      case 'PENDING_BATCH':
        return '#f59e0b';
      case 'failed':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'pending':
      case 'PENDING_BATCH':
        return 'Pending';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  // Generate QR code data for citizen
  const qrData = user ? apiService.generateQRData('user', user.id.toString()) : '';

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading your EIU balance...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header with EIU Balance */}
        <View style={styles.header}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.full_name || user?.username}</Text>
          </View>
        </View>

        {/* EIU Balance Card */}
        <Card style={styles.balanceCard}>
          <View style={styles.balanceContent}>
            <View style={styles.balanceHeader}>
              <Ionicons name="wallet" size={24} color="#10b981" />
              <Text style={styles.balanceLabel}>My EIU Balance</Text>
            </View>
            <Text style={styles.balanceAmount}>
              {user?.eiu_balance?.toFixed(2) || '0.00'}
            </Text>
            <Text style={styles.balanceSubtitle}>Earth Impact Units</Text>
          </View>
        </Card>

        {/* QR Code Card */}
        <Card style={styles.qrCard}>
          <View style={styles.qrContent}>
            <Text style={styles.qrTitle}>Your QR Code</Text>
            <Text style={styles.qrSubtitle}>
              Show this code to collectors to earn EIU
            </Text>
            
            {qrData ? (
              <View style={styles.qrCodeContainer}>
                <QRCode
                  value={qrData}
                  size={width * 0.4}
                  color="#000000"
                  backgroundColor="#ffffff"
                  logoSize={30}
                  logoBackgroundColor="#10b981"
                />
              </View>
            ) : (
              <View style={styles.qrPlaceholder}>
                <Ionicons name="qr-code" size={80} color="#6b7280" />
              </View>
            )}
            
            <Text style={styles.qrInstruction}>
              User ID: {user?.id}
            </Text>
          </View>
        </Card>

        {/* Recent Transactions */}
        <Card style={styles.transactionsCard}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.transactionsTitle}>Recent Transactions</Text>
            <Button
              mode="text"
              onPress={() => navigation.navigate('TransactionHistory')}
              compact
            >
              View All
            </Button>
          </View>
          
          {transactions.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <Ionicons name="receipt-outline" size={48} color="#6b7280" />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>
                Start recycling plastic to earn EIU!
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {transactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionItem}>
                  <View style={styles.transactionLeft}>
                    <View style={styles.transactionIcon}>
                      <Ionicons name="recycle" size={20} color="#10b981" />
                    </View>
                    <View style={styles.transactionDetails}>
                      <Text style={styles.transactionWeight}>
                        {formatWeight(transaction.weight_grams)} plastic
                      </Text>
                      <Text style={styles.transactionDate}>
                        {formatDate(transaction.created_at)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.transactionRight}>
                    <Text style={styles.transactionEiu}>
                      +{transaction.eiu_earned} EIU
                    </Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(transaction.status) }
                    ]}>
                      <Text style={styles.statusText}>
                        {getStatusText(transaction.status)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Rewards')}
            style={styles.actionButton}
            icon="gift"
          >
            Redeem Rewards
          </Button>
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Education')}
            style={styles.actionButton}
            icon="leaf"
          >
            Learn More
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
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
  welcomeSection: {
    alignItems: 'flex-start',
  },
  welcomeText: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.8,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  balanceCard: {
    margin: 20,
    backgroundColor: '#ffffff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  balanceContent: {
    padding: 24,
    alignItems: 'center',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 4,
  },
  balanceSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  qrCard: {
    margin: 20,
    backgroundColor: '#ffffff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  qrContent: {
    padding: 24,
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  qrSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  qrCodeContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  qrPlaceholder: {
    width: width * 0.4,
    height: width * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  qrInstruction: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 12,
  },
  transactionsCard: {
    margin: 20,
    backgroundColor: '#ffffff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  emptyTransactions: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  transactionsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionWeight: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  transactionDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionEiu: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});

export default CitizenHome;