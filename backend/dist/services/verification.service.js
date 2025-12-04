"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationService = void 0;
const types_1 = require("../controllers/types");
const database_1 = require("../config/database");
class VerificationService {
    async verifyBatchWeight(params) {
        try {
            const batchSummary = await this.getBatchTransactionSummary(params.batch_id);
            if (!batchSummary || batchSummary.transactionCount === 0) {
                return {
                    isWithinTolerance: false,
                    weightDifferencePercentage: 100,
                    originalWeight: 0,
                    verifiedWeight: params.verified_weight_total,
                    status: 'REJECTED',
                    message: 'Batch has no transactions or batch not found.'
                };
            }
            const originalWeight = batchSummary.totalOriginalWeight;
            const verifiedWeight = params.verified_weight_total;
            const weightDifference = Math.abs(originalWeight - verifiedWeight);
            const weightDifferencePercentage = originalWeight > 0
                ? (weightDifference / originalWeight) * 100
                : 100;
            const isWithinTolerance = weightDifferencePercentage <= types_1.COLLECTION_LIMITS.TOLERANCE_PERCENTAGE;
            let status;
            let message;
            if (isWithinTolerance) {
                status = 'APPROVED';
                message = `Batch verification PASSED. Weight difference: ${weightDifferencePercentage.toFixed(2)}% (within ${types_1.COLLECTION_LIMITS.TOLERANCE_PERCENTAGE}% tolerance).`;
            }
            else {
                if (weightDifferencePercentage > 20) {
                    status = 'REJECTED';
                    message = `Batch verification REJECTED. Weight difference: ${weightDifferencePercentage.toFixed(2)}% exceeds maximum allowable threshold (20%).`;
                }
                else {
                    status = 'FLAGGED';
                    message = `Batch verification FLAGGED for review. Weight difference: ${weightDifferencePercentage.toFixed(2)}% exceeds ${types_1.COLLECTION_LIMITS.TOLERANCE_PERCENTAGE}% tolerance but is within review threshold (20%).`;
                }
            }
            await this.logVerificationAttempt({
                batch_id: params.batch_id,
                recycler_id: params.recycler_id,
                original_weight: originalWeight,
                verified_weight: verifiedWeight,
                weight_difference_percentage: weightDifferencePercentage,
                status,
                message
            });
            return {
                isWithinTolerance,
                weightDifferencePercentage,
                originalWeight,
                verifiedWeight,
                status,
                message
            };
        }
        catch (error) {
            console.error('Error in verifyBatchWeight:', error);
            return {
                isWithinTolerance: false,
                weightDifferencePercentage: 100,
                originalWeight: 0,
                verifiedWeight: params.verified_weight_total,
                status: 'REJECTED',
                message: 'System error during verification. Please try again.'
            };
        }
    }
    async getBatchTransactionSummary(batch_id) {
        try {
            const query = `
        SELECT 
          b.id as batch_id,
          b.batch_name,
          COUNT(t.id) as transaction_count,
          COALESCE(SUM(t.weight_grams), 0) as total_original_weight,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', t.id,
              'citizen_id', t.citizen_id,
              'weight_grams', t.weight_grams,
              'status', t.status,
              'created_at', t.created_at
            ) ORDER BY t.created_at DESC
          ) as transactions
        FROM batches b
        LEFT JOIN transaction_batch tb ON b.id = tb.batch_id
        LEFT JOIN transactions t ON tb.transaction_id = t.id
        WHERE b.id = $1
        GROUP BY b.id, b.batch_name
      `;
            const result = await database_1.db.query(query, [batch_id]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            return {
                batchId: row.batch_id,
                transactionCount: parseInt(row.transaction_count),
                totalOriginalWeight: parseFloat(row.total_original_weight),
                transactions: row.transactions || []
            };
        }
        catch (error) {
            console.error('Error in getBatchTransactionSummary:', error);
            return null;
        }
    }
    async detectSuspiciousPatterns(batch_id) {
        try {
            const summary = await this.getBatchTransactionSummary(batch_id);
            if (!summary) {
                return { isSuspicious: true, reasons: ['Batch not found'], riskScore: 100 };
            }
            const reasons = [];
            let riskScore = 0;
            const smallTransactions = summary.transactions.filter(t => t.weight_grams < 100);
            if (smallTransactions.length > summary.transactionCount * 0.8) {
                reasons.push('High concentration of small transactions (< 100g)');
                riskScore += 30;
            }
            const uniqueWeights = new Set(summary.transactions.map(t => t.weight_grams));
            if (uniqueWeights.size === 1 && summary.transactionCount > 5) {
                reasons.push('All transactions have identical weight values');
                riskScore += 40;
            }
            const citizenCounts = new Map();
            summary.transactions.forEach(t => {
                citizenCounts.set(t.citizen_id, (citizenCounts.get(t.citizen_id) || 0) + 1);
            });
            const duplicateCitizens = Array.from(citizenCounts.entries()).filter(([_, count]) => count > 1);
            if (duplicateCitizens.length > 0) {
                reasons.push(`${duplicateCitizens.length} citizens have multiple transactions in same batch`);
                riskScore += 20;
            }
            const avgWeight = summary.totalOriginalWeight / summary.transactionCount;
            if (avgWeight > 10000) {
                reasons.push('Unusually high average weight per transaction');
                riskScore += 25;
            }
            return {
                isSuspicious: riskScore > 50,
                reasons,
                riskScore
            };
        }
        catch (error) {
            console.error('Error in detectSuspiciousPatterns:', error);
            return { isSuspicious: true, reasons: ['Error during fraud detection'], riskScore: 100 };
        }
    }
    calculateEIURewards(verifiedWeight, transactionCount) {
        const baseEIU = verifiedWeight * 0.1;
        const citizenRewards = baseEIU * 0.85;
        const collectorBonus = baseEIU * 0.10;
        const recyclerReward = baseEIU * 0.05;
        let volumeBonus = 0;
        if (transactionCount > 50) {
            volumeBonus = baseEIU * 0.05;
        }
        else if (transactionCount > 20) {
            volumeBonus = baseEIU * 0.02;
        }
        return {
            citizenRewards: citizenRewards + (volumeBonus * 0.6),
            collectorBonus: collectorBonus + (volumeBonus * 0.3),
            recyclerReward: recyclerReward + (volumeBonus * 0.1),
            totalEIU: baseEIU + volumeBonus
        };
    }
    async logVerificationAttempt(params) {
        try {
            const auditQuery = `
        INSERT INTO audit_log (
          user_id, action, table_name, record_id, 
          old_values, new_values, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `;
            await database_1.db.query(auditQuery, [
                params.recycler_id,
                'BATCH_VERIFICATION',
                'batches',
                params.batch_id,
                {
                    original_weight: params.original_weight,
                    weight_difference_percentage: null
                },
                {
                    verified_weight: params.verified_weight,
                    weight_difference_percentage: params.weight_difference_percentage,
                    status: params.status,
                    message: params.message
                }
            ]);
        }
        catch (error) {
            console.error('Error logging verification attempt:', error);
        }
    }
    async getRecyclerStats(recycler_id) {
        try {
            const statsQuery = `
        SELECT 
          COUNT(*) as total_verifications,
          COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as approved_batches,
          COUNT(CASE WHEN verification_status = 'pending' THEN 1 END) as flagged_batches,
          COUNT(CASE WHEN verification_status = 'rejected' THEN 1 END) as rejected_batches,
          COALESCE(AVG(weight_difference_percentage), 0) as avg_weight_difference,
          COALESCE(SUM(total_weight_grams), 0) as total_weight_verified
        FROM batches 
        WHERE recycler_id = $1
          AND verified_at IS NOT NULL
      `;
            const result = await database_1.db.query(statsQuery, [recycler_id]);
            const row = result.rows[0];
            return {
                totalVerifications: parseInt(row.total_verifications),
                approvedBatches: parseInt(row.approved_batches),
                flaggedBatches: parseInt(row.flagged_batches),
                rejectedBatches: parseInt(row.rejected_batches),
                averageWeightDifference: parseFloat(row.avg_weight_difference),
                totalWeightVerified: parseFloat(row.total_weight_verified)
            };
        }
        catch (error) {
            console.error('Error in getRecyclerStats:', error);
            return {
                totalVerifications: 0,
                approvedBatches: 0,
                flaggedBatches: 0,
                rejectedBatches: 0,
                averageWeightDifference: 0,
                totalWeightVerified: 0
            };
        }
    }
}
exports.VerificationService = VerificationService;
//# sourceMappingURL=verification.service.js.map