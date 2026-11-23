#!/usr/bin/env bash
# Uso: ask_gemini.sh "pregunta" [modelo]. La clave la inyecta el proxy del entorno (header x-goog-api-key).
set -euo pipefail
MODEL="${2:-gemini-3-flash-preview}"  # nivel gratuito: Pro tiene cuota 0
python3 -c 'import json,sys; print(json.dumps({"contents":[{"parts":[{"text":sys.argv[1]}]}]}))' "$1" |
  curl -sS -m 180 "https://generativelanguage.googleapis.com/v1beta/models/$MODEL:generateContent" \
    -H "x-goog-api-key: proxy-injected" -H "Content-Type: application/json" -d @- |
  python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["candidates"][0]["content"]["parts"][0]["text"] if "candidates" in d else "ERROR Gemini: "+d["error"]["message"][:300])'
