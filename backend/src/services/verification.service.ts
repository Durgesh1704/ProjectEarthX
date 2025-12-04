import { WeightComparisonResult, BatchTransactionSummary, COLLECTION_LIMITS } from '../controllers/types';
import { db } from '../config/database';

export class VerificationService {
  
  /**
   * The CORE "Double-Weight Verification" logic
   * Compares original weight sum vs verified weight with 5% tolerance
   */
  public async verifyBatchWeight(params: {
    batch_id: number;
    verified_weight_total: number;
    recycler_id: number;
  }): Promise<WeightComparisonResult> {
    try {
      // Step 1: Get all transactions in this batch
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

      // Step 2: Calculate weight difference
      const originalWeight = batchSummary.totalOriginalWeight;
      const verifiedWeight = params.verified_weight_total;
      const weightDifference = Math.abs(originalWeight - verifiedWeight);
      const weightDifferencePercentage = originalWeight > 0 
        ? (weightDifference / originalWeight) * 100 
        : 100;

      // Step 3: Apply the 5% tolerance rule (ANTI-FRAUD CHECK)
      const isWithinTolerance = weightDifferencePercentage <= COLLECTION_LIMITS.TOLERANCE_PERCENTAGE;

      let status: 'APPROVED' | 'FLAGGED' | 'REJECTED';
      let message: string;

      if (isWithinTolerance) {
        status = 'APPROVED';
        message = `Batch verification PASSED. Weight difference: ${weightDifferencePercentage.toFixed(2)}% (within ${COLLECTION_LIMITS.TOLERANCE_PERCENTAGE}% tolerance).`;
      } else {
        // Check if it's an extreme case (should be rejected) or just flagged
        if (weightDifferencePercentage > 20) {
          status = 'REJECTED';
          message = `Batch verification REJECTED. Weight difference: ${weightDifferencePercentage.toFixed(2)}% exceeds maximum allowable threshold (20%).`;
        } else {
          status = 'FLAGGED';
          message = `Batch verification FLAGGED for review. Weight difference: ${weightDifferencePercentage.toFixed(2)}% exceeds ${COLLECTION_LIMITS.TOLERANCE_PERCENTAGE}% tolerance but is within review threshold (20%).`;
        }
      }

      // Step 4: Log the verification attempt for audit
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

    } catch (error) {
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

  /**
   * Get detailed summary of all transactions in a batch
   */
  public async getBatchTransactionSummary(batch_id: number): Promise<BatchTransactionSummary | null> {
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

      const result = await db.query(query, [batch_id]);
      
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

    } catch (error) {
      console.error('Error in getBatchTransactionSummary:', error);
      return null;
    }
  }

  /**
   * Advanced fraud detection - check for suspicious patterns
   */
  public async detectSuspiciousPatterns(batch_id: number): Promise<{
    isSuspicious: boolean;
    reasons: string[];
    riskScore: number;
  }> {
    try {
      const summary = await this.getBatchTransactionSummary(batch_id);
      if (!summary) {
        return { isSuspicious: true, reasons: ['Batch not found'], riskScore: 100 };
      }

      const reasons: string[] = [];
      let riskScore = 0;

      // Check 1: Unusually high number of small transactions
      const smallTransactions = summary.transactions.filter(t => t.weight_grams < 100);
      if (smallTransactions.length > summary.transactionCount * 0.8) {
        reasons.push('High concentration of small transactions (< 100g)');
        riskScore += 30;
      }

      // Check 2: All transactions have exactly the same weight (possible automation)
      const uniqueWeights = new Set(summary.transactions.map(t => t.weight_grams));
      if (uniqueWeights.size === 1 && summary.transactionCount > 5) {
        reasons.push('All transactions have identical weight values');
        riskScore += 40;
      }

      // Check 3: Transactions from same citizen multiple times in same batch
      const citizenCounts = new Map<number, number>();
      summary.transactions.forEach(t => {
        citizenCounts.set(t.citizen_id, (citizenCounts.get(t.citizen_id) || 0) + 1);
      });
      
      const duplicateCitizens = Array.from(citizenCounts.entries()).filter(([_, count]) => count > 1);
      if (duplicateCitizens.length > 0) {
        reasons.push(`${duplicateCitizens.length} citizens have multiple transactions in same batch`);
        riskScore += 20;
      }

      // Check 4: Total weight seems unrealistic for transaction count
      const avgWeight = summary.totalOriginalWeight / summary.transactionCount;
      if (avgWeight > 10000) { // Average > 10kg per transaction
        reasons.push('Unusually high average weight per transaction');
        riskScore += 25;
      }

      // Check 5: Time-based patterns (all transactions within very short time)
      if (summary.transactions.length > 1) {
        const timestamps = summary.transactions.map(t => new Date(t.created_at).getTime());
        const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);
        if (timeSpan < 60000) { // All within 1 minute
          reasons.push('All transactions recorded within very short time period');
          riskScore += 15;
        }
      }

      return {
        isSuspicious: riskScore > 50,
        reasons,
        riskScore
      };

    } catch (error) {
      console.error('Error in detectSuspiciousPatterns:', error);
      return { isSuspicious: true, reasons: ['Error during fraud detection'], riskScore: 100 };
    }
  }

  /**
   * Calculate EIU rewards based on verified weight
   */
  public calculateEIURewards(verifiedWeight: number, transactionCount: number): {
    citizenRewards: number;
    collectorBonus: number;
    recyclerReward: number;
    totalEIU: number;
  } {
    // Base rate: 1 gram = 0.1 EIU
    const baseEIU = verifiedWeight * 0.1;
    
    // Citizen gets 85% of base EIU
    const citizenRewards = baseEIU * 0.85;
    
    // Collector gets 10% as bonus
    const collectorBonus = baseEIU * 0.10;
    
    // Recycler gets 5% as verification reward
    const recyclerReward = baseEIU * 0.05;
    
    // Volume bonus for large batches
    let volumeBonus = 0;
    if (transactionCount > 50) {
      volumeBonus = baseEIU * 0.05; // 5% bonus for large batches
    } else if (transactionCount > 20) {
      volumeBonus = baseEIU * 0.02; // 2% bonus for medium batches
    }

    return {
      citizenRewards: citizenRewards + (volumeBonus * 0.6),
      collectorBonus: collectorBonus + (volumeBonus * 0.3),
      recyclerReward: recyclerReward + (volumeBonus * 0.1),
      totalEIU: baseEIU + volumeBonus
    };
  }

  /**
   * Log verification attempt for audit trail
   */
  private async logVerificationAttempt(params: {
    batch_id: number;
    recycler_id: number;
    original_weight: number;
    verified_weight: number;
    weight_difference_percentage: number;
    status: string;
    message: string;
  }): Promise<void> {
    try {
      const auditQuery = `
        INSERT INTO audit_log (
          user_id, action, table_name, record_id, 
          old_values, new_values, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `;

      await db.query(auditQuery, [
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

    } catch (error) {
      console.error('Error logging verification attempt:', error);
      // Don't throw here - logging failure shouldn't break the main flow
    }
  }

  /**
   * Get verification statistics for a recycler
   */
  public async getRecyclerStats(recycler_id: number): Promise<{
    totalVerifications: number;
    approvedBatches: number;
    flaggedBatches: number;
    rejectedBatches: number;
    averageWeightDifference: number;
    totalWeightVerified: number;
  }> {
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

      const result = await db.query(statsQuery, [recycler_id]);
      const row = result.rows[0];

      return {
        totalVerifications: parseInt(row.total_verifications),
        approvedBatches: parseInt(row.approved_batches),
        flaggedBatches: parseInt(row.flagged_batches),
        rejectedBatches: parseInt(row.rejected_batches),
        averageWeightDifference: parseFloat(row.avg_weight_difference),
        totalWeightVerified: parseFloat(row.total_weight_verified)
      };

    } catch (error) {
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