import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import {
  Home,
  MapPin,
  Users,
  User,
  Plus,
  X,
  PlusCircle,
  CheckCircle,
  ScanBarcode,
} from "lucide-react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

// ── Tab config: maps route name → icon + label ──
const TAB_CONFIG: Record<string, { label: string; Icon: any }> = {
  index:   { label: "Home",    Icon: Home },
  stores:  { label: "Stores",  Icon: MapPin },
  shared:  { label: "Shared",  Icon: Users },
  profile: { label: "Profile", Icon: User },
};

// ── Custom Tab Bar ──
function renderCustomTabBar({
  state,
  navigation,
  insets,
  isActionsMenuOpen,
  setIsActionsMenuOpen,
}: BottomTabBarProps & {
  insets: any;
  isActionsMenuOpen: boolean;
  setIsActionsMenuOpen: (val: boolean) => void;
}) {
  return (
    <>
      {/* Full-Screen Actions Menu Overlay */}
      {isActionsMenuOpen && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 110 }}>
          {/* Blur Backdrop with Tap-to-Dismiss */}
          <BlurView
            intensity={15}
            tint="light"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setIsActionsMenuOpen(false)}
              style={{ flex: 1 }}
            />
          </BlurView>

          {/* 2x2 Grid container */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: '100%', paddingHorizontal: 40, gap: 20 }}>
            {/* Card 1: New List */}
            <TouchableOpacity
              style={{
                backgroundColor: '#ffffff', borderRadius: 28, width: 105, height: 105, padding: 16, justifyContent: 'center', alignItems: 'center',
                shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 5,
              }}
              onPress={() => { setIsActionsMenuOpen(false); console.log("New Shopping List"); }}
            >
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <PlusCircle size={24} color="#0f172a" strokeWidth={2.5} />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#1e293b', textAlign: 'center', lineHeight: 16 }}>New List</Text>
            </TouchableOpacity>

            {/* Card 2: Add Location */}
            <TouchableOpacity
              style={{
                backgroundColor: '#ffffff', borderRadius: 28, width: 105, height: 105, padding: 16, justifyContent: 'center', alignItems: 'center',
                shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 5,
              }}
              onPress={() => { setIsActionsMenuOpen(false); console.log("Add Location"); }}
            >
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <MapPin size={24} color="#0f172a" strokeWidth={2.5} />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#1e293b', textAlign: 'center', lineHeight: 16 }}>Add{"\n"}Location</Text>
            </TouchableOpacity>

            {/* Card 3: Quick Add */}
            <TouchableOpacity
              style={{
                backgroundColor: '#ffffff', borderRadius: 28, width: 105, height: 105, padding: 16, justifyContent: 'center', alignItems: 'center',
                shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 5,
              }}
              onPress={() => { setIsActionsMenuOpen(false); console.log("Quick Item Add"); }}
            >
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <CheckCircle size={24} color="#0f172a" strokeWidth={2.5} />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#1e293b', textAlign: 'center', lineHeight: 16 }}>Quick Add</Text>
            </TouchableOpacity>

            {/* Card 4: Scan Item */}
            <TouchableOpacity
              style={{
                backgroundColor: '#ffffff', borderRadius: 28, width: 105, height: 105, padding: 16, justifyContent: 'center', alignItems: 'center',
                shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 5,
              }}
              onPress={() => { setIsActionsMenuOpen(false); console.log("Scan Item"); }}
            >
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <ScanBarcode size={24} color="#0f172a" strokeWidth={2.5} />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#1e293b', textAlign: 'center', lineHeight: 16 }}>Scan Item</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Floating Navigation Bar */}
      <BlurView
        tint="light"
        intensity={80}
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          borderRadius: 9999,
          overflow: 'hidden',
          zIndex: 50,
          bottom: insets.bottom > 0 ? insets.bottom : 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.1,
          shadowRadius: 24,
          elevation: 15,
        }}
      >
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(248, 250, 252, 0.8)', paddingLeft: 24, paddingRight: 8, paddingVertical: 8, borderRadius: 9999, borderTopWidth: 0.5, borderTopColor: "#f1f5f9" }}
        >
          {/* Map over actual Expo Router state.routes */}
          {state.routes.map((route, index) => {
            const config = TAB_CONFIG[route.name];
            if (!config) return null; // skip unregistered routes

            const isFocused = state.index === index;
            const { Icon, label } = config;

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={label}
                onPress={() => {
                  const event = navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
                style={{ alignItems: 'center', justifyContent: 'center' }}
              >
                {isFocused ? (
                  <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)', width: 48, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}>
                    <Icon size={22} color="#0f172a" strokeWidth={2.5} />
                  </View>
                ) : (
                  <View style={{ width: 48, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={22} color="#94a3b8" strokeWidth={2} />
                  </View>
                )}
                <Text
                  style={{ fontSize: 10, marginTop: 4, fontWeight: isFocused ? 'bold' : '600', color: isFocused ? '#0f172a' : '#94a3b8' }}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Floating Action Button */}
          <TouchableOpacity
            onPress={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
            style={{ backgroundColor: '#0f172a', borderRadius: 26, width: 52, height: 52, alignItems: 'center', justifyContent: 'center', marginLeft: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 }}
          >
            {isActionsMenuOpen ? (
              <X size={28} color="#fff" strokeWidth={2.5} />
            ) : (
              <Plus size={28} color="#fff" strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        </View>
      </BlurView>
    </>
  );
}

// ── Tab Layout ──
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  return (
    <Tabs
      tabBar={(props) => renderCustomTabBar({ ...props, insets, isActionsMenuOpen, setIsActionsMenuOpen })}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="stores" options={{ title: "Stores" }} />
      <Tabs.Screen name="shared" options={{ title: "Shared" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="locations" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
