/**
 * Script para crear equipos y asignar usuarios
 * Ejecutar: node backend/scripts/setup-teams-and-users.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function setupTeamsAndUsers() {
  console.log('🚀 Configurando equipos y usuarios...\n');

  try {
    // ============================================
    // 1. CREAR EQUIPOS
    // ============================================
    console.log('📦 Creando equipos...\n');
    
    const teams = [
      { name: 'Equipo Alfa', description: 'Equipo de mantenimiento preventivo' },
      { name: 'Equipo Beta', description: 'Equipo de reparaciones urgentes' },
      { name: 'Equipo Gamma', description: 'Equipo de inspecciones' }
    ];

    const createdTeams = [];
    
    for (const team of teams) {
      const { data: existing } = await supabase
        .from('teams')
        .select('id, name')
        .eq('name', team.name)
        .single();

      if (existing) {
        console.log(`   ⚠️  Equipo ya existe: ${existing.name} (ID: ${existing.id})`);
        createdTeams.push(existing);
      } else {
        const { data: newTeam, error } = await supabase
          .from('teams')
          .insert(team)
          .select()
          .single();

        if (error) {
          console.log(`   ❌ Error creando ${team.name}: ${error.message}`);
        } else {
          console.log(`   ✅ Creado: ${newTeam.name} (ID: ${newTeam.id})`);
          createdTeams.push(newTeam);
        }
      }
    }

    if (createdTeams.length === 0) {
      console.log('\n❌ No se pudieron crear equipos. Abortando...');
      return;
    }

    const teamAlfa = createdTeams[0];
    const teamBeta = createdTeams[1] || createdTeams[0];

    // ============================================
    // 2. CREAR/ACTUALIZAR USUARIOS
    // ============================================
    console.log('\n👥 Creando/actualizando usuarios...\n');

    const commonPassword = await bcrypt.hash('password', 12);
    const adminPassword = await bcrypt.hash('123456', 12);

    const users = [
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
        team_id: teamAlfa.id,
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
        team_id: teamAlfa.id,
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
        team_id: teamBeta.id,
        plant_id: null,
        is_active: true
      }
    ];

    for (const user of users) {
      const { data: existing } = await supabase
        .from('users')
        .select('id, email, role, team_id')
        .eq('email', user.email)
        .single();

      if (existing) {
        // Actualizar usuario existente
        const { error: updateError } = await supabase
          .from('users')
          .update({
            password_hash: user.password_hash,
            team_id: user.team_id,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name
          })
          .eq('id', existing.id);

        if (updateError) {
          console.log(`   ❌ Error actualizando ${user.email}: ${updateError.message}`);
        } else {
          const teamName = user.team_id ? (user.team_id === teamAlfa.id ? teamAlfa.name : teamBeta.name) : 'Sin equipo';
          console.log(`   ✅ Actualizado: ${user.email} (${user.role}) → ${teamName}`);
        }
      } else {
        // Crear nuevo usuario
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert(user)
          .select()
          .single();

        if (insertError) {
          console.log(`   ❌ Error creando ${user.email}: ${insertError.message}`);
        } else {
          const teamName = user.team_id ? (user.team_id === teamAlfa.id ? teamAlfa.name : teamBeta.name) : 'Sin equipo';
          console.log(`   ✅ Creado: ${newUser.email} (${newUser.role}) → ${teamName}`);
        }
      }
    }

    // ============================================
    // 3. MOSTRAR RESUMEN
    // ============================================
    console.log('\n\n✅ ¡Configuración completada!\n');
    console.log('━'.repeat(60));
    console.log('📋 EQUIPOS CREADOS:');
    console.log('━'.repeat(60));
    createdTeams.forEach((team, i) => {
      console.log(`${i + 1}. ${team.name} (ID: ${team.id})`);
    });
    
    console.log('\n━'.repeat(60));
    console.log('👥 CREDENCIALES DE ACCESO:');
    console.log('━'.repeat(60));
    console.log(`👤 Admin (Sin equipo):`);
    console.log(`   📧 admin@empresa.com / 123456`);
    console.log(`\n👤 Supervisor (Sin equipo):`);
    console.log(`   📧 supervisor@empresa.com / password`);
    console.log(`\n👤 Team Leader (${teamAlfa.name}):`);
    console.log(`   📧 team_leader@empresa.com / password`);
    console.log(`\n👤 Employee (${teamAlfa.name}):`);
    console.log(`   📧 employee@empresa.com / password`);
    console.log(`\n👤 Técnico (${teamBeta.name}):`);
    console.log(`   📧 tech@example.com / password`);
    console.log('━'.repeat(60));

  } catch (error) {
    console.error('\n❌ Error general:', error);
  }
}

// Ejecutar
setupTeamsAndUsers()
  .then(() => {
    console.log('\n👋 Script finalizado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

