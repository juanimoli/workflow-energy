const bcrypt = require('bcryptjs');
const { getDB } = require('../config/database');
const logger = require('../utils/logger');

const seedDatabase = async () => {
  try {
    const db = getDB();

    logger.info('Starting database seeding...');

    // Create plants
    const plantsResult = await db.query(`
      INSERT INTO plants (name, location, description) VALUES
      ('Planta Principal', 'Buenos Aires, Argentina', 'Planta principal de generación eléctrica'),
      ('Planta Norte', 'Córdoba, Argentina', 'Planta de distribución zona norte'),
      ('Planta Sur', 'Mendoza, Argentina', 'Planta de transmisión zona sur')
      RETURNING id, name
    `);

    const plants = plantsResult.rows;
    logger.info(`Created ${plants.length} plants`);

    // Create teams
    const teamsResult = await db.query(`
      INSERT INTO teams (name, description, plant_id) VALUES
      ('Equipo Mantenimiento A', 'Equipo de mantenimiento turno mañana', $1),
      ('Equipo Mantenimiento B', 'Equipo de mantenimiento turno tarde', $1),
      ('Equipo Operaciones', 'Equipo de operaciones generales', $2),
      ('Equipo Técnico', 'Equipo técnico especializado', $3)
      RETURNING id, name
    `, [plants[0].id, plants[1].id, plants[2].id, plants[0].id]);

    const teams = teamsResult.rows;
    logger.info(`Created ${teams.length} teams`);

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminResult = await db.query(`
      INSERT INTO users (username, email, password_hash, first_name, last_name, role, plant_id) VALUES
      ('admin', 'admin@empresa.com', $1, 'Administrador', 'Sistema', 'admin', $2)
      RETURNING id, username
    `, [adminPassword, plants[0].id]);

    const adminUser = adminResult.rows[0];
    logger.info(`Created admin user: ${adminUser.username}`);

    // Create supervisor
    const supervisorPassword = await bcrypt.hash('supervisor123', 10);
    const supervisorResult = await db.query(`
      INSERT INTO users (username, email, password_hash, first_name, last_name, role, plant_id, created_by) VALUES
      ('supervisor1', 'supervisor@empresa.com', $1, 'Carlos', 'Rodríguez', 'supervisor', $2, $3)
      RETURNING id, username
    `, [supervisorPassword, plants[0].id, adminUser.id]);

    const supervisor = supervisorResult.rows[0];
    logger.info(`Created supervisor: ${supervisor.username}`);

    // Create team leaders
    const teamLeaderPassword = await bcrypt.hash('leader123', 10);
    const teamLeadersData = [
      ['jefe1', 'jefe1@empresa.com', 'María', 'González', teams[0].id, plants[0].id],
      ['jefe2', 'jefe2@empresa.com', 'Roberto', 'Martínez', teams[1].id, plants[1].id],
      ['jefe3', 'jefe3@empresa.com', 'Ana', 'López', teams[2].id, plants[2].id]
    ];

    const teamLeaders = [];
    for (const [username, email, firstName, lastName, teamId, plantId] of teamLeadersData) {
      const result = await db.query(`
        INSERT INTO users (username, email, password_hash, first_name, last_name, role, team_id, plant_id, created_by) VALUES
        ($1, $2, $3, $4, $5, 'team_leader', $6, $7, $8)
        RETURNING id, username
      `, [username, email, teamLeaderPassword, firstName, lastName, teamId, plantId, adminUser.id]);
      
      teamLeaders.push(result.rows[0]);
      
      // Update team leader_id
      await db.query('UPDATE teams SET leader_id = $1 WHERE id = $2', [result.rows[0].id, teamId]);
    }

    logger.info(`Created ${teamLeaders.length} team leaders`);

    // Create employees
    const employeePassword = await bcrypt.hash('employee123', 10);
    const employeesData = [
      ['empleado1', 'empleado1@empresa.com', 'Juan', 'Pérez', teams[0].id, plants[0].id],
      ['empleado2', 'empleado2@empresa.com', 'Ana', 'García', teams[0].id, plants[0].id],
      ['empleado3', 'empleado3@empresa.com', 'Luis', 'Fernández', teams[1].id, plants[1].id],
      ['empleado4', 'empleado4@empresa.com', 'Carmen', 'Ruiz', teams[1].id, plants[1].id],
      ['empleado5', 'empleado5@empresa.com', 'Pedro', 'Sánchez', teams[2].id, plants[2].id],
      ['empleado6', 'empleado6@empresa.com', 'Laura', 'Torres', teams[2].id, plants[2].id]
    ];

    const employees = [];
    for (const [username, email, firstName, lastName, teamId, plantId] of employeesData) {
      const result = await db.query(`
        INSERT INTO users (username, email, password_hash, first_name, last_name, role, team_id, plant_id, created_by) VALUES
        ($1, $2, $3, $4, $5, 'employee', $6, $7, $8)
        RETURNING id, username
      `, [username, email, employeePassword, firstName, lastName, teamId, plantId, adminUser.id]);
      
      employees.push(result.rows[0]);
    }

    logger.info(`Created ${employees.length} employees`);

    // Create projects
    const projectsResult = await db.query(`
      INSERT INTO projects (name, description, plant_id, start_date, end_date) VALUES
      ('Mantenimiento Anual 2024', 'Proyecto de mantenimiento anual de equipos', $1, '2024-01-01', '2024-12-31'),
      ('Modernización Equipos', 'Proyecto de modernización de equipos obsoletos', $2, '2024-03-01', '2024-09-30'),
      ('Expansión Capacidad', 'Proyecto de expansión de capacidad de generación', $3, '2024-06-01', '2025-06-01')
      RETURNING id, name
    `, [plants[0].id, plants[1].id, plants[2].id]);

    const projects = projectsResult.rows;
    logger.info(`Created ${projects.length} projects`);

    // Create sample work orders
    const workOrdersData = [
      {
        title: 'Inspección turbina principal',
        description: 'Inspección rutinaria de la turbina principal',
        assignedTo: employees[0].id,
        createdBy: teamLeaders[0].id,
        projectId: projects[0].id,
        teamId: teams[0].id,
        priority: 'high',
        status: 'pending',
        estimatedHours: 8.0,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      },
      {
        title: 'Cambio de aceite generador 2',
        description: 'Cambio programado de aceite del generador 2',
        assignedTo: employees[1].id,
        createdBy: teamLeaders[0].id,
        projectId: projects[0].id,
        teamId: teams[0].id,
        priority: 'medium',
        status: 'in_progress',
        estimatedHours: 4.0,
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Revisión sistema eléctrico',
        description: 'Revisión completa del sistema eléctrico de la planta',
        assignedTo: employees[2].id,
        createdBy: teamLeaders[1].id,
        projectId: projects[1].id,
        teamId: teams[1].id,
        priority: 'critical',
        status: 'pending',
        estimatedHours: 16.0,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Limpieza filtros aire',
        description: 'Limpieza y reemplazo de filtros de aire',
        assignedTo: employees[3].id,
        createdBy: teamLeaders[1].id,
        projectId: projects[1].id,
        teamId: teams[1].id,
        priority: 'low',
        status: 'completed',
        estimatedHours: 2.0,
        actualHours: 1.5,
        startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      }
    ];

    for (const wo of workOrdersData) {
      await db.query(`
        INSERT INTO work_orders (
          title, description, assigned_to, created_by, project_id, team_id,
          priority, status, estimated_hours, actual_hours, due_date, started_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        wo.title, wo.description, wo.assignedTo, wo.createdBy, wo.projectId, wo.teamId,
        wo.priority, wo.status, wo.estimatedHours, wo.actualHours, wo.dueDate, wo.startedAt, wo.completedAt
      ]);
    }

    logger.info(`Created ${workOrdersData.length} work orders`);

    // Create sample notifications
    for (const employee of employees.slice(0, 3)) {
      await db.query(`
        INSERT INTO notifications (user_id, title, message, type) VALUES
        ($1, 'Nueva orden de trabajo asignada', 'Se te ha asignado una nueva orden de trabajo', 'info'),
        ($1, 'Recordatorio de vencimiento', 'Tienes una orden de trabajo que vence pronto', 'warning')
      `, [employee.id]);
    }

    logger.info('Created sample notifications');

    logger.info('Database seeding completed successfully!');
    
    // Display login credentials
    console.log('\n=== CREDENCIALES DE ACCESO ===');
    console.log('Admin: admin / admin123');
    console.log('Supervisor: supervisor1 / supervisor123');
    console.log('Jefe Equipo: jefe1 / leader123');
    console.log('Empleado: empleado1 / employee123');
    console.log('===============================\n');

  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  }
};

// Run seed if called directly
if (require.main === module) {
  const { connectDB } = require('../config/database');
  
  connectDB()
    .then(() => seedDatabase())
    .then(() => {
      logger.info('Database seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Database seeding process failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };