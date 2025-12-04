# EARTHX Backend API Endpoints

## Collection Controller (COLLECTOR Role Only)

### Record Collection
- **Endpoint**: `POST /api/collection/record`
- **Access**: COLLECTOR role only
- **Request Body**:
```json
{
  "citizen_id": 123,
  "weight_grams": 1500,
  "notes": "Plastic bottles from residential area"
}
```
- **Validation**:
  - `weight_grams`: Must be between 10g - 50,000g (50kg)
  - `citizen_id`: Must be valid citizen user
  - Whole numbers only (no decimals)
- **Response**:
```json
{
  "success": true,
  "data": {
    "transaction": {...},
    "eiu_earned": 150.0,
    "message": "Successfully recorded 1500g collection. 150.0 EIU earned (pending verification)."
  }
}
```

### Get Collection History
- **Endpoint**: `GET /api/collection/history?page=1&limit=20&status=PENDING_BATCH`
- **Access**: COLLECTOR role only
- **Query Params**: `page`, `limit`, `status` (optional)

---

## Batch Controller (RECYCLER Role Only)

### Verify Batch
- **Endpoint**: `POST /api/batch/verify`
- **Access**: RECYCLER role only
- **Request Body**:
```json
{
  "batch_id": 456,
  "verified_weight_total": 15000,
  "ipfs_proof_hash": "QmXxx...xxx",
  "proof_type": "photo",
  "verification_notes": "Weight verified with calibrated scale"
}
```
- **Critical Logic**:
  - Compares sum of transaction weights vs verified weight
  - **5% Tolerance Rule**: If difference > 5% → FLAGGED
  - **20% Threshold**: If difference > 20% → REJECTED
  - **Success**: If within 5% → APPROVED + READY_TO_MINT
- **Response**:
```json
{
  "success": true,
  "data": {
    "batch": {...},
    "verification_result": {
      "status": "APPROVED",
      "weight_difference_percentage": 2.5,
      "original_weight": 15000,
      "verified_weight": 14750,
      "message": "Batch verification PASSED. Weight difference: 2.50% (within 5% tolerance)."
    }
  }
}
```

### Get Pending Batches
- **Endpoint**: `GET /api/batch/pending?page=1&limit=20`
- **Access**: RECYCLER role only

### Get Verification History
- **Endpoint**: `GET /api/batch/history?page=1&limit=20&status=verified`
- **Access**: RECYCLER role only

---

## Core Business Logic Flow

### 1. Collection Flow (COLLECTOR)
1. Collector scans citizen's QR code or enters citizen_id
2. Collector inputs plastic weight (10g - 50kg limit)
3. System validates weight and citizen
4. Transaction created with status `PENDING_BATCH`
5. Citizen receives EIU (pending verification)
6. Transaction added to batch queue

### 2. Verification Flow (RECYCLER)
1. Recycler selects pending batch
2. Recycler weighs bulk plastic and uploads IPFS proof
3. **Anti-Fraud Check**: Compare original vs verified weight
4. **Decision Logic**:
   - ✅ **≤5% difference** → APPROVED → Ready for minting
   - ⚠️ **5-20% difference** → FLAGGED → Manual review required
   - ❌ **>20% difference** → REJECTED → Investigation needed
5. Batch status updated and audit trail created

### 3. Advanced Fraud Detection
The system automatically flags suspicious patterns:
- High concentration of small transactions (<100g)
- Identical weight values across transactions
- Multiple transactions from same citizen in one batch
- Unusually high average weight per transaction
- All transactions recorded within very short time span

### 4. EIU Distribution
- **Base Rate**: 1 gram = 0.1 EIU
- **Distribution**: 85% Citizen, 10% Collector, 5% Recycler
- **Volume Bonus**: Up to 5% extra for large batches
- **Rewards are pending until batch verification is approved**

---

## Database Schema References

### Key Tables
- **users**: Role-based access (citizen, collector, recycler)
- **transactions**: Individual collection records
- **batches**: Bulk verification with IPFS proof
- **audit_log**: Complete audit trail for compliance

### Status Flow
```
Transaction: PENDING_BATCH → CONFIRMED (after batch approval)
Batch: pending → verified/flagged/rejected → READY_TO_MINT
```

---

## Security & Validation

### Input Validation
- Weight limits: 10g minimum, 50kg maximum per transaction
- Whole numbers only for weight measurements
- IPFS hash validation (46-64 characters)
- Role-based access control on all endpoints

### Anti-Fraud Measures
- 5% tolerance threshold for weight discrepancies
- 20% rejection threshold for extreme differences
- Pattern detection for automated fraud
- Complete audit trail for all verifications
- Suspicious activity logging and risk scoring