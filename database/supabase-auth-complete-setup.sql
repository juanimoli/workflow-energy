-- Complete Supabase Setup with Auth Integration
-- For Supabase Authentication (UUID user IDs)
-- Run this script in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS work_order_history CASCADE;
DROP TABLE IF EXISTS work_orders CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS access_logs CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS metrics_cache CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS plants CASCADE;

-- Plants table
CREATE TABLE plants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    location TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams table
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    plant_id INTEGER REFERENCES plants(id),
    leader_id UUID, -- UUID for Supabase Auth
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table (UUID IDs for Supabase Auth)
CREATE TABLE users (
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

-- Add foreign key constraint for team leader
ALTER TABLE teams ADD CONSTRAINT fk_team_leader 
    FOREIGN KEY (leader_id) REFERENCES users(id);

-- Projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
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
CREATE TABLE work_orders (
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
CREATE TABLE work_order_history (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER REFERENCES work_orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Sessions table (optional with Supabase Auth)
CREATE TABLE user_sessions (
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
CREATE TABLE access_logs (
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
CREATE TABLE notifications (
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
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_team_id ON users(team_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_timestamp ON access_logs(timestamp);

-- Views
CREATE VIEW work_order_summary AS
SELECT 
    wo.id, wo.title, wo.status, wo.priority, wo.created_at, wo.due_date,
    u.first_name || ' ' || u.last_name as assigned_to_name,
    t.name as team_name, p.name as project_name
FROM work_orders wo
LEFT JOIN users u ON wo.assigned_to = u.id
LEFT JOIN teams t ON wo.team_id = t.id
LEFT JOIN projects p ON wo.project_id = p.id;

-- Row Level Security (RLS) for Supabase Auth
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'supervisor')
        )
    );

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

CREATE POLICY "Users can update assigned work orders" ON work_orders FOR UPDATE 
    USING (
        auth.uid() = assigned_to OR 
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND (u.role IN ('admin', 'supervisor', 'team_leader'))
        )
    );

CREATE POLICY "Users can create work orders" ON work_orders FOR INSERT 
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT 
    USING (auth.uid() = user_id);

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

-- Trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================================
-- SEED DATA SECTION
-- ============================================================================

-- Insert plants
INSERT INTO plants (name, location, description) VALUES
('Planta Principal', 'Buenos Aires, Argentina', 'Planta principal de generación eléctrica'),
('Planta Norte', 'Córdoba, Argentina', 'Planta de distribución zona norte'),
('Planta Sur', 'Mendoza, Argentina', 'Planta de transmisión zona sur');

-- Insert teams
INSERT INTO teams (name, description, plant_id) VALUES
('Equipo Mantenimiento A', 'Equipo de mantenimiento turno mañana', 1),
('Equipo Mantenimiento B', 'Equipo de mantenimiento turno tarde', 1),
('Equipo Operaciones', 'Equipo de operaciones generales', 2),
('Equipo Técnico', 'Equipo técnico especializado', 3);

-- Insert sample projects (no created_by since users need to be created through auth)
INSERT INTO projects (name, description, status, start_date, plant_id) VALUES
('Mantenimiento Preventivo Q1', 'Proyecto de mantenimiento preventivo primer trimestre', 'active', CURRENT_DATE, 1),
('Actualización Sistema Eléctrico', 'Actualización del sistema eléctrico principal', 'active', CURRENT_DATE + INTERVAL '7 days', 1),
('Inspección Equipos Norte', 'Inspección general de equipos planta norte', 'active', CURRENT_DATE, 2);

-- Insert sample metrics cache
INSERT INTO metrics_cache (metric_key, metric_value, expires_at) VALUES
('dashboard_stats', '{"total_work_orders": 0, "pending": 0, "in_progress": 0, "completed": 0}', CURRENT_TIMESTAMP + INTERVAL '1 hour'),
('team_performance', '{"teams": [{"name": "Equipo Mantenimiento A", "active_orders": 0}, {"name": "Equipo Mantenimiento B", "active_orders": 0}]}', CURRENT_TIMESTAMP + INTERVAL '1 hour');

-- Show setup summary
SELECT 'Supabase Auth Setup completed successfully!' as message,
       (SELECT COUNT(*) FROM plants) as plants_count,
       (SELECT COUNT(*) FROM teams) as teams_count,
       (SELECT COUNT(*) FROM projects) as projects_count;

-- Instructions for user creation
SELECT 'IMPORTANT: Users must sign up through your app.' as note,
       'They will be automatically added to the users table.' as instruction,
       'You can then assign them to teams and roles.' as next_step;