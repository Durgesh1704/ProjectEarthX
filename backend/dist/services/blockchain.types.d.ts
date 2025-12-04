export interface BlockchainConfig {
    rpcUrl: string;
    privateKey: string;
    contractAddress: string;
    gasLimit: number;
    maxRetries: number;
    retryDelay: number;
    confirmations: number;
}
export interface MintRequest {
    batchId: string;
    collectorAddress: string;
    recyclerAddress: string;
    weightAmount: number;
    ipfsHash: string;
}
export interface MintResult {
    success: boolean;
    transactionHash?: string;
    blockNumber?: number;
    gasUsed?: string;
    error?: string;
    retryCount?: number;
}
export interface BatchMintStatus {
    batchId: string;
    mintStatus: 'PENDING_MINT' | 'MINTED' | 'FAILED_ON_CHAIN' | 'RETRYING';
    txHash?: string;
    blockNumber?: number;
    retryCount: number;
    lastAttempt?: Date;
    error?: string;
}
export declare const EARTHX_CONTRACT_ABI: string[];
export declare const BLOCKCHAIN_CONSTANTS: {
    readonly POLYGON_AMOY_CHAIN_ID: 80002;
    readonly GAS_LIMIT: 300000;
    readonly MAX_RETRIES: 3;
    readonly RETRY_DELAY: 5000;
    readonly CONFIRMATIONS: 2;
    readonly MINT_STATUS: {
        readonly PENDING_MINT: "PENDING_MINT";
        readonly MINTED: "MINTED";
        readonly FAILED_ON_CHAIN: "FAILED_ON_CHAIN";
        readonly RETRYING: "RETRYING";
    };
};
export declare class BlockchainError extends Error {
    code?: string | undefined;
    retryable: boolean;
    constructor(message: string, code?: string | undefined, retryable?: boolean);
}
export declare class NonceError extends BlockchainError {
    constructor(message: string);
}
export declare class GasError extends BlockchainError {
    constructor(message: string);
}
export declare class ContractError extends BlockchainError {
    constructor(message: string);
}
//# sourceMappingURL=blockchain.types.d.ts.map