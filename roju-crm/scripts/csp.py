"""Actualiza la Content-Security-Policy de publicar/netlify.toml con los hashes de los scripts en línea
de publicar/sitio/_shell.html (cambian en cada compilación). Lo llama scripts/publicar.sh."""
import base64, hashlib, os, re
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
shell = open(os.path.join(RAIZ, "publicar/sitio/_shell.html"), encoding="utf-8").read()
hashes = []
for m in re.finditer(r"<script(?![^>]*\bsrc=)([^>]*)>(.*?)</script>", shell, re.S):
    if "ld+json" in m.group(1): continue
    # El navegador convierte el carácter NUL en U+FFFD al leer el HTML; el hash debe calcularse sobre ese texto.
    cuerpo = m.group(2).replace("\x00", "\ufffd")
    hashes.append("'sha256-" + base64.b64encode(hashlib.sha256(cuerpo.encode()).digest()).decode() + "'")
csp = ("default-src 'self'; script-src 'self' " + " ".join(hashes) + "; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
       "font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; "
       "frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests")
p = os.path.join(RAIZ, "publicar/netlify.toml")
t = open(p, encoding="utf-8").read()
t, n = re.subn(r'Content-Security-Policy = "[^"]*"', f'Content-Security-Policy = "{csp}"', t)
assert n == 1, "no encontré la línea Content-Security-Policy en publicar/netlify.toml"
open(p, "w", encoding="utf-8").write(t)
print(f"CSP actualizada con {len(hashes)} hashes")
