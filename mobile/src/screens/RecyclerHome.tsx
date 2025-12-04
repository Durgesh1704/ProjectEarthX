import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibraryAsync, MediaTypeOptions } from 'expo-image-picker';
import { Card, Button, TextInput, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { Batch } from '../../../shared/types';

const { width } = Dimensions.get('window');

interface RecyclerHomeProps {
  navigation: any;
}

const RecyclerHome: React.FC<RecyclerHomeProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [pendingBatches, setPendingBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verifiedWeight, setVerifiedWeight] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadPendingBatches();
  }, []);

  const loadPendingBatches = async () => {
    try {
      const response = await apiService.getPendingBatches(1, 50);
      if (response.success && response.data) {
        setPendingBatches(response.data.items);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load pending batches');
      console.error('Error loading pending batches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectImage = async () => {
    try {
      const result = await launchImageLibraryAsync({
        mediaTypes: MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image');
      console.error('Error selecting image:', error);
    }
  };

  const uploadToIPFS = async (imageUri: string): Promise<string> => {
    setUploadingImage(true);
    try {
      const result = await apiService.uploadToIPFS(imageUri);
      return result.hash;
    } catch (error) {
      throw new Error('Failed to upload image to IPFS');
    } finally {
      setUploadingImage(false);
    }
  };

  const startVerification = (batch: Batch) => {
    setSelectedBatch(batch);
    setShowVerificationModal(true);
    setVerifiedWeight('');
    setVerificationNotes('');
    setSelectedImage(null);
  };

  const submitVerification = async () => {
    if (!selectedBatch) {
      Alert.alert('Error', 'No batch selected');
      return;
    }

    if (!verifiedWeight || parseFloat(verifiedWeight) <= 0) {
      Alert.alert('Error', 'Please enter a valid verified weight');
      return;
    }

    if (!selectedImage) {
      Alert.alert('Error', 'Please select a verification photo');
      return;
    }

    setVerifying(true);
    try {
      // Upload image to IPFS
      const ipfsHash = await uploadToIPFS(selectedImage);
      
      // Submit verification
      const response = await apiService.verifyBatch({
        batch_id: selectedBatch.id,
        verified_weight_total: parseFloat(verifiedWeight) * 1000, // Convert kg to grams
        ipfs_proof_hash: ipfsHash,
        proof_type: 'photo',
        verification_notes: verificationNotes.trim() || undefined,
      });

      if (response.success && response.data) {
        const { verification_result, mint_result } = response.data;
        
        let message = `Batch verification completed!\n\n`;
        message += `Status: ${verification_result.status}\n`;
        message += `Weight Difference: ${verification_result.weight_difference_percentage.toFixed(2)}%\n`;
        message += `Original Weight: ${(verification_result.original_weight / 1000).toFixed(1)} kg\n`;
        message += `Verified Weight: ${(verification_result.verified_weight / 1000).toFixed(1)} kg\n\n`;
        
        if (verification_result.status === 'APPROVED' && mint_result) {
          message += `Minting: ${mint_result.status}`;
          if (mint_result.message) {
            message += `\n${mint_result.message}`;
          }
        }

        Alert.alert(
          'Verification Complete',
          message,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowVerificationModal(false);
                loadPendingBatches();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to verify batch');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify batch');
    } finally {
      setVerifying(false);
    }
  };

  const formatWeight = (weightGrams: number) => {
    if (weightGrams >= 1000) {
      return `${(weightGrams / 1000).toFixed(1)} kg`;
    }
    return `${weightGrams} g`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getBatchStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'verified':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading pending batches...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Verification Mode</Text>
          <Text style={styles.headerSubtitle}>
            Welcome, {user?.full_name || user?.username}
          </Text>
        </View>

        {/* Stats Card */}
        <Card style={styles.statsCard}>
          <View style={styles.statsContent}>
            <View style={styles.statItem}>
              <Ionicons name="clock" size={24} color="#f59e0b" />
              <Text style={styles.statNumber}>{pendingBatches.length}</Text>
              <Text style={styles.statLabel}>Pending Batches</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.statNumber}>
                {pendingBatches.reduce((sum, batch) => sum + (batch.total_weight_grams || 0), 0) >= 1000 
                  ? `${(pendingBatches.reduce((sum, batch) => sum + (batch.total_weight_grams || 0), 0) / 1000).toFixed(1)}kg`
                  : `${pendingBatches.reduce((sum, batch) => sum + (batch.total_weight_grams || 0), 0)}g`
                }
              </Text>
              <Text style={styles.statLabel}>Total Weight</Text>
            </View>
          </View>
        </Card>

        {/* Pending Batches */}
        <View style={styles.batchesSection}>
          <Text style={styles.sectionTitle}>Pending Batches</Text>
          
          {pendingBatches.length === 0 ? (
            <Card style={styles.emptyCard}>
              <View style={styles.emptyContent}>
                <Ionicons name="clipboard-outline" size={48} color="#6b7280" />
                <Text style={styles.emptyText}>No pending batches</Text>
                <Text style={styles.emptySubtext}>
                  All batches have been verified
                </Text>
              </View>
            </Card>
          ) : (
            pendingBatches.map((batch) => (
              <Card key={batch.id} style={styles.batchCard}>
                <View style={styles.batchHeader}>
                  <View style={styles.batchInfo}>
                    <Text style={styles.batchName}>{batch.batch_name}</Text>
                    <Text style={styles.batchMeta}>
                      Collector: {batch.collector_username || 'Unknown'}
                    </Text>
                    <Text style={styles.batchDate}>
                      Created: {formatDate(batch.created_at)}
                    </Text>
                  </View>
                  <View style={styles.batchWeight}>
                    <Text style={styles.weightText}>
                      {formatWeight(batch.total_weight_grams || 0)}
                    </Text>
                    <Text style={styles.weightLabel}>Reported</Text>
                  </View>
                </View>
                
                <View style={styles.batchActions}>
                  <View style={styles.transactionCount}>
                    <Ionicons name="list" size={16} color="#6b7280" />
                    <Text style={styles.transactionText}>
                      {batch.transaction_count || 0} transactions
                    </Text>
                  </View>
                  <Button
                    mode="contained"
                    onPress={() => startVerification(batch)}
                    style={styles.verifyButton}
                    icon="checkmark-circle"
                    compact
                  >
                    Verify
                  </Button>
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('VerificationHistory')}
            style={styles.actionButton}
            icon="history"
          >
            Verification History
          </Button>
          <Button
            mode="text"
            onPress={() => navigation.navigate('RecyclerGuide')}
            textColor="#10b981"
          >
            Verification Guide
          </Button>
        </View>
      </ScrollView>

      {/* Verification Modal */}
      <Modal
        visible={showVerificationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowVerificationModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Verify Batch</Text>
            <Button
              mode="text"
              onPress={() => setShowVerificationModal(false)}
              textColor="#6b7280"
              icon="close"
            >
              Close
            </Button>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedBatch && (
              <>
                {/* Batch Info */}
                <Card style={styles.infoCard}>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoTitle}>{selectedBatch.batch_name}</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Collector:</Text>
                      <Text style={styles.infoValue}>
                        {selectedBatch.collector_username || 'Unknown'}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Reported Weight:</Text>
                      <Text style={styles.infoValue}>
                        {formatWeight(selectedBatch.total_weight_grams || 0)}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Transactions:</Text>
                      <Text style={styles.infoValue}>
                        {selectedBatch.transaction_count || 0}
                      </Text>
                    </View>
                  </View>
                </Card>

                {/* Verification Form */}
                <Card style={styles.formCard}>
                  <View style={styles.formContent}>
                    <Text style={styles.formTitle}>Verification Details</Text>
                    
                    {/* Verified Weight Input */}
                    <TextInput
                      label="Verified Weight (kg)"
                      value={verifiedWeight}
                      onChangeText={setVerifiedWeight}
                      keyboardType="numeric"
                      mode="outlined"
                      style={styles.input}
                      placeholder="Enter actual weight in kilograms"
                      maxLength={6}
                    />

                    {/* Photo Upload */}
                    <View style={styles.photoSection}>
                      <Text style={styles.photoLabel}>Verification Photo</Text>
                      
                      {selectedImage ? (
                        <View style={styles.photoPreview}>
                          <Image source={{ uri: selectedImage }} style={styles.photo} />
                          <Button
                            mode="text"
                            onPress={selectImage}
                            textColor="#10b981"
                            compact
                          >
                            Change Photo
                          </Button>
                        </View>
                      ) : (
                        <Button
                          mode="outlined"
                          onPress={selectImage}
                          style={styles.photoButton}
                          icon="camera"
                        >
                          Select Photo
                        </Button>
                      )}
                      
                      {uploadingImage && (
                        <View style={styles.uploadingOverlay}>
                          <ActivityIndicator size="small" color="#10b981" />
                          <Text style={styles.uploadingText}>Uploading to IPFS...</Text>
                        </View>
                      )}
                    </View>

                    {/* Notes Input */}
                    <TextInput
                      label="Verification Notes (optional)"
                      value={verificationNotes}
                      onChangeText={setVerificationNotes}
                      mode="outlined"
                      style={styles.input}
                      placeholder="Add any notes about this verification"
                      multiline
                      numberOfLines={3}
                    />

                    {/* Submit Button */}
                    <Button
                      mode="contained"
                      onPress={submitVerification}
                      style={styles.submitButton}
                      icon="checkmark"
                      loading={verifying}
                      disabled={verifying || !verifiedWeight || !selectedImage}
                    >
                      {verifying ? 'Verifying...' : 'Approve & Mint'}
                    </Button>
                  </View>
                </Card>
              </>
            )}
          </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  statsCard: {
    margin: 20,
    backgroundColor: '#ffffff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
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
  batchesSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptyContent: {
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
  batchCard: {
    backgroundColor: '#ffffff',
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
  },
  batchInfo: {
    flex: 1,
  },
  batchName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  batchMeta: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  batchDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  batchWeight: {
    alignItems: 'flex-end',
  },
  weightText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  weightLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  batchActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  transactionCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  verifyButton: {
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalContent: {
    flex: 1,
  },
  infoCard: {
    margin: 20,
    backgroundColor: '#f9fafb',
  },
  infoContent: {
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
  },
  photoSection: {
    marginBottom: 20,
  },
  photoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 8,
  },
  photoButton: {
    borderColor: '#10b981',
  },
  photoPreview: {
    alignItems: 'center',
  },
  photo: {
    width: width * 0.6,
    height: width * 0.45,
    borderRadius: 8,
    marginBottom: 8,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  uploadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#10b981',
  },
  submitButton: {
    backgroundColor: '#10b981',
    marginTop: 8,
  },
});

export default RecyclerHome;