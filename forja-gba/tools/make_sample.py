#!/usr/bin/env python3
"""Genera el proyecto de ejemplo de Forja GBA (arte original procedural) -> js/sample.js.

Uso: python3 tools/make_sample.py
"""
import json
import math
import os
import random

random.seed(7)
HERE = os.path.dirname(os.path.abspath(__file__))


def snap(h):
    r, g, b = int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)
    f = lambda v: (round(v * 31 / 255) << 3) | (round(v * 31 / 255) >> 2)
    return '#%02x%02x%02x' % (f(r), f(g), f(b))


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = [0] * (w * h)

    def get(self, x, y):
        return self.px[y * self.w + x] if 0 <= x < self.w and 0 <= y < self.h else 0

    def set(self, x, y, v):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y * self.w + x] = v

    def rect(self, x0, y0, x1, y1, v):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.set(x, y, v)

    def ellipse(self, cx, cy, rx, ry, v, dark=None, light=None):
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                dx, dy = (x + .5 - cx) / rx, (y + .5 - cy) / ry
                if dx * dx + dy * dy <= 1:
                    c = v
                    if dark is not None and dx * .7 + dy > .62:
                        c = dark
                    elif light is not None and dx * .8 + dy < -.78:
                        c = light
                    self.set(x, y, c)

    def poly(self, pts, v):
        ys = [p[1] for p in pts]
        for y in range(int(min(ys)), int(max(ys)) + 1):
            xs = []
            for i in range(len(pts)):
                (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % len(pts)]
                if (y0 <= y + .5 < y1) or (y1 <= y + .5 < y0):
                    xs.append(x0 + (y + .5 - y0) * (x1 - x0) / (y1 - y0))
            xs.sort()
            for i in range(0, len(xs) - 1, 2):
                for x in range(int(round(xs[i])), int(round(xs[i + 1]))):
                    self.set(x, y, v)

    def outline(self, v, skip=()):
        src = self.px[:]
        for y in range(self.h):
            for x in range(self.w):
                if src[y * self.w + x]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < self.w and 0 <= ny < self.h and src[ny * self.w + nx] and src[ny * self.w + nx] not in skip:
                        self.px[y * self.w + x] = v
                        break

    def hex(self):
        return ''.join('%x' % v for v in self.px)


def stretch_up(c, amount=2):
    """Cuadro de entrada: estira la mitad superior hacia arriba."""
    out = Canvas(c.w, c.h)
    out.px = c.px[:]
    ys = [y for y in range(c.h) if any(c.get(x, y) for x in range(c.w))]
    y0, y1 = min(ys), max(ys)
    seam = y0 + round((y1 - y0) * .55)
    for y in range(max(0, y0 - amount), seam + 1):
        for x in range(c.w):
            out.set(x, y, c.get(x, min(seam, y + amount)))
    return out


# ---------------------------------------------------------------- tileset
TS_PAL = ['#73c5a4', '#183018', '#305828', '#48883a', '#70b850', '#a8e070', '#5a3a20', '#8a5a30',
          '#c89858', '#e8c890', '#3060b0', '#58a0e8', '#b8e0f8', '#a83028', '#e05838', '#f8f8f0']


def tileset():
    c = Canvas(128, 128)

    def tile(i):
        return (i % 8) * 16, (i // 8) * 16

    def grass(ox, oy, tufts=3):
        c.rect(ox, oy, ox + 15, oy + 15, 3)
        for _ in range(10):
            c.set(ox + random.randrange(16), oy + random.randrange(16), 4)
        for _ in range(tufts):
            x, y = ox + random.randrange(1, 14), oy + random.randrange(2, 15)
            c.set(x, y, 2); c.set(x + 1, y - 1, 2); c.set(x + 2, y, 2)

    random.seed(3)
    grass(*tile(0), 2)
    grass(*tile(1), 6)
    ox, oy = tile(2)  # hierba alta
    c.rect(ox, oy, ox + 15, oy + 15, 2)
    for k in range(4):
        for j in range(2):
            bx, by = ox + k * 4, oy + j * 8
            for d in range(4):
                c.set(bx + 1, by + 7 - d, 4 if d < 3 else 5); c.set(bx + 2, by + 6 - d, 3); c.set(bx, by + 6 - d // 2, 3)
    ox, oy = tile(3)  # flores
    grass(ox, oy, 1)
    for fx, fy in ((3, 3), (11, 5), (6, 11), (13, 13)):
        for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
            c.set(ox + fx + dx, oy + fy + dy, 14 if (fx + fy) % 2 else 15)
        c.set(ox + fx, oy + fy, 9)
    ox, oy = tile(4)  # camino
    c.rect(ox, oy, ox + 15, oy + 15, 8)
    for _ in range(14):
        c.set(ox + random.randrange(16), oy + random.randrange(16), random.choice((7, 9)))
    ox, oy = tile(5)  # agua
    c.rect(ox, oy, ox + 15, oy + 15, 11)
    for y in (3, 10):
        for x in range(2, 14):
            if (x + y) % 6 < 3:
                c.set(ox + x, oy + y + (x % 3 == 0), 12)
    ox, oy = tile(6)  # orilla
    c.rect(ox, oy, ox + 15, oy + 15, 11)
    c.rect(ox, oy, ox + 15, oy + 4, 3)
    for x in range(16):
        c.set(ox + x, oy + 5 + (x % 4 == 1), 9); c.set(ox + x, oy + 6 + (x % 4 == 1), 10)
    ox, oy = tile(7)  # roca
    grass(ox, oy, 1)
    tmp = Canvas(16, 16)
    tmp.ellipse(8, 9, 6.5, 5.5, 8, dark=7, light=9)
    tmp.outline(6)
    for y in range(16):
        for x in range(16):
            if tmp.get(x, y):
                c.set(ox + x, oy + y, tmp.get(x, y))
    # árbol 2×2 (8,9 copa arriba; 10,11 copa abajo + tronco)
    tree = Canvas(32, 32)
    tree.rect(13, 22, 18, 30, 7); tree.rect(16, 22, 18, 30, 6)
    tree.ellipse(16, 12, 14, 11.5, 3, dark=2, light=4)
    for (bx, by) in ((9, 7), (20, 9), (13, 15), (22, 16), (8, 16)):
        tree.ellipse(bx, by, 3, 2.2, 4)
        tree.set(bx - 1, by - 1, 5)
    tree.outline(1)
    for i, (tx, ty) in enumerate(((0, 0), (16, 0), (0, 16), (16, 16))):
        ox, oy = tile(8 + i)
        if i >= 2:
            grass(ox, oy, 0)
        for y in range(16):
            for x in range(16):
                v = tree.get(tx + x, ty + y)
                if v:
                    c.set(ox + x, oy + y, v)
    ox, oy = tile(12)  # valla
    grass(ox, oy, 1)
    c.rect(ox, oy + 5, ox + 15, oy + 6, 9); c.rect(ox, oy + 7, ox + 15, oy + 7, 7)
    c.rect(ox, oy + 10, ox + 15, oy + 10, 9); c.rect(ox, oy + 11, ox + 15, oy + 11, 7)
    for px_ in (2, 12):
        c.rect(ox + px_, oy + 2, ox + px_ + 2, oy + 14, 9); c.rect(ox + px_ + 2, oy + 2, ox + px_ + 2, oy + 14, 7)
        c.set(ox + px_, oy + 1, 1); c.set(ox + px_ + 1, oy + 1, 1); c.set(ox + px_ + 2, oy + 1, 1)
    ox, oy = tile(13)  # cartel
    grass(ox, oy, 1)
    c.rect(ox + 7, oy + 9, ox + 8, oy + 15, 6)
    c.rect(ox + 2, oy + 2, ox + 13, oy + 9, 1); c.rect(ox + 3, oy + 3, ox + 12, oy + 8, 9)
    c.rect(ox + 4, oy + 4, ox + 10, oy + 4, 7); c.rect(ox + 4, oy + 6, ox + 11, oy + 6, 7)
    ox, oy = tile(14)  # saliente
    grass(ox, oy, 1)
    c.rect(ox, oy + 9, ox + 15, oy + 11, 2); c.rect(ox, oy + 12, ox + 15, oy + 12, 1)
    for x in range(0, 16, 4):
        c.set(ox + x + 1, oy + 10, 4)
    ox, oy = tile(15)  # arbusto
    grass(ox, oy, 0)
    tmp = Canvas(16, 16)
    tmp.ellipse(8, 9, 7.5, 6, 3, dark=2, light=4)
    tmp.outline(1)
    for y in range(16):
        for x in range(16):
            if tmp.get(x, y):
                c.set(ox + x, oy + y, tmp.get(x, y))
    # casa 3×3: 16-18 tejado alto, 22-24 tejado bajo, 19 pared, 20 ventana, 21 puerta
    house = Canvas(48, 48)
    house.poly([(0, 16), (8, 1), (40, 1), (48, 16), (48, 24), (0, 24)], 13)
    for y in range(2, 24, 3):
        for x in range(0, 48):
            if house.get(x, y) == 13:
                house.set(x, y, 14)
    house.rect(0, 22, 47, 23, 6)
    house.rect(2, 24, 45, 47, 15)
    house.rect(2, 44, 45, 47, 9)
    house.rect(19, 30, 28, 47, 7); house.rect(20, 31, 27, 47, 6); house.set(26, 39, 9)
    for wx in (6, 34):
        house.rect(wx, 29, wx + 8, 37, 1); house.rect(wx + 1, 30, wx + 7, 36, 11); house.rect(wx + 1, 30, wx + 3, 32, 12)
        house.rect(wx + 4, 30, wx + 4, 36, 1); house.rect(wx + 1, 33, wx + 7, 33, 1)
    house.outline(1)
    layout = {(0, 0): 16, (1, 0): 17, (2, 0): 18, (0, 1): 22, (1, 1): 23, (2, 1): 24, (0, 2): 19, (1, 2): 21, (2, 2): 20}
    for (hx, hy), idx in layout.items():
        ox, oy = tile(idx)
        if hy == 0:
            grass(ox, oy, 0)
        for y in range(16):
            for x in range(16):
                v = house.get(hx * 16 + x, hy * 16 + y)
                if v:
                    c.set(ox + x, oy + y, v)
    ox, oy = tile(25)  # arena
    c.rect(ox, oy, ox + 15, oy + 15, 9)
    for _ in range(12):
        c.set(ox + random.randrange(16), oy + random.randrange(16), 8)
    return c


# ---------------------------------------------------------------- personajes
CHAR_PAL = ['#73c5a4', '#202028', '#c88060', '#f8c8a0', '#5a3020', '#8a4a28', '#c04010', '#f07020',
            '#f8a850', '#20509a', '#3878d0', '#303848', '#505a70', '#383030', '#f8f8f8', '#80c0f8']
NPC_PAL = ['#73c5a4', '#202028', '#b87050', '#f0c098', '#283050', '#3a4a80', '#782878', '#b048a8',
           '#e080d0', '#2a7a40', '#48b060', '#584030', '#806048', '#383030', '#f8f8f8', '#80c0f8']


def character(direction, phase):
    """direction: down/up/left. phase: 0 quieto, 1 paso A, 2 paso B."""
    c = Canvas(32, 32)
    bob = 1 if phase else 0
    # piernas
    if direction == 'left':
        legs = {0: [(14, 15, 0), (17, 18, 0)], 1: [(12, 14, 0), (18, 19, -1)], 2: [(15, 17, -1), (16, 18, 0)]}[phase]
    else:
        legs = {0: [(12, 14, 0), (17, 19, 0)], 1: [(12, 14, -1), (17, 19, 0)], 2: [(12, 14, 0), (17, 19, -1)]}[phase]
    for x0, x1, lift in legs:
        c.rect(x0, 25 + lift, x1, 28 + lift, 12); c.rect(x1, 25 + lift, x1, 28 + lift, 11)
        c.rect(x0, 29 + lift, x1, 29 + lift, 13)
    # cuerpo
    if direction == 'left':
        c.rect(13, 18 - bob, 19, 25 - bob, 10); c.rect(18, 18 - bob, 19, 25 - bob, 9)
        arm = 1 if phase == 1 else -1 if phase == 2 else 0
        c.rect(15 + arm, 20 - bob, 16 + arm, 24 - bob, 9); c.rect(15 + arm, 25 - bob, 16 + arm, 25 - bob, 3)
    else:
        c.rect(11, 18 - bob, 20, 25 - bob, 10); c.rect(19, 18 - bob, 20, 25 - bob, 9)
        la = -1 if phase == 2 else 0
        ra = -1 if phase == 1 else 0
        c.rect(9, 19 - bob + la, 10, 23 - bob + la, 10); c.rect(9, 24 - bob + la, 10, 24 - bob + la, 3)
        c.rect(21, 19 - bob + ra, 22, 23 - bob + ra, 9); c.rect(21, 24 - bob + ra, 22, 24 - bob + ra, 2)
        if direction == 'down':
            c.rect(15, 18 - bob, 16, 22 - bob, 14)
    # cabeza
    hx = 15.5 if direction != 'left' else 15
    c.ellipse(hx + .5, 12.5 - bob, 6.5, 6, 3, dark=2)
    if direction == 'up':
        c.ellipse(hx + .5, 12 - bob, 6.5, 5.8, 5, dark=4)
    elif direction == 'left':
        c.ellipse(hx + 2.5, 12 - bob, 4.5, 5.6, 5, dark=4)
        c.rect(int(hx) - 3, 13 - bob, int(hx) - 3, 14 - bob, 1)
        c.set(int(hx) - 6, 15 - bob, 3)
    else:
        c.rect(int(hx) - 6, 11 - bob, int(hx) - 5, 15 - bob, 5); c.rect(int(hx) + 6, 11 - bob, int(hx) + 7, 15 - bob, 4)
        c.rect(int(hx) - 3, 13 - bob, int(hx) - 3, 14 - bob, 1); c.rect(int(hx) + 3, 13 - bob, int(hx) + 3, 14 - bob, 1)
    # gorra
    c.ellipse(hx + .5, 9 - bob, 7, 4.5, 7, dark=6, light=8)
    c.rect(int(hx) - 6, 10 - bob, int(hx) + 7, 11 - bob, 7)
    if direction == 'down':
        c.rect(int(hx) - 5, 11 - bob, int(hx) + 6, 11 - bob, 6)
    elif direction == 'left':
        c.rect(int(hx) - 9, 10 - bob, int(hx) - 4, 11 - bob, 6)
    c.set(int(hx), 6 - bob, 14)
    c.outline(1)
    return c


def character_frames():
    seq = [('down', 0), ('up', 0), ('left', 0), ('down', 1), ('down', 2), ('up', 1), ('up', 2), ('left', 1), ('left', 2)]
    return [character(d, p).hex() for d, p in seq]


# ---------------------------------------------------------------- fakemon
MON_PAL = ['#73c5a4', '#281818', '#a02818', '#e04828', '#f88050', '#f8d090', '#d8a060', '#f8f8f8',
           '#202040', '#e83020', '#f89020', '#f8e050', '#f8a0a0', '#787890', '#b0b0c8', '#000000']


def flame(c, cx, cy, s):
    c.poly([(cx, cy - 9 * s), (cx + 5 * s, cy - 1 * s), (cx + 4 * s, cy + 4 * s), (cx, cy + 6 * s), (cx - 4 * s, cy + 4 * s), (cx - 5 * s, cy - 1 * s)], 9)
    c.poly([(cx, cy - 5 * s), (cx + 3 * s, cy + 1 * s), (cx, cy + 4.5 * s), (cx - 3 * s, cy + 1 * s)], 10)
    c.ellipse(cx, cy + 2 * s, 1.6 * s, 2 * s, 11)


def mon_front():
    c = Canvas(64, 64)
    c.ellipse(45, 50, 6, 5, 3, dark=2, light=4)                  # cola corta y esponjosa
    c.ellipse(47, 48, 2.5, 2, 4)
    c.ellipse(31, 46, 13.5, 11.5, 3, dark=2, light=4)          # cuerpo
    c.ellipse(28, 49, 7.5, 6.5, 5, dark=6)                      # panza
    c.ellipse(21, 56, 4.5, 3, 3, dark=2); c.ellipse(36, 57, 4.5, 3, 3, dark=2)  # patas
    c.ellipse(13, 22, 3.5, 5, 2); c.ellipse(37, 22, 3.5, 5, 2)  # orejas redondas
    c.ellipse(25, 28, 13.5, 11, 3, dark=2, light=4)             # cabeza
    flame(c, 25, 15, 1.05)                                       # mecha encendida
    for ex in (19, 30):
        c.ellipse(ex, 27, 3.2, 4.2, 7)
        c.ellipse(ex + .6, 28, 1.9, 2.8, 8)
        c.set(ex, 26, 7)
    c.ellipse(15, 33, 2, 1.3, 12); c.ellipse(34, 33, 2, 1.3, 12)
    c.rect(23, 34, 26, 34, 1); c.set(22, 33, 1); c.set(27, 33, 1)
    c.outline(1)
    return c


def mon_back():
    c = Canvas(64, 64)
    c.ellipse(32, 58, 19, 14, 3, dark=2, light=4)
    c.ellipse(48, 55, 6.5, 5.5, 3, dark=2, light=4)
    c.ellipse(16, 25, 4, 5.5, 2); c.ellipse(46, 25, 4, 5.5, 2)
    c.ellipse(31, 33, 15.5, 12.5, 3, dark=2, light=4)
    flame(c, 31, 19, 1.3)
    c.ellipse(31, 44, 9, 2.5, 2)
    c.outline(1)
    return c


def mon_icon(up=0):
    c = Canvas(32, 32)
    c.ellipse(22, 25 - up, 3, 2.5, 3, dark=2)
    c.ellipse(15, 24 - up, 7, 5.5, 3, dark=2)
    c.ellipse(8, 11 - up, 2, 2.5, 2); c.ellipse(19, 11 - up, 2, 2.5, 2)
    c.ellipse(13.5, 15 - up, 7.5, 6.5, 3, dark=2, light=4)
    flame(c, 13.5, 8 - up, .5)
    c.set(10, 15 - up, 8); c.set(10, 16 - up, 8); c.set(16, 15 - up, 8); c.set(16, 16 - up, 8)
    c.set(9, 18 - up, 12); c.set(18, 18 - up, 12)
    c.outline(1)
    return c


def main():
    ts = tileset()
    front = mon_front()
    W, H = 20, 15
    bottom = [0] * (W * H)
    top = [-1] * (W * H)
    random.seed(11)
    for i in range(W * H):
        bottom[i] = random.choice((0, 0, 0, 1))
    put = lambda x, y, v: bottom.__setitem__(y * W + x, v)
    for y in range(H):  # camino vertical
        put(9, y, 4); put(10, y, 4)
    for x in range(3, 17):
        put(x, 9, 4)
    for y in range(10, 14):  # estanque
        for x in range(13, 18):
            put(x, y, 6 if y == 10 else 5)
    for y in range(3, 6):  # hierba alta
        for x in range(13, 18):
            put(x, y, 2)
    for (x, y) in ((4, 11), (6, 12), (7, 10), (16, 7)):
        put(x, y, 3)
    hx, hy = 3, 4  # casa
    for (dx, dy), idx in {(0, 0): 16, (1, 0): 17, (2, 0): 18, (0, 1): 22, (1, 1): 23, (2, 1): 24, (0, 2): 19, (1, 2): 21, (2, 2): 20}.items():
        put(hx + dx, hy + dy, idx)
    put(4, 7, 4); put(4, 8, 4)
    for (x, y) in ((0, 0), (2, 0), (14, 0), (16, 0), (18, 0), (0, 12), (2, 12), (6, 0), (18, 12)):  # árboles 2×2
        if y + 1 < H:
            top[y * W + x] = 8; top[y * W + x + 1] = 9
            put(x, y + 1, 10); put(x + 1, y + 1, 11)
    put(12, 8, 13)  # cartel
    for x in range(0, 6):
        put(x, 14, 12)
    put(7, 3, 7); put(11, 12, 15); put(12, 12, 15)
    solid = [5, 6, 7, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 22, 23, 24]
    coll = [1 if bottom[i] in solid else 0 for i in range(W * H)]
    project = {
        'format': 'forja-gba', 'version': 1, 'name': 'Pueblo Brisa (ejemplo)',
        'sprites': [
            {'id': 'spr_ts', 'name': 'Tileset Pueblo', 'kind': 'tileset', 'w': 128, 'h': 128, 'fps': 4, 'palette': [snap(c) for c in TS_PAL], 'frames': [ts.hex()], 'solid': solid},
            {'id': 'spr_hero', 'name': 'Protagonista', 'kind': 'overworld', 'w': 32, 'h': 32, 'fps': 7.5, 'palette': [snap(c) for c in CHAR_PAL], 'frames': character_frames(), 'player': True},
            {'id': 'spr_npc', 'name': 'Vecina', 'kind': 'overworld', 'w': 32, 'h': 32, 'fps': 7.5, 'palette': [snap(c) for c in NPC_PAL], 'frames': character_frames()},
            {'id': 'spr_front', 'name': 'Brasín · frente', 'kind': 'front', 'w': 64, 'h': 64, 'fps': 4, 'palette': [snap(c) for c in MON_PAL], 'frames': [front.hex(), stretch_up(front).hex()]},
            {'id': 'spr_back', 'name': 'Brasín · espalda', 'kind': 'back', 'w': 64, 'h': 64, 'fps': 4, 'palette': [snap(c) for c in MON_PAL], 'frames': [mon_back().hex()]},
            {'id': 'spr_icon', 'name': 'Brasín · ícono', 'kind': 'icon', 'w': 32, 'h': 32, 'fps': 4, 'palette': [snap(c) for c in MON_PAL], 'frames': [mon_icon(0).hex(), mon_icon(1).hex()]},
        ],
        'fakemons': [
            {'id': 'mon_brasin', 'name': 'Brasín', 'category': 'Brasa', 'types': ['FIRE', ''], 'stats': {'hp': 44, 'atk': 52, 'def': 43, 'spa': 60, 'spd': 50, 'spe': 65},
             'abilities': ['Mar Llamas', ''], 'hidden': 'Cuerpo Llama', 'growth': 'MEDIUM_SLOW', 'catchRate': 45, 'expYield': 62, 'genderFemale': 12.5,
             'eggGroups': ['FIELD', 'DRAGON'], 'height': 0.5, 'weight': 7.2, 'color': 'RED',
             'dex': 'Lleva una mecha encendida en la cabeza. Cuando está feliz, la llama chisporrotea como una vela de cumpleaños.',
             'evo': {'into': 'mon_fogaton', 'method': 'LEVEL', 'param': 16},
             'learnset': [{'lvl': 1, 'move': 'Arañazo'}, {'lvl': 1, 'move': 'Gruñido'}, {'lvl': 7, 'move': 'Ascuas'}, {'lvl': 13, 'move': 'Mordisco'}, {'lvl': 19, 'move': 'Rueda Fuego'}, {'lvl': 28, 'move': 'Lanzallamas'}],
             'sprites': {'front': 'spr_front', 'back': 'spr_back', 'icon': 'spr_icon'}},
            {'id': 'mon_fogaton', 'name': 'Fogatón', 'category': 'Hoguera', 'types': ['FIRE', 'DRAGON'], 'stats': {'hp': 62, 'atk': 70, 'def': 58, 'spa': 82, 'spd': 66, 'spe': 80},
             'abilities': ['Mar Llamas', ''], 'hidden': 'Cuerpo Llama', 'growth': 'MEDIUM_SLOW', 'catchRate': 45, 'expYield': 142, 'genderFemale': 12.5,
             'eggGroups': ['FIELD', 'DRAGON'], 'height': 1.1, 'weight': 24.0, 'color': 'RED', 'dex': '',
             'evo': {'into': '', 'method': 'LEVEL', 'param': 36},
             'learnset': [{'lvl': 1, 'move': 'Ascuas'}, {'lvl': 16, 'move': 'Garra Dragón'}, {'lvl': 30, 'move': 'Lanzallamas'}],
             'sprites': {'front': '', 'back': '', 'icon': ''}},
        ],
        'scripts': [
            {'id': 'scr_vecina', 'name': 'Vecina regala Fakemon', 'steps': [
                {'op': 'if_flag', 'flag': 'RECIBIO_BRASIN', 'then': [
                    {'op': 'msg', 'text': '¿Cómo está Brasín? Se nota que te quiere mucho.'}], 'else': [
                    {'op': 'msg', 'text': '¡Hola! Mi Brasín tuvo una cría y no puedo cuidarla.'},
                    {'op': 'ask', 'text': '¿Quieres llevártelo en tu aventura?', 'then': [
                        {'op': 'give_mon', 'mon': 'mon_brasin', 'level': 5},
                        {'op': 'set_flag', 'flag': 'RECIBIO_BRASIN'},
                        {'op': 'msg', 'text': 'Toma también esto. ¡Cuídalo bien!'},
                        {'op': 'give_item', 'item': 'Poción', 'qty': 3}], 'else': [
                        {'op': 'msg', 'text': 'Ah… Si cambias de opinión, aquí estaré.'}]}]}]},
            {'id': 'scr_cartel', 'name': 'Cartel del pueblo', 'steps': [{'op': 'msg', 'text': 'PUEBLO BRISA\nDonde sopla el viento de las aventuras.'}]},
        ],
        'maps': [{
            'id': 'map_brisa', 'name': 'Pueblo Brisa', 'w': W, 'h': H, 'tileset': 'spr_ts', 'music': '', 'weather': 'NONE',
            'bottom': bottom, 'top': top, 'coll': coll,
            'events': [
                {'id': 'ev_start', 'type': 'start', 'x': 4, 'y': 8, 'name': 'Inicio'},
                {'id': 'ev_vecina', 'type': 'npc', 'x': 7, 'y': 8, 'name': 'Vecina', 'sprite': 'spr_npc', 'facing': 'left', 'movement': 'mirar', 'script': 'scr_vecina', 'item': '', 'toMap': '', 'toX': 0, 'toY': 0},
                {'id': 'ev_cartel', 'type': 'sign', 'x': 12, 'y': 8, 'name': 'Cartel', 'sprite': '', 'facing': 'down', 'movement': 'quieto', 'script': 'scr_cartel', 'item': '', 'toMap': '', 'toX': 0, 'toY': 0},
                {'id': 'ev_item', 'type': 'item', 'x': 16, 'y': 8, 'name': 'Objeto', 'sprite': '', 'facing': 'down', 'movement': 'quieto', 'script': '', 'item': 'Superpoción', 'toMap': '', 'toX': 0, 'toY': 0},
            ],
        }],
    }
    out = os.path.join(HERE, '..', 'js', 'sample.js')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('/* Proyecto de ejemplo (arte original). Generado por tools/make_sample.py — no editar a mano. */\n')
        f.write("'use strict';\nwindow.F = window.F || {};\nwindow.F.SAMPLE = ")
        json.dump(project, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print('ok', os.path.getsize(out), 'bytes')


if __name__ == '__main__':
    main()
