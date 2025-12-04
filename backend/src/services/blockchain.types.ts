// Blockchain Configuration Types
export interface BlockchainConfig {
  rpcUrl: string;
  privateKey: string;
  contractAddress: string;
  gasLimit: number;
  maxRetries: number;
  retryDelay: number;
  confirmations: number;
}

// Mint Transaction Types
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

// Smart Contract ABI (minimal for our needs)
export const EARTHX_CONTRACT_ABI = [
  // Mint function
  "function mintBatch(address collector, address recycler, uint256 weightAmount, string memory ipfsHash) external",
  
  // View functions
  "function getBatchInfo(string memory batchId) external view returns (address collector, address recycler, uint256 weightAmount, string memory ipfsHash, uint256 timestamp, bool minted)",
  "function totalMinted() external view returns (uint256)",
  
  // Events
  "event BatchMinted(string indexed batchId, address indexed collector, address indexed recycler, uint256 weightAmount, string ipfsHash, uint256 timestamp)",
  "event MintFailed(string indexed batchId, string reason)"
];

// Blockchain Constants
export const BLOCKCHAIN_CONSTANTS = {
  POLYGON_AMOY_CHAIN_ID: 80002,
  GAS_LIMIT: 300000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000, // 5 seconds
  CONFIRMATIONS: 2,
  MINT_STATUS: {
    PENDING_MINT: 'PENDING_MINT',
    MINTED: 'MINTED',
    FAILED_ON_CHAIN: 'FAILED_ON_CHAIN',
    RETRYING: 'RETRYING'
  }
} as const;

// Error Types
export class BlockchainError extends Error {
  constructor(
    message: string,
    public code?: string,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'BlockchainError';
  }
}

export class NonceError extends BlockchainError {
  constructor(message: string) {
    super(message, 'NONCE_ERROR', true);
    this.name = 'NonceError';
  }
}

export class GasError extends BlockchainError {
  constructor(message: string) {
    super(message, 'GAS_ERROR', true);
    this.name = 'GasError';
  }
}

export class ContractError extends BlockchainError {
  constructor(message: string) {
    super(message, 'CONTRACT_ERROR', false);
    this.name = 'ContractError';
  }
}