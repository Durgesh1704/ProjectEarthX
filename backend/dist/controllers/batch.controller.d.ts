import { Response } from 'express';
import { AuthenticatedRequest } from './types';
export declare class BatchController {
    private verificationService;
    private batchService;
    private blockchainService;
    constructor();
    verifyBatch: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getPendingBatches: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getVerificationHistory: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getBatchMintStatus: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    retryBatchMint: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getContractInfo: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    private validateVerifyBatchRequest;
    private generateBlockchainBatchId;
    private triggerMintAsync;
}
//# sourceMappingURL=batch.controller.d.ts.map