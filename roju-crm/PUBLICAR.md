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

Dirección publicada: **https://rojuconsulting.netlify.app**

## Si no deja entrar

1. Abre `https://rojuconsulting.netlify.app/api/crm`. Debe responder
   `{"servidor":"activo","CRM_CLAVE_PABLO":"lista","CRM_CLAVE_KEVIN":"lista"}` (no muestra las contraseñas).
2. **«This site is private»**: Netlify tiene el proyecto en privado. Project configuration →
   Visitor access → Edit visibility → **Production visibility: Public**. Es seguro: el CRM tiene su propio
   inicio de sesión y la API rechaza todo lo que no trae sesión.
3. **«Site not found»**: el nombre del proyecto no coincide (al recrear un proyecto Netlify le pone uno al azar).
   Corrígelo en General → Project details → Change project name.
4. **«falta» o «muy corta»** en el diagnóstico: revisa el nombre exacto de la variable, que tenga 10 caracteres o
   más y que su *scope* incluya Functions; después Trigger deploy.
5. **«Contraseña incorrecta para …»**: cada persona tiene su propia contraseña; revisa que esté elegida la
   persona correcta y usa «Mostrar» para comparar.

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
