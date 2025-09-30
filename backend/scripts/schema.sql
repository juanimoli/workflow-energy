-- Work Order Management System Database Schema
-- PostgreSQL Implementation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with role-based access
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('employee', 'team_leader', 'supervisor', 'admin')),
    team_id INTEGER,
    plant_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Teams table
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    leader_id INTEGER REFERENCES users(id),
    plant_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Plants table
CREATE TABLE plants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    plant_id INTEGER REFERENCES plants(id),
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'suspended', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Work Orders table
CREATE TABLE work_orders (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    assigned_to INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id) NOT NULL,
    project_id INTEGER REFERENCES projects(id),
    team_id INTEGER REFERENCES teams(id),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    due_date TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    location VARCHAR(200),
    equipment_id VARCHAR(50),
    notes TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    sync_status VARCHAR(20) DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict')),
    last_sync_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Work Order History for audit trail
CREATE TABLE work_order_history (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER REFERENCES work_orders(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    field_name VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    change_reason TEXT,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Sessions for authentication tracking
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255),
    device_info JSONB,
    ip_address INET,
    expires_at TIMESTAMP NOT NULL,
    is_mobile BOOLEAN DEFAULT false,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sync Queue for offline operations
CREATE TABLE sync_queue (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
    data JSONB,
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'processing', 'completed', 'failed')),
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    client_timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- Access Logs for security and auditing
CREATE TABLE access_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    status_code INTEGER,
    response_time INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Metrics Cache for performance
CREATE TABLE metrics_cache (
    id SERIAL PRIMARY KEY,
    metric_key VARCHAR(100) UNIQUE NOT NULL,
    metric_value JSONB NOT NULL,
    filters JSONB DEFAULT '{}'::jsonb,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    read_at TIMESTAMP,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- File Attachments
CREATE TABLE attachments (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER REFERENCES work_orders(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    file_path VARCHAR(500) NOT NULL,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints
ALTER TABLE users ADD CONSTRAINT fk_users_team FOREIGN KEY (team_id) REFERENCES teams(id);
ALTER TABLE users ADD CONSTRAINT fk_users_plant FOREIGN KEY (plant_id) REFERENCES plants(id);
ALTER TABLE teams ADD CONSTRAINT fk_teams_plant FOREIGN KEY (plant_id) REFERENCES plants(id);

-- Create indexes for performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_team_id ON users(team_id);
CREATE INDEX idx_users_plant_id ON users(plant_id);
CREATE INDEX idx_users_active ON users(is_active);

CREATE INDEX idx_work_orders_assigned_to ON work_orders(assigned_to);
CREATE INDEX idx_work_orders_created_by ON work_orders(created_by);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_priority ON work_orders(priority);
CREATE INDEX idx_work_orders_project_id ON work_orders(project_id);
CREATE INDEX idx_work_orders_team_id ON work_orders(team_id);
CREATE INDEX idx_work_orders_due_date ON work_orders(due_date);
CREATE INDEX idx_work_orders_created_at ON work_orders(created_at);
CREATE INDEX idx_work_orders_sync_status ON work_orders(sync_status);

CREATE INDEX idx_work_order_history_work_order_id ON work_order_history(work_order_id);
CREATE INDEX idx_work_order_history_user_id ON work_order_history(user_id);
CREATE INDEX idx_work_order_history_timestamp ON work_order_history(timestamp);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);

CREATE INDEX idx_sync_queue_user_id ON sync_queue(user_id);
CREATE INDEX idx_sync_queue_status ON sync_queue(sync_status);
CREATE INDEX idx_sync_queue_created_at ON sync_queue(created_at);

CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_timestamp ON access_logs(timestamp);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plants_updated_at BEFORE UPDATE ON plants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for work order history
CREATE OR REPLACE FUNCTION log_work_order_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Log specific field changes
        IF OLD.status != NEW.status THEN
            INSERT INTO work_order_history (work_order_id, user_id, action, field_name, old_value, new_value)
            VALUES (NEW.id, NEW.updated_by, 'status_change', 'status', OLD.status, NEW.status);
        END IF;
        
        IF OLD.assigned_to != NEW.assigned_to OR (OLD.assigned_to IS NULL AND NEW.assigned_to IS NOT NULL) THEN
            INSERT INTO work_order_history (work_order_id, user_id, action, field_name, old_value, new_value)
            VALUES (NEW.id, NEW.updated_by, 'assignment_change', 'assigned_to', OLD.assigned_to::text, NEW.assigned_to::text);
        END IF;
        
        IF OLD.priority != NEW.priority THEN
            INSERT INTO work_order_history (work_order_id, user_id, action, field_name, old_value, new_value)
            VALUES (NEW.id, NEW.updated_by, 'priority_change', 'priority', OLD.priority, NEW.priority);
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO work_order_history (work_order_id, user_id, action)
        VALUES (NEW.id, NEW.created_by, 'created');
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_order_audit_trigger
    AFTER INSERT OR UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION log_work_order_changes();

-- Version increment trigger
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        NEW.version = OLD.version + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_order_version_trigger
    BEFORE UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION increment_version();

-- Clean up expired sessions function
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP;
    DELETE FROM metrics_cache WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create views for common queries
CREATE VIEW active_work_orders AS
SELECT 
    wo.*,
    u.first_name || ' ' || u.last_name as assigned_to_name,
    creator.first_name || ' ' || creator.last_name as created_by_name,
    t.name as team_name,
    p.name as project_name
FROM work_orders wo
LEFT JOIN users u ON wo.assigned_to = u.id
LEFT JOIN users creator ON wo.created_by = creator.id
LEFT JOIN teams t ON wo.team_id = t.id
LEFT JOIN projects p ON wo.project_id = p.id
WHERE wo.status != 'cancelled';

CREATE VIEW work_order_metrics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    status,
    priority,
    team_id,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/3600) as avg_hours
FROM work_orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), status, priority, team_id;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO work_order_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO work_order_app;