# Avión de papel

Corto de prueba hecho con la skill `hand-drawn-canvas-animation`: estilo tinta, 8,8 s, 1920×1080, 24 fps y sonido.

- `avion-de-papel.html`: la película (dibujos, tiempos y sonido). Se puede abrir en el navegador para reproducirla.
- `out/avion-de-papel-final.mp4`: el video final con sonido.
- `out/avion-de-papel-contact.jpg`: hoja de contactos.

Para volver a renderizar (requiere Node 22+, Chrome o Chromium y ffmpeg):

```bash
npm ci --no-audit --no-fund
node render.mjs avion-de-papel.html --out out
```

Si Chrome no se encuentra o se ejecuta como root, indique la ruta con `CHROME=/ruta/a/chrome` (como root, use un script que añada `--no-sandbox`).
