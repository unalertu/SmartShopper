const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'app/(tabs)/index.tsx',
  'app/(tabs)/lists.tsx',
  'app/(tabs)/settings.tsx',
  'app/(tabs)/stores.tsx',
  'app/add-location.tsx',
  'app/list/[id].tsx',
  'app/notification-preferences.tsx'
];

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Replace import
    content = content.replace(
      /import \{ presentPaywallIfNeeded \} from "react-native-purchases-ui";/g,
      'import RevenueCatUI from "react-native-purchases-ui";'
    );

    // Replace usage
    content = content.replace(
      /presentPaywallIfNeeded\(\{ requiredEntitlementIdentifier: 'pro' \}\)/g,
      "RevenueCatUI.presentPaywallIfNeeded({ requiredEntitlementIdentifier: 'pro' })"
    );

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
});
