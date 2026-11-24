-- Cierra el acceso público a las tablas antiguas del CRM en Supabase.
-- El CRM publicado ya NO usa Supabase (guarda los datos en Netlify Blobs), pero la migración original
-- (drizzle/migrations/0000_create_crm_tables.sql) dejó políticas "USING (true)" para el rol anon:
-- cualquiera con la llave pública del proyecto podía leer y modificar esas tablas.
-- Cómo usarlo: Supabase → proyecto efassazsgfuuecirwtjq → SQL Editor → pega todo y ejecuta.
-- (Si ya no necesitas ese proyecto, lo más seguro es pausarlo o borrarlo desde Settings → General.)

DROP POLICY IF EXISTS "Acceso compartido clientes" ON public.clients;
DROP POLICY IF EXISTS "Acceso compartido tareas" ON public.tasks;
DROP POLICY IF EXISTS "Acceso compartido colaboradores" ON public.collaborators;
DROP POLICY IF EXISTS "Acceso compartido tareas colaboradores" ON public.collaborator_tasks;
DROP POLICY IF EXISTS "Acceso compartido citas colaboradores" ON public.collaborator_appointments;
DROP POLICY IF EXISTS "Acceso compartido proveedores" ON public.suppliers;

REVOKE ALL ON public.clients, public.tasks, public.collaborators, public.collaborator_tasks,
  public.collaborator_appointments, public.suppliers FROM anon, authenticated;

-- RLS sigue activado y sin políticas: nadie con la llave pública puede leer ni escribir.
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborator_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborator_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
