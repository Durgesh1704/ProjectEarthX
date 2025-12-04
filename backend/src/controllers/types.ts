import { Request, Response } from 'express';
import { User, Transaction, Batch } from '../../../shared/types';

// Extended Request interface with authenticated user
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Collection Controller Types
export interface RecordCollectionRequest {
  citizen_id: number;
  weight_grams: number;
  notes?: string;
}

export interface RecordCollectionResponse {
  success: boolean;
  data?: {
    transaction: Transaction;
    eiu_earned: number;
    message: string;
  };
  error?: string;
}

// Batch Controller Types
export interface VerifyBatchRequest {
  batch_id: number;
  verified_weight_total: number;
  ipfs_proof_hash: string;
  proof_type?: 'photo' | 'video' | 'document';
  verification_notes?: string;
}

export interface VerifyBatchResponse {
  success: boolean;
  data?: {
    batch: Batch;
    verification_result: {
      status: 'APPROVED' | 'FLAGGED' | 'REJECTED';
      weight_difference_percentage: number;
      original_weight: number;
      verified_weight: number;
      message: string;
    };
  };
  error?: string;
}

// Verification Service Types
export interface WeightComparisonResult {
  isWithinTolerance: boolean;
  weightDifferencePercentage: number;
  originalWeight: number;
  verifiedWeight: number;
  status: 'APPROVED' | 'FLAGGED' | 'REJECTED';
  message: string;
}

export interface BatchTransactionSummary {
  batchId: number;
  transactionCount: number;
  totalOriginalWeight: number;
  transactions: Array<{
    id: number;
    citizen_id: number;
    weight_grams: number;
    status: string;
  }>;
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Constants
export const COLLECTION_LIMITS = {
  MIN_WEIGHT_GRAMS: 10, // 10 grams minimum
  MAX_WEIGHT_GRAMS: 50000, // 50kg maximum per transaction
  TOLERANCE_PERCENTAGE: 5, // 5% tolerance for verification
} as const;

export const BATCH_STATUS = {
  PENDING: 'PENDING_BATCH',
  FLAGGED: 'FLAGGED',
  APPROVED: 'APPROVED',
  READY_TO_MINT: 'READY_TO_MINT',
  REJECTED: 'REJECTED',
} as const;