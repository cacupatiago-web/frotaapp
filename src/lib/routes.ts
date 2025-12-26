import type { Coordinates } from "./geocoding";

export interface RouteResult {
  points: Coordinates[];
  distanceKm: number;
  durationMin: number;
}

const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving";

export async function getRoute(start: Coordinates, end: Coordinates): Promise<RouteResult | null> {
  const coords = `${start.lng},${start.lat};${end.lng},${end.lat}`;
  const url = `${OSRM_BASE_URL}/${coords}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error("OSRM error", response.statusText);
      return null;
    }

    const data = await response.json();
    if (!data.routes || !data.routes.length) return null;

    const route = data.routes[0];
    const points: Coordinates[] = route.geometry.coordinates.map((c: [number, number]) => ({
      lng: c[0],
      lat: c[1],
    }));

    return {
      points,
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
    };
  } catch (error) {
    console.error("Erro ao obter rota do OSRM", error);
    return null;
  }
}
