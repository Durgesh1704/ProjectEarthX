import { Response } from 'express';
import { AuthenticatedRequest } from './types';
export declare class CollectionController {
    private collectionService;
    constructor();
    recordCollection: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getCollectionHistory: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    private validateCollectionRequest;
}
//# sourceMappingURL=collection.controller.d.ts.map