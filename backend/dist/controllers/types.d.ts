import { Request } from 'express';
import { User, Transaction, Batch } from '../shared/types';
export interface AuthenticatedRequest extends Request {
    user?: User;
}
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
export interface ValidationError {
    field: string;
    message: string;
    value?: any;
}
export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}
export declare const COLLECTION_LIMITS: {
    readonly MIN_WEIGHT_GRAMS: 10;
    readonly MAX_WEIGHT_GRAMS: 50000;
    readonly TOLERANCE_PERCENTAGE: 5;
};
export declare const BATCH_STATUS: {
    readonly PENDING: "PENDING_BATCH";
    readonly FLAGGED: "FLAGGED";
    readonly APPROVED: "APPROVED";
    readonly READY_TO_MINT: "READY_TO_MINT";
    readonly REJECTED: "REJECTED";
};
//# sourceMappingURL=types.d.ts.map