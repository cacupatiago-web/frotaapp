import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type MaintenancePartLine = {
  item_id: string;
  quantity: string;
};

type InventoryItemOption = {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
};

export function MaintenancePartsEditor({
  items,
  value,
  onChange,
}: {
  items: InventoryItemOption[];
  value: MaintenancePartLine[];
  onChange: (next: MaintenancePartLine[]) => void;
}) {
  const addLine = () => onChange([...(value ?? []), { item_id: "", quantity: "" }]);
  const removeLine = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const updateLine = (idx: number, patch: Partial<MaintenancePartLine>) =>
    onChange(value.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground">Peças usadas (atualiza stock)</Label>
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={addLine}>
          Adicionar peça
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem peças selecionadas.</p>
      ) : (
        <div className="space-y-2">
          {value.map((line, idx) => {
            const selected = items.find((i) => i.id === line.item_id);
            return (
              <div key={idx} className="grid gap-2 rounded-md border border-border/60 bg-background/70 p-2 md:grid-cols-[1.6fr_0.8fr_0.6fr]">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Item</Label>
                  <Select value={line.item_id || "none"} onValueChange={(v) => updateLine(idx, { item_id: v === "none" ? "" : v })}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione um item" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>
                        Selecione um item
                      </SelectItem>
                      {items.map((it) => (
                        <SelectItem key={it.id} value={it.id}>
                          {it.name} (stock: {it.current_stock} {it.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Quantidade</Label>
                  <Input
                    className="h-8 text-xs"
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                    placeholder={selected?.unit ? `Ex.: 1 (${selected.unit})` : "Ex.: 1"}
                  />
                </div>

                <div className="flex items-end">
                  <Button type="button" size="sm" variant="ghost" className="h-8 w-full text-xs" onClick={() => removeLine(idx)}>
                    Remover
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Ao guardar, será registada uma saída de inventário associada à manutenção.
      </p>
    </div>
  );
}
