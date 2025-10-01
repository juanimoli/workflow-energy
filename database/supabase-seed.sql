-- Seed data for Supabase Work Order Management System
-- Run this after running the schema script

-- Insert plants and capture their IDs
WITH inserted_plants AS (
    INSERT INTO plants (name, location, description) VALUES
    ('Planta Principal', 'Buenos Aires, Argentina', 'Planta principal de generación eléctrica'),
    ('Planta Norte', 'Córdoba, Argentina', 'Planta de distribución zona norte'),
    ('Planta Sur', 'Mendoza, Argentina', 'Planta de transmisión zona sur')
    ON CONFLICT DO NOTHING
    RETURNING id, name
)
SELECT 'Plants inserted:' as status, COUNT(*) as count FROM inserted_plants;

-- Insert teams using actual plant IDs
WITH plant_refs AS (
    SELECT id, name FROM plants WHERE name IN ('Planta Principal', 'Planta Norte', 'Planta Sur')
)
INSERT INTO teams (name, description, plant_id) 
SELECT team_name, team_description, plant_id FROM (
    VALUES 
    ('Equipo Mantenimiento A', 'Equipo de mantenimiento turno mañana', 'Planta Principal'),
    ('Equipo Mantenimiento B', 'Equipo de mantenimiento turno tarde', 'Planta Principal'),
    ('Equipo Operaciones', 'Equipo de operaciones generales', 'Planta Norte'),
    ('Equipo Técnico', 'Equipo técnico especializado', 'Planta Sur')
) AS team_data(team_name, team_description, plant_name)
JOIN plant_refs ON plant_refs.name = team_data.plant_name
ON CONFLICT DO NOTHING;

-- Note: This seed script is for INTEGER user IDs (custom auth)
-- For Supabase Auth with UUID IDs, use supabase-auth-seed.sql instead

-- Insert admin user (password: admin123 - hashed with bcrypt)
WITH plant_ref AS (
    SELECT id FROM plants WHERE name = 'Planta Principal' LIMIT 1
)
INSERT INTO users (username, email, password_hash, first_name, last_name, role, plant_id) 
SELECT 'admin', 'admin@empresa.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador', 'Sistema', 'admin', plant_ref.id
FROM plant_ref
ON CONFLICT (username) DO NOTHING;

-- Insert supervisor (password: supervisor123)
WITH plant_ref AS (
    SELECT id FROM plants WHERE name = 'Planta Principal' LIMIT 1
), admin_ref AS (
    SELECT id FROM users WHERE username = 'admin' LIMIT 1
)
INSERT INTO users (username, email, password_hash, first_name, last_name, role, plant_id, created_by) 
SELECT 'supervisor', 'supervisor@empresa.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Juan', 'Pérez', 'supervisor', plant_ref.id, admin_ref.id
FROM plant_ref, admin_ref
ON CONFLICT (username) DO NOTHING;

-- Insert team leaders
WITH plant_ref AS (
    SELECT id FROM plants WHERE name = 'Planta Principal' LIMIT 1
), admin_ref AS (
    SELECT id FROM users WHERE username = 'admin' LIMIT 1
), team_refs AS (
    SELECT id, name FROM teams WHERE name IN ('Equipo Mantenimiento A', 'Equipo Mantenimiento B')
)
INSERT INTO users (username, email, password_hash, first_name, last_name, role, team_id, plant_id, created_by) 
SELECT user_data.username, user_data.email, user_data.password_hash, user_data.first_name, user_data.last_name, user_data.role, team_refs.id, plant_ref.id, admin_ref.id
FROM (VALUES 
    ('leader1', 'leader1@empresa.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'María', 'González', 'team_leader', 'Equipo Mantenimiento A'),
    ('leader2', 'leader2@empresa.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Carlos', 'Rodríguez', 'team_leader', 'Equipo Mantenimiento B')
) AS user_data(username, email, password_hash, first_name, last_name, role, team_name)
JOIN team_refs ON team_refs.name = user_data.team_name
CROSS JOIN plant_ref, admin_ref
ON CONFLICT (username) DO NOTHING;

-- Insert employees
WITH plant_ref AS (
    SELECT id FROM plants WHERE name = 'Planta Principal' LIMIT 1
), admin_ref AS (
    SELECT id FROM users WHERE username = 'admin' LIMIT 1
), team_refs AS (
    SELECT id, name FROM teams WHERE name IN ('Equipo Mantenimiento A', 'Equipo Mantenimiento B')
)
INSERT INTO users (username, email, password_hash, first_name, last_name, role, team_id, plant_id, created_by) 
SELECT user_data.username, user_data.email, user_data.password_hash, user_data.first_name, user_data.last_name, user_data.role, team_refs.id, plant_ref.id, admin_ref.id
FROM (VALUES 
    ('employee1', 'emp1@empresa.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ana', 'López', 'employee', 'Equipo Mantenimiento A'),
    ('employee2', 'emp2@empresa.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Luis', 'Martín', 'employee', 'Equipo Mantenimiento A'),
    ('employee3', 'emp3@empresa.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sandra', 'Fernández', 'employee', 'Equipo Mantenimiento B'),
    ('employee4', 'emp4@empresa.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Roberto', 'Silva', 'employee', 'Equipo Mantenimiento B')
) AS user_data(username, email, password_hash, first_name, last_name, role, team_name)
JOIN team_refs ON team_refs.name = user_data.team_name
CROSS JOIN plant_ref, admin_ref
ON CONFLICT (username) DO NOTHING;

-- Update team leaders using usernames instead of IDs
UPDATE teams SET leader_id = (SELECT id FROM users WHERE username = 'leader1') WHERE name = 'Equipo Mantenimiento A';
UPDATE teams SET leader_id = (SELECT id FROM users WHERE username = 'leader2') WHERE name = 'Equipo Mantenimiento B';

-- Insert sample projects using actual references
WITH plant_refs AS (
    SELECT id, name FROM plants WHERE name IN ('Planta Principal', 'Planta Norte')
), user_refs AS (
    SELECT id, username FROM users WHERE username IN ('admin', 'supervisor')
)
INSERT INTO projects (name, description, status, start_date, plant_id, created_by) 
SELECT project_data.name, project_data.description, project_data.status, project_data.start_date, plant_refs.id, user_refs.id
FROM (VALUES 
    ('Mantenimiento Preventivo Q1', 'Proyecto de mantenimiento preventivo primer trimestre', 'active', CURRENT_DATE, 'Planta Principal', 'admin'),
    ('Actualización Sistema Eléctrico', 'Actualización del sistema eléctrico principal', 'active', CURRENT_DATE + INTERVAL '7 days', 'Planta Principal', 'supervisor'),
    ('Inspección Equipos Norte', 'Inspección general de equipos planta norte', 'active', CURRENT_DATE, 'Planta Norte', 'admin')
) AS project_data(name, description, status, start_date, plant_name, creator_username)
JOIN plant_refs ON plant_refs.name = project_data.plant_name
JOIN user_refs ON user_refs.username = project_data.creator_username
ON CONFLICT DO NOTHING;

-- Insert sample work orders using actual references
WITH user_refs AS (
    SELECT id, username FROM users WHERE username IN ('employee1', 'employee2', 'employee3', 'employee4', 'admin', 'leader1', 'leader2')
), team_refs AS (
    SELECT id, name FROM teams WHERE name IN ('Equipo Mantenimiento A', 'Equipo Mantenimiento B')
), project_refs AS (
    SELECT id, name FROM projects WHERE name IN ('Mantenimiento Preventivo Q1', 'Actualización Sistema Eléctrico', 'Inspección Equipos Norte')
)
INSERT INTO work_orders (title, description, assigned_to, created_by, team_id, project_id, priority, status, estimated_hours, due_date, location, equipment_id) 
SELECT 
    wo_data.title, wo_data.description, 
    assigned_user.id, creator_user.id, team_refs.id, project_refs.id,
    wo_data.priority, wo_data.status, wo_data.estimated_hours, wo_data.due_date, wo_data.location, wo_data.equipment_id
FROM (VALUES 
    ('Revisión Transformador Principal', 'Revisión completa del transformador principal de la planta', 'employee1', 'admin', 'Equipo Mantenimiento A', 'Mantenimiento Preventivo Q1', 'high', 'pending', 8.0, CURRENT_TIMESTAMP + INTERVAL '3 days', 'Sala de Transformadores', 'TRANS-001'),
    ('Calibración Medidores', 'Calibración de medidores de voltaje sector A', 'employee2', 'leader1', 'Equipo Mantenimiento A', 'Mantenimiento Preventivo Q1', 'medium', 'in_progress', 4.0, CURRENT_TIMESTAMP + INTERVAL '2 days', 'Sector A', 'MED-A-001'),
    ('Mantenimiento Generador', 'Mantenimiento preventivo generador secundario', 'employee3', 'leader2', 'Equipo Mantenimiento B', 'Actualización Sistema Eléctrico', 'medium', 'pending', 6.0, CURRENT_TIMESTAMP + INTERVAL '5 days', 'Sala de Generadores', 'GEN-002'),
    ('Inspección Cables', 'Inspección visual de cables de alta tensión', 'employee4', 'admin', 'Equipo Mantenimiento B', 'Inspección Equipos Norte', 'low', 'pending', 3.0, CURRENT_TIMESTAMP + INTERVAL '7 days', 'Zona Externa', 'CAB-HT-001')
) AS wo_data(title, description, assigned_username, creator_username, team_name, project_name, priority, status, estimated_hours, due_date, location, equipment_id)
JOIN user_refs assigned_user ON assigned_user.username = wo_data.assigned_username
JOIN user_refs creator_user ON creator_user.username = wo_data.creator_username
JOIN team_refs ON team_refs.name = wo_data.team_name
JOIN project_refs ON project_refs.name = wo_data.project_name
ON CONFLICT DO NOTHING;

-- Insert sample notifications using actual user and work order references
WITH user_refs AS (
    SELECT id, username FROM users WHERE username IN ('employee1', 'employee2', 'employee3')
), wo_refs AS (
    SELECT id, title FROM work_orders WHERE title IN ('Revisión Transformador Principal', 'Calibración Medidores', 'Mantenimiento Generador')
)
INSERT INTO notifications (user_id, title, message, type, related_work_order_id) 
SELECT user_refs.id, notif_data.title, notif_data.message, notif_data.type, wo_refs.id
FROM (VALUES 
    ('employee1', 'Nueva Orden Asignada', 'Se te ha asignado la orden: Revisión Transformador Principal', 'info', 'Revisión Transformador Principal'),
    ('employee2', 'Orden en Progreso', 'Recuerda completar la calibración de medidores', 'warning', 'Calibración Medidores'),
    ('employee3', 'Orden Pendiente', 'Tienes una nueva orden de mantenimiento asignada', 'info', 'Mantenimiento Generador')
) AS notif_data(username, title, message, type, wo_title)
JOIN user_refs ON user_refs.username = notif_data.username
JOIN wo_refs ON wo_refs.title = notif_data.wo_title
ON CONFLICT DO NOTHING;