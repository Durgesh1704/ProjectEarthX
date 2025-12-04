# EARTHX Blockchain Integration API

## New Blockchain Endpoints

### 1. Batch Mint Status
- **Endpoint**: `GET /api/batch/:batchId/mint-status`
- **Access**: COLLECTOR, RECYCLER roles
- **Response**:
```json
{
  "success": true,
  "data": {
    "batch_id": 123,
    "mint_status": "MINTED",
    "tx_hash": "0x...",
    "block_number": 12345678,
    "retry_count": 0,
    "last_attempt": "2024-01-01T12:00:00Z",
    "mint_error": null,
    "blockchain_status": {
      "confirmed": true,
      "blockNumber": 12345678,
      "gasUsed": "150000"
    }
  }
}
```

### 2. Retry Batch Mint
- **Endpoint**: `POST /api/batch/:batchId/retry-mint`
- **Access**: RECYCLER role only (for batches they verified)
- **Response**:
```json
{
  "success": true,
  "data": {
    "batch_id": 123,
    "mint_result": {
      "success": true,
      "transactionHash": "0x...",
      "blockNumber": 12345678,
      "retryCount": 1
    }
  }
}
```

### 3. Contract Info
- **Endpoint**: `GET /api/batch/contract-info`
- **Access**: Any authenticated user
- **Response**:
```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "chainId": 80002,
    "totalMinted": "1500000"
  }
}
```

## Updated Verification Endpoint

### Batch Verification (Updated)
- **Endpoint**: `POST /api/batch/verify`
- **Enhanced Response**: Now includes mint_result for approved batches
```json
{
  "success": true,
  "data": {
    "batch": {...},
    "verification_result": {...},
    "mint_result": {
      "status": "INITIATED",
      "message": "Minting process initiated. Check batch status for updates."
    }
  }
}
```

## Blockchain Integration Flow

### 1. Automatic Mint Trigger
When a batch is **APPROVED** (within 5% tolerance):
1. ✅ Batch verification completes
2. 🚀 **Automatic mint trigger** (asynchronous)
3. 📊 Status updates: `PENDING_MINT` → `MINTED` / `FAILED_ON_CHAIN`
4. 🔗 Transaction hash and block number saved

### 2. Retry Mechanism
Failed mints are automatically retried:
- **Max Retries**: 3 attempts
- **Exponential Backoff**: 5s, 10s, 20s delays
- **Nonce Management**: Automatic nonce handling
- **Error Classification**: Retryable vs non-retryable errors

### 3. Smart Contract Integration
- **Contract**: `mintBatch(address collector, address recycler, uint256 weightAmount, string memory ipfsHash)`
- **Network**: Polygon Amoy Testnet (Chain ID: 80002)
- **Gas Management**: 20% buffer on estimates
- **Confirmations**: 2 blocks required

## Database Schema Updates

### New Batches Table Fields
```sql
-- Blockchain minting fields
mint_status mint_status DEFAULT 'PENDING_MINT',
tx_hash VARCHAR(66), -- Polygon transaction hash for mint
block_number BIGINT, -- Block number where mint was confirmed
retry_count INTEGER DEFAULT 0, -- Number of mint retries
last_attempt TIMESTAMP WITH TIME ZONE, -- Last mint attempt timestamp
mint_error TEXT, -- Error message if mint failed
weight_difference_percentage DECIMAL(5, 2), -- Weight verification difference
```

### New Enums
```sql
CREATE TYPE mint_status AS ENUM ('PENDING_MINT', 'MINTED', 'FAILED_ON_CHAIN', 'RETRYING');
```

## Error Handling

### Retryable Errors
- Network congestion
- Gas price fluctuations
- Temporary RPC issues
- Nonce conflicts

### Non-Retryable Errors
- Contract reverts
- Insufficient funds
- Invalid addresses
- Contract not deployed

## Monitoring & Analytics

### Batch Status Tracking
- Real-time mint status updates
- Transaction confirmation monitoring
- Retry attempt logging
- Error categorization

### Performance Metrics
- Average mint confirmation time
- Success rate by batch size
- Gas usage statistics
- Network congestion impact

## Security Features

### Access Control
- Role-based endpoint protection
- Batch ownership verification
- Wallet address validation

### Data Integrity
- Atomic database updates
- Transaction hash verification
- Block number confirmation
- Audit trail maintenance

## Configuration

### Environment Variables
```bash
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
POLYGON_PRIVATE_KEY=your_private_key_here
POLYGON_CONTRACT_ADDRESS=0x...your_contract_address
```

### Constants
```typescript
GAS_LIMIT: 300000
MAX_RETRIES: 3
RETRY_DELAY: 5000ms (exponential backoff)
CONFIRMATIONS: 2 blocks
```