import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Clipboard } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { geoEngine } from '../services/geoEngine';
import { processLocationUpdate } from '../services/locationService';
import { ChevronLeft, RefreshCw, Play, Trash2, Copy, Navigation, Gauge, Database } from 'lucide-react-native';
import { useSettingsStore, useLocationStore, useShoppingListStore, useDebugStore } from '../store';

export default function DebugScreen() {
  const router = useRouter();
  const [realLocation, setRealLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Mock States
  const [mockSpeed, setMockSpeed] = useState<number>(1.5); // Default walking
  const [distanceOffset, setDistanceOffset] = useState<number>(0);
  const [hasActiveListLocal, setHasActiveListLocal] = useState<boolean>(false);

  const { savedStoresOnly } = useSettingsStore();
  const {
    cachedMarkets,
    setCachedMarkets,
    lastBackgroundFetchCoords
  } = useLocationStore();
  const { debugMetrics, debugLogs, clearDebugLogs } = useDebugStore();

  const fetchDebugData = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setRealLocation(loc);
      setHasActiveListLocal(await geoEngine.hasActiveShoppingList());
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  useEffect(() => {
    fetchDebugData();
    const interval = setInterval(fetchDebugData, 5000); 
    return () => clearInterval(interval);
  }, []);

  const getMockLocation = () => {
    if (!realLocation) return null;
    // Offset latitude. 1 degree latitude = ~111,320 meters
    const latOffset = distanceOffset / 111320;
    
    return {
      ...realLocation,
      coords: {
        ...realLocation.coords,
        latitude: realLocation.coords.latitude + latOffset,
        speed: mockSpeed
      }
    };
  };

  const handleSimulateBackgroundEvent = async () => {
    const mockLoc = getMockLocation();
    if (!mockLoc) return;
    try {
      await processLocationUpdate(mockLoc);
      setHasActiveListLocal(await geoEngine.hasActiveShoppingList());
    } catch (err: any) {
      setErrorMsg('Simulation failed: ' + err.message);
    }
  };

  const copyLogs = () => {
    Clipboard.setString(debugLogs.join('\n'));
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      <Stack.Screen
        options={{
          title: 'Developer Dashboard',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
              <ChevronLeft size={24} color="#0f172a" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={fetchDebugData} style={{ marginRight: 16 }}>
              <RefreshCw size={20} color="#0f172a" />
            </TouchableOpacity>
          )
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 64 }}>
        {errorMsg ? <Text style={{ color: 'red', marginBottom: 16 }}>{errorMsg}</Text> : null}

        {/* Dashboard Metrics */}
        <View style={{ backgroundColor: '#0f172a', padding: 16, borderRadius: 12, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Database size={20} color="#38bdf8" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>Live Metrics</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <View style={{ width: '48%', marginBottom: 12 }}>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>Executions</Text>
              <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>{debugMetrics.backgroundExecutions}</Text>
            </View>
            <View style={{ width: '48%', marginBottom: 12 }}>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>Cache Size</Text>
              <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>{cachedMarkets.length}</Text>
            </View>
            <View style={{ width: '48%', marginBottom: 12 }}>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>Overpass Fetches</Text>
              <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>{debugMetrics.overpassRequests}</Text>
            </View>
            <View style={{ width: '48%', marginBottom: 12 }}>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>Notifications</Text>
              <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>{debugMetrics.notificationsTriggered}</Text>
            </View>
            <View style={{ width: '48%' }}>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>Throttled Status</Text>
              <Text style={{ color: debugMetrics.fetchThrottled ? '#f59e0b' : '#22c55e', fontSize: 16, fontWeight: 'bold' }}>
                {debugMetrics.fetchThrottled ? 'Throttled' : 'Clear'}
              </Text>
            </View>
            <View style={{ width: '48%' }}>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>Active List Guard</Text>
              <Text style={{ color: hasActiveListLocal ? '#22c55e' : '#ef4444', fontSize: 16, fontWeight: 'bold' }}>
                {hasActiveListLocal ? 'Has Items' : 'Empty'}
              </Text>
            </View>
          </View>
        </View>

        {/* Controls */}
        <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#334155' }}>Simulation Parameters</Text>
          
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Gauge size={18} color="#64748b" style={{ marginRight: 8 }} />
              <Text style={{ fontWeight: '600', color: '#475569' }}>Mock Speed</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[ { label: 'Walk', val: 1.5 }, { label: 'Run', val: 4 }, { label: 'Drive', val: 20 }].map(s => (
                <TouchableOpacity 
                  key={s.label}
                  onPress={() => setMockSpeed(s.val)}
                  style={{ flex: 1, padding: 8, borderRadius: 8, backgroundColor: mockSpeed === s.val ? '#cbd5e1' : '#f1f5f9', alignItems: 'center' }}
                >
                  <Text style={{ fontWeight: mockSpeed === s.val ? 'bold' : 'normal' }}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Navigation size={18} color="#64748b" style={{ marginRight: 8 }} />
              <Text style={{ fontWeight: '600', color: '#475569' }}>Teleport Offset (Distance)</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[0, 200, 500, 1000, 2000, 3000].map(d => (
                  <TouchableOpacity 
                    key={d}
                    onPress={() => setDistanceOffset(d)}
                    style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: distanceOffset === d ? '#cbd5e1' : '#f1f5f9' }}
                  >
                    <Text style={{ fontWeight: distanceOffset === d ? 'bold' : 'normal' }}>{d}m</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <TouchableOpacity 
            onPress={() => setCachedMarkets([])}
            style={{ backgroundColor: '#fee2e2', padding: 12, borderRadius: 8, alignItems: 'center' }}
          >
            <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Wipe Cache (Force Cache Miss)</Text>
          </TouchableOpacity>
        </View>

        {/* Big Simulate Button */}
        <TouchableOpacity 
          onPress={handleSimulateBackgroundEvent}
          style={{ backgroundColor: '#3b82f6', padding: 18, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}
        >
          <Play size={24} color="white" style={{ marginRight: 8 }} />
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Simulate Background Event</Text>
        </TouchableOpacity>

        {/* Event Log */}
        <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 12, minHeight: 300 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#334155' }}>Event Log Trace</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={copyLogs}>
                <Copy size={20} color="#64748b" />
              </TouchableOpacity>
              <TouchableOpacity onPress={clearDebugLogs}>
                <Trash2 size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView style={{ backgroundColor: '#1e293b', borderRadius: 8, padding: 12, height: 250 }}>
            {debugLogs.length > 0 ? (
              debugLogs.map((log, i) => (
                <Text key={i} style={{ color: '#10b981', fontFamily: 'monospace', fontSize: 12, marginBottom: 4 }}>
                  {log}
                </Text>
              ))
            ) : (
              <Text style={{ color: '#64748b', fontStyle: 'italic', fontSize: 12 }}>No events recorded yet.</Text>
            )}
          </ScrollView>
        </View>

      </ScrollView>
    </View>
  );
}
