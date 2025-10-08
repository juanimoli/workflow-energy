import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, Platform } from 'react-native';

import { useAuth } from './context/AuthContext';
import { useOffline } from './context/OfflineContext';

// Screens
import LoadingScreen from './screens/LoadingScreen';
import LoginScreen from './screens/LoginScreen';
import MainTabNavigator from './navigation/MainTabNavigator';
import WorkOrderDetailScreen from './screens/WorkOrderDetailScreen';
import CreateWorkOrderScreen from './screens/CreateWorkOrderScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';

// Services
import { notificationService } from './services/notificationService';
import { syncService } from './services/syncService';

const Stack = createStackNavigator();

const App = () => {
  const { user, loading, initializeAuth } = useAuth();
  const { initializeOffline } = useOffline();

  useEffect(() => {
    const initApp = async () => {
      try {
        // Initialize authentication
        await initializeAuth();
        
        // Initialize offline capabilities
        await initializeOffline();
        
        // Initialize notifications
        await notificationService.initialize();
        
        // Start background sync if user is authenticated
        if (user) {
          syncService.startBackgroundSync();
        }
      } catch (error) {
        console.error('App initialization error:', error);
      }
    };

    initApp();
  }, [user]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <StatusBar 
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
        backgroundColor="#1976d2"
      />
      
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1976d2',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!user ? (
          // Authentication Stack
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          // Main App Stack
          <>
            <Stack.Screen 
              name="MainTabs" 
              component={MainTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="WorkOrderDetail" 
              component={WorkOrderDetailScreen}
              options={({ route }) => ({ 
                title: route.params?.title || 'Detalle de Orden' 
              })}
            />
            <Stack.Screen 
              name="CreateWorkOrder" 
              component={CreateWorkOrderScreen}
              options={{ title: 'Nueva Orden de Trabajo' }}
            />
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen}
              options={{ title: 'Mi Perfil' }}
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{ title: 'Configuración' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;