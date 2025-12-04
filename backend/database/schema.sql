-- EARTHX Plastic Recycling dApp Database Schema
-- PostgreSQL Schema for Users, Transactions, and BatchLogs

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create User Roles Enum
CREATE TYPE user_role AS ENUM ('citizen', 'collector', 'recycler');

-- Create Recycler Verification Status Enum
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');

-- Create Mint Status Enum
CREATE TYPE mint_status AS ENUM ('PENDING_MINT', 'MINTED', 'FAILED_ON_CHAIN', 'RETRYING');

-- Create Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) UNIQUE, -- Polygon wallet address
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    role user_role NOT NULL,
    eiu_balance DECIMAL(20, 8) DEFAULT 0, -- Earth Impact Units balance
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    profile_image_url VARCHAR(500),
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Transactions Table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    transaction_hash VARCHAR(66) UNIQUE, -- Polygon transaction hash
    citizen_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    collector_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weight_grams DECIMAL(10, 2) NOT NULL, -- Weight of plastic in grams
    eiu_earned DECIMAL(20, 8) NOT NULL, -- EIU points earned by citizen
    eiu_fee DECIMAL(20, 8) DEFAULT 0, -- Fee taken by collector
    transaction_type VARCHAR(20) DEFAULT 'collection', -- collection, redemption, etc.
    status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, failed
    polygon_block_number BIGINT,
    polygon_transaction_index INTEGER,
    gas_used BIGINT,
    gas_price DECIMAL(20, 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Batches Table (for Recycler verification)
CREATE TABLE batches (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    collector_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recycler_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- NULL until assigned
    batch_name VARCHAR(100) NOT NULL,
    total_weight_grams DECIMAL(10, 2) NOT NULL, -- Total weight in this batch
    verification_status verification_status DEFAULT 'pending',
    ipfs_proof_hash VARCHAR(64), -- IPFS hash for photo/video proof
    ipfs_proof_url VARCHAR(500), -- Complete IPFS URL
    proof_type VARCHAR(20), -- photo, video, document
    verification_notes TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by INTEGER REFERENCES users(id), -- Admin/supervisor who verified
    rejection_reason TEXT,
    weight_difference_percentage DECIMAL(5, 2), -- Difference between original and verified weight
    blockchain_batch_id VARCHAR(66), -- Reference to blockchain batch
    polygon_block_number BIGINT,
    
    -- Blockchain minting fields
    mint_status mint_status DEFAULT 'PENDING_MINT',
    tx_hash VARCHAR(66), -- Polygon transaction hash for mint
    block_number BIGINT, -- Block number where mint was confirmed
    retry_count INTEGER DEFAULT 0, -- Number of mint retries
    last_attempt TIMESTAMP WITH TIME ZONE, -- Last mint attempt timestamp
    mint_error TEXT, -- Error message if mint failed
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Transaction_Batch junction table (many-to-many relationship)
CREATE TABLE transaction_batch (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(transaction_id, batch_id)
);

-- Create User_Sessions Table for JWT token management
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info TEXT,
    ip_address INET,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Audit_Log Table for tracking important actions
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_username ON users(username);

CREATE INDEX idx_transactions_citizen_id ON transactions(citizen_id);
CREATE INDEX idx_transactions_collector_id ON transactions(collector_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_transaction_hash ON transactions(transaction_hash);

CREATE INDEX idx_batches_collector_id ON batches(collector_id);
CREATE INDEX idx_batches_recycler_id ON batches(recycler_id);
CREATE INDEX idx_batches_verification_status ON batches(verification_status);
CREATE INDEX idx_batches_mint_status ON batches(mint_status);
CREATE INDEX idx_batches_created_at ON batches(created_at);
CREATE INDEX idx_batches_ipfs_hash ON batches(ipfs_proof_hash);
CREATE INDEX idx_batches_tx_hash ON batches(tx_hash);
CREATE INDEX idx_batches_blockchain_batch_id ON batches(blockchain_batch_id);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Create Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create Views for common queries
CREATE VIEW citizen_transactions AS
SELECT 
    t.*,
    c.username as citizen_username,
    c.full_name as citizen_full_name,
    col.username as collector_username,
    col.full_name as collector_full_name
FROM transactions t
JOIN users c ON t.citizen_id = c.id
JOIN users col ON t.collector_id = col.id
WHERE c.role = 'citizen';

CREATE VIEW collector_stats AS
SELECT 
    u.id,
    u.username,
    u.full_name,
    COUNT(t.id) as total_transactions,
    COALESCE(SUM(t.weight_grams), 0) as total_weight_collected,
    COALESCE(SUM(t.eiu_fee), 0) as total_eiu_fees
FROM users u
LEFT JOIN transactions t ON u.id = t.collector_id
WHERE u.role = 'collector'
GROUP BY u.id, u.username, u.full_name;

CREATE VIEW recycler_batches AS
SELECT 
    b.*,
    c.username as collector_username,
    r.username as recycler_username
FROM batches b
JOIN users c ON b.collector_id = c.id
LEFT JOIN users r ON b.recycler_id = r.id;

-- Insert sample data for testing (optional)
INSERT INTO users (email, password_hash, username, full_name, role, eiu_balance) VALUES
('citizen1@earthx.com', '$2b$10$placeholder_hash', 'citizen1', 'John Doe', 'citizen', 150.5),
('collector1@earthx.com', '$2b$10$placeholder_hash', 'collector1', 'Jane Smith', 'collector', 0),
('recycler1@earthx.com', '$2b$10$placeholder_hash', 'recycler1', 'Bob Johnson', 'recycler', 0);

-- Create stored procedures for common operations
CREATE OR REPLACE FUNCTION calculate_eiu_earned(weight_grams DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    -- 1 gram = 0.1 EIU (example rate)
    RETURN weight_grams * 0.1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_eiu_balance(user_id_param INTEGER)
RETURNS DECIMAL AS $$
DECLARE
    total_earned DECIMAL;
    total_spent DECIMAL;
BEGIN
    SELECT COALESCE(SUM(eiu_earned), 0) INTO total_earned
    FROM transactions 
    WHERE citizen_id = user_id_param AND status = 'confirmed';
    
    -- Assuming we have a redemption table in the future
    total_spent := 0;
    
    RETURN total_earned - total_spent;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE users IS 'User accounts for the EARTHX platform with roles: citizen, collector, recycler';
COMMENT ON TABLE transactions IS 'Plastic collection transactions between citizens and collectors';
COMMENT ON TABLE batches IS 'Batch verification records for recyclers to process bulk collections';
COMMENT ON COLUMN users.eiu_balance IS 'Earth Impact Units - cryptocurrency/token balance';
COMMENT ON COLUMN transactions.weight_grams IS 'Weight of plastic collected in grams';
COMMENT ON COLUMN batches.ipfs_proof_hash IS 'IPFS content hash for photo/video verification proof';