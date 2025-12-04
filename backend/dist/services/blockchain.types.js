"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractError = exports.GasError = exports.NonceError = exports.BlockchainError = exports.BLOCKCHAIN_CONSTANTS = exports.EARTHX_CONTRACT_ABI = void 0;
exports.EARTHX_CONTRACT_ABI = [
    "function mintBatch(address collector, address recycler, uint256 weightAmount, string memory ipfsHash) external",
    "function getBatchInfo(string memory batchId) external view returns (address collector, address recycler, uint256 weightAmount, string memory ipfsHash, uint256 timestamp, bool minted)",
    "function totalMinted() external view returns (uint256)",
    "event BatchMinted(string indexed batchId, address indexed collector, address indexed recycler, uint256 weightAmount, string ipfsHash, uint256 timestamp)",
    "event MintFailed(string indexed batchId, string reason)"
];
exports.BLOCKCHAIN_CONSTANTS = {
    POLYGON_AMOY_CHAIN_ID: 80002,
    GAS_LIMIT: 300000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 5000,
    CONFIRMATIONS: 2,
    MINT_STATUS: {
        PENDING_MINT: 'PENDING_MINT',
        MINTED: 'MINTED',
        FAILED_ON_CHAIN: 'FAILED_ON_CHAIN',
        RETRYING: 'RETRYING'
    }
};
class BlockchainError extends Error {
    constructor(message, code, retryable = true) {
        super(message);
        this.code = code;
        this.retryable = retryable;
        this.name = 'BlockchainError';
    }
}
exports.BlockchainError = BlockchainError;
class NonceError extends BlockchainError {
    constructor(message) {
        super(message, 'NONCE_ERROR', true);
        this.name = 'NonceError';
    }
}
exports.NonceError = NonceError;
class GasError extends BlockchainError {
    constructor(message) {
        super(message, 'GAS_ERROR', true);
        this.name = 'GasError';
    }
}
exports.GasError = GasError;
class ContractError extends BlockchainError {
    constructor(message) {
        super(message, 'CONTRACT_ERROR', false);
        this.name = 'ContractError';
    }
}
exports.ContractError = ContractError;
//# sourceMappingURL=blockchain.types.js.map