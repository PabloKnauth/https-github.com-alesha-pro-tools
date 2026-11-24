#!/usr/bin/env bash
# Compila el CRM y copia el resultado a publicar/sitio, que es lo que Netlify publica.
set -euo pipefail
cd "$(dirname "$0")/.."
bun run build
rm -rf publicar/sitio
cp -r dist/client publicar/sitio
python3 scripts/csp.py
echo "Listo: publicar/sitio actualizado. Haz commit y push para publicar."
