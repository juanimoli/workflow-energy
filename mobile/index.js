import React from 'react';
import { AppRegistry } from 'react-native';
import { QueryClient, QueryClientProvider } from 'react-query';
import Toast from 'react-native-toast-message';

import App from './src/App';
import { AuthProvider } from './src/context/AuthContext';
import { OfflineProvider } from './src/context/OfflineContext';
import { name as appName } from './package.json';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

import React from 'react';
import { AppRegistry } from 'react-native';

import App from './src/App.simple';
import { name as appName } from './package.json';

AppRegistry.registerComponent(appName, () => App);

AppRegistry.registerComponent(appName, () => AppWithProviders);