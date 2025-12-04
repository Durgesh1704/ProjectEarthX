"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("../controllers/auth.controller");
const collection_controller_1 = require("../controllers/collection.controller");
const batch_controller_1 = require("../controllers/batch.controller");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const authController = new auth_controller_1.AuthController();
const collectionController = new collection_controller_1.CollectionController();
const batchController = new batch_controller_1.BatchController();
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/profile', auth_1.authenticateToken, authController.getProfile);
router.post('/collection/record', auth_1.authenticateToken, collectionController.recordCollection);
router.get('/collection/history', auth_1.authenticateToken, collectionController.getCollectionHistory);
router.post('/batch/verify', auth_1.authenticateToken, batchController.verifyBatch);
router.get('/batch/pending', auth_1.authenticateToken, batchController.getPendingBatches);
router.get('/batch/history', auth_1.authenticateToken, batchController.getVerificationHistory);
router.get('/batch/:batchId/mint-status', auth_1.authenticateToken, batchController.getBatchMintStatus);
router.post('/batch/:batchId/retry-mint', auth_1.authenticateToken, batchController.retryBatchMint);
router.get('/batch/contract-info', auth_1.authenticateToken, batchController.getContractInfo);
router.get('/health', (_req, res) => {
    res.json({ success: true, message: 'EARTHX Backend API is running' });
});
router.get('/', (_req, res) => {
    res.json({
        success: true,
        message: 'EARTHX Backend API',
        version: '1.0.0',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                profile: 'GET /api/auth/profile'
            },
            collection: {
                record: 'POST /api/collection/record',
                history: 'GET /api/collection/history'
            },
            batch: {
                verify: 'POST /api/batch/verify',
                pending: 'GET /api/batch/pending',
                history: 'GET /api/batch/history'
            },
            system: {
                health: 'GET /api/health'
            }
        }
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map