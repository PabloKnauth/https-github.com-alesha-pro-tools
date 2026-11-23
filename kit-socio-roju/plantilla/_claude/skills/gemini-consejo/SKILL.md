---
name: gemini-consejo
description: Consejo de IAs. Consulta a Gemini (y a ChatGPT cuando esté conectado) sobre la pregunta del usuario, compara sus respuestas con la de Claude y entrega una recomendación. Usar con /gemini-consejo, "pregúntale a Gemini", "segunda opinión", "qué opinan las otras IAs".
argument-hint: "<pregunta>"
---

# Consejo de IAs

1. Formula tu propia respuesta a la pregunta **antes** de leer a Gemini, para no contaminarte.
2. Consulta a Gemini con la pregunta completa y el contexto necesario (sin datos confidenciales de clientes:
   el nivel gratuito de Google puede usar las consultas para entrenar):
   ```bash
   .claude/skills/gemini-consejo/ask_gemini.sh "<pregunta con contexto>"
   ```
   Segundo argumento opcional: modelo (por defecto `gemini-3-flash-preview`; Pro no tiene cuota gratuita).
   Si devuelve `ERROR Gemini`, dilo tal cual y sigue solo con tu respuesta.
3. ChatGPT: todavía no está conectado. Si `codex` está instalado y con sesión iniciada, usa
   `codex exec "<pregunta>"`; si no, indica que falta.
4. Entrega en español:
   - **Claude**: tu respuesta en 2–4 líneas.
   - **Gemini**: su respuesta resumida en 2–4 líneas (cita textual solo lo clave).
   - **Coinciden / Difieren**: puntos concretos.
   - **Recomendación**: cuál seguir y por qué. Señala si Gemini afirma algo que no puedes verificar.
