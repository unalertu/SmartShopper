/**
 * Location service utilities.
 * Background geofencing will be integrated here after the core UI is done.
 */

import * as Location from "expo-location";

export const requestLocationPermissions = async (): Promise<boolean> => {
  const { status: foreground } =
    await Location.requestForegroundPermissionsAsync();
  if (foreground !== "granted") return false;

  const { status: background } =
    await Location.requestBackgroundPermissionsAsync();
  return background === "granted";
};

export const getCurrentLocation =
  async (): Promise<Location.LocationObject | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;

      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
    } catch {
      return null;
    }
  };

/**
 * Calculate haversine distance between two coordinates in meters.
 */
export const getDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};
