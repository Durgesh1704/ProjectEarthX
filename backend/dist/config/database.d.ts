import { Pool } from 'pg';
declare const pool: Pool;
export declare const db: {
    query: (text: string, params?: any[]) => Promise<import("pg").QueryResult<any>>;
    getClient: () => Promise<import("pg").PoolClient>;
};
export default pool;
//# sourceMappingURL=database.d.ts.map