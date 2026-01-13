-- Fase 2: enriquecer dados para relatórios de manutenção e abastecimento

-- 1) Campos adicionais para vehicle_maintenances
ALTER TABLE public.vehicle_maintenances
  ADD COLUMN IF NOT EXISTS problem_description text,
  ADD COLUMN IF NOT EXISTS services_executed text,
  ADD COLUMN IF NOT EXISTS labor_cost numeric,
  ADD COLUMN IF NOT EXISTS materials_cost numeric,
  ADD COLUMN IF NOT EXISTS other_costs numeric,
  ADD COLUMN IF NOT EXISTS start_time timestamptz,
  ADD COLUMN IF NOT EXISTS end_time timestamptz,
  ADD COLUMN IF NOT EXISTS problem_detected_at timestamptz,
  ADD COLUMN IF NOT EXISTS impact_description text,
  ADD COLUMN IF NOT EXISTS final_condition text,
  ADD COLUMN IF NOT EXISTS tests_performed text,
  ADD COLUMN IF NOT EXISTS released_for_use boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS recommendations text,
  ADD COLUMN IF NOT EXISTS additional_notes text;

-- 2) Campos adicionais para fuel_fillups
ALTER TABLE public.fuel_fillups
  ADD COLUMN IF NOT EXISTS operation_type text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS driver_name text,
  ADD COLUMN IF NOT EXISTS driver_license_number text,
  ADD COLUMN IF NOT EXISTS authorized_by text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS refuel_time time;

-- 3) Campo opcional de número de frota na tabela vehicles
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS fleet_number text;