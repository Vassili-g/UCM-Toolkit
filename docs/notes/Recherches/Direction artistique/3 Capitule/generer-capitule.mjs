/**
 * Écrit la planche de la piste Capitule : cinq figures de cercles tangents.
 *
 * Usage, depuis la racine du dépôt :
 *   node "docs/notes/Recherches/Direction artistique/3 Capitule/generer-capitule.mjs"
 *
 * Sortie, à côté de ce script : `PLANCHE-CAPITULE.html` et `logos/*.svg`. Le
 * script calcule chaque figure, puis refuse d'écrire si deux cercles donnés
 * pour tangents ne le sont pas à un centième d'unité près.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dossier = path.dirname(fileURLToPath(import.meta.url));
const n = (valeur) => Math.round(valeur * 1000) / 1000;

/** Le grand cercle commun : centre de la tuile, rayon de 58 unités sur 128. */
const C = 64;
const R = 58;

const cercle = (x, y, r) => ({ x, y, r });
const rond = ({ x, y, r }, couleur) => '<circle cx="' + n(x) + '" cy="' + n(y) + '" r="' + n(r) + '" fill="' + couleur + '"/>';

/** Tourne un cercle autour du centre de la tuile, en degrés. */
function tourne({ x, y, r }, degres) {
  const angle = degres * Math.PI / 180;
  const dx = x - C;
  const dy = y - C;
  return cercle(C + dx * Math.cos(angle) - dy * Math.sin(angle), C + dx * Math.sin(angle) + dy * Math.cos(angle), r);
}

/** Vérifie une tangence, extérieure ou intérieure. */
function exige(a, b, interieure, figure) {
  const distance = Math.hypot(a.x - b.x, a.y - b.y);
  const attendue = interieure ? Math.abs(a.r - b.r) : a.r + b.r;
  if (Math.abs(distance - attendue) > 0.01) throw new Error(figure + ' : tangence manquée de ' + (distance - attendue).toFixed(4));
}

/**
 * La chaîne de Steiner : `nombre` cercles tangents entre eux, au grand cercle
 * et à un cercle intérieur décentré. Elle se calcule sur la couronne
 * concentrique, où tous les maillons sont égaux, puis une homographie du
 * disque décentre le cercle intérieur ; elle envoie un cercle sur un cercle et
 * garde les tangences.
 */
function steiner(nombre, decentrage) {
  const sinus = Math.sin(Math.PI / nombre);
  const interieur = (1 - sinus) / (1 + sinus);
  const image = ({ x, y, r }) => {
    const points = [[x + r, y], [x, y + r], [x - r, y]].map(([px, py]) => {
      const diviseur = (1 + decentrage * px) ** 2 + (decentrage * py) ** 2;
      return [((px + decentrage) * (1 + decentrage * px) + decentrage * py * py) / diviseur, (py * (1 + decentrage * px) - (px + decentrage) * decentrage * py) / diviseur];
    });
    const [[ax, ay], [bx, by], [cx, cy]] = points;
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    return cercle(C + ux * R, C + uy * R, Math.hypot(ax - ux, ay - uy) * R);
  };
  const maillons = Array.from({ length: nombre }, (_, rang) => {
    const angle = (rang + 0.5) * 2 * Math.PI / nombre;
    return image(cercle((1 + interieur) / 2 * Math.cos(angle), (1 + interieur) / 2 * Math.sin(angle), (1 - interieur) / 2));
  });
  return { coeur: image(cercle(0, 0, interieur)), maillons };
}

/**
 * La chaîne de Pappus dans l'arbelos : un cercle de diamètre `part` tangent au
 * grand cercle en un point, puis des cercles de plus en plus petits, tangents
 * à lui, au grand cercle et à leur voisin.
 */
function pappus(part, nombre) {
  const diametre = 2 * R;
  const origine = C - R;
  const maillons = Array.from({ length: nombre }, (_, rang) => {
    const base = rang * rang * (1 - part) ** 2 + part;
    return cercle(origine + diametre * part * (1 + part) / (2 * base), C - diametre * rang * part * (1 - part) / base, diametre * (1 - part) * part / (2 * base));
  });
  return { reference: cercle(origine + diametre * part / 2, C, diametre * part / 2), maillons };
}

const TOUT = cercle(C, C, R);

const FIGURES = {
  // Chaîne de Steiner : des unités de tailles ordonnées, tenues entre le tout et son cœur.
  toolkit: () => {
    const { coeur, maillons } = steiner(9, 0.42);
    maillons.forEach((maillon, rang) => {
      exige(maillon, TOUT, true, 'Steiner');
      exige(maillon, coeur, false, 'Steiner');
      exige(maillon, maillons[(rang + 1) % maillons.length], false, 'Steiner');
    });
    return { unites: maillons.map((maillon) => tourne(maillon, 135)), foyer: tourne(coeur, 135) };
  },
  // Cercles de Descartes : deux cercles tangents, et celui qui touche les deux et le tout.
  exporter: () => {
    const maquette = cercle(C, C - R / 2, R / 2);
    const code = cercle(C, C + R / 2, R / 2);
    const contrat = cercle(C + 2 * R / 3, C, R / 3);
    exige(maquette, code, false, 'Descartes');
    for (const grand of [maquette, code]) exige(contrat, grand, false, 'Descartes');
    exige(contrat, TOUT, true, 'Descartes');
    return { unites: [maquette, code].map((unite) => tourne(unite, -30)), foyer: tourne(contrat, -30) };
  },
  // Chaîne de Pappus : la référence, puis des cercles qui décroissent d'un cran à l'autre.
  palettes: () => {
    const { reference, maillons } = pappus(0.6, 7);
    maillons.forEach((maillon, rang) => {
      exige(maillon, TOUT, true, 'Pappus');
      exige(maillon, reference, false, 'Pappus');
      if (rang > 0) exige(maillon, maillons[rang - 1], false, 'Pappus');
    });
    return { unites: maillons.map((maillon) => tourne(maillon, 150)), foyer: tourne(reference, 150) };
  },
  // Cercles emboîtés, tangents au même point : chaque cercle en contient un autre, jusqu'à la valeur.
  explorer: () => {
    const emboites = [44, 30, 16].map((rayon) => cercle(C - (R - rayon) * Math.SQRT1_2, C + (R - rayon) * Math.SQRT1_2, rayon));
    emboites.forEach((emboite) => exige(emboite, TOUT, true, 'Emboîtés'));
    return { alternes: emboites.slice(0, 2), foyer: emboites[2] };
  },
};

const PRODUITS = [
  ['toolkit', 'ucm-toolkit', 'UCM Toolkit', 'Chaîne de Steiner', 'Des unités de tailles ordonnées, tenues entre le tout et son cœur : le modèle.'],
  ['exporter', 'ucm-contract-exporter', 'UCM Contract Exporter', 'Cercles de Descartes', 'La maquette et le code se touchent. Le contrat est le cercle qui touche les deux, et le tout.'],
  ['palettes', 'ucm-palettes', 'UCM Palettes', 'Chaîne de Pappus', 'La référence, puis une suite de cercles qui décroissent d’un cran à l’autre : une rampe.'],
  ['explorer', 'ucm-token-explorer', 'UCM Token Explorer', 'Cercles emboîtés', 'Un alias en contient un autre, jusqu’à la valeur.'],
  ['kit', 'ucm-kit', '@ucm-kit', 'Chaîne de Steiner, en négatif', 'Le modèle, côté code.'],
];

const TEINTES = {
  rose: { nom: 'Rose', fond: '#1E1E1E', tout: '#FF80C0', unite: '#1E1E1E', foyer: '#FFFFFF' },
  negatif: { nom: 'Négatif', fond: '#FF80C0', tout: '#1E1E1E', unite: '#FF80C0', foyer: '#FFFFFF' },
};

function dessin(cle, teinte) {
  const figure = FIGURES[cle === 'kit' ? 'toolkit' : cle]();
  const pieces = [rond(TOUT, teinte.tout)];
  for (const unite of figure.unites ?? []) pieces.push(rond(unite, teinte.unite));
  (figure.alternes ?? []).forEach((unite, rang) => pieces.push(rond(unite, rang % 2 === 0 ? teinte.unite : teinte.tout)));
  pieces.push(rond(figure.foyer, teinte.foyer));
  return '<rect width="128" height="128" fill="' + teinte.fond + '"/>' + pieces.join('');
}

function tuile(cle, taille) {
  const teinte = cle === 'kit' ? TEINTES.negatif : TEINTES.rose;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + taille + '" height="' + taille + '" viewBox="0 0 128 128">' + dessin(cle, teinte) + '</svg>';
}

fs.mkdirSync(path.join(dossier, 'logos'), { recursive: true });
for (const [cle, fichier] of PRODUITS) fs.writeFileSync(path.join(dossier, 'logos', fichier + '.svg'), tuile(cle, 128) + '\n');

const fiches = PRODUITS.map(([cle, , nom, figure, lecture]) => '<figure>' + tuile(cle, 192) + '<figcaption><b>' + nom + '</b><span>' + figure + '</span><p>' + lecture + '</p></figcaption></figure>').join('');
const liste = PRODUITS.map(([cle, , nom]) => '<li>' + tuile(cle, 16) + nom + '</li>').join('');
const moyennes = [64, 32, 24, 16].map((taille) => '<div>' + PRODUITS.map(([cle]) => tuile(cle, taille)).join('') + '</div>').join('');

const page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Capitule : cercles tangents</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { background: #D9DADC; color: #161616; font: 400 14px/1.5 'Helvetica Neue', Arial, sans-serif; padding: 40px 32px 80px; }
  main { max-width: 1140px; margin: 0 auto; }
  svg { display: block; }
  h1 { font-size: 34px; line-height: 1.1; }
  header p { max-width: 74ch; margin-top: 12px; }
  section { border-top: 3px solid #161616; margin-top: 40px; padding-top: 20px; }
  .fiches { display: flex; flex-wrap: wrap; gap: 28px 45px; }
  figure { width: 192px; }
  figcaption { margin-top: 12px; display: grid; }
  figcaption span { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; }
  figcaption p { font-size: 13px; margin-top: 6px; }
  .bas { display: flex; flex-wrap: wrap; gap: 32px; align-items: flex-start; }
  .figma { background: #2C2C2C; color: #FFFFFF; font: 400 11px/16px Inter, system-ui, sans-serif; width: 260px; }
  .figma h3 { font: 600 11px/16px Inter, system-ui, sans-serif; padding: 10px 16px; border-bottom: 1px solid #444444; }
  .figma ul { list-style: none; padding: 6px 0; }
  .figma li { display: flex; align-items: center; gap: 10px; padding: 5px 16px; }
  .moyennes { background: #2C2C2C; padding: 16px; display: grid; gap: 14px; }
  .moyennes div { display: flex; gap: 14px; align-items: flex-end; }
  .geante { background: #1E1E1E; padding: 0; overflow: hidden; height: 300px; flex: 1; min-width: 320px; }
  .geante svg { width: 620px; height: 620px; margin: -210px 0 0 -40px; }
</style>
</head>
<body>
<main>
  <header>
    <h1>Capitule : cercles tangents</h1>
    <p>Un grand cercle, le même pour tous, contient des cercles qui se touchent sans se recouvrir. Chaque produit prend une figure classique de la géométrie des cercles tangents, choisie pour ce qu’elle montre. Trois tons : le tout en rose, les unités évidées, et en blanc le cercle que le produit livre.</p>
  </header>
  <section><div class="fiches">${fiches}</div></section>
  <section><div class="bas"><div class="figma"><h3>Plugins</h3><ul>${liste}</ul></div><div class="moyennes">${moyennes}</div><div class="geante">${tuile('palettes', 620)}</div></div></section>
</main>
</body>
</html>
`;

fs.writeFileSync(path.join(dossier, 'PLANCHE-CAPITULE.html'), page);
process.stdout.write('Écrit : ' + PRODUITS.length + ' logos et la planche ; tangences vérifiées.\n');
