#!/usr/bin/env python3
"""Empaqueta los productos de pago en ZIP listos para enviar al comprador.

Uso (desde sitio/, después de `python3 scripts/build.py --pago`):
    python3 scripts/empaquetar.py
Salida: ../productos-pago/entregables/*.zip (fuera de git)
"""
import io
import os
import zipfile
from pathlib import Path

PAGO = Path(__file__).resolve().parent.parent.parent / "productos-pago"
SALIDA = PAGO / "entregables"


def agregar_carpeta(z, origen, destino):
    for raiz, _, archivos in os.walk(origen):
        for nombre in sorted(archivos):
            ruta = Path(raiz) / nombre
            z.write(ruta, str(Path(destino) / ruta.relative_to(origen)))


def zip_skill(carpeta):
    """ZIP para claude.ai: la carpeta de la Skill queda en la raíz."""
    datos = io.BytesIO()
    with zipfile.ZipFile(datos, "w", zipfile.ZIP_DEFLATED) as z:
        agregar_carpeta(z, carpeta, carpeta.name)
    return datos.getvalue()


def main():
    SALIDA.mkdir(exist_ok=True)
    skills = sorted(p for p in (PAGO / "kit-skills").iterdir() if (p / "SKILL.md").exists())
    kit = SALIDA / "kit-skills-para-creadores.zip"
    with zipfile.ZipFile(kit, "w", zipfile.ZIP_DEFLATED) as z:
        base = "kit-skills-para-creadores"
        z.write(PAGO / "pdf/kit-skills-guia.pdf", f"{base}/LEEME-guia-de-instalacion.pdf")
        for s in skills:
            agregar_carpeta(z, s, f"{base}/claude-code/{s.name}")
            z.writestr(f"{base}/claude-ai/{s.name}.zip", zip_skill(s))
    visual = SALIDA / "sistema-visual-de-marca.zip"
    with zipfile.ZipFile(visual, "w", zipfile.ZIP_DEFLATED) as z:
        base = "sistema-visual-de-marca"
        z.write(PAGO / "pdf/sistema-visual-de-marca.pdf", f"{base}/sistema-visual-de-marca.pdf")
        for f in sorted((PAGO / "plantillas").glob("*.png")):
            z.write(f, f"{base}/plantillas/{f.name}")
    for f in (kit, visual):
        print(f"  ✓ {f.relative_to(PAGO.parent)}  ({f.stat().st_size // 1024} KB, {len(zipfile.ZipFile(f).namelist())} archivos)")


if __name__ == "__main__":
    main()
