import RevenueCatUI from 'react-native-purchases-ui';
import Purchases from 'react-native-purchases';
import { Alert, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router } from 'expo-router';
import { useSettingsStore } from '@/store/useSettingsStore';

// The app has a single Pro tier, so any active entitlement means Pro.
// Judging only by the exact 'pro' identifier left Pro locked after a
// completed purchase whenever the dashboard entitlement id didn't match
// (easy to hit with Test Store products).
export const hasProEntitlement = (customerInfo: any): boolean => {
  const active = customerInfo?.entitlements?.active ?? {};
  return !!active['pro'] || Object.keys(active).length > 0;
};

// Re-read the entitlement from RevenueCat and mirror it into the settings
// store. Used to self-heal when the store flag and RevenueCat disagree.
export const syncProEntitlement = async (): Promise<boolean> => {
  const customerInfo = await Purchases.getCustomerInfo();
  const hasPro = hasProEntitlement(customerInfo);
  useSettingsStore.getState().setIsPro(hasPro);
  return hasPro;
};

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
      // Unlock immediately — a completed purchase through this paywall can
      // only be the Pro product, so don't gamble on the customer-info
      // listener (or the entitlement identifier) to flip the flag.
      useSettingsStore.getState().setIsPro(true);
      router.push('/purchase-success');
    } else if (paywallResult === RevenueCatUI.PAYWALL_RESULT.NOT_PRESENTED) {
      // RevenueCat already considers this user entitled, so no paywall was
      // shown — but the caller invoked us because the app still thinks Free.
      // Resync instead of silently doing nothing (previously this dead-ended:
      // entitled users tapped locked Pro rows and nothing happened).
      await syncProEntitlement();
    }
  } catch (error: any) {
    console.warn('Paywall error:', error);
    // If presentation fails (e.g., missing native module), fallback to our Pro screen
    router.push('/pro');
  }
};
