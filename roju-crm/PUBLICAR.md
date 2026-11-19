# CRM de ROJU Consulting — publicación y uso

## Qué cambió respecto al proyecto de Lovable

- Se corrigieron los 2 errores de compilación (`TaskFormDialog.tsx` y `colaboradores.tsx`) y se
  agregaron los componentes que faltaban en el ZIP (`textarea`, `skeleton`, `sonner`).
- La base de datos de Lovable Cloud (Supabase) se reemplazó por una **Netlify Function**
  (`publicar/netlify/functions/crm.mjs`) que guarda los datos en **Netlify Blobs**, con el mismo
  esquema, las mismas reglas y el mismo borrado en cascada que la migración original.
- **Inicio de sesión** solo para Pablo Knauth y Kevin Juárez, cada uno con su contraseña.
  La API rechaza cualquier petición sin sesión. Sesión de 30 días por dispositivo.
- Ajustes a la especificación: botones «+ Cliente» y «+ Tarea», sin la palabra «pipeline»,
  wordmark ROJU (R azul, J naranja, CONSULTING debajo) y aviso de que Google Calendar no está conectado.

## Publicar en Netlify (una sola vez)

1. Netlify → **Add new project → Import an existing project → GitHub**.
2. Repositorio `https-github.com-alesha-pro-tools`, rama `sitio-marca-personal`.
3. **Base directory:** `roju-crm/publicar` · **Build command:** vacío · **Publish directory:** `sitio`.
4. **Environment variables** (antes de desplegar):
   - `CRM_CLAVE_PABLO`: contraseña de Pablo (mínimo 10 caracteres).
   - `CRM_CLAVE_KEVIN`: contraseña de Kevin (mínimo 10 caracteres).
   - `CRM_TOKEN_SECRET` (opcional): cadena larga al azar. Si no existe, las sesiones se firman con
     las dos contraseñas, así que cambiar una contraseña cierra todas las sesiones abiertas.
5. Deploy. Después, en Site configuration → Change site name, por ejemplo `roju-crm`.

Si cambias una variable, vuelve a desplegar (Deploys → Trigger deploy).

## Actualizar el CRM después de cambiar código

```bash
cd roju-crm
bun install          # npm install falla con los "overrides" de Lovable; usa bun
bun run test
./scripts/publicar.sh   # compila y copia dist/client a publicar/sitio
git add -A && git commit -m "..." && git push
```

Netlify publica `publicar/sitio` tal cual: no compila nada, por eso es rápido y no depende de Bun.

## Datos

- Almacén de Netlify Blobs `roju-crm`, un JSON por tabla (`tabla:clients`, `tabla:tasks`, …).
- Escritura condicional: si Pablo y Kevin guardan al mismo tiempo, ninguno borra el cambio del otro.
- Empieza vacío. No hay datos de ejemplo.
