/**
 * Script para crear usuarios de demostración en Supabase
 * Ejecutar: node backend/scripts/create-demo-users.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function createDemoUsers() {
  console.log('🚀 Creando usuarios de demostración...\n');

  // Contraseña común: "password" (hasheada)
  const commonPassword = await bcrypt.hash('password', 12);
  
  // Contraseña para admin: "123456" (hasheada)
  const adminPassword = await bcrypt.hash('123456', 12);

  const demoUsers = [
    {
      email: 'admin@empresa.com',
      username: 'admin',
      password_hash: adminPassword,
      first_name: 'Administrador',
      last_name: 'Sistema',
      role: 'admin',
      team_id: null,
      plant_id: null,
      is_active: true
    },
    {
      email: 'supervisor@empresa.com',
      username: 'supervisor',
      password_hash: commonPassword,
      first_name: 'Carlos',
      last_name: 'Supervisor',
      role: 'supervisor',
      team_id: null,
      plant_id: null,
      is_active: true
    },
    {
      email: 'team_leader@empresa.com',
      username: 'team_leader',
      password_hash: commonPassword,
      first_name: 'Juan',
      last_name: 'Líder',
      role: 'team_leader',
      team_id: null, // Se asignará después de crear el equipo
      plant_id: null,
      is_active: true
    },
    {
      email: 'employee@empresa.com',
      username: 'employee',
      password_hash: commonPassword,
      first_name: 'María',
      last_name: 'Empleada',
      role: 'employee',
      team_id: null,
      plant_id: null,
      is_active: true
    },
    {
      email: 'tech@example.com',
      username: 'tech',
      password_hash: commonPassword,
      first_name: 'Pedro',
      last_name: 'Técnico',
      role: 'employee',
      team_id: null,
      plant_id: null,
      is_active: true
    }
  ];

  try {
    // Primero, verificar si ya existen usuarios
    for (const user of demoUsers) {
      console.log(`\n📧 Verificando ${user.email}...`);
      
      const { data: existing, error: checkError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('email', user.email)
        .single();

      if (existing) {
        console.log(`   ⚠️  Ya existe: ${existing.email} (${existing.role})`);
        console.log(`   🔑 ID: ${existing.id}`);
        
        // Actualizar la contraseña para que coincida con "password"
        const { error: updateError } = await supabase
          .from('users')
          .update({ password_hash: user.password_hash })
          .eq('id', existing.id);
        
        if (updateError) {
          console.log(`   ❌ Error actualizando contraseña: ${updateError.message}`);
        } else {
          console.log(`   ✅ Contraseña actualizada correctamente`);
        }
      } else {
        // Crear nuevo usuario
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert(user)
          .select()
          .single();

        if (insertError) {
          console.log(`   ❌ Error creando: ${insertError.message}`);
        } else {
          console.log(`   ✅ Creado: ${newUser.email} (${newUser.role})`);
          console.log(`   🔑 ID: ${newUser.id}`);
        }
      }
    }

    console.log('\n\n✅ ¡Proceso completado!\n');
    console.log('📋 CREDENCIALES DE ACCESO:');
    console.log('━'.repeat(50));
    console.log('👤 Admin:        admin@empresa.com / 123456');
    console.log('👤 Supervisor:   supervisor@empresa.com / password');
    console.log('👤 Team Leader:  team_leader@empresa.com / password');
    console.log('👤 Employee:     employee@empresa.com / password');
    console.log('👤 Tech:         tech@example.com / password');
    console.log('━'.repeat(50));

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar
createDemoUsers()
  .then(() => {
    console.log('\n👋 Script finalizado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });



