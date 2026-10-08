// Generates every SVG in ../assets (dark + light). All type is converted to outlines
// so it renders identically on GitHub (which blocks web fonts in <img> SVGs).
// Run:  NODE_PATH=<dir with fontkit installed> node tools/build.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, mkdirSync, readdirSync, unlinkSync, readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const fontkit = require('fontkit');

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'assets');
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith('.svg')) unlinkSync(join(OUT, f));

const font = (n) => fontkit.openSync(join(HERE, 'fonts', n));
const F = {
  d800: font('bricolage-grotesque-latin-800-normal.woff'),
  d700: font('bricolage-grotesque-latin-700-normal.woff'),
  d500: font('bricolage-grotesque-latin-500-normal.woff'),
  m400: font('martian-mono-latin-400-normal.woff'),
  m500: font('martian-mono-latin-500-normal.woff'),
  m700: font('martian-mono-latin-700-normal.woff'),
};

// ---------- palette ----------
const THEMES = {
  dark: {
    bg: '#0F1315', bg2: '#151B1E', grid: '#192126', line: '#2A353B', ink: '#EDE7D8',
    mute: '#7F8D94', copper: '#E8892B', brass: '#F6C56E', foam: '#CFC4A8', hole: '#07090A', cable: '#222C31',
  },
  light: {
    bg: '#F4F0E6', bg2: '#EAE4D4', grid: '#E5DFCE', line: '#CBC3AE', ink: '#1A2023',
    mute: '#5C686E', copper: '#B25800', brass: '#E09A22', foam: '#D9CDAE', hole: '#2A3236', cable: '#D3CBB6',
  },
};

// ---------- type -> outlines ----------
const rd = (n) => Math.round(n * 10) / 10;
function shift(cmds, dx, dy) {
  let d = '';
  for (const { command: c, args: a } of cmds) {
    if (c === 'closePath') { d += 'Z'; continue; }
    const k = { moveTo: 'M', lineTo: 'L', quadraticCurveTo: 'Q', bezierCurveTo: 'C' }[c];
    d += k;
    for (let i = 0; i < a.length; i += 2) d += `${rd(a[i] + dx)} ${rd(a[i + 1] + dy)} `;
  }
  return d;
}
function run(f, str, size, ls = 0) {
  const r = f.layout(str);
  const s = size / f.unitsPerEm;
  let pen = 0;
  const glyphs = r.glyphs.map((g, i) => {
    const p = r.positions[i];
    const g0 = { pen, d: shift(g.path.commands, p.xOffset || 0, p.yOffset || 0), bbox: g.bbox };
    pen += p.xAdvance + ls / s;
    return g0;
  });
  return { glyphs, s, width: (pen - ls / s) * s };
}
const measure = (f, str, size, ls = 0) => run(f, str, size, ls).width;
function text(f, str, size, x, y, fill, { anchor = 'start', ls = 0, opacity = 1, cls = '' } = {}) {
  const r = run(f, str, size, ls);
  const ox = anchor === 'middle' ? x - r.width / 2 : anchor === 'end' ? x - r.width : x;
  const body = r.glyphs.map((g) => `<path transform="translate(${rd(g.pen)} 0)" d="${g.d}"/>`).join('');
  return `<g${cls ? ` class="${cls}"` : ''} transform="translate(${rd(ox)} ${rd(y)}) scale(${rd4(r.s)} ${-rd4(r.s)})" fill="${fill}"${opacity !== 1 ? ` opacity="${opacity}"` : ''}>${body}</g>`;
}
const rd4 = (n) => Math.round(n * 1e5) / 1e5;

const css = (T) => `
.blink{animation:bl 3.4s ease-in-out infinite}
@keyframes bl{0%,100%{opacity:1}50%{opacity:.18}}
@media (prefers-reduced-motion:reduce){.blink{animation:none}}`;

const wrap = (W, H, label, T, inner, { frame = true, extra = '' } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${label}">
<title>${label}</title>
<style>${css(T)}</style>
<defs>
<radialGradient id="glow"><stop offset="0" stop-color="${T.brass}" stop-opacity=".55"/><stop offset="1" stop-color="${T.brass}" stop-opacity="0"/></radialGradient>
${extra}
</defs>
${frame ? `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="10" fill="${T.bg}" stroke="${T.line}"/>` : ''}
${inner}
</svg>`;

// a travelling pulse along a path
const pulse = (T, path, dur, begin = 0, r = 3.4) => `<g opacity="0">
<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.06;.94;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
<circle r="${r * 3.4}" fill="url(#glow)"><animateMotion dur="${dur}s" begin="${begin}s" repeatCount="indefinite" path="${path}"/></circle>
<circle r="${r}" fill="${T.brass}" stroke="${T.bg}" stroke-width="1.5"><animateMotion dur="${dur}s" begin="${begin}s" repeatCount="indefinite" path="${path}"/></circle>
</g>`;

// coax cross-section glyph centred at (cx,cy) with outer radius R
function coax(T, cx, cy, R, { bgFill = T.bg } = {}) {
  const braid = R * 0.66, sw = R * 0.1;
  const circ = braid * 2 * Math.PI;
  const dash = circ / 46;
  return `<g>
<circle cx="${rd(cx)}" cy="${rd(cy)}" r="${rd(R * 0.9)}" fill="none" stroke="${T.ink}" stroke-width="${rd(R * 0.2)}"/>
<circle cx="${rd(cx)}" cy="${rd(cy)}" r="${rd(R * 0.7)}" fill="${T.foam}"/>
<circle cx="${rd(cx)}" cy="${rd(cy)}" r="${rd(braid)}" fill="none" stroke="${T.copper}" stroke-width="${rd(sw)}" stroke-dasharray="${rd(dash * 0.62)} ${rd(dash * 0.38)}"/>
<circle cx="${rd(cx)}" cy="${rd(cy)}" r="${rd(R * 0.46)}" fill="${T.foam}"/>
<circle cx="${rd(cx)}" cy="${rd(cy)}" r="${rd(R * 0.2)}" fill="${T.copper}"/>
<circle cx="${rd(cx - R * 0.05)}" cy="${rd(cy - R * 0.06)}" r="${rd(R * 0.07)}" fill="${T.brass}"/>
</g>`;
}

const OHM = '75 ohm';

// =============================================================== HERO
function hero(T) {
  const W = 900, H = 440;
  const word = 'Coaxys';
  const probe = measure(F.d800, word, 100, -2);
  const size = (100 * 770) / probe;
  const ls = -0.02 * size;
  const r = run(F.d800, word, size, ls);
  const wx = 44, base = 232;
  const oG = r.glyphs[1];
  const bb = oG.bbox, s = r.s;
  const ocx = wx + (oG.pen + (bb.minX + bb.maxX) / 2) * s;
  const ocy = base - ((bb.minY + bb.maxY) / 2) * s;
  const oR = ((bb.maxY - bb.minY) / 2) * s;

  const letters = r.glyphs
    .map((g, i) => (i === 1 ? '' : `<path transform="translate(${rd(g.pen)} 0)" d="${g.d}"/>`))
    .join('');
  const cy = 318;
  const cable = `M96,${cy} H804`;
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const x = 96 + i * 12, long = i % 5 === 0;
    return `M${x},${cy + 12} v${long ? 8 : 4}`;
  }).join('');
  const conn = (x, dir) => {
    const nut = `<rect x="${dir > 0 ? x : x - 26}" y="${cy - 14}" width="26" height="28" rx="3" fill="${T.bg2}" stroke="${T.line}"/>`;
    const ring = `<rect x="${dir > 0 ? x + 26 : x - 38}" y="${cy - 9}" width="12" height="18" rx="2" fill="${T.cable}" stroke="${T.line}"/>`;
    const rib = [8, 14, 20].map((k) => `<line x1="${x + dir * k - (dir < 0 ? 0 : 0)}" y1="${cy - 10}" x2="${x + dir * k}" y2="${cy + 10}" stroke="${T.line}"/>`).join('');
    return nut + ring + rib;
  };
  const inner = `
<defs>
<pattern id="gr" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="${T.grid}"/></pattern>
<radialGradient id="fd" cx=".3" cy=".42" r=".85"><stop offset="0" stop-color="${T.bg}" stop-opacity="0"/><stop offset="1" stop-color="${T.bg}" stop-opacity="1"/></radialGradient>
</defs>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="10" fill="url(#gr)"/>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="10" fill="url(#fd)"/>
${text(F.m500, 'THE-COAXYS  /  FIELD STATION', 10.5, 48, 40, T.mute, { ls: 2.4 })}
<circle class="blink" cx="${W - 48 - measure(F.m500, 'SIGNAL LOCKED  ·  ' + OHM, 10.5, 2.4) - 16}" cy="36.5" r="3.4" fill="${T.copper}"/>
${text(F.m500, 'SIGNAL LOCKED  ·  ' + OHM, 10.5, W - 48, 40, T.mute, { anchor: 'end', ls: 2.4 })}
<g transform="translate(${wx} ${base}) scale(${rd4(s)} ${-rd4(s)})" fill="${T.ink}">${letters}</g>
${coax(T, ocx, ocy, oR)}
<path d="${cable}" stroke="${T.cable}" stroke-width="14" fill="none"/>
<path d="M96,${cy - 7} H804 M96,${cy + 7} H804" stroke="${T.line}" fill="none"/>
<path d="${cable}" stroke="${T.copper}" stroke-width="3" stroke-dasharray="2 3" opacity=".55" fill="none"/>
${conn(96, -1)}${conn(804, 1)}
<path d="${ticks}" stroke="${T.line}" fill="none"/>
${pulse(T, cable, 5.2, 0)}${pulse(T, cable, 5.2, 1.75)}${pulse(T, cable, 5.2, 3.5)}
${text(F.d500, 'I keep servers boring so the interesting things can run.', 27, 48, 392, T.ink)}
${text(F.m400, 'self-hosting  ·  networking  ·  automation', 11.5, 48, 418, T.mute, { ls: 1.6 })}
${text(F.m400, 'rg-6  ·  ' + OHM, 11.5, W - 48, 418, T.mute, { anchor: 'end', ls: 1.6 })}`;
  return wrap(W, H, 'Coaxys: infrastructure, networking and automation. The o in the name is a coaxial cable cross-section.', T, inner, { frame: true });
}

// =============================================================== SIGNAL MAP
function signalMap(T) {
  const W = 900, H = 340;
  const REQ = 'M60,80 H290 L375,165 H555 L640,80 H820';
  const TUN = 'M60,250 H365 L450,165';
  const BAK = 'M450,165 L535,250 H820';
  const st = (x, y, col, filled = false) =>
    `<circle cx="${x}" cy="${y}" r="7.5" fill="${filled ? col : T.bg}" stroke="${col}" stroke-width="3.2"/>`;
  const lab = (s, x, y, anchor = 'middle', col = T.ink) => text(F.m500, s, 10.5, x, y, col, { anchor, ls: 0.4 });
  const sub = (s, x, y, anchor = 'middle') => text(F.m400, s, 9.5, x, y, T.mute, { anchor, ls: 0.4 });
  const key = (x, y, kind, label) => {
    const line =
      kind === 'req' ? `<path d="M${x},${y} h34" stroke="${T.copper}" stroke-width="5" stroke-linecap="round"/>`
      : kind === 'tun' ? `<path d="M${x},${y} h34" stroke="${T.ink}" stroke-width="5" stroke-linecap="round"/>`
      : `<path d="M${x},${y} h34" stroke="${T.mute}" stroke-width="4" stroke-dasharray="9 7" stroke-linecap="round"/>`;
    return line + text(F.m500, label, 10, x + 46, y + 3.5, T.mute, { ls: 1.2 });
  };
  const inner = `
<path d="${REQ}" fill="none" stroke="${T.copper}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
<path d="${TUN}" fill="none" stroke="${T.ink}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
<path d="${BAK}" fill="none" stroke="${T.mute}" stroke-width="4.5" stroke-dasharray="11 8" stroke-linejoin="round" stroke-linecap="round"/>
${st(60, 80, T.copper, true)}${st(150, 80, T.copper)}${st(240, 80, T.copper)}${st(820, 80, T.copper, true)}
${st(60, 250, T.ink, true)}${st(200, 250, T.ink)}
${st(595, 250, T.mute)}${st(690, 250, T.mute)}${st(820, 250, T.mute, true)}
<circle class="blink" cx="450" cy="165" r="21" fill="none" stroke="${T.copper}" stroke-width="1.5"/>
<circle cx="450" cy="165" r="15" fill="${T.bg}" stroke="${T.ink}" stroke-width="4.5"/>
<circle cx="450" cy="165" r="6" fill="${T.copper}"/>
${lab('browser', 60, 58, 'start')}${lab('dns', 150, 58)}${lab('nginx + tls', 240, 58)}${lab('data', 820, 58, 'end')}
${sub('sqlite · redis', 820, 106, 'end')}
${text(F.d700, 'the server', 17, 450, 126, T.ink, { anchor: 'middle' })}
${sub('systemd · docker', 450, 144)}
${lab('laptop', 60, 276, 'start')}${lab('wireguard', 200, 276)}${sub('custom port', 200, 291)}
${lab('tar | zstd', 595, 276)}${lab('rclone', 690, 276)}${lab('cloud drive', 820, 276, 'end')}
${key(48, 318, 'req', 'REQUEST')}${key(196, 318, 'tun', 'TUNNEL')}${key(336, 318, 'bak', 'BACKUP')}
${pulse(T, REQ, 8, 0)}${pulse(T, REQ, 8, 4)}
${pulse(T, TUN, 4.6, 0.8, 3)}
${pulse(T, BAK, 6.2, 2.2, 3)}`;
  return wrap(W, H, 'Signal map: a request travels browser, DNS, nginx with TLS to the server; a WireGuard tunnel connects a laptop to the same server; backups stream out via tar, zstd and rclone to a cloud drive.', T, inner);
}

// =============================================================== PATCH BAY
function patchBay(T) {
  const W = 900, H = 346;
  const xs = [90, 270, 450, 630, 810];
  const A = ['linux', 'docker', 'nginx', 'wireguard', 'certbot'];
  const As = ['the floor', 'boxes', 'front door', 'private road', 'padlocks'];
  const Bs = ['glue', 'short memory', 'scripts', 'keeps it up', 'off-site copy'];
  const B = ['bash', 'redis', 'python', 'systemd', 'rclone'];
  const yA = 114, yB = 232;
  const jack = (x, y, on) => `<g>
<circle cx="${x}" cy="${y}" r="22" fill="${T.bg2}" stroke="${T.line}" stroke-width="1.5"/>
<circle cx="${x}" cy="${y}" r="15" fill="${T.bg}" stroke="${T.line}"/>
<circle cx="${x}" cy="${y}" r="8" fill="${T.hole}"/>
<circle ${on ? 'class="blink" ' : ''}cx="${x + 17}" cy="${y - 17}" r="2.6" fill="${on ? T.copper : T.line}"/>
</g>`;
  const cableCols = [T.copper, T.ink, T.copper, T.ink, T.copper];
  const paths = [
    `M${xs[0]},${yA} C${xs[0] - 74},${yA + 36} ${xs[0] + 74},${yB - 36} ${xs[0]},${yB}`,
    `M${xs[1]},${yA} C${xs[1] + 80},${yA + 40} ${xs[1] - 80},${yB - 40} ${xs[1]},${yB}`,
    `M${xs[2]},${yA} C${xs[2] - 74},${yA + 36} ${xs[2] + 74},${yB - 36} ${xs[2]},${yB}`,
    `M${xs[3]},${yA} C${xs[3] + 80},${yA + 40} ${xs[3] - 80},${yB - 40} ${xs[3]},${yB}`,
    `M${xs[4]},${yA} C${xs[4] - 74},${yA + 36} ${xs[4] + 74},${yB - 36} ${xs[4]},${yB}`,
  ];
  const plug = (x, y, col) => `<circle cx="${x}" cy="${y}" r="10.5" fill="${col}" stroke="${T.bg}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="4" fill="${T.hole}"/>`;
  const cables = paths.map((d, i) => `<path d="${d}" fill="none" stroke="${T.bg}" stroke-width="8" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${cableCols[i]}" stroke-width="4.5" stroke-linecap="round"/>`).join('');
  const plugs = xs.map((x, i) => plug(x, yA, cableCols[i]) + plug(x, yB, cableCols[i])).join('');
  const pulses = paths.map((d, i) => pulse(T, d, 3.6 + i * 0.5, i * 0.7, 2.8)).join('');
  const screws = [[40, 30], [860, 30], [40, 316], [860, 316]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5" fill="${T.bg2}" stroke="${T.line}"/><path d="M${x - 3},${y - 3} L${x + 3},${y + 3}" stroke="${T.line}"/>`).join('');
  const labs = xs.map((x, i) =>
    text(F.m500, A[i].toUpperCase(), 10.5, x, yA - 50, T.ink, { anchor: 'middle', ls: 2 }) + text(F.d500, As[i], 13, x, yA - 33, T.mute, { anchor: 'middle' }) +
    text(F.m500, B[i].toUpperCase(), 10.5, x, yB + 50, T.ink, { anchor: 'middle', ls: 2 }) + text(F.d500, Bs[i], 13, x, yB + 67, T.mute, { anchor: 'middle' })).join('');
  const inner = `
<rect x="24" y="14" width="852" height="318" rx="6" fill="${T.bg2}" stroke="${T.line}"/>
${screws}
${xs.map((x, i) => jack(x, yA, i % 2 === 0)).join('')}${xs.map((x, i) => jack(x, yB, i % 2 === 1)).join('')}
${cables}${pulses}${plugs}
${labs}`;
  return wrap(W, H, 'Patch bay: ten tools as jacks, linux to bash, docker to redis, nginx to python, wireguard to systemd, certbot to rclone.', T, inner);
}

// =============================================================== SECTION HEADER
function header(T, title, caption) {
  const W = 900, H = 64;
  const tw = measure(F.d800, title, 26, -0.5);
  const inner = `
${coax(T, 18, 30, 11, { bgFill: T.bg })}
${text(F.d800, title, 26, 42, 38, T.ink, { ls: -0.5 })}
${text(F.m500, caption.toUpperCase(), 10, W - 2, 36, T.mute, { anchor: 'end', ls: 2.2 })}
<path d="M0,52 H${W}" stroke="${T.line}"/>
<path d="M0,52 H${rd(42 + tw)}" stroke="${T.copper}" stroke-width="2"/>`;
  // coax() paints its own backdrop circle using T.bg, which is fine on both GitHub themes' cards
  return wrap(W, H, title, T, inner, { frame: false });
}

// =============================================================== SIGN-OFF
function signoff(T) {
  const W = 900, H = 184;
  // morse for "73": 7 = --...   3 = ...--
  const unit = 9, y0 = 122, hi = 46;
  const seq = [['-', '-', '.', '.', '.'], ['.', '.', '.', '-', '-']];
  let x = 52, d = `M${x},${y0}`;
  seq.forEach((ch, ci) => {
    ch.forEach((sym) => {
      const w = sym === '-' ? unit * 3 : unit;
      d += ` H${x} V${y0 - hi} H${x + w} V${y0}`;
      x += w;
      d += ` H${x + unit}`;
      x += unit;
    });
    x += unit * 2;
    d += ` H${x}`;
  });
  const endX = x;
  const trace = d + ` H${W - 330}`;
  const scan = `M52,0 H${W - 330}`;
  const inner = `
<defs><pattern id="gr" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="${T.grid}"/></pattern></defs>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="10" fill="url(#gr)"/>
${text(F.m500, 'END OF TRANSMISSION', 10.5, 48, 40, T.mute, { ls: 2.4 })}
<path d="${trace}" fill="none" stroke="${T.line}" stroke-width="5" stroke-linejoin="round"/>
<path d="${trace}" fill="none" stroke="${T.copper}" stroke-width="2.4" stroke-linejoin="round"/>
<rect x="-1" y="${y0 - hi - 14}" width="2" height="${hi + 28}" fill="${T.brass}" opacity=".9"><animateMotion dur="7s" repeatCount="indefinite" path="M52,0 H${W - 330}"/></rect>
${text(F.m400, 'dah dah dit dit dit  ·  dit dit dit dah dah', 10.5, 52, 158, T.mute, { ls: 1.4 })}
${text(F.d800, '73', 118, W - 48, 128, T.ink, { anchor: 'end', ls: -2 })}
${text(F.m400, 'best regards, in ham-radio', 10.5, W - 48, 158, T.mute, { anchor: 'end', ls: 1.4 })}`;
  return wrap(W, H, 'Sign-off: the number 73 in Morse code, ham radio shorthand for best regards.', T, inner);
}

// =============================================================== STACK (logo wall)
// Marks come from Simple Icons (CC0) except VS Code, which comes from Devicon (MIT); both
// are trademarks of their owners and are used here only to name the tools I use.
const si = require('simple-icons');
const vsc = readFileSync(join(HERE, 'icons', 'vscode.svg'), 'utf8').match(/ d="([^"]+)"/)[1];
const siPath = (slug) => si['si' + slug[0].toUpperCase() + slug.slice(1)].path;
const STACK = [
  ['Python', 'language', siPath('python'), 24], ['TypeScript', 'language', siPath('typescript'), 24],
  ['JavaScript', 'language', siPath('javascript'), 24], ['React', 'ui library', siPath('react'), 24],
  ['Vue.js', 'ui framework', siPath('vuedotjs'), 24], ['Node.js', 'runtime', siPath('nodedotjs'), 24],
  ['npm', 'packages', siPath('npm'), 24], ['VS Code', 'editor', vsc, 128],
  ['Figma', 'design', siPath('figma'), 24], ['Git', 'versioning', siPath('git'), 24],
  ['GitHub', 'code host', siPath('github'), 24], ['Gitea', 'self-hosted', siPath('gitea'), 24],
  ['Docker', 'containers', siPath('docker'), 24], ['Redis', 'cache', siPath('redis'), 24],
  ['Nginx', 'web server', siPath('nginx'), 24], ['WireGuard', 'vpn', siPath('wireguard'), 24],
  ['Linux', 'os', siPath('linux'), 24], ['Bash', 'shell', siPath('gnubash'), 24],
];
function stack(T) {
  const W = 900, cols = 6, gap = 10, pad = 24, th = 108;
  const tw = (W - pad * 2 - gap * (cols - 1)) / cols;
  const rows = Math.ceil(STACK.length / cols);
  const H = pad * 2 + rows * th + (rows - 1) * gap;
  const tiles = STACK.map(([name, kind, d, vb], i) => {
    const x = pad + (i % cols) * (tw + gap), y = pad + Math.floor(i / cols) * (th + gap);
    const sc = 34 / vb;
    return `<g>
<rect x="${rd(x)}" y="${y}" width="${rd(tw)}" height="${th}" rx="8" fill="${T.bg2}" stroke="${T.line}"/>
<path transform="translate(${rd(x + 18)} ${y + 18}) scale(${rd4(sc)})" fill="${T.ink}" fill-rule="evenodd" d="${d}"/>
<circle cx="${rd(x + tw - 14)}" cy="${y + 14}" r="2.4" fill="${T.copper}"/>
${text(F.d700, name, 16, x + 18, y + 77, T.ink, { ls: -0.2 })}
${text(F.m400, kind.toUpperCase(), 8.5, x + 18, y + 94, T.mute, { ls: 1.4 })}
</g>`;
  }).join('\n');
  return wrap(W, H, 'Stack: ' + STACK.map((t) => t[0]).join(', ') + '.', T, tiles);
}

for (const [name, T] of Object.entries(THEMES)) {
  const out = {
    hero: hero(T),
    patch: patchBay(T),
    'h-patch': header(T, 'Patch bay', "what's plugged in"),
    'h-scars': header(T, 'Scars', 'learned the hard way'),
    'h-end': header(T, 'Sign-off', 'say hello'),
    signoff: signoff(T),
    stack: stack(T),
    'h-stack': header(T, 'Stack', 'what I reach for'),
  };
  for (const [k, v] of Object.entries(out)) writeFileSync(join(OUT, `${k}-${name}.svg`), v);
  mkdirSync(join(HERE, '..', 'site', 'assets'), { recursive: true });
  for (const k of ['stack', 'h-stack']) writeFileSync(join(HERE, '..', 'site', 'assets', `${k}-${name}.svg`), out[k]);
}
console.log('built', readdirSync(OUT).length, 'files');
