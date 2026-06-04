const fs = require('fs');
let content = fs.readFileSync('app/(tabs)/stores.tsx', 'utf8');

const regex = /const snapPoints = useMemo\(\(\) => \{[\s\S]*?\}, \[savedShops\.length, selectedShopToSave\]\);/g;

const newSnapPoints = `const snapPoints = useMemo(() => {
    // Return a fixed array of exactly 3 elements to prevent bottom-sheet out-of-bounds crashes
    // when dynamically adding/removing items.
    const minPercent = selectedShopToSave ? '32%' : '18%';
    return [minPercent, '38%', '60%'];
  }, [selectedShopToSave]);`;

if (regex.test(content)) {
  content = content.replace(regex, newSnapPoints);
  fs.writeFileSync('app/(tabs)/stores.tsx', content);
  console.log('Fixed snapPoints in stores.tsx');
} else {
  console.log('Could not find snapPoints block to replace.');
}
