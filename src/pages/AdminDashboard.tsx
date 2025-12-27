import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, Car, ClipboardList, Fuel, MapPinned, Package, Settings2, Users, WalletCards, Calendar as CalendarIcon, Download, FileText, FileSpreadsheet, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  exportVehiclesToExcel,
  exportVehiclesToPDF,
  exportMaintenancesToExcel,
  exportMaintenancesToPDF,
  exportFuelFillupsToExcel,
  exportFuelFillupsToPDF,
} from "@/lib/export-utils";
import { PROVINCIAS } from "@/shared/locations";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TripRouteMap } from "@/components/TripRouteMap";

type VehicleStatus = "em_operacao" | "parado" | "em_manutencao";
type FuelType = "gasolina" | "diesel" | "etanol" | "gas_natural" | "eletrico" | "hibrido" | "outro";

type MaintenanceStatus = "agendado" | "em_progresso" | "concluido";
type MaintenanceType =
  | "revisao_geral"
  | "troca_oleo"
  | "pneus"
  | "freios"
  | "suspensao"
  | "motor"
  | "outro";

type TripStatus = "planeada" | "em_andamento" | "concluida" | "cancelada";

interface Vehicle {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number | null;
  status: VehicleStatus;
  combustivel: FuelType | null;
  odometro: number | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  foto_url: string | null;
  provincia: string | null;
  municipio: string | null;
  bairro: string | null;
  driver_id: string | null;
}

interface VehicleForm {
  placa: string;
  marca: string;
  modelo: string;
  ano?: number;
  status: VehicleStatus;
  combustivel?: FuelType;
  odometro?: number;
  foto_url?: string;
  provincia?: string;
  municipio?: string;
  bairro?: string;
  driver_id?: string;
}

interface FuelFillup {
  id: string;
  user_id: string;
  vehicle_id: string;
  date: string;
  odometer: number | null;
  liters: number;
  price_per_liter: number;
  total_amount: number;
  supplier_name: string | null;
  supplier_id: string | null;
  fuel_type: FuelType | null;
  created_at: string;
  updated_at: string;
  vehicle?: {
    placa: string;
    marca: string;
    modelo: string;
  } | null;
}

interface Trip {
  id: string;
  user_id: string;
  vehicle_id: string;
  driver_id: string | null;
  driver_name: string;
  start_date: string;
  end_date: string | null;
  distance_km: number | null;
  estimated_cost: number | null;
  status: TripStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  origem_label?: string | null;
  destino_label?: string | null;
  vehicle?: {
    id: string;
    placa: string;
    marca: string;
    modelo: string;
  } | null;
}

type SupplierCategory = "oficina" | "posto_combustivel" | "pecas" | "seguradora" | "outro";

interface Supplier {
  id: string;
  user_id: string;
  name: string;
  category: SupplierCategory;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type InventoryCategory = "pneus" | "oleo" | "filtros" | "pecas" | "consumiveis" | "outro";
type InventoryMovementType = "entrada" | "saida" | "ajuste";

interface InventoryItem {
  id: string;
  user_id: string;
  name: string;
  category: InventoryCategory;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  unit_cost: number | null;
  supplier_id: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  supplier?: {
    name: string;
  } | null;
}

interface InventoryMovement {
  id: string;
  user_id: string;
  item_id: string;
  movement_type: InventoryMovementType;
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  reference: string | null;
  notes: string | null;
  movement_date: string;
  created_at: string;
  updated_at: string;
  item?: {
    name: string;
    unit: string;
  } | null;
}

const AdminDashboard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | VehicleStatus>("all");
  const [fuelFilter, setFuelFilter] = useState<"all" | FuelType>("all");
  const [driverFilter, setDriverFilter] = useState<"all" | "with_driver" | "without_driver">("all");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<VehicleForm>({
    placa: "",
    marca: "",
    modelo: "",
    status: "em_operacao",
    provincia: "",
    municipio: "",
    bairro: "",
    driver_id: "",
  });

  // Estado da navegação por abas
  const [activeTab, setActiveTab] = useState<string>("painel");

  // Filtros e ordenação de motoristas
  const [driverSearchName, setDriverSearchName] = useState("");
  const [driverSearchPhone, setDriverSearchPhone] = useState("");
  const [driverAssignedFilter, setDriverAssignedFilter] = useState<"all" | "with_vehicle" | "without_vehicle">("all");
  const [driverSortField, setDriverSortField] = useState<"name" | "phone" | "assigned">("name");
  const [driverSortDirection, setDriverSortDirection] = useState<"asc" | "desc">("asc");

  const [tripProvinciaOrigem, setTripProvinciaOrigem] = useState<string>("");
  const [tripMunicipioOrigem, setTripMunicipioOrigem] = useState<string>("");
  const [tripBairroOrigem, setTripBairroOrigem] = useState<string>("");
  const [tripProvinciaDestino, setTripProvinciaDestino] = useState<string>("");
  const [tripMunicipioDestino, setTripMunicipioDestino] = useState<string>("");
  const [tripBairroDestino, setTripBairroDestino] = useState<string>("");

  const provinciaActual = PROVINCIAS.find((p) => p.nome === form.provincia);
  const municipiosDisponiveis = provinciaActual?.municipios ?? [];
  const municipioActual = municipiosDisponiveis.find((m) => m.nome === form.municipio);
  const bairrosDisponiveis = municipioActual?.bairros ?? [];

  const tripProvinciaOrigemObj = PROVINCIAS.find((p) => p.nome === tripProvinciaOrigem);
  const tripMunicipiosOrigem = tripProvinciaOrigemObj?.municipios ?? [];
  const tripMunicipioOrigemObj = tripMunicipiosOrigem.find((m) => m.nome === tripMunicipioOrigem);
  const tripBairrosOrigem = tripMunicipioOrigemObj?.bairros ?? [];

  const tripProvinciaDestinoObj = PROVINCIAS.find((p) => p.nome === tripProvinciaDestino);
  const tripMunicipiosDestino = tripProvinciaDestinoObj?.municipios ?? [];
  const tripMunicipioDestinoObj = tripMunicipiosDestino.find((m) => m.nome === tripMunicipioDestino);
  const tripBairrosDestino = tripMunicipioDestinoObj?.bairros ?? [];

  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);

  const [maintenanceVehicleFilter, setMaintenanceVehicleFilter] = useState<string>("all");
  const [selectedMaintenanceVehicleIds, setSelectedMaintenanceVehicleIds] = useState<string[]>([]);
  const [maintenanceTypes, setMaintenanceTypes] = useState<MaintenanceType[]>([]);
  const [maintenanceDate, setMaintenanceDate] = useState("");
  const [maintenanceDescription, setMaintenanceDescription] = useState("");
  const [maintenanceSupplierId, setMaintenanceSupplierId] = useState<string>("");
  const [maintenanceCost, setMaintenanceCost] = useState<string>("");
  const [maintenanceStartDateFilter, setMaintenanceStartDateFilter] = useState<string>("");
  const [maintenanceEndDateFilter, setMaintenanceEndDateFilter] = useState<string>("");

  const [fuelVehicleId, setFuelVehicleId] = useState<string>("");
  const [fuelDate, setFuelDate] = useState<Date | undefined>();
  const [fuelOdometer, setFuelOdometer] = useState<string>("");
  const [fuelLiters, setFuelLiters] = useState<string>("");
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState<string>("");
  const [fuelSupplierId, setFuelSupplierId] = useState<string>("");
  const [fuelFuelType, setFuelFuelType] = useState<FuelType | "">("");

  const [tripDialogOpen, setTripDialogOpen] = useState(false);
  const [tripFormMode, setTripFormMode] = useState<"create" | "edit">("create");
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [tripVehicleId, setTripVehicleId] = useState<string>("");
  const [tripDriverId, setTripDriverId] = useState<string>("");
  const [tripStartDate, setTripStartDate] = useState<Date | undefined>();
  const [tripEndDate, setTripEndDate] = useState<Date | undefined>();
  const [tripDistanceKm, setTripDistanceKm] = useState<string>("");
  const [tripEstimatedCost, setTripEstimatedCost] = useState<string>("");
  const [tripStatus, setTripStatus] = useState<TripStatus>("planeada");
  const [tripNotes, setTripNotes] = useState<string>("");
  const [tripStatusFilter, setTripStatusFilter] = useState<"all" | TripStatus>("all");
  const [tripVehicleFilter, setTripVehicleFilter] = useState<string>("all");
  const [tripMapDialogOpen, setTripMapDialogOpen] = useState(false);
  const [selectedTripForMap, setSelectedTripForMap] = useState<Trip | null>(null);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [supplierFormMode, setSupplierFormMode] = useState<"create" | "edit">("create");
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierName, setSupplierName] = useState<string>("");
  const [supplierCategory, setSupplierCategory] = useState<SupplierCategory>("oficina");
  const [supplierContactPerson, setSupplierContactPerson] = useState<string>("");
  const [supplierPhone, setSupplierPhone] = useState<string>("");
  const [supplierEmail, setSupplierEmail] = useState<string>("");
  const [supplierAddress, setSupplierAddress] = useState<string>("");
  const [supplierNotes, setSupplierNotes] = useState<string>("");
  const [supplierCategoryFilter, setSupplierCategoryFilter] = useState<"all" | SupplierCategory>("all");

  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);
  const [inventoryFormMode, setInventoryFormMode] = useState<"create" | "edit">("create");
  const [editingInventoryItem, setEditingInventoryItem] = useState<InventoryItem | null>(null);
  const [inventoryName, setInventoryName] = useState<string>("");
  const [inventoryCategory, setInventoryCategory] = useState<InventoryCategory>("pecas");
  const [inventoryUnit, setInventoryUnit] = useState<string>("unidade");
  const [inventoryMinStock, setInventoryMinStock] = useState<string>("0");
  const [inventoryUnitCost, setInventoryUnitCost] = useState<string>("");
  const [inventorySupplierId, setInventorySupplierId] = useState<string>("");
  const [inventoryLocation, setInventoryLocation] = useState<string>("");
  const [inventoryNotes, setInventoryNotes] = useState<string>("");
  
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [movementItemId, setMovementItemId] = useState<string>("");
  const [movementType, setMovementType] = useState<InventoryMovementType>("entrada");
  const [movementQuantity, setMovementQuantity] = useState<string>("");
  const [movementUnitCost, setMovementUnitCost] = useState<string>("");
  const [movementReference, setMovementReference] = useState<string>("");
  const [movementNotes, setMovementNotes] = useState<string>("");
  const [movementDate, setMovementDate] = useState<Date | undefined>(new Date());

  const [financeDialogOpen, setFinanceDialogOpen] = useState(false);
  const [financeType, setFinanceType] = useState<"receita" | "despesa">("despesa");
  const [financeCategory, setFinanceCategory] = useState<string>("combustivel");
  const [financeAmount, setFinanceAmount] = useState<string>("");
  const [financeDate, setFinanceDate] = useState<Date | undefined>(new Date());
  const [financeVehicleId, setFinanceVehicleId] = useState<string>("");
  const [financeDescription, setFinanceDescription] = useState<string>("");
  const [financeCategoryFilter, setFinanceCategoryFilter] = useState<string>("all");
  const [financeTypeFilter, setFinanceTypeFilter] = useState<string>("all");
  const [financeStartDate, setFinanceStartDate] = useState<Date | undefined>();
  const [financeEndDate, setFinanceEndDate] = useState<Date | undefined>();

  // Configurações de alertas
  const [alertDaysWithoutMaintenance, setAlertDaysWithoutMaintenance] = useState<number>(() => {
    const saved = localStorage.getItem('alertDaysWithoutMaintenance');
    return saved ? parseInt(saved) : 180;
  });
  const [alertMaxOdometer, setAlertMaxOdometer] = useState<number>(() => {
    const saved = localStorage.getItem('alertMaxOdometer');
    return saved ? parseInt(saved) : 200000;
  });

  const saveAlertSettings = () => {
    localStorage.setItem('alertDaysWithoutMaintenance', alertDaysWithoutMaintenance.toString());
    localStorage.setItem('alertMaxOdometer', alertMaxOdometer.toString());
    toast({
      title: "Definições guardadas",
      description: "Os limites de alerta foram actualizados com sucesso.",
    });
  };

  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("vehicles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Vehicle[];
    },
    enabled: !!user,
  });

  const { data: maintenances = [], isLoading: isMaintenancesLoading } = useQuery<any[]>({
    queryKey: ["vehicle_maintenances"],
    queryFn: async () => {
      if (!user) return [];
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("vehicle_maintenances" as any)
        .select(
          "id, user_id, vehicle_id, scheduled_date, status, maintenance_type, description, cost, created_at, updated_at, vehicles:vehicle_id(id, placa, marca, modelo, odometro)",
        )
        .order("scheduled_date", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        ...row,
        vehicle: row.vehicles,
      }));
    },
    enabled: !!user,
  });

  const { data: fuelFillups = [], isLoading: isFuelLoading } = useQuery<FuelFillup[]>({
    queryKey: ["fuel_fillups"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("fuel_fillups" as any)
        .select(
          "id, user_id, vehicle_id, date, odometer, liters, price_per_liter, total_amount, supplier_id, supplier_name, fuel_type, created_at, updated_at, vehicles:vehicle_id(placa, marca, modelo)",
        )
        .order("date", { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        ...row,
        vehicle: row.vehicles,
      }));
    },
    enabled: !!user,
  });

  const { data: trips = [], isLoading: isTripsLoading } = useQuery<Trip[]>({
    queryKey: ["trips"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("trips" as any)
        .select(
          "id, user_id, vehicle_id, driver_id, driver_name, start_date, end_date, distance_km, estimated_cost, status, notes, created_at, updated_at, origem_label, destino_label, vehicles:vehicle_id(id, placa, marca, modelo)",
        )
        .order("start_date", { ascending: false })
        .limit(100);

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        ...row,
        vehicle: row.vehicles,
      }));
    },
    enabled: !!user,
  });

  const { data: suppliers = [], isLoading: isSuppliersLoading } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("suppliers" as any)
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: inventoryItems = [], isLoading: isInventoryLoading } = useQuery<InventoryItem[]>({
    queryKey: ["inventory_items"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("inventory_items" as any)
        .select("*, suppliers:supplier_id(name)")
        .order("name", { ascending: true });

      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row,
        supplier: row.suppliers,
      }));
    },
    enabled: !!user,
  });

  const { data: inventoryMovements = [], isLoading: isMovementsLoading } = useQuery<InventoryMovement[]>({
    queryKey: ["inventory_movements"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("inventory_movements" as any)
        .select("*, inventory_items:item_id(name, unit)")
        .order("movement_date", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row,
        item: row.inventory_items,
      }));
    },
    enabled: !!user,
  });

  const { data: financialTransactions = [], isLoading: isFinancialLoading } = useQuery<any[]>({
    queryKey: ["financial_transactions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("financial_transactions" as any)
        .select("*, vehicles:vehicle_id(placa, marca, modelo)")
        .order("date", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row,
        vehicle: row.vehicles,
      }));
    },
    enabled: !!user,
  });

  const { data: drivers = [], isLoading: isDriversLoading } = useQuery<Array<{id: string, full_name: string, phone: string}>>({
    queryKey: ["drivers"],
    queryFn: async () => {
      if (!user) return [];

      // Considerar como motoristas todos os perfis excepto o próprio admin autenticado
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .order("full_name", { ascending: true });

      if (error) throw error;

      const filtered = (data ?? []).filter((profile) => profile.id !== user.id);
      return filtered as Array<{ id: string; full_name: string; phone: string }>;
    },
    enabled: !!user,
  });

  const filteredFinancialTransactions = useMemo(() => {
    let items = financialTransactions;

    if (financeTypeFilter !== "all") {
      items = items.filter((t) => t.type === financeTypeFilter);
    }

    if (financeCategoryFilter !== "all") {
      items = items.filter((t) => t.category === financeCategoryFilter);
    }

    if (financeStartDate) {
      items = items.filter((t) => new Date(t.date) >= financeStartDate);
    }

    if (financeEndDate) {
      items = items.filter((t) => new Date(t.date) <= financeEndDate);
    }

    return items;
  }, [financialTransactions, financeTypeFilter, financeCategoryFilter, financeStartDate, financeEndDate]);

  const financialSummary = useMemo(() => {
    const totalReceitas = filteredFinancialTransactions
      .filter((t) => t.type === "receita")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    const totalDespesas = filteredFinancialTransactions
      .filter((t) => t.type === "despesa")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    const saldo = totalReceitas - totalDespesas;

    return { totalReceitas, totalDespesas, saldo };
  }, [filteredFinancialTransactions]);

  const filteredVehicles = useMemo(() => {
    let items = vehicles;

    if (search.trim()) {
      const term = search.toLowerCase();
      items = items.filter(
        (v) =>
          v.placa.toLowerCase().includes(term) ||
          v.marca.toLowerCase().includes(term) ||
          v.modelo.toLowerCase().includes(term),
      );
    }

    if (statusFilter !== "all") {
      items = items.filter((v) => v.status === statusFilter);
    }

    if (fuelFilter !== "all") {
      items = items.filter((v) => v.combustivel === fuelFilter);
    }

    if (driverFilter !== "all") {
      if (driverFilter === "with_driver") {
        items = items.filter((v) => v.driver_id);
      } else if (driverFilter === "without_driver") {
        items = items.filter((v) => !v.driver_id);
      }
    }

    return items;
  }, [vehicles, search, statusFilter, fuelFilter, driverFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / pageSize));

  const paginatedVehicles = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredVehicles.slice(start, start + pageSize);
  }, [filteredVehicles, page, pageSize]);

  const resetForm = (vehicle?: Vehicle) => {
    if (vehicle) {
      setForm({
        placa: vehicle.placa,
        marca: vehicle.marca,
        modelo: vehicle.modelo,
        ano: vehicle.ano ?? undefined,
        status: vehicle.status,
        combustivel: vehicle.combustivel ?? undefined,
        odometro: vehicle.odometro ?? undefined,
        foto_url: vehicle.foto_url ?? undefined,
        provincia: vehicle.provincia ?? "",
        municipio: vehicle.municipio ?? "",
        bairro: vehicle.bairro ?? "",
        driver_id: vehicle.driver_id ?? "",
      });
    } else {
      setForm({
        placa: "",
        marca: "",
        modelo: "",
        status: "em_operacao",
        provincia: "",
        municipio: "",
        bairro: "",
        driver_id: "",
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.placa.trim() || !form.marca.trim() || !form.modelo.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Placa, marca e modelo são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      user_id: user?.id,
      placa: form.placa.trim().toUpperCase(),
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      ano: form.ano ?? null,
      status: form.status,
      combustivel: form.combustivel ?? null,
      odometro: form.odometro ?? null,
      foto_url: form.foto_url ?? null,
      provincia: form.provincia?.trim() || null,
      municipio: form.municipio?.trim() || null,
      bairro: form.bairro?.trim() || null,
      driver_id: form.driver_id || null,
    };

    try {
      if (formMode === "create") {
        const { error } = await supabase.from("vehicles").insert(payload);
        if (error) throw error;
        toast({ title: "Veículo criado", description: "O veículo foi adicionado à frota." });
      } else if (editingVehicle) {
        const { error } = await supabase.from("vehicles").update(payload).eq("id", editingVehicle.id);
        if (error) throw error;
        toast({ title: "Veículo actualizado", description: "Os dados do veículo foram actualizados." });
      }

      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setFormMode("create");
      setEditingVehicle(null);
      resetForm();
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao guardar",
        description: "Não foi possível guardar o veículo. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleCreateFillup = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!fuelVehicleId || !fuelDate || !fuelLiters || !fuelPricePerLiter) {
      toast({
        title: "Dados em falta",
        description: "Selecione a viatura, a data, os litros e o preço por litro.",
        variant: "destructive",
      });
      return;
    }

    const litersNumber = Number(fuelLiters);
    const priceNumber = Number(fuelPricePerLiter);
    const odometerNumber = fuelOdometer ? Number(fuelOdometer) : null;

    if (!Number.isFinite(litersNumber) || !Number.isFinite(priceNumber)) {
      toast({
        title: "Valores inválidos",
        description: "Litros e preço por litro devem ser números válidos.",
        variant: "destructive",
      });
      return;
    }

    const total = litersNumber * priceNumber;

    const payload = {
      user_id: user?.id,
      vehicle_id: fuelVehicleId,
      date: fuelDate.toISOString().slice(0, 10),
      odometer: odometerNumber,
      liters: litersNumber,
      price_per_liter: priceNumber,
      total_amount: total,
      supplier_name: null,
      supplier_id: fuelSupplierId || null,
      fuel_type: fuelFuelType || null,
    };

    try {
      const { error } = await (supabase as any).from("fuel_fillups" as any).insert(payload);
      if (error) throw error;

      // Registar também nas finanças como despesa de combustível
      const financePayload = {
        user_id: user?.id,
        vehicle_id: fuelVehicleId || null,
        date: fuelDate.toISOString().slice(0, 10),
        type: "saida",
        category: "combustivel",
        amount: total,
        description: `Abastecimento de ${litersNumber.toFixed(2)} L por Kz ${priceNumber.toFixed(2)}`,
      };

      const { error: financeError } = await (supabase as any)
        .from("financial_transactions" as any)
        .insert(financePayload);
      if (financeError) throw financeError;

      toast({
        title: "Abastecimento registado",
        description: "O abastecimento foi gravado com sucesso e registado nas finanças.",
      });

      setFuelVehicleId("");
      setFuelDate(undefined);
      setFuelOdometer("");
      setFuelLiters("");
      setFuelPricePerLiter("");
      setFuelSupplierId("");
      setFuelFuelType("");

      await queryClient.invalidateQueries({ queryKey: ["fuel_fillups"] });
      await queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao registar",
        description: "Não foi possível registar o abastecimento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const resetTripForm = (trip?: Trip) => {
    if (trip) {
      setTripVehicleId(trip.vehicle_id);
      setTripDriverId(trip.driver_id || "");
      setTripStartDate(new Date(trip.start_date));
      setTripEndDate(trip.end_date ? new Date(trip.end_date) : undefined);
      setTripDistanceKm(trip.distance_km?.toString() ?? "");
      setTripEstimatedCost(trip.estimated_cost?.toString() ?? "");
      setTripStatus(trip.status);
      setTripNotes(trip.notes ?? "");
      setTripProvinciaOrigem("");
      setTripMunicipioOrigem("");
      setTripBairroOrigem("");
      setTripProvinciaDestino("");
      setTripMunicipioDestino("");
      setTripBairroDestino("");
    } else {
      setTripVehicleId("");
      setTripDriverId("");
      setTripStartDate(undefined);
      setTripEndDate(undefined);
      setTripDistanceKm("");
      setTripEstimatedCost("");
      setTripStatus("planeada");
      setTripNotes("");
      setTripProvinciaOrigem("");
      setTripMunicipioOrigem("");
      setTripBairroOrigem("");
      setTripProvinciaDestino("");
      setTripMunicipioDestino("");
      setTripBairroDestino("");
    }
  };

  const handleTripSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!tripVehicleId || !tripDriverId || !tripStartDate) {
      toast({
        title: "Campos obrigatórios",
        description: "Viatura, motorista e data de início são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (
      !tripProvinciaOrigem ||
      !tripMunicipioOrigem ||
      !tripBairroOrigem ||
      !tripProvinciaDestino ||
      !tripMunicipioDestino ||
      !tripBairroDestino
    ) {
      toast({
        title: "Defina origem e destino",
        description: "Selecione Província, Município e Bairro para origem e destino.",
        variant: "destructive",
      });
      return;
    }

    const distanceNumber = tripDistanceKm ? Number(tripDistanceKm) : null;
    const costNumber = tripEstimatedCost ? Number(tripEstimatedCost) : null;

    const selectedDriver = drivers.find((d) => d.id === tripDriverId);
    const driver_name = selectedDriver?.full_name ?? "";

    const origem_label = [tripProvinciaOrigem, tripMunicipioOrigem, tripBairroOrigem].filter(Boolean).join(" · ");
    const destino_label = [tripProvinciaDestino, tripMunicipioDestino, tripBairroDestino].filter(Boolean).join(" · ");

    const payload: any = {
      user_id: user?.id,
      vehicle_id: tripVehicleId,
      driver_id: tripDriverId,
      driver_name: driver_name.trim(),
      start_date: tripStartDate.toISOString().slice(0, 10),
      end_date: tripEndDate ? tripEndDate.toISOString().slice(0, 10) : null,
      distance_km: distanceNumber,
      estimated_cost: costNumber,
      status: tripStatus,
      notes: tripNotes.trim() || null,
      origem_label,
      destino_label,
    };

    try {
      if (tripFormMode === "edit" && editingTrip) {
        const { error } = await (supabase as any)
          .from("trips" as any)
          .update(payload)
          .eq("id", editingTrip.id);
        if (error) throw error;
        toast({ title: "Viagem atualizada", description: "Os dados foram atualizados." });
      } else {
        const { error } = await (supabase as any).from("trips" as any).insert(payload);
        if (error) throw error;
        toast({ title: "Viagem criada", description: "A viagem foi registada com sucesso." });
      }

      resetTripForm();
      setTripDialogOpen(false);
      setEditingTrip(null);
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao guardar",
        description: "Não foi possível guardar a viagem. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTrip = async (id: string) => {
    const confirmed = window.confirm("Tem a certeza que deseja eliminar esta viagem?");
    if (!confirmed) return;

    try {
      const { error } = await (supabase as any).from("trips" as any).delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Viagem eliminada", description: "A viagem foi removida." });
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao eliminar",
        description: "Não foi possível eliminar a viagem.",
        variant: "destructive",
      });
    }
  };

  const filteredTrips = useMemo(() => {
    let items = trips;
    if (tripStatusFilter !== "all") {
      items = items.filter((t) => t.status === tripStatusFilter);
    }
    if (tripVehicleFilter !== "all") {
      items = items.filter((t) => t.vehicle_id === tripVehicleFilter);
    }
    return items;
  }, [trips, tripStatusFilter, tripVehicleFilter]);

  const tripsByVehicle = useMemo(() => {
    const groups: Record<string, { label: string; tripsCount: number; totalDistance: number }> = {};
    trips.forEach((trip) => {
      const label = trip.vehicle?.placa || "Sem placa";
      if (!groups[label]) {
        groups[label] = { label, tripsCount: 0, totalDistance: 0 };
      }
      groups[label].tripsCount += 1;
      if (trip.distance_km) {
        groups[label].totalDistance += trip.distance_km;
      }
    });
    return Object.values(groups);
  }, [trips]);

  const tripsByDriver = useMemo(() => {
    const groups: Record<string, { label: string; tripsCount: number; totalDistance: number }> = {};
    trips.forEach((trip) => {
      const label = trip.driver_name || "Sem nome";
      if (!groups[label]) {
        groups[label] = { label, tripsCount: 0, totalDistance: 0 };
      }
      groups[label].tripsCount += 1;
      if (trip.distance_km) {
        groups[label].totalDistance += trip.distance_km;
      }
    });
    return Object.values(groups);
  }, [trips]);

  const tripsReportConfig: ChartConfig = {
    tripsCount: {
      label: "Número de viagens",
      color: "hsl(var(--chart-1))",
    },
  };

  const filteredSuppliers = useMemo(() => {
    let items = suppliers;
    if (supplierCategoryFilter !== "all") {
      items = items.filter((s) => s.category === supplierCategoryFilter);
    }
    return items;
  }, [suppliers, supplierCategoryFilter]);

  const resetSupplierForm = (supplier?: Supplier) => {
    if (supplier) {
      setSupplierName(supplier.name);
      setSupplierCategory(supplier.category);
      setSupplierContactPerson(supplier.contact_person ?? "");
      setSupplierPhone(supplier.phone ?? "");
      setSupplierEmail(supplier.email ?? "");
      setSupplierAddress(supplier.address ?? "");
      setSupplierNotes(supplier.notes ?? "");
    } else {
      setSupplierName("");
      setSupplierCategory("oficina");
      setSupplierContactPerson("");
      setSupplierPhone("");
      setSupplierEmail("");
      setSupplierAddress("");
      setSupplierNotes("");
    }
  };

  const handleSupplierSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!supplierName.trim() || !supplierCategory) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e categoria são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const payload: any = {
      user_id: user?.id,
      name: supplierName.trim(),
      category: supplierCategory,
      contact_person: supplierContactPerson.trim() || null,
      phone: supplierPhone.trim() || null,
      email: supplierEmail.trim() || null,
      address: supplierAddress.trim() || null,
      notes: supplierNotes.trim() || null,
    };

    try {
      if (supplierFormMode === "edit" && editingSupplier) {
        const { error } = await (supabase as any)
          .from("suppliers" as any)
          .update(payload)
          .eq("id", editingSupplier.id);
        if (error) throw error;
        toast({ title: "Fornecedor atualizado", description: "Os dados foram atualizados." });
      } else {
        const { error } = await (supabase as any).from("suppliers" as any).insert(payload);
        if (error) throw error;
        toast({ title: "Fornecedor criado", description: "O fornecedor foi registado com sucesso." });
      }

      resetSupplierForm();
      setSupplierDialogOpen(false);
      setEditingSupplier(null);
      await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao guardar",
        description: "Não foi possível guardar o fornecedor. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    const confirmed = window.confirm("Tem a certeza que deseja eliminar este fornecedor?");
    if (!confirmed) return;

    try {
      const { error } = await (supabase as any).from("suppliers" as any).delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Fornecedor eliminado", description: "O fornecedor foi removido." });
      await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao eliminar",
        description: "Não foi possível eliminar o fornecedor.",
        variant: "destructive",
      });
    }
  };

  const getCategoryLabel = (category: SupplierCategory) => {
    const labels: Record<SupplierCategory, string> = {
      oficina: "Oficina",
      posto_combustivel: "Posto Combustível",
      pecas: "Peças",
      seguradora: "Seguradora",
      outro: "Outro",
    };
    return labels[category];
  };

  const getInventoryCategoryLabel = (category: InventoryCategory) => {
    const labels: Record<InventoryCategory, string> = {
      pneus: "Pneus",
      oleo: "Óleo",
      filtros: "Filtros",
      pecas: "Peças",
      consumiveis: "Consumíveis",
      outro: "Outro",
    };
    return labels[category];
  };

  const lowStockItems = useMemo(() => {
    return inventoryItems.filter((item) => item.current_stock <= item.minimum_stock);
  }, [inventoryItems]);

  const driversWithoutVehicle = useMemo(() => {
    if (!drivers || !vehicles) return [];
    const driverIdsWithVehicle = new Set(vehicles.filter((v) => v.driver_id).map((v) => v.driver_id as string));
    return drivers.filter((d) => !driverIdsWithVehicle.has(d.id));
  }, [drivers, vehicles]);

  const driversAssignedToVehicles = useMemo(() => {
    if (!drivers || !vehicles) return [];
    const driverIdsWithVehicle = new Set(vehicles.filter((v) => v.driver_id).map((v) => v.driver_id as string));
    return drivers.filter((d) => driverIdsWithVehicle.has(d.id));
  }, [drivers, vehicles]);

  const vehiclesWithoutDriver = useMemo(() => {
    return vehicles.filter((v) => !v.driver_id);
  }, [vehicles]);

  const filteredSortedDrivers = useMemo(() => {
    let list = drivers.map((driver) => {
      const vehicleForDriver = vehicles.find((v) => v.driver_id === driver.id) || null;
      const hasVehicle = !!vehicleForDriver;
      return { ...driver, vehicleForDriver, hasVehicle };
    });

    if (driverSearchName.trim()) {
      const term = driverSearchName.toLowerCase();
      list = list.filter((d) => (d.full_name || "").toLowerCase().includes(term));
    }

    if (driverSearchPhone.trim()) {
      const term = driverSearchPhone.toLowerCase();
      list = list.filter((d) => (d.phone || "").toLowerCase().includes(term));
    }

    if (driverAssignedFilter === "with_vehicle") {
      list = list.filter((d) => d.hasVehicle);
    } else if (driverAssignedFilter === "without_vehicle") {
      list = list.filter((d) => !d.hasVehicle);
    }

    list.sort((a, b) => {
      const dir = driverSortDirection === "asc" ? 1 : -1;
      if (driverSortField === "name") {
        return ((a.full_name || "").localeCompare(b.full_name || "")) * dir;
      }
      if (driverSortField === "phone") {
        return ((a.phone || "").localeCompare(b.phone || "")) * dir;
      }
      // assigned
      if (a.hasVehicle === b.hasVehicle) return 0;
      return a.hasVehicle ? -1 * dir : 1 * dir;
    });

    return list;
  }, [drivers, vehicles, driverSearchName, driverSearchPhone, driverAssignedFilter, driverSortField, driverSortDirection]);

  const resetInventoryForm = (item?: InventoryItem) => {
    if (item) {
      setInventoryName(item.name);
      setInventoryCategory(item.category);
      setInventoryUnit(item.unit);
      setInventoryMinStock(item.minimum_stock.toString());
      setInventoryUnitCost(item.unit_cost?.toString() ?? "");
      setInventorySupplierId(item.supplier_id ?? "");
      setInventoryLocation(item.location ?? "");
      setInventoryNotes(item.notes ?? "");
    } else {
      setInventoryName("");
      setInventoryCategory("pecas");
      setInventoryUnit("unidade");
      setInventoryMinStock("0");
      setInventoryUnitCost("");
      setInventorySupplierId("");
      setInventoryLocation("");
      setInventoryNotes("");
    }
  };

  const handleInventorySubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!inventoryName.trim() || !inventoryUnit.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e unidade são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const minStock = Number(inventoryMinStock);
    const unitCost = inventoryUnitCost ? Number(inventoryUnitCost) : null;

    const payload: any = {
      user_id: user?.id,
      name: inventoryName.trim(),
      category: inventoryCategory,
      unit: inventoryUnit.trim(),
      minimum_stock: minStock,
      unit_cost: unitCost,
      supplier_id: inventorySupplierId || null,
      location: inventoryLocation.trim() || null,
      notes: inventoryNotes.trim() || null,
    };

    try {
      if (inventoryFormMode === "edit" && editingInventoryItem) {
        const { error } = await (supabase as any)
          .from("inventory_items" as any)
          .update(payload)
          .eq("id", editingInventoryItem.id);
        if (error) throw error;
        toast({ title: "Item atualizado", description: "Os dados foram atualizados." });
      } else {
        const { error } = await (supabase as any).from("inventory_items" as any).insert(payload);
        if (error) throw error;
        toast({ title: "Item criado", description: "O item foi adicionado ao inventário." });
      }

      resetInventoryForm();
      setInventoryDialogOpen(false);
      setEditingInventoryItem(null);
      await queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao guardar",
        description: "Não foi possível guardar o item. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteInventoryItem = async (id: string) => {
    const confirmed = window.confirm("Tem a certeza que deseja eliminar este item?");
    if (!confirmed) return;

    try {
      const { error } = await (supabase as any).from("inventory_items" as any).delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Item eliminado", description: "O item foi removido do inventário." });
      await queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao eliminar",
        description: "Não foi possível eliminar o item.",
        variant: "destructive",
      });
    }
  };

  const resetMovementForm = () => {
    setMovementItemId("");
    setMovementType("entrada");
    setMovementQuantity("");
    setMovementUnitCost("");
    setMovementReference("");
    setMovementNotes("");
    setMovementDate(new Date());
  };

  const resetFinanceForm = () => {
    setFinanceType("despesa");
    setFinanceCategory("combustivel");
    setFinanceAmount("");
    setFinanceDate(new Date());
    setFinanceVehicleId("");
    setFinanceDescription("");
  };

  const handleFinanceSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!financeAmount || !financeCategory || !financeDate) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha tipo, categoria, valor e data.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
       user_id: user?.id,
       type: financeType === "receita" ? "entrada" : "saida",
       category: financeCategory,
       amount: parseFloat(financeAmount),
       date: financeDate.toISOString().split("T")[0],
       vehicle_id: financeVehicleId || null,
       description: financeDescription.trim() || null,
     };

    try {
      const { error } = await (supabase as any).from("financial_transactions" as any).insert(payload);
      if (error) throw error;

      toast({ title: "Transação criada", description: "A transação financeira foi registada com sucesso." });
      await queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      setFinanceDialogOpen(false);
      resetFinanceForm();
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao guardar",
        description: "Não foi possível criar a transação. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFinance = async (id: string) => {
    try {
      const { error } = await (supabase as any).from("financial_transactions" as any).delete().eq("id", id);
      if (error) throw error;

      toast({ title: "Transação eliminada", description: "A transação foi removida com sucesso." });
      await queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao eliminar",
        description: "Não foi possível eliminar a transação.",
        variant: "destructive",
      });
    }
  };

  const handleMovementSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!movementItemId || !movementQuantity || !movementDate) {
      toast({
        title: "Campos obrigatórios",
        description: "Item, quantidade e data são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const quantity = Number(movementQuantity);
    const unitCost = movementUnitCost ? Number(movementUnitCost) : null;
    const totalCost = unitCost ? unitCost * quantity : null;

    const payload: any = {
      user_id: user?.id,
      item_id: movementItemId,
      movement_type: movementType,
      quantity,
      unit_cost: unitCost,
      total_cost: totalCost,
      reference: movementReference.trim() || null,
      notes: movementNotes.trim() || null,
      movement_date: movementDate.toISOString().slice(0, 10),
    };

    try {
      const { error } = await (supabase as any).from("inventory_movements" as any).insert(payload);
      if (error) throw error;
      
      // Se for saída de stock com custo, registar também como despesa nas finanças
      if (movementType === "saida" && totalCost && totalCost > 0) {
        const financePayload = {
          user_id: user?.id,
          vehicle_id: null,
          date: movementDate.toISOString().slice(0, 10),
          type: "saida",
          category: "inventario",
          amount: totalCost,
          description: `Saída de stock (${quantity} unidades)`,
        };

        const { error: financeError } = await (supabase as any)
          .from("financial_transactions" as any)
          .insert(financePayload);
        if (financeError) throw financeError;
      }
      
      toast({ 
        title: "Movimento registado", 
        description: `${movementType === 'entrada' ? 'Entrada' : movementType === 'saida' ? 'Saída' : 'Ajuste'} de stock registado com sucesso.` 
      });

      resetMovementForm();
      setMovementDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["inventory_movements"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
      await queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao registar",
        description: "Não foi possível registar o movimento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Tem a certeza que deseja eliminar este veículo?");
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Veículo removido", description: "O veículo foi eliminado da frota." });
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao eliminar",
        description: "Não foi possível eliminar o veículo.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-accent text-primary-foreground shadow-md">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Painel do Administrador</p>
              <p className="text-sm font-semibold">Sistema de Gestão de Veículos</p>
            </div>
            <Badge variant="secondary" className="ml-1 text-[11px]">
              Admin
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

      <main className="container py-8 md:py-10">
        <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Visão geral da frota corporativa
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Monitorize veículos, motoristas, viagens, manutenção, combustível e finanças em tempo real. Esta secção é
              apenas um resumo visual das principais funcionalidades descritas para o sistema.
            </p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar relatórios
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportVehiclesToExcel(vehicles)}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Veículos (Excel)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportVehiclesToPDF(vehicles)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Veículos (PDF)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportMaintenancesToExcel(maintenances)}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Manutenções (Excel)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportMaintenancesToPDF(maintenances)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Manutenções (PDF)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportFuelFillupsToExcel(fuelFillups)}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Abastecimentos (Excel)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportFuelFillupsToPDF(fuelFillups)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Abastecimentos (PDF)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              size="sm"
              onClick={() => {
                setTripFormMode("create");
                setEditingTrip(null);
                resetTripForm();
                setTripDialogOpen(true);
              }}
            >
              Nova viagem
            </Button>
          </div>
        </section>

        {/* Layout principal com navegação lateral + conteúdo por aba */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="grid gap-6 md:grid-cols-[220px_1fr]">
          {/* Navegação lateral */}
          <aside className="rounded-xl border border-border/60 bg-background/70 p-3 text-sm">
            <p className="mb-2 px-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Navegação
            </p>
            <TabsList className="flex h-auto w-full flex-col items-stretch gap-1 bg-transparent p-0">
              <TabsTrigger
                value="painel"
                className="justify-start gap-2 rounded-md px-2 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Settings2 className="h-4 w-4" />
                <span>Painel</span>
              </TabsTrigger>
              <TabsTrigger
                value="veiculos"
                className="justify-start gap-2 rounded-md px-2 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Car className="h-4 w-4" />
                <span>Veículos</span>
              </TabsTrigger>
              <TabsTrigger
                value="motoristas"
                className="justify-start gap-2 rounded-md px-2 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Users className="h-4 w-4" />
                <span>Motoristas</span>
              </TabsTrigger>
              <TabsTrigger
                value="manutencao"
                className="justify-start gap-2 rounded-md px-2 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Settings2 className="h-4 w-4" />
                <span>Manutenção</span>
              </TabsTrigger>
              <TabsTrigger
                value="combustivel"
                className="justify-start gap-2 rounded-md px-2 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Fuel className="h-4 w-4" />
                <span>Combustível</span>
              </TabsTrigger>
              <TabsTrigger
                value="financas"
                className="justify-start gap-2 rounded-md px-2 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <WalletCards className="h-4 w-4" />
                <span>Finanças</span>
              </TabsTrigger>
              <TabsTrigger
                value="registo"
                className="justify-start gap-2 rounded-md px-2 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <ClipboardList className="h-4 w-4" />
                <span>Registo de Viagens</span>
              </TabsTrigger>
              <TabsTrigger
                value="fornecedores"
                className="justify-start gap-2 rounded-md px-2 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Package className="h-4 w-4" />
                <span>Fornecedores</span>
              </TabsTrigger>
              <TabsTrigger
                value="inventario"
                className="justify-start gap-2 rounded-md px-2 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Package className="h-4 w-4" />
                <span>Inventário</span>
              </TabsTrigger>
              <TabsTrigger
                value="alertas"
                className="justify-start gap-2 rounded-md px-2 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Bell className="h-4 w-4" />
                <span>Alertas</span>
              </TabsTrigger>
              <TabsTrigger
                value="definicoes"
                className="justify-start gap-2 rounded-md px-2 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Settings2 className="h-4 w-4" />
                <span>Definições</span>
              </TabsTrigger>
            </TabsList>
          </aside>

          {/* Conteúdo por aba */}
          <div className="space-y-6">
            {/* Painel geral (conteúdo actual) */}
            <TabsContent value="painel" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Bem-vindo ao Sistema de Gestão de Frotas</CardTitle>
                  <CardDescription>
                    Use as abas à esquerda para gerir veículos, motoristas, viagens, manutenção, combustível, finanças e
                    muito mais.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-border/70 bg-background/60 p-4">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Car className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">Veículos</h3>
                          <p className="text-sm text-muted-foreground">{vehicles.length} registado(s)</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Adicione e gerencie os veículos da frota na aba Veículos.
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/70 bg-background/60 p-4">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Settings2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">Manutenção</h3>
                          <p className="text-sm text-muted-foreground">{maintenances.length} registo(s)</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Agende e acompanhe as manutenções na aba Manutenção.
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/70 bg-background/60 p-4">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Fuel className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">Combustível</h3>
                          <p className="text-sm text-muted-foreground">{fuelFillups.length} abastecimento(s)</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Registe abastecimentos e monitore consumo na aba Combustível.
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/70 bg-background/60 p-4">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <WalletCards className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">Finanças</h3>
                          <p className="text-sm text-muted-foreground">Gerir receitas e despesas</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Controle receitas e despesas na aba Finanças.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Alocação de frota</CardTitle>
                  <CardDescription>
                    Veja rapidamente quem está sem viatura e que viaturas estão livres para atribuição.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Motoristas sem viatura
                    </p>
                    {driversWithoutVehicle.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Todos os motoristas têm viatura atribuída.</p>
                    ) : (
                      <ul className="space-y-1 text-xs">
                        {driversWithoutVehicle.map((driver) => (
                          <li
                            key={driver.id}
                            className="flex items-center justify-between rounded-md border border-border/70 bg-background/60 px-2 py-1.5"
                          >
                            <span>{driver.full_name}</span>
                            {driver.phone && (
                              <span className="text-[11px] text-muted-foreground">{driver.phone}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Viaturas sem motorista
                    </p>
                    {vehiclesWithoutDriver.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Todas as viaturas estão atribuídas a motoristas.</p>
                    ) : (
                      <ul className="space-y-1 text-xs">
                        {vehiclesWithoutDriver.map((vehicle) => (
                          <li
                            key={vehicle.id}
                            className="flex items-center justify-between rounded-md border border-border/70 bg-background/60 px-2 py-1.5"
                          >
                            <span>
                              {vehicle.placa} · {vehicle.marca} {vehicle.modelo}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Veículos */}
            <TabsContent value="veiculos" className="space-y-4">
              {/* Alertas de manutenção */}
              {(() => {
                const vehiclesNeedingAttention = vehicles.filter((vehicle) => {
                  const lastMaintenance = maintenances
                    .filter((m) => m.vehicle_id === vehicle.id && m.status === "concluido")
                    .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime())[0];
                  
                  const daysSinceLastMaintenance = lastMaintenance 
                    ? Math.floor((Date.now() - new Date(lastMaintenance.scheduled_date).getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  
                  const needsMaintenance = daysSinceLastMaintenance && daysSinceLastMaintenance > alertDaysWithoutMaintenance;
                  const highOdometer = vehicle.odometro && vehicle.odometro > alertMaxOdometer;
                  
                  return needsMaintenance || highOdometer;
                });

                return vehiclesNeedingAttention.length > 0 ? (
                  <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20">
                    <CardHeader>
                      <CardTitle className="text-base text-orange-900 dark:text-orange-100">
                        ⚠️ Alertas de manutenção
                      </CardTitle>
                      <CardDescription className="text-orange-700 dark:text-orange-300">
                        {vehiclesNeedingAttention.length} {vehiclesNeedingAttention.length === 1 ? "veículo requer" : "veículos requerem"} atenção
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {vehiclesNeedingAttention.map((vehicle) => {
                        const lastMaintenance = maintenances
                          .filter((m) => m.vehicle_id === vehicle.id && m.status === "concluido")
                          .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime())[0];
                        
                        const daysSinceLastMaintenance = lastMaintenance 
                          ? Math.floor((Date.now() - new Date(lastMaintenance.scheduled_date).getTime()) / (1000 * 60 * 60 * 24))
                          : null;
                        
                        const needsMaintenance = daysSinceLastMaintenance && daysSinceLastMaintenance > 180;
                        const highOdometer = vehicle.odometro && vehicle.odometro > 200000;

                        return (
                          <div
                            key={vehicle.id}
                            className="flex items-center justify-between rounded-lg border border-orange-200 bg-background p-3 text-sm dark:border-orange-900"
                          >
                            <div>
                              <p className="font-medium">{vehicle.placa} · {vehicle.marca} {vehicle.modelo}</p>
                              <div className="space-y-0.5 text-xs text-muted-foreground">
                                {needsMaintenance && (
                                  <p className="text-orange-600">⚠️ Sem manutenção há {daysSinceLastMaintenance} dias (última: {new Date(lastMaintenance.scheduled_date).toLocaleDateString("pt-PT")})</p>
                                )}
                                {highOdometer && (
                                  <p className="text-orange-600">⚠️ Odómetro elevado: {vehicle.odometro?.toLocaleString("pt-PT")} km</p>
                                )}
                              </div>
                            </div>
                            <Badge variant="destructive">Atenção</Badge>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ) : null;
              })()}

              <Card>
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <CardTitle className="text-base">Gestão de veículos</CardTitle>
                    <CardDescription>
                      Adicione, edite e remova veículos da frota. Filtre por estado, combustível, motorista ou pesquise pela placa,
                      marca ou modelo.
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingVehicle(null);
                      setFormMode("create");
                      resetForm();
                      setVehicleDialogOpen(true);
                    }}
                  >
                    Adicionar veículo
                  </Button>
                </CardHeader>
                <CardContent className="space-y-5 text-sm">
                  {/* Filtros e pesquisa */}
                  <section className="space-y-3 rounded-lg border border-border/70 bg-background/60 p-3">
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <h3 className="text-sm font-medium">Filtros da frota</h3>
                      <p className="text-xs text-muted-foreground max-w-xl">
                        Combine pesquisa por texto com estado e tipo de combustível para encontrar rapidamente qualquer
                        veículo registado.
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                      <div className="space-y-1.5">
                        <Label htmlFor="vehicle-search">Pesquisa</Label>
                        <Input
                          id="vehicle-search"
                          placeholder="Placa, marca ou modelo"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="status-filter">Status</Label>
                        <Select
                          value={statusFilter}
                          onValueChange={(value) => setStatusFilter(value as "all" | VehicleStatus)}
                        >
                          <SelectTrigger id="status-filter">
                            <SelectValue placeholder="Todos os estados" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="em_operacao">Em operação</SelectItem>
                            <SelectItem value="parado">Parado</SelectItem>
                            <SelectItem value="em_manutencao">Em manutenção</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="fuel-filter">Combustível</Label>
                        <Select
                          value={fuelFilter}
                          onValueChange={(value) => setFuelFilter(value as "all" | FuelType)}
                        >
                          <SelectTrigger id="fuel-filter">
                            <SelectValue placeholder="Todos os tipos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="gasolina">Gasolina</SelectItem>
                            <SelectItem value="diesel">Diesel</SelectItem>
                            <SelectItem value="etanol">Etanol</SelectItem>
                            <SelectItem value="gas_natural">Gás natural</SelectItem>
                            <SelectItem value="eletrico">Eléctrico</SelectItem>
                            <SelectItem value="hibrido">Híbrido</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="driver-filter">Motorista</Label>
                        <Select
                          value={driverFilter}
                          onValueChange={(value) => setDriverFilter(value as "all" | "with_driver" | "without_driver")}
                        >
                          <SelectTrigger id="driver-filter">
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="with_driver">Com motorista</SelectItem>
                            <SelectItem value="without_driver">Sem motorista</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </section>

                  {/* Tabela de veículos */}
                  <section className="space-y-2 rounded-lg border border-border/70 bg-background/60">
                    <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 text-xs text-muted-foreground">
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Lista de veículos
                        </p>
                        <span>
                          {isLoading
                            ? "A carregar veículos..."
                            : filteredVehicles.length === 0
                            ? "Nenhum veículo encontrado. Ajuste os filtros ou adicione um novo registo."
                            : `${filteredVehicles.length} veículo(s) encontrados`}
                        </span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Placa</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Motorista</TableHead>
                            <TableHead>Combustível</TableHead>
                            <TableHead className="text-right">Odómetro (km)</TableHead>
                            <TableHead className="text-right">Acções</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedVehicles.map((vehicle) => {
                            const assignedDriver = drivers.find((d) => d.id === vehicle.driver_id);
                            
                            // Alertas de manutenção
                            const lastMaintenance = maintenances
                              .filter((m) => m.vehicle_id === vehicle.id && m.status === "concluido")
                              .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime())[0];
                            
                            const daysSinceLastMaintenance = lastMaintenance 
                              ? Math.floor((Date.now() - new Date(lastMaintenance.scheduled_date).getTime()) / (1000 * 60 * 60 * 24))
                              : null;
                            
                            const needsMaintenance = daysSinceLastMaintenance && daysSinceLastMaintenance > alertDaysWithoutMaintenance;
                            const highOdometer = vehicle.odometro && vehicle.odometro > alertMaxOdometer;
                            
                            const hasAlert = needsMaintenance || highOdometer;
                            
                            return (
                              <TableRow key={vehicle.id} className={hasAlert ? "bg-orange-50/50 dark:bg-orange-950/20" : ""}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    {vehicle.placa}
                                    {hasAlert && (
                                      <span className="text-orange-600" title={needsMaintenance ? "Manutenção atrasada" : "Odómetro elevado"}>⚠️</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span>
                                      {vehicle.marca} {vehicle.modelo}
                                    </span>
                                    {vehicle.ano && (
                                      <span className="text-xs text-muted-foreground">Ano {vehicle.ano}</span>
                                    )}
                                    {needsMaintenance && (
                                      <span className="text-xs text-orange-600 font-medium">
                                        Sem manutenção há {daysSinceLastMaintenance} dias
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {vehicle.status === "em_operacao"
                                      ? "Em operação"
                                      : vehicle.status === "parado"
                                      ? "Parado"
                                      : "Em manutenção"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {assignedDriver ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="h-2 w-2 rounded-full bg-green-500"></span>
                                      <span className="text-xs">{assignedDriver.full_name}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <span className="h-2 w-2 rounded-full bg-muted"></span>
                                      <span className="text-xs text-muted-foreground">Sem motorista</span>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs capitalize">
                                  {vehicle.combustivel ? vehicle.combustivel.replace("_", " ") : "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex flex-col items-end">
                                    <span className={`text-xs ${highOdometer ? "text-orange-600 font-medium" : ""}`}>
                                      {vehicle.odometro ? vehicle.odometro.toLocaleString("pt-PT") : "-"}
                                    </span>
                                    {highOdometer && (
                                      <span className="text-xs text-orange-600">Odómetro elevado</span>
                                    )}
                                  </div>
                                </TableCell>
                              <TableCell className="flex justify-end gap-2 text-xs">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setEditingVehicle(vehicle);
                                    setFormMode("edit");
                                    resetForm(vehicle);
                                    setVehicleDialogOpen(true);
                                  }}
                                >
                                  ✏️
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleDelete(vehicle.id)}
                                >
                                  🗑️
                                </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Paginação simples */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between border-t border-border/60 px-3 py-2 text-xs text-muted-foreground">
                        <span>
                          Página {page} de {totalPages}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                          >
                            Anterior
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={page === totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          >
                            Seguinte
                          </Button>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Formulário de criação/edição em modal */}
                  <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>
                          {formMode === "create" ? "Adicionar novo veículo" : "Editar veículo"}
                        </DialogTitle>
                        <DialogDescription>
                          Preencha os dados principais do veículo. Campos de GPS e foto são opcionais, mas ajudam na
                          identificação visual e geográfica.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="placa">Placa</Label>
                          <Input
                            id="placa"
                            value={form.placa}
                            onChange={(e) => setForm((f) => ({ ...f, placa: e.target.value.toUpperCase() }))}
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="marca">Marca</Label>
                          <Input
                            id="marca"
                            value={form.marca}
                            onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="modelo">Modelo</Label>
                          <Input
                            id="modelo"
                            value={form.modelo}
                            onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="ano">Ano</Label>
                          <Input
                            id="ano"
                            type="number"
                            min={1980}
                            max={2100}
                            value={form.ano ?? ""}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, ano: e.target.value ? Number(e.target.value) : undefined }))
                            }
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="status">Status</Label>
                          <Select
                            value={form.status}
                            onValueChange={(value) =>
                              setForm((f) => ({ ...f, status: value as VehicleStatus }))
                            }
                          >
                            <SelectTrigger id="status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="em_operacao">Em operação</SelectItem>
                              <SelectItem value="parado">Parado</SelectItem>
                              <SelectItem value="em_manutencao">Em manutenção</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="combustivel">Combustível</Label>
                          <Select
                            value={form.combustivel ?? "none"}
                            onValueChange={(value) =>
                              setForm((f) => ({
                                ...f,
                                combustivel: (value === "none" ? undefined : (value as FuelType)) as
                                  | FuelType
                                  | undefined,
                              }))
                            }
                          >
                            <SelectTrigger id="combustivel">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem registo</SelectItem>
                              <SelectItem value="gasolina">Gasolina</SelectItem>
                              <SelectItem value="diesel">Diesel</SelectItem>
                              <SelectItem value="etanol">Etanol</SelectItem>
                              <SelectItem value="gas_natural">Gás natural</SelectItem>
                              <SelectItem value="eletrico">Eléctrico</SelectItem>
                              <SelectItem value="hibrido">Híbrido</SelectItem>
                              <SelectItem value="outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="odometro">Odómetro (km)</Label>
                          <Input
                            id="odometro"
                            type="number"
                            min={0}
                            step={0.1}
                            value={form.odometro ?? ""}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, odometro: e.target.value ? Number(e.target.value) : undefined }))
                            }
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="driver">Motorista atribuído</Label>
                          <Select
                            value={form.driver_id && form.driver_id !== "" ? form.driver_id : "none"}
                            onValueChange={(value) =>
                              setForm((f) => ({
                                ...f,
                                driver_id: value === "none" ? "" : value,
                              }))
                            }
                          >
                            <SelectTrigger id="driver">
                              <SelectValue placeholder="Selecione o motorista (opcional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem motorista</SelectItem>
                              {drivers.map((driver) => (
                                <SelectItem key={driver.id} value={driver.id}>
                                  {driver.full_name} ({driver.phone})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="provincia">Província (opcional)</Label>
                          <Select
                            value={form.provincia && form.provincia !== "" ? form.provincia : "none"}
                            onValueChange={(value) => {
                              setForm((f) => ({
                                ...f,
                                provincia: value === "none" ? "" : value,
                                municipio: "",
                                bairro: "",
                              }));
                            }}
                          >
                            <SelectTrigger id="provincia">
                              <SelectValue placeholder="Selecione a província (opcional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem província</SelectItem>
                              {PROVINCIAS.map((p) => (
                                <SelectItem key={p.nome} value={p.nome}>
                                  {p.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="municipio">Município (opcional)</Label>
                          <Select
                            value={form.municipio && form.municipio !== "" ? form.municipio : "none"}
                            onValueChange={(value) => {
                              setForm((f) => ({
                                ...f,
                                municipio: value === "none" ? "" : value,
                                bairro: "",
                              }));
                            }}
                            disabled={!form.provincia}
                          >
                            <SelectTrigger id="municipio">
                              <SelectValue placeholder={form.provincia ? "Selecione o município (opcional)" : "Selecione primeiro a província"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem município</SelectItem>
                              {municipiosDisponiveis.map((m) => (
                                <SelectItem key={m.nome} value={m.nome}>
                                  {m.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="bairro">Bairro (opcional)</Label>
                          <Select
                            value={form.bairro && form.bairro !== "" ? form.bairro : "none"}
                            onValueChange={(value) => {
                              setForm((f) => ({
                                ...f,
                                bairro: value === "none" ? "" : value,
                              }));
                            }}
                            disabled={!form.municipio}
                          >
                            <SelectTrigger id="bairro">
                              <SelectValue placeholder={form.municipio ? "Selecione o bairro (opcional)" : "Selecione primeiro o município"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem bairro</SelectItem>
                              {bairrosDisponiveis.map((b) => (
                                <SelectItem key={b.nome} value={b.nome}>
                                  {b.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                          <Label htmlFor="foto_url">URL da foto do veículo</Label>
                          <Input
                            id="foto_url"
                            type="url"
                            placeholder="https://..."
                            value={form.foto_url ?? ""}
                            onChange={(e) => setForm((f) => ({ ...f, foto_url: e.target.value || undefined }))}
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 md:col-span-3">
                          {formMode === "edit" && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setFormMode("create");
                                setEditingVehicle(null);
                                resetForm();
                                setVehicleDialogOpen(false);
                              }}
                            >
                              Cancelar edição
                            </Button>
                          )}
                          <Button type="submit" size="sm">
                            {formMode === "create" ? "Guardar veículo" : "Actualizar veículo"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Motoristas */}
            <TabsContent value="motoristas" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Gestão de motoristas</CardTitle>
                  <CardDescription>
                    Consulte os motoristas registados, veja contactos e verifique rapidamente quem tem viatura atribuída.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="grid gap-3 md:grid-cols-3 rounded-lg border border-border/70 bg-background/60 p-3 text-xs">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Total</p>
                      <p className="text-base font-semibold">{drivers.length}</p>
                      <p className="text-xs text-muted-foreground">Motoristas registados no sistema.</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Com viatura</p>
                      <p className="text-base font-semibold">{driversAssignedToVehicles.length}</p>
                      <p className="text-xs text-muted-foreground">Motoristas actualmente com viatura atribuída.</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Sem viatura</p>
                      <p className="text-base font-semibold">{driversWithoutVehicle.length}</p>
                      <p className="text-xs text-muted-foreground">Disponíveis para atribuição de viatura.</p>
                    </div>
                  </div>

                  <section className="space-y-3 rounded-lg border border-border/70 bg-background/60 p-3 text-xs">
                    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                      <div>
                        <h3 className="text-sm font-medium">Filtros de motoristas</h3>
                        <p className="text-xs text-muted-foreground">
                          Pesquise por nome, telefone e se têm viatura atribuída.
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                      <div className="space-y-1.5">
                        <Label htmlFor="driver-name">Nome</Label>
                        <Input
                          id="driver-name"
                          placeholder="Procurar por nome"
                          value={driverSearchName}
                          onChange={(e) => setDriverSearchName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="driver-phone">Telefone</Label>
                        <Input
                          id="driver-phone"
                          placeholder="Procurar por telefone"
                          value={driverSearchPhone}
                          onChange={(e) => setDriverSearchPhone(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="driver-assigned">Viatura atribuída</Label>
                        <Select
                          value={driverAssignedFilter}
                          onValueChange={(value) => setDriverAssignedFilter(value as any)}
                        >
                          <SelectTrigger id="driver-assigned">
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="with_vehicle">Com viatura</SelectItem>
                            <SelectItem value="without_vehicle">Sem viatura</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Ordenar por</Label>
                        <div className="flex gap-1">
                          <Select
                            value={driverSortField}
                            onValueChange={(value) => setDriverSortField(value as any)}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="name">Nome</SelectItem>
                              <SelectItem value="phone">Telefone</SelectItem>
                              <SelectItem value="assigned">Viatura atribuída</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() =>
                              setDriverSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
                            }
                            title={driverSortDirection === "asc" ? "Ordenação ascendente" : "Ordenação descendente"}
                          >
                            {driverSortDirection === "asc" ? "↑" : "↓"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </section>

                  {isDriversLoading ? (
                    <div className="text-center text-muted-foreground py-8">
                      A carregar motoristas...
                    </div>
                  ) : drivers.length === 0 ? (
                    <div className="rounded-lg border border-border/70 bg-background/60 p-4 text-center text-muted-foreground">
                      <p className="mb-2">Nenhum motorista registado ainda.</p>
                      <p className="text-xs">
                        Os motoristas podem criar conta na página de registo usando qualquer telefone (excepto 912345678 que é reservado para admin).
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-border/70 bg-background/60">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Viatura atribuída</TableHead>
                            <TableHead className="text-right">Atalhos</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSortedDrivers.map((driver) => (
                            <TableRow key={driver.id}>
                              <TableCell className="font-medium">{driver.full_name || "Sem nome"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{driver.phone || "—"}</TableCell>
                              <TableCell className="text-xs">
                                {driver.vehicleForDriver ? (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">
                                      {driver.vehicleForDriver.placa}
                                    </Badge>
                                    <span className="text-muted-foreground">
                                      {driver.vehicleForDriver.marca} {driver.vehicleForDriver.modelo}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">Sem viatura atribuída</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {driver.vehicleForDriver ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="text-xs"
                                    onClick={() => {
                                      setEditingVehicle(driver.vehicleForDriver as Vehicle);
                                      setFormMode("edit");
                                      resetForm(driver.vehicleForDriver as Vehicle);
                                      setActiveTab("veiculos");
                                      setVehicleDialogOpen(true);
                                    }}
                                  >
                                    Abrir viatura
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Sem acções</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Manutenção */}
            <TabsContent value="manutencao" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">🔧 Manutenção</CardTitle>
                  <CardDescription>
                    Agendamento e controlo de serviços por veículo: óleo, pneus, revisões gerais e outras intervenções.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 text-sm">
                  <Accordion type="multiple" defaultValue={["agendamento", "historico"]} className="space-y-3">
                    <AccordionItem value="agendamento">
                      <AccordionTrigger className="text-sm font-medium">
                        Agendamento de serviços
                      </AccordionTrigger>
                      <AccordionContent>
                        <section className="mt-1 space-y-3 rounded-lg border border-border/70 bg-background/60 p-3">
                          <p className="text-xs text-muted-foreground">
                            Selecione um ou mais veículos, o tipo de manutenção e uma data para criar pedidos no estado
                            <strong> agendado</strong>. Mais tarde poderá marcar como
                            <strong> em progresso</strong> ou <strong>concluído</strong>.
                          </p>
                          <div className="grid items-start gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
                            {/* Seleção de veículos (multi) */}
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">
                                Veículos para manutenção
                              </Label>
                              {vehicles.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  Não existem veículos registados. Adicione veículos na aba "Veículos" para agendar
                                  manutenções.
                                </p>
                              ) : (
                                <div className="grid gap-2 text-xs md:grid-cols-2">
                                  {vehicles.map((vehicle) => {
                                    const checked = selectedMaintenanceVehicleIds.includes(vehicle.id);
                                    return (
                                      <button
                                        key={vehicle.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedMaintenanceVehicleIds((prev) =>
                                            prev.includes(vehicle.id)
                                              ? prev.filter((id) => id !== vehicle.id)
                                              : [...prev, vehicle.id],
                                          );
                                        }}
                                        className={`flex items-center gap-2 rounded-md border px-2 py-1 text-left transition-colors ${checked ? "border-primary bg-primary/10" : "border-border/60 bg-background/80 hover:border-primary/50"}`}
                                      >
                                        <span
                                          className={`flex h-3.5 w-3.5 items-center justify-center rounded border text-[10px] ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border/70"}`}
                                        >
                                          {checked ? "✓" : ""}
                                        </span>
                                        <span className="flex flex-col">
                                          <span className="font-medium text-foreground">{vehicle.placa}</span>
                                          <span className="text-[11px] text-muted-foreground">
                                            {vehicle.marca} {vehicle.modelo}
                                          </span>
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Tipo de manutenção + data */}
                            <div className="space-y-3">
                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1.5">
                                  <Label htmlFor="tipo-manutencao">Tipo de manutenção</Label>
                                  <div className="flex flex-wrap gap-2 text-xs">
                                    {([
                                      { value: "revisao_geral", label: "Revisão geral" },
                                      { value: "troca_oleo", label: "Troca de óleo" },
                                      { value: "pneus", label: "Troca de pneus" },
                                      { value: "freios", label: "Sistema de travagem" },
                                      { value: "suspensao", label: "Suspensão" },
                                      { value: "motor", label: "Motor" },
                                      { value: "outro", label: "Outro tipo" },
                                    ] as { value: MaintenanceType; label: string }[]).map((opt) => {
                                      const active = maintenanceTypes.includes(opt.value);
                                      return (
                                        <Button
                                          key={opt.value}
                                          type="button"
                                          size="sm"
                                          variant={active ? "default" : "outline"}
                                          className="h-7 px-2 text-[11px]"
                                          onClick={() => {
                                            setMaintenanceTypes((prev) =>
                                              prev.includes(opt.value)
                                                ? prev.filter((v) => v !== opt.value)
                                                : [...prev, opt.value],
                                            );
                                          }}
                                        >
                                          {opt.label}
                                        </Button>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor="data-manutencao">Data agendada</Label>
                                  <Input
                                    id="data-manutencao"
                                    type="date"
                                    value={maintenanceDate}
                                    onChange={(e) => setMaintenanceDate(e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="fornecedor-manutencao">Fornecedor (opcional)</Label>
                                <Select value={maintenanceSupplierId} onValueChange={setMaintenanceSupplierId}>
                                  <SelectTrigger id="fornecedor-manutencao">
                                    <SelectValue placeholder="Selecione o fornecedor" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {suppliers
                                      .filter((s) => s.category === "oficina" || s.category === "outro")
                                      .map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                          {s.name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="custo-manutencao">Custo total da manutenção</Label>
                                <Input
                                  id="custo-manutencao"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Ex.: 25000"
                                  value={maintenanceCost}
                                  onChange={(e) => setMaintenanceCost(e.target.value)}
                                />
                                <p className="text-[11px] text-muted-foreground">
                                  Este valor será registado também nas finanças como despesa de manutenção.
                                </p>
                              </div>
                              <div className="space-y-1.5 md:col-span-2">
                                <Label htmlFor="descricao-manutencao">Descrição dos trabalhos (opcional)</Label>
                                <Input
                                  id="descricao-manutencao"
                                  placeholder="Ex.: Revisão completa, troca de óleo e filtros, verificação de travagem"
                                  value={maintenanceDescription}
                                  onChange={(e) => setMaintenanceDescription(e.target.value)}
                                />
                                <p className="text-[11px] text-muted-foreground">
                                  A descrição aparecerá também no histórico para ajudar na auditoria das intervenções.
                                </p>
                              </div>
                              <div className="flex justify-end">
                                <Button
                                  size="sm"
                                  type="button"
                                  onClick={async () => {
                                    if (!selectedMaintenanceVehicleIds.length || !maintenanceTypes.length || !maintenanceDate) {
                                      toast({
                                        title: "Dados em falta",
                                        description:
                                          "Selecione pelo menos um veículo, um ou mais tipos de manutenção e uma data para agendar.",
                                        variant: "destructive",
                                      });
                                      return;
                                    }

                                    try {
                                      const tiposLabel = maintenanceTypes
                                        .map((t) =>
                                          t === "revisao_geral"
                                            ? "Revisão geral"
                                            : t === "troca_oleo"
                                              ? "Troca de óleo"
                                              : t === "pneus"
                                                ? "Troca de pneus"
                                                : t === "freios"
                                                  ? "Sistema de travagem"
                                                  : t === "suspensao"
                                                    ? "Suspensão"
                                                    : t === "motor"
                                                      ? "Motor"
                                                      : "Outro tipo",
                                        )
                                        .join(", ");

                                      const costNumber = Number(maintenanceCost);
                                      if (!Number.isFinite(costNumber) || costNumber <= 0) {
                                        toast({
                                          title: "Custo inválido",
                                          description: "Introduza um custo total válido para a manutenção.",
                                          variant: "destructive",
                                        });
                                        return;
                                      }

                                      const payload = selectedMaintenanceVehicleIds.map((vehicleId) => ({
                                        user_id: user?.id,
                                        vehicle_id: vehicleId,
                                        scheduled_date: maintenanceDate,
                                        status: "agendado" as MaintenanceStatus,
                                        maintenance_type: maintenanceTypes[0],
                                        description:
                                          (tiposLabel
                                            ? `Tipos: ${tiposLabel}. ${maintenanceDescription || ""}`
                                            : maintenanceDescription || null) || null,
                                        supplier_id: maintenanceSupplierId || null,
                                        cost: costNumber,
                                      }));

                                      const { error } = await (supabase as any)
                                        .from("vehicle_maintenances" as any)
                                        .insert(payload);

                                      if (error) throw error;

                                      const financialPayload = payload.map((m) => ({
                                         user_id: user?.id,
                                         vehicle_id: m.vehicle_id,
                                         date: m.scheduled_date,
                                         type: "saida",
                                         category: "manutencao",
                                         amount: costNumber,
                                         description:
                                           m.description ||
                                           `Manutenção veículo ${
                                             vehicles.find((v) => v.id === m.vehicle_id)?.placa || "sem placa"
                                           }`,
                                       }));

                                      const { error: financeError } = await (supabase as any)
                                        .from("financial_transactions" as any)
                                        .insert(financialPayload);

                                      if (financeError) throw financeError;

                                      toast({
                                        title: "Manutenções agendadas",
                                        description: "Os pedidos de manutenção foram registados com sucesso.",
                                      });

                                      setSelectedMaintenanceVehicleIds([]);
                                      setMaintenanceTypes([]);
                                      setMaintenanceDate("");
                                      setMaintenanceDescription("");
                                      setMaintenanceSupplierId("");
                                      setMaintenanceCost("");
                                      await queryClient.invalidateQueries({ queryKey: ["vehicle_maintenances"] });
                                      await queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
                                    } catch (error) {
                                      console.error(error);
                                      toast({
                                        title: "Erro ao agendar",
                                        description:
                                          "Não foi possível registar as manutenções. Verifique os dados e tente novamente.",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                >
                                  Guardar agendamento
                                </Button>
                              </div>
                            </div>
                          </div>
                        </section>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="historico">
                      <AccordionTrigger className="text-sm font-medium">
                        Histórico de manutenção por veículo
                      </AccordionTrigger>
                      <AccordionContent>
                        <section className="mt-1 space-y-3 rounded-lg border border-border/70 bg-background/60 p-3">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              <h3 className="text-sm font-medium">Histórico de manutenção por veículo</h3>
                              <p className="text-xs text-muted-foreground">
                                Visão cronológica das intervenções já realizadas em cada viatura, com possibilidade de
                                actualizar o estado do serviço.
                              </p>
                            </div>
                          <div className="w-full max-w-xs space-y-1.5 text-xs">
                            <Label htmlFor="filtro-veiculo-manutencao">Filtrar por veículo</Label>
                            <Select
                              value={maintenanceVehicleFilter}
                              onValueChange={(value) => setMaintenanceVehicleFilter(value)}
                            >
                              <SelectTrigger id="filtro-veiculo-manutencao">
                                <SelectValue placeholder="Todos os veículos" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {vehicles.map((vehicle) => (
                                  <SelectItem key={vehicle.id} value={vehicle.id}>
                                    {vehicle.placa} · {vehicle.marca} {vehicle.modelo}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-1 gap-2 text-xs">
                            <div className="flex-1 space-y-1.5">
                              <Label htmlFor="manutencao-data-inicio">Data inicial</Label>
                              <Input
                                id="manutencao-data-inicio"
                                type="date"
                                value={maintenanceStartDateFilter}
                                onChange={(e) => setMaintenanceStartDateFilter(e.target.value)}
                              />
                            </div>
                            <div className="flex-1 space-y-1.5">
                              <Label htmlFor="manutencao-data-fim">Data final</Label>
                              <Input
                                id="manutencao-data-fim"
                                type="date"
                                value={maintenanceEndDateFilter}
                                onChange={(e) => setMaintenanceEndDateFilter(e.target.value)}
                              />
                            </div>
                          </div>
                          </div>

                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Veículo</TableHead>
                                  <TableHead>Serviço</TableHead>
                                  <TableHead>Data agendada</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="text-right">Custo (Kz)</TableHead>
                                  <TableHead className="text-right">Odómetro (km)</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {isMaintenancesLoading ? (
                                  <TableRow>
                                    <TableCell colSpan={6} className="py-6 text-center text-xs text-muted-foreground">
                                      A carregar histórico de manutenções...
                                    </TableCell>
                                  </TableRow>
                                ) : maintenances.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={6} className="py-6 text-center text-xs text-muted-foreground">
                                      Ainda não existem manutenções registadas.
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  maintenances
                                    .filter((m: any) =>
                                      maintenanceVehicleFilter === "all" ? true : m.vehicle_id === maintenanceVehicleFilter,
                                    )
                                    .filter((m: any) => {
                                      if (!maintenanceStartDateFilter && !maintenanceEndDateFilter) return true;
                                      const d = m.scheduled_date ? new Date(m.scheduled_date).getTime() : null;
                                      if (!d) return false;
                                      const startOk = maintenanceStartDateFilter
                                        ? d >= new Date(maintenanceStartDateFilter).getTime()
                                        : true;
                                      const endOk = maintenanceEndDateFilter
                                        ? d <= new Date(maintenanceEndDateFilter).getTime()
                                        : true;
                                      return startOk && endOk;
                                    })
                                    .map((maintenance: any) => (
                                      <TableRow key={maintenance.id}>
                                        <TableCell>
                                          {maintenance.vehicle ? (
                                            <div className="flex flex-col">
                                              <span>{maintenance.vehicle.placa}</span>
                                              <span className="text-[11px] text-muted-foreground">
                                                {maintenance.vehicle.marca} {maintenance.vehicle.modelo}
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="text-xs text-muted-foreground">Veículo removido</span>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                          {maintenance.maintenance_type === "revisao_geral" && "Revisão geral"}
                                          {maintenance.maintenance_type === "troca_oleo" && "Troca de óleo"}
                                          {maintenance.maintenance_type === "pneus" && "Troca de pneus"}
                                          {maintenance.maintenance_type === "freios" && "Sistema de travagem"}
                                          {maintenance.maintenance_type === "suspensao" && "Suspensão"}
                                          {maintenance.maintenance_type === "motor" && "Motor"}
                                          {maintenance.maintenance_type === "outro" && "Outro"}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                          {maintenance.scheduled_date
                                            ? new Date(maintenance.scheduled_date).toLocaleDateString("pt-PT")
                                            : "-"}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                          <Select
                                            value={maintenance.status}
                                            onValueChange={async (value) => {
                                              try {
                                                const { error } = await (supabase as any)
                                                  .from("vehicle_maintenances" as any)
                                                  .update({ status: value as MaintenanceStatus })
                                                  .eq("id", maintenance.id);
                                                if (error) throw error;
                                                toast({
                                                  title: "Estado actualizado",
                                                  description: "O estado da manutenção foi actualizado.",
                                                });
                                                await queryClient.invalidateQueries({
                                                  queryKey: ["vehicle_maintenances"],
                                                });
                                              } catch (error) {
                                                console.error(error);
                                                toast({
                                                  title: "Erro ao actualizar",
                                                  description: "Não foi possível actualizar o estado da manutenção.",
                                                  variant: "destructive",
                                                });
                                              }
                                            }}
                                          >
                                            <SelectTrigger className="h-7 px-2 text-xs">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="agendado">Agendado</SelectItem>
                                              <SelectItem value="em_progresso">Em progresso</SelectItem>
                                              <SelectItem value="concluido">Concluído</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell className="text-right text-xs">
                                      {typeof maintenance.cost === "number"
                                        ? maintenance.cost.toLocaleString("pt-PT", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : "-"}
                                    </TableCell>
                                    <TableCell className="text-right text-xs">
                                      {typeof maintenance.cost === "number"
                                        ? maintenance.cost.toLocaleString("pt-PT", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : "-"}
                                    </TableCell>
                                    <TableCell className="text-right text-xs">
                                      {maintenance.vehicle?.odometro
                                        ? maintenance.vehicle.odometro.toLocaleString("pt-PT")
                                        : "-"}
                                    </TableCell>
                                  </TableRow>
                                    ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                          {(() => {
                            const filtered = maintenances
                              .filter((m: any) =>
                                maintenanceVehicleFilter === "all" ? true : m.vehicle_id === maintenanceVehicleFilter,
                              )
                              .filter((m: any) => {
                                if (!maintenanceStartDateFilter && !maintenanceEndDateFilter) return true;
                                const d = m.scheduled_date ? new Date(m.scheduled_date).getTime() : null;
                                if (!d) return false;
                                const startOk = maintenanceStartDateFilter
                                  ? d >= new Date(maintenanceStartDateFilter).getTime()
                                  : true;
                                const endOk = maintenanceEndDateFilter
                                  ? d <= new Date(maintenanceEndDateFilter).getTime()
                                  : true;
                                return startOk && endOk;
                              });

                            const totalGeral = filtered.reduce(
                              (sum: number, m: any) => (typeof m.cost === "number" ? sum + m.cost : sum),
                              0,
                            );

                            const porVeiculo = filtered.reduce((acc: Record<string, { label: string; total: number }>, m: any) => {
                              const key = m.vehicle?.placa || "Sem placa";
                              if (!acc[key]) {
                                acc[key] = { label: key, total: 0 };
                              }
                              if (typeof m.cost === "number") {
                                acc[key].total += m.cost;
                              }
                              return acc;
                            }, {} as Record<string, { label: string; total: number }>);

                            return filtered.length > 0 ? (
                              <div className="mt-4 grid gap-3 text-xs md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.7fr)]">
                                <div className="space-y-1 rounded-md border border-border/70 bg-background/80 p-3">
                                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                    Total do período
                                  </p>
                                  <p className="text-lg font-semibold">
                                    {totalGeral.toLocaleString("pt-PT", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}{" "}
                                    Kz
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    Soma de todas as intervenções filtradas por viatura e intervalo de datas.
                                  </p>
                                </div>
                                <div className="space-y-2 rounded-md border border-border/70 bg-background/80 p-3">
                                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                    Total por viatura
                                  </p>
                                  <ul className="space-y-1.5">
                                    {Object.values(porVeiculo).map((item: { label: string; total: number }) => (
                                      <li
                                        key={item.label}
                                        className="flex items-center justify-between rounded-sm border border-border/60 bg-background/80 px-2 py-1.5"
                                      >
                                        <span className="text-xs font-medium">{item.label}</span>
                                        <span className="text-xs">
                                          {item.total.toLocaleString("pt-PT", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}{" "}
                                          Kz
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            ) : null;
                          })()}
                        </section>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Combustível & contas */}
            <TabsContent value="combustivel" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Registo de abastecimentos</CardTitle>
                  <CardDescription>
                    Registe abastecimentos por viatura e consulte os últimos lançamentos de combustível.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <form
                    onSubmit={handleCreateFillup}
                    className="grid gap-4 rounded-lg border border-border/70 bg-background/60 p-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)]"
                  >
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Seleccione a viatura, a data do abastecimento e os dados principais. O valor total é calculado
                        automaticamente.
                      </p>
                      <div className="space-y-2">
                        <Label className="text-xs" htmlFor="fuel-vehicle">
                          Viatura *
                        </Label>
                        <Select value={fuelVehicleId || "none"} onValueChange={(value) => setFuelVehicleId(value === "none" ? "" : value)}>
                          <SelectTrigger id="fuel-vehicle">
                            <SelectValue placeholder="Selecione a viatura" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" disabled>Selecione uma viatura</SelectItem>
                            {vehicles.map((vehicle) => (
                              <SelectItem key={vehicle.id} value={vehicle.id}>
                                {vehicle.placa} · {vehicle.marca} {vehicle.modelo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Data do abastecimento</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !fuelDate && "text-muted-foreground",
                              )}
                            >
                              {fuelDate ? fuelDate.toLocaleDateString("pt-PT") : <span>Escolha a data</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-60" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={fuelDate}
                              onSelect={setFuelDate}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs" htmlFor="fuel-supplier">
                          Fornecedor (opcional)
                        </Label>
                        <Select value={fuelSupplierId || "none"} onValueChange={(value) => setFuelSupplierId(value === "none" ? "" : value)}>
                          <SelectTrigger id="fuel-supplier">
                            <SelectValue placeholder="Selecione o fornecedor (opcional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem fornecedor</SelectItem>
                            {suppliers
                              .filter(s => s.category === 'posto_combustivel' || s.category === 'outro')
                              .map(s => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs" htmlFor="fuel-type">
                          Tipo de combustível (opcional)
                        </Label>
                        <Select
                          value={fuelFuelType || "none"}
                          onValueChange={(value) => setFuelFuelType(value === "none" ? "" : (value as FuelType))}
                        >
                          <SelectTrigger id="fuel-type">
                            <SelectValue placeholder="Selecione o tipo (opcional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem tipo específico</SelectItem>
                            <SelectItem value="gasolina">Gasolina</SelectItem>
                            <SelectItem value="diesel">Diesel</SelectItem>
                            <SelectItem value="etanol">Etanol</SelectItem>
                            <SelectItem value="gas_natural">Gás natural</SelectItem>
                            <SelectItem value="eletrico">Eléctrico</SelectItem>
                            <SelectItem value="hibrido">Híbrido</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-xs" htmlFor="fuel-odometer">
                            Odómetro (km)
                          </Label>
                          <Input
                            id="fuel-odometer"
                            type="number"
                            min={0}
                            step={0.1}
                            value={fuelOdometer}
                            onChange={(e) => setFuelOdometer(e.target.value)}
                            placeholder="Ex.: 125000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs" htmlFor="fuel-liters">
                            Litros abastecidos
                          </Label>
                          <Input
                            id="fuel-liters"
                            type="number"
                            min={0}
                            step={0.01}
                            value={fuelLiters}
                            onChange={(e) => setFuelLiters(e.target.value)}
                            placeholder="Ex.: 45.6"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-xs" htmlFor="fuel-price">
                            Preço por litro (Kz)
                          </Label>
                          <Input
                            id="fuel-price"
                            type="number"
                            min={0}
                            step={0.001}
                            value={fuelPricePerLiter}
                            onChange={(e) => setFuelPricePerLiter(e.target.value)}
                            placeholder="Ex.: 0.98"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Total estimado (Kz)</Label>
                          <p className="rounded-md border border-border/60 bg-background/70 px-3 py-2 text-sm font-medium">
                            {fuelLiters && fuelPricePerLiter
                              ? (Number(fuelLiters) * Number(fuelPricePerLiter)).toFixed(2)
                              : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" size="sm">
                          Guardar abastecimento
                        </Button>
                      </div>
                    </div>
                  </form>

                  <section className="space-y-2 rounded-lg border border-border/70 bg-background/60">
                    <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 text-xs text-muted-foreground">
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Últimos abastecimentos
                        </p>
                        <span>
                          {isFuelLoading
                            ? "A carregar abastecimentos..."
                            : fuelFillups.length === 0
                            ? "Ainda não existem registos de abastecimento."
                            : `${fuelFillups.length} registo(s) recentes`}
                        </span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Viatura</TableHead>
                            <TableHead className="text-right">Odómetro (km)</TableHead>
                            <TableHead className="text-right">Litros</TableHead>
                            <TableHead className="text-right">Kz/L</TableHead>
                            <TableHead className="text-right">Total (Kz)</TableHead>
                            <TableHead>Fornecedor</TableHead>
                            <TableHead>Combustível</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isFuelLoading ? (
                            <TableRow>
                              <TableCell colSpan={8} className="py-6 text-center text-xs text-muted-foreground">
                                A carregar abastecimentos...
                              </TableCell>
                            </TableRow>
                          ) : fuelFillups.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="py-6 text-center text-xs text-muted-foreground">
                                Ainda não existem registos de abastecimento.
                              </TableCell>
                            </TableRow>
                          ) : (
                            fuelFillups.map((fillup) => (
                              <TableRow key={fillup.id}>
                                <TableCell className="text-xs">
                                  {fillup.date ? new Date(fillup.date).toLocaleDateString("pt-PT") : "-"}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {fillup.vehicle ? (
                                    <span>
                                      {fillup.vehicle.placa} · {fillup.vehicle.marca} {fillup.vehicle.modelo}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">Viatura removida</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right text-xs">
                                  {fillup.odometer != null ? fillup.odometer.toLocaleString("pt-PT") : "-"}
                                </TableCell>
                                <TableCell className="text-right text-xs">
                                  {fillup.liters.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right text-xs">
                                  {fillup.price_per_liter.toFixed(3)}
                                </TableCell>
                                <TableCell className="text-right text-xs">
                                  {fillup.total_amount.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {fillup.supplier_name || "-"}
                                </TableCell>
                                <TableCell className="text-xs capitalize">
                                  {fillup.fuel_type ? fillup.fuel_type.replace("_", " ") : "-"}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </section>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Finanças */}
            <TabsContent value="financas" className="space-y-4">
              {/* Resumo financeiro */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Receitas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">Kz {financialSummary.totalReceitas.toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Despesas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">Kz {financialSummary.totalDespesas.toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={cn("text-2xl font-bold", financialSummary.saldo >= 0 ? "text-green-600" : "text-red-600")}>
                      Kz {financialSummary.saldo.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transações */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Transações financeiras</CardTitle>
                  <CardDescription>Registe receitas e despesas da frota.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filtros e botão criar */}
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap gap-2">
                      <Select value={financeTypeFilter} onValueChange={setFinanceTypeFilter}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos tipos</SelectItem>
                          <SelectItem value="receita">Receitas</SelectItem>
                          <SelectItem value="despesa">Despesas</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={financeCategoryFilter} onValueChange={setFinanceCategoryFilter}>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas categorias</SelectItem>
                          <SelectItem value="combustivel">Combustível</SelectItem>
                          <SelectItem value="manutencao">Manutenção</SelectItem>
                          <SelectItem value="portagens">Portagens</SelectItem>
                          <SelectItem value="seguro">Seguro</SelectItem>
                          <SelectItem value="imposto">Imposto</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {financeStartDate ? new Date(financeStartDate).toLocaleDateString("pt-PT") : "Data início"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={financeStartDate}
                            onSelect={setFinanceStartDate}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {financeEndDate ? new Date(financeEndDate).toLocaleDateString("pt-PT") : "Data fim"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={financeEndDate}
                            onSelect={setFinanceEndDate}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        resetFinanceForm();
                        setFinanceDialogOpen(true);
                      }}
                    >
                      Nova transação
                    </Button>
                  </div>

                  {/* Lista de transações */}
                  {isFinancialLoading ? (
                    <p className="text-sm text-muted-foreground">A carregar transações...</p>
                  ) : filteredFinancialTransactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma transação registada.</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredFinancialTransactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 px-3 py-3"
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={transaction.type === "receita" ? "default" : "destructive"} className="text-xs">
                                {transaction.type === "receita" ? "Receita" : "Despesa"}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {transaction.category}
                              </Badge>
                              <p className={cn("font-semibold text-sm", transaction.type === "receita" ? "text-green-600" : "text-red-600")}>
                                Kz {Number(transaction.amount).toFixed(2)}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(transaction.date).toLocaleDateString("pt-PT")}
                              {transaction.vehicle && ` · ${transaction.vehicle.placa} (${transaction.vehicle.marca} ${transaction.vehicle.modelo})`}
                            </p>
                            {transaction.description && (
                              <p className="text-xs text-muted-foreground italic">{transaction.description}</p>
                            )}
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteFinance(transaction.id)}>
                            Eliminar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Registo de viagens */}
            <TabsContent value="registo" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Registo de viagens</CardTitle>
                  <CardDescription>Crie, edite e filtre viagens efectuadas pela frota.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filtros e botão criar */}
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap gap-2">
                      <Select value={tripStatusFilter} onValueChange={(val) => setTripStatusFilter(val as any)}>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos estados</SelectItem>
                          <SelectItem value="planeada">Planeada</SelectItem>
                          <SelectItem value="em_andamento">Em andamento</SelectItem>
                          <SelectItem value="concluida">Concluída</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={tripVehicleFilter} onValueChange={setTripVehicleFilter}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Viatura" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas viaturas</SelectItem>
                          {vehicles.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.placa} ({v.marca} {v.modelo})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        setTripFormMode("create");
                        setEditingTrip(null);
                        resetTripForm();
                        setTripDialogOpen(true);
                      }}
                    >
                      Nova viagem
                    </Button>
                  </div>

                  {/* Lista de viagens */}
                  {isTripsLoading ? (
                    <p className="text-sm text-muted-foreground">A carregar viagens...</p>
                  ) : filteredTrips.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma viagem registada.</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredTrips.map((trip) => {
                        const statusVariant =
                          trip.status === "concluida"
                            ? "default"
                            : trip.status === "em_andamento"
                              ? "secondary"
                              : trip.status === "cancelada"
                                ? "destructive"
                                : "outline";

                        return (
                          <div
                            key={trip.id}
                            className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 px-3 py-3"
                          >
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">
                                  {trip.vehicle?.placa} · {trip.driver_name}
                                </p>
                                <Badge variant={statusVariant} className="text-xs">
                                  {trip.status === "planeada"
                                    ? "Planeada"
                                    : trip.status === "em_andamento"
                                      ? "Em curso"
                                      : trip.status === "concluida"
                                        ? "Concluída"
                                        : "Cancelada"}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Início: {new Date(trip.start_date).toLocaleDateString("pt-PT")}
                                {trip.end_date && ` · Fim: ${new Date(trip.end_date).toLocaleDateString("pt-PT")}`}
                                {trip.distance_km && ` · ${trip.distance_km} km`}
                                {trip.estimated_cost && ` · Custo est. Kz ${trip.estimated_cost}`}
                              </p>
                              {(trip.origem_label || trip.destino_label) && (
                                <p className="text-xs text-muted-foreground">
                                  {trip.origem_label || "Origem"} → {trip.destino_label || "Destino"}
                                </p>
                              )}
                              {trip.notes && <p className="text-xs italic text-muted-foreground">{trip.notes}</p>}
                            </div>
                            <div className="flex gap-2">
                              {(trip.origem_label && trip.destino_label) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTripForMap(trip);
                                    setTripMapDialogOpen(true);
                                  }}
                                >
                                  Ver rota
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setTripFormMode("edit");
                                  setEditingTrip(trip);
                                  resetTripForm(trip);
                                  setTripDialogOpen(true);
                                }}
                              >
                                Editar
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteTrip(trip.id)}>
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Fornecedores */}
            <TabsContent value="fornecedores" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Fornecedores</CardTitle>
                  <CardDescription>Gerir oficinas, postos de combustível, seguradoras e fornecedores de peças.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filtros e botão criar */}
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <Select value={supplierCategoryFilter} onValueChange={(val) => setSupplierCategoryFilter(val as any)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas categorias</SelectItem>
                        <SelectItem value="oficina">Oficina</SelectItem>
                        <SelectItem value="posto_combustivel">Posto Combustível</SelectItem>
                        <SelectItem value="pecas">Peças</SelectItem>
                        <SelectItem value="seguradora">Seguradora</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      onClick={() => {
                        setSupplierFormMode("create");
                        setEditingSupplier(null);
                        resetSupplierForm();
                        setSupplierDialogOpen(true);
                      }}
                    >
                      Novo fornecedor
                    </Button>
                  </div>

                  {/* Lista de fornecedores */}
                  {isSuppliersLoading ? (
                    <p className="text-sm text-muted-foreground">A carregar fornecedores...</p>
                  ) : filteredSuppliers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum fornecedor registado.</p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {filteredSuppliers.map((supplier) => (
                        <div key={supplier.id} className="rounded-lg border border-border/70 bg-background/60 p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm">{supplier.name}</p>
                                <Badge variant="outline" className="text-xs">
                                  {getCategoryLabel(supplier.category)}
                                </Badge>
                              </div>
                              {supplier.contact_person && (
                                <p className="text-xs text-muted-foreground">Contacto: {supplier.contact_person}</p>
                              )}
                              {supplier.phone && (
                                <p className="text-xs text-muted-foreground">Tel: {supplier.phone}</p>
                              )}
                              {supplier.email && (
                                <p className="text-xs text-muted-foreground">Email: {supplier.email}</p>
                              )}
                              {supplier.address && (
                                <p className="text-xs text-muted-foreground">Morada: {supplier.address}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2 border-t border-border/50">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1 h-8 text-xs"
                              onClick={() => {
                                setSupplierFormMode("edit");
                                setEditingSupplier(supplier);
                                resetSupplierForm(supplier);
                                setSupplierDialogOpen(true);
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1 h-8 text-xs"
                              onClick={() => handleDeleteSupplier(supplier.id)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Inventário */}
            <TabsContent value="inventario" className="space-y-4">
              {/* Alertas de stock baixo */}
              {lowStockItems.length > 0 && (
                <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20">
                  <CardHeader>
                    <CardTitle className="text-base text-orange-900 dark:text-orange-100">
                      Alertas de stock mínimo
                    </CardTitle>
                    <CardDescription className="text-orange-700 dark:text-orange-300">
                      {lowStockItems.length} {lowStockItems.length === 1 ? "item abaixo" : "itens abaixo"} do stock mínimo
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {lowStockItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border border-orange-200 bg-background p-3 text-sm dark:border-orange-900"
                      >
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Stock atual: {item.current_stock} {item.unit} · Mínimo: {item.minimum_stock} {item.unit}
                          </p>
                        </div>
                        <Badge variant="destructive">Reabastecer</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Gestão de inventário */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Inventário de peças e consumíveis</CardTitle>
                  <CardDescription>Gerir stocks de pneus, óleos, filtros e outros materiais.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setInventoryFormMode("create");
                          setEditingInventoryItem(null);
                          resetInventoryForm();
                          setInventoryDialogOpen(true);
                        }}
                      >
                        Novo item
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          resetMovementForm();
                          setMovementDialogOpen(true);
                        }}
                      >
                        Registar movimento
                      </Button>
                    </div>
                  </div>

                  {/* Lista de items */}
                  {isInventoryLoading ? (
                    <p className="text-sm text-muted-foreground">A carregar inventário...</p>
                  ) : inventoryItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum item no inventário.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Stock Atual</TableHead>
                            <TableHead>Mín.</TableHead>
                            <TableHead>Fornecedor</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inventoryItems.map((item) => {
                            const isLowStock = item.current_stock <= item.minimum_stock;
                            return (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{getInventoryCategoryLabel(item.category)}</Badge>
                                </TableCell>
                                <TableCell>
                                  <span className={isLowStock ? "text-orange-600 font-medium" : ""}>
                                    {item.current_stock} {item.unit}
                                  </span>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {item.minimum_stock} {item.unit}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {item.supplier?.name ?? "—"}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setInventoryFormMode("edit");
                                        setEditingInventoryItem(item);
                                        resetInventoryForm(item);
                                        setInventoryDialogOpen(true);
                                      }}
                                    >
                                      Editar
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteInventoryItem(item.id)}
                                    >
                                      Eliminar
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Movimentos recentes */}
                  {inventoryMovements.length > 0 && (
                    <div className="mt-6 space-y-2">
                      <h3 className="text-sm font-medium">Movimentos recentes</h3>
                      <div className="space-y-2">
                        {inventoryMovements.slice(0, 5).map((mov) => (
                          <div
                            key={mov.id}
                            className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-sm"
                          >
                            <div className="flex-1">
                              <p className="font-medium">{mov.item?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {mov.movement_type === "entrada"
                                  ? "Entrada"
                                  : mov.movement_type === "saida"
                                    ? "Saída"
                                    : "Ajuste"}{" "}
                                de {mov.quantity} {mov.item?.unit} ·{" "}
                                {new Date(mov.movement_date).toLocaleDateString("pt-PT")}
                              </p>
                            </div>
                            <Badge
                              variant={
                                mov.movement_type === "entrada"
                                  ? "default"
                                  : mov.movement_type === "saida"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {mov.movement_type === "entrada"
                                ? "Entrada"
                                : mov.movement_type === "saida"
                                  ? "Saída"
                                  : "Ajuste"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Alertas */}
            <TabsContent value="alertas" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Alertas do sistema</CardTitle>
                  <CardDescription>
                    Área para centralizar avisos críticos de manutenção, segurança e operação.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-border/70 bg-background/60 p-4 text-center text-muted-foreground">
                    <p className="mb-2">Nenhum alerta no momento.</p>
                    <p className="text-xs">
                      Os alertas serão mostrados aqui quando houver manutenções urgentes ou avisos importantes.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Definições */}
            <TabsContent value="definicoes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Definições do sistema</CardTitle>
                  <CardDescription>
                    Configure os limites e parâmetros de alertas para a gestão da frota.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-lg border border-border/70 bg-background/60 p-4 space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-3">Alertas de manutenção</h3>
                      <p className="text-xs text-muted-foreground mb-4">
                        Defina quando os veículos devem apresentar alertas visuais na lista de frota.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="alert-days">
                          Dias sem manutenção para alerta
                        </Label>
                        <Input
                          id="alert-days"
                          type="number"
                          min={1}
                          max={365}
                          value={alertDaysWithoutMaintenance}
                          onChange={(e) => setAlertDaysWithoutMaintenance(Number(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground">
                          Actual: {alertDaysWithoutMaintenance} dias (~{Math.floor(alertDaysWithoutMaintenance / 30)} meses)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="alert-odometer">
                          Odómetro máximo para alerta (km)
                        </Label>
                        <Input
                          id="alert-odometer"
                          type="number"
                          min={1000}
                          max={1000000}
                          step={1000}
                          value={alertMaxOdometer}
                          onChange={(e) => setAlertMaxOdometer(Number(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground">
                          Actual: {alertMaxOdometer.toLocaleString("pt-PT")} km
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border/60">
                      <div className="text-xs text-muted-foreground">
                        <p>✅ Os alertas aparecem na lista de veículos com:</p>
                        <ul className="list-disc list-inside mt-1 space-y-0.5">
                          <li>Destaque visual laranja na linha do veículo</li>
                          <li>Ícone de aviso (⚠️) junto à placa</li>
                          <li>Mensagem descritiva do problema</li>
                          <li>Card de alertas no topo da aba Veículos</li>
                        </ul>
                      </div>
                      <Button onClick={saveAlertSettings}>
                        Guardar definições
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-muted bg-muted/30 p-4">
                    <h3 className="text-sm font-medium mb-2">ℹ️ Recomendações</h3>
                    <ul className="text-xs text-muted-foreground space-y-1.5">
                      <li>
                        <strong>Dias sem manutenção:</strong> O padrão de 180 dias (6 meses) é adequado para a maioria dos veículos. 
                        Ajuste conforme o tipo de frota e intensidade de uso.
                      </li>
                      <li>
                        <strong>Odómetro máximo:</strong> 200.000 km é um limite comum, mas pode variar. 
                        Veículos mais antigos ou de maior desgaste podem necessitar de limites inferiores.
                      </li>
                      <li>
                        <strong>Alertas actuais:</strong> As alterações aplicam-se imediatamente a todos os veículos da frota.
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        {/* Dialog para criar/editar viagem */}
        <Dialog open={tripDialogOpen} onOpenChange={setTripDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{tripFormMode === "create" ? "Nova viagem" : "Editar viagem"}</DialogTitle>
              <DialogDescription>
                {tripFormMode === "create"
                  ? "Registe uma nova viagem para a frota."
                  : "Atualize os dados da viagem."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleTripSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="trip-driver">Motorista *</Label>
                <Select
                  value={tripDriverId || "none"}
                  onValueChange={(value) => {
                    const newDriverId = value === "none" ? "" : value;
                    setTripDriverId(newDriverId);
                    setTripVehicleId("");
                  }}
                >
                  <SelectTrigger id="trip-driver">
                    <SelectValue placeholder="Selecione o motorista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>Selecione um motorista</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.full_name} ({driver.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {drivers.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum motorista registado ainda.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="trip-vehicle">Viatura *</Label>
                <Select
                  value={tripVehicleId || "none"}
                  onValueChange={(value) => setTripVehicleId(value === "none" ? "" : value)}
                  disabled={!tripDriverId}
                >
                  <SelectTrigger id="trip-vehicle">
                    <SelectValue placeholder={tripDriverId ? "Selecione a viatura" : "Selecione primeiro o motorista"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>Selecione uma viatura</SelectItem>
                    {vehicles
                      .filter((v) => v.driver_id === tripDriverId)
                      .map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.placa} ({v.marca} {v.modelo})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data de início *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !tripStartDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {tripStartDate ? new Date(tripStartDate).toLocaleDateString("pt-PT") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={tripStartDate}
                        onSelect={setTripStartDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Data de fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !tripEndDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {tripEndDate ? new Date(tripEndDate).toLocaleDateString("pt-PT") : "Opcional"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={tripEndDate}
                        onSelect={setTripEndDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="trip-distance">Distância (km)</Label>
                  <Input
                    id="trip-distance"
                    type="number"
                    placeholder="Ex: 150"
                    value={tripDistanceKm}
                    onChange={(e) => setTripDistanceKm(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trip-cost">Custo estimado (Kz)</Label>
                  <Input
                    id="trip-cost"
                    type="number"
                    placeholder="Ex: 75.50"
                    value={tripEstimatedCost}
                    onChange={(e) => setTripEstimatedCost(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trip-status">Estado</Label>
                <Select value={tripStatus} onValueChange={(val) => setTripStatus(val as TripStatus)}>
                  <SelectTrigger id="trip-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planeada">Planeada</SelectItem>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trip-notes">Notas (opcional)</Label>
                <Input
                  id="trip-notes"
                  placeholder="Observações sobre a viagem"
                  value={tripNotes}
                  onChange={(e) => setTripNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setTripDialogOpen(false);
                    resetTripForm();
                    setEditingTrip(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">{tripFormMode === "create" ? "Criar viagem" : "Guardar"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog para criar/editar fornecedor */}
        <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{supplierFormMode === "create" ? "Novo fornecedor" : "Editar fornecedor"}</DialogTitle>
              <DialogDescription>
                {supplierFormMode === "create"
                  ? "Adicione um novo fornecedor ao sistema."
                  : "Atualize os dados do fornecedor."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSupplierSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="supplier-name">Nome *</Label>
                <Input
                  id="supplier-name"
                  placeholder="Nome do fornecedor"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-category">Categoria *</Label>
                <Select value={supplierCategory} onValueChange={(val) => setSupplierCategory(val as SupplierCategory)}>
                  <SelectTrigger id="supplier-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oficina">Oficina</SelectItem>
                    <SelectItem value="posto_combustivel">Posto Combustível</SelectItem>
                    <SelectItem value="pecas">Peças</SelectItem>
                    <SelectItem value="seguradora">Seguradora</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-contact">Pessoa de contacto</Label>
                <Input
                  id="supplier-contact"
                  placeholder="Nome do responsável"
                  value={supplierContactPerson}
                  onChange={(e) => setSupplierContactPerson(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="supplier-phone">Telefone</Label>
                  <Input
                    id="supplier-phone"
                    placeholder="+351 912 345 678"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier-email">Email</Label>
                  <Input
                    id="supplier-email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-address">Morada</Label>
                <Input
                  id="supplier-address"
                  placeholder="Rua, número, cidade"
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-notes">Notas (opcional)</Label>
                <Input
                  id="supplier-notes"
                  placeholder="Observações"
                  value={supplierNotes}
                  onChange={(e) => setSupplierNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSupplierDialogOpen(false);
                    resetSupplierForm();
                    setEditingSupplier(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">{supplierFormMode === "create" ? "Criar fornecedor" : "Guardar"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog para criar/editar item de inventário */}
        <Dialog open={inventoryDialogOpen} onOpenChange={setInventoryDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {inventoryFormMode === "create" ? "Novo item de inventário" : "Editar item"}
              </DialogTitle>
              <DialogDescription>
                {inventoryFormMode === "create"
                  ? "Adicione um novo item ao inventário."
                  : "Atualize os dados do item."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInventorySubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="inventory-name">Nome *</Label>
                <Input
                  id="inventory-name"
                  placeholder="Ex: Pneu Michelin 205/55R16"
                  value={inventoryName}
                  onChange={(e) => setInventoryName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="inventory-category">Categoria *</Label>
                  <Select
                    value={inventoryCategory}
                    onValueChange={(val) => setInventoryCategory(val as InventoryCategory)}
                  >
                    <SelectTrigger id="inventory-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pneus">Pneus</SelectItem>
                      <SelectItem value="oleo">Óleo</SelectItem>
                      <SelectItem value="filtros">Filtros</SelectItem>
                      <SelectItem value="pecas">Peças</SelectItem>
                      <SelectItem value="consumiveis">Consumíveis</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inventory-unit">Unidade *</Label>
                  <Input
                    id="inventory-unit"
                    placeholder="Ex: unidade, litro, kg"
                    value={inventoryUnit}
                    onChange={(e) => setInventoryUnit(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="inventory-min">Stock mínimo</Label>
                  <Input
                    id="inventory-min"
                    type="number"
                    placeholder="0"
                    value={inventoryMinStock}
                    onChange={(e) => setInventoryMinStock(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inventory-cost">Custo unitário (Kz)</Label>
                  <Input
                    id="inventory-cost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={inventoryUnitCost}
                    onChange={(e) => setInventoryUnitCost(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inventory-supplier">Fornecedor (opcional)</Label>
                <Select value={inventorySupplierId || "none"} onValueChange={(value) => setInventorySupplierId(value === "none" ? "" : value)}>
                  <SelectTrigger id="inventory-supplier">
                    <SelectValue placeholder="Selecione o fornecedor (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem fornecedor</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inventory-location">Localização</Label>
                <Input
                  id="inventory-location"
                  placeholder="Ex: Armazém A, Prateleira 3"
                  value={inventoryLocation}
                  onChange={(e) => setInventoryLocation(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inventory-notes">Notas</Label>
                <Input
                  id="inventory-notes"
                  placeholder="Observações"
                  value={inventoryNotes}
                  onChange={(e) => setInventoryNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setInventoryDialogOpen(false);
                    resetInventoryForm();
                    setEditingInventoryItem(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">{inventoryFormMode === "create" ? "Criar item" : "Guardar"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog para criar transação financeira */}
        <Dialog open={financeDialogOpen} onOpenChange={setFinanceDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova transação financeira</DialogTitle>
              <DialogDescription>Registe uma receita ou despesa da frota.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleFinanceSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="finance-type">Tipo *</Label>
                  <Select value={financeType} onValueChange={(val) => setFinanceType(val as "receita" | "despesa")}>
                    <SelectTrigger id="finance-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receita">Receita</SelectItem>
                      <SelectItem value="despesa">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="finance-category">Categoria *</Label>
                  <Select value={financeCategory} onValueChange={setFinanceCategory}>
                    <SelectTrigger id="finance-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="combustivel">Combustível</SelectItem>
                      <SelectItem value="manutencao">Manutenção</SelectItem>
                      <SelectItem value="portagens">Portagens</SelectItem>
                      <SelectItem value="seguro">Seguro</SelectItem>
                      <SelectItem value="imposto">Imposto</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="finance-amount">Valor (Kz) *</Label>
                  <Input
                    id="finance-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={financeAmount}
                    onChange={(e) => setFinanceAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="finance-date">Data *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !financeDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {financeDate ? new Date(financeDate).toLocaleDateString("pt-PT") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={financeDate}
                        onSelect={setFinanceDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="finance-vehicle">Veículo (opcional)</Label>
                <Select value={financeVehicleId || "none"} onValueChange={(value) => setFinanceVehicleId(value === "none" ? "" : value)}>
                  <SelectTrigger id="finance-vehicle">
                    <SelectValue placeholder="Selecione o veículo (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem veículo específico</SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.placa} ({v.marca} {v.modelo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="finance-description">Descrição (opcional)</Label>
                <Input
                  id="finance-description"
                  placeholder="Detalhes da transação"
                  value={financeDescription}
                  onChange={(e) => setFinanceDescription(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFinanceDialogOpen(false);
                    resetFinanceForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">Criar transação</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog para registar movimento de stock */}
        <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registar movimento de stock</DialogTitle>
              <DialogDescription>Entrada, saída ou ajuste de stock.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleMovementSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="movement-item">Item *</Label>
                <Select value={movementItemId || "none"} onValueChange={(value) => setMovementItemId(value === "none" ? "" : value)}>
                  <SelectTrigger id="movement-item">
                    <SelectValue placeholder="Selecione o item" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>Selecione um item</SelectItem>
                    {inventoryItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} (Stock: {item.current_stock} {item.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="movement-type">Tipo *</Label>
                  <Select
                    value={movementType}
                    onValueChange={(val) => setMovementType(val as InventoryMovementType)}
                  >
                    <SelectTrigger id="movement-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                      <SelectItem value="ajuste">Ajuste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="movement-quantity">
                    Quantidade * {movementType === "ajuste" && "(stock final)"}
                  </Label>
                  <Input
                    id="movement-quantity"
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={movementQuantity}
                    onChange={(e) => setMovementQuantity(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="movement-date">Data *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !movementDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {movementDate ? new Date(movementDate).toLocaleDateString("pt-PT") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={movementDate}
                        onSelect={setMovementDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="movement-cost">Custo unitário (Kz)</Label>
                  <Input
                    id="movement-cost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={movementUnitCost}
                    onChange={(e) => setMovementUnitCost(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="movement-reference">Referência</Label>
                <Input
                  id="movement-reference"
                  placeholder="Ex: OC-2024-123"
                  value={movementReference}
                  onChange={(e) => setMovementReference(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="movement-notes">Notas</Label>
                <Input
                  id="movement-notes"
                  placeholder="Observações"
                  value={movementNotes}
                  onChange={(e) => setMovementNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMovementDialogOpen(false);
                    resetMovementForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">Registar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog para mapa de viagem (Ver rota) */}
        <Dialog open={tripMapDialogOpen} onOpenChange={setTripMapDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Mapa da viagem</DialogTitle>
              <DialogDescription>
                {selectedTripForMap ? (
                  <span>
                    {(selectedTripForMap.origem_label || "Origem")} 
                    {" 					"}
                    					
                    					
                    					
                    					
                    					
                    					
                    
                    					
                     					
                    					
                     
                    					
                     
                    					
                    
                    					
                     
                     					
                    					
                     
                     					
                     					
                     					
                    
                     					
                    					
                    					
                    
                    					
                    &#8594; {selectedTripForMap.destino_label || "Destino"}
                  </span>
                ) : (
                  <span>Selecione uma viagem para ver o mapa.</span>
                )}
              </DialogDescription>
            </DialogHeader>
            {selectedTripForMap && selectedTripForMap.origem_label && selectedTripForMap.destino_label && (
              <TripRouteMap
                origemLabel={selectedTripForMap.origem_label}
                destinoLabel={selectedTripForMap.destino_label}
              />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminDashboard;
