import { useMemo, useState, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { Car, MapPin, Route, Phone, Bell, Clock3, GaugeCircle, LogOut, CheckCircle, PlayCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DriverRouteMap } from "@/components/DriverRouteMap";
import { useLiveLocation, LiveLocation } from "@/hooks/use-live-location";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { TripRouteMap } from "@/components/TripRouteMap";
import { PROVINCIAS } from "@/shared/locations";

interface LocationState {
  driverName?: string;
}

type TripPurpose = "Entrega" | "Reunião" | "Reposição" | "Suporte" | "Outro";

interface ActiveTrip {
  id: string;
  origem: string;
  destino: string;
  proposito: TripPurpose;
  odometroInicial: number;
  inicioEm: Date;
}

interface CompletedTrip extends ActiveTrip {
  odometroFinal: number;
  fimEm: Date;
  duracaoMinutos: number;
}


const DriverDashboard = () => {
  const location = useLocation();
  const state = (location.state as LocationState) || {};
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar dados do perfil do motorista logado
  const { data: driverProfile } = useQuery({
    queryKey: ["driver-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const driverName = driverProfile?.full_name || state.driverName || "Motorista";
  const driverPhone = driverProfile?.phone || "";

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  // Buscar viagens atribuídas ao motorista
  const { data: assignedTrips = [], isLoading: isLoadingTrips } = useQuery({
    queryKey: ["driver-trips", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("driver_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const historicalTrips = useMemo(
    () => assignedTrips.filter((t: any) => t.status === "concluida"),
    [assignedTrips],
  );

  // Mutation para iniciar viagem
  const startTripMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const { data, error } = await supabase
        .from("trips")
        .update({ 
          status: "em_andamento",
          start_date: new Date().toISOString().split('T')[0]
        })
        .eq("id", tripId)
        .eq("driver_id", user?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-trips"] });
      toast({
        title: "Viagem iniciada",
        description: "A viagem está agora em curso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao iniciar viagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para concluir viagem atribuída (central)
  const finishTripMutation = useMutation({
    mutationFn: async ({ tripId, distance }: { tripId: string; distance: number }) => {
      const { data, error } = await supabase
        .from("trips")
        .update({
          status: "concluida",
          end_date: new Date().toISOString().split("T")[0],
          distance_km: distance,
        })
        .eq("id", tripId)
        .eq("driver_id", user?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-trips"] });
      toast({
        title: "Viagem concluída",
        description: "A viagem foi registada como concluída.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao concluir viagem",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  // Mutation para criar viagem local na tabela trips
  const createLocalTripMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from("trips").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onError: (error) => {
      toast({
        title: "Erro ao registar viagem",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  // Mutation para concluir viagem local e actualizar odómetro do veículo
  const finishLocalTripMutation = useMutation({
    mutationFn: async ({
      tripId,
      distanceKm,
      odometroFinal,
      vehicleId,
    }: {
      tripId: string;
      distanceKm: number | null;
      odometroFinal: number;
      vehicleId: string;
    }) => {
      const updates: any = {
        status: "concluida",
        end_date: new Date().toISOString().split("T")[0],
        odometer_end: odometroFinal,
      };
      if (distanceKm != null) {
        updates.distance_km = distanceKm;
      }

      const { error: tripError } = await supabase
        .from("trips")
        .update(updates)
        .eq("id", tripId)
        .eq("driver_id", user?.id);

      if (tripError) throw tripError;

      const { error: vehicleError } = await supabase
        .from("vehicles")
        .update({ odometro: odometroFinal })
        .eq("id", vehicleId)
        .eq("driver_id", user?.id);

      if (vehicleError) throw vehicleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-trips"] });
      queryClient.invalidateQueries({ queryKey: ["driver-vehicles"] });
      toast({
        title: "Viagem concluída",
        description: "A viagem foi registada e o odómetro actualizado.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao concluir viagem",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [history, setHistory] = useState<CompletedTrip[]>([]);
  const [routePoints, setRoutePoints] = useState<LiveLocation[]>([]);

  const [provinciaOrigem, setProvinciaOrigem] = useState<string>("");
  const [municipioOrigem, setMunicipioOrigem] = useState<string>("");
  const [bairroOrigem, setBairroOrigem] = useState<string>("");
  const [provinciaDestino, setProvinciaDestino] = useState<string>("");
  const [municipioDestino, setMunicipioDestino] = useState<string>("");
  const [bairroDestino, setBairroDestino] = useState<string>("");
  const [proposito, setProposito] = useState<TripPurpose>("Entrega");
  const [odometroInicial, setOdometroInicial] = useState<string>("");

  const [odometroFinal, setOdometroFinal] = useState<string>("");

  const { position, isLoading: isLocLoading } = useLiveLocation({ enabled: !!activeTrip });

  useMemo(() => {
    if (activeTrip && position) {
      setRoutePoints((prev) => [...prev, position]);
    }
  }, [position, activeTrip]);

  const [selectedTripForMap, setSelectedTripForMap] = useState<ActiveTrip | CompletedTrip | null>(null);
  const [isTripMapOpen, setIsTripMapOpen] = useState(false);

  const provinciaOrigemActual = PROVINCIAS.find((p) => p.nome === provinciaOrigem);
  const municipiosOrigem = provinciaOrigemActual?.municipios ?? [];
  const municipioOrigemActual = municipiosOrigem.find((m) => m.nome === municipioOrigem);
  const bairrosOrigem = municipioOrigemActual?.bairros ?? [];

  const provinciaDestinoActual = PROVINCIAS.find((p) => p.nome === provinciaDestino);
  const municipiosDestino = provinciaDestinoActual?.municipios ?? [];
  const municipioDestinoActual = municipiosDestino.find((m) => m.nome === municipioDestino);
  const bairrosDestino = municipioDestinoActual?.bairros ?? [];

  const origemLabel = [provinciaOrigem, municipioOrigem, bairroOrigem].filter(Boolean).join(" · ");
  const destinoLabel = [provinciaDestino, municipioDestino, bairroDestino].filter(Boolean).join(" · ");

  const handleStartTrip = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!temViaturaAtribuida || !assignedVehicle) {
      toast({
        title: "Sem viatura atribuída",
        description: "Peça ao administrador para lhe atribuir uma viatura antes de iniciar viagens.",
        variant: "destructive",
      });
      return;
    }

    if (!provinciaOrigem || !municipioOrigem || !bairroOrigem) {
      toast({
        title: "Defina a localização de partida",
        description: "Seleccione Província, Município e Bairro de origem.",
        variant: "destructive",
      });
      return;
    }

    if (!provinciaDestino || !municipioDestino || !bairroDestino) {
      toast({
        title: "Defina o destino",
        description: "Seleccione Província, Município e Bairro de destino.",
        variant: "destructive",
      });
      return;
    }

    const odometroInicialNumber = Number(odometroInicial.replace(",", "."));
    if (!Number.isFinite(odometroInicialNumber) || odometroInicialNumber < 0) {
      toast({
        title: "Odómetro inválido",
        description: "Insira um valor numérico válido para o odómetro inicial.",
        variant: "destructive",
      });
      return;
    }

    const origemLabel = [provinciaOrigem, municipioOrigem, bairroOrigem].filter(Boolean).join(" · ");
    const destinoLabel = [provinciaDestino, municipioDestino, bairroDestino].filter(Boolean).join(" · ");

    try {
      const createdTrip: any = await createLocalTripMutation.mutateAsync({
        user_id: user?.id,
        vehicle_id: assignedVehicle.id,
        driver_id: user?.id,
        driver_name: driverName,
        start_date: new Date().toISOString().split("T")[0],
        end_date: null,
        distance_km: null,
        estimated_cost: null,
        status: "em_andamento",
        notes: proposito,
        origem_label: origemLabel,
        destino_label: destinoLabel,
        odometer_start: odometroInicialNumber,
        odometer_end: null,
      });

      const novaViagem: ActiveTrip = {
        id: createdTrip.id,
        origem: origemLabel,
        destino: destinoLabel,
        proposito,
        odometroInicial: odometroInicialNumber,
        inicioEm: new Date(),
      };

      setActiveTrip(novaViagem);
      setRoutePoints(position ? [position] : []);

      queryClient.invalidateQueries({ queryKey: ["driver-trips"] });

      toast({
        title: "Viagem iniciada",
        description: "A rota está agora a ser seguida em tempo real.",
      });
    } catch {
      // o toast de erro já é tratado na mutation
    }
  };

  const handleFinishTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) return;

    const odometroFinalNumber = Number(odometroFinal.replace(",", "."));
    if (!Number.isFinite(odometroFinalNumber) || odometroFinalNumber < activeTrip.odometroInicial) {
      toast({
        title: "Odómetro final inválido",
        description: "O odómetro final deve ser maior ou igual ao inicial.",
        variant: "destructive",
      });
      return;
    }

    const fimEm = new Date();
    const duracaoMinutos = Math.max(1, Math.round((fimEm.getTime() - activeTrip.inicioEm.getTime()) / 60000));
    const distanciaKm = odometroFinalNumber - activeTrip.odometroInicial;
    const distanceValue = distanciaKm > 0 ? distanciaKm : null;

    try {
      if (!assignedVehicle) {
        throw new Error("Nenhuma viatura atribuída encontrada.");
      }

      await finishLocalTripMutation.mutateAsync({
        tripId: activeTrip.id,
        distanceKm: distanceValue,
        odometroFinal: odometroFinalNumber,
        vehicleId: assignedVehicle.id,
      });

      const viagemConcluida: CompletedTrip = {
        ...activeTrip,
        odometroFinal: odometroFinalNumber,
        fimEm,
        duracaoMinutos,
      };

      setHistory((prev) => [viagemConcluida, ...prev]);
      setActiveTrip(null);
      setRoutePoints([]);
      setOdometroFinal("");

      toast({
        title: "Viagem concluída",
        description: "Os dados foram registados no histórico local.",
      });
    } catch {
      // erro já tratado na mutation
    }
  };

  const viagensAtivas = activeTrip ? [activeTrip] : [];

  // Viaturas atribuídas ao motorista
  const { data: assignedVehicles = [], isLoading: isLoadingVehicles } = useQuery({
    queryKey: ["driver-vehicles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, placa, marca, modelo, status, odometro")
        .eq("driver_id", user.id)
        .eq("status", "em_operacao");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const temViaturaAtribuida = assignedVehicles.length > 0;
  const assignedVehicle = temViaturaAtribuida ? assignedVehicles[0] : null;

  useEffect(() => {
    if (assignedVehicle && !activeTrip) {
      if (assignedVehicle.odometro != null) {
        setOdometroInicial(String(assignedVehicle.odometro));
      }
    }
  }, [assignedVehicle, activeTrip]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-accent text-primary-foreground shadow-md">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Painel do Motorista</p>
              <p className="text-sm font-semibold">{driverName}</p>
            </div>
            <Badge variant="secondary" className="ml-1 text-[11px]">
              Motorista
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Link to="/" className="hover:text-primary">
                Página inicial
              </Link>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container space-y-8 py-8 md:py-10">
        {/* Viatura atribuída ao motorista */}
        <section>
          <Card>
            <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Viatura atribuída</CardTitle>
                <CardDescription>
                  Informação rápida sobre a viatura actualmente associada a este motorista.
                </CardDescription>
              </div>
              {assignedVehicle && (
                <Badge variant="outline" className="mt-2 md:mt-0 text-[11px]">
                  Em operação
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {isLoadingVehicles ? (
                <div className="py-4 text-sm text-muted-foreground">A carregar dados da viatura...</div>
              ) : !assignedVehicle ? (
                <div className="rounded-lg border border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
                  <p className="mb-1">Nenhuma viatura foi ainda atribuída a este motorista.</p>
                  <p className="text-xs">
                    Assim que a gestão associar uma viatura a si, os dados como matrícula, modelo e odómetro
                    aparecerão aqui.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3 text-sm">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Identificação
                    </p>
                    <p className="font-semibold">
                      {assignedVehicle.marca} {assignedVehicle.modelo}
                    </p>
                    <p className="text-xs text-muted-foreground">Matrícula: {assignedVehicle.placa}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Odómetro actual
                    </p>
                    <p className="text-sm">
                      {assignedVehicle.odometro != null ? `${assignedVehicle.odometro} km` : "Sem registo"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Este valor é usado como sugestão para o odómetro inicial da próxima viagem.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Estado
                    </p>
                    <p className="text-sm">
                      {assignedVehicle.status === "em_operacao"
                        ? "Em operação"
                        : assignedVehicle.status === "em_manutencao"
                          ? "Em manutenção"
                          : "Parado"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Contacte a gestão se precisar de alterar a viatura atribuída.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Viagens Atribuídas */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Viagens atribuídas</CardTitle>
              <CardDescription>
                Viagens que foram atribuídas a si pela gestão. Inicie e conclua as viagens conforme necessário.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTrips ? (
                <div className="text-center text-muted-foreground py-8">
                  A carregar viagens...
                </div>
              ) : assignedTrips.length === 0 ? (
                <div className="rounded-lg border border-border/70 bg-background/60 p-6 text-center text-muted-foreground">
                  <p className="mb-2">Nenhuma viagem atribuída no momento.</p>
                  <p className="text-xs">
                    As viagens atribuídas pela gestão aparecerão aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignedTrips.map((trip) => (
                    <div
                      key={trip.id}
                      className="rounded-lg border border-border/70 bg-background/60 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-sm">{trip.driver_name}</h3>
                            <Badge 
                              variant={
                                trip.status === "concluida" 
                                  ? "default" 
                                  : trip.status === "em_andamento" 
                                  ? "secondary" 
                                  : "outline"
                              }
                              className="text-[11px]"
                            >
                              {trip.status === "planeada" && "Planeada"}
                              {trip.status === "em_andamento" && "Em Andamento"}
                              {trip.status === "concluida" && "Concluída"}
                              {trip.status === "cancelada" && "Cancelada"}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>
                              <span className="font-medium">Data início:</span> {trip.start_date}
                            </p>
                            {trip.end_date && (
                              <p>
                                <span className="font-medium">Data fim:</span> {trip.end_date}
                              </p>
                            )}
                            {trip.distance_km && (
                              <p>
                                <span className="font-medium">Distância:</span> {trip.distance_km} km
                              </p>
                            )}
                            {trip.notes && (
                              <p>
                                <span className="font-medium">Notas:</span> {trip.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {trip.status === "planeada" && (
                            <Button
                              size="sm"
                              onClick={() => startTripMutation.mutate(trip.id)}
                              disabled={startTripMutation.isPending}
                            >
                              <PlayCircle className="mr-2 h-4 w-4" />
                              Iniciar
                            </Button>
                          )}
                          {trip.status === "em_andamento" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const distance = prompt("Insira a distância percorrida (km):");
                                if (distance && !isNaN(Number(distance))) {
                                  finishTripMutation.mutate({
                                    tripId: trip.id,
                                    distance: Number(distance),
                                  });
                                }
                              }}
                              disabled={finishTripMutation.isPending}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Concluir
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gestão de viagens</CardTitle>
              <CardDescription>
                Inicie e conclua viagens com registo de localização, propósito e odómetro.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-xs md:text-sm">
              <form onSubmit={handleStartTrip} className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-medium">Iniciar viagem</h2>
                  <Badge variant="outline" className="text-[11px]">
                    {activeTrip ? "Viagem em curso" : "Aguardando início"}
                  </Badge>
                </div>

                <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Localização de partida
                    </span>
                  </div>

                  <div className="grid gap-2 md:grid-cols-3">
                    <select
                      value={provinciaOrigem}
                      onChange={(e) => {
                        setProvinciaOrigem(e.target.value);
                        setMunicipioOrigem("");
                        setBairroOrigem("");
                      }}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Província</option>
                      {PROVINCIAS.map((p) => (
                        <option key={p.nome} value={p.nome}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                    <select
                      value={municipioOrigem}
                      onChange={(e) => {
                        setMunicipioOrigem(e.target.value);
                        setBairroOrigem("");
                      }}
                      disabled={!provinciaOrigem}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none disabled:cursor-not-allowed disabled:opacity-50 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Município</option>
                      {municipiosOrigem.map((m) => (
                        <option key={m.nome} value={m.nome}>
                          {m.nome}
                        </option>
                      ))}
                    </select>
                    <select
                      value={bairroOrigem}
                      onChange={(e) => setBairroOrigem(e.target.value)}
                      disabled={!municipioOrigem}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none disabled:cursor-not-allowed disabled:opacity-50 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Bairro</option>
                      {bairrosOrigem.map((b) => (
                        <option key={b.nome} value={b.nome}>
                          {b.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-3">
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Destino
                  </span>
                  <div className="grid gap-2 md:grid-cols-3">
                    <select
                      value={provinciaDestino}
                      onChange={(e) => {
                        setProvinciaDestino(e.target.value);
                        setMunicipioDestino("");
                        setBairroDestino("");
                      }}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Província</option>
                      {PROVINCIAS.map((p) => (
                        <option key={p.nome} value={p.nome}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                    <select
                      value={municipioDestino}
                      onChange={(e) => {
                        setMunicipioDestino(e.target.value);
                        setBairroDestino("");
                      }}
                      disabled={!provinciaDestino}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none disabled:cursor-not-allowed disabled:opacity-50 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Município</option>
                      {municipiosDestino.map((m) => (
                        <option key={m.nome} value={m.nome}>
                          {m.nome}
                        </option>
                      ))}
                    </select>
                    <select
                      value={bairroDestino}
                      onChange={(e) => setBairroDestino(e.target.value)}
                      disabled={!municipioDestino}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none disabled:cursor-not-allowed disabled:opacity-50 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Bairro</option>
                      {bairrosDestino.map((b) => (
                        <option key={b.nome} value={b.nome}>
                          {b.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {origemLabel && destinoLabel && (
                  <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-3">
                    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Pré-visualização da rota
                    </span>
                    <div className="w-full rounded-md border border-border/60 bg-card">
                      <TripRouteMap origemLabel={origemLabel} destinoLabel={destinoLabel} />
                    </div>
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Propósito</label>
                    <select
                      value={proposito}
                      onChange={(e) => setProposito(e.target.value as TripPurpose)}
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="Entrega">Entrega</option>
                      <option value="Reunião">Reunião</option>
                      <option value="Reposição">Reposição</option>
                      <option value="Suporte">Suporte</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div className="space-y-1 md:col-span-2 md:text-right">
                    <label className="text-[11px] font-medium text-muted-foreground">Odómetro inicial (km)</label>
                    <input
                      value={odometroInicial}
                      onChange={(e) => setOdometroInicial(e.target.value)}
                      type="number"
                      min={0}
                      step={0.1}
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none md:w-40 md:text-right ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3 text-primary" />
                    <span>
                      {position
                        ? `Localização em tempo real activa (${position.source === "gps" ? "GPS" : "IP"}).`
                        : isLocLoading
                          ? "A obter localização..."
                          : temViaturaAtribuida
                            ? "A localização será usada quando a viagem iniciar."
                            : "Atribuição de viatura pendente pela administração."}
                    </span>
                  </div>
                  <Button type="submit" size="sm" disabled={!!activeTrip}>
                    Iniciar viagem
                  </Button>
                </div>
              </form>

              <form onSubmit={handleFinishTrip} className="space-y-3 border-t border-dashed border-border/70 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-medium">Concluir viagem</h2>
                  {activeTrip && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock3 className="h-3 w-3 text-primary" />
                      Viagem iniciada às {activeTrip.inicioEm.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[11px] font-medium text-muted-foreground">Localização final</label>
                    <p className="h-8 w-full rounded-md border border-dashed border-input bg-muted/40 px-2 text-xs leading-8 text-muted-foreground">
                      {position
                        ? `Última posição: lat ${position.lat.toFixed(4)} · lng ${position.lng.toFixed(4)} (${position.source === "gps" ? "GPS" : "IP aproximado"})`
                        : "A localização final será registada automaticamente pela central com base no GPS."}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Odómetro final (km)</label>
                    <input
                      value={odometroFinal}
                      onChange={(e) => setOdometroFinal(e.target.value)}
                      type="number"
                      min={0}
                      step={0.1}
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] text-muted-foreground">
                    Ao concluir, a viagem será movida para o histórico local deste dispositivo.
                  </p>
                  <Button type="submit" size="sm" variant="secondary" disabled={!activeTrip}>
                    Concluir viagem
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Perfil do motorista</CardTitle>
                <CardDescription>Resumo rápido do seu estado actual.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs md:text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                    {driverName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{driverName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {driverPhone ? `Tel: ${driverPhone}` : "Motorista · Frota corporativa"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <GaugeCircle className="h-3 w-3 text-primary" />
                  <span>
                    {activeTrip
                      ? "Em rota - viagens em curso visíveis em tempo real pela central."
                      : "Disponível - aguardando nova atribuição de viagem."}
                  </span>
                </div>
                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <p>• Viagens concluídas (sessão actual): {history.length}</p>
                  <p>• Último destino:{" "}
                    {history[0]?.destino ? history[0].destino : "Ainda sem viagens concluídas"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Alertas da central</CardTitle>
                <CardDescription>Alertas baseados nas viagens atribuídas ao motorista.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs md:text-sm">
                {assignedTrips.filter((t: any) => t.status === "planeada" || t.status === "em_andamento").length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem alertas activos no momento.</p>
                ) : (
                  <ul className="space-y-2">
                    {assignedTrips
                      .filter((t: any) => t.status === "planeada" || t.status === "em_andamento")
                      .map((trip: any) => (
                        <li
                          key={trip.id}
                          className="flex items-start justify-between gap-3 rounded-md border border-border/70 bg-background/60 p-2"
                        >
                          <div className="flex gap-2">
                            <div className="mt-0.5">
                              <Bell className="h-3 w-3 text-primary" />
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                {trip.status === "planeada" ? "Viagem planeada" : "Viagem em andamento"}
                              </p>
                              <p className="text-xs text-foreground">
                                {trip.vehicle
                                  ? `Viatura ${trip.vehicle.placa} · ${trip.vehicle.marca} ${trip.vehicle.modelo}`
                                  : "Viagem atribuída"}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Data início: {trip.start_date}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Contactos de suporte</CardTitle>
                <CardDescription>Contactos ilustrativos da central e assistência.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs md:text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-primary" />
                  <span>Central de operação: +244 900 000 000</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-primary" />
                  <span>Assistência 24/7: +244 911 111 111</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rastreamento GPS em tempo real</CardTitle>
              <CardDescription>
                Mapa realista com dados OpenStreetMap (OSRM) e rota planeada (azul) sobreposta ao trajecto
                percorrido em tempo real (verde).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs md:text-sm">
              <DriverRouteMap points={routePoints} origemLabel={origemLabel} destinoLabel={destinoLabel} />
              <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-primary" />
                  {position ? (
                    <span>
                      Última posição: lat {position.lat.toFixed(4)} · lng {position.lng.toFixed(4)} ({
                        position.source === "gps" ? "GPS" : "IP aproximado"
                      })
                    </span>
                  ) : isLocLoading ? (
                    <span>A obter localização actual...</span>
                  ) : (
                    <span>
                      A localização só é activada durante uma viagem. Conceda permissão de GPS no navegador para maior
                      precisão.
                    </span>
                  )}
                </div>
                <span className="hidden text-[11px] text-muted-foreground md:inline">
                  Actualização contínua enquanto a viagem estiver em curso.
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Viagens activas e histórico</CardTitle>
              <CardDescription>Visão geral desta sessão no dispositivo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs md:text-sm">
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground">Viagem activa</p>
                {viagensAtivas.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma viagem em curso neste momento.</p>
                ) : (
                  viagensAtivas.map((v) => (
                    <div
                      key={v.id}
                      className="space-y-1 rounded-md border border-border/70 bg-background/60 p-2 text-xs"
                    >
                      <p className="font-medium">
                        {v.origem} → {v.destino}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Propósito: {v.proposito}</p>
                      <p className="text-[11px] text-muted-foreground">Odómetro inicial: {v.odometroInicial} km</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-1 h-6 px-2 text-[10px]"
                        onClick={() => {
                          setSelectedTripForMap(v);
                          setIsTripMapOpen(true);
                        }}
                      >
                        <MapPin className="mr-1 h-3 w-3" /> Ver mapa
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-1 border-t border-dashed border-border/70 pt-3">
                <p className="text-[11px] font-medium text-muted-foreground">Histórico (sessão actual)</p>
                {history.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Ainda não existem viagens concluídas nesta sessão.</p>
                ) : (
                  <ul className="space-y-2">
                    {history.slice(0, 5).map((v) => (
                      <li
                        key={v.id}
                        className="space-y-1 rounded-md border border-border/70 bg-background/60 p-2 text-xs"
                      >
                        <p className="font-medium">
                          {v.origem} → {v.destino}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Distância: {(v.odometroFinal - v.odometroInicial).toFixed(1)} km · Duração: {v.duracaoMinutos} min
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Concluída às {v.fimEm.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-1 h-6 px-2 text-[10px]"
                          onClick={() => {
                            setSelectedTripForMap(v);
                            setIsTripMapOpen(true);
                          }}
                        >
                          <MapPin className="mr-1 h-3 w-3" /> Ver mapa
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de viagens (central)</CardTitle>
              <CardDescription>Viagens concluídas registadas na central.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs md:text-sm">
              {historicalTrips.length === 0 ? (
                <p className="text-xs text-muted-foreground">Ainda não existem viagens concluídas registadas.</p>
              ) : (
                <div className="space-y-2">
                  {historicalTrips.map((trip: any) => (
                    <div
                      key={trip.id}
                      className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 px-3 py-2"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {trip.origem_label || "Origem"} → {trip.destino_label || "Destino"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Início: {trip.start_date}
                          {trip.end_date && ` · Fim: ${trip.end_date}`}
                          {trip.distance_km && ` · ${trip.distance_km} km`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <Dialog open={isTripMapOpen} onOpenChange={setIsTripMapOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mapa da viagem</DialogTitle>
              <DialogDescription>
                {selectedTripForMap ? (
                  <span>
                    {selectedTripForMap.origem} → {selectedTripForMap.destino}
                  </span>
                ) : (
                  <span>Selecione uma viagem para ver o mapa.</span>
                )}
              </DialogDescription>
            </DialogHeader>
            {selectedTripForMap && (
              <TripRouteMap origemLabel={selectedTripForMap.origem} destinoLabel={selectedTripForMap.destino} />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default DriverDashboard;
