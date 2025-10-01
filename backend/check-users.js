require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkUsers() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, username, role');
    
  if (error) {
    console.log('Error:', error);
    return;
  }
  
  console.log('👥 Usuarios disponibles:');
  users.forEach(u => {
    console.log(`   ${u.email} (${u.username}) - ${u.role}`);
  });
}

checkUsers();