#!/usr/bin/env python3
"""Empaqueta Forja GBA para publicarlo como página: dist/index.html (sin envoltorio html/head/body) + recursos."""
import os
import re
import shutil

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DIST = os.path.join(ROOT, 'dist')

src = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
body = src.split('<!--ARTIFACT-START-->', 1)[1].split('<!--ARTIFACT-END-->', 1)[0]
body = re.sub(r'<!--HEAD-END-->\s*</head>\s*<body>', '', body)
shutil.rmtree(DIST, ignore_errors=True)
os.makedirs(os.path.join(DIST, 'js'))
with open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(body.strip() + '\n')
shutil.copy(os.path.join(ROOT, 'app.css'), DIST)
for name in os.listdir(os.path.join(ROOT, 'js')):
    shutil.copy(os.path.join(ROOT, 'js', name), os.path.join(DIST, 'js'))
print('dist listo:', sorted(os.listdir(os.path.join(DIST, 'js'))))
