-- Seed Data para Teams (OPCIONAL - solo si necesitas datos de prueba)
-- Este script crea datos de ejemplo para probar el sistema de equipos

-- 1. Crear plantas de ejemplo (si no existen)
INSERT INTO plants (name, location, description, is_active, created_at, updated_at)
VALUES 
    ('Planta Norte', 'Buenos Aires, Zona Norte', 'Planta principal de operaciones', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Planta Sur', 'Buenos Aires, Zona Sur', 'Planta secundaria', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Planta Centro', 'CABA Centro', 'Oficinas centrales', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- 2. Crear equipos de ejemplo (si no existen)
-- Nota: Primero sin leader_id, lo asignaremos después
INSERT INTO teams (name, description, plant_id, is_active, created_at, updated_at)
SELECT 
    'Equipo de Mantenimiento',
    'Equipo encargado del mantenimiento preventivo y correctivo',
    (SELECT id FROM plants WHERE name = 'Planta Norte' LIMIT 1),
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Equipo de Mantenimiento');

INSERT INTO teams (name, description, plant_id, is_active, created_at, updated_at)
SELECT 
    'Equipo de Operaciones',
    'Equipo encargado de las operaciones diarias',
    (SELECT id FROM plants WHERE name = 'Planta Norte' LIMIT 1),
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Equipo de Operaciones');

INSERT INTO teams (name, description, plant_id, is_active, created_at, updated_at)
SELECT 
    'Equipo de Calidad',
    'Equipo de control de calidad',
    (SELECT id FROM plants WHERE name = 'Planta Sur' LIMIT 1),
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Equipo de Calidad');

-- 3. Ver resumen de lo creado
SELECT 
    'Plants' as tipo,
    COUNT(*) as cantidad
FROM plants
UNION ALL
SELECT 
    'Teams' as tipo,
    COUNT(*) as cantidad
FROM teams;

-- 4. Mostrar equipos con sus plantas
SELECT 
    t.id,
    t.name as equipo,
    p.name as planta,
    t.description,
    CASE WHEN t.leader_id IS NULL THEN 'Sin líder' ELSE 'Con líder' END as estado_lider
FROM teams t
LEFT JOIN plants p ON t.plant_id = p.id
WHERE t.is_active = true
ORDER BY t.name;

-- 5. Mostrar usuarios sin equipo (disponibles para asignar)
SELECT 
    u.id,
    u.first_name || ' ' || u.last_name as nombre_completo,
    u.email,
    u.role,
    CASE WHEN u.team_id IS NULL THEN 'Disponible' ELSE 'Ya en equipo' END as estado
FROM users u
WHERE u.is_active = true
ORDER BY u.role, u.first_name;

