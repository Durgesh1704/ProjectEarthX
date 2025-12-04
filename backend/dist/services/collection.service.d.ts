import { Transaction } from '../shared/types';
interface RecordCollectionParams {
    citizen_id: number;
    weight_grams: number;
    notes?: string;
    collector_id: number;
}
interface GetCollectorCollectionsParams {
    collector_id: number;
    page: number;
    limit: number;
    status?: string;
}
export declare class CollectionService {
    recordCollection(params: RecordCollectionParams): Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }>;
    getCollectorCollections(params: GetCollectorCollectionsParams): Promise<{
        transactions: Transaction[];
        totalCount: number;
        currentPage: number;
        totalPages: number;
    }>;
    getCollectorStats(collector_id: number): Promise<{
        totalCollections: number;
        totalWeightCollected: number;
        totalEIUFees: number;
        pendingBatches: number;
        averageTransactionWeight: number;
    }>;
}
export {};
//# sourceMappingURL=collection.service.d.ts.map