import express from 'express';
import { AuthController } from '../controllers/auth.controller';
import { CollectionController } from '../controllers/collection.controller';
import { BatchController } from '../controllers/batch.controller';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

const authController = new AuthController();
const collectionController = new CollectionController();
const batchController = new BatchController();

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/profile', authenticateToken, authController.getProfile);

router.post('/collection/record', authenticateToken, collectionController.recordCollection);
router.get('/collection/history', authenticateToken, collectionController.getCollectionHistory);

router.post('/batch/verify', authenticateToken, batchController.verifyBatch);
router.get('/batch/pending', authenticateToken, batchController.getPendingBatches);
router.get('/batch/history', authenticateToken, batchController.getVerificationHistory);
router.get('/batch/:batchId/mint-status', authenticateToken, batchController.getBatchMintStatus);
router.post('/batch/:batchId/retry-mint', authenticateToken, batchController.retryBatchMint);
router.get('/batch/contract-info', authenticateToken, batchController.getContractInfo);

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

export default router;
