const logger = require('../utils/logger');

// Store connected clients
const connectedClients = new Map();

const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    // Store client connection
    connectedClients.set(socket.id, {
      socketId: socket.id,
      userId: null,
      connectedAt: new Date()
    });

    // Handle user authentication
    socket.on('authenticate', (data) => {
      try {
        const { userId, userRole } = data;
        
        // Update client info with user details
        const clientInfo = connectedClients.get(socket.id);
        if (clientInfo) {
          clientInfo.userId = userId;
          clientInfo.userRole = userRole;
          connectedClients.set(socket.id, clientInfo);
        }

        // Join user to their role-based room
        socket.join(`role-${userRole}`);
        socket.join(`user-${userId}`);
        
        logger.info(`User ${userId} (${userRole}) authenticated on socket ${socket.id}`);
        
        socket.emit('authenticated', { success: true });
      } catch (error) {
        logger.error('Socket authentication error:', error);
        socket.emit('authentication-error', { error: 'Authentication failed' });
      }
    });

    // Handle work order updates
    socket.on('work-order-update', (data) => {
      try {
        const { workOrderId, update, userId } = data;
        
        // Broadcast to all connected clients except sender
        socket.broadcast.emit('work-order-updated', {
          workOrderId,
          update,
          updatedBy: userId,
          timestamp: new Date()
        });
        
        logger.info(`Work order ${workOrderId} updated by user ${userId}`);
      } catch (error) {
        logger.error('Socket work order update error:', error);
      }
    });

    // Handle real-time notifications
    socket.on('send-notification', (data) => {
      try {
        const { targetUserId, targetRole, notification } = data;
        
        if (targetUserId) {
          // Send to specific user
          socket.to(`user-${targetUserId}`).emit('notification', notification);
        } else if (targetRole) {
          // Send to all users with specific role
          socket.to(`role-${targetRole}`).emit('notification', notification);
        } else {
          // Broadcast to all connected clients
          socket.broadcast.emit('notification', notification);
        }
        
        logger.info(`Notification sent: ${JSON.stringify(notification)}`);
      } catch (error) {
        logger.error('Socket notification error:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
      connectedClients.delete(socket.id);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });

  return io;
};

// Helper functions for broadcasting from routes
const broadcastWorkOrderUpdate = (io, workOrderId, update, userId) => {
  io.emit('work-order-updated', {
    workOrderId,
    update,
    updatedBy: userId,
    timestamp: new Date()
  });
};

const broadcastNotification = (io, notification, targetUserId = null, targetRole = null) => {
  if (targetUserId) {
    io.to(`user-${targetUserId}`).emit('notification', notification);
  } else if (targetRole) {
    io.to(`role-${targetRole}`).emit('notification', notification);
  } else {
    io.emit('notification', notification);
  }
};

const getConnectedClients = () => {
  return Array.from(connectedClients.values());
};

module.exports = {
  initializeSocket,
  broadcastWorkOrderUpdate,
  broadcastNotification,
  getConnectedClients
};