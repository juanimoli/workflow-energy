import React, { createContext, useContext, useReducer, useEffect } from 'react';
import NetInfo from '@react-native-netinfo/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { sqliteService } from '../services/sqliteService';
import { syncService } from '../services/syncService';

const OfflineContext = createContext();

const initialState = {
  isConnected: true,
  isSyncing: false,
  pendingChanges: 0,
  lastSyncTime: null,
  syncErrors: [],
};

const offlineReducer = (state, action) => {
  switch (action.type) {
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        isConnected: action.payload,
      };
    case 'SET_SYNC_STATUS':
      return {
        ...state,
        isSyncing: action.payload,
      };
    case 'SET_PENDING_CHANGES':
      return {
        ...state,
        pendingChanges: action.payload,
      };
    case 'SET_LAST_SYNC_TIME':
      return {
        ...state,
        lastSyncTime: action.payload,
      };
    case 'ADD_SYNC_ERROR':
      return {
        ...state,
        syncErrors: [...state.syncErrors, action.payload],
      };
    case 'CLEAR_SYNC_ERRORS':
      return {
        ...state,
        syncErrors: [],
      };
    default:
      return state;
  }
};

export const OfflineProvider = ({ children }) => {
  const [state, dispatch] = useReducer(offlineReducer, initialState);

  useEffect(() => {
    // Initialize offline capabilities
    initializeOffline();

    // Listen for network status changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !state.isConnected;
      const isNowOnline = state.isConnected;

      dispatch({ type: 'SET_CONNECTION_STATUS', payload: isNowOnline });

      // If we just came back online, trigger sync
      if (wasOffline && isNowOnline) {
        handleGoingOnline();
      }
    });

    return () => unsubscribe();
  }, []);

  const initializeOffline = async () => {
    try {
      // Initialize SQLite database
      await sqliteService.initDatabase();

      // Load last sync time
      const lastSync = await AsyncStorage.getItem('lastSyncTime');
      if (lastSync) {
        dispatch({ type: 'SET_LAST_SYNC_TIME', payload: new Date(lastSync) });
      }

      // Count pending changes
      const pendingCount = await sqliteService.getPendingChangesCount();
      dispatch({ type: 'SET_PENDING_CHANGES', payload: pendingCount });

    } catch (error) {
      console.error('Failed to initialize offline capabilities:', error);
    }
  };

  const handleGoingOnline = async () => {
    try {
      dispatch({ type: 'SET_SYNC_STATUS', payload: true });
      dispatch({ type: 'CLEAR_SYNC_ERRORS' });

      // Perform sync
      await syncService.performFullSync();

      // Update last sync time
      const now = new Date();
      await AsyncStorage.setItem('lastSyncTime', now.toISOString());
      dispatch({ type: 'SET_LAST_SYNC_TIME', payload: now });

      // Update pending changes count
      const pendingCount = await sqliteService.getPendingChangesCount();
      dispatch({ type: 'SET_PENDING_CHANGES', payload: pendingCount });

    } catch (error) {
      console.error('Sync failed after going online:', error);
      dispatch({ 
        type: 'ADD_SYNC_ERROR', 
        payload: { 
          timestamp: new Date(), 
          error: error.message 
        } 
      });
    } finally {
      dispatch({ type: 'SET_SYNC_STATUS', payload: false });
    }
  };

  const saveOfflineData = async (entityType, data, operation = 'create') => {
    try {
      // Save to local SQLite database
      const localId = await sqliteService.saveOfflineData(entityType, data, operation);

      // Update pending changes count
      const pendingCount = await sqliteService.getPendingChangesCount();
      dispatch({ type: 'SET_PENDING_CHANGES', payload: pendingCount });

      return localId;
    } catch (error) {
      console.error('Failed to save offline data:', error);
      throw error;
    }
  };

  const getOfflineData = async (entityType, filters = {}) => {
    try {
      return await sqliteService.getOfflineData(entityType, filters);
    } catch (error) {
      console.error('Failed to get offline data:', error);
      return [];
    }
  };

  const updateOfflineData = async (entityType, id, data) => {
    try {
      await sqliteService.updateOfflineData(entityType, id, data);

      // Update pending changes count
      const pendingCount = await sqliteService.getPendingChangesCount();
      dispatch({ type: 'SET_PENDING_CHANGES', payload: pendingCount });

    } catch (error) {
      console.error('Failed to update offline data:', error);
      throw error;
    }
  };

  const deleteOfflineData = async (entityType, id) => {
    try {
      await sqliteService.deleteOfflineData(entityType, id);

      // Update pending changes count
      const pendingCount = await sqliteService.getPendingChangesCount();
      dispatch({ type: 'SET_PENDING_CHANGES', payload: pendingCount });

    } catch (error) {
      console.error('Failed to delete offline data:', error);
      throw error;
    }
  };

  const manualSync = async () => {
    if (!state.isConnected) {
      throw new Error('No hay conexión a internet');
    }

    try {
      dispatch({ type: 'SET_SYNC_STATUS', payload: true });
      dispatch({ type: 'CLEAR_SYNC_ERRORS' });

      await syncService.performFullSync();

      // Update last sync time
      const now = new Date();
      await AsyncStorage.setItem('lastSyncTime', now.toISOString());
      dispatch({ type: 'SET_LAST_SYNC_TIME', payload: now });

      // Update pending changes count
      const pendingCount = await sqliteService.getPendingChangesCount();
      dispatch({ type: 'SET_PENDING_CHANGES', payload: pendingCount });

      return true;
    } catch (error) {
      console.error('Manual sync failed:', error);
      dispatch({ 
        type: 'ADD_SYNC_ERROR', 
        payload: { 
          timestamp: new Date(), 
          error: error.message 
        } 
      });
      throw error;
    } finally {
      dispatch({ type: 'SET_SYNC_STATUS', payload: false });
    }
  };

  const clearOfflineData = async () => {
    try {
      await sqliteService.clearAllData();
      dispatch({ type: 'SET_PENDING_CHANGES', payload: 0 });
      dispatch({ type: 'SET_LAST_SYNC_TIME', payload: null });
      await AsyncStorage.removeItem('lastSyncTime');
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  };

  const value = {
    ...state,
    initializeOffline,
    saveOfflineData,
    getOfflineData,
    updateOfflineData,
    deleteOfflineData,
    manualSync,
    clearOfflineData,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};