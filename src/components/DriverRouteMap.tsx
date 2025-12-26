import { useEffect, useMemo, useRef, useState } from "react";
import L, { type LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

import type { LiveLocation } from "@/hooks/use-live-location";
import { getCoordinatesForLabel, type Coordinates } from "@/lib/geocoding";
import { getRoute } from "@/lib/routes";

interface DriverRouteMapProps {
  /** Pontos de localização em tempo real do motorista */
  points: LiveLocation[];
  /** Rótulo de origem (ex: "Luanda, Cazenga") para rota planeada */
  origemLabel?: string;
  /** Rótulo de destino para rota planeada */
  destinoLabel?: string;
}

export const DriverRouteMap = ({ points, origemLabel, destinoLabel }: DriverRouteMapProps) => {
  // Usar apenas pontos de GPS para desenhar o trajecto percorrido (evita saltos IP → GPS)
  const gpsPoints = points.filter((p) => p.source === "gps");
  const travelledPoints = gpsPoints.length > 0 ? gpsPoints : points;

  const [plannedRoutePoints, setPlannedRoutePoints] = useState<Coordinates[]>([]);
  const [startCoords, setStartCoords] = useState<Coordinates | null>(null);
  const [endCoords, setEndCoords] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const plannedLayerRef = useRef<L.Polyline | null>(null);
  const travelledLayerRef = useRef<L.Polyline | null>(null);
  const currentMarkerRef = useRef<L.Marker | null>(null);
  const hasFittedBoundsRef = useRef(false);

  const lastLocation = travelledPoints.length ? travelledPoints[travelledPoints.length - 1] : null;

  const center = useMemo(() => {
    if (lastLocation) {
      return [lastLocation.lat, lastLocation.lng] as [number, number];
    }
    if (plannedRoutePoints.length) {
      const first = plannedRoutePoints[0];
      return [first.lat, first.lng] as [number, number];
    }
    if (startCoords) {
      return [startCoords.lat, startCoords.lng] as [number, number];
    }
    return null;
  }, [lastLocation, plannedRoutePoints, startCoords]);

  // Carregar rota planeada entre origem e destino (quando existirem labels)
  useEffect(() => {
    const run = async () => {
      if (!origemLabel || !destinoLabel) return;
      setError(null);

      try {
        const [start, end] = await Promise.all([
          getCoordinatesForLabel(origemLabel),
          getCoordinatesForLabel(destinoLabel),
        ]);

        if (!start || !end) {
          setError("Não foi possível localizar a origem ou o destino no mapa.");
          return;
        }

        setStartCoords(start);
        setEndCoords(end);

        const route = await getRoute(start, end);
        if (!route) {
          setError("Não foi possível calcular a rota planeada.");
          return;
        }

        setPlannedRoutePoints(route.points);
      } catch (e) {
        console.error(e);
        setError("Ocorreu um erro ao preparar a rota planeada.");
      }
    };

    run();
  }, [origemLabel, destinoLabel]);

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
      plannedLayerRef.current = null;
      travelledLayerRef.current = null;
      currentMarkerRef.current = null;
      hasFittedBoundsRef.current = false;
    };
  }, [center]);

  // Desenhar rota planeada (azul) e trajecto percorrido (verde) + marcador actual
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Limpar camadas anteriores
    if (plannedLayerRef.current) {
      plannedLayerRef.current.remove();
      plannedLayerRef.current = null;
    }
    if (travelledLayerRef.current) {
      travelledLayerRef.current.remove();
      travelledLayerRef.current = null;
    }

    const allPoints: LatLngExpression[] = [];

    if (plannedRoutePoints.length > 1) {
      const latLngs = plannedRoutePoints.map<LatLngExpression>((p) => [p.lat, p.lng]);
      plannedLayerRef.current = L.polyline(latLngs, {
        color: "#38bdf8",
        weight: 3.5,
        opacity: 0.9,
        dashArray: "4 4",
      }).addTo(map);
      allPoints.push(...latLngs);
    }

    if (travelledPoints.length > 1) {
      const latLngs = travelledPoints.map<LatLngExpression>((p) => [p.lat, p.lng]);
      travelledLayerRef.current = L.polyline(latLngs, {
        color: "#22c55e",
        weight: 4,
        opacity: 0.95,
      }).addTo(map);
      allPoints.push(...latLngs);
    }

    // Marcador da posição actual
    if (currentMarkerRef.current) {
      currentMarkerRef.current.remove();
      currentMarkerRef.current = null;
    }

    if (lastLocation) {
      const pos: LatLngExpression = [lastLocation.lat, lastLocation.lng];
      currentMarkerRef.current = L.marker(pos).addTo(map);
      allPoints.push(pos);
    }

    // Ajuste automático de bounds (apenas uma vez)
    if (!hasFittedBoundsRef.current && allPoints.length > 1) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [40, 40] });
      hasFittedBoundsRef.current = true;
    }
  }, [plannedRoutePoints, travelledPoints, lastLocation]);

  if (!center) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-xl border border-border/70 bg-card/80 text-xs text-muted-foreground">
        Aguardando dados de localização para iniciar o mapa.
      </div>
    );
  }

  return (
    <div className="relative h-64 w-full overflow-hidden rounded-xl border border-border/70 bg-card/80">
      {error && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4 text-center text-xs text-destructive bg-background/80">
          {error}
        </div>
      )}
      <div ref={mapContainerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center px-3 text-[10px] text-muted-foreground">
        <span>
          Rota planeada (azul) calculada com OSRM e trajecto percorrido (verde) baseado na localização em tempo real
          do motorista, sobre mapa aberto do OpenStreetMap.
        </span>
      </div>
    </div>
  );
};
