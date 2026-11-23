#!/usr/bin/env bash
# Instala el kit de ROJU en el repositorio de Kevin.
# Uso, desde la raíz del repositorio de Kevin:
#   bash <ruta-al-clon-de-Pablo>/kit-socio-roju/instalar.sh <ruta-al-clon-de-Pablo>
# No modifica el repositorio de Pablo; solo lee de él.
set -euo pipefail

SRC="$(cd "${1:?Falta la ruta al clon del repositorio de Pablo}" && pwd)"
KIT="$(cd "$(dirname "$0")" && pwd)"
DEST="$(pwd)"

[ "$DEST" != "$SRC" ] || { echo "ERROR: ejecútalo dentro del repositorio de Kevin, no en el de Pablo."; exit 1; }
git -C "$DEST" rev-parse --git-dir >/dev/null 2>&1 || { echo "ERROR: $DEST no es un repositorio git."; exit 1; }

echo "1/4 Skills de video y diseño web (rama sitio-marca-personal de Pablo)"
git -C "$SRC" fetch -q origin sitio-marca-personal
mkdir -p "$DEST/.claude/skills"
git -C "$SRC" archive FETCH_HEAD .claude/skills | tar -x -C "$DEST"

echo "2/4 Plantilla: CLAUDE.md, settings, .mcp.json, .gitignore y /gemini-consejo (sin sobrescribir lo que ya exista)"
cp -rn "$KIT/plantilla/." "$DEST/" 2>/dev/null
mkdir -p "$DEST/.claude" && cp -rn "$DEST/_claude/." "$DEST/.claude/" 2>/dev/null && rm -rf "$DEST/_claude"  # _claude evita que la plantilla se cargue como skill en el repo de Pablo
chmod +x "$DEST/.claude/skills/gemini-consejo/ask_gemini.sh"

echo "3/4 Graphify (mapa del código)"
pip install -q graphifyy
(cd "$DEST" && graphify install --project --platform claude >/dev/null && graphify update . >/dev/null 2>&1; rm -f .claude/settings.json.graphify-bak) || true

echo "4/4 Ponytail (plugin)"
if command -v claude >/dev/null; then
  (cd "$DEST" && claude plugin marketplace add DietrichGebert/ponytail --scope project >/dev/null 2>&1 || true
   claude plugin install ponytail@ponytail --scope project >/dev/null 2>&1 || true)
fi

n=$(find "$DEST/.claude/skills" -name SKILL.md -maxdepth 2 | wc -l)
echo "Listo: $n skills en .claude/skills. Revisa con 'git status' y haz commit."
[ "$n" -ge 30 ] || { echo "AVISO: se esperaban al menos 30 skills."; exit 2; }
