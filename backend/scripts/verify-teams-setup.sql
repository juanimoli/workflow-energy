-- Verificación y Setup de Teams
-- Este script verifica que todas las tablas y relaciones necesarias existan

-- 1. Verificar que las tablas existan
SELECT 
    tablename,
    schemaname
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'teams', 'plants', 'work_orders', 'projects')
ORDER BY tablename;

-- 2. Verificar foreign keys de users
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'users'
AND kcu.column_name IN ('team_id', 'plant_id');

-- 3. Verificar foreign keys de teams
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'teams'
AND kcu.column_name IN ('leader_id', 'plant_id');

-- 4. Verificar foreign keys de work_orders
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'work_orders'
AND kcu.column_name = 'team_id';

-- 5. Verificar columnas de teams
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'teams'
ORDER BY ordinal_position;

-- 6. Verificar columnas de users relacionadas con teams/plants
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('team_id', 'plant_id', 'role')
ORDER BY ordinal_position;

-- 7. Contar datos actuales
SELECT 'teams' as tabla, COUNT(*) as cantidad FROM teams
UNION ALL
SELECT 'plants' as tabla, COUNT(*) as cantidad FROM plants
UNION ALL
SELECT 'users' as tabla, COUNT(*) as cantidad FROM users
UNION ALL
SELECT 'users_with_team' as tabla, COUNT(*) as cantidad FROM users WHERE team_id IS NOT NULL
UNION ALL
SELECT 'users_without_team' as tabla, COUNT(*) as cantidad FROM users WHERE team_id IS NULL;

