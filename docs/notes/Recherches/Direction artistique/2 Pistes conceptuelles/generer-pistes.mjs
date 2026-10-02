/**
 * Écrit la planche des quatre pistes conceptuelles.
 *
 * Usage, depuis la racine du dépôt :
 *   node "docs/notes/Recherches/Direction artistique/2 Pistes conceptuelles/generer-pistes.mjs"
 *
 * Sortie, à côté de ce script : `PLANCHE-PISTES.html`. Chaque marque tient dans
 * un carré de 128 unités et n'est écrite qu'ici.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dossier = path.dirname(fileURLToPath(import.meta.url));
const n = (valeur) => Math.round(valeur * 100) / 100;

const fond = (couleur) => '<rect width="128" height="128" fill="' + couleur + '"/>';
const rond = (cx, cy, r, couleur) => '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r) + '" fill="' + couleur + '"/>';
const rect = (x, y, l, h, couleur) => '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(l) + '" height="' + n(h) + '" fill="' + couleur + '"/>';
const trait = (x1, y1, x2, y2, graisse, couleur) => '<line x1="' + n(x1) + '" y1="' + n(y1) + '" x2="' + n(x2) + '" y2="' + n(y2) + '" stroke="' + couleur + '" stroke-width="' + graisse + '"/>';
const polygone = (points, couleur) => '<polygon points="' + points + '" fill="' + couleur + '"/>';

// Piste 1, Capitule : un disque de points, et une loi d'ordre par produit.
const ROSE = '#FF80C0';
const SUIE = '#232323';

/** Les points d'un réseau gardés dans un disque de 50 unités autour du centre. */
function reseau(pas, pasVertical, decalage, rayon) {
  const points = [];
  for (let rang = -6; rang <= 6; rang += 1) {
    for (let colonne = -6; colonne <= 6; colonne += 1) {
      const x = 64 + colonne * pas + (Math.abs(rang) % 2 === 1 ? decalage : 0) + (decalage === 0 ? pas / 2 : 0);
      const y = 64 + rang * pasVertical + (decalage === 0 ? pas / 2 : 0);
      if (Math.hypot(x - 64, y - 64) <= 50) points.push(rond(x, y, rayon(x, y), ROSE));
    }
  }
  return points.join('');
}

const CAPITULE = {
  // La spirale d'un cœur de tournesol : chaque point tourne de 137,5° et s'éloigne.
  toolkit: () => fond(SUIE) + Array.from({ length: 55 }, (_, rang) => {
    const distance = 7 * Math.sqrt(rang + 1);
    const angle = (rang + 1) * 137.508 * Math.PI / 180;
    return rond(64 + distance * Math.cos(angle), 64 + distance * Math.sin(angle), 1.2 + 2 * distance / 52, ROSE);
  }).join(''),
  // Des rangs en quinconce, du plus gros au plus fin : les unités rangées pour sortir.
  exporter: () => fond(SUIE) + reseau(13, 11.26, 6.5, (x) => 1.5 + 3.5 * (114 - x) / 100),
  // Des couronnes dont le point grossit d'un cran à chaque rang.
  palettes: () => fond(SUIE) + rond(64, 64, 1.6, ROSE) + [6, 12, 18, 24].map((nombre, rang) => Array.from({ length: nombre }, (_, tour) => {
    const angle = tour * 2 * Math.PI / nombre;
    const distance = (rang + 1) * 11.5;
    return rond(64 + distance * Math.cos(angle), 64 + distance * Math.sin(angle), 2.4 + rang * 0.8, ROSE);
  }).join('')).join(''),
  // Douze chaînes qui partent d'une valeur et s'amenuisent.
  explorer: () => fond(SUIE) + rond(64, 64, 9, ROSE) + Array.from({ length: 12 }, (_, rayon) => [18, 28, 38, 48].map((distance, rang) => {
    const angle = rayon * Math.PI / 6;
    return rond(64 + distance * Math.cos(angle), 64 + distance * Math.sin(angle), 3.6 - rang * 0.6, ROSE);
  }).join('')).join(''),
  // Un quadrillage : les mêmes unités, rangées comme du code.
  kit: () => fond(SUIE) + reseau(12, 12, 0, () => 3.4),
};

// Piste 2, Mise en carte : huit fils par huit, une armure par produit.
const GARANCE = '#E0301E';
const BLANC = '#FFFFFF';

function carte(couleurDuFond, couleurDuPris, pris) {
  const cases = [];
  for (let colonne = 0; colonne < 8; colonne += 1) {
    for (let rang = 0; rang < 8; rang += 1) {
      if (pris(colonne, rang)) cases.push(rect(colonne * 16, rang * 16, 16, 16, couleurDuPris));
    }
  }
  return fond(couleurDuFond) + cases.join('');
}

const miroir = (rang) => (rang < 4 ? 3 - rang : rang - 4);

const MISE_EN_CARTE = {
  // Sergé de deux lie deux : la diagonale régulière.
  toolkit: () => carte(GARANCE, BLANC, (colonne, rang) => (colonne + rang) % 4 < 2),
  // Chevron : la diagonale se retourne au milieu et pointe.
  exporter: () => carte(GARANCE, BLANC, (colonne, rang) => (colonne + (rang < 4 ? rang : 7 - rang)) % 4 < 2),
  // Satin ombré : chaque colonne prend un fil de plus que la précédente.
  palettes: () => carte(GARANCE, BLANC, (colonne, rang) => (rang * 3 + colonne * 5) % 8 < colonne + 1),
  // Œil-de-perdrix : des losanges emboîtés autour d'un centre.
  explorer: () => carte(GARANCE, BLANC, (colonne, rang) => (miroir(colonne) + miroir(rang)) % 4 < 2),
  // Toile : un fil dessus, un fil dessous, en couleurs inversées.
  kit: () => carte(BLANC, GARANCE, (colonne, rang) => (colonne + rang) % 2 === 0),
};

// Piste 3, Pavillons : un champ, une partition par produit.
const BLEU = '#0A3FB5';
const ROUGE = '#E3122B';
const OR = '#FFC400';
const NOIR = '#161616';

const PAVILLONS = {
  // Écartelé : un quartier à la couleur de chaque produit.
  toolkit: () => fond(ROUGE) + rect(64, 0, 64, 64, OR) + rect(0, 64, 64, 64, BLEU) + rect(64, 64, 64, 64, NOIR),
  // Tranché : la maquette d'un côté, le code de l'autre.
  exporter: () => fond(ROUGE) + polygone('128,0 128,128 0,128', BLANC),
  // Fascé : quatre bandes, chacune plus large que la précédente.
  palettes: () => fond(OR) + rect(0, 12, 128, 4, NOIR) + rect(0, 30, 128, 10, NOIR) + rect(0, 54, 128, 18, NOIR) + rect(0, 86, 128, 30, NOIR),
  // En abîme : un champ dans un champ dans un champ.
  explorer: () => fond(BLEU) + rect(24, 24, 80, 80, BLANC) + rect(48, 48, 32, 32, BLEU),
  // Chevron couché : le sens de la lecture.
  kit: () => fond(NOIR) + polygone('28,16 52,16 100,64 52,112 28,112 76,64', BLANC),
};

// Piste 4, Graduation : des traits, et une échelle par produit.
const ORANGE = '#FF4F00';

const GRADUATION = {
  // Le cadran : vingt-quatre traits, un long tous les six.
  toolkit: () => fond(BLANC) + Array.from({ length: 24 }, (_, rang) => {
    const angle = rang * Math.PI / 12 - Math.PI / 2;
    const depart = rang % 6 === 0 ? 26 : 38;
    return trait(64 + depart * Math.cos(angle), 64 + depart * Math.sin(angle), 64 + 52 * Math.cos(angle), 64 + 52 * Math.sin(angle), 5, rang === 0 ? ORANGE : NOIR);
  }).join(''),
  // La règle : neuf traits de trois longueurs.
  exporter: () => fond(BLANC) + Array.from({ length: 9 }, (_, rang) => {
    const hauteur = rang % 4 === 0 ? 92 : rang % 2 === 0 ? 60 : 40;
    return rect(13 + rang * 12, 116 - hauteur, 6, hauteur, rang === 4 ? ORANGE : NOIR);
  }).join(''),
  // L'échelle de graisse : sept traits, de 2 à 14 unités.
  palettes: () => fond(BLANC) + Array.from({ length: 7 }, (_, rang) => rect(12 + rang * 8 + rang * (rang + 1), 12, 2 + rang * 2, 104, rang === 4 ? ORANGE : NOIR)).join(''),
  // Le vernier : deux échelles de pas différents, et le seul trait où elles coïncident.
  explorer: () => fond(BLANC)
    + Array.from({ length: 9 }, (_, rang) => rect(14 + rang * 12, 12, 5, 46, rang === 3 ? ORANGE : NOIR)).join('')
    + Array.from({ length: 10 }, (_, rang) => rect(20 + rang * 10, 70, 5, 46, rang === 3 ? ORANGE : NOIR)).join(''),
  // Le rapporteur : onze traits sur un quart de cercle, en négatif.
  kit: () => fond(NOIR) + Array.from({ length: 11 }, (_, rang) => {
    const angle = -rang * 9 * Math.PI / 180;
    const depart = rang % 5 === 0 ? 44 : 64;
    return trait(14 + depart * Math.cos(angle), 114 + depart * Math.sin(angle), 14 + 100 * Math.cos(angle), 114 + 100 * Math.sin(angle), 5, rang === 5 ? ORANGE : BLANC);
  }).join(''),
};

const PRODUITS = [
  ['toolkit', 'UCM Toolkit'],
  ['exporter', 'UCM Contract Exporter'],
  ['palettes', 'UCM Palettes'],
  ['explorer', 'UCM Token Explorer'],
  ['kit', '@ucm-kit'],
];

const PISTES = [
  {
    nom: 'Capitule',
    primitive: 'Le point',
    idee: 'La piste du mainteneur, sortie de la mécanique. Un cœur de tournesol range des centaines de fleurons selon une seule loi d’angle. Chaque produit garde le disque et change la loi qui ordonne ses points.',
    marques: CAPITULE,
    signes: ['Spirale', 'Rangs', 'Couronnes', 'Chaînes', 'Quadrillage'],
    force: 'Reprend l’idée d’origine : beaucoup d’unités, un ordre, un tout. Une seule couleur.',
    limite: 'À 16 px, les cinq disques se confondent. La spirale de points est aussi un motif courant de l’art génératif.',
  },
  {
    nom: 'Mise en carte',
    primitive: 'La case',
    idee: 'Avant de tisser, le dessinateur reporte son motif sur un papier quadrillé : une case par croisement de fils. Le métier Jacquard lit ensuite ce report sur des cartons perforés. C’est une maquette traduite en instructions, deux siècles avant Figma. Chaque produit est une armure, la règle qui ordonne les fils.',
    marques: MISE_EN_CARTE,
    signes: ['Sergé', 'Chevron', 'Satin ombré', 'Œil-de-perdrix', 'Toile'],
    force: 'Le sujet d’UCM, mot pour mot : un dessin, une grille, une règle, une machine. La tuile est pleine, sans marge, et chaque case tombe sur deux pixels à 16 px.',
    limite: 'Une armure se lit comme une texture avant de se lire comme un signe. Le rapprochement avec un code QR ou un damier de transparence est possible.',
  },
  {
    nom: 'Pavillons',
    primitive: 'Le champ',
    idee: 'Le code des signaux maritimes et le blason partagent une grammaire : un champ carré, divisé selon une partition nommée, en couleurs franches. Chaque produit est une partition, et UCM Toolkit réunit les couleurs des quatre autres.',
    marques: PAVILLONS,
    signes: ['Écartelé', 'Tranché', 'Fascé', 'En abîme', 'Chevron'],
    force: 'La plus lisible à 16 px. Une partition se nomme et se décrit en un mot. Le vocabulaire héraldique donne des dizaines de partitions pour les produits à venir.',
    limite: 'Le lien avec le sujet est le plus lâche des quatre : la piste dit un ordre et une famille, peu le contrat. Quatre couleurs vives dans la liste des plugins.',
  },
  {
    nom: 'Graduation',
    primitive: 'Le trait',
    idee: 'UCM mesure : un contraste contre un seuil, un code contre un contrat. Une échelle est une suite d’unités ordonnées dont une seule sert de repère. Chaque produit est une échelle, et l’orange marque la lecture.',
    marques: GRADUATION,
    signes: ['Cadran', 'Règle', 'Échelle de graisse', 'Vernier', 'Rapporteur'],
    force: 'Noir, blanc et un seul accent. Le rythme des traits tient à 32 px, et le vernier dit précisément ce que fait l’explorateur.',
    limite: 'Reste un vocabulaire d’instrument, proche de la mécanique que le mainteneur veut éviter. À 16 px, les traits fins se perdent.',
  },
];

function tuile(piste, cle, taille) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + taille + '" height="' + taille + '" viewBox="0 0 128 128" shape-rendering="geometricPrecision">' + piste.marques[cle]() + '</svg>';
}

const sections = PISTES.map((piste, rang) => {
  const fiches = PRODUITS.map(([cle, nom], index) => '<figure>' + tuile(piste, cle, 128) + '<figcaption><b>' + nom + '</b><span>' + piste.signes[index] + '</span></figcaption></figure>').join('');
  const liste = PRODUITS.map(([cle, nom]) => '<li>' + tuile(piste, cle, 16) + nom + '</li>').join('');
  const moyennes = PRODUITS.map(([cle]) => tuile(piste, cle, 32)).join('');
  return [
    '<section>',
    '<div class="tete"><p class="rang">Piste ' + (rang + 1) + ' · ' + piste.primitive + '</p><h2>' + piste.nom + '</h2><p>' + piste.idee + '</p></div>',
    '<div class="fiches">' + fiches + '</div>',
    '<div class="bas">',
    '<div class="figma"><h3>Plugins</h3><ul>' + liste + '</ul></div>',
    '<div class="moyennes"><p class="rang">32 px</p><div>' + moyennes + '</div></div>',
    '<dl><dt>Force</dt><dd>' + piste.force + '</dd><dt>Limite</dt><dd>' + piste.limite + '</dd></dl>',
    '</div>',
    '</section>',
  ].join('');
}).join('');

const page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Direction artistique UCM : quatre pistes</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { background: #D9DADC; color: #161616; font: 400 14px/1.5 'Helvetica Neue', Arial, sans-serif; padding: 40px 32px 80px; }
  main { max-width: 1120px; margin: 0 auto; }
  svg { display: block; }
  h1 { font-size: 34px; line-height: 1.1; font-weight: 700; letter-spacing: -0.01em; }
  header p { max-width: 70ch; margin-top: 12px; }
  section { border-top: 3px solid #161616; margin-top: 48px; padding-top: 16px; }
  .tete { display: grid; grid-template-columns: 220px 1fr; column-gap: 32px; align-items: start; }
  .tete .rang { grid-column: 1; }
  .tete h2 { grid-column: 1; font-size: 30px; line-height: 1.1; }
  .tete p:last-child { grid-column: 2; grid-row: 1 / span 2; max-width: 72ch; }
  .rang { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 4px; }
  .fiches { display: flex; flex-wrap: wrap; gap: 24px 40px; margin-top: 28px; }
  figcaption { margin-top: 10px; display: grid; }
  figcaption span { font-size: 12px; opacity: 0.7; }
  .bas { display: grid; grid-template-columns: 260px auto 1fr; gap: 32px; margin-top: 28px; align-items: start; }
  .figma { background: #2C2C2C; color: #FFFFFF; font: 400 11px/16px Inter, system-ui, sans-serif; }
  .figma h3 { font: 600 11px/16px Inter, system-ui, sans-serif; padding: 10px 16px; border-bottom: 1px solid #444444; }
  .figma ul { list-style: none; padding: 6px 0; }
  .figma li { display: flex; align-items: center; gap: 10px; padding: 5px 16px; }
  .moyennes { background: #2C2C2C; color: #B3B3B3; padding: 10px 16px 16px; }
  .moyennes div { display: flex; gap: 10px; }
  dt { font-weight: 700; }
  dd { margin-bottom: 10px; max-width: 56ch; }
  @media (max-width: 860px) { .tete, .bas { grid-template-columns: 1fr; } .tete p:last-child { grid-column: 1; grid-row: auto; margin-top: 8px; } }
</style>
</head>
<body>
<main>
  <header>
    <h1>Quatre pistes pour les marques d’UCM</h1>
    <p>Le point de départ est celui du mainteneur : de nombreuses unités, ordonnées, au sein d’un même modèle. Chaque piste prend une forme élémentaire différente, la répète, et donne à chaque produit sa règle d’ordre. Les cinq tuiles d’une piste sont montrées à 128 px, puis à 32 et à 16 px sur le fond sombre de Figma.</p>
  </header>
  ${sections}
</main>
</body>
</html>
`;

fs.writeFileSync(path.join(dossier, 'PLANCHE-PISTES.html'), page);
process.stdout.write('Écrit : la planche de ' + PISTES.length + ' pistes.\n');
