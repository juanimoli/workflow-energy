const { connectDB, getDB } = require('../config/database');
require('dotenv').config();

async function changeUserRole() {
  try {
    await connectDB();
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.log('\n📝 USO:');
      console.log('  node scripts/change-user-role.js <user_id> <new_role>');
      console.log('\nROLES VÁLIDOS:');
      console.log('  - employee');
      console.log('  - team_leader');
      console.log('  - supervisor');
      console.log('  - admin');
      console.log('\nEJEMPLO:');
      console.log('  node scripts/change-user-role.js 1 admin');
      process.exit(0);
    }
    
    const userId = parseInt(args[0]);
    const newRole = args[1];
    
    const validRoles = ['employee', 'team_leader', 'supervisor', 'admin'];
    
    if (!validRoles.includes(newRole)) {
      console.error(`❌ Rol inválido: ${newRole}`);
      console.log('Roles válidos:', validRoles.join(', '));
      process.exit(1);
    }
    
    const supabase = getDB();
    
    // Verificar que el usuario existe
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, username, email, first_name, last_name, role')
      .eq('id', userId)
      .single();
    
    if (fetchError || !user) {
      console.error(`❌ Usuario con ID ${userId} no encontrado`);
      process.exit(1);
    }
    
    console.log('\n👤 USUARIO ACTUAL:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Nombre: ${user.first_name} ${user.last_name}`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Rol actual: ${user.role}`);
    console.log(`  Nuevo rol: ${newRole}`);
    
    // Actualizar el rol
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId);
    
    if (updateError) {
      console.error('❌ Error al actualizar:', updateError);
      process.exit(1);
    }
    
    console.log('\n✅ Rol actualizado exitosamente!');
    console.log('\n💡 TIP: El usuario necesitará cerrar sesión y volver a iniciar para que los cambios surtan efecto.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

changeUserRole();

