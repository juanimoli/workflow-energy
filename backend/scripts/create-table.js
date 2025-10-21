const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function createPasswordResetTable() {
  console.log('🚀 Creando tabla password_reset_tokens en Supabase...\n');
  console.log('⚠️  NOTA: Supabase no permite ejecutar DDL via API por seguridad.\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  
  // Extraer el ID del proyecto de la URL
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (!projectRef) {
    console.error('❌ No se pudo extraer el ID del proyecto de SUPABASE_URL');
    process.exit(1);
  }

  console.log('📋 INSTRUCCIONES PASO A PASO:\n');
  console.log('1️⃣  Abre tu navegador en:');
  console.log(`   https://app.supabase.com/project/${projectRef}/sql/new\n`);
  
  console.log('2️⃣  Copia y pega el siguiente SQL:\n');
  console.log('========================================');
  console.log(`
-- Crear tabla para tokens de reset de contraseña
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_active_token UNIQUE (user_id, token_hash)
);

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id 
  ON password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at 
  ON password_reset_tokens(expires_at);

-- Agregar comentario a la tabla
COMMENT ON TABLE password_reset_tokens 
  IS 'Almacena tokens de reset de contraseña para funcionalidad de recuperación';

-- Verificar que se creó correctamente
SELECT 'Tabla creada exitosamente!' as status;
  `);
  console.log('========================================\n');
  
  console.log('3️⃣  Haz clic en el botón "Run" (o presiona Ctrl+Enter)\n');
  
  console.log('4️⃣  Deberías ver: ✅ "Success. 1 rows returned"\n');
  
  console.log('5️⃣  Luego ejecuta este comando para verificar:');
  console.log('   node scripts/verify-table.js\n');
  
  console.log('💡 Guarda este archivo por si necesitas ejecutarlo de nuevo.');
}

createPasswordResetTable();

