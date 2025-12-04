import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Transaction, Batch, UserRole } from '../../../shared/types';

// API Base Configuration
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3001/api' 
  : 'https://api.earthx.com/api';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  };
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  full_name?: string;
  phone?: string;
  role: UserRole;
}

export interface AuthResponse {
  user: User;
  token: string;
  expires_at: string;
}

// Collection Types
export interface RecordCollectionRequest {
  citizen_id: number;
  weight_grams: number;
  notes?: string;
}

export interface RecordCollectionResponse {
  transaction: Transaction;
  eiu_earned: number;
  message: string;
}

// Batch Types
export interface VerifyBatchRequest {
  batch_id: number;
  verified_weight_total: number;
  ipfs_proof_hash: string;
  proof_type?: 'photo' | 'video' | 'document';
  verification_notes?: string;
}

export interface VerifyBatchResponse {
  batch: Batch;
  verification_result: {
    status: 'APPROVED' | 'FLAGGED' | 'REJECTED';
    weight_difference_percentage: number;
    original_weight: number;
    verified_weight: number;
    message: string;
  };
  mint_result?: {
    status: 'INITIATED' | 'FAILED';
    message?: string;
    error?: string;
  };
}

export interface BatchMintStatus {
  batch_id: number;
  mint_status: 'PENDING_MINT' | 'MINTED' | 'FAILED_ON_CHAIN' | 'RETRYING';
  tx_hash?: string;
  block_number?: number;
  retry_count: number;
  last_attempt?: string;
  mint_error?: string;
  blockchain_status?: {
    confirmed: boolean;
    blockNumber?: number;
    gasUsed?: string;
    error?: string;
  };
}

// QR Code Data Types
export interface QRData {
  type: 'user' | 'transaction' | 'batch';
  id: string;
  timestamp: number;
  data?: any;
}

class ApiService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor - Add auth token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        try {
          const token = await AsyncStorage.getItem('auth_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Error getting auth token:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle common errors
    this.axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid - clear storage and redirect to login
          await AsyncStorage.multiRemove(['auth_token', 'user_data']);
          // This will be handled by the navigation context
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Authentication Methods
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await this.axiosInstance.post('/auth/login', credentials);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await this.axiosInstance.post('/auth/register', userData);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.axiosInstance.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
    }
  }

  /**
   * User Profile Methods
   */
  async getUserProfile(): Promise<ApiResponse<User>> {
    try {
      const response = await this.axiosInstance.get('/users/profile');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async updateUserProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const response = await this.axiosInstance.put('/users/profile', userData);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Collection Methods (Collector)
   */
  async recordCollection(collectionData: RecordCollectionRequest): Promise<ApiResponse<RecordCollectionResponse>> {
    try {
      const response = await this.axiosInstance.post('/collection/record', collectionData);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getCollectionHistory(page: number = 1, limit: number = 20, status?: string): Promise<PaginatedResponse<Transaction>> {
    try {
      const params: any = { page, limit };
      if (status) params.status = status;
      
      const response = await this.axiosInstance.get('/collection/history', { params });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Batch Methods (Recycler)
   */
  async getPendingBatches(page: number = 1, limit: number = 20): Promise<PaginatedResponse<Batch>> {
    try {
      const response = await this.axiosInstance.get('/batch/pending', {
        params: { page, limit }
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async verifyBatch(batchData: VerifyBatchRequest): Promise<ApiResponse<VerifyBatchResponse>> {
    try {
      const response = await this.axiosInstance.post('/batch/verify', batchData);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getBatchMintStatus(batchId: number): Promise<ApiResponse<BatchMintStatus>> {
    try {
      const response = await this.axiosInstance.get(`/batch/${batchId}/mint-status`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async retryBatchMint(batchId: number): Promise<ApiResponse<{ batch_id: number; mint_result: any }>> {
    try {
      const response = await this.axiosInstance.post(`/batch/${batchId}/retry-mint`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getVerificationHistory(page: number = 1, limit: number = 20, status?: string): Promise<PaginatedResponse<Batch>> {
    try {
      const params: any = { page, limit };
      if (status) params.status = status;
      
      const response = await this.axiosInstance.get('/batch/history', { params });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Transaction Methods (Citizen)
   */
  async getTransactions(page: number = 1, limit: number = 20): Promise<PaginatedResponse<Transaction>> {
    try {
      const response = await this.axiosInstance.get('/transactions', {
        params: { page, limit }
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Utility Methods
   */
  async getContractInfo(): Promise<ApiResponse<{ address: string; chainId: number; totalMinted?: string }>> {
    try {
      const response = await this.axiosInstance.get('/batch/contract-info');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Error handling utility
   */
  private handleError(error: any): Error {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.error || error.response.statusText || 'Server error';
      return new Error(message);
    } else if (error.request) {
      // Network error
      return new Error('Network error. Please check your connection.');
    } else {
      // Other error
      return new Error(error.message || 'An unexpected error occurred.');
    }
  }

  /**
   * Upload file to IPFS (simulated)
   */
  async uploadToIPFS(fileUri: string): Promise<{ hash: string; url: string }> {
    // This is a simulated IPFS upload
    // In production, you would upload to actual IPFS service
    return new Promise((resolve) => {
      setTimeout(() => {
        const hash = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
        const url = `https://ipfs.io/ipfs/${hash}`;
        resolve({ hash, url });
      }, 2000);
    });
  }

  /**
   * Generate mock QR data for testing
   */
  generateQRData(type: QRData['type'], id: string, data?: any): string {
    const qrData: QRData = {
      type,
      id,
      timestamp: Date.now(),
      data
    };
    return JSON.stringify(qrData);
  }

  /**
   * Parse QR data
   */
  parseQRData(qrString: string): QRData | null {
    try {
      return JSON.parse(qrString);
    } catch (error) {
      console.error('Error parsing QR data:', error);
      return null;
    }
  }
}

// Create singleton instance
export const apiService = new ApiService();
export default apiService;