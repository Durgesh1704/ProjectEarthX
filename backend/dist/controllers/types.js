"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BATCH_STATUS = exports.COLLECTION_LIMITS = void 0;
exports.COLLECTION_LIMITS = {
    MIN_WEIGHT_GRAMS: 10,
    MAX_WEIGHT_GRAMS: 50000,
    TOLERANCE_PERCENTAGE: 5,
};
exports.BATCH_STATUS = {
    PENDING: 'PENDING_BATCH',
    FLAGGED: 'FLAGGED',
    APPROVED: 'APPROVED',
    READY_TO_MINT: 'READY_TO_MINT',
    REJECTED: 'REJECTED',
};
//# sourceMappingURL=types.js.map