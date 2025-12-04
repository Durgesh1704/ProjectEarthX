import { Response } from 'express';
import { AuthenticatedRequest, RecordCollectionRequest, RecordCollectionResponse, COLLECTION_LIMITS } from './types';
import { CollectionService } from '../services/collection.service';
import { UserRole } from '../../../shared/types';

export class CollectionController {
  private collectionService: CollectionService;

  constructor() {
    this.collectionService = new CollectionService();
  }

  /**
   * Record a new plastic collection transaction
   * POST /api/collection/record
   * Access: COLLECTOR role only
   */
  public recordCollection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Validate user role
      if (!req.user || req.user.role !== UserRole.COLLECTOR) {
        res.status(403).json({
          success: false,
          error: 'Access denied. Only COLLECTOR role can record collections.'
        } as RecordCollectionResponse);
        return;
      }

      const { citizen_id, weight_grams, notes }: RecordCollectionRequest = req.body;

      // Validate request body
      const validation = this.validateCollectionRequest({ citizen_id, weight_grams, notes });
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        } as RecordCollectionResponse);
        return;
      }

      // Record the collection
      const result = await this.collectionService.recordCollection({
        citizen_id,
        weight_grams,
        notes,
        collector_id: req.user.id
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        } as RecordCollectionResponse);
        return;
      }

      res.status(201).json({
        success: true,
        data: result.data
      } as RecordCollectionResponse);

    } catch (error) {
      console.error('Error in recordCollection:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while recording collection.'
      } as RecordCollectionResponse);
    }
  };

  /**
   * Get all collections for the authenticated collector
   * GET /api/collection/history
   * Access: COLLECTOR role only
   */
  public getCollectionHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== UserRole.COLLECTOR) {
        res.status(403).json({
          success: false,
          error: 'Access denied. Only COLLECTOR role can view collection history.'
        });
        return;
      }

      const { page = 1, limit = 20, status } = req.query;
      
      const result = await this.collectionService.getCollectorCollections({
        collector_id: req.user.id,
        page: Number(page),
        limit: Number(limit),
        status: status as string
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error in getCollectionHistory:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching collection history.'
      });
    }
  };

  /**
   * Validate collection request data
   */
  private validateCollectionRequest(data: RecordCollectionRequest): { isValid: boolean; errors: any[] } {
    const errors: any[] = [];

    // Validate citizen_id
    if (!data.citizen_id || typeof data.citizen_id !== 'number' || data.citizen_id <= 0) {
      errors.push({
        field: 'citizen_id',
        message: 'Valid citizen_id is required and must be a positive number.'
      });
    }

    // Validate weight_grams
    if (!data.weight_grams || typeof data.weight_grams !== 'number') {
      errors.push({
        field: 'weight_grams',
        message: 'weight_grams is required and must be a number.'
      });
    } else if (data.weight_grams < COLLECTION_LIMITS.MIN_WEIGHT_GRAMS) {
      errors.push({
        field: 'weight_grams',
        message: `Minimum weight is ${COLLECTION_LIMITS.MIN_WEIGHT_GRAMS} grams.`
      });
    } else if (data.weight_grams > COLLECTION_LIMITS.MAX_WEIGHT_GRAMS) {
      errors.push({
        field: 'weight_grams',
        message: `Maximum weight per transaction is ${COLLECTION_LIMITS.MAX_WEIGHT_GRAMS} grams (${COLLECTION_LIMITS.MAX_WEIGHT_GRAMS / 1000}kg).`
      });
    } else if (data.weight_grams % 1 !== 0) {
      errors.push({
        field: 'weight_grams',
        message: 'weight_grams must be a whole number (no decimal points).'
      });
    }

    // Validate notes (optional)
    if (data.notes && typeof data.notes !== 'string') {
      errors.push({
        field: 'notes',
        message: 'notes must be a string if provided.'
      });
    } else if (data.notes && data.notes.length > 500) {
      errors.push({
        field: 'notes',
        message: 'notes must be less than 500 characters.'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}