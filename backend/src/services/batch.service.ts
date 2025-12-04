import { db } from '../config/database';
import { Batch } from '../../../shared/types';

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

export class BatchService {
  
  /**
   * Get batch by ID
   */
  public async getBatchById(batch_id: number): Promise<Batch | null> {
    try {
      const query = `
        SELECT 
          b.*,
          c.username as collector_username,
          c.full_name as collector_full_name,
          r.username as recycler_username,
          r.full_name as recycler_full_name
        FROM batches b
        JOIN users c ON b.collector_id = c.id
        LEFT JOIN users r ON b.recycler_id = r.id
        WHERE b.id = $1
      `;

      const result = await db.query(query, [batch_id]);
      return result.rows.length > 0 ? result.rows[0] : null;

    } catch (error) {
      console.error('Error in getBatchById:', error);
      return null;
    }
  }

  /**
   * Get batches pending verification
   */
  public async getPendingBatches(params: GetPendingBatchesParams): Promise<{
    batches: Batch[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const offset = (params.page - 1) * params.limit;
      
      const query = `
        SELECT 
          b.*,
          c.username as collector_username,
          c.full_name as collector_full_name,
          COUNT(t.id) as transaction_count,
          COALESCE(SUM(t.weight_grams), 0) as total_weight
        FROM batches b
        JOIN users c ON b.collector_id = c.id
        LEFT JOIN transaction_batch tb ON b.id = tb.batch_id
        LEFT JOIN transactions t ON tb.transaction_id = t.id
        WHERE b.verification_status = 'pending'
        GROUP BY b.id, c.username, c.full_name
        ORDER BY b.created_at ASC
        LIMIT $1 OFFSET $2
      `;

      const result = await db.query(query, [params.limit, offset]);
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM batches 
        WHERE verification_status = 'pending'
      `;
      
      const countResult = await db.query(countQuery);
      const totalCount = parseInt(countResult.rows[0].total);

      return {
        batches: result.rows,
        totalCount,
        currentPage: params.page,
        totalPages: Math.ceil(totalCount / params.limit)
      };

    } catch (error) {
      console.error('Error in getPendingBatches:', error);
      return {
        batches: [],
        totalCount: 0,
        currentPage: params.page,
        totalPages: 0
      };
    }
  }

  /**
   * Update batch verification details
   */
  public async updateBatchVerification(batch_id: number, params: UpdateBatchVerificationParams): Promise<Batch> {
    try {
      const updateQuery = `
        UPDATE batches SET 
          recycler_id = $1,
          total_weight_grams = $2,
          ipfs_proof_hash = $3,
          proof_type = $4,
          verification_notes = $5,
          verification_status = $6,
          rejection_reason = $7,
          verified_at = CURRENT_TIMESTAMP,
          blockchain_batch_id = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
        RETURNING *
      `;

      const result = await db.query(updateQuery, [
        params.recycler_id,
        params.verified_weight_total,
        params.ipfs_proof_hash,
        params.proof_type,
        params.verification_notes || null,
        params.verification_status,
        params.rejection_reason || null,
        params.blockchain_batch_id || null,
        batch_id
      ]);

      return result.rows[0];

    } catch (error) {
      console.error('Error in updateBatchVerification:', error);
      throw error;
    }
  }

  /**
   * Get recycler verification history
   */
  public async getRecyclerVerificationHistory(params: GetRecyclerVerificationHistoryParams): Promise<{
    batches: Batch[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const offset = (params.page - 1) * params.limit;
      
      let whereClause = 'WHERE b.recycler_id = $1';
      const queryParams = [params.recycler_id];
      
      if (params.status) {
        whereClause += ' AND b.verification_status = $2';
        queryParams.push(params.status);
      }

      const query = `
        SELECT 
          b.*,
          c.username as collector_username,
          c.full_name as collector_full_name,
          COUNT(t.id) as transaction_count,
          COALESCE(SUM(t.weight_grams), 0) as total_weight
        FROM batches b
        JOIN users c ON b.collector_id = c.id
        LEFT JOIN transaction_batch tb ON b.id = tb.batch_id
        LEFT JOIN transactions t ON tb.transaction_id = t.id
        ${whereClause}
        GROUP BY b.id, c.username, c.full_name
        ORDER BY b.verified_at DESC
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      queryParams.push(params.limit.toString(), offset.toString());
      
      const result = await db.query(query, queryParams);
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM batches b
        ${whereClause}
      `;
      
      const countResult = await db.query(countQuery, params.status ? [params.recycler_id, params.status] : [params.recycler_id]);
      const totalCount = parseInt(countResult.rows[0].total);

      return {
        batches: result.rows,
        totalCount,
        currentPage: params.page,
        totalPages: Math.ceil(totalCount / params.limit)
      };

    } catch (error) {
      console.error('Error in getRecyclerVerificationHistory:', error);
      return {
        batches: [],
        totalCount: 0,
        currentPage: params.page,
        totalPages: 0
      };
    }
  }

  /**
   * Log batch activity for audit trail
   */
  public async logBatchActivity(params: LogBatchActivityParams): Promise<void> {
    try {
      const auditQuery = `
        INSERT INTO audit_log (
          user_id, action, table_name, record_id, 
          new_values, created_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `;

      await db.query(auditQuery, [
        params.recycler_id,
        `BATCH_${params.action}`,
        'batches',
        params.batch_id,
        params.details
      ]);

    } catch (error) {
      console.error('Error in logBatchActivity:', error);
      // Don't throw here - logging failure shouldn't break the main flow
    }
  }

  /**
   * Create a new batch from pending transactions
   */
  public async createBatch(params: {
    collector_id: number;
    batch_name: string;
    transaction_ids: number[];
  }): Promise<Batch | null> {
    try {
      // Start transaction
      await db.query('BEGIN');

      // Create batch
      const batchQuery = `
        INSERT INTO batches (collector_id, batch_name, verification_status, created_at, updated_at)
        VALUES ($1, $2, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const batchResult = await db.query(batchQuery, [params.collector_id, params.batch_name]);
      const newBatch = batchResult.rows[0];

      // Link transactions to batch
      for (const transactionId of params.transaction_ids) {
        await db.query(
          'INSERT INTO transaction_batch (transaction_id, batch_id, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
          [transactionId, newBatch.id]
        );

        // Update transaction status
        await db.query(
          'UPDATE transactions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['PENDING_BATCH', transactionId]
        );
      }

      await db.query('COMMIT');
      return newBatch;

    } catch (error) {
      await db.query('ROLLBACK');
      console.error('Error in createBatch:', error);
      return null;
    }
  }

  /**
   * Get batch statistics
   */
  public async getBatchStats(): Promise<{
    totalBatches: number;
    pendingBatches: number;
    verifiedBatches: number;
    flaggedBatches: number;
    rejectedBatches: number;
    totalWeightProcessed: number;
  }> {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_batches,
          COUNT(CASE WHEN verification_status = 'pending' THEN 1 END) as pending_batches,
          COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified_batches,
          COUNT(CASE WHEN verification_status = 'pending' AND weight_difference_percentage > 5 THEN 1 END) as flagged_batches,
          COUNT(CASE WHEN verification_status = 'rejected' THEN 1 END) as rejected_batches,
          COALESCE(SUM(total_weight_grams), 0) as total_weight_processed
        FROM batches
      `;

      const result = await db.query(statsQuery);
      const row = result.rows[0];

      return {
        totalBatches: parseInt(row.total_batches),
        pendingBatches: parseInt(row.pending_batches),
        verifiedBatches: parseInt(row.verified_batches),
        flaggedBatches: parseInt(row.flagged_batches),
        rejectedBatches: parseInt(row.rejected_batches),
        totalWeightProcessed: parseFloat(row.total_weight_processed)
      };

    } catch (error) {
      console.error('Error in getBatchStats:', error);
      return {
        totalBatches: 0,
        pendingBatches: 0,
        verifiedBatches: 0,
        flaggedBatches: 0,
        rejectedBatches: 0,
        totalWeightProcessed: 0
      };
    }
  }
}