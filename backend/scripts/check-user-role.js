const { connectDB, getDB } = require('../config/database');
require('dotenv').config();

async function checkUserRole() {
  try {
    await connectDB();
    const supabase = getDB();
    
    console.log('\n📊 USUARIOS Y SUS ROLES:\n');
    
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, email, first_name, last_name, role, team_id')
      .eq('is_active', true)
      .order('id');
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('No hay usuarios en la base de datos.');
      return;
    }
    
    users.forEach(user => {
      console.log(`ID: ${user.id}`);
      console.log(`  Nombre: ${user.first_name} ${user.last_name}`);
      console.log(`  Username: ${user.username}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Rol: ${user.role}`);
      console.log(`  Equipo: ${user.team_id || 'Sin equipo'}`);
      console.log('');
    });
    
    console.log('\n📝 RESUMEN:');
    const roleCounts = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`  ${role}: ${count}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUserRole();

