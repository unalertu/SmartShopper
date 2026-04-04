import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
import {
  ShoppingCart,
  MapPin,
  Settings,
} from "lucide-react-native";
import { Colors } from "@/constants/Theme";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary[500],
        tabBarInactiveTintColor: Colors.surface[400],
        headerShown: false,
        tabBarStyle: {
          display: 'none',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Shopping List",
          tabBarIcon: ({ color, focused }) => (
            <View>
              <ShoppingCart
                size={focused ? 26 : 24}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="locations"
        options={{
          title: "Stores",
          tabBarIcon: ({ color, focused }) => (
            <View>
              <MapPin
                size={focused ? 26 : 24}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Settings
                size={focused ? 26 : 24}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
