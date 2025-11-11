require('dotenv').config();
const { connectDB, getDB } = require('../config/database');

async function verifyPasswordResetTable() {
  try {
    console.log('🔍 Verificando tabla password_reset_tokens...\n');
    
    // Initialize database connection first
    await connectDB();
    const supabase = getDB();
    
    // Try to query the table
    const { data, error } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('relation "password_reset_tokens" does not exist')) {
        console.log('❌ PROBLEMA: La tabla password_reset_tokens NO existe\n');
        console.log('📋 SOLUCIÓN: Necesitas crear la tabla en Supabase:\n');
        console.log('1. Ve a: https://app.supabase.com/project/[tu-project-id]/sql/new');
        console.log('2. Ejecuta el SQL del archivo: migrations/create_password_reset_tokens.sql\n');
        return false;
      } else {
        console.log('❌ Error al verificar tabla:', error.message);
        return false;
      }
    }

    console.log('✅ La tabla password_reset_tokens existe correctamente');
    console.log(`📊 Registros actuales: ${data ? data.length : 0}\n`);
    return true;

  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    return false;
  }
}

// Execute if called directly
if (require.main === module) {
  verifyPasswordResetTable().then((exists) => {
    process.exit(exists ? 0 : 1);
  });
}

module.exports = { verifyPasswordResetTable };