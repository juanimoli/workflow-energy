import SQLite from 'react-native-sqlite-storage';

// Enable promise API
SQLite.enablePromise(true);

class SQLiteService {
  constructor() {
    this.database = null;
  }

  async initDatabase() {
    try {
      this.database = await SQLite.openDatabase({
        name: 'WorkOrdersDB.db',
        location: 'default',
        createFromLocation: 1,
      });

      await this.createTables();
      console.log('SQLite database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error);
      throw error;
    }
  }

  async createTables() {
    const queries = [
      // Work Orders table
      `CREATE TABLE IF NOT EXISTS work_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        assigned_to INTEGER,
        created_by INTEGER,
        project_id INTEGER,
        team_id INTEGER,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        estimated_hours REAL,
        actual_hours REAL,
        due_date TEXT,
        location TEXT,
        equipment_id TEXT,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending',
        last_sync_at TEXT,
        version INTEGER DEFAULT 1
      )`,

      // Users table (cached data)
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT UNIQUE,
        email TEXT,
        first_name TEXT,
        last_name TEXT,
        role TEXT,
        team_id INTEGER,
        team_name TEXT,
        plant_id INTEGER,
        plant_name TEXT,
        last_sync_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Teams table (cached data)
      `CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY,
        name TEXT,
        description TEXT,
        leader_id INTEGER,
        plant_id INTEGER,
        last_sync_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Projects table (cached data)
      `CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY,
        name TEXT,
        description TEXT,
        status TEXT,
        start_date TEXT,
        end_date TEXT,
        plant_id INTEGER,
        last_sync_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Sync queue table
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        operation TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        retry_count INTEGER DEFAULT 0,
        last_error TEXT
      )`,

      // Attachments table
      `CREATE TABLE IF NOT EXISTS attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        work_order_id INTEGER,
        file_path TEXT,
        file_name TEXT,
        file_type TEXT,
        file_size INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending'
      )`,
    ];

    for (const query of queries) {
      await this.database.executeSql(query);
    }

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status)',
      'CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON work_orders(assigned_to)',
      'CREATE INDEX IF NOT EXISTS idx_work_orders_team_id ON work_orders(team_id)',
      'CREATE INDEX IF NOT EXISTS idx_work_orders_sync_status ON work_orders(sync_status)',
      'CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id)',
    ];

    for (const index of indexes) {
      await this.database.executeSql(index);
    }
  }

  async saveOfflineData(entityType, data, operation = 'create') {
    try {
      let localId;

      if (entityType === 'work_orders') {
        const query = `
          INSERT INTO work_orders (
            title, description, assigned_to, created_by, project_id, team_id,
            priority, status, estimated_hours, due_date, location, equipment_id,
            sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `;

        const params = [
          data.title,
          data.description,
          data.assignedTo,
          data.createdBy,
          data.projectId,
          data.teamId,
          data.priority || 'medium',
          data.status || 'pending',
          data.estimatedHours,
          data.dueDate,
          data.location,
          data.equipmentId,
        ];

        const result = await this.database.executeSql(query, params);
        localId = result[0].insertId;
      }

      // Add to sync queue
      await this.addToSyncQueue(entityType, localId, operation, data);

      return localId;
    } catch (error) {
      console.error('Failed to save offline data:', error);
      throw error;
    }
  }

  async getOfflineData(entityType, filters = {}) {
    try {
      let query = `SELECT * FROM ${entityType}`;
      const params = [];
      const whereConditions = [];

      // Add filters
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined) {
          whereConditions.push(`${key} = ?`);
          params.push(filters[key]);
        }
      });

      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      query += ` ORDER BY created_at DESC`;

      const result = await this.database.executeSql(query, params);
      const rows = [];
      
      for (let i = 0; i < result[0].rows.length; i++) {
        rows.push(result[0].rows.item(i));
      }

      return rows;
    } catch (error) {
      console.error('Failed to get offline data:', error);
      return [];
    }
  }

  async updateOfflineData(entityType, id, data) {
    try {
      const updateFields = [];
      const params = [];

      // Build dynamic update query
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
          updateFields.push(`${key} = ?`);
          params.push(data[key]);
        }
      });

      if (updateFields.length === 0) {
        return;
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateFields.push('sync_status = ?');
      params.push('pending');
      params.push(id);

      const query = `
        UPDATE ${entityType} 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;

      await this.database.executeSql(query, params);

      // Add to sync queue
      await this.addToSyncQueue(entityType, id, 'update', data);
    } catch (error) {
      console.error('Failed to update offline data:', error);
      throw error;
    }
  }

  async deleteOfflineData(entityType, id) {
    try {
      // Mark as deleted instead of actually deleting
      const query = `
        UPDATE ${entityType} 
        SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await this.database.executeSql(query, [id]);

      // Add to sync queue
      await this.addToSyncQueue(entityType, id, 'delete', {});
    } catch (error) {
      console.error('Failed to delete offline data:', error);
      throw error;
    }
  }

  async addToSyncQueue(entityType, entityId, operation, data) {
    try {
      const query = `
        INSERT INTO sync_queue (entity_type, entity_id, operation, data)
        VALUES (?, ?, ?, ?)
      `;

      await this.database.executeSql(query, [
        entityType,
        entityId,
        operation,
        JSON.stringify(data),
      ]);
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
      throw error;
    }
  }

  async getPendingChangesCount() {
    try {
      const result = await this.database.executeSql(
        'SELECT COUNT(*) as count FROM sync_queue'
      );
      return result[0].rows.item(0).count;
    } catch (error) {
      console.error('Failed to get pending changes count:', error);
      return 0;
    }
  }

  async getPendingSyncItems() {
    try {
      const result = await this.database.executeSql(
        'SELECT * FROM sync_queue ORDER BY created_at ASC'
      );
      
      const items = [];
      for (let i = 0; i < result[0].rows.length; i++) {
        const row = result[0].rows.item(i);
        items.push({
          ...row,
          data: JSON.parse(row.data),
        });
      }
      
      return items;
    } catch (error) {
      console.error('Failed to get pending sync items:', error);
      return [];
    }
  }

  async removeSyncItem(id) {
    try {
      await this.database.executeSql('DELETE FROM sync_queue WHERE id = ?', [id]);
    } catch (error) {
      console.error('Failed to remove sync item:', error);
      throw error;
    }
  }

  async updateSyncItemError(id, error) {
    try {
      await this.database.executeSql(
        'UPDATE sync_queue SET retry_count = retry_count + 1, last_error = ? WHERE id = ?',
        [error, id]
      );
    } catch (error) {
      console.error('Failed to update sync item error:', error);
      throw error;
    }
  }

  async cacheServerData(entityType, data) {
    try {
      // Clear existing data
      await this.database.executeSql(`DELETE FROM ${entityType}`);

      // Insert new data
      if (entityType === 'users') {
        for (const user of data) {
          await this.database.executeSql(`
            INSERT INTO users (
              id, username, email, first_name, last_name, role,
              team_id, team_name, plant_id, plant_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            user.id, user.username, user.email, user.firstName, user.lastName,
            user.role, user.teamId, user.teamName, user.plantId, user.plantName
          ]);
        }
      }
      // Add other entity types as needed
    } catch (error) {
      console.error('Failed to cache server data:', error);
      throw error;
    }
  }

  async clearAllData() {
    try {
      const tables = ['work_orders', 'sync_queue', 'attachments'];
      
      for (const table of tables) {
        await this.database.executeSql(`DELETE FROM ${table}`);
      }
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  }

  async closeDatabase() {
    try {
      if (this.database) {
        await this.database.close();
        this.database = null;
      }
    } catch (error) {
      console.error('Failed to close database:', error);
    }
  }
}

export const sqliteService = new SQLiteService();