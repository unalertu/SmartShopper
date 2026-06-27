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
    
    // Add import if not exists
    if (!content.includes('react-native-purchases-ui')) {
      const importStatement = `import { presentPaywallIfNeeded } from "react-native-purchases-ui";\n`;
      // Insert after the last import statement or at the top
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const nextLineIndex = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, nextLineIndex + 1) + importStatement + content.slice(nextLineIndex + 1);
      } else {
        content = importStatement + content;
      }
    }

    // Replace router.push('/paywall')
    content = content.replace(/router\.push\(['"`]\/paywall['"`]\)/g, "presentPaywallIfNeeded({ requiredEntitlementIdentifier: 'pro' })");

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
});
