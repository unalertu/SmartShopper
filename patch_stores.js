const fs = require('fs');
let content = fs.readFileSync('app/(tabs)/stores.tsx', 'utf8');

// 1. Add imports
content = content.replace(
  /import \{ create \} from 'zustand';/,
  `import { create } from 'zustand';\nimport { Alert } from 'react-native';\nimport { FREE_TIER, getMaxSavedStores } from '@/constants/tierConfig';`
);

// 2. Add canAddLocation and isPro
content = content.replace(
  /const \{ locations, addLocation, removeLocation, cachedMarkets, setCachedMarkets, isFetchingMarkets, setIsFetchingMarkets \} = useLocationStore\(\);/,
  `const { locations, addLocation, removeLocation, cachedMarkets, setCachedMarkets, isFetchingMarkets, setIsFetchingMarkets, canAddLocation } = useLocationStore();`
);
content = content.replace(
  /const \{ distanceUnit \} = useSettingsStore\(\);/,
  `const { distanceUnit, isPro } = useSettingsStore();`
);

// 3. Update the addLocation onPress
const oldPress = `onPress={() => {
                      hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                      addLocation({
                        name: selectedShopToSave.name || 'Unknown Store',`;

const newPress = `onPress={() => {
                      if (!canAddLocation(isPro)) {
                        Alert.alert(
                          'Location Limit Reached',
                          isPro
                            ? \`You've reached the maximum of \${getMaxSavedStores(isPro)} saved shops.\`
                            : \`You've reached the free limit of \${FREE_TIER.maxSavedStores} saved shops. Upgrade to Pro to save up to 20 shops.\`,
                          isPro
                            ? [{ text: 'OK' }]
                            : [
                                { text: 'OK', style: 'cancel' },
                                { text: 'Upgrade to Pro', onPress: () => router.push('/paywall') },
                              ]
                        );
                        return;
                      }
                      hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                      addLocation({
                        name: selectedShopToSave.name || 'Unknown Store',`;

content = content.replace(oldPress, newPress);

fs.writeFileSync('app/(tabs)/stores.tsx', content);
console.log('Patch applied.');
