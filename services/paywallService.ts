import RevenueCatUI from 'react-native-purchases-ui';
import Purchases from 'react-native-purchases';
import { Alert } from 'react-native';

export const showPaywall = async () => {
  try {
    const isConfigured = await Purchases.isConfigured();
    if (!isConfigured) {
      Alert.alert(
        'Paywall Unavailable',
        'RevenueCat is not configured. Please enter your API keys in _layout.tsx and rebuild.'
      );
      return;
    }
    await RevenueCatUI.presentPaywallIfNeeded({ requiredEntitlementIdentifier: 'pro' });
  } catch (error: any) {
    console.warn('Paywall error:', error);
    Alert.alert(
      'Paywall Unavailable',
      'Please make sure RevenueCat is properly configured with your API keys. Error: ' + (error.message || 'Unknown error')
    );
  }
};
