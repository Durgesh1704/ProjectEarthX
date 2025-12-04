import { MintResult } from './blockchain.types';
export declare class BlockchainService {
    private provider;
    private wallet;
    private contract;
    private config;
    private initialized;
    constructor();
    private initializeProvider;
    triggerMint(batchId: string): Promise<MintResult>;
    private executeMintTransaction;
    private getBatchForMinting;
    private getUserAddresses;
    private updateBatchMintStatus;
    getTransactionStatus(txHash: string): Promise<{
        confirmed: boolean;
        blockNumber?: number;
        gasUsed?: string;
        error?: string;
    }>;
    getContractInfo(): Promise<{
        address: string;
        chainId: number;
        totalMinted?: string;
    }>;
    retryFailedBatches(): Promise<{
        retried: number;
        successful: number;
        failed: number;
    }>;
    private sleep;
}
//# sourceMappingURL=blockchain.service.d.ts.map