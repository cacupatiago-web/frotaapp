import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell,
  Car,
  Fuel,
  Package,
  Settings2,
  WalletCards,
  Calendar as CalendarIcon,
  Trash2,
  LogOut,
} from "lucide-react";

// ------- Tipos -------

type VehicleStatus = "em_operacao" | "parado" | "em_manutencao";

type FuelType =
  | "gasolina"
  | "diesel"
  | "etanol"
  | "gas_natural"
  | "eletrico"
  | "hibrido"
  | "outro";

interface Vehicle {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number | null;
  status: VehicleStatus;
  combustivel: FuelType | null;
  odometro: number | null;
}

type MaintenanceStatus = "agendado" | "em_progresso" | "concluido";

type MaintenanceType =
  | "revisao_geral"
  | "troca_oleo"
  | "pneus"
  | "freios"
  | "suspensao"
  | "motor"
  | "outro";

interface Maintenance {
  id: string;
  vehicle_id: string;
  scheduled_date: string;
  status: MaintenanceStatus;
  maintenance_type: MaintenanceType;
  description: string | null;
  cost: number | null;
  vehicle?: {
    placa: string;
    marca: string;
    modelo: string;
  } | null;
}

interface FinancialTransaction {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  type: "entrada" | "saida";
  category: string;
  amount: number;
  date: string; // ISO date string (yyyy-mm-dd)
  description: string | null;
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
  fuel_type: FuelType | null;
  vehicle?: {
    placa: string;
    marca: string;
    modelo: string;
  } | null;
}

type InventoryCategory = "pneus" | "oleo" | "filtros" | "pecas" | "consumiveis" | "outro";

interface InventoryItem {
  id: string;
  user_id: string;
  name: string;
  category: InventoryCategory;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  unit_cost: number | null;
  location: string | null;
  notes: string | null;
}

const categoryLabels: Record<string, string> = {
  combustivel: "Combustível",
  inventario: "Inventário",
  manutencao: "Manutenção",
  outros: "Outros",
};

const fuelTypeLabels: Record<FuelType, string> = {
  gasolina: "Gasolina",
  diesel: "Diesel",
  etanol: "Etanol",
  gas_natural: "Gás natural",
  eletrico: "Eléctrico",
  hibrido: "Híbrido",
  outro: "Outro",
};

const inventoryCategoryLabels: Record<InventoryCategory, string> = {
  pneus: "Pneus",
  oleo: "Óleo",
  filtros: "Filtros",
  pecas: "Peças",
  consumiveis: "Consumíveis",
  outro: "Outros",
};

const chartConfig = {
  combustivel: {
    label: "Combustível",
    color: "hsl(var(--chart-1))",
  },
  inventario: {
    label: "Inventário",
    color: "hsl(var(--chart-2))",
  },
  manutencao: {
    label: "Manutenção",
    color: "hsl(var(--chart-3))",
  },
  outros: {
    label: "Outros",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ------- Estado Finanças -------
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // ------- Estado Veículos -------
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<"all" | VehicleStatus>("all");
  const [vehicleFuelFilter, setVehicleFuelFilter] = useState<"all" | FuelType>("all");

  // ------- Estado Manutenção -------
  const [maintenanceVehicleId, setMaintenanceVehicleId] = useState<string>("");
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>("revisao_geral");
  const [maintenanceDate, setMaintenanceDate] = useState<string>("");
  const [maintenanceCost, setMaintenanceCost] = useState<string>("");
  const [maintenanceDescription, setMaintenanceDescription] = useState<string>("");
  const [maintenanceVehicleFilter, setMaintenanceVehicleFilter] = useState<string>("all");
  const [maintenanceStartDateFilter, setMaintenanceStartDateFilter] = useState<string>("");
  const [maintenanceEndDateFilter, setMaintenanceEndDateFilter] = useState<string>("");

  // ------- Estado Combustível -------
  const [fuelVehicleFilter, setFuelVehicleFilter] = useState<string>("all");
  const [fuelStartDate, setFuelStartDate] = useState<string>("");
  const [fuelEndDate, setFuelEndDate] = useState<string>("");
  const [fuelVehicleId, setFuelVehicleId] = useState<string>("");
  const [fuelDate, setFuelDate] = useState<string>("");
  const [fuelLiters, setFuelLiters] = useState<string>("");
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState<string>("");
  const [fuelSupplierName, setFuelSupplierName] = useState<string>("");
  const [fuelOdometer, setFuelOdometer] = useState<string>("");
  const [fuelType, setFuelType] = useState<FuelType | "">("");

  // ------- Estado Inventário -------
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState<"all" | InventoryCategory>("all");
  const [inventoryLowStockOnly, setInventoryLowStockOnly] = useState(false);
  const [inventoryName, setInventoryName] = useState("");
  const [inventoryCategory, setInventoryCategory] = useState<InventoryCategory | "">("");
  const [inventoryUnit, setInventoryUnit] = useState("");
  const [inventoryCurrentStock, setInventoryCurrentStock] = useState("");
  const [inventoryMinimumStock, setInventoryMinimumStock] = useState("");
  const [inventoryUnitCost, setInventoryUnitCost] = useState("");
  const [inventoryLocation, setInventoryLocation] = useState("");
  const [inventoryNotes, setInventoryNotes] = useState("");

  // ------- Estado Definições -------
  const [settingsVehicleId, setSettingsVehicleId] = useState<string>("");
  const [settingsOdometer, setSettingsOdometer] = useState<string>("");
  const [settingsNextServiceKm, setSettingsNextServiceKm] = useState<string>("");

  // ------- Queries -------
  const { data: vehicles = [], isLoading: isVehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["vehicles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, placa, marca, modelo, ano, status, combustivel, odometro")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Vehicle[];
    },
    enabled: !!user,
  });

  const { data: maintenances = [], isLoading: isMaintenancesLoading } = useQuery<Maintenance[]>({
    queryKey: ["vehicle_maintenances", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("vehicle_maintenances")
        .select(
          "id, vehicle_id, scheduled_date, status, maintenance_type, description, cost, vehicles:vehicle_id(placa, marca, modelo)",
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

  const {
    data: transactions = [],
    isLoading: isTransactionsLoading,
    refetch: refetchTransactions,
  } = useQuery<FinancialTransaction[]>({
    queryKey: ["financial_transactions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FinancialTransaction[];
    },
    enabled: !!user,
  });

  const { data: fuelFillups = [], isLoading: isFuelLoading } = useQuery<FuelFillup[]>({
    queryKey: ["fuel_fillups", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("fuel_fillups")
        .select(
          "id, user_id, vehicle_id, date, odometer, liters, price_per_liter, total_amount, supplier_name, fuel_type, vehicles:vehicle_id(placa, marca, modelo)",
        )
        .order("date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row,
        vehicle: row.vehicles,
      }));
    },
    enabled: !!user,
  });

  const { data: inventoryItems = [], isLoading: isInventoryLoading } = useQuery<InventoryItem[]>({
    queryKey: ["inventory_items", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, user_id, name, category, unit, current_stock, minimum_stock, unit_cost, location, notes")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as InventoryItem[];
    },
    enabled: !!user,
  });

  // ------- Handlers -------

  const handleDeleteTransaction = async (id: string) => {
    const confirmed = window.confirm("Tem a certeza que deseja eliminar esta transação?");
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Transação eliminada", description: "A transação foi removida com sucesso." });
      await refetchTransactions();
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao eliminar",
        description: "Não foi possível eliminar a transação.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteVehicle = async (id: string) => {
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

  const handleScheduleMaintenance = async () => {
    if (!maintenanceVehicleId || !maintenanceDate || !maintenanceCost) {
      toast({
        title: "Dados em falta",
        description: "Seleccione veículo, data e custo para agendar a manutenção.",
        variant: "destructive",
      });
      return;
    }

    const costNumber = Number(maintenanceCost);
    if (!Number.isFinite(costNumber) || costNumber <= 0) {
      toast({
        title: "Custo inválido",
        description: "Introduza um valor numérico válido para o custo.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("vehicle_maintenances").insert({
        user_id: user?.id,
        vehicle_id: maintenanceVehicleId,
        scheduled_date: maintenanceDate,
        status: "agendado" as MaintenanceStatus,
        maintenance_type: maintenanceType,
        description: maintenanceDescription || null,
        cost: costNumber,
      } as any);
      if (error) throw error;

      const { error: financeError } = await supabase.from("financial_transactions").insert({
        user_id: user?.id,
        vehicle_id: maintenanceVehicleId,
        date: maintenanceDate,
        type: "saida",
        category: "manutencao",
        amount: costNumber,
        description:
          maintenanceDescription ||
          `Manutenção veículo ${vehicles.find((v) => v.id === maintenanceVehicleId)?.placa || "sem placa"}`,
      } as any);
      if (financeError) throw financeError;

      toast({
        title: "Manutenção agendada",
        description: "O registo foi criado e a despesa associada nas finanças.",
      });

      setMaintenanceVehicleId("");
      setMaintenanceDate("");
      setMaintenanceCost("");
      setMaintenanceDescription("");

      await queryClient.invalidateQueries({ queryKey: ["vehicle_maintenances"] });
      await queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao agendar",
        description: "Não foi possível agendar a manutenção.",
        variant: "destructive",
      });
    }
  };

  const handleCreateFuelFillup = async () => {
    if (!fuelVehicleId || !fuelDate || !fuelLiters || !fuelPricePerLiter) {
      toast({
        title: "Dados em falta",
        description: "Preencha veículo, data, litros e preço por litro.",
        variant: "destructive",
      });
      return;
    }

    const litersNumber = Number(fuelLiters.replace(",", "."));
    const priceNumber = Number(fuelPricePerLiter.replace(",", "."));
    const odometerNumber = fuelOdometer ? Number(fuelOdometer.replace(",", ".")) : null;

    if (!Number.isFinite(litersNumber) || litersNumber <= 0 || !Number.isFinite(priceNumber) || priceNumber <= 0) {
      toast({
        title: "Valores inválidos",
        description: "Litros e preço por litro devem ser números positivos.",
        variant: "destructive",
      });
      return;
    }

    const totalAmount = litersNumber * priceNumber;

    try {
      const { error } = await supabase.from("fuel_fillups").insert({
        user_id: user?.id,
        vehicle_id: fuelVehicleId,
        date: fuelDate,
        liters: litersNumber,
        price_per_liter: priceNumber,
        total_amount: totalAmount,
        supplier_name: fuelSupplierName || null,
        odometer: odometerNumber,
        fuel_type: fuelType || null,
      } as any);
      if (error) throw error;

      const { error: financeError } = await supabase.from("financial_transactions").insert({
        user_id: user?.id,
        vehicle_id: fuelVehicleId,
        date: fuelDate,
        type: "saida",
        category: "combustivel",
        amount: totalAmount,
        description:
          fuelSupplierName ||
          `Abastecimento veículo ${vehicles.find((v) => v.id === fuelVehicleId)?.placa || "sem placa"}`,
      } as any);
      if (financeError) throw financeError;

      toast({
        title: "Abastecimento registado",
        description: "O abastecimento e a despesa financeira foram registados.",
      });

      setFuelVehicleId("");
      setFuelDate("");
      setFuelLiters("");
      setFuelPricePerLiter("");
      setFuelSupplierName("");
      setFuelOdometer("");
      setFuelType("");

      await queryClient.invalidateQueries({ queryKey: ["fuel_fillups"] });
      await queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao registar abastecimento",
        description: "Não foi possível registar o abastecimento.",
        variant: "destructive",
      });
    }
  };

  const handleCreateInventoryItem = async () => {
    if (!inventoryName || !inventoryCategory || !inventoryUnit) {
      toast({
        title: "Dados em falta",
        description: "Preencha nome, categoria e unidade do item.",
        variant: "destructive",
      });
      return;
    }

    const currentStockNumber = inventoryCurrentStock ? Number(inventoryCurrentStock.replace(",", ".")) : 0;
    const minimumStockNumber = inventoryMinimumStock ? Number(inventoryMinimumStock.replace(",", ".")) : 0;
    const unitCostNumber = inventoryUnitCost ? Number(inventoryUnitCost.replace(",", ".")) : null;

    if (
      !Number.isFinite(currentStockNumber) ||
      currentStockNumber < 0 ||
      !Number.isFinite(minimumStockNumber) ||
      minimumStockNumber < 0 ||
      (unitCostNumber != null && (!Number.isFinite(unitCostNumber) || unitCostNumber < 0))
    ) {
      toast({
        title: "Valores inválidos",
        description: "Stocks e custo unitário devem ser números válidos.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("inventory_items").insert({
        user_id: user?.id,
        name: inventoryName,
        category: inventoryCategory,
        unit: inventoryUnit,
        current_stock: currentStockNumber,
        minimum_stock: minimumStockNumber,
        unit_cost: unitCostNumber,
        location: inventoryLocation || null,
        notes: inventoryNotes || null,
      } as any);
      if (error) throw error;

      if (unitCostNumber != null && currentStockNumber > 0) {
        const totalAmount = unitCostNumber * currentStockNumber;
        const { error: financeError } = await supabase.from("financial_transactions").insert({
          user_id: user?.id,
          vehicle_id: null,
          date: new Date().toISOString().slice(0, 10),
          type: "saida",
          category: "inventario",
          amount: totalAmount,
          description: `Compra de inventário: ${inventoryName}`,
        } as any);
        if (financeError) throw financeError;
      }

      toast({
        title: "Item criado",
        description: "O item de inventário foi criado e, se aplicável, registada a despesa.",
      });

      setInventoryName("");
      setInventoryCategory("");
      setInventoryUnit("");
      setInventoryCurrentStock("");
      setInventoryMinimumStock("");
      setInventoryUnitCost("");
      setInventoryLocation("");
      setInventoryNotes("");

      await queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
      await queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao criar item",
        description: "Não foi possível criar o item de inventário.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateVehicleSettings = async () => {
    if (!settingsVehicleId) {
      toast({
        title: "Veículo em falta",
        description: "Selecione um veículo para actualizar.",
        variant: "destructive",
      });
      return;
    }

    const odometerNumber = settingsOdometer ? Number(settingsOdometer.replace(",", ".")) : null;
    const nextServiceNumber = settingsNextServiceKm ? Number(settingsNextServiceKm.replace(",", ".")) : null;

    if (
      (odometerNumber != null && (!Number.isFinite(odometerNumber) || odometerNumber < 0)) ||
      (nextServiceNumber != null && (!Number.isFinite(nextServiceNumber) || nextServiceNumber < 0))
    ) {
      toast({
        title: "Valores inválidos",
        description: "Odómetro e próxima revisão devem ser números positivos.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("vehicles")
        .update({
          odometro: odometerNumber,
          next_service_km: nextServiceNumber,
        })
        .eq("id", settingsVehicleId);
      if (error) throw error;

      toast({
        title: "Definições actualizadas",
        description: "As definições de quilometragem e manutenção foram guardadas.",
      });

      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao actualizar",
        description: "Não foi possível actualizar as definições do veículo.",
        variant: "destructive",
      });
    }
  };

  // ------- Derivados -------

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;
      return true;
    });
  }, [transactions, typeFilter, categoryFilter, startDate, endDate]);

  const totals = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, t) => {
        if (t.type === "entrada") acc.income += t.amount;
        else acc.expense += t.amount;
        return acc;
      },
      { income: 0, expense: 0 },
    );
  }, [filteredTransactions]);

  const balance = totals.income - totals.expense;

  const categoryData = useMemo(() => {
    const base = {
      combustivel: 0,
      inventario: 0,
      manutencao: 0,
      outros: 0,
    } as Record<string, number>;

    filteredTransactions
      .filter((t) => t.type === "saida")
      .forEach((t) => {
        const key = t.category in base ? t.category : "outros";
        base[key] += t.amount;
      });

    return [
      {
        categoria: "Combustível",
        combustivel: base.combustivel,
        inventario: 0,
        manutencao: 0,
        outros: 0,
      },
      {
        categoria: "Inventário",
        combustivel: 0,
        inventario: base.inventario,
        manutencao: 0,
        outros: 0,
      },
      {
        categoria: "Manutenção",
        combustivel: 0,
        inventario: 0,
        manutencao: base.manutencao,
        outros: 0,
      },
      {
        categoria: "Outros",
        combustivel: 0,
        inventario: 0,
        manutencao: 0,
        outros: base.outros,
      },
    ];
  }, [filteredTransactions]);

  const maxValue = useMemo(() => {
    const values = categoryData.flatMap((row) => [row.combustivel, row.inventario, row.manutencao, row.outros]);
    const max = Math.max(0, ...values);
    return max === 0 ? 1000 : max * 1.2;
  }, [categoryData]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (vehicleSearch && !`${v.placa} ${v.marca} ${v.modelo}`.toLowerCase().includes(vehicleSearch.toLowerCase())) {
        return false;
      }
      if (vehicleStatusFilter !== "all" && v.status !== vehicleStatusFilter) return false;
      if (vehicleFuelFilter !== "all" && v.combustivel !== vehicleFuelFilter) return false;
      return true;
    });
  }, [vehicles, vehicleSearch, vehicleStatusFilter, vehicleFuelFilter]);

  const filteredMaintenances = useMemo(() => {
    return maintenances.filter((m) => {
      if (maintenanceVehicleFilter !== "all" && m.vehicle_id !== maintenanceVehicleFilter) return false;
      if (maintenanceStartDateFilter && m.scheduled_date < maintenanceStartDateFilter) return false;
      if (maintenanceEndDateFilter && m.scheduled_date > maintenanceEndDateFilter) return false;
      return true;
    });
  }, [maintenances, maintenanceVehicleFilter, maintenanceStartDateFilter, maintenanceEndDateFilter]);

  const filteredFuelFillups = useMemo(() => {
    return fuelFillups.filter((f) => {
      if (fuelVehicleFilter !== "all" && f.vehicle_id !== fuelVehicleFilter) return false;
      if (fuelStartDate && f.date < fuelStartDate) return false;
      if (fuelEndDate && f.date > fuelEndDate) return false;
      return true;
    });
  }, [fuelFillups, fuelVehicleFilter, fuelStartDate, fuelEndDate]);

  const filteredInventoryItems = useMemo(() => {
    return inventoryItems.filter((i) => {
      if (
        inventorySearch &&
        !`${i.name} ${inventoryCategoryLabels[i.category]} ${i.location ?? ""}`
          .toLowerCase()
          .includes(inventorySearch.toLowerCase())
      ) {
        return false;
      }
      if (inventoryCategoryFilter !== "all" && i.category !== inventoryCategoryFilter) return false;
      if (inventoryLowStockOnly && i.current_stock > i.minimum_stock) return false;
      return true;
    });
  }, [inventoryItems, inventorySearch, inventoryCategoryFilter, inventoryLowStockOnly]);

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/auth";
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

      <main className="container py-8 md:py-10 space-y-6">
        <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Visão geral da frota</h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Controle veículos, manutenções, combustível, inventário e finanças da frota num único painel.
            </p>
          </div>
        </section>

        <Tabs defaultValue="financas" className="space-y-6">
          <TabsList className="flex flex-wrap gap-2">
            <TabsTrigger value="financas" className="gap-2">
              <WalletCards className="h-4 w-4" />
              Finanças
            </TabsTrigger>
            <TabsTrigger value="veiculos" className="gap-2">
              <Car className="h-4 w-4" />
              Veículos
            </TabsTrigger>
            <TabsTrigger value="manutencao" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Manutenção
            </TabsTrigger>
            <TabsTrigger value="combustivel" className="gap-2">
              <Fuel className="h-4 w-4" />
              Combustível
            </TabsTrigger>
            <TabsTrigger value="inventario" className="gap-2">
              <Package className="h-4 w-4" />
              Inventário
            </TabsTrigger>
            <TabsTrigger value="definicoes" className="gap-2">
              <Bell className="h-4 w-4" />
              Definições
            </TabsTrigger>
          </TabsList>

          {/* --------- ABA FINANÇAS --------- */}
          <TabsContent value="financas" className="space-y-6">
            <section className="grid gap-4 md:grid-cols-3">
              <Card className="animate-fade-in">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Receitas</CardTitle>
                  <CardDescription>Entradas financeiras no período filtrado.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">
                    Kz {totals.income.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>

              <Card className="animate-fade-in">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Despesas</CardTitle>
                  <CardDescription>Saídas financeiras no período filtrado.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-destructive">
                    Kz {totals.expense.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>

              <Card className="animate-fade-in">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Saldo</CardTitle>
                  <CardDescription>Receitas menos despesas.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p
                    className={`text-2xl font-semibold ${
                      balance >= 0 ? "text-emerald-500" : "text-destructive"
                    }`}
                  >
                    Kz {balance.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>
            </section>

            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="h-4 w-4 text-primary" />
                  Resumo de despesas por categoria
                </CardTitle>
                <CardDescription>
                  Valores de despesas por categoria, respeitando os filtros de tipo, categoria e datas abaixo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-xs md:text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="h-8 w-36">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        <SelectItem value="entrada">Receitas</SelectItem>
                        <SelectItem value="saida">Despesas</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as categorias</SelectItem>
                        <SelectItem value="combustivel">Combustível</SelectItem>
                        <SelectItem value="inventario">Inventário</SelectItem>
                        <SelectItem value="manutencao">Manutenção</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-8 w-36"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-8 w-36"
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full overflow-x-auto">
                  <ChartContainer
                    config={chartConfig}
                    className="h-64 w-full min-w-[320px] rounded-xl border border-border/70 bg-background/80 p-4"
                  >
                    <BarChart data={categoryData} barSize={32}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="categoria" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `Kz ${value.toLocaleString("pt-PT")}`}
                        domain={[0, maxValue]}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "hsl(var(--muted))" }} />
                      <Bar dataKey="combustivel" fill="var(--color-combustivel)" radius={4} />
                      <Bar dataKey="inventario" fill="var(--color-inventario)" radius={4} />
                      <Bar dataKey="manutencao" fill="var(--color-manutencao)" radius={4} />
                      <Bar dataKey="outros" fill="var(--color-outros)" radius={4} />
                    </BarChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-base">Transações financeiras</CardTitle>
                <CardDescription>
                  Registe receitas e despesas da frota. Use os filtros acima para ajustar o período.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isTransactionsLoading ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">A carregar transações...</p>
                ) : filteredTransactions.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Não existem transações para os filtros seleccionados.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-right">Valor (Kz)</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.map((t) => (
                          <TableRow key={t.id} className="text-xs md:text-sm">
                            <TableCell>
                              <Badge variant={t.type === "entrada" ? "default" : "destructive"}>
                                {t.type === "entrada" ? "Receita" : "Despesa"}
                              </Badge>
                            </TableCell>
                            <TableCell>{categoryLabels[t.category] || t.category}</TableCell>
                            <TableCell>{t.date}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {t.description || <span className="text-muted-foreground">Sem descrição</span>}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              Kz {t.amount.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteTransaction(t.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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

          {/* --------- ABA VEÍCULOS --------- */}
          <TabsContent value="veiculos" className="space-y-4">
            <Card className="animate-fade-in">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">Gestão de veículos</CardTitle>
                <CardDescription>
                  Lista de viaturas da frota com filtros rápidos por estado e combustível.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-xs md:text-sm">
                  <Input
                    placeholder="Pesquisar por matrícula, marca ou modelo"
                    className="h-8 md:max-w-xs"
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Select value={vehicleStatusFilter} onValueChange={(v) => setVehicleStatusFilter(v as any)}>
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos estados</SelectItem>
                        <SelectItem value="em_operacao">Em operação</SelectItem>
                        <SelectItem value="em_manutencao">Em manutenção</SelectItem>
                        <SelectItem value="parado">Parado</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={vehicleFuelFilter} onValueChange={(v) => setVehicleFuelFilter(v as any)}>
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue placeholder="Combustível" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="gasolina">Gasolina</SelectItem>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="gas_natural">Gás natural</SelectItem>
                        <SelectItem value="eletrico">Eléctrico</SelectItem>
                        <SelectItem value="hibrido">Híbrido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isVehiclesLoading ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">A carregar veículos...</p>
                ) : filteredVehicles.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Nenhum veículo encontrado para os filtros seleccionados.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Matrícula</TableHead>
                          <TableHead>Marca / Modelo</TableHead>
                          <TableHead>Combustível</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Odómetro (km)</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVehicles.map((v) => (
                          <TableRow key={v.id} className="text-xs md:text-sm">
                            <TableCell className="font-medium">{v.placa}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>
                                  {v.marca} {v.modelo}
                                </span>
                                {v.ano && (
                                  <span className="text-[11px] text-muted-foreground">Ano {v.ano}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {v.combustivel ? fuelTypeLabels[v.combustivel] : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  v.status === "em_operacao"
                                    ? "default"
                                    : v.status === "em_manutencao"
                                    ? "secondary"
                                    : "outline"
                                }
                                className="text-[11px]"
                              >
                                {v.status === "em_operacao" && "Em operação"}
                                {v.status === "em_manutencao" && "Em manutenção"}
                                {v.status === "parado" && "Parado"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {v.odometro != null ? `${v.odometro.toLocaleString("pt-PT")} km` : "Sem registo"}
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteVehicle(v.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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

          {/* --------- ABA MANUTENÇÃO --------- */}
          <TabsContent value="manutencao" className="space-y-6">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-base">Agendamento de manutenção</CardTitle>
                <CardDescription>
                  Crie pedidos de manutenção e registe automaticamente a despesa correspondente nas finanças.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs md:text-sm">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Veículo</p>
                    <Select value={maintenanceVehicleId} onValueChange={setMaintenanceVehicleId}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Seleccionar veículo" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.placa} · {v.marca} {v.modelo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Tipo</p>
                    <Select value={maintenanceType} onValueChange={(v) => setMaintenanceType(v as MaintenanceType)}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revisao_geral">Revisão geral</SelectItem>
                        <SelectItem value="troca_oleo">Troca de óleo</SelectItem>
                        <SelectItem value="pneus">Pneus</SelectItem>
                        <SelectItem value="freios">Travões</SelectItem>
                        <SelectItem value="suspensao">Suspensão</SelectItem>
                        <SelectItem value="motor">Motor</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Data agendada</p>
                    <Input
                      type="date"
                      className="h-8"
                      value={maintenanceDate}
                      onChange={(e) => setMaintenanceDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Custo (Kz)</p>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-8"
                      value={maintenanceCost}
                      onChange={(e) => setMaintenanceCost(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground">Descrição (opcional)</p>
                  <Input
                    placeholder="Ex.: Revisão completa, troca de óleo e filtros"
                    value={maintenanceDescription}
                    onChange={(e) => setMaintenanceDescription(e.target.value)}
                  />
                </div>

                <div className="flex justify-end">
                  <Button size="sm" onClick={handleScheduleMaintenance}>
                    Guardar agendamento
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-base">Histórico de manutenção</CardTitle>
                <CardDescription>
                  Lista de intervenções agendadas ou concluídas por veículo e período.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs md:text-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap gap-2 items-center">
                    <p className="text-[11px] font-medium text-muted-foreground">Veículo</p>
                    <Select value={maintenanceVehicleFilter} onValueChange={setMaintenanceVehicleFilter}>
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.placa} · {v.marca} {v.modelo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                      <Input
                        type="date"
                        className="h-8 w-36"
                        value={maintenanceStartDateFilter}
                        onChange={(e) => setMaintenanceStartDateFilter(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                      <Input
                        type="date"
                        className="h-8 w-36"
                        value={maintenanceEndDateFilter}
                        onChange={(e) => setMaintenanceEndDateFilter(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {isMaintenancesLoading ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">A carregar manutenções...</p>
                ) : filteredMaintenances.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Nenhuma manutenção encontrada para os filtros seleccionados.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Veículo</TableHead>
                          <TableHead>Serviço</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Custo (Kz)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMaintenances.map((m) => (
                          <TableRow key={m.id} className="text-xs md:text-sm">
                            <TableCell>
                              {m.vehicle ? (
                                <div className="flex flex-col">
                                  <span>{m.vehicle.placa}</span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {m.vehicle.marca} {m.vehicle.modelo}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Veículo removido</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {m.maintenance_type === "revisao_geral" && "Revisão geral"}
                              {m.maintenance_type === "troca_oleo" && "Troca de óleo"}
                              {m.maintenance_type === "pneus" && "Pneus"}
                              {m.maintenance_type === "freios" && "Travões"}
                              {m.maintenance_type === "suspensao" && "Suspensão"}
                              {m.maintenance_type === "motor" && "Motor"}
                              {m.maintenance_type === "outro" && "Outro"}
                            </TableCell>
                            <TableCell>{m.scheduled_date}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  m.status === "concluido"
                                    ? "default"
                                    : m.status === "em_progresso"
                                    ? "secondary"
                                    : "outline"
                                }
                                className="text-[11px]"
                              >
                                {m.status === "agendado" && "Agendado"}
                                {m.status === "em_progresso" && "Em progresso"}
                                {m.status === "concluido" && "Concluído"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {m.cost != null ? `Kz ${m.cost.toLocaleString("pt-PT")}` : "—"}
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

          {/* --------- ABA COMBUSTÍVEL --------- */}
          <TabsContent value="combustivel" className="space-y-4">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-base">Novo abastecimento</CardTitle>
                <CardDescription>
                  Registe um novo abastecimento; a despesa será automaticamente reflectida nas finanças.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs md:text-sm">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Veículo</p>
                    <Select value={fuelVehicleId} onValueChange={setFuelVehicleId}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Seleccionar veículo" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.placa} · {v.marca} {v.modelo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Data</p>
                    <Input type="date" className="h-8" value={fuelDate} onChange={(e) => setFuelDate(e.target.value)} />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Litros</p>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-8"
                      value={fuelLiters}
                      onChange={(e) => setFuelLiters(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Preço/L (Kz)</p>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-8"
                      value={fuelPricePerLiter}
                      onChange={(e) => setFuelPricePerLiter(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Fornecedor (opcional)</p>
                    <Input
                      placeholder="Ex.: Posto X"
                      value={fuelSupplierName}
                      onChange={(e) => setFuelSupplierName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Odómetro (km, opcional)</p>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      className="h-8"
                      value={fuelOdometer}
                      onChange={(e) => setFuelOdometer(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Tipo de combustível</p>
                    <Select value={fuelType || ""} onValueChange={(v) => setFuelType(v as FuelType)}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
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

                <div className="flex justify-end">
                  <Button size="sm" onClick={handleCreateFuelFillup}>
                    Guardar abastecimento
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-base">Grelha de abastecimentos</CardTitle>
                <CardDescription>
                  Registos de combustível por viatura, integrados com os custos financeiros.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs md:text-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap gap-2 items-center">
                    <p className="text-[11px] font-medium text-muted-foreground">Veículo</p>
                    <Select value={fuelVehicleFilter} onValueChange={setFuelVehicleFilter}>
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.placa} · {v.marca} {v.modelo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                      <Input
                        type="date"
                        className="h-8 w-36"
                        value={fuelStartDate}
                        onChange={(e) => setFuelStartDate(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                      <Input
                        type="date"
                        className="h-8 w-36"
                        value={fuelEndDate}
                        onChange={(e) => setFuelEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {isFuelLoading ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">A carregar abastecimentos...</p>
                ) : filteredFuelFillups.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Nenhum abastecimento encontrado para os filtros seleccionados.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Veículo</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Litros</TableHead>
                          <TableHead className="text-right">Preço/L (Kz)</TableHead>
                          <TableHead className="text-right">Total (Kz)</TableHead>
                          <TableHead>Fornecedor</TableHead>
                          <TableHead>Odómetro</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFuelFillups.map((f) => (
                          <TableRow key={f.id} className="text-xs md:text-sm">
                            <TableCell>{f.date}</TableCell>
                            <TableCell>
                              {f.vehicle ? (
                                <div className="flex flex-col">
                                  <span>{f.vehicle.placa}</span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {f.vehicle.marca} {f.vehicle.modelo}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Veículo removido</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {f.fuel_type ? (
                                fuelTypeLabels[f.fuel_type]
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{f.liters.toLocaleString("pt-PT")}</TableCell>
                            <TableCell className="text-right">
                              Kz {f.price_per_liter.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              Kz {f.total_amount.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>{f.supplier_name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                            <TableCell>
                              {f.odometer != null ? (
                                `${f.odometer.toLocaleString("pt-PT")} km`
                              ) : (
                                <span className="text-muted-foreground">—</span>
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

          {/* --------- ABA INVENTÁRIO --------- */}
          <TabsContent value="inventario" className="space-y-4">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-base">Novo item de inventário</CardTitle>
                <CardDescription>
                  Crie itens e defina stocks mínimos para suportar alertas de reposição.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs md:text-sm">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Nome</p>
                    <Input
                      placeholder="Ex.: Filtro de óleo"
                      value={inventoryName}
                      onChange={(e) => setInventoryName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Categoria</p>
                    <Select
                      value={inventoryCategory || ""}
                      onValueChange={(v) => setInventoryCategory(v as InventoryCategory)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pneus">Pneus</SelectItem>
                        <SelectItem value="oleo">Óleo</SelectItem>
                        <SelectItem value="filtros">Filtros</SelectItem>
                        <SelectItem value="pecas">Peças</SelectItem>
                        <SelectItem value="consumiveis">Consumíveis</SelectItem>
                        <SelectItem value="outro">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Unidade</p>
                    <Input
                      placeholder="Ex.: unidade, par, litro"
                      value={inventoryUnit}
                      onChange={(e) => setInventoryUnit(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Stock actual</p>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      className="h-8"
                      value={inventoryCurrentStock}
                      onChange={(e) => setInventoryCurrentStock(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Stock mínimo</p>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      className="h-8"
                      value={inventoryMinimumStock}
                      onChange={(e) => setInventoryMinimumStock(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Custo unitário (Kz)</p>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-8"
                      value={inventoryUnitCost}
                      onChange={(e) => setInventoryUnitCost(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Localização (opcional)</p>
                    <Input
                      placeholder="Ex.: Armazém A"
                      value={inventoryLocation}
                      onChange={(e) => setInventoryLocation(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground">Notas (opcional)</p>
                  <Input
                    placeholder="Observações sobre o item"
                    value={inventoryNotes}
                    onChange={(e) => setInventoryNotes(e.target.value)}
                  />
                </div>

                <div className="flex justify-end">
                  <Button size="sm" onClick={handleCreateInventoryItem}>
                    Guardar item
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-base">Itens de inventário</CardTitle>
                <CardDescription>
                  Controlo de peças, consumíveis e materiais associados às viaturas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs md:text-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <Input
                    placeholder="Pesquisar por nome, categoria ou localização"
                    className="h-8 md:max-w-xs"
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                  />

                  <div className="flex flex-wrap gap-2 items-center">
                    <Select
                      value={inventoryCategoryFilter}
                      onValueChange={(v) => setInventoryCategoryFilter(v as any)}
                    >
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas categorias</SelectItem>
                        <SelectItem value="pneus">Pneus</SelectItem>
                        <SelectItem value="oleo">Óleo</SelectItem>
                        <SelectItem value="filtros">Filtros</SelectItem>
                        <SelectItem value="pecas">Peças</SelectItem>
                        <SelectItem value="consumiveis">Consumíveis</SelectItem>
                        <SelectItem value="outro">Outros</SelectItem>
                      </SelectContent>
                    </Select>

                    <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <input
                        type="checkbox"
                        className="h-3 w-3 rounded border-border bg-background"
                        checked={inventoryLowStockOnly}
                        onChange={(e) => setInventoryLowStockOnly(e.target.checked)}
                      />
                      Apenas stock baixo
                    </label>
                  </div>
                </div>

                {isInventoryLoading ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">A carregar inventário...</p>
                ) : filteredInventoryItems.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Nenhum item encontrado para os filtros seleccionados.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Unidade</TableHead>
                          <TableHead className="text-right">Stock actual</TableHead>
                          <TableHead className="text-right">Stock mínimo</TableHead>
                          <TableHead className="text-right">Custo unitário (Kz)</TableHead>
                          <TableHead>Localização</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInventoryItems.map((item) => {
                          const lowStock = item.current_stock <= item.minimum_stock;
                          return (
                            <TableRow
                              key={item.id}
                              className={lowStock ? "bg-destructive/5" : undefined}
                            >
                              <TableCell className="font-medium">
                                <div className="flex flex-col">
                                  <span>{item.name}</span>
                                  {item.notes && (
                                    <span className="text-[11px] text-muted-foreground truncate max-w-[260px]">
                                      {item.notes}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{inventoryCategoryLabels[item.category]}</TableCell>
                              <TableCell>{item.unit}</TableCell>
                              <TableCell className="text-right">
                                {item.current_stock.toLocaleString("pt-PT")}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.minimum_stock.toLocaleString("pt-PT")}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.unit_cost != null
                                  ? `Kz ${item.unit_cost.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                {item.location ?? <span className="text-muted-foreground">—</span>}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* --------- ABA DEFINIÇÕES --------- */}
          <TabsContent value="definicoes" className="space-y-4">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-base">Definições de quilometragem e alertas</CardTitle>
                <CardDescription>
                  Ajuste o odómetro e a próxima revisão das viaturas para que os alertas e manutenções fiquem alinhados.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs md:text-sm">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Veículo</p>
                    <Select value={settingsVehicleId} onValueChange={setSettingsVehicleId}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Seleccionar veículo" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.placa} · {v.marca} {v.modelo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Odómetro actual (km)</p>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      className="h-8"
                      value={settingsOdometer}
                      onChange={(e) => setSettingsOdometer(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Próxima revisão aos (km)</p>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      className="h-8"
                      value={settingsNextServiceKm}
                      onChange={(e) => setSettingsNextServiceKm(e.target.value)}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Utilize estes campos para alinhar as leituras de quilometragem e garantir que os alertas de manutenção e
                  abastecimento refletem a realidade da frota.
                </p>

                <div className="flex justify-end">
                  <Button size="sm" onClick={handleUpdateVehicleSettings}>
                    Guardar definições
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
