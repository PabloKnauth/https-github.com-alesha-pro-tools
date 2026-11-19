CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text NOT NULL DEFAULT '',
  contact text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  service text NOT NULL DEFAULT 'Estrategia' CHECK (service IN ('Estrategia','Identidad','Redes sociales','Contenido','Web','Pauta')),
  responsable text NOT NULL DEFAULT 'Pablo Knauth' CHECK (responsable IN ('Pablo Knauth','Kevin Juárez')),
  stage text NOT NULL DEFAULT 'Nuevo contacto' CHECK (stage IN ('Nuevo contacto','Contactado','Diagnóstico agendado','Propuesta enviada','Negociación','Cliente ganado','Perdido')),
  notes text NOT NULL DEFAULT '',
  next_follow_up date,
  next_appointment timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO anon, authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso compartido clientes" ON public.clients FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  encargado text NOT NULL DEFAULT 'Pablo Knauth' CHECK (encargado IN ('Pablo Knauth','Kevin Juárez')),
  status text NOT NULL DEFAULT 'Pendiente' CHECK (status IN ('Pendiente','En proceso','Terminada')),
  due_date date,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tasks_client_id_idx ON public.tasks(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO anon, authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso compartido tareas" ON public.tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaborators TO anon, authenticated;
GRANT ALL ON public.collaborators TO service_role;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso compartido colaboradores" ON public.collaborators FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER collaborators_updated_at BEFORE UPDATE ON public.collaborators FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.collaborator_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'Pendiente' CHECK (status IN ('Pendiente','En proceso','Terminada')),
  due_date date,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX collaborator_tasks_collab_idx ON public.collaborator_tasks(collaborator_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaborator_tasks TO anon, authenticated;
GRANT ALL ON public.collaborator_tasks TO service_role;
ALTER TABLE public.collaborator_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso compartido tareas colaboradores" ON public.collaborator_tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER collaborator_tasks_updated_at BEFORE UPDATE ON public.collaborator_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.collaborator_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  meet_link text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX collaborator_appointments_collab_idx ON public.collaborator_appointments(collaborator_id);
CREATE INDEX collaborator_appointments_starts_idx ON public.collaborator_appointments(starts_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaborator_appointments TO anon, authenticated;
GRANT ALL ON public.collaborator_appointments TO service_role;
ALTER TABLE public.collaborator_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso compartido citas colaboradores" ON public.collaborator_appointments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER collaborator_appointments_updated_at BEFORE UPDATE ON public.collaborator_appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  product_service text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO anon, authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso compartido proveedores" ON public.suppliers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();