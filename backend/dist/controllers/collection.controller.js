"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionController = void 0;
const types_1 = require("./types");
const collection_service_1 = require("../services/collection.service");
const types_2 = require("../shared/types");
class CollectionController {
    constructor() {
        this.recordCollection = async (req, res) => {
            try {
                if (!req.user || req.user.role !== types_2.UserRole.COLLECTOR) {
                    res.status(403).json({
                        success: false,
                        error: 'Access denied. Only COLLECTOR role can record collections.'
                    });
                    return;
                }
                const { citizen_id, weight_grams, notes } = req.body;
                const validation = this.validateCollectionRequest({ citizen_id, weight_grams, notes });
                if (!validation.isValid) {
                    res.status(400).json({
                        success: false,
                        error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`
                    });
                    return;
                }
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
                    });
                    return;
                }
                res.status(201).json({
                    success: true,
                    data: result.data
                });
            }
            catch (error) {
                console.error('Error in recordCollection:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error while recording collection.'
                });
            }
        };
        this.getCollectionHistory = async (req, res) => {
            try {
                if (!req.user || req.user.role !== types_2.UserRole.COLLECTOR) {
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
                    status: status
                });
                res.json({
                    success: true,
                    data: result
                });
            }
            catch (error) {
                console.error('Error in getCollectionHistory:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error while fetching collection history.'
                });
            }
        };
        this.collectionService = new collection_service_1.CollectionService();
    }
    validateCollectionRequest(data) {
        const errors = [];
        if (!data.citizen_id || typeof data.citizen_id !== 'number' || data.citizen_id <= 0) {
            errors.push({
                field: 'citizen_id',
                message: 'Valid citizen_id is required and must be a positive number.'
            });
        }
        if (!data.weight_grams || typeof data.weight_grams !== 'number') {
            errors.push({
                field: 'weight_grams',
                message: 'weight_grams is required and must be a number.'
            });
        }
        else if (data.weight_grams < types_1.COLLECTION_LIMITS.MIN_WEIGHT_GRAMS) {
            errors.push({
                field: 'weight_grams',
                message: `Minimum weight is ${types_1.COLLECTION_LIMITS.MIN_WEIGHT_GRAMS} grams.`
            });
        }
        else if (data.weight_grams > types_1.COLLECTION_LIMITS.MAX_WEIGHT_GRAMS) {
            errors.push({
                field: 'weight_grams',
                message: `Maximum weight per transaction is ${types_1.COLLECTION_LIMITS.MAX_WEIGHT_GRAMS} grams (${types_1.COLLECTION_LIMITS.MAX_WEIGHT_GRAMS / 1000}kg).`
            });
        }
        else if (data.weight_grams % 1 !== 0) {
            errors.push({
                field: 'weight_grams',
                message: 'weight_grams must be a whole number (no decimal points).'
            });
        }
        if (data.notes && typeof data.notes !== 'string') {
            errors.push({
                field: 'notes',
                message: 'notes must be a string if provided.'
            });
        }
        else if (data.notes && data.notes.length > 500) {
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
exports.CollectionController = CollectionController;
//# sourceMappingURL=collection.controller.js.map