import { db } from '../config/database';
import { Transaction } from '../../../shared/types';

interface RecordCollectionParams {
  citizen_id: number;
  weight_grams: number;
  notes?: string;
  collector_id: number;
}

interface GetCollectorCollectionsParams {
  collector_id: number;
  page: number;
  limit: number;
  status?: string;
}

export class CollectionService {
  
  /**
   * Record a new collection transaction
   */
  public async recordCollection(params: RecordCollectionParams): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      // Verify citizen exists and has correct role
      const citizenQuery = await db.query(
        'SELECT id, role FROM users WHERE id = $1 AND role = $2',
        [params.citizen_id, 'citizen']
      );

      if (citizenQuery.rows.length === 0) {
        return {
          success: false,
          error: 'Invalid citizen_id or user is not a citizen.'
        };
      }

      // Calculate EIU earned (1 gram = 0.1 EIU)
      const eiuEarned = params.weight_grams * 0.1;
      const collectorFee = eiuEarned * 0.05; // 5% fee for collector

      // Insert transaction
      const insertQuery = `
        INSERT INTO transactions (
          citizen_id, collector_id, weight_grams, eiu_earned, eiu_fee, 
          status, transaction_type, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const result = await db.query(insertQuery, [
        params.citizen_id,
        params.collector_id,
        params.weight_grams,
        eiuEarned,
        collectorFee,
        'PENDING_BATCH',
        'collection',
        params.notes || null
      ]);

      const transaction = result.rows[0];

      // Update citizen's EIU balance (pending until batch verification)
      await db.query(
        'UPDATE users SET eiu_balance = eiu_balance + $1 WHERE id = $2',
        [eiuEarned, params.citizen_id]
      );

      return {
        success: true,
        data: {
          transaction,
          eiu_earned: eiuEarned,
          message: `Successfully recorded ${params.weight_grams}g collection. ${eiuEarned} EIU earned (pending verification).`
        }
      };

    } catch (error) {
      console.error('Error in recordCollection:', error);
      return {
        success: false,
        error: 'Database error while recording collection.'
      };
    }
  }

  /**
   * Get collection history for a collector
   */
  public async getCollectorCollections(params: GetCollectorCollectionsParams): Promise<{
    transactions: Transaction[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const offset = (params.page - 1) * params.limit;
      
      let whereClause = 'WHERE t.collector_id = $1';
      const queryParams = [params.collector_id];
      
      if (params.status) {
        whereClause += ' AND t.status = $2';
        queryParams.push(params.status);
      }

      // Get transactions
      const query = `
        SELECT 
          t.*,
          c.username as citizen_username,
          c.full_name as citizen_full_name,
          c.email as citizen_email
        FROM transactions t
        JOIN users c ON t.citizen_id = c.id
        ${whereClause}
        ORDER BY t.created_at DESC
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      queryParams.push(params.limit.toString(), offset.toString());
      
      const result = await db.query(query, queryParams);
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM transactions t
        ${whereClause}
      `;
      
      const countResult = await db.query(countQuery, params.status ? [params.collector_id, params.status] : [params.collector_id]);
      const totalCount = parseInt(countResult.rows[0].total);

      return {
        transactions: result.rows,
        totalCount,
        currentPage: params.page,
        totalPages: Math.ceil(totalCount / params.limit)
      };

    } catch (error) {
      console.error('Error in getCollectorCollections:', error);
      return {
        transactions: [],
        totalCount: 0,
        currentPage: params.page,
        totalPages: 0
      };
    }
  }

  /**
   * Get collection statistics for a collector
   */
  public async getCollectorStats(collector_id: number): Promise<{
    totalCollections: number;
    totalWeightCollected: number;
    totalEIUFees: number;
    pendingBatches: number;
    averageTransactionWeight: number;
  }> {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_collections,
          COALESCE(SUM(weight_grams), 0) as total_weight_collected,
          COALESCE(SUM(eiu_fee), 0) as total_eiu_fees,
          COUNT(CASE WHEN status = 'PENDING_BATCH' THEN 1 END) as pending_batches,
          COALESCE(AVG(weight_grams), 0) as avg_transaction_weight
        FROM transactions 
        WHERE collector_id = $1
      `;

      const result = await db.query(statsQuery, [collector_id]);
      const row = result.rows[0];

      return {
        totalCollections: parseInt(row.total_collections),
        totalWeightCollected: parseFloat(row.total_weight_collected),
        totalEIUFees: parseFloat(row.total_eiu_fees),
        pendingBatches: parseInt(row.pending_batches),
        averageTransactionWeight: parseFloat(row.avg_transaction_weight)
      };

    } catch (error) {
      console.error('Error in getCollectorStats:', error);
      return {
        totalCollections: 0,
        totalWeightCollected: 0,
        totalEIUFees: 0,
        pendingBatches: 0,
        averageTransactionWeight: 0
      };
    }
  }
}