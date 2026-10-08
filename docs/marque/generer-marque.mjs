/**
 * Écrit les logos UCM et leurs cartes de présentation en SVG.
 *
 * Usage, depuis la racine du dépôt :
 *   node docs/marque/generer-marque.mjs
 *
 * Sortie, à côté de ce script : `logos/*.svg` et `cartes/*.svg`. Chaque logo
 * est un carré de 100 unités découpé en rectangle arrondi (rayon 22,5). Les
 * formes sont des polygones convexes ; une rencontre entre deux formes est leur
 * intersection exacte, peinte d'une couleur pleine.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dossier = path.dirname(fileURLToPath(import.meta.url));
const TAU = Math.PI * 2;
const deg = (d) => d * Math.PI / 180;
const n2 = (v) => Math.round(v * 100) / 100;
const trace = (pts) => 'M' + pts.map(([x, y]) => n2(x) + ' ' + n2(y)).join('L') + 'Z';
const RAYON = 22.5;
const LOIN = 300;

/** Intersection de deux polygones convexes (Sutherland-Hodgman). */
function intersection(sujet, coupe) {
  const aire = coupe.reduce((s, p, i) => { const q = coupe[(i + 1) % coupe.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);
  const signe = Math.sign(aire);
  const dedans = (p, a, b) => signe * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) >= 0;
  const croise = (p, q, a, b) => {
    const [x1, y1] = p, [x2, y2] = q, [x3, y3] = a, [x4, y4] = b;
    const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
    return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
  };
  let sortie = sujet;
  for (let i = 0; i < coupe.length && sortie.length; i++) {
    const a = coupe[i], b = coupe[(i + 1) % coupe.length], entree = sortie;
    sortie = [];
    entree.forEach((q, j) => {
      const p = entree[(j + entree.length - 1) % entree.length];
      if (dedans(q, a, b)) { if (!dedans(p, a, b)) sortie.push(croise(p, q, a, b)); sortie.push(q); }
      else if (dedans(p, a, b)) sortie.push(croise(p, q, a, b));
    });
  }
  return sortie;
}
const inter = (...polys) => polys.reduce((acc, p) => intersection(acc, p));

/* ------------------------------------------------------------------ */
/* Les couleurs : le spectre partagé. Chaque plugin a sa tranche ; Toolkit
 * reprend une couleur de chacune. Le jaune-vert et le vert restent libres. */

const OS = '#f1e6d0';
const COULEURS = {
  toolkit: { fond: '#1a1030', b: ['#ff6f5e', '#3fc4e0', '#c04ad8'], x: ['#ffd0b8', '#ff7ab8', '#a8b4ff'] },
  exporter: { fond: '#0d1b45', b: ['#2a62b8', '#2f9fc4', '#1f7fa8'], x: ['#8fd8f0', '#6f9ff0', '#7fe8dc'], foyer: '#fffaf0' },
  // Les secteurs de Palettes couvrent tout le carré : son fond n'est jamais peint.
  palettes: { fond: null, b: [OS, '#ffc24f', '#ff6f5e', '#c2457e'], x: ['#fff2c4', '#ffa24a', '#ff8fa0'] },
  explorer: { fond: '#240a30', b: ['#8a3fd8', '#e0459e'], pli: '#ffc4e6', coeur: '#0c0410' },
};

/* ------------------------------------------------------------------ */
/* Les formes : une liste de [polygone ou cercle, couleur], peinte dans l'ordre. */

/** Trois faisceaux droits qui se croisent en triangle. */
function toolkit(k) {
  const c = [50, 54], d = 16, w = 15;
  const b = [-83, 37, 157].map((a) => {
    const n = [Math.cos(deg(a)), Math.sin(deg(a))], t = [-n[1], n[0]];
    const point = (s, l) => [c[0] + n[0] * s + t[0] * l, c[1] + n[1] * s + t[1] * l];
    return [point(d - w / 2, -LOIN), point(d - w / 2, LOIN), point(d + w / 2, LOIN), point(d + w / 2, -LOIN)];
  });
  return [
    [b[0], k.b[0]], [b[1], k.b[1]], [b[2], k.b[2]],
    [inter(b[0], b[1]), k.x[0]], [inter(b[0], b[2]), k.x[1]], [inter(b[1], b[2]), k.x[2]],
  ];
}

/** Trois faisceaux en coin qui convergent sur un foyer blanc. */
function exporter(k) {
  const F = [68, 50], demi = 11;
  const c = [-30, 0, 30].map((a) => {
    const A = [F[0] + Math.cos(deg(a)) * 16, F[1] + Math.sin(deg(a)) * 16];
    const bord = (e) => [A[0] - Math.cos(deg(a + e)) * LOIN, A[1] - Math.sin(deg(a + e)) * LOIN];
    return [A, bord(demi), bord(-demi)];
  });
  return [
    [c[0], k.b[0]], [c[1], k.b[1]], [c[2], k.b[2]],
    [inter(c[0], c[1]), k.x[0]], [inter(c[0], c[2]), k.x[1]], [inter(c[1], c[2]), k.x[2]],
    [inter(c[0], c[1], c[2]), k.foyer],
  ];
}

/** La lumière blanche qui se déploie en quatre secteurs depuis le coin bas gauche. */
function palettes(k) {
  const O = [0, 100];
  const s = [[-5, 20], [15, 45], [38, 68], [61, 95]].map(([a0, a1]) => [O, [O[0] + Math.cos(deg(a0)) * LOIN, O[1] - Math.sin(deg(a0)) * LOIN], [O[0] + Math.cos(deg(a1)) * LOIN, O[1] - Math.sin(deg(a1)) * LOIN]]);
  return [
    [s[0], k.b[0]], [s[1], k.b[1]], [s[2], k.b[2]], [s[3], k.b[3]],
    [inter(s[0], s[1]), k.x[0]], [inter(s[1], s[2]), k.x[1]], [inter(s[2], s[3]), k.x[2]],
  ];
}

/**
 * Une spirale épaisse d'un tour et six dixièmes, du bord vers un cœur sombre.
 * Chaque tronçon recouvre un peu le précédent, pour qu'aucune couture ne laisse
 * voir le fond.
 */
function explorer(k) {
  const C = [50, 51], R0 = 47, pas = 22, w = 15, fin = 1.6 * TAU;
  const troncon = (f0, f1) => {
    const phis = Array.from({ length: 121 }, (_, i) => (f0 + (f1 - f0) * i / 120) * fin);
    const bord = (s) => phis.map((phi) => { const r = R0 - pas * phi / TAU + s * w / 2; return [C[0] + r * Math.cos(phi), C[1] + r * Math.sin(phi)]; });
    return [...bord(1), ...bord(-1).reverse()];
  };
  return [
    [troncon(0, 0.5), k.b[0]], [troncon(0.497, 0.86), k.b[1]], [troncon(0.857, 1), k.pli],
    [{ cercle: [C[0], C[1], 6] }, k.coeur],
  ];
}

const PRODUITS = [
  { nom: 'ucm-toolkit', titre: 'Toolkit', formes: toolkit, couleurs: COULEURS.toolkit, etiquette: 'Dépôt et CLI', texte: ['Les plugins, le format des contrats, les', 'lecteurs, la CLI et les contrôles du dépôt.'] },
  { nom: 'ucm-contract-exporter', titre: 'Contract Exporter', formes: exporter, couleurs: COULEURS.exporter, etiquette: 'Plugin Figma', texte: ['Analyse les composants Figma', 'et publie leurs contrats.'] },
  { nom: 'ucm-palettes', titre: 'Palettes', formes: palettes, couleurs: COULEURS.palettes, etiquette: 'Plugin Figma', texte: ['Crée les gammes de couleur et les', 'synchronise avec les variables.'] },
  { nom: 'ucm-token-explorer', titre: 'Token Explorer', formes: explorer, couleurs: COULEURS.explorer, etiquette: 'Plugin Figma', texte: ['Suit les alias des variables', 'jusqu’à leur origine.'] },
];

/**
 * Le corps d'un logo dans un repère 0-100, découpé par le rectangle arrondi.
 * Le découpage est un masque et non un clipPath : le masque s'applique au logo
 * déjà peint, alors qu'un clipPath découpe chaque forme séparément et laisse le
 * fond transparaître en liseré sous les formes qui touchent le bord.
 */
function corpsLogo(produit, id) {
  const formes = produit.formes(produit.couleurs).map(([forme, couleur]) => (forme.cercle
    ? '<circle cx="' + forme.cercle[0] + '" cy="' + forme.cercle[1] + '" r="' + forme.cercle[2] + '" fill="' + couleur + '"/>'
    : '<path d="' + trace(forme) + '" fill="' + couleur + '"/>'));
  return '<defs><mask id="' + id + '"><rect width="100" height="100" rx="' + RAYON + '" fill="#fff"/></mask></defs>'
    + '<g mask="url(#' + id + ')">'
    + (produit.couleurs.fond ? '<rect width="100" height="100" fill="' + produit.couleurs.fond + '"/>' : '') + formes.join('') + '</g>';
}

const logo = (produit) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">'
  + '<title>UCM ' + produit.titre + '</title>' + corpsLogo(produit, 'decoupe') + '</svg>\n';

/**
 * Une carte de présentation 640 × 400 : le logo, « UCM », le nom, deux lignes, une étiquette.
 * Le fond est blanc : il tranche avec les fonds sombres des logos et se distingue
 * encore du secteur crème, au coin bas gauche de Palettes.
 */
function carte(produit) {
  const police = 'Inter, \'Segoe UI\', system-ui, sans-serif';
  const largeurEtiquette = Math.round(produit.etiquette.length * 8.2 + 32);
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="640" height="400">'
    + '<title>UCM ' + produit.titre + '</title>'
    + '<rect x="0.5" y="0.5" width="639" height="399" rx="32" fill="#ffffff" stroke="#e6e1ea"/>'
    + '<svg x="48" y="48" width="128" height="128" viewBox="0 0 100 100">' + corpsLogo(produit, 'decoupe-carte') + '</svg>'
    + '<rect x="' + (592 - largeurEtiquette) + '" y="48" width="' + largeurEtiquette + '" height="32" rx="16" fill="#1c162214"/>'
    + '<text x="' + (592 - largeurEtiquette / 2) + '" y="69" text-anchor="middle" font-family="' + police + '" font-size="14" fill="#1c1622">' + produit.etiquette + '</text>'
    + '<text x="48" y="230" font-family="' + police + '" font-size="16" letter-spacing="2" fill="#6b6070">UCM</text>'
    + '<text x="48" y="276" font-family="' + police + '" font-size="40" font-weight="700" fill="#1c1622">' + produit.titre + '</text>'
    + produit.texte.map((ligne, i) => '<text x="48" y="' + (320 + i * 28) + '" font-family="' + police + '" font-size="20" fill="#5d5360">' + ligne + '</text>').join('')
    + '</svg>\n';
}

for (const sous of ['logos', 'cartes']) fs.mkdirSync(path.join(dossier, sous), { recursive: true });
for (const produit of PRODUITS) {
  fs.writeFileSync(path.join(dossier, 'logos', produit.nom + '.svg'), logo(produit));
  fs.writeFileSync(path.join(dossier, 'cartes', produit.nom + '.svg'), carte(produit));
}
console.log('Écrit : ' + PRODUITS.length + ' logos et ' + PRODUITS.length + ' cartes.');
