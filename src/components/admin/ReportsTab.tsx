import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export type ReportsVehicle = { id: string; placa: string; marca: string; modelo: string };

export type ReportsMaintenance = {
  id: string;
  vehicle_id: string;
  scheduled_date: string;
  status: string;
  maintenance_type: string;
  cost: number | null;
  labor_cost?: number | null;
  materials_cost?: number | null;
  other_costs?: number | null;
  problem_description?: string | null;
  services_executed?: string | null;
  supplier?: { name: string } | null;
  vehicle?: { placa: string; marca: string; modelo: string } | null;
};

export type ReportsFuelFillup = {
  id: string;
  vehicle_id: string;
  date: string;
  odometer: number | null;
  liters: number;
  price_per_liter: number;
  total_amount: number;
  supplier_name: string | null;
  fuel_type: string | null;
  operation_type?: string | null;
  payment_method?: string | null;
  driver_name?: string | null;
  driver_license_number?: string | null;
  authorized_by?: string | null;
  location?: string | null;
  refuel_time?: string | null;
  vehicle?: { placa: string; marca: string; modelo: string } | null;
};

export type ReportsInventoryMovement = {
  id: string;
  maintenance_id: string | null;
  item?: { name: string; unit: string } | null;
  movement_type: string;
  quantity: number;
};

export function ReportsTab({
  vehicles,
  maintenances,
  fuelFillups,
  inventoryMovements,
  onExportMaintenancePdf,
  onExportFuelPdf,
}: {
  vehicles: ReportsVehicle[];
  maintenances: ReportsMaintenance[];
  fuelFillups: ReportsFuelFillup[];
  inventoryMovements: ReportsInventoryMovement[];
  onExportMaintenancePdf: (rows: Array<any>, meta: { periodLabel?: string }) => void;
  onExportFuelPdf: (rows: Array<any>, meta: { periodLabel?: string }) => void;
}) {
  const [reportType, setReportType] = useState<"manutencao" | "combustivel">("manutencao");
  const [vehicleId, setVehicleId] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [maintenanceType, setMaintenanceType] = useState<string>("all");

  const periodLabel = useMemo(() => {
    if (!startDate && !endDate) return undefined;
    const from = startDate ? new Date(startDate).toLocaleDateString("pt-PT") : "—";
    const to = endDate ? new Date(endDate).toLocaleDateString("pt-PT") : "—";
    return `Período: ${from} → ${to}`;
  }, [startDate, endDate]);

  const movementsByMaintenance = useMemo(() => {
    const map = new Map<string, ReportsInventoryMovement[]>();
    for (const mov of inventoryMovements) {
      if (!mov.maintenance_id) continue;
      const list = map.get(mov.maintenance_id) ?? [];
      list.push(mov);
      map.set(mov.maintenance_id, list);
    }
    return map;
  }, [inventoryMovements]);

  const filteredMaintenances = useMemo(() => {
    return maintenances
      .filter((m) => (vehicleId === "all" ? true : m.vehicle_id === vehicleId))
      .filter((m) => (maintenanceType === "all" ? true : m.maintenance_type === maintenanceType))
      .filter((m) => {
        if (!startDate && !endDate) return true;
        const d = m.scheduled_date ? new Date(m.scheduled_date).getTime() : null;
        if (!d) return false;
        const startOk = startDate ? d >= new Date(startDate).getTime() : true;
        const endOk = endDate ? d <= new Date(endDate).getTime() : true;
        return startOk && endOk;
      });
  }, [maintenances, vehicleId, maintenanceType, startDate, endDate]);

  const filteredFuelFillups = useMemo(() => {
    return fuelFillups
      .filter((f) => (vehicleId === "all" ? true : f.vehicle_id === vehicleId))
      .filter((f) => {
        if (!startDate && !endDate) return true;
        const d = f.date ? new Date(f.date).getTime() : null;
        if (!d) return false;
        const startOk = startDate ? d >= new Date(startDate).getTime() : true;
        const endOk = endDate ? d <= new Date(endDate).getTime() : true;
        return startOk && endOk;
      });
  }, [fuelFillups, vehicleId, startDate, endDate]);

  const handleExport = () => {
    if (reportType === "manutencao") {
      const rows = filteredMaintenances.map((m) => {
        const parts = (movementsByMaintenance.get(m.id) ?? [])
          .filter((x) => x.movement_type === "saida")
          .map((x) => `${x.item?.name ?? "Item"} (${x.quantity} ${x.item?.unit ?? ""})`)
          .join(", ");

        return {
          ...m,
          supplier_name: m.supplier?.name ?? null,
          parts_used: parts || null,
        };
      });
      onExportMaintenancePdf(rows, { periodLabel });
    } else {
      onExportFuelPdf(filteredFuelFillups, { periodLabel });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Relatórios</CardTitle>
        <CardDescription>Filtre por viatura, período e tipo, e exporte PDFs detalhados.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manutencao">Manutenções</SelectItem>
                <SelectItem value="combustivel">Abastecimentos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Viatura</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.placa} ({v.marca} {v.modelo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Data início</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Data fim</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        {reportType === "manutencao" && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo de manutenção</Label>
              <Select value={maintenanceType} onValueChange={setMaintenanceType}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="revisao_geral">Revisão geral</SelectItem>
                  <SelectItem value="troca_oleo">Troca de óleo</SelectItem>
                  <SelectItem value="pneus">Troca de pneus</SelectItem>
                  <SelectItem value="freios">Sistema de travagem</SelectItem>
                  <SelectItem value="suspensao">Suspensão</SelectItem>
                  <SelectItem value="motor">Motor</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-muted-foreground">
            {reportType === "manutencao"
              ? `${filteredMaintenances.length} manutenção(ões) no filtro`
              : `${filteredFuelFillups.length} abastecimento(s) no filtro`}
          </p>
          <Button size="sm" onClick={handleExport}>
            Exportar PDF detalhado
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
