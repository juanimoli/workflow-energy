-- Safe Migration Script for Supabase
-- This script creates tables only if they don't exist
-- Safe to run multiple times

-- Enable UUID extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Plants table
CREATE TABLE IF NOT EXISTS plants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    plant_id INTEGER REFERENCES plants(id),
    leader_id UUID, -- Changed to UUID for Supabase Auth
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table - Modified for Supabase Auth integration
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('employee', 'team_leader', 'supervisor', 'admin')),
    team_id INTEGER REFERENCES teams(id),
    plant_id INTEGER REFERENCES plants(id),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint for team leader (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_team_leader'
    ) THEN
        ALTER TABLE teams ADD CONSTRAINT fk_team_leader 
            FOREIGN KEY (leader_id) REFERENCES users(id);
    END IF;
END $$;

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
    start_date DATE,
    end_date DATE,
    plant_id INTEGER REFERENCES plants(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Work Orders table
CREATE TABLE IF NOT EXISTS work_orders (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id) NOT NULL,
    updated_by UUID REFERENCES users(id),
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

-- Work Order History table
CREATE TABLE IF NOT EXISTS work_order_history (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER REFERENCES work_orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Sessions table (may not be needed with Supabase Auth)
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS access_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    status_code INTEGER,
    details JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
    is_read BOOLEAN DEFAULT false,
    related_work_order_id INTEGER REFERENCES work_orders(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Metrics Cache table
CREATE TABLE IF NOT EXISTS metrics_cache (
    id SERIAL PRIMARY KEY,
    metric_key VARCHAR(255) UNIQUE NOT NULL,
    metric_value JSONB NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON work_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_by ON work_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_work_orders_team_id ON work_orders(team_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_project_id ON work_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_due_date ON work_orders(due_date);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON work_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp);

-- Views (drop and recreate to handle schema changes)
DROP VIEW IF EXISTS work_order_summary;
CREATE VIEW work_order_summary AS
SELECT 
    wo.id, wo.title, wo.status, wo.priority, wo.created_at, wo.due_date,
    u.first_name || ' ' || u.last_name as assigned_to_name,
    t.name as team_name, p.name as project_name
FROM work_orders wo
LEFT JOIN users u ON wo.assigned_to = u.id
LEFT JOIN teams t ON wo.team_id = t.id
LEFT JOIN projects p ON wo.project_id = p.id;

-- Row Level Security (RLS) Policies for Supabase Auth
-- Enable RLS only if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'users' AND n.nspname = 'public' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'work_orders' AND n.nspname = 'public' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'user_sessions' AND n.nspname = 'public' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'notifications' AND n.nspname = 'public' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'access_logs' AND n.nspname = 'public' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can view relevant work orders" ON work_orders;
DROP POLICY IF EXISTS "Users can update assigned work orders" ON work_orders;
DROP POLICY IF EXISTS "Users can create work orders" ON work_orders;
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can view access logs" ON access_logs;

-- Recreate RLS Policies
-- Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON users FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users FOR UPDATE 
    USING (auth.uid() = id);

-- Admins and supervisors can view all users
CREATE POLICY "Admins can view all users" ON users FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'supervisor')
        )
    );

-- Work orders - users can see work orders in their team or assigned to them
CREATE POLICY "Users can view relevant work orders" ON work_orders FOR SELECT 
    USING (
        auth.uid() = assigned_to OR 
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND (u.team_id = work_orders.team_id OR u.role IN ('admin', 'supervisor'))
        )
    );

-- Users can update work orders assigned to them
CREATE POLICY "Users can update assigned work orders" ON work_orders FOR UPDATE 
    USING (
        auth.uid() = assigned_to OR 
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND (u.role IN ('admin', 'supervisor', 'team_leader'))
        )
    );

-- Users can create work orders
CREATE POLICY "Users can create work orders" ON work_orders FOR INSERT 
    WITH CHECK (auth.uid() = created_by);

-- User sessions - users can only see their own sessions
CREATE POLICY "Users can view own sessions" ON user_sessions FOR SELECT 
    USING (auth.uid() = user_id);

-- Notifications - users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT 
    USING (auth.uid() = user_id);

-- Access logs - only admins can view
CREATE POLICY "Admins can view access logs" ON access_logs FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
        )
    );

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, username, first_name, last_name, role)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'Name'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger only if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();