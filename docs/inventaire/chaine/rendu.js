/**
 * Dessine la chaîne UCM : les cartes, les traits à angles droits, les trois scénarios, les deux lectures et les cinq garanties.
 * `monterLaChaine(hote, donnees)` construit tout dans `hote`, la racine de la chaîne (le paramètre ne s'appelle pas `racine` : la fonction `racine(id)` plus bas porte déjà ce nom). `hote` porte les éléments `#chaine-page`, `#chaine-scene`,
 * `#chaine-bilan`, `#chaine-lectures` et `#chaine-scenarios`. `donnees` est ce que rend `donneesDeLaChaine()`, plus `logos` : les SVG
 * en ligne des cartes (par fichier de logo) et du titre de la zone du kit (`zone`). Ce fichier ne porte aucune donnée de la chaîne.
 */
function monterLaChaine(hote, donnees) {
const P = {
  cadre: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 10h16M10 10v10"/>',
  couches: '<path d="M12 3 3 8l9 5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  terminal: '<path d="M4 6l5 6-5 6M12 18h8"/>',
  accolades: '<path d="M8 4c-2 0-3 1-3 3v2c0 1.5-1 3-2 3 1 0 2 1.5 2 3v2c0 2 1 3 3 3M16 4c2 0 3 1 3 3v2c0 1.5 1 3 2 3-1 0-2 1.5-2 3v2c0 2-1 3-3 3"/>',
  loupe: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  vitrine: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  regle: '<rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/>',
  coeur: '<path d="M3 12h4l2-5 3 10 2-5h7"/>',
  engrenage: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  personne: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  boite: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  goutte: '<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>',
  fenetre: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>',
  fichier: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>',
};
const svgP = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[n]}</svg>`;
const ico = n => n.logo ? logos[n.logo] : `<span class="picto">${svgP(n.picto)}</span>`;

// Les positions sont écrites pour une scène de 1376 px. Une scène plus large les étire,
// sans changer la largeur des cartes : l'espace entre les blocs grandit.
const BASE = 1376, HAUT = 852;
let LARGE = BASE, F = 1;
const largeurDe = n => n.fichier ? 170 : n.note ? 176 : n.paquet ? (n.large ? 360 : 180) : 190;
const gaucheDe = n => Math.round((n.x + largeurDe(n) / 2) * F - largeurDe(n) / 2);
const { ZONES, LEGENDES, LIENS, KIT, MARQUES, GARANTIES, logos } = donnees;
// La boucle de dépendances ci-dessous ajoute des champs aux cartes : elle travaille sur des copies.
const NOEUDS = donnees.NOEUDS.map(n => ({ ...n }));

const TAGS = { livre: 'Disponible', partie: 'En partie', venir: 'À venir' };
for (const [cible, sources] of Object.entries({
  palettes: ['kit', 'moteur', 'socle'], architect: ['kit', 'moteur', 'socle'], exporter: ['kit', 'socle'],
  pcli: ['kit'], padapt: ['kit'], pimpl: ['kit'],
  cli: ['pcli'], adaptateur: ['padapt'], implementer: ['pimpl'],
  linter: ['kit', 'padapt'], storybook: ['kit'], rendu: ['kit'],
})) {
  const n = NOEUDS.find(x => x.id === cible);
  n.deps = [...(n.deps || []), ...sources];
}
const PAR_ID = Object.fromEntries(NOEUDS.map(n => [n.id, n]));
const SCENARIOS = { sans: () => false, auj: n => !!n.auj, cible: () => true };
const coche = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M2.5 6.5l2.5 2.5 4.5-5"/></svg>';
const croix = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M3 3l6 6M9 3l-6 6"/></svg>';

let actif = {}, ouvert = null, filtre = null, lecture = 'flux';
const mode = { architect: 'variables', implementer: 'maj' };
const interrupteur = n => !n.fixe && !n.fichier;
function effectif(id) {
  const n = PAR_ID[id];
  if (interrupteur(n) && !actif[id]) return false;
  return (n.deps || []).every(effectif);
}
const racine = id => { const n = PAR_ID[id]; if (interrupteur(n) && !actif[id]) return n; const d = (n.deps || []).find(x => !effectif(x)); return d ? racine(d) : null; };

const boites = {};
let titres = [];
function mesurer() {
  hote.querySelectorAll('#chaine-scene [data-id]').forEach(el => {
    if (el.classList.contains('ouvert')) return;
    boites[el.dataset.id] = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
  });
  titres = [...hote.querySelectorAll('#chaine-scene .zone h2')].map(h => ({ x: h.parentElement.offsetLeft + h.offsetLeft, y: h.parentElement.offsetTop + h.offsetTop, w: h.offsetWidth, h: h.offsetHeight }));
}
// Les traits suivent les couloirs entre les cartes : un parcours à angles droits sur une grille,
// qui contourne chaque carte avec une marge et pénalise les virages.
const PAS = 6, MARGE = 7, VIRAGE = 10;
const PORTS = { bas: ['b', 'h'], haut: ['h', 'b'], retour: ['g', 'd'], droite: ['d', 'd'], dessus: ['h', 'g'], kit: ['h', 'b'], etagere: ['d', 'g'], dessous: ['b', 'b'] };
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const SORTIE = { d: 0, b: 1, g: 2, h: 3 };
let grille = null, cleGrille = '', routes = new Map(), faisceau = null, occupe = null;

const VOIE_X0 = 546, VOIE_X1 = 1146;
const estVoie = id => PAR_ID[id] && PAR_ID[id].voie !== undefined;

function preparerGrille() {
  const cle = JSON.stringify(boites) + JSON.stringify(titres);
  if (cle === cleGrille) return;
  cleGrille = cle; routes = new Map();
  const W = Math.ceil(LARGE / PAS), H = Math.ceil(HAUT / PAS), bloc = new Uint8Array(W * H);
  for (const r of [...Object.values(boites), ...titres]) {
    const x0 = Math.max(0, Math.floor((r.x - MARGE) / PAS)), x1 = Math.min(W - 1, Math.floor((r.x + r.w + MARGE) / PAS));
    const y0 = Math.max(0, Math.floor((r.y - MARGE) / PAS)), y1 = Math.min(H - 1, Math.floor((r.y + r.h + MARGE) / PAS));
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) bloc[j * W + i] = 1;
  }
  grille = { W, H, bloc };
  // Une voie se traverse, mais un trait évite de la longer.
  const enCours = new Uint8Array(W * H);
  for (const n of NOEUDS) if (n.voie !== undefined) { const j = Math.floor(n.voie / PAS); for (let i = Math.floor(VOIE_X0 * F / PAS); i <= Math.floor(VOIE_X1 * F / PAS); i++) enCours[j * W + i] = 1; }
  grille.voies = enCours;
  faisceau = new Uint8Array(W * H);
  occupe = new Uint8Array(W * H);
  for (let c = 0; c < W * H; c++) if (grille.voies[c]) occupe[c] = 1;
}

function port(id, cote, part, dec = 0) {
  const r = boites[id], centre = v => (Math.floor(v / PAS) + 0.5) * PAS, borne = (v, a, b) => Math.max(a, Math.min(b, v));
  if (cote === 'd' || cote === 'g') {
    const y = centre(borne(r.y + Math.min(r.h / 2, 26) + dec, r.y + 6, r.y + r.h - 6)), x = cote === 'd' ? r.x + r.w : r.x;
    const ox = cote === 'd' ? r.x + r.w + MARGE + PAS : r.x - MARGE - PAS;
    return { x, y, i: Math.floor(ox / PAS), j: Math.floor(y / PAS), dir: SORTIE[cote] };
  }
  const x = centre(borne(r.x + r.w * part + dec, r.x + 8, r.x + r.w - 8)), y = cote === 'b' ? r.y + r.h : r.y;
  const oy = cote === 'b' ? r.y + r.h + MARGE + PAS : r.y - MARGE - PAS;
  return { x, y, i: Math.floor(x / PAS), j: Math.floor(oy / PAS), dir: SORTIE[cote] };
}

function astar(depart, arrivee, entree, regrouper) {
  const { W, H, bloc } = grille, g = new Float32Array(W * H * 4).fill(Infinity), de = new Int32Array(W * H * 4).fill(-1), tas = [];
  const pousser = (p, e) => { tas.push([p, e]); let k = tas.length - 1; while (k) { const q = (k - 1) >> 1; if (tas[q][0] <= tas[k][0]) break; [tas[q], tas[k]] = [tas[k], tas[q]]; k = q; } };
  const tirer = () => { const t = tas[0], d = tas.pop(); if (tas.length) { tas[0] = d; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < tas.length && tas[l][0] < tas[m][0]) m = l; if (r < tas.length && tas[r][0] < tas[m][0]) m = r; if (m === k) break; [tas[m], tas[k]] = [tas[k], tas[m]]; k = m; } } return t; };
  const pas = c => regrouper ? (faisceau[c] ? 0.3 : 1) : 1 + 2.5 * occupe[c];
  const h = (i, j) => (regrouper ? 0.3 : 1) * (Math.abs(i - arrivee.i) + Math.abs(j - arrivee.j));
  const but = arrivee.j * W + arrivee.i, e0 = (depart.j * W + depart.i) * 4 + depart.dir;
  g[e0] = 0; pousser(h(depart.i, depart.j), e0);
  while (tas.length) {
    const [, e] = tirer(), cell = e >> 2, dir = e & 3, i = cell % W, j = (cell / W) | 0;
    if (cell === but) { const cells = []; for (let k = e; k !== -1; k = de[k]) cells.push(k >> 2); for (const c of cells) (regrouper ? faisceau : occupe)[c] = 1; return cells.reverse().map(c => [(c % W + 0.5) * PAS, (((c / W) | 0) + 0.5) * PAS]); }
    for (let nd = 0; nd < 4; nd++) {
      if (nd === (dir + 2) % 4) continue;
      const ni = i + DIRS[nd][0], nj = j + DIRS[nd][1];
      if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      const nc = nj * W + ni;
      const cout = g[e] + pas(nc) + (bloc[nc] && nc !== but ? 60 : 0) + (nd !== dir ? VIRAGE : 0) + (nc === but && nd !== entree ? VIRAGE : 0), ne = nc * 4 + nd;
      if (cout < g[ne]) { g[ne] = cout; de[ne] = e; pousser(cout + h(ni, nj), ne); }
    }
  }
  return null;
}

function simplifier(points) {
  return points.filter((q, k) => !k || q[0] !== points[k - 1][0] || q[1] !== points[k - 1][1])
    .filter((q, k, l) => k === 0 || k === l.length - 1 || !((l[k - 1][0] === q[0] && q[0] === l[k + 1][0]) || (l[k - 1][1] === q[1] && q[1] === l[k + 1][1])));
}

// Deux traits qui partagent un tronçon sont dessinés côte à côte, à 5 px d'écart, comme les lignes d'un plan de métro.
function ecarter(listes, ecart = 5) {
  const segs = [];
  listes.forEach((p, t) => { for (let k = 0; k < p.length - 1; k++) {
    const [x0, y0] = p[k], [x1, y1] = p[k + 1];
    if (y0 === y1 && x0 !== x1) segs.push({ t, k, axe: 'h', c: y0, a: Math.min(x0, x1), b: Math.max(x0, x1), d: 0 });
    else if (x0 === x1 && y0 !== y1) segs.push({ t, k, axe: 'v', c: x0, a: Math.min(y0, y1), b: Math.max(y0, y1), d: 0 });
  } });
  const groupes = new Map();
  for (const sg of segs) { const g = sg.axe + sg.c; if (!groupes.has(g)) groupes.set(g, []); groupes.get(g).push(sg); }
  for (const g of groupes.values()) {
    g.sort((u, v) => u.a - v.a);
    let grappe = [], fin = -Infinity;
    const traiter = () => { const traits = [...new Set(grappe.map(x => x.t))]; if (traits.length > 1) for (const x of grappe) x.d = (traits.indexOf(x.t) - (traits.length - 1) / 2) * ecart; grappe = []; };
    for (const sg of g) { if (grappe.length && sg.a >= fin) { traiter(); fin = -Infinity; } grappe.push(sg); fin = Math.max(fin, sg.b); }
    if (grappe.length) traiter();
  }
  return listes.map((p, t) => p.map((q, k) => {
    let [x, y] = q;
    for (const sg of segs) if (sg.t === t && sg.d && (sg.k === k || sg.k === k - 1)) { if (sg.axe === 'h') y = q[1] + sg.d; else x = q[0] + sg.d; }
    return [x, y];
  }));
}

function lisser(points, r = 6) {
  const p = points.filter((q, k) => !k || q[0] !== points[k - 1][0] || q[1] !== points[k - 1][1])
    .filter((q, k, l) => k === 0 || k === l.length - 1 || !((l[k - 1][0] === q[0] && q[0] === l[k + 1][0]) || (l[k - 1][1] === q[1] && q[1] === l[k + 1][1])));
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let k = 1; k < p.length - 1; k++) {
    const [x0, y0] = p[k - 1], [x1, y1] = p[k], [x2, y2] = p[k + 1];
    const l1 = Math.hypot(x1 - x0, y1 - y0), l2 = Math.hypot(x2 - x1, y2 - y1), q = Math.min(r, l1 / 2, l2 / 2);
    d += ` L${x1 + (x0 - x1) / l1 * q},${y1 + (y0 - y1) / l1 * q} Q${x1},${y1} ${x1 + (x2 - x1) / l2 * q},${y1 + (y2 - y1) / l2 * q}`;
  }
  const z = p[p.length - 1];
  return d + ` L${z[0]},${z[1]}`;
}

function repartir(traits) {
  const groupes = new Map(), dec = traits.map(() => ({ a: 0, b: 0 }));
  traits.forEach((t, k) => {
    const [ca, cb] = PORTS[t.f] || ['d', 'g'];
    for (const [id, c0, autre, sens] of [[t.a, ca, t.b, 'a'], [t.b, cb, t.a, 'b']]) {
      if (estVoie(id)) continue;
      let cote = c0;
      if (estVoie(autre)) { const r = boites[id]; cote = r.x + r.w > VOIE_X1 * F + 1 ? 'g' : r.y + r.h <= PAR_ID[autre].voie ? 'b' : 'h'; }
      const g = id + ':' + cote;
      if (!groupes.has(g)) groupes.set(g, []);
      groupes.get(g).push({ k, sens, autre, cote });
    }
  });
  for (const g of groupes.values()) {
    if (g.length < 2) continue;
    const vertical = g[0].cote === 'g' || g[0].cote === 'd';
    g.sort((u, v) => { const U = boites[u.autre], V = boites[v.autre]; return vertical ? (U.y + U.h / 2) - (V.y + V.h / 2) : (U.x + U.w / 2) - (V.x + V.w / 2); });
    g.forEach((e, i) => { dec[e.k][e.sens] = (i - (g.length - 1) / 2) * 14; });
  }
  return dec;
}

function route(a, b, forme, dA = 0, dB = 0) {
  const cle = a + '>' + b + ':' + forme + ':' + dA + ':' + dB;
  if (routes.has(cle)) return routes.get(cle);
  if (estVoie(b) || estVoie(a)) {
    const voie = estVoie(b) ? b : a, carte = voie === b ? a : b, y = PAR_ID[voie].voie, r = boites[carte];
    const dansLeRail = r.x + r.w <= VOIE_X1 * F + 1;
    let p;
    if (dansLeRail) {
      const dessus = r.y + r.h <= y, P = port(carte, dessus ? 'b' : 'h', 0.5, voie === b ? dA : dB);
      p = voie === b ? [[P.x, P.y], [P.x, y]] : [[P.x, y], [P.x, P.y]];
    } else {
      const B = port(carte, 'g', 0.5, dB), x = VOIE_X1 * F;
      const A = { x, y, i: Math.floor((x + MARGE + PAS) / PAS), j: Math.floor(y / PAS), dir: 0 };
      const cells = astar(A, B, 0, false);
      p = simplifier(cells ? [[A.x, A.y], ...cells, [B.x, B.y]] : [[A.x, A.y], [B.x, B.y]]);
    }
    routes.set(cle, p);
    return p;
  }
  const [ca, cb] = PORTS[forme] || ['d', 'g'];
  const A = port(a, ca, 0.5, dA), B = port(b, cb, forme === 'kit' ? 0.82 : 0.5, dB);
  const cells = astar(A, B, (SORTIE[cb] + 2) % 4, forme === 'kit');
  const p = simplifier(cells ? [[A.x, A.y], ...cells, [B.x, B.y]] : [[A.x, A.y], [B.x, B.y]]);
  routes.set(cle, p);
  return p;
}

const couches = liste => `<div class="couches">${liste.map(([a, b]) => `<span>${a} <em>${b}</em></span>`).join('<i></i>')}</div>`;

function carte(n) {
  const estOuvert = ouvert === n.id;
  const largeur = n.large ? 340 : 270;
  const gauche = estOuvert ? Math.min(gaucheDe(n), LARGE - largeur - 8) : gaucheDe(n);
  if (n.fichier) {
    return `<div class="fichier voie v-${n.id}${effectif(n.id) ? '' : ' prive'}${estOuvert ? ' ouvert' : ''}" data-id="${n.id}" style="left:${Math.round(n.x * F)}px;top:${n.y}px">
      <div class="tete"><span class="picto">${svgP('fichier')}</span><span class="nom">${n.nom}<span class="type">${n.type || ''}</span></span></div><div class="plus"><p>${n.texte}</p></div></div>`;
  }
  if (n.note) {
    const on = effectif(n.id);
    return `<div class="note${on ? '' : ' eteint'}" data-id="${n.id}" data-bascule="${n.id}" style="left:${gaucheDe(n)}px;top:${n.y}px">
      <span class="tag ${n.etat}">${TAGS[n.etat]}</span><b>${n.nom}.</b> ${on ? n.texte : n.sans}</div>`;
  }
  const m = n.modes ? n.modes[mode[n.id]] : n;
  let classe = [n.fixe ? 'fixe' : '', n.paquet ? 'kit paquet' : '', n.large ? 'large' : ''].join(' '), phrase = m.phrase, inter = coche;
  if (!n.fixe && !actif[n.id]) { classe += ' eteint'; inter = croix; phrase = n.sans; }
  else if (!n.fixe && !effectif(n.id)) { classe += ' prive'; inter = croix; const r = racine(n.id); phrase = r.kit ? `Ne fonctionne pas sans ${r.nom}.` : `Rien à lire sans ${r.nom}.`; }
  if (estOuvert) phrase = m.phrase;
  const alt = n.alternative && !actif[n.id] && !estOuvert ? n.alternative : null;
  if (alt) classe += ' alternative';
  const plus = `<div class="plus">
      <ul>${m.fait.map(f => `<li>${f}</li>`).join('')}</ul>
      ${n.briques ? `<div class="briques">${n.briques.map(([t, e]) => `<div><span>${t}</span><span class="tag ${e}">${TAGS[e]}</span></div>`).join('')}</div>` : ''}
      ${n.sans ? `<p class="sans"><b>Sans :</b> ${n.sans}</p>` : ''}
    </div>`;
  return `<div class="noeud ${classe}${estOuvert ? ' ouvert' : ''}" data-id="${n.id}" style="left:${gauche}px;top:${n.y}px">
    ${n.etat && !alt ? `<span class="tag ${n.etat}">${TAGS[n.etat]}</span>` : ''}
    ${interrupteur(n) ? `<span class="inter">${inter}</span>` : ''}
    ${interrupteur(n) && !estOuvert ? `<button class="action" data-bascule="${n.id}">${actif[n.id] ? 'Retirer' : 'Remettre'}</button>` : ''}
    ${MARQUES[n.id] && lecture === 'flux' ? `<span class="marques">${MARQUES[n.id].map(m => `<span>${m}</span>`).join('')}</span>` : ''}
    <div class="tete">${n.paquet ? `<span class="picto">${svgP('boite')}</span>` : ico(n)}<span class="nom">${alt ? alt.nom : n.nom}<span class="type">${alt ? alt.type : n.type}</span></span></div>
    ${n.modes ? `<div class="bascule">${Object.entries(n.modes).map(([k, v]) => `<button data-mode="${n.id}:${k}" class="${mode[n.id] === k ? 'actif' : ''}">${v.libelle}</button>`).join('')}</div>` : ''}
    <p class="phrase">${alt ? alt.phrase : phrase}</p>
    ${n.couches ? couches(alt ? alt.couches : n.couches) : ''}
    ${n.puces ? `<div class="puces">${n.puces.map(([k, t]) => `<button data-filtre="${k}" class="${filtre === k ? 'actif' : ''}">${t}</button>`).join('')}</div>` : ''}
    ${plus}
  </div>`;
}

function rendre() {
  const scene = hote.querySelector('#chaine-scene');
  scene.className = 'scene lecture-' + lecture;
  scene.style.width = LARGE + 'px';
  hote.querySelector('#chaine-page').style.width = (LARGE + 64) + 'px';
  scene.innerHTML =
    ZONES.map(z => `<div class="zone${z.kit ? ' kit' : ''}" style="left:${Math.round(z.x * F)}px;top:${z.y}px;width:${Math.round((z.x + z.w) * F) - Math.round(z.x * F)}px;height:${z.h}px"><h2>${z.kit ? logos.zone : ''}${z.titre}${z.qui ? ` <span>· ${z.qui}</span>` : ''}</h2></div>`).join('') +
    LEGENDES.map(l => `<div class="legende-zone" style="left:${Math.round(l.x * F)}px;top:${l.y}px">${l.texte}</div>`).join('') +
    '<svg class="liens" id="chaine-liens"></svg>' + NOEUDS.map(carte).join('');
  mesurer();
  const o = scene.querySelector('.ouvert');
  if (o && o.offsetTop + o.offsetHeight > HAUT - 8) o.style.top = Math.max(8, HAUT - 8 - o.offsetHeight) + 'px';

  const voisins = new Set([ouvert]);
  const marquer = (a, b, c) => {
    if (!ouvert) return c;
    if (a === ouvert || b === ouvert) { voisins.add(a); voisins.add(b); return c + ' surligne'; }
    return c + ' estompe';
  };
  const outils = NOEUDS.filter(n => n.modes).flatMap(n => Object.entries(n.modes).map(([k, v]) => [n.id, v.vers, k]));
  preparerGrille();
  const chevron = p => {
    const [x0, y0] = p[p.length - 2], [x1, y1] = p[p.length - 1], l = Math.hypot(x1 - x0, y1 - y0) || 1;
    const dx = (x1 - x0) / l, dy = (y1 - y0) / l, tx = x1 - dx * 1.5, ty = y1 - dy * 1.5, long = 5, large = 3.6;
    return `M${tx - dx * long - dy * large},${ty - dy * long + dx * large} L${tx},${ty} L${tx - dx * long + dy * large},${ty - dy * long - dx * large}`;
  };
  const trait = (c, p, a, b, halo) => (halo ? `<path class="halo${['secondaire', 'coupe', 'repos'].filter(x => c.includes(x)).map(x => ' ' + x).join('')}" d="${lisser(p)}" data-a="${a}" data-b="${b}"/>` : '') + `<path class="${c}" d="${lisser(p)}" data-a="${a}" data-b="${b}"/>` +
    (c.includes('repos') ? '' : `<path class="${c} pointe" d="${chevron(p)}" data-a="${a}" data-b="${b}"/>`);
  const recus = new Set();
  if (filtre) for (const [a, b, q] of KIT) if (a === 'kit' && q.includes(filtre)) { recus.add(b); for (const [c, d] of KIT) if (c === b) recus.add(d); }
  const flux = lecture === 'flux';
  hote.querySelector('#chaine-liens').innerHTML = '' +
    (() => {
      if (!flux) return '';
      const traits = [
        ...LIENS.map(([a, b, f, teinte, sec]) => { const ok = effectif(a) && (interrupteur(PAR_ID[b]) ? actif[b] : true); return { a, b, f, c: (filtre ? 'actif estompe' : marquer(a, b, ok ? 'actif' : 'coupe')) + ' t-' + teinte + (sec ? ' secondaire' : '') }; }),
        ...NOEUDS.filter(n => n.modes).flatMap(n => Object.entries(n.modes).map(([k, v]) => [n.id, v.vers, k])).map(([a, b, k]) => {
          const c = !effectif(a) ? 'coupe' : mode[a] === k ? 'outil' : 'outil repos';
          return { a, b, f: b === 'developpement' ? 'retour' : 'haut', c: (filtre ? c + ' estompe' : marquer(a, b, c)) + ' t-neutre' };
        }),
      ];
      const dec = repartir(traits);
      const ecartes = ecarter(traits.map((t, k) => route(t.a, t.b, t.f, dec[k].a, dec[k].b)));
      const voies = NOEUDS.filter(n => n.voie !== undefined).map(n => `<line class="rail v-${n.id}${effectif(n.id) ? '' : ' vide'}" x1="${VOIE_X0 * F}" y1="${n.voie}" x2="${VOIE_X1 * F}" y2="${n.voie}"/>`).join('');
      return voies + traits.map((t, k) => trait(t.c, ecartes[k], t.a, t.b)).join('');
    })() +
    (() => {
      if (flux) return '';
      const traits = KIT.map(([a, b, q]) => ({ a, b, q, f: PAR_ID[b].paquet ? 'etagere' : 'kit' }));
      const dec = repartir(traits);
      return traits.map(({ a, b, q, f }, k) => {
        let c = effectif(a) ? 'kit' : 'coupe';
        c = filtre ? (recus.has(b) && (a === 'kit' ? q.includes(filtre) : recus.has(a)) ? c + ' surligne' : c + ' estompe') : marquer(a, b, c);
        return trait(c, route(a, b, f, dec[k].a, dec[k].b), a, b);
      }).join('');
    })();
  if (ouvert) scene.querySelectorAll('[data-id]').forEach(el => { if (!voisins.has(el.dataset.id)) el.style.opacity = .4; });
  if (filtre) scene.querySelectorAll('[data-id]').forEach(el => { if (el.dataset.id !== 'kit' && !recus.has(el.dataset.id)) el.style.opacity = .35; });
  hote.querySelectorAll('#chaine-lectures button').forEach(bt => bt.classList.toggle('actif', bt.dataset.l === lecture));

  hote.querySelector('#chaine-bilan').innerHTML = GARANTIES.map(g => {
    const k = g.par.filter(effectif).length;
    const cl = k === 0 ? 'non' : k === g.par.length ? 'oui' : 'partiel';
    const v = cl === 'oui' ? 'Garanti' : cl === 'non' ? 'À la main' : `${k} sur ${g.par.length}`;
    return `<div class="garantie ${cl}"><div class="tete"><b>${g.nom}</b><span class="verdict">${v}</span></div>
      <div class="barre">${g.par.map(id => `<i class="${effectif(id) ? 'plein' : ''}" title="${PAR_ID[id].nom}"></i>`).join('')}</div></div>`;
  }).join('');

  const courant = Object.keys(SCENARIOS).find(s => NOEUDS.filter(interrupteur).every(n => !!actif[n.id] === !!SCENARIOS[s](n)));
  hote.querySelectorAll('#chaine-scenarios button').forEach(bt => bt.classList.toggle('actif', bt.dataset.s === courant));
  ajuster();
}

// La page est dessinée à 1440 px de large, puis agrandie jusqu'à 130 % ou réduite pour tenir entière dans la fenêtre.
// L'échelle suit la hauteur de la fenêtre, jusqu'à 130 %, et descend sous 1 seulement si la fenêtre fait moins de 1440 px
// à cette échelle. La scène prend ensuite toute la largeur qui reste, marges de 32 px comprises.
function ajuster() {
  const page = hote.querySelector('#chaine-page');
  const l = document.documentElement.clientWidth;
  const k = Math.min(1.3, window.innerHeight / page.offsetHeight, l / (BASE + 64));
  const large = Math.max(BASE, Math.floor(l / k) - 64);
  if (large !== LARGE) { LARGE = large; F = LARGE / BASE; rendre(); return; }
  page.style.transform = `translate(${Math.max(0, (l - (LARGE + 64) * k) / 2)}px, 0) scale(${k})`;
  document.body.style.height = (page.offsetHeight * k) + 'px';
}
function appliquer(s) { actif = Object.fromEntries(NOEUDS.map(n => [n.id, !!SCENARIOS[s](n)])); ouvert = null; rendre(); }

hote.querySelector('#chaine-scenarios').addEventListener('click', e => { const s = e.target.dataset.s; if (s) appliquer(s); });
hote.querySelector('#chaine-lectures').addEventListener('click', e => { const l = e.target.dataset.l; if (l) { lecture = l; filtre = null; ouvert = null; rendre(); } });
// Le survol ne redessine rien : il pose des classes sur les traits et les cartes reliés.
const scene0 = hote.querySelector('#chaine-scene');
scene0.addEventListener('mouseover', e => {
  const el = e.target.closest('#chaine-scene [data-id]');
  if (!el || ouvert || filtre) return;
  const id = el.dataset.id, lies = new Set([id]);
  scene0.querySelectorAll('svg.liens > path').forEach(p => { const l = p.dataset.a === id || p.dataset.b === id; p.classList.toggle('lie', l); if (l) { lies.add(p.dataset.a); lies.add(p.dataset.b); } });
  scene0.querySelectorAll('[data-id]').forEach(c => c.classList.toggle('lie', lies.has(c.dataset.id)));
  scene0.classList.add('survol');
});
scene0.addEventListener('mouseleave', () => scene0.classList.remove('survol'));
scene0.addEventListener('mouseout', e => { if (!e.relatedTarget || !e.relatedTarget.closest('#chaine-scene [data-id]')) scene0.classList.remove('survol'); });

hote.addEventListener('click', e => {
  const pf = e.target.closest('[data-filtre]');
  if (pf) { filtre = filtre === pf.dataset.filtre ? null : pf.dataset.filtre; ouvert = null; lecture = 'paquets'; rendre(); return; }
  const md = e.target.closest('[data-mode]');
  if (md) { const [id, k] = md.dataset.mode.split(':'); mode[id] = k; rendre(); return; }
  const b = e.target.closest('[data-bascule]');
  if (b) { const id = b.dataset.bascule; actif[id] = !actif[id]; rendre(); return; }
  const el = e.target.closest('#chaine-scene [data-id]');
  if (el) { ouvert = ouvert === el.dataset.id ? null : el.dataset.id; if (PAR_ID[el.dataset.id].paquet) lecture = 'paquets'; rendre(); return; }
  if (ouvert || filtre) { ouvert = null; filtre = null; rendre(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && ouvert) { ouvert = null; rendre(); } });
window.addEventListener('resize', ajuster);
if (typeof ResizeObserver !== 'undefined') new ResizeObserver(ajuster).observe(hote);
// Les traits se calculent sur la taille des cartes : une police qui arrive après le premier rendu les déplace d'un pixel.
if (document.fonts) document.fonts.ready.then(rendre);
appliquer('auj');
}
