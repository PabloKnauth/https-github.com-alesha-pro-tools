"""Une la compilación de vista previa (dist-vista-previa) en un solo HTML para publicarlo como Artifact."""
import glob, sys
js = open(glob.glob("dist-vista-previa/assets/*.js")[0]).read().replace("</script", "<\\/script")
css = open(glob.glob("dist-vista-previa/assets/*.css")[0]).read()
html = f'''<title>ROJU CRM</title>
<meta name="robots" content="noindex, nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700;800&display=swap">
<style>{css}
html,body{{background:#071221}}</style>
<div id="app"></div>
<script type="module">{js}</script>
'''
open(sys.argv[1], "w").write(html)
