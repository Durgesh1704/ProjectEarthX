import { Response } from 'express';
import { AuthenticatedRequest, VerifyBatchRequest, VerifyBatchResponse } from './types';
import { VerificationService } from '../services/verification.service';
import { BatchService } from '../services/batch.service';
import { BlockchainService } from '../services/blockchain.service';
import { UserRole } from '../../../shared/types';

export class BatchController {
  private verificationService: VerificationService;
  private batchService: BatchService;
  private blockchainService: BlockchainService;

  constructor() {
    this.verificationService = new VerificationService();
    this.batchService = new BatchService();
    this.blockchainService = new BlockchainService();
  }

  /**
   * Verify a batch with weight comparison and IPFS proof
   * POST /api/batch/verify
   * Access: RECYCLER role only
   */
  public verifyBatch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Validate user role
      if (!req.user || req.user.role !== UserRole.RECYCLER) {
        res.status(403).json({
          success: false,
          error: 'Access denied. Only RECYCLER role can verify batches.'
        } as VerifyBatchResponse);
        return;
      }

      const { batch_id, verified_weight_total, ipfs_proof_hash, proof_type, verification_notes }: VerifyBatchRequest = req.body;

      // Validate request body
      const validation = this.validateVerifyBatchRequest({
        batch_id,
        verified_weight_total,
        ipfs_proof_hash,
        proof_type,
        verification_notes
      });
      
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        } as VerifyBatchResponse);
        return;
      }

      // Get batch details
      const batch = await this.batchService.getBatchById(batch_id);
      if (!batch) {
        res.status(404).json({
          success: false,
          error: 'Batch not found.'
        } as VerifyBatchResponse);
        return;
      }

      // Check if batch is in correct status for verification
      if (batch.verification_status !== 'pending') {
        res.status(400).json({
          success: false,
          error: `Batch cannot be verified. Current status: ${batch.verification_status}`
        } as VerifyBatchResponse);
        return;
      }

      // Perform the weight comparison verification
      const verificationResult = await this.verificationService.verifyBatchWeight({
        batch_id,
        verified_weight_total,
        recycler_id: req.user.id
      });

      // Update batch with verification results
      const updatedBatch = await this.batchService.updateBatchVerification(batch_id, {
        recycler_id: req.user.id,
        verified_weight_total,
        ipfs_proof_hash,
        proof_type: proof_type || 'photo',
        verification_notes,
        verification_status: verificationResult.status === 'APPROVED' ? 'verified' : 
                           verificationResult.status === 'FLAGGED' ? 'pending' : 'rejected',
        rejection_reason: verificationResult.status === 'REJECTED' ? verificationResult.message : undefined,
        weight_difference_percentage: verificationResult.weightDifferencePercentage,
        blockchain_batch_id: verificationResult.status === 'APPROVED' ? this.generateBlockchainBatchId() : null
      });

      // Log the verification action
      await this.batchService.logBatchActivity({
        batch_id,
        recycler_id: req.user.id,
        action: verificationResult.status,
        details: {
          verified_weight_total,
          original_weight: verificationResult.originalWeight,
          weight_difference_percentage: verificationResult.weightDifferencePercentage,
          ipfs_proof_hash,
          verification_notes
        }
      });

      // 🚀 BLOCKCHAIN INTEGRATION: Trigger mint for approved batches
      let mintResult = null;
      if (verificationResult.status === 'APPROVED') {
        console.log(`Batch ${batch_id} approved. Triggering blockchain mint...`);
        
        try {
          // Trigger mint asynchronously (don't block the response)
          this.triggerMintAsync(batch_id);
          mintResult = {
            status: 'INITIATED',
            message: 'Minting process initiated. Check batch status for updates.'
          };
        } catch (error) {
          console.error(`Failed to initiate mint for batch ${batch_id}:`, error);
          mintResult = {
            status: 'FAILED',
            error: 'Failed to initiate minting process.'
          };
        }
      }

      res.status(200).json({
        success: true,
        data: {
          batch: updatedBatch,
          verification_result: verificationResult,
          mint_result: mintResult
        }
      } as VerifyBatchResponse);

    } catch (error) {
      console.error('Error in verifyBatch:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while verifying batch.'
      } as VerifyBatchResponse);
    }
  };

  /**
   * Get all batches pending verification for the authenticated recycler
   * GET /api/batch/pending
   * Access: RECYCLER role only
   */
  public getPendingBatches = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== UserRole.RECYCLER) {
        res.status(403).json({
          success: false,
          error: 'Access denied. Only RECYCLER role can view pending batches.'
        });
        return;
      }

      const { page = 1, limit = 20 } = req.query;
      
      const result = await this.batchService.getPendingBatches({
        recycler_id: req.user.id,
        page: Number(page),
        limit: Number(limit)
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error in getPendingBatches:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching pending batches.'
      });
    }
  };

  /**
   * Get verification history for the authenticated recycler
   * GET /api/batch/history
   * Access: RECYCLER role only
   */
  public getVerificationHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== UserRole.RECYCLER) {
        res.status(403).json({
          success: false,
          error: 'Access denied. Only RECYCLER role can view verification history.'
        });
        return;
      }

      const { page = 1, limit = 20, status } = req.query;
      
      const result = await this.batchService.getRecyclerVerificationHistory({
        recycler_id: req.user.id,
        page: Number(page),
        limit: Number(limit),
        status: status as string
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error in getVerificationHistory:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching verification history.'
      });
    }
  };

  /**
   * Get batch mint status
   * GET /api/batch/:batchId/mint-status
   * Access: COLLECTOR, RECYCLER roles
   */
  public getBatchMintStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || !['COLLECTOR', 'RECYCLER'].includes(req.user.role)) {
        res.status(403).json({
          success: false,
          error: 'Access denied. Only COLLECTOR or RECYCLER roles can view mint status.'
        });
        return;
      }

      const { batchId } = req.params;
      
      const batch = await this.batchService.getBatchById(Number(batchId));
      if (!batch) {
        res.status(404).json({
          success: false,
          error: 'Batch not found.'
        });
        return;
      }

      // Check if user has access to this batch
      if (batch.collector_id !== req.user.id && batch.recycler_id !== req.user.id) {
        res.status(403).json({
          success: false,
          error: 'Access denied. You can only view mint status for your own batches.'
        });
        return;
      }

      let transactionStatus = null;
      if (batch.tx_hash) {
        transactionStatus = await this.blockchainService.getTransactionStatus(batch.tx_hash);
      }

      res.json({
        success: true,
        data: {
          batch_id: batch.id,
          mint_status: batch.mint_status,
          tx_hash: batch.tx_hash,
          block_number: batch.block_number,
          retry_count: batch.retry_count,
          last_attempt: batch.last_attempt,
          mint_error: batch.mint_error,
          blockchain_status: transactionStatus
        }
      });

    } catch (error) {
      console.error('Error in getBatchMintStatus:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching mint status.'
      });
    }
  };

  /**
   * Retry failed mint for a batch
   * POST /api/batch/:batchId/retry-mint
   * Access: RECYCLER role only
   */
  public retryBatchMint = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== UserRole.RECYCLER) {
        res.status(403).json({
          success: false,
          error: 'Access denied. Only RECYCLER role can retry mint.'
        });
        return;
      }

      const { batchId } = req.params;
      
      const batch = await this.batchService.getBatchById(Number(batchId));
      if (!batch) {
        res.status(404).json({
          success: false,
          error: 'Batch not found.'
        });
        return;
      }

      // Check if user is the recycler for this batch
      if (batch.recycler_id !== req.user.id) {
        res.status(403).json({
          success: false,
          error: 'Access denied. You can only retry mint for batches you verified.'
        });
        return;
      }

      // Check if batch can be retried
      if (batch.mint_status !== 'FAILED_ON_CHAIN') {
        res.status(400).json({
          success: false,
          error: 'Only failed batches can be retried.'
        });
        return;
      }

      // Trigger mint retry
      const mintResult = await this.blockchainService.triggerMint(batchId);

      res.json({
        success: true,
        data: {
          batch_id: batch.id,
          mint_result: mintResult
        }
      });

    } catch (error) {
      console.error('Error in retryBatchMint:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while retrying mint.'
      });
    }
  };

  /**
   * Get blockchain contract info
   * GET /api/batch/contract-info
   * Access: Any authenticated user
   */
  public getContractInfo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required.'
        });
        return;
      }

      const contractInfo = await this.blockchainService.getContractInfo();

      res.json({
        success: true,
        data: contractInfo
      });

    } catch (error) {
      console.error('Error in getContractInfo:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching contract info.'
      });
    }
  };

  /**
   * Validate batch verification request data
   */
  private validateVerifyBatchRequest(data: VerifyBatchRequest): { isValid: boolean; errors: any[] } {
    const errors: any[] = [];

    // Validate batch_id
    if (!data.batch_id || typeof data.batch_id !== 'number' || data.batch_id <= 0) {
      errors.push({
        field: 'batch_id',
        message: 'Valid batch_id is required and must be a positive number.'
      });
    }

    // Validate verified_weight_total
    if (!data.verified_weight_total || typeof data.verified_weight_total !== 'number') {
      errors.push({
        field: 'verified_weight_total',
        message: 'verified_weight_total is required and must be a number.'
      });
    } else if (data.verified_weight_total <= 0) {
      errors.push({
        field: 'verified_weight_total',
        message: 'verified_weight_total must be greater than 0.'
      });
    } else if (data.verified_weight_total % 1 !== 0) {
      errors.push({
        field: 'verified_weight_total',
        message: 'verified_weight_total must be a whole number (no decimal points).'
      });
    }

    // Validate ipfs_proof_hash
    if (!data.ipfs_proof_hash || typeof data.ipfs_proof_hash !== 'string') {
      errors.push({
        field: 'ipfs_proof_hash',
        message: 'ipfs_proof_hash is required and must be a string.'
      });
    } else if (data.ipfs_proof_hash.length < 46 || data.ipfs_proof_hash.length > 64) {
      errors.push({
        field: 'ipfs_proof_hash',
        message: 'ipfs_proof_hash must be a valid IPFS hash (46-64 characters).'
      });
    }

    // Validate proof_type (optional)
    if (data.proof_type && !['photo', 'video', 'document'].includes(data.proof_type)) {
      errors.push({
        field: 'proof_type',
        message: 'proof_type must be one of: photo, video, document.'
      });
    }

    // Validate verification_notes (optional)
    if (data.verification_notes && typeof data.verification_notes !== 'string') {
      errors.push({
        field: 'verification_notes',
        message: 'verification_notes must be a string if provided.'
      });
    } else if (data.verification_notes && data.verification_notes.length > 1000) {
      errors.push({
        field: 'verification_notes',
        message: 'verification_notes must be less than 1000 characters.'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate a unique blockchain batch ID
   */
  private generateBlockchainBatchId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `BATCH_${timestamp}_${random}`;
  }

  /**
   * Trigger mint asynchronously (don't block the response)
   */
  private async triggerMintAsync(batchId: string): Promise<void> {
    try {
      // Add a small delay to ensure database is updated
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = await this.blockchainService.triggerMint(batchId);
      
      if (result.success) {
        console.log(`✅ Batch ${batchId} minted successfully: ${result.transactionHash}`);
      } else {
        console.error(`❌ Batch ${batchId} mint failed: ${result.error}`);
      }
    } catch (error) {
      console.error(`💥 Async mint error for batch ${batchId}:`, error);
    }
  }
}