import { useEffect, useRef, useState } from "react";

export type LiveLocationSource = "gps" | "ip";

export interface LiveLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  source: LiveLocationSource;
}

interface UseLiveLocationOptions {
  /** Se true, começa a escutar a localização em tempo real */
  enabled: boolean;
}

interface UseLiveLocationReturn {
  position: LiveLocation | null;
  isLoading: boolean;
  error: string | null;
}

export function useLiveLocation({ enabled }: UseLiveLocationOptions): UseLiveLocationReturn {
  const [position, setPosition] = useState<LiveLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const watcherIdRef = useRef<number | null>(null);
  const ipFetchedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      // limpar quando deixar de estar activo
      if (watcherIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watcherIdRef.current);
      }
      watcherIdRef.current = null;
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const handleGpsSuccess = (pos: GeolocationPosition) => {
      if (cancelled) return;
      setPosition({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        source: "gps",
      });
      setIsLoading(false);
    };

    const handleGpsError = () => {
      if (cancelled) return;
      // fallback por IP apenas uma vez
      if (!ipFetchedRef.current) {
        ipFetchedRef.current = true;
        fetch("https://ipapi.co/json/")
          .then((res) => res.json())
          .then((data) => {
            if (!data || !data.latitude || !data.longitude) {
              throw new Error("Sem dados de localização por IP");
            }
            if (cancelled) return;
            setPosition({
              lat: data.latitude,
              lng: data.longitude,
              source: "ip",
            });
            setIsLoading(false);
          })
          .catch(() => {
            if (cancelled) return;
            setError("Não foi possível obter a localização.");
            setIsLoading(false);
          });
      } else {
        setIsLoading(false);
      }
    };

    if (navigator.geolocation) {
      watcherIdRef.current = navigator.geolocation.watchPosition(handleGpsSuccess, handleGpsError, {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 10_000,
      });
    } else {
      handleGpsError();
    }

    return () => {
      cancelled = true;
      if (watcherIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watcherIdRef.current);
      }
      watcherIdRef.current = null;
    };
  }, [enabled]);

  return { position, isLoading, error };
}
