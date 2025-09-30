import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

// Simple Home Screen
const HomeScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Work Order Mobile</Text>
      <Text style={styles.subtitle}>Mobile App for Work Order Management</Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.navigate('WorkOrders')}
      >
        <Text style={styles.buttonText}>View Work Orders</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => Alert.alert('Feature', 'Login functionality coming soon!')}
      >
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => Alert.alert('Feature', 'Settings coming soon!')}
      >
        <Text style={styles.buttonText}>Settings</Text>
      </TouchableOpacity>
    </View>
  );
};

// Simple Work Orders Screen
const WorkOrdersScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Work Orders</Text>
      <Text style={styles.subtitle}>No work orders available</Text>
      <Text style={styles.description}>
        This screen will show work orders from the backend API.
        Connect to: http://localhost:3001/api
      </Text>
    </View>
  );
};

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ title: 'Work Order Mobile' }}
        />
        <Stack.Screen 
          name="WorkOrders" 
          component={WorkOrdersScreen}
          options={{ title: 'Work Orders' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    color: '#666',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginVertical: 10,
    minWidth: 200,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default App;