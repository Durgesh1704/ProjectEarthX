"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainService = void 0;
const ethers_1 = require("ethers");
const database_1 = require("../config/database");
const blockchain_types_1 = require("./blockchain.types");
class BlockchainService {
    constructor() {
        this.initialized = false;
        this.config = {
            rpcUrl: process.env.POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology',
            privateKey: process.env.POLYGON_PRIVATE_KEY || '',
            contractAddress: process.env.POLYGON_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
            gasLimit: blockchain_types_1.BLOCKCHAIN_CONSTANTS.GAS_LIMIT,
            maxRetries: blockchain_types_1.BLOCKCHAIN_CONSTANTS.MAX_RETRIES,
            retryDelay: blockchain_types_1.BLOCKCHAIN_CONSTANTS.RETRY_DELAY,
            confirmations: blockchain_types_1.BLOCKCHAIN_CONSTANTS.CONFIRMATIONS
        };
        if (this.config.privateKey && this.config.privateKey.length > 10) {
            try {
                this.initializeProvider();
                this.initialized = true;
            }
            catch (error) {
                console.warn('Blockchain service not initialized - missing configuration');
            }
        }
        else {
            console.warn('Blockchain service not initialized - missing POLYGON_PRIVATE_KEY environment variable');
        }
    }
    initializeProvider() {
        try {
            this.provider = new ethers_1.ethers.JsonRpcProvider(this.config.rpcUrl);
            this.wallet = new ethers_1.ethers.Wallet(this.config.privateKey, this.provider);
            this.contract = new ethers_1.ethers.Contract(this.config.contractAddress, blockchain_types_1.EARTHX_CONTRACT_ABI, this.wallet);
            console.log('Blockchain service initialized successfully');
            console.log('Wallet address:', this.wallet.address);
            console.log('Contract address:', this.config.contractAddress);
        }
        catch (error) {
            console.error('Failed to initialize blockchain service:', error);
            throw new blockchain_types_1.BlockchainError('Failed to initialize blockchain provider', 'INIT_ERROR', false);
        }
    }
    async triggerMint(batchId) {
        if (!this.initialized) {
            return {
                success: false,
                error: 'Blockchain service not initialized. Please configure POLYGON_PRIVATE_KEY environment variable.'
            };
        }
        let retryCount = 0;
        let lastError = null;
        console.log(`Starting mint process for batch ${batchId}`);
        const batch = await this.getBatchForMinting(batchId);
        if (!batch) {
            return {
                success: false,
                error: 'Batch not found or not in APPROVED status'
            };
        }
        const addresses = await this.getUserAddresses(batch.collector_id, batch.recycler_id);
        if (!addresses.success) {
            return {
                success: false,
                error: addresses.error
            };
        }
        await this.updateBatchMintStatus(batchId, {
            mintStatus: 'PENDING_MINT',
            retryCount: 0,
            lastAttempt: new Date()
        });
        while (retryCount < this.config.maxRetries) {
            try {
                console.log(`Attempt ${retryCount + 1}/${this.config.maxRetries} for batch ${batchId}`);
                const result = await this.executeMintTransaction({
                    batchId,
                    collectorAddress: addresses.collectorAddress,
                    recyclerAddress: addresses.recyclerAddress,
                    weightAmount: batch.total_weight_grams,
                    ipfsHash: batch.ipfs_proof_hash
                });
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
            }
            catch (error) {
                lastError = error;
                retryCount++;
                console.error(`Attempt ${retryCount} failed for batch ${batchId}:`, error);
                if (error instanceof blockchain_types_1.BlockchainError && !error.retryable) {
                    break;
                }
                await this.updateBatchMintStatus(batchId, {
                    mintStatus: 'RETRYING',
                    retryCount,
                    lastAttempt: new Date(),
                    error: lastError.message
                });
                if (retryCount < this.config.maxRetries) {
                    const delay = this.config.retryDelay * Math.pow(2, retryCount - 1);
                    console.log(`Waiting ${delay}ms before retry...`);
                    await this.sleep(delay);
                }
            }
        }
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
    async executeMintTransaction(request) {
        try {
            const nonce = await this.wallet.getNonce();
            const gasEstimate = await this.contract.mintBatch.estimateGas(request.collectorAddress, request.recyclerAddress, ethers_1.ethers.parseEther(request.weightAmount.toString()), request.ipfsHash);
            const gasLimit = Math.floor(Number(gasEstimate) * 1.2);
            console.log(`Executing mint transaction with nonce ${nonce}, gas limit ${gasLimit}`);
            const tx = await this.contract.mintBatch(request.collectorAddress, request.recyclerAddress, ethers_1.ethers.parseEther(request.weightAmount.toString()), request.ipfsHash, {
                nonce,
                gasLimit,
                gasPrice: await this.provider.getFeeData()
            });
            console.log(`Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait(this.config.confirmations);
            if (!receipt) {
                throw new blockchain_types_1.BlockchainError('Transaction receipt not received', 'NO_RECEIPT');
            }
            console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            };
        }
        catch (error) {
            if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
                throw new blockchain_types_1.GasError('Gas estimation failed. Transaction may revert.');
            }
            else if (error.code === 'NONCE_EXPIRED' || error.code === 'NONCE_TOO_LOW') {
                throw new blockchain_types_1.NonceError(`Nonce error: ${error.message}`);
            }
            else if (error.message.includes('revert')) {
                throw new blockchain_types_1.ContractError(`Contract revert: ${error.message}`);
            }
            else if (error.message.includes('insufficient funds')) {
                throw new blockchain_types_1.BlockchainError('Insufficient funds for gas', 'INSUFFICIENT_FUNDS', false);
            }
            else {
                throw new blockchain_types_1.BlockchainError(`Transaction failed: ${error.message}`, 'TRANSACTION_ERROR');
            }
        }
    }
    async getBatchForMinting(batchId) {
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
            const result = await database_1.db.query(query, [batchId]);
            return result.rows.length > 0 ? result.rows[0] : null;
        }
        catch (error) {
            console.error('Error in getBatchForMinting:', error);
            return null;
        }
    }
    async getUserAddresses(collectorId, recyclerId) {
        try {
            const query = `
        SELECT id, wallet_address, role
        FROM users 
        WHERE id IN ($1, $2) AND wallet_address IS NOT NULL
      `;
            const result = await database_1.db.query(query, [collectorId, recyclerId]);
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
        }
        catch (error) {
            console.error('Error in getUserAddresses:', error);
            return {
                success: false,
                error: 'Database error while fetching wallet addresses'
            };
        }
    }
    async updateBatchMintStatus(batchId, status) {
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
            await database_1.db.query(query, [
                status.mintStatus,
                status.txHash || null,
                status.blockNumber || null,
                status.retryCount || 0,
                status.lastAttempt || null,
                status.error || null,
                batchId
            ]);
        }
        catch (error) {
            console.error('Error in updateBatchMintStatus:', error);
            throw error;
        }
    }
    async getTransactionStatus(txHash) {
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
        }
        catch (error) {
            console.error('Error in getTransactionStatus:', error);
            return {
                confirmed: false,
                error: error.message
            };
        }
    }
    async getContractInfo() {
        try {
            const chainId = await this.provider.getNetwork();
            let totalMinted;
            try {
                totalMinted = await this.contract.totalMinted();
            }
            catch (error) {
                console.warn('Could not fetch totalMinted:', error);
            }
            return {
                address: this.config.contractAddress,
                chainId: Number(chainId.chainId),
                totalMinted: totalMinted?.toString()
            };
        }
        catch (error) {
            console.error('Error in getContractInfo:', error);
            return {
                address: this.config.contractAddress,
                chainId: 0
            };
        }
    }
    async retryFailedBatches() {
        try {
            const query = `
        SELECT id 
        FROM batches 
        WHERE mint_status = 'FAILED_ON_CHAIN' 
          AND retry_count < $1
          AND (last_attempt IS NULL OR last_attempt < NOW() - INTERVAL '1 hour')
        ORDER BY created_at ASC
        LIMIT 10
      `;
            const result = await database_1.db.query(query, [this.config.maxRetries]);
            const failedBatches = result.rows;
            let successful = 0;
            let failed = 0;
            for (const batch of failedBatches) {
                try {
                    const mintResult = await this.triggerMint(batch.id);
                    if (mintResult.success) {
                        successful++;
                    }
                    else {
                        failed++;
                    }
                }
                catch (error) {
                    console.error(`Failed to retry batch ${batch.id}:`, error);
                    failed++;
                }
            }
            return {
                retried: failedBatches.length,
                successful,
                failed
            };
        }
        catch (error) {
            console.error('Error in retryFailedBatches:', error);
            return {
                retried: 0,
                successful: 0,
                failed: 0
            };
        }
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.BlockchainService = BlockchainService;
//# sourceMappingURL=blockchain.service.js.map