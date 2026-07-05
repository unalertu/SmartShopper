import RevenueCatUI from 'react-native-purchases-ui';
import Purchases from 'react-native-purchases';
import { Alert, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router } from 'expo-router';

export const showPaywall = async () => {
  try {
    // If running in Expo Go, RevenueCatUI requires a custom dev client.
    // Instead of crashing, redirect to the Pro screen.
    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (isExpoGo) {
      router.push('/pro');
      return;
    }

    const isConfigured = await Purchases.isConfigured();
    if (!isConfigured) {
      Alert.alert(
        'Paywall Unavailable',
        'RevenueCat is not configured. Please enter your API keys in _layout.tsx and rebuild.'
      );
      return;
    }
    const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({ requiredEntitlementIdentifier: 'pro' });
    if (paywallResult === RevenueCatUI.PAYWALL_RESULT.PURCHASED || paywallResult === RevenueCatUI.PAYWALL_RESULT.RESTORED) {
      router.push('/purchase-success');
    }
  } catch (error: any) {
    console.warn('Paywall error:', error);
    // If presentation fails (e.g., missing native module), fallback to our Pro screen
    router.push('/pro');
  }
};
