-- Ligar movimentos de inventário a manutenções
ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS maintenance_id uuid;

-- FK opcional (não bloqueia movimentos normais)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_movements_maintenance_id_fkey'
  ) THEN
    ALTER TABLE public.inventory_movements
      ADD CONSTRAINT inventory_movements_maintenance_id_fkey
      FOREIGN KEY (maintenance_id)
      REFERENCES public.vehicle_maintenances(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inventory_movements_maintenance_id
  ON public.inventory_movements(maintenance_id);
