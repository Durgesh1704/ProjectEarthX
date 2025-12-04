import { WeightComparisonResult, BatchTransactionSummary } from '../controllers/types';
export declare class VerificationService {
    verifyBatchWeight(params: {
        batch_id: number;
        verified_weight_total: number;
        recycler_id: number;
    }): Promise<WeightComparisonResult>;
    getBatchTransactionSummary(batch_id: number): Promise<BatchTransactionSummary | null>;
    detectSuspiciousPatterns(batch_id: number): Promise<{
        isSuspicious: boolean;
        reasons: string[];
        riskScore: number;
    }>;
    calculateEIURewards(verifiedWeight: number, transactionCount: number): {
        citizenRewards: number;
        collectorBonus: number;
        recyclerReward: number;
        totalEIU: number;
    };
    private logVerificationAttempt;
    getRecyclerStats(recycler_id: number): Promise<{
        totalVerifications: number;
        approvedBatches: number;
        flaggedBatches: number;
        rejectedBatches: number;
        averageWeightDifference: number;
        totalWeightVerified: number;
    }>;
}
//# sourceMappingURL=verification.service.d.ts.map