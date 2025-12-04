import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Vibration,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Card, Button, TextInput, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';

const { width, height } = Dimensions.get('window');

interface CollectorHomeProps {
  navigation: any;
}

const CollectorHome: React.FC<CollectorHomeProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [scannedCitizen, setScannedCitizen] = useState<any>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [todayStats, setTodayStats] = useState({
    totalCollections: 0,
    totalWeight: 0,
    totalEIU: 0,
  });

  useEffect(() => {
    loadTodayStats();
  }, []);

  const loadTodayStats = async () => {
    try {
      const response = await apiService.getCollectionHistory(1, 100, 'PENDING_BATCH');
      if (response.success && response.data) {
        const today = new Date().toDateString();
        const todayCollections = response.data.items.filter(
          (item) => new Date(item.created_at).toDateString() === today
        );
        
        setTodayStats({
          totalCollections: todayCollections.length,
          totalWeight: todayCollections.reduce((sum, item) => sum + item.weight_grams, 0),
          totalEIU: todayCollections.reduce((sum, item) => sum + item.eiu_earned, 0),
        });
      }
    } catch (error) {
      console.error('Error loading today stats:', error);
    }
  };

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    Vibration.vibrate();
    setShowScanner(false);
    
    try {
      const qrData = apiService.parseQRData(data);
      if (qrData && qrData.type === 'user') {
        setScannedCitizen(qrData);
        Alert.alert(
          'Citizen Scanned',
          `Citizen ID: ${qrData.id}\n\nReady to record collection.`,
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        Alert.alert('Invalid QR Code', 'Please scan a valid citizen QR code.');
      }
    } catch (error) {
      Alert.alert('Invalid QR Code', 'Please scan a valid citizen QR code.');
    }
  };

  const startCollection = () => {
    if (!cameraPermission?.granted) {
      requestCameraPermission();
      return;
    }
    setShowScanner(true);
  };

  const submitCollection = async () => {
    if (!scannedCitizen) {
      Alert.alert('Error', 'Please scan a citizen QR code first.');
      return;
    }

    if (!weight || parseFloat(weight) <= 0) {
      Alert.alert('Error', 'Please enter a valid weight.');
      return;
    }

    if (parseFloat(weight) > 50) {
      Alert.alert('Error', 'Maximum weight per collection is 50kg.');
      return;
    }

    setIsLoading(true);
    try {
      const weightGrams = parseFloat(weight) * 1000; // Convert kg to grams
      const response = await apiService.recordCollection({
        citizen_id: parseInt(scannedCitizen.id),
        weight_grams: Math.round(weightGrams),
        notes: notes.trim() || undefined,
      });

      if (response.success && response.data) {
        Alert.alert(
          'Success!',
          `Collection recorded successfully!\n\nWeight: ${weight} kg\nEIU Earned: ${response.data.eiu_earned}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setScannedCitizen(null);
                setWeight('');
                setNotes('');
                loadTodayStats();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to record collection.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to record collection.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setScannedCitizen(null);
    setWeight('');
    setNotes('');
  };

  if (!cameraPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#6b7280" />
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#6b7280" />
          <Text style={styles.permissionText}>Camera access is required</Text>
          <Button mode="contained" onPress={requestCameraPermission}>
            Grant Permission
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Collection Mode</Text>
          <Text style={styles.headerSubtitle}>
            Welcome, {user?.full_name || user?.username}
          </Text>
        </View>

        {/* Today's Stats */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <Ionicons name="recycle" size={24} color="#10b981" />
              <Text style={styles.statNumber}>{todayStats.totalCollections}</Text>
              <Text style={styles.statLabel}>Collections</Text>
            </View>
          </Card>
          
          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <Ionicons name="scale" size={24} color="#3b82f6" />
              <Text style={styles.statNumber}>
                {todayStats.totalWeight >= 1000 
                  ? `${(todayStats.totalWeight / 1000).toFixed(1)}kg`
                  : `${todayStats.totalWeight}g`
                }
              </Text>
              <Text style={styles.statLabel}>Total Weight</Text>
            </View>
          </Card>
          
          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <Ionicons name="wallet" size={24} color="#f59e0b" />
              <Text style={styles.statNumber}>{todayStats.totalEIU.toFixed(1)}</Text>
              <Text style={styles.statLabel}>EIU Generated</Text>
            </View>
          </Card>
        </View>

        {/* Collection Form */}
        <Card style={styles.formCard}>
          <View style={styles.formContent}>
            <Text style={styles.formTitle}>New Collection</Text>
            
            {/* Scanned Citizen Info */}
            {scannedCitizen ? (
              <View style={styles.scannedInfo}>
                <View style={styles.scannedHeader}>
                  <Ionicons name="person" size={20} color="#10b981" />
                  <Text style={styles.scannedTitle}>Citizen Scanned</Text>
                  <Button
                    mode="text"
                    onPress={resetForm}
                    compact
                    textColor="#ef4444"
                  >
                    Clear
                  </Button>
                </View>
                <Text style={styles.scannedId}>Citizen ID: {scannedCitizen.id}</Text>
                <Text style={styles.scannedTime}>
                  Scanned at {new Date().toLocaleTimeString()}
                </Text>
              </View>
            ) : (
              <View style={styles.scanPlaceholder}>
                <Ionicons name="qr-code-outline" size={48} color="#6b7280" />
                <Text style={styles.scanPlaceholderText}>
                  No citizen scanned yet
                </Text>
              </View>
            )}

            {/* Weight Input */}
            <TextInput
              label="Weight (kg)"
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              placeholder="Enter weight in kilograms"
              maxLength={6}
            />

            {/* Notes Input */}
            <TextInput
              label="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              style={styles.input}
              placeholder="Add any notes about this collection"
              multiline
              numberOfLines={3}
            />

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={startCollection}
                style={styles.scanButton}
                icon="qr-code"
                disabled={isLoading}
              >
                {scannedCitizen ? 'Rescan QR' : 'Scan QR Code'}
              </Button>
              
              <Button
                mode="contained"
                onPress={submitCollection}
                style={styles.submitButton}
                icon="checkmark"
                loading={isLoading}
                disabled={isLoading || !scannedCitizen || !weight}
              >
                {isLoading ? 'Recording...' : 'Record Collection'}
              </Button>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('CollectionHistory')}
            style={styles.actionButton}
            icon="history"
          >
            View History
          </Button>
          <Button
            mode="text"
            onPress={() => navigation.navigate('CollectorGuide')}
            textColor="#10b981"
          >
            Collection Guide
          </Button>
        </View>
      </ScrollView>

      {/* QR Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.scannerCamera}
            barcodeScannerSettings={{
              barcodeTypes: [BarCodeScanner.Constants.BarCodeType.qr],
            }}
            onBarcodeScanned={handleBarCodeScanned}
          />
          
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerHeader}>
              <Button
                mode="text"
                onPress={() => setShowScanner(false)}
                textColor="#ffffff"
                icon="close"
              >
                Close
              </Button>
            </View>
            
            <View style={styles.scannerFrame}>
              <View style={styles.scannerCorner} />
              <View style={[styles.scannerCorner, { right: 0 }]} />
              <View style={[styles.scannerCorner, { bottom: 0 }]} />
              <View style={[styles.scannerCorner, { right: 0, bottom: 0 }]} />
            </View>
            
            <Text style={styles.scannerInstruction}>
              Align QR code within frame
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
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
  headerSubtitle: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.8,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: -20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    marginHorizontal: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statContent: {
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  formCard: {
    margin: 20,
    backgroundColor: '#ffffff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  formContent: {
    padding: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
  },
  scannedInfo: {
    backgroundColor: '#d1fae5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  scannedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scannedTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#065f46',
    marginLeft: 8,
    flex: 1,
  },
  scannedId: {
    fontSize: 14,
    color: '#047857',
    marginBottom: 4,
  },
  scannedTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  scanPlaceholder: {
    backgroundColor: '#f9fafb',
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  scanPlaceholderText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  input: {
    marginBottom: 16,
  },
  buttonContainer: {
    gap: 12,
  },
  scanButton: {
    borderColor: '#10b981',
  },
  submitButton: {
    backgroundColor: '#10b981',
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
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scannerCamera: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  scannerFrame: {
    width: width * 0.7,
    height: width * 0.7,
    alignSelf: 'center',
    marginTop: height * 0.2,
  },
  scannerCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#10b981',
    borderWidth: 3,
    borderTopLeftRadius: 8,
  },
  scannerInstruction: {
    textAlign: 'center',
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 50,
    paddingHorizontal: 40,
  },
});

export default CollectorHome;