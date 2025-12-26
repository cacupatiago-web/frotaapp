import { useEffect, useMemo, useRef, useState } from "react";
import L, { type LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

import { getCoordinatesForLabel, type Coordinates } from "@/lib/geocoding";
import { getRoute } from "@/lib/routes";

interface TripRouteMapProps {
  origemLabel: string;
  destinoLabel: string;
}

export const TripRouteMap = ({ origemLabel, destinoLabel }: TripRouteMapProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routePoints, setRoutePoints] = useState<Coordinates[]>([]);
  const [start, setStart] = useState<Coordinates | null>(null);
  const [end, setEnd] = useState<Coordinates | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const [startCoords, endCoords] = await Promise.all([
          getCoordinatesForLabel(origemLabel),
          getCoordinatesForLabel(destinoLabel),
        ]);

        if (!startCoords || !endCoords) {
          setError("Não foi possível localizar a origem ou o destino no mapa.");
          setLoading(false);
          return;
        }

        setStart(startCoords);
        setEnd(endCoords);

        const route = await getRoute(startCoords, endCoords);
        if (!route) {
          setError("Não foi possível calcular a rota entre os pontos seleccionados.");
          setLoading(false);
          return;
        }

        setRoutePoints(route.points);
        setDistanceKm(route.distanceKm);
        setDurationMin(route.durationMin);
      } catch (e) {
        console.error(e);
        setError("Ocorreu um erro ao preparar o mapa da viagem.");
      } finally {
        setLoading(false);
      }
    };

    if (origemLabel && destinoLabel) {
      run();
    }
  }, [origemLabel, destinoLabel]);

  const hasRoute = routePoints.length > 1;

  const center = useMemo(() => {
    if (routePoints.length) {
      const first = routePoints[0];
      return [first.lat, first.lng] as [number, number];
    }
    if (start) {
      return [start.lat, start.lng] as [number, number];
    }
    return null;
  }, [routePoints, start]);

  // Inicializar mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !center) return;

    const map = L.map(mapContainerRef.current, {
      center: center as LatLngExpression,
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      routeLayerRef.current = null;
      startMarkerRef.current = null;
      endMarkerRef.current = null;
    };
  }, [center]);

  // Desenhar rota e marcadores
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Limpar camada anterior
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }
    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }
    if (endMarkerRef.current) {
      endMarkerRef.current.remove();
      endMarkerRef.current = null;
    }

    const boundsPoints: LatLngExpression[] = [];

    if (hasRoute) {
      const latLngs = routePoints.map<LatLngExpression>((p) => [p.lat, p.lng]);
      routeLayerRef.current = L.polyline(latLngs, {
        color: "#38bdf8",
        weight: 4,
        opacity: 0.9,
      }).addTo(map);
      boundsPoints.push(...latLngs);
    }

    if (start) {
      const pos: LatLngExpression = [start.lat, start.lng];
      startMarkerRef.current = L.marker(pos).addTo(map);
      boundsPoints.push(pos);
    }

    if (end) {
      const pos: LatLngExpression = [end.lat, end.lng];
      endMarkerRef.current = L.marker(pos).addTo(map);
      boundsPoints.push(pos);
    }

    if (boundsPoints.length > 1) {
      const bounds = L.latLngBounds(boundsPoints);
      map.fitBounds(bounds, { padding: [32, 32] });
    }
  }, [hasRoute, routePoints, start, end]);

  if (!origemLabel || !destinoLabel) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta viagem ainda não tem origem/destino definidos.
      </p>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (loading || (!routePoints.length && !start && !end)) {
    return (
      <p className="text-sm text-muted-foreground">
        A preparar o mapa da viagem...
      </p>
    );
  }

  if (!center) {
    return (
      <p className="text-sm text-muted-foreground">
        Não foi possível determinar a área inicial do mapa.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative h-48 w-full overflow-hidden rounded-xl border border-border/60 bg-muted">
        <div ref={mapContainerRef} className="h-full w-full" />
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>Este mapa utiliza dados abertos do OpenStreetMap e rota calculada pelo OSRM.</p>
        {distanceKm != null && (
          <p>
            <span className="font-medium">Distância:</span> {distanceKm.toFixed(1)} km
          </p>
        )}
        {durationMin != null && (
          <p>
            <span className="font-medium">Tempo estimado:</span> {Math.round(durationMin)} min
          </p>
        )}
      </div>
    </div>
  );
};
