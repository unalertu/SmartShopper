const fs = require('fs');
let content = fs.readFileSync('app/(tabs)/stores.tsx', 'utf8');

// Patch 1: renderRightActions
const oldRenderRightActions = `        onPress={() => {
          hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
          removeLocation(locId);
          swipeableRefs.current.delete(locId);
          swipeableRefs.current.delete('context-' + locId);
          if (selectedShopToSave && (selectedShopToSave.id === locId || selectedShopToSave.id === \`saved-\${locId}\`)) {
            setSelectedShopToSave(null);
          }
        }}`;
const newRenderRightActions = `        onPress={() => {
          hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
          if (selectedShopToSave && (selectedShopToSave.id === locId || selectedShopToSave.id === \`saved-\${locId}\`)) {
            setSelectedShopToSave(null);
          }
          setTimeout(() => {
            removeLocation(locId);
            swipeableRefs.current.delete(locId);
            swipeableRefs.current.delete('context-' + locId);
          }, 400);
        }}`;
content = content.replace(oldRenderRightActions, newRenderRightActions);


// Patch 2: context menu delete action (Swipeable context menu ActionSheet)
const oldContextMenuDelete1 = `                            } else if (index === 2) {
                              hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
                              removeLocation(originalId);
                              swipeableRefs.current.delete(originalId);
                              swipeableRefs.current.delete('context-' + originalId);
                              setSelectedShopToSave(null);
                            }`;
const newContextMenuDelete1 = `                            } else if (index === 2) {
                              hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
                              setSelectedShopToSave(null);
                              setTimeout(() => {
                                removeLocation(originalId);
                                swipeableRefs.current.delete(originalId);
                                swipeableRefs.current.delete('context-' + originalId);
                              }, 400);
                            }`;
content = content.replace(oldContextMenuDelete1, newContextMenuDelete1);


// Patch 3: Context menu direct Remove button
const oldContextMenuDelete2 = `                  onPress={() => {
                    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
                    removeLocation(originalId);
                    swipeableRefs.current.delete(originalId);
                    swipeableRefs.current.delete('context-' + originalId);
                    setSelectedShopToSave(null);
                  }}`;
const newContextMenuDelete2 = `                  onPress={() => {
                    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
                    setSelectedShopToSave(null);
                    setTimeout(() => {
                      removeLocation(originalId);
                      swipeableRefs.current.delete(originalId);
                      swipeableRefs.current.delete('context-' + originalId);
                    }, 400);
                  }}`;
content = content.replace(oldContextMenuDelete2, newContextMenuDelete2);


// Patch 4: Context menu Save button (Add Shop)
const oldSaveButton = `                      hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                      addLocation({
                        name: selectedShopToSave.name || 'Unknown Store',
                        address: selectedShopToSave.address || 'Unknown Address',
                        latitude: selectedShopToSave.latitude,
                        longitude: selectedShopToSave.longitude,
                        radius: 500});
                      setSelectedShopToSave(null);
                    }}`;
const newSaveButton = `                      hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedShopToSave(null);
                      setTimeout(() => {
                        addLocation({
                          name: selectedShopToSave.name || 'Unknown Store',
                          address: selectedShopToSave.address || 'Unknown Address',
                          latitude: selectedShopToSave.latitude,
                          longitude: selectedShopToSave.longitude,
                          radius: 500});
                      }, 400);
                    }}`;
content = content.replace(oldSaveButton, newSaveButton);


fs.writeFileSync('app/(tabs)/stores.tsx', content);
console.log('Crash patch applied.');
