"""Generates the profile SVGs (dark + light). Run: python3 build.py"""
THEMES = {
 "dark":  dict(bg="#14181B", panel="#1C2226", line="#2C363C", ink="#E9E5D9", mute="#8B979D", acc="#F0A53A", led_off="#3A3F37"),
 "light": dict(bg="#F3F0E8", panel="#E7E3D8", line="#CFC9B9", ink="#1C2226", mute="#5E6A70", acc="#B96A00", led_off="#C9C2AE"),
}
FONT = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace"

def hero(t):
    c = THEMES[t]
    rows = [("wg0","wireguard","tunnel up",0),("edge","nginx","proxying",1),("jobs","systemd","12 units",2),("cold","backup","streaming",3)]
    out = [f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 340" width="900" height="340" role="img" aria-label="Coaxys: infrastructure, self-hosting and automation">
<title>Coaxys</title>
<style>
text{{font-family:{FONT}}}
.led{{animation:b 3.2s ease-in-out infinite}}
@keyframes b{{0%,100%{{opacity:1}}50%{{opacity:.25}}}}
.in{{opacity:0;animation:i .7s ease-out forwards}}
@keyframes i{{to{{opacity:1}}}}
@media (prefers-reduced-motion:reduce){{.led,.in{{animation:none;opacity:1}}}}
</style>
<rect width="900" height="340" fill="{c['bg']}"/>
<rect x="0.5" y="0.5" width="899" height="339" fill="none" stroke="{c['line']}"/>
<text x="48" y="92" font-size="54" font-weight="700" fill="{c['ink']}" letter-spacing="-1.5">Coaxys</text>
<rect x="48" y="112" width="44" height="4" fill="{c['acc']}"/>
<text x="48" y="150" font-size="17" fill="{c['ink']}">I keep servers boring</text>
<text x="48" y="174" font-size="17" fill="{c['mute']}">so the interesting things can run.</text>
<text x="48" y="262" font-size="12" fill="{c['mute']}" letter-spacing="2">SELF-HOSTING / NETWORKING / AUTOMATION</text>
<text x="48" y="284" font-size="12" fill="{c['mute']}" letter-spacing="2">LINUX / DOCKER / NGINX / WIREGUARD</text>
<rect x="500" y="40" width="352" height="260" rx="4" fill="{c['panel']}" stroke="{c['line']}"/>
<circle cx="516" cy="56" r="3" fill="{c['line']}"/><circle cx="836" cy="56" r="3" fill="{c['line']}"/>
<circle cx="516" cy="284" r="3" fill="{c['line']}"/><circle cx="836" cy="284" r="3" fill="{c['line']}"/>''']
    for i,(unit,name,state,k) in enumerate(rows):
        y = 70 + i*54
        out.append(f'''<g class="in" style="animation-delay:{0.15*i+0.2}s">
<rect x="528" y="{y}" width="296" height="42" rx="2" fill="{c['bg']}" stroke="{c['line']}"/>
<text x="544" y="{y+18}" font-size="10" fill="{c['mute']}" letter-spacing="1.5">{unit.upper()}</text>
<text x="544" y="{y+34}" font-size="14" fill="{c['ink']}">{name}</text>
<text x="700" y="{y+26}" font-size="11" fill="{c['mute']}">{state}</text>
<circle cx="796" cy="{y+14}" r="4" fill="{c['led_off']}"/>
<circle cx="796" cy="{y+14}" r="4" fill="{c['acc']}" class="led" style="animation-delay:{k*0.7}s"/>
<circle cx="808" cy="{y+14}" r="4" fill="{c['led_off']}"/>
</g>''')
    out.append("</svg>")
    return "\n".join(out)

def divider(t, label):
    c = THEMES[t]
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 36" width="900" height="36" role="img" aria-label="{label}">
<style>text{{font-family:{FONT}}}</style>
<line x1="0" y1="18" x2="900" y2="18" stroke="{c['line']}"/>
<rect x="0" y="9" width="{24+len(label)*9.4:.0f}" height="18" fill="{c['bg']}"/>
<rect x="0" y="13" width="10" height="10" fill="{c['acc']}"/>
<text x="20" y="22" font-size="12" letter-spacing="2" fill="{c['mute']}">{label.upper()}</text>
</svg>'''

for t in THEMES:
    open(f"assets/hero-{t}.svg","w").write(hero(t))
    for key,label in [("now","now"),("stack","toolbox"),("find","find me")]:
        open(f"assets/{key}-{t}.svg","w").write(divider(t,label))
