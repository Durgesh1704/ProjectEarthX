import { Batch } from '../shared/types';
interface GetPendingBatchesParams {
    recycler_id?: number;
    page: number;
    limit: number;
}
interface GetRecyclerVerificationHistoryParams {
    recycler_id: number;
    page: number;
    limit: number;
    status?: string;
}
interface UpdateBatchVerificationParams {
    recycler_id: number;
    verified_weight_total: number;
    ipfs_proof_hash: string;
    proof_type: string;
    verification_notes?: string;
    verification_status: string;
    rejection_reason?: string;
    weight_difference_percentage?: number;
    blockchain_batch_id?: string;
}
interface LogBatchActivityParams {
    batch_id: number;
    recycler_id: number;
    action: string;
    details: any;
}
export declare class BatchService {
    getBatchById(batch_id: number): Promise<Batch | null>;
    getPendingBatches(params: GetPendingBatchesParams): Promise<{
        batches: Batch[];
        totalCount: number;
        currentPage: number;
        totalPages: number;
    }>;
    updateBatchVerification(batch_id: number, params: UpdateBatchVerificationParams): Promise<Batch>;
    getRecyclerVerificationHistory(params: GetRecyclerVerificationHistoryParams): Promise<{
        batches: Batch[];
        totalCount: number;
        currentPage: number;
        totalPages: number;
    }>;
    logBatchActivity(params: LogBatchActivityParams): Promise<void>;
    createBatch(params: {
        collector_id: number;
        batch_name: string;
        transaction_ids: number[];
    }): Promise<Batch | null>;
    getBatchStats(): Promise<{
        totalBatches: number;
        pendingBatches: number;
        verifiedBatches: number;
        flaggedBatches: number;
        rejectedBatches: number;
        totalWeightProcessed: number;
    }>;
}
export {};
//# sourceMappingURL=batch.service.d.ts.map