# Ayudante para el workbench de Composio (Instagram). Se carga con exec().
# preparar(p) crea los contenedores de una pieza de publicar.json; publicar(cid) la publica.
import json, os, time, urllib.request, urllib.parse
RAW = "https://raw.githubusercontent.com/PabloKnauth/https-github.com-alesha-pro-tools/sitio-marca-personal/"
IG = "28941011938896351"  # @motoroka_fixshop
def cargar():
    return json.loads(urllib.request.urlopen(RAW + "films/motoroka-calendario-2026/publicar.json").read().decode())
def url_publica(path):
    if path.endswith(".jpg"):
        return RAW + urllib.parse.quote(path)
    os.makedirs("/home/user/v", exist_ok=True)
    local = "/home/user/v/" + os.path.basename(path)
    urllib.request.urlretrieve(RAW + urllib.parse.quote(path), local)
    r, e = upload_local_file(local)
    if e: raise RuntimeError(e)
    return r.get("s3_url") or r.get("data", {}).get("s3_url")
def contenedor(body):
    r, e = proxy_execute("POST", f"/{IG}/media", "instagram", body=body)
    if e: raise RuntimeError(f"{e} {r}")
    cid = (r or {}).get("id") or ((r or {}).get("data") or {}).get("id")
    if not cid: raise RuntimeError(f"sin id: {r}")
    return cid
def estado(cid):
    r, e = proxy_execute("GET", f"/{cid}", "instagram", query_params={"fields": "status_code,status"})
    return r
def esperar(cid, max_s=240):
    t0 = time.time(); r = None
    while time.time() - t0 < max_s:
        r = estado(cid); s = (r or {}).get("status_code") or ((r or {}).get("data") or {}).get("status_code")
        if s in ("FINISHED", "ERROR", "EXPIRED"): return s, r
        time.sleep(5)
    return "TIMEOUT", r
def recientes(n=6):
    r, e = proxy_execute("GET", f"/{IG}/media", "instagram", query_params={"fields": "caption,timestamp,permalink", "limit": n})
    return (r or {}).get("data") or r
def preparar(p):
    a = p["archivos"]
    if p["tipo"] == "Video vertical":
        cid = contenedor({"media_type": "REELS", "video_url": url_publica(a[0]), "caption": p["caption"], "share_to_feed": True})
    elif len(a) == 1:
        cid = contenedor({"image_url": url_publica(a[0]), "caption": p["caption"], "alt_text": p["alt"]})
    else:
        hijos = [contenedor({"image_url": url_publica(x), "is_carousel_item": True}) for x in a]
        for h in hijos: esperar(h, 60)
        cid = contenedor({"media_type": "CAROUSEL", "children": ",".join(hijos), "caption": p["caption"]})
    s, r = esperar(cid)
    if s != "FINISHED": raise RuntimeError(f"contenedor {cid} en {s}: {r}")
    return cid
def publicar(cid):
    r, e = proxy_execute("POST", f"/{IG}/media_publish", "instagram", body={"creation_id": cid})
    if e: raise RuntimeError(f"{e} {r}")
    mid = (r or {}).get("id") or ((r or {}).get("data") or {}).get("id")
    link, _ = proxy_execute("GET", f"/{mid}", "instagram", query_params={"fields": "permalink,timestamp"})
    return mid, link
