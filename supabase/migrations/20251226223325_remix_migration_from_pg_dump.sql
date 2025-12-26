CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'motorista'
);


--
-- Name: fuel_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.fuel_type AS ENUM (
    'gasolina',
    'diesel',
    'etanol',
    'gas_natural',
    'eletrico',
    'hibrido',
    'outro'
);


--
-- Name: inventory_movement_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.inventory_movement_type AS ENUM (
    'entrada',
    'saida',
    'ajuste'
);


--
-- Name: maintenance_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.maintenance_status AS ENUM (
    'agendado',
    'em_progresso',
    'concluido'
);


--
-- Name: maintenance_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.maintenance_type AS ENUM (
    'revisao_geral',
    'troca_oleo',
    'pneus',
    'freios',
    'suspensao',
    'motor',
    'outro'
);


--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_type AS ENUM (
    'entrada',
    'saida'
);


--
-- Name: trip_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.trip_status AS ENUM (
    'planeada',
    'em_andamento',
    'concluida',
    'cancelada'
);


--
-- Name: vehicle_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vehicle_status AS ENUM (
    'em_operacao',
    'parado',
    'em_manutencao'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_phone TEXT;
  user_role app_role;
BEGIN
  -- Extrair telefone dos metadados
  user_phone := NEW.raw_user_meta_data->>'phone';
  
  -- Determinar role: admin se telefone for 912345678, senão motorista
  IF user_phone = '912345678' THEN
    user_role := 'admin';
  ELSE
    user_role := 'motorista';
  END IF;
  
  -- Inserir perfil
  INSERT INTO public.profiles (id, phone, full_name)
  VALUES (
    NEW.id,
    user_phone,
    NEW.raw_user_meta_data->>'full_name'
  );
  
  -- Atribuir role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: set_current_timestamp_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_current_timestamp_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_inventory_stock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_inventory_stock() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.movement_type = 'entrada' THEN
    UPDATE public.inventory_items
    SET current_stock = current_stock + NEW.quantity
    WHERE id = NEW.item_id;
  ELSIF NEW.movement_type = 'saida' THEN
    UPDATE public.inventory_items
    SET current_stock = current_stock - NEW.quantity
    WHERE id = NEW.item_id;
  ELSIF NEW.movement_type = 'ajuste' THEN
    UPDATE public.inventory_items
    SET current_stock = NEW.quantity
    WHERE id = NEW.item_id;
  END IF;
  
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: financial_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    vehicle_id uuid,
    date date NOT NULL,
    type public.transaction_type NOT NULL,
    category text NOT NULL,
    description text,
    amount numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fuel_fillups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fuel_fillups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    date date NOT NULL,
    odometer numeric,
    liters numeric NOT NULL,
    price_per_liter numeric NOT NULL,
    total_amount numeric NOT NULL,
    supplier_name text,
    fuel_type public.fuel_type,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    supplier_id uuid
);


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    unit text NOT NULL,
    current_stock numeric DEFAULT 0 NOT NULL,
    minimum_stock numeric DEFAULT 0 NOT NULL,
    unit_cost numeric,
    supplier_id uuid,
    location text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    item_id uuid NOT NULL,
    movement_type public.inventory_movement_type NOT NULL,
    quantity numeric NOT NULL,
    unit_cost numeric,
    total_cost numeric,
    reference text,
    notes text,
    movement_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    phone text,
    full_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    contact_person text,
    phone text,
    email text,
    address text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: trips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    driver_name text NOT NULL,
    start_date date NOT NULL,
    end_date date,
    distance_km numeric,
    estimated_cost numeric,
    status public.trip_status DEFAULT 'planeada'::public.trip_status NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    driver_id uuid,
    origem_label text,
    destino_label text,
    odometer_start numeric,
    odometer_end numeric
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vehicle_maintenances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_maintenances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    scheduled_date date NOT NULL,
    status public.maintenance_status DEFAULT 'agendado'::public.maintenance_status NOT NULL,
    maintenance_type public.maintenance_type NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    supplier_id uuid,
    cost numeric
);


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    placa text NOT NULL,
    marca text NOT NULL,
    modelo text NOT NULL,
    ano integer,
    status public.vehicle_status DEFAULT 'em_operacao'::public.vehicle_status NOT NULL,
    combustivel public.fuel_type,
    odometro numeric(12,2),
    gps_latitude double precision,
    gps_longitude double precision,
    foto_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    provincia text,
    municipio text,
    bairro text,
    driver_id uuid,
    next_service_km numeric
);


--
-- Name: financial_transactions financial_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_transactions
    ADD CONSTRAINT financial_transactions_pkey PRIMARY KEY (id);


--
-- Name: fuel_fillups fuel_fillups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fuel_fillups
    ADD CONSTRAINT fuel_fillups_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: trips trips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: vehicle_maintenances vehicle_maintenances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_maintenances
    ADD CONSTRAINT vehicle_maintenances_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: idx_trips_driver_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trips_driver_id ON public.trips USING btree (driver_id);


--
-- Name: idx_vehicles_placa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_placa ON public.vehicles USING btree (placa);


--
-- Name: idx_vehicles_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_status ON public.vehicles USING btree (status);


--
-- Name: idx_vehicles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_user_id ON public.vehicles USING btree (user_id);


--
-- Name: financial_transactions set_financial_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_financial_transactions_updated_at BEFORE UPDATE ON public.financial_transactions FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: fuel_fillups set_fuel_fillups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_fuel_fillups_updated_at BEFORE UPDATE ON public.fuel_fillups FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: inventory_items set_inventory_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: inventory_movements set_inventory_movements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_inventory_movements_updated_at BEFORE UPDATE ON public.inventory_movements FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: suppliers set_suppliers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: trips set_trips_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_trips_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: vehicle_maintenances set_vehicle_maintenances_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_vehicle_maintenances_updated_at BEFORE UPDATE ON public.vehicle_maintenances FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: vehicles set_vehicles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: inventory_movements update_stock_on_movement; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_stock_on_movement AFTER INSERT ON public.inventory_movements FOR EACH ROW EXECUTE FUNCTION public.update_inventory_stock();


--
-- Name: financial_transactions financial_transactions_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_transactions
    ADD CONSTRAINT financial_transactions_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;


--
-- Name: fuel_fillups fuel_fillups_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fuel_fillups
    ADD CONSTRAINT fuel_fillups_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: fuel_fillups fuel_fillups_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fuel_fillups
    ADD CONSTRAINT fuel_fillups_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;


--
-- Name: inventory_items inventory_items_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: inventory_movements inventory_movements_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: trips trips_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.profiles(id);


--
-- Name: trips trips_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: vehicle_maintenances vehicle_maintenances_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_maintenances
    ADD CONSTRAINT vehicle_maintenances_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: vehicle_maintenances vehicle_maintenances_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_maintenances
    ADD CONSTRAINT vehicle_maintenances_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;


--
-- Name: trips Admins can view all trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all trips" ON public.trips FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins podem ver todas as roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver todas as roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins podem ver todos os perfis; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver todos os perfis" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: trips Drivers can update their assigned trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers can update their assigned trips" ON public.trips FOR UPDATE USING ((auth.uid() = driver_id));


--
-- Name: vehicles Drivers can view their assigned vehicles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers can view their assigned vehicles" ON public.vehicles FOR SELECT USING (((driver_id = auth.uid()) OR (user_id = auth.uid())));


--
-- Name: financial_transactions Users can delete their own financial transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own financial transactions" ON public.financial_transactions FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: fuel_fillups Users can delete their own fuel fillups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own fuel fillups" ON public.fuel_fillups FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: inventory_items Users can delete their own inventory items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own inventory items" ON public.inventory_items FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: inventory_movements Users can delete their own inventory movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own inventory movements" ON public.inventory_movements FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: vehicle_maintenances Users can delete their own maintenances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own maintenances" ON public.vehicle_maintenances FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: suppliers Users can delete their own suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own suppliers" ON public.suppliers FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: trips Users can delete their own trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own trips" ON public.trips FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: vehicles Users can delete their own vehicles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own vehicles" ON public.vehicles FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: financial_transactions Users can insert their own financial transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own financial transactions" ON public.financial_transactions FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: fuel_fillups Users can insert their own fuel fillups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own fuel fillups" ON public.fuel_fillups FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: inventory_items Users can insert their own inventory items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own inventory items" ON public.inventory_items FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: inventory_movements Users can insert their own inventory movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own inventory movements" ON public.inventory_movements FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: vehicle_maintenances Users can insert their own maintenances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own maintenances" ON public.vehicle_maintenances FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: suppliers Users can insert their own suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own suppliers" ON public.suppliers FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: trips Users can insert their own trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own trips" ON public.trips FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: vehicles Users can insert their own vehicles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: financial_transactions Users can update their own financial transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own financial transactions" ON public.financial_transactions FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: fuel_fillups Users can update their own fuel fillups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own fuel fillups" ON public.fuel_fillups FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: inventory_items Users can update their own inventory items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own inventory items" ON public.inventory_items FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: inventory_movements Users can update their own inventory movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own inventory movements" ON public.inventory_movements FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: vehicle_maintenances Users can update their own maintenances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own maintenances" ON public.vehicle_maintenances FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: suppliers Users can update their own suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own suppliers" ON public.suppliers FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: trips Users can update their own trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own trips" ON public.trips FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: vehicles Users can update their own vehicles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own vehicles" ON public.vehicles FOR UPDATE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: financial_transactions Users can view their own financial transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own financial transactions" ON public.financial_transactions FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: fuel_fillups Users can view their own fuel fillups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own fuel fillups" ON public.fuel_fillups FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: inventory_items Users can view their own inventory items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own inventory items" ON public.inventory_items FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: inventory_movements Users can view their own inventory movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own inventory movements" ON public.inventory_movements FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: vehicle_maintenances Users can view their own maintenances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own maintenances" ON public.vehicle_maintenances FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: suppliers Users can view their own suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own suppliers" ON public.suppliers FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: trips Users can view their own trips or assigned trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own trips or assigned trips" ON public.trips FOR SELECT USING (((auth.uid() = user_id) OR (auth.uid() = driver_id)));


--
-- Name: vehicles Users can view their own vehicles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own vehicles" ON public.vehicles FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: profiles Usuários podem atualizar seu próprio perfil; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: profiles Usuários podem ver seu próprio perfil; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_roles Usuários podem ver suas próprias roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários podem ver suas próprias roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: financial_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: fuel_fillups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fuel_fillups ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_movements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: suppliers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

--
-- Name: trips; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: vehicle_maintenances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vehicle_maintenances ENABLE ROW LEVEL SECURITY;

--
-- Name: vehicles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;