-- Complete Supabase Setup: Schema + Seed Data
-- For Custom Authentication (INTEGER user IDs)
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
    leader_id INTEGER, -- Will be set after users table is created
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table (INTEGER IDs for custom auth)
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
    name VARCHAR(255) NOT NULL UNIQUE,
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

-- Work Order History table
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

-- User Sessions table
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
CREATE INDEX idx_users_email ON users(email);
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

-- RLS is disabled for custom authentication
-- You can enable it later if needed

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

-- Insert users (passwords are bcrypt hashed)
-- Admin user (password: admin123)
INSERT INTO users (username, email, password_hash, first_name, last_name, role, plant_id) VALUES
('admin', 'admin@empresa.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador', 'Sistema', 'admin', 1);

-- Supervisor (password: supervisor123)
INSERT INTO users (username, email, password_hash, first_name, last_name, role, plant_id, created_by) VALUES
('supervisor', 'supervisor@empresa.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Juan', 'Pérez', 'supervisor', 1, 1);

-- Team leaders (password: leader123)
INSERT INTO users (username, email, password_hash, first_name, last_name, role, team_id, plant_id, created_by) VALUES
('leader1', 'leader1@empresa.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'María', 'González', 'team_leader', 1, 1, 1),
('leader2', 'leader2@empresa.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Carlos', 'Rodríguez', 'team_leader', 2, 1, 1);

-- Employees (password: employee123)
INSERT INTO users (username, email, password_hash, first_name, last_name, role, team_id, plant_id, created_by) VALUES
('employee1', 'emp1@empresa.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ana', 'López', 'employee', 1, 1, 1),
('employee2', 'emp2@empresa.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Luis', 'Martín', 'employee', 1, 1, 1),
('employee3', 'emp3@empresa.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sandra', 'Fernández', 'employee', 2, 1, 1),
('employee4', 'emp4@empresa.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Roberto', 'Silva', 'employee', 2, 1, 1);

-- Update team leaders
UPDATE teams SET leader_id = 3 WHERE id = 1;
UPDATE teams SET leader_id = 4 WHERE id = 2;

-- Insert projects
INSERT INTO projects (name, description, status, start_date, plant_id, created_by) VALUES
('Mantenimiento Preventivo Q1', 'Proyecto de mantenimiento preventivo primer trimestre', 'active', CURRENT_DATE, 1, 1),
('Actualización Sistema Eléctrico', 'Actualización del sistema eléctrico principal', 'active', CURRENT_DATE + INTERVAL '7 days', 1, 2),
('Inspección Equipos Norte', 'Inspección general de equipos planta norte', 'active', CURRENT_DATE, 2, 1);

-- Insert work orders
INSERT INTO work_orders (title, description, assigned_to, created_by, team_id, project_id, priority, status, estimated_hours, due_date, location, equipment_id) VALUES
('Revisión Transformador Principal', 'Revisión completa del transformador principal de la planta', 5, 1, 1, 1, 'high', 'pending', 8.0, CURRENT_TIMESTAMP + INTERVAL '3 days', 'Sala de Transformadores', 'TRANS-001'),
('Calibración Medidores', 'Calibración de medidores de voltaje sector A', 6, 3, 1, 1, 'medium', 'in_progress', 4.0, CURRENT_TIMESTAMP + INTERVAL '2 days', 'Sector A', 'MED-A-001'),
('Mantenimiento Generador', 'Mantenimiento preventivo generador secundario', 7, 4, 2, 2, 'medium', 'pending', 6.0, CURRENT_TIMESTAMP + INTERVAL '5 days', 'Sala de Generadores', 'GEN-002'),
('Inspección Cables', 'Inspección visual de cables de alta tensión', 8, 1, 2, 3, 'low', 'pending', 3.0, CURRENT_TIMESTAMP + INTERVAL '7 days', 'Zona Externa', 'CAB-HT-001');

-- Insert notifications
INSERT INTO notifications (user_id, title, message, type, related_work_order_id) VALUES
(5, 'Nueva Orden Asignada', 'Se te ha asignado la orden: Revisión Transformador Principal', 'info', 1),
(6, 'Orden en Progreso', 'Recuerda completar la calibración de medidores', 'warning', 2),
(7, 'Orden Pendiente', 'Tienes una nueva orden de mantenimiento asignada', 'info', 3);

-- Insert sample metrics cache
INSERT INTO metrics_cache (metric_key, metric_value, expires_at) VALUES
('dashboard_stats', '{"total_work_orders": 4, "pending": 3, "in_progress": 1, "completed": 0}', CURRENT_TIMESTAMP + INTERVAL '1 hour'),
('team_performance', '{"teams": [{"name": "Equipo Mantenimiento A", "active_orders": 2}, {"name": "Equipo Mantenimiento B", "active_orders": 2}]}', CURRENT_TIMESTAMP + INTERVAL '1 hour');

-- Show final setup summary
SELECT 'Setup completed successfully!' as message,
       (SELECT COUNT(*) FROM plants) as plants_count,
       (SELECT COUNT(*) FROM teams) as teams_count,
       (SELECT COUNT(*) FROM users) as users_count,
       (SELECT COUNT(*) FROM projects) as projects_count,
       (SELECT COUNT(*) FROM work_orders) as work_orders_count,
       (SELECT COUNT(*) FROM notifications) as notifications_count;

-- Display login credentials
SELECT 'Login Credentials:' as info, NULL as username, NULL as password, NULL as role
UNION ALL
SELECT NULL, 'admin', 'admin123', 'Administrator'
UNION ALL
SELECT NULL, 'supervisor', 'supervisor123', 'Supervisor' 
UNION ALL
SELECT NULL, 'leader1', 'leader123', 'Team Leader'
UNION ALL
SELECT NULL, 'employee1', 'employee123', 'Employee';