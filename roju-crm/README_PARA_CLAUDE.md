# ROJU Client Hub — CRM para continuar en Claude

> Lee este archivo primero. Es la guía para retomar este proyecto fuera de Lovable.

## Qué es el proyecto

**ROJU Client Hub** es el CRM web compartido de **ROJU Consulting**, una agencia de
marketing y consultoría de 2 personas: **Pablo Knauth** y **Kevin Juárez**.
Los dos socios usan la misma app y ven los mismos datos guardados (base de datos
compartida en Supabase).

Es un CRM en español (es-MX) con estas secciones:

1. **Hoy y esta semana** (`src/routes/index.tsx`): seguimientos vencidos, tareas
   para hoy y citas de la semana.
2. **Seguimiento de clientes** (`src/routes/clientes.tsx`): tablero Kanban con
   las etapas Nuevo contacto → Contactado → Diagnóstico agendado → Propuesta
   enviada → Negociación → Cliente ganado / Perdido. Cada cliente tiene nombre,
   empresa, contacto, correo, teléfono/WhatsApp, servicio, responsable
   (Pablo Knauth o Kevin Juárez), notas, próximo seguimiento y **Próxima cita
   (opcional)**: el campo puede quedar vacío, agregarse después y quitarse con
   el botón "Quitar cita".
3. **Tareas** (`src/routes/tareas.tsx`): ligadas a un cliente (obligatorio),
   con encargado (Pablo Knauth o Kevin Juárez) y estatus Pendiente / En proceso /
   Terminada. Cada tarea tiene deadline opcional y un marcador de urgencia:
   **A tiempo** (más de 3 días), **Poner atención** (2–3 días),
   **A punto de caducar** (hoy o mañana), **Atrasada** (vencida y no terminada)
   y **Sin deadline**. Una tarea Terminada muestra la etiqueta "Terminada" y no
   se marca como atrasada. La lógica está en `src/lib/deadline.ts` y tiene
   pruebas en `src/lib/__tests__/deadline.test.ts`.
4. **Colaboradores** (`src/routes/colaboradores.tsx`): nombre, función, correo,
   teléfono/WhatsApp, tareas propias con el mismo estatus y marcador de deadline,
   y citas. Cada cita tiene campo para pegar el enlace de Google Meet, botones
   "Abrir Google Meet", "Entrar a la reunión en Google Meet" y
   "Crear reunión en Google Calendar" con los datos precargados. El enlace de
   Meet **no se genera automáticamente**: hay que crearlo en Google Calendar/Meet
   y pegarlo.
5. **Proveedores** (`src/routes/proveedores.tsx`): empresa, persona de contacto,
   correo, teléfono y el producto o servicio que provee, con búsqueda.
6. **Agenda** (`src/routes/agenda.tsx`): vista semanal de citas de clientes y
   colaboradores.

### Marca ROJU (no cambiar sin preguntar)

- Nombre: **ROJU Consulting**, eslogan: "Pensamos. Creamos. Crecemos."
- Colores: azul noche `#071221` (dominante), azul ROJU `#1E46A0`,
  naranja `#E85D04` solo como acento, blanco `#FFFFFF`, soporte `#F4F6F9`.
- Tipografías: **Montserrat** para títulos, **Inter** para texto.
- Servicios: Estrategia, Identidad, Redes sociales, Contenido, Web, Pauta.
- Estilo: minimalismo ejecutivo, alto contraste, sin emojis en la interfaz.
- Responsables siempre exactamente: **Pablo Knauth** y **Kevin Juárez**
  (un nombre y un apellido por persona; no usar los nombres del manual de marca).

## Stack

- **TypeScript + React 19**
- **TanStack Start / TanStack Router** (no es Create React App ni Next.js).
  No hay `index.html`, `src/App.tsx`, `src/main.tsx` ni `src/index.css`:
  la entrada es `src/start.ts` / `src/server.ts`, el router está en
  `src/router.tsx` y `src/routeTree.gen.ts`, y la raíz en
  `src/routes/__root.tsx`. Los estilos globales están en `src/styles.css`.
- **Vite 8** + **Tailwind CSS 4** + **shadcn/ui** (componentes Radix en
  `src/components/ui/`)
- **Supabase** (`@supabase/supabase-js`) como base de datos compartida.
  El cliente está en `src/integrations/supabase/client.ts`.
- **Drizzle ORM / Drizzle Kit**: `drizzle/schema.ts` es un archivo
  autogenerado que está en blanco a propósito; el esquema real (DDL) está en
  `drizzle/migrations/0000_create_crm_tables.sql`.
- **Vitest** para pruebas (`npm test`).

## Cómo correrlo

```bash
# 1. Instalar dependencias (Bun es el gestor original; npm también funciona)
bun install
# o: npm install

# 2. Crear un archivo .env en la raíz (NO viene incluido en este ZIP, ver abajo)
#    VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
#    VITE_SUPABASE_PUBLISHABLE_KEY=<tu-publishable-key>

# 3. Desarrollo
bun run dev
# o: npm run dev        (ejecuta "vite dev")

# 4. Compilar
bun run build
# o: npm run build      (ejecuta "vite build")

# 5. Pruebas
bun run test
# o: npm test           (ejecuta "vitest run")
```

## Base de datos (ya existe en Supabase)

Las tablas ya están creadas en el proyecto de Supabase de Lovable
(migración en `drizzle/migrations/0000_create_crm_tables.sql`):

- `public.clients` — clientes
- `public.tasks` — tareas de clientes
- `public.collaborators` — colaboradores
- `public.collaborator_tasks` — tareas de colaboradores
- `public.collaborator_appointments` — citas de colaboradores (con `meet_link`)
- `public.suppliers` — proveedores

El acceso es **compartido sin login**: las políticas RLS permiten a `anon` y
`authenticated` ver y modificar todos los datos.

> ⚠️ **Advertencia de seguridad importante:** como no hay inicio de sesión,
> **cualquier persona que tenga el enlace de la app puede ver y modificar los
> datos de los clientes**. Antes de cargar datos reales de clientes, agrega un
> inicio de sesión solo para Pablo Knauth y Kevin Juárez.

## Estado actual (18 de noviembre de 2026)

- El proyecto en Lovable (project_id `dad93d86-b152-4534-b1aa-92ef02c41817`,
  "ROJU Client Hub") está **casi completo, pero sin terminar**.
- El agente de Lovable se detuvo por **`out_of_credits`** (se acabaron los
  créditos de Lovable).
- Quedan **2 errores de compilación por corregir**:
  - `src/components/crm/TaskFormDialog.tsx`
  - `src/routes/colaboradores.tsx`
- La vista previa de Lovable todavía no publica: el enlace de vista previa
  redirige a iniciar sesión en Lovable y no muestra el CRM a un visitante
  sin sesión. **No está desplegado/publicado todavía.**
- La base de datos ya tiene las tablas creadas (ver arriba).
- Los datos de prueba son mínimos: el CRM arranca vacío, sin clientes demo.

## Qué se le pide a Claude

1. **Corregir los 2 errores de compilación** en
   `src/components/crm/TaskFormDialog.tsx` y `src/routes/colaboradores.tsx`
   hasta que `bun run build` (o `npm run build`) pase limpio.
2. **Probar cada sección** en móvil y en escritorio: Hoy y esta semana,
   Seguimiento de clientes (Kanban), Tareas (con sus marcadores de deadline),
   Colaboradores (tareas y citas con Google Meet), Proveedores y Agenda.
3. **Publicar / desplegar** la app y entregar el enlace final que Pablo y
   Kevin puedan abrir en el navegador sin iniciar sesión en Lovable.
   No hay que descargar ninguna app: es una página web; en el iPhone se puede
   agregar a la pantalla de inicio desde Compartir → Añadir a pantalla de inicio.
4. **Opcional, pero recomendado:** agregar inicio de sesión solo para
   Pablo Knauth y Kevin Juárez antes de cargar datos reales de clientes
   (ver la advertencia de seguridad arriba).

## Archivos de este ZIP

- Código completo del proyecto Lovable "ROJU Client Hub", exportado el
  18 de noviembre de 2026, preservando la estructura de carpetas.
- `README.md` es el README original del proyecto; este archivo
  (`README_PARA_CLAUDE.md`) es la guía para retomarlo.

### Archivos que NO están incluidos (y por qué)

- **`.env`** — excluido a propósito: puede contener claves/secretos de
  Supabase. Crea tu propio `.env` con las variables de arriba usando las
  credenciales del proyecto de Supabase de Pablo.
- **`public/favicon.ico`** — archivo binario, no es código. Se puede
  regenerar o copiar de nuevo sin problema.
- **12 componentes de shadcn/ui que faltan** en `src/components/ui/`:
  `sheet.tsx`, `sidebar.tsx`, `skeleton.tsx`, `slider.tsx`, `sonner.tsx`,
  `switch.tsx`, `table.tsx`, `tabs.tsx`, `textarea.tsx`,
  `toggle-group.tsx`, `toggle.tsx`, `tooltip.tsx`.
  La exportación se hizo con prioridad en los archivos principales y estos
  12 no alcanzaron a descargarse. **Claude los puede regenerar con shadcn**
  (son componentes estándar de shadcn/ui, no tienen lógica propia del CRM).
  Los 36 componentes de `src/components/ui/` que sí están incluidos, y todos
  los componentes propios del CRM en `src/components/crm/`, están completos.
- **`node_modules/`** — no incluido, se instala con `bun install` / `npm install`.
- **`dist/` / build** — no incluido, se genera con `bun run build`.
