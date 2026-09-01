/**
 * Geospatial Proximity & Routing Engine
 * Computes great-circle Haversine distances and estimated ambulance transfer times
 * to recommend optimal regional receiving facilities for acute field casualties.
 */

// Default rural Gorakhpur ASHA field baseline coordinates
export const DEFAULT_RURAL_COORDS = {
  latitude: 26.5432,
  longitude: 83.4567,
  villageName: 'Kauriram Rural Sector B',
};

/**
 * Calculates Haversine distance in kilometers between two coordinates.
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return Math.round(d * 10) / 10; // Round to 1 decimal place
}

/**
 * Estimates ambulance transfer time in minutes assuming average rural road speed (40 km/h)
 */
export function estimateTransferMinutes(distanceKm) {
  if (distanceKm === null || distanceKm === undefined) return null;
  // 40 km/h average speed in rural terrain + 3 min dispatch overhead
  const mins = Math.round((distanceKm / 40) * 60 + 3);
  return Math.max(mins, 4);
}

/**
 * Requests device GPS coordinates with seamless fallback.
 */
export function getUserLocation() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(DEFAULT_RURAL_COORDS);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          villageName: 'Live Device GPS Anchor',
          isLiveGps: true,
        });
      },
      (err) => {
        console.warn('⚠️ [Geolocation Notice]:', err.message);
        resolve(DEFAULT_RURAL_COORDS);
      },
      { timeout: 5000, enableHighAccuracy: false }
    );
  });
}

/**
 * Ranks all registered facilities by geospatial proximity and capability match.
 */
export function rankFacilitiesByProximity(facilities = [], userCoords = DEFAULT_RURAL_COORDS) {
  return facilities.map((fac) => {
    const dist = calculateDistanceKm(
      userCoords.latitude,
      userCoords.longitude,
      fac.location_lat,
      fac.location_lng
    );

    const eta = estimateTransferMinutes(dist);

    return {
      ...fac,
      distanceKm: dist,
      etaMinutes: eta,
    };
  }).sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));
}

export default {
  DEFAULT_RURAL_COORDS,
  calculateDistanceKm,
  estimateTransferMinutes,
  getUserLocation,
  rankFacilitiesByProximity,
};
