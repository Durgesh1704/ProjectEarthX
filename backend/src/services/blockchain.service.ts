import { ethers } from 'ethers';
import { db } from '../config/database';
import { 
  BlockchainConfig, 
  MintRequest, 
  MintResult, 
  BatchMintStatus,
  EARTHX_CONTRACT_ABI,
  BLOCKCHAIN_CONSTANTS,
  BlockchainError,
  NonceError,
  GasError,
  ContractError
} from './blockchain.types';

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;
  private config: BlockchainConfig;

  constructor() {
    this.config = {
      rpcUrl: process.env.POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology',
      privateKey: process.env.POLYGON_PRIVATE_KEY || '',
      contractAddress: process.env.POLYGON_CONTRACT_ADDRESS || '0x...', // Replace with actual contract address
      gasLimit: BLOCKCHAIN_CONSTANTS.GAS_LIMIT,
      maxRetries: BLOCKCHAIN_CONSTANTS.MAX_RETRIES,
      retryDelay: BLOCKCHAIN_CONSTANTS.RETRY_DELAY,
      confirmations: BLOCKCHAIN_CONSTANTS.CONFIRMATIONS
    };

    this.initializeProvider();
  }

  /**
   * Initialize blockchain provider and contract
   */
  private initializeProvider(): void {
    try {
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
      this.wallet = new ethers.Wallet(this.config.privateKey, this.provider);
      this.contract = new ethers.Contract(
        this.config.contractAddress,
        EARTHX_CONTRACT_ABI,
        this.wallet
      );

      console.log('Blockchain service initialized successfully');
      console.log('Wallet address:', this.wallet.address);
      console.log('Contract address:', this.config.contractAddress);

    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      throw new BlockchainError('Failed to initialize blockchain provider', 'INIT_ERROR', false);
    }
  }

  /**
   * CORE METHOD: Trigger mint for an approved batch
   */
  public async triggerMint(batchId: string): Promise<MintResult> {
    let retryCount = 0;
    let lastError: Error | null = null;

    console.log(`Starting mint process for batch ${batchId}`);

    // Step 1: Look up batch in database
    const batch = await this.getBatchForMinting(batchId);
    if (!batch) {
      return {
        success: false,
        error: 'Batch not found or not in APPROVED status'
      };
    }

    // Step 2: Get user addresses
    const addresses = await this.getUserAddresses(batch.collector_id, batch.recycler_id!);
    if (!addresses.success) {
      return {
        success: false,
        error: addresses.error
      };
    }

    // Step 3: Update status to PENDING_MINT
    await this.updateBatchMintStatus(batchId, {
      mintStatus: 'PENDING_MINT',
      retryCount: 0,
      lastAttempt: new Date()
    });

    // Step 4: Retry mechanism
    while (retryCount < this.config.maxRetries) {
      try {
        console.log(`Attempt ${retryCount + 1}/${this.config.maxRetries} for batch ${batchId}`);

        const result = await this.executeMintTransaction({
          batchId,
          collectorAddress: addresses.collectorAddress!,
          recyclerAddress: addresses.recyclerAddress!,
          weightAmount: batch.total_weight_grams,
          ipfsHash: batch.ipfs_proof_hash!
        });

        // Success! Update database and return
        await this.updateBatchMintStatus(batchId, {
          mintStatus: 'MINTED',
          txHash: result.transactionHash,
          blockNumber: result.blockNumber,
          retryCount
        });

        console.log(`Successfully minted batch ${batchId}. TX: ${result.transactionHash}`);

        return {
          success: true,
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber,
          gasUsed: result.gasUsed,
          retryCount
        };

      } catch (error) {
        lastError = error as Error;
        retryCount++;

        console.error(`Attempt ${retryCount} failed for batch ${batchId}:`, error);

        // Check if error is retryable
        if (error instanceof BlockchainError && !error.retryable) {
          break; // Don't retry non-retryable errors
        }

        // Update status to RETRYING
        await this.updateBatchMintStatus(batchId, {
          mintStatus: 'RETRYING',
          retryCount,
          lastAttempt: new Date(),
          error: lastError.message
        });

        // Wait before retry (exponential backoff)
        if (retryCount < this.config.maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, retryCount - 1);
          console.log(`Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    await this.updateBatchMintStatus(batchId, {
      mintStatus: 'FAILED_ON_CHAIN',
      retryCount,
      lastAttempt: new Date(),
      error: lastError?.message || 'Unknown error'
    });

    return {
      success: false,
      error: `Failed after ${retryCount} retries: ${lastError?.message}`,
      retryCount
    };
  }

  /**
   * Execute the actual mint transaction
   */
  private async executeMintTransaction(request: MintRequest): Promise<MintResult> {
    try {
      // Get current nonce
      const nonce = await this.wallet.getNonce();
      
      // Estimate gas
      const gasEstimate = await this.contract.mintBatch.estimateGas(
        request.collectorAddress,
        request.recyclerAddress,
        ethers.parseEther(request.weightAmount.toString()), // Convert to wei
        request.ipfsHash
      );

      // Add 20% buffer to gas estimate
      const gasLimit = Math.floor(Number(gasEstimate) * 1.2);

      console.log(`Executing mint transaction with nonce ${nonce}, gas limit ${gasLimit}`);

      // Send transaction
      const tx = await this.contract.mintBatch(
        request.collectorAddress,
        request.recyclerAddress,
        ethers.parseEther(request.weightAmount.toString()),
        request.ipfsHash,
        {
          nonce,
          gasLimit,
          gasPrice: await this.provider.getFeeData()
        }
      );

      console.log(`Transaction sent: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait(this.config.confirmations);

      if (!receipt) {
        throw new BlockchainError('Transaction receipt not received', 'NO_RECEIPT');
      }

      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error: any) {
      // Handle specific error types
      if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        throw new GasError('Gas estimation failed. Transaction may revert.');
      } else if (error.code === 'NONCE_EXPIRED' || error.code === 'NONCE_TOO_LOW') {
        throw new NonceError(`Nonce error: ${error.message}`);
      } else if (error.message.includes('revert')) {
        throw new ContractError(`Contract revert: ${error.message}`);
      } else if (error.message.includes('insufficient funds')) {
        throw new BlockchainError('Insufficient funds for gas', 'INSUFFICIENT_FUNDS', false);
      } else {
        throw new BlockchainError(`Transaction failed: ${error.message}`, 'TRANSACTION_ERROR');
      }
    }
  }

  /**
   * Get batch details for minting
   */
  private async getBatchForMinting(batchId: string): Promise<any> {
    try {
      const query = `
        SELECT 
          b.*,
          c.wallet_address as collector_wallet,
          r.wallet_address as recycler_wallet
        FROM batches b
        JOIN users c ON b.collector_id = c.id
        LEFT JOIN users r ON b.recycler_id = r.id
        WHERE b.id = $1 
          AND b.verification_status = 'verified'
          AND (b.mint_status IS NULL OR b.mint_status = 'FAILED_ON_CHAIN')
      `;

      const result = await db.query(query, [batchId]);
      return result.rows.length > 0 ? result.rows[0] : null;

    } catch (error) {
      console.error('Error in getBatchForMinting:', error);
      return null;
    }
  }

  /**
   * Get user wallet addresses
   */
  private async getUserAddresses(collectorId: number, recyclerId: number): Promise<{
    success: boolean;
    collectorAddress?: string;
    recyclerAddress?: string;
    error?: string;
  }> {
    try {
      const query = `
        SELECT id, wallet_address, role
        FROM users 
        WHERE id IN ($1, $2) AND wallet_address IS NOT NULL
      `;

      const result = await db.query(query, [collectorId, recyclerId]);
      
      if (result.rows.length < 2) {
        return {
          success: false,
          error: 'Missing wallet addresses for collector or recycler'
        };
      }

      const collector = result.rows.find(u => u.role === 'collector');
      const recycler = result.rows.find(u => u.role === 'recycler');

      if (!collector?.wallet_address || !recycler?.wallet_address) {
        return {
          success: false,
          error: 'Invalid wallet addresses'
        };
      }

      return {
        success: true,
        collectorAddress: collector.wallet_address,
        recyclerAddress: recycler.wallet_address
      };

    } catch (error) {
      console.error('Error in getUserAddresses:', error);
      return {
        success: false,
        error: 'Database error while fetching wallet addresses'
      };
    }
  }

  /**
   * Update batch mint status in database
   */
  private async updateBatchMintStatus(batchId: string, status: Partial<BatchMintStatus>): Promise<void> {
    try {
      const query = `
        UPDATE batches SET 
          mint_status = $1,
          tx_hash = $2,
          block_number = $3,
          retry_count = $4,
          last_attempt = $5,
          mint_error = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
      `;

      await db.query(query, [
        status.mintStatus,
        status.txHash || null,
        status.blockNumber || null,
        status.retryCount || 0,
        status.lastAttempt || null,
        status.error || null,
        batchId
      ]);

    } catch (error) {
      console.error('Error in updateBatchMintStatus:', error);
      throw error;
    }
  }

  /**
   * Get transaction status
   */
  public async getTransactionStatus(txHash: string): Promise<{
    confirmed: boolean;
    blockNumber?: number;
    gasUsed?: string;
    error?: string;
  }> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return { confirmed: false };
      }

      return {
        confirmed: receipt.status === 1,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      console.error('Error in getTransactionStatus:', error);
      return {
        confirmed: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get contract info
   */
  public async getContractInfo(): Promise<{
    address: string;
    chainId: number;
    totalMinted?: string;
  }> {
    try {
      const chainId = await this.provider.getNetwork();
      
      let totalMinted;
      try {
        totalMinted = await this.contract.totalMinted();
      } catch (error) {
        console.warn('Could not fetch totalMinted:', error);
      }

      return {
        address: this.config.contractAddress,
        chainId: Number(chainId.chainId),
        totalMinted: totalMinted?.toString()
      };

    } catch (error) {
      console.error('Error in getContractInfo:', error);
      return {
        address: this.config.contractAddress,
        chainId: 0
      };
    }
  }

  /**
   * Retry failed batches (cron job helper)
   */
  public async retryFailedBatches(): Promise<{
    retried: number;
    successful: number;
    failed: number;
  }> {
    try {
      // Get batches that failed on chain
      const query = `
        SELECT id 
        FROM batches 
        WHERE mint_status = 'FAILED_ON_CHAIN' 
          AND retry_count < $1
          AND (last_attempt IS NULL OR last_attempt < NOW() - INTERVAL '1 hour')
        ORDER BY created_at ASC
        LIMIT 10
      `;

      const result = await db.query(query, [this.config.maxRetries]);
      const failedBatches = result.rows;

      let successful = 0;
      let failed = 0;

      for (const batch of failedBatches) {
        try {
          const mintResult = await this.triggerMint(batch.id);
          if (mintResult.success) {
            successful++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`Failed to retry batch ${batch.id}:`, error);
          failed++;
        }
      }

      return {
        retried: failedBatches.length,
        successful,
        failed
      };

    } catch (error) {
      console.error('Error in retryFailedBatches:', error);
      return {
        retried: 0,
        successful: 0,
        failed: 0
      };
    }
  }

  /**
   * Utility: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}