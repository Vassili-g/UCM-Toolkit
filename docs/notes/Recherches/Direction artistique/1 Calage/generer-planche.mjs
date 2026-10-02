/**
 * Écrit les logos de la direction « Calage » et la planche qui les montre.
 *
 * Usage, depuis la racine du dépôt :
 *   node "docs/notes/Recherches/Direction artistique/1 Calage/generer-planche.mjs"
 *
 * Sorties, à côté de ce script : `logos/*.svg` et
 * `PLANCHE-DIRECTION-ARTISTIQUE.html`. La géométrie d'une marque n'est écrite
 * qu'ici : la planche et les fichiers la reçoivent de la même fonction.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dossier = path.dirname(fileURLToPath(import.meta.url));

/** Les encres de la quadrichromie, dans leur approximation sRGB courante, et le papier. */
const ENCRES = {
  cyan: '#009FE3',
  magenta: '#E6007E',
  jaune: '#FFED00',
  noir: '#1D1D1B',
  papier: '#FFFFFF',
};

/**
 * Une plage de réserve. En couleur, un aplat ; en une seule teinte, un contour
 * de 4 unités rentré dans la plage, parce qu'un aplat s'y confondrait avec le
 * trait.
 */
function plage(x, y, cote, reserve, trait) {
  if (reserve !== null) return '<rect x="' + x + '" y="' + y + '" width="' + cote + '" height="' + cote + '" fill="' + reserve + '"/>';
  return '<rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="' + (cote - 4) + '" height="' + (cote - 4) + '" fill="none" stroke="' + trait + '" stroke-width="4"/>';
}

/**
 * Les quatre marques, dans un carré de 128 unités, marge de 12, graisse de 10
 * à 14. Chacune reçoit la couleur du trait et celle de la réserve, `null` pour
 * la version en une seule teinte.
 */
const MARQUES = {
  // La croix de repérage : deux quartiers pleins, deux quartiers évidés.
  croix: (trait) => [
    '<path fill="' + trait + '" d="M12 58h104v12H12zM58 12h12v104H58z"/>',
    '<path fill="' + trait + '" fill-rule="evenodd" d="M64 28a36 36 0 1 0 0 72a36 36 0 1 0 0-72zM70 58V38.7A26 26 0 0 1 89.3 58zM58 70v19.3A26 26 0 0 1 38.7 70z"/>',
  ].join(''),

  // Les traits de coupe : le format fini, et deux traits par angle, détachés de lui.
  coupe: (trait, reserve) => [
    plage(42, 42, 44, reserve, trait),
    '<path fill="' + trait + '" d="',
    'M42 10h10v22H42zM76 10h10v22H76zM42 96h10v22H42zM76 96h10v22H76z',
    'M10 42h22v10H10zM10 76h22v10H10zM96 42h22v10H96zM96 76h22v10H96z',
    '"/>',
  ].join(''),

  // La gamme de contrôle : quatre plages, d'un point de trame fin à l'aplat.
  gamme: (trait, reserve) => [
    plage(12, 12, 46, reserve, trait),
    plage(70, 12, 46, reserve, trait),
    plage(12, 70, 46, reserve, trait),
    '<rect x="70" y="70" width="46" height="46" fill="' + trait + '"/>',
    '<circle cx="35" cy="35" r="7" fill="' + trait + '"/>',
    '<circle cx="93" cy="35" r="13" fill="' + trait + '"/>',
    '<circle cx="35" cy="93" r="19" fill="' + trait + '"/>',
  ].join(''),

  // Le compte-fils : le cadre de la loupe, et la trame grossie que sa fenêtre coupe.
  compteFils: (trait, reserve) => [
    reserve === null ? '' : '<rect x="26" y="26" width="76" height="76" fill="' + reserve + '"/>',
    '<path fill="' + trait + '" fill-rule="evenodd" d="M12 12h104v104H12zM26 26v76h76V26z"/>',
    '<circle cx="64" cy="64" r="17" fill="' + trait + '"/>',
    '<path fill="' + trait + '" d="',
    'M26 26h17A17 17 0 0 1 26 43zM102 26v17A17 17 0 0 1 85 26z',
    'M102 102h-17A17 17 0 0 1 102 85zM26 102v-17A17 17 0 0 1 43 102z',
    '"/>',
  ].join(''),
};

/** Chaque produit : sa marque, l'encre de son fond, son trait et sa réserve. */
const PRODUITS = [
  { id: 'ucm-toolkit', nom: 'UCM Toolkit', suite: 'Toolkit', marque: 'croix', repere: 'Croix de repérage', fond: 'papier', trait: 'noir', reserve: 'papier', sens: 'Le projet : maquette et code calés l’un sur l’autre.' },
  { id: 'ucm-contract-exporter', nom: 'UCM Contract Exporter', suite: 'Contract Exporter', marque: 'coupe', repere: 'Traits de coupe', fond: 'cyan', trait: 'noir', reserve: 'papier', sens: 'Le contrat délimite ce que le composant livre.' },
  { id: 'ucm-palettes', nom: 'UCM Palettes', suite: 'Palettes', marque: 'gamme', repere: 'Gamme de contrôle', fond: 'magenta', trait: 'noir', reserve: 'papier', sens: 'Des plages mesurées, du plus clair à l’aplat.' },
  { id: 'ucm-token-explorer', nom: 'UCM Token Explorer', suite: 'Token Explorer', marque: 'compteFils', repere: 'Compte-fils', fond: 'jaune', trait: 'noir', reserve: 'papier', sens: 'La loupe de l’imprimeur : regarder de près, sans toucher.' },
  { id: 'ucm-kit', nom: '@ucm-kit', suite: 'Kit', marque: 'croix', repere: 'Croix de repérage, en négatif', fond: 'noir', trait: 'papier', reserve: 'noir', sens: 'Les paquets publiés : la même croix, côté code.' },
];

const parId = (id) => PRODUITS.find((produit) => produit.id === id);

/** Le contenu d'une tuile en couleur : le fond, puis la marque. */
function dessin(produit) {
  return '<rect width="128" height="128" fill="' + ENCRES[produit.fond] + '"/>'
    + MARQUES[produit.marque](ENCRES[produit.trait], ENCRES[produit.reserve]);
}

function tuile(produit, taille) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + taille + '" height="' + taille + '" viewBox="0 0 128 128" role="img" aria-label="' + produit.nom + '">' + dessin(produit) + '</svg>';
}

/** La marque en une seule teinte, sans fond : elle prend la couleur du texte qui la porte. */
function marqueSeule(produit, taille) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + taille + '" height="' + taille + '" viewBox="0 0 128 128" aria-hidden="true">' + MARQUES[produit.marque]('currentColor', null) + '</svg>';
}

/** Les trois lettres du logotype, dessinées à la graisse des marques : 132 × 44 unités. */
function lettres(couleur) {
  return '<path fill="' + couleur + '" d="M0 0h12v32h12V0h12v44H0zM44 0h36v12H56v20h24v12H44zM88 44V0h12l10 10l10-10h12v44h-12V17l-10 10l-10-10v27z"/>';
}

function logotype(couleur, hauteur) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + (hauteur * 3) + '" height="' + hauteur + '" viewBox="0 0 132 44" role="img" aria-label="UCM">' + lettres(couleur) + '</svg>';
}

/** La couverture d'une page Figma Community, 1920 × 960 : le fond d'encre, le logotype, la marque coupée par le bord. */
function couverture(produit) {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 960" role="img" aria-label="Couverture ' + produit.nom + '">',
    '<rect width="1920" height="960" fill="' + ENCRES[produit.fond] + '"/>',
    '<g transform="translate(1190 -64) scale(8.5)">' + MARQUES[produit.marque](ENCRES[produit.trait], ENCRES[produit.reserve]) + '</g>',
    '<g transform="translate(120 330) scale(3.5)">' + lettres(ENCRES[produit.trait]) + '</g>',
    '<text x="116" y="640" font-family="Archivo, \'Arial Narrow\', sans-serif" font-stretch="62%" font-weight="700" font-size="96" letter-spacing="3" fill="' + ENCRES[produit.trait] + '">' + produit.suite.toUpperCase() + '</text>',
    '<text x="120" y="840" font-family="Archivo, \'Arial Narrow\', sans-serif" font-stretch="62%" font-weight="600" font-size="40" letter-spacing="6" fill="' + ENCRES[produit.trait] + '">' + produit.repere.toUpperCase() + '</text>',
    '</svg>',
  ].join('');
}

// Les fichiers des logos.
fs.mkdirSync(path.join(dossier, 'logos'), { recursive: true });
for (const produit of PRODUITS) {
  fs.writeFileSync(path.join(dossier, 'logos', produit.id + '.svg'), tuile(produit, 128) + '\n');
}
fs.writeFileSync(path.join(dossier, 'logos', 'ucm-logotype.svg'), logotype(ENCRES.noir, 44) + '\n');

// Les morceaux de la planche.
const plugins = PRODUITS.filter((produit) => produit.fond !== 'papier' && produit.fond !== 'noir');

const fiches = PRODUITS.map((produit) => [
  '<figure class="fiche">',
  '<div class="tuile">' + tuile(produit, 128) + '</div>',
  '<figcaption><b>' + produit.nom + '</b><span>' + produit.repere + '</span><p>' + produit.sens + '</p></figcaption>',
  '</figure>',
].join('')).join('');

const tailles = PRODUITS.map((produit) => [
  '<div class="rangee">',
  [128, 64, 32, 24, 16].map((taille) => '<span>' + tuile(produit, taille) + '<i>' + taille + '</i></span>').join(''),
  '</div>',
].join('')).join('');

const grille = Array.from({ length: 33 }, (_, rang) => {
  const position = rang * 4;
  const classe = position === 12 || position === 116 ? 'marge' : 'pas';
  return '<line class="' + classe + '" x1="' + position + '" y1="0" x2="' + position + '" y2="128"/><line class="' + classe + '" x1="0" y1="' + position + '" x2="128" y2="' + position + '"/>';
}).join('');

const constructions = PRODUITS.slice(0, 4).map((produit) => [
  '<svg class="construction" viewBox="0 0 128 128" width="232" height="232">',
  dessin(produit),
  grille,
  '</svg>',
].join('')).join('');

const nuancier = Object.entries(ENCRES).map(([nom, valeur]) => [
  '<div class="encre"><span style="background:' + valeur + '"></span><b>' + nom + '</b><code>' + valeur + '</code></div>',
].join('')).join('');

const signatures = PRODUITS.map((produit) => [
  '<div class="signature">',
  tuile(produit, 44),
  logotype(ENCRES.noir, 20),
  '<span>' + produit.suite + '</span>',
  '</div>',
].join('')).join('');

const liste = plugins.map((produit) => '<li>' + tuile(produit, 20) + produit.nom + '</li>').join('');


const explorateur = parId('ucm-token-explorer');
const toolkit = parId('ucm-toolkit');

const REFUS = [
  ['Dégradé, lueur, verre dépoli', 'Aplat d’encre, sans transition'],
  ['Violet, indigo, bleu vers violet', 'Cyan, magenta, jaune, noir'],
  ['Fond crème, terre cuite, sérif éditoriale', 'Blanc papier et noir d’imprimerie'],
  ['Tuile aux angles arrondis, ombre portée', 'Carré à angles vifs, à fond perdu'],
  ['Icône au trait fin de 1,5 px', 'Graisse de 10 à 14 unités sur 128'],
  ['Étincelle, hexagone, cube, nœuds reliés', 'Quatre outils d’imprimeur'],
  ['Ronds translucides qui se recouvrent', 'Trois niveaux opaques : fond, trait, réserve'],
  ['Logotype composé en Inter ou en Space Grotesk', 'Trois lettres dessinées sur la grille des marques'],
].map(([refus, regle]) => '<tr><td>' + refus + '</td><td>' + regle + '</td></tr>').join('');

const page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Direction artistique UCM : Calage</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&display=swap">
<style>
  :root { --noir: ${ENCRES.noir}; --feuille: #E4E5E7; --filet: 2px solid var(--noir); }
  * { box-sizing: border-box; margin: 0; }
  body { background: var(--feuille); color: var(--noir); font: 400 15px/1.45 Archivo, Arial, sans-serif; padding: 48px 32px 96px; }
  main { max-width: 1180px; margin: 0 auto; }
  svg { display: block; }
  header { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 32px; padding-bottom: 28px; }
  header p { max-width: 62ch; margin-top: 20px; }
  h1 { font: 800 76px/0.9 Archivo, 'Arial Narrow', sans-serif; font-stretch: 62%; text-transform: uppercase; letter-spacing: 0.01em; margin-top: 28px; }
  .bande { display: flex; height: 20px; }
  .bande span { flex: 1; }
  section { border-top: var(--filet); padding: 20px 0 56px; display: grid; grid-template-columns: 200px 1fr; gap: 24px; }
  h2 { font: 700 15px/1.2 Archivo, 'Arial Narrow', sans-serif; font-stretch: 62%; text-transform: uppercase; letter-spacing: 0.12em; }
  h2 small { display: block; font-weight: 400; letter-spacing: 0.04em; text-transform: none; font-size: 14px; margin-top: 8px; font-stretch: 100%; }
  .fiches { display: grid; grid-template-columns: repeat(5, 1fr); gap: 24px; }
  .fiche .tuile { outline: 1px solid rgba(0, 0, 0, 0.18); width: 128px; }
  .fiche b { display: block; margin-top: 14px; font-weight: 700; }
  .fiche span { font-stretch: 62%; text-transform: uppercase; letter-spacing: 0.1em; font-size: 12px; }
  .fiche p { font-size: 13px; margin-top: 6px; }
  .fonds { display: grid; grid-template-columns: 1fr 1fr; }
  .fonds > div { padding: 24px; display: grid; gap: 16px; }
  .sombre { background: #2C2C2C; color: #B3B3B3; }
  .clair { background: #FFFFFF; }
  .rangee { display: flex; align-items: flex-end; gap: 18px; }
  .rangee span { display: grid; gap: 6px; justify-items: start; }
  .rangee i { font: 400 10px/1 Archivo, sans-serif; font-style: normal; opacity: 0.7; }
  .clair svg { outline: 1px solid rgba(0, 0, 0, 0.12); }
  .constructions { display: flex; flex-wrap: wrap; gap: 24px; }
  .construction .pas { stroke: rgba(0, 0, 0, 0.16); stroke-width: 0.25; }
  .construction .marge { stroke: #FF2D2D; stroke-width: 0.5; }
  .encres { display: flex; flex-wrap: wrap; gap: 0; }
  .encre { width: 150px; }
  .encre span { display: block; height: 96px; outline: 1px solid rgba(0, 0, 0, 0.18); outline-offset: -1px; }
  .encre b { display: block; margin-top: 10px; font-stretch: 62%; text-transform: uppercase; letter-spacing: 0.12em; }
  code { font: 400 12px/1.4 ui-monospace, Consolas, monospace; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 40px; }
  .signature { display: flex; align-items: center; gap: 14px; background: #FFFFFF; padding: 16px; }
  .signature span { font: 700 25px/1 Archivo, 'Arial Narrow', sans-serif; font-stretch: 62%; text-transform: uppercase; letter-spacing: 0.04em; padding-top: 2px; }
  .couvertures { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .contextes { display: grid; grid-template-columns: 300px 1fr; gap: 24px; align-items: start; }
  .figma { background: #2C2C2C; color: #FFFFFF; font: 400 11px/16px Inter, system-ui, sans-serif; border: 1px solid #444444; }
  .figma h3 { font: 600 11px/16px Inter, system-ui, sans-serif; padding: 12px 16px; border-bottom: 1px solid #444444; display: flex; align-items: center; gap: 8px; }
  .figma ul { list-style: none; padding: 8px 0; }
  .figma li { display: flex; align-items: center; gap: 10px; padding: 6px 16px; }
  .figma li:first-child { background: #383838; }
  .onglets { display: flex; gap: 16px; padding: 8px 16px; border-bottom: 1px solid #444444; color: #B3B3B3; }
  .onglets b { color: #FFFFFF; font-weight: 600; }
  .vide { display: grid; justify-items: center; gap: 12px; padding: 44px 16px 48px; color: #B3B3B3; text-align: center; }
  .vide strong { color: #FFFFFF; font-weight: 600; }
  .attente { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-top: 1px solid #444444; color: #B3B3B3; }
  .attente svg { animation: quart 1.6s steps(4) infinite; }
  @keyframes quart { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .attente svg { animation: none; } }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: 9px 16px 9px 0; border-bottom: 1px solid rgba(0, 0, 0, 0.25); vertical-align: top; }
  th { font-stretch: 62%; text-transform: uppercase; letter-spacing: 0.12em; font-size: 12px; }
  td:first-child { text-decoration: line-through; text-decoration-thickness: 1px; }
  @media (max-width: 900px) {
    section, .contextes, .fonds, .couvertures, .signatures { grid-template-columns: 1fr; }
    .fiches { grid-template-columns: repeat(2, 1fr); }
    h1 { font-size: 52px; }
  }
</style>
</head>
<body>
<main>
  <div class="bande"><span style="background:${ENCRES.cyan}"></span><span style="background:${ENCRES.magenta}"></span><span style="background:${ENCRES.jaune}"></span><span style="background:${ENCRES.noir}"></span><span style="background:${ENCRES.papier}"></span></div>
  <header>
    <div>
      <h1>Calage</h1>
      <p>Proposition de direction artistique pour les produits UCM. Un imprimeur cale ses encres l’une sur l’autre et contrôle le tirage contre l’épreuve signée. UCM cale le code sur la maquette et le contrôle contre le contrat. Chaque produit prend pour marque un outil de ce contrôle, et pour fond une encre.</p>
    </div>
    ${logotype(ENCRES.noir, 64)}
  </header>

  <section>
    <h2>Les marques<small>Une par produit, sur un fond d’encre.</small></h2>
    <div class="fiches">${fiches}</div>
  </section>

  <section>
    <h2>Les tailles<small>De 128 px, l’icône d’un plugin, à 16 px. Sur le fond sombre de Figma, puis sur blanc.</small></h2>
    <div class="fonds"><div class="sombre">${tailles}</div><div class="clair">${tailles}</div></div>
  </section>

  <section>
    <h2>La construction<small>Carré de 128 unités, pas de 4, marge de 12 en rouge. Droites, diagonales à 45° et arcs de cercle.</small></h2>
    <div class="constructions">${constructions}</div>
  </section>

  <section>
    <h2>Les encres<small>Quatre encres et le papier. Aucune n’entre dans l’interface d’un plugin.</small></h2>
    <div class="encres">${nuancier}</div>
  </section>

  <section>
    <h2>Les signatures<small>La tuile, les trois lettres dessinées, puis le nom en Archivo étroit.</small></h2>
    <div class="signatures">${signatures}</div>
  </section>

  <section>
    <h2>Les couvertures<small>Figma Community, 1920 × 960. La marque sort du cadre.</small></h2>
    <div class="couvertures">${plugins.map(couverture).join('')}${couverture(toolkit)}</div>
  </section>

  <section>
    <h2>Dans Figma<small>La liste des plugins, puis les trois touches admises dans une fenêtre : la tuile de l’en-tête, l’état vide, l’attente.</small></h2>
    <div class="contextes">
      <div class="figma"><h3>Plugins</h3><ul>${liste}</ul></div>
      <div class="figma">
        <h3>${tuile(explorateur, 16)}UCM Token Explorer</h3>
        <div class="onglets"><b>Variables</b><span>Composant</span><span>Diagnostics</span></div>
        <div class="vide">${marqueSeule(explorateur, 56)}<strong>Aucune variable dans ce fichier</strong><span>Ouvrez un fichier qui porte des collections, ou activez une bibliothèque.</span></div>
        <div class="attente">${marqueSeule(toolkit, 16)}<span>Lecture des collections…</span></div>
      </div>
    </div>
  </section>

  <section>
    <h2>Les refus<small>Les traits qui signent une image produite par un modèle, et la règle qui les remplace.</small></h2>
    <table><thead><tr><th>Refusé</th><th>Règle</th></tr></thead><tbody>${REFUS}</tbody></table>
  </section>
</main>
</body>
</html>
`;

fs.writeFileSync(path.join(dossier, 'PLANCHE-DIRECTION-ARTISTIQUE.html'), page);
process.stdout.write('Écrit : ' + PRODUITS.length + ' logos, le logotype et la planche.\n');
