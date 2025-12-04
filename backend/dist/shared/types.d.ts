export declare enum UserRole {
    CITIZEN = "citizen",
    COLLECTOR = "collector",
    RECYCLER = "recycler"
}
export declare enum VerificationStatus {
    PENDING = "pending",
    VERIFIED = "verified",
    REJECTED = "rejected"
}
export declare enum MintStatus {
    PENDING_MINT = "PENDING_MINT",
    MINTED = "MINTED",
    FAILED_ON_CHAIN = "FAILED_ON_CHAIN",
    RETRYING = "RETRYING"
}
export interface User {
    id: number;
    uuid: string;
    wallet_address?: string;
    email: string;
    username: string;
    full_name?: string;
    phone?: string;
    role: UserRole;
    eiu_balance: number;
    is_active: boolean;
    email_verified: boolean;
    profile_image_url?: string;
    location_lat?: number;
    location_lng?: number;
    address?: string;
    created_at: Date;
    updated_at: Date;
}
export interface Transaction {
    id: number;
    uuid: string;
    transaction_hash?: string;
    citizen_id: number;
    collector_id: number;
    weight_grams: number;
    eiu_earned: number;
    eiu_fee: number;
    transaction_type: string;
    status: string;
    polygon_block_number?: number;
    polygon_transaction_index?: number;
    gas_used?: number;
    gas_price?: number;
    notes?: string;
    created_at: Date;
    updated_at: Date;
}
export interface Batch {
    id: number;
    uuid: string;
    collector_id: number;
    recycler_id?: number;
    batch_name: string;
    total_weight_grams: number;
    verification_status: VerificationStatus;
    ipfs_proof_hash?: string;
    ipfs_proof_url?: string;
    proof_type?: string;
    verification_notes?: string;
    verified_at?: Date;
    verified_by?: number;
    rejection_reason?: string;
    weight_difference_percentage?: number;
    blockchain_batch_id?: string;
    polygon_block_number?: number;
    mint_status: MintStatus;
    tx_hash?: string;
    block_number?: number;
    retry_count: number;
    last_attempt?: Date;
    mint_error?: string;
    created_at: Date;
    updated_at: Date;
}
//# sourceMappingURL=types.d.ts.map