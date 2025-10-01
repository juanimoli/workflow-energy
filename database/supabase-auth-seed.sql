-- Seed data for Supabase Auth Integration
-- This script is for use with supabase-auth-schema.sql (UUID user IDs)
-- Users are created through Supabase Auth, not directly inserted

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

-- Note: Users will be created automatically through Supabase Auth
-- When users sign up through your app, the trigger function will create their profile

-- Insert sample projects (will need to be updated with actual user UUIDs after users are created)
WITH plant_refs AS (
    SELECT id, name FROM plants WHERE name = 'Planta Principal'
)
INSERT INTO projects (name, description, status, start_date, plant_id) 
SELECT project_data.name, project_data.description, project_data.status, project_data.start_date, plant_refs.id
FROM (VALUES 
    ('Mantenimiento Preventivo Q1', 'Proyecto de mantenimiento preventivo primer trimestre', 'active', CURRENT_DATE),
    ('Actualización Sistema Eléctrico', 'Actualización del sistema eléctrico principal', 'active', CURRENT_DATE + INTERVAL '7 days'),
    ('Inspección Equipos Norte', 'Inspección general de equipos planta norte', 'active', CURRENT_DATE)
) AS project_data(name, description, status, start_date)
CROSS JOIN plant_refs
ON CONFLICT DO NOTHING;

-- Insert sample metrics cache data
INSERT INTO metrics_cache (metric_key, metric_value, expires_at) VALUES
('dashboard_stats', '{"total_work_orders": 0, "pending": 0, "in_progress": 0, "completed": 0}', CURRENT_TIMESTAMP + INTERVAL '1 hour'),
('team_performance', '{"teams": [], "avg_completion_time": 0}', CURRENT_TIMESTAMP + INTERVAL '1 hour')
ON CONFLICT (metric_key) DO NOTHING;

-- Instructions for setting up users with Supabase Auth:
-- 1. Users must sign up through your application's auth flow
-- 2. The handle_new_user() function will automatically create their profile
-- 3. After users are created, you can manually assign them to teams:
--    UPDATE users SET team_id = (SELECT id FROM teams WHERE name = 'Equipo Mantenimiento A'), role = 'admin' WHERE username = 'admin';
-- 4. You can then create work orders assigned to these users

SELECT 'Seed data completed. Users must be created through Supabase Auth signup process.' as message;