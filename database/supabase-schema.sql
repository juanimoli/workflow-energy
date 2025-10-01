-- Work Order Management System Database Schema
-- Supabase-compatible PostgreSQL Schema

-- Enable UUID extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Plants table
CREATE TABLE plants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams table
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    plant_id INTEGER REFERENCES plants(id),
    leader_id INTEGER, -- Will be set after users table is created
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('employee', 'team_leader', 'supervisor', 'admin')),
    team_id INTEGER REFERENCES teams(id),
    plant_id INTEGER REFERENCES plants(id),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint for team leader
ALTER TABLE teams ADD CONSTRAINT fk_team_leader 
    FOREIGN KEY (leader_id) REFERENCES users(id);

-- Projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
    start_date DATE,
    end_date DATE,
    plant_id INTEGER REFERENCES plants(id),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Work Orders table
CREATE TABLE work_orders (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id) NOT NULL,
    updated_by INTEGER REFERENCES users(id),
    project_id INTEGER REFERENCES projects(id),
    team_id INTEGER REFERENCES teams(id),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    estimated_hours DECIMAL(6,2),
    actual_hours DECIMAL(6,2),
    due_date TIMESTAMP,
    location TEXT,
    equipment_id VARCHAR(100),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    sync_status VARCHAR(20) DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict', 'deleted')),
    last_sync_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Work Order History table (for audit trail)
CREATE TABLE work_order_history (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER REFERENCES work_orders(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Sessions table (for JWT session management)
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    device_info TEXT,
    ip_address INET,
    is_mobile BOOLEAN DEFAULT false,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Access Logs table
CREATE TABLE access_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    status_code INTEGER,
    details JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
    is_read BOOLEAN DEFAULT false,
    related_work_order_id INTEGER REFERENCES work_orders(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Metrics Cache table (for performance optimization)
CREATE TABLE metrics_cache (
    id SERIAL PRIMARY KEY,
    metric_key VARCHAR(255) UNIQUE NOT NULL,
    metric_value JSONB NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_assigned_to ON work_orders(assigned_to);
CREATE INDEX idx_work_orders_created_by ON work_orders(created_by);
CREATE INDEX idx_work_orders_team_id ON work_orders(team_id);
CREATE INDEX idx_work_orders_project_id ON work_orders(project_id);
CREATE INDEX idx_work_orders_due_date ON work_orders(due_date);
CREATE INDEX idx_work_orders_created_at ON work_orders(created_at);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_team_id ON users(team_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_timestamp ON access_logs(timestamp);

-- Sample data views
CREATE VIEW work_order_summary AS
SELECT 
    wo.id, wo.title, wo.status, wo.priority, wo.created_at, wo.due_date,
    u.first_name || ' ' || u.last_name as assigned_to_name,
    t.name as team_name, p.name as project_name
FROM work_orders wo
LEFT JOIN users u ON wo.assigned_to = u.id
LEFT JOIN teams t ON wo.team_id = t.id
LEFT JOIN projects p ON wo.project_id = p.id;

-- Row Level Security (RLS) Policies for Supabase
-- Note: These policies assume you're using custom JWT authentication
-- If using Supabase Auth, you'll need to modify the user table structure

-- Add a supabase_user_id column to link with Supabase Auth (optional)
-- ALTER TABLE users ADD COLUMN supabase_user_id UUID REFERENCES auth.users(id);

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for custom authentication
-- Since we're using integer IDs and custom JWT, we need different approach

-- Disable RLS for now if using custom authentication
-- You can enable these later when integrating with Supabase Auth

-- Example policies for Supabase Auth integration (commented out):
-- CREATE POLICY "Users can view own profile" ON users FOR SELECT 
--   USING (supabase_user_id = auth.uid());

-- CREATE POLICY "Users can update own profile" ON users FOR UPDATE 
--   USING (supabase_user_id = auth.uid());

-- For now, disable RLS to avoid casting errors with custom auth
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;