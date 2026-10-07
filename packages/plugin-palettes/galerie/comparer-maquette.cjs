/**
 * Le contrôle de fidélité de l'aperçu en bandes : l'aperçu de l'onglet
 * Création, ouvert dans la galerie, contre le bloc `#pu-v2` de
 * CHANGEMENTS-DU-MOTEUR.html (section « L'aperçu d'UCM Palettes »).
 *
 *   npm run galerie --workspace ucm-palettes-plugin
 *   node packages/plugin-palettes/galerie/comparer-maquette.cjs
 *
 * Trois cas, avec la même palette, le même thème et le même texte des boutons
 * dans les deux pages : une palette à deux intensités en Light normal, une à
 * une intensité en Dark inversé, le neutre en Light. Le script règle la
 * largeur de la galerie pour que la surface de l'aperçu ait celle de `#pu-v2`
 * (560 px), range les captures côte à côte dans `dist/fidelite/` (ignoré par
 * git), puis compare :
 *
 * - par `getComputedStyle`, sans tolérance : polices, tailles, graisses,
 *   interlignes, encres, fonds des bandes, rayons, `padding`, `margin`, `gap`,
 *   traces des grilles (largeur de la colonne de profil, hauteur des
 *   rayures), boîtes, textes des codes et des noms ;
 * - par `getBoundingClientRect`, à 1 px près, l'alignement de chaque petite
 *   pastille sur la pastille de son cran, dans chaque page.
 *
 * Les couleurs des nuances ne se comparent pas : les palettes diffèrent. Le
 * script imprime chaque écart et sort en erreur s'il en reste un hors de la
 * liste des écarts acceptés ci-dessous, qu'il imprime à part.
 *
 * Aucun cas ne compare un choix de nuance : l'anneau que la nuance choisie
 * garde sous le surlignage n'est pas un écart à accepter ici.
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const racine = path.resolve(__dirname, '..');
const MAQUETTE = path.resolve(racine, '../../docs/notes/Recherches/Archi Tokens Multi-marques/Collection usage/CHANGEMENTS-DU-MOTEUR.html');
const GALERIE = path.join(racine, 'dist', 'galerie', 'clair');
const SORTIE = path.join(racine, 'dist', 'fidelite');

/** La largeur de la surface de `#pu-v2` : la colonne `minmax(0, 560px)` de la maquette. */
const LARGEUR_DE_LA_SURFACE = 560;

/**
 * Les trois cas. `maquette` règle les contrôles de la barre de la maquette
 * (palette, mode, texte des boutons de chaque thème) ; `etat` est l'état de
 * galerie qui montre la même chose dans le plugin.
 */
const CAS = [
  {
    id: 'deux-intensites-light',
    titre: 'Deux intensités, Light normal',
    etat: 'palette-deux-intensites',
    mode: 'light',
    maquette: { palette: 'success', mode: 'light', light: 'blanc', dark: 'noir' },
  },
  {
    id: 'une-intensite-dark-inverse',
    titre: 'Une intensité, Dark inversé',
    etat: 'apercu-une-intensite-dark-inverse',
    mode: 'dark',
    maquette: { palette: 'primary', mode: 'dark', light: 'blanc', dark: 'blanc' },
  },
  {
    id: 'neutre-light',
    titre: 'Le neutre, Light',
    etat: 'apercu-neutre',
    mode: 'light',
    neutre: true,
    maquette: { palette: 'neutral', mode: 'light', light: 'blanc', dark: 'noir' },
  },
];

/**
 * Les éléments du dessin : le nom, le sélecteur dans la maquette (sous
 * `#pu-v2`), puis celui dans le plugin (sous `.nuancier-surface`). `:scope`
 * désigne la racine elle-même.
 */
const ELEMENTS = [
  ['Surface', '.nuancier-surface', ':scope'],
  ['Grille des nuances', '.nuancier-grille', '.nuancier-grille'],
  ['Numéro de nuance', '.nuancier-numero', '.nuancier-numero'],
  ['Nom de profil', '.nuancier-profil', '.nuancier-profil'],
  ['Pastille de la rampe', '.nuancier-grille .pastille:not(.pastille-on-solid)', '.nuancier-grille .pastille:not(.pastille-on-solid)'],
  ['Case tiretée', '.pastille-on-solid', '.pastille-on-solid'],
  ['Bandes', '.bandes', '.bandes'],
  ['Bande', '.bande', '.bande'],
  ['Case du spécimen', '.specimen-case', '.specimen-case'],
  ['Spécimen', '.specimen', '.specimen'],
  ['Rôle du dossier', '.specimen-role', '.specimen-role'],
  ['Rayure', '.rayure', '.rayure'],
  ['Petite pastille', '.rayure i', '.rayure i'],
  ['Libellé', '.accolade-libelle', '.accolade-libelle'],
  ['Code du libellé', '.accolade-libelle .code-du-role', '.accolade-libelle .code-du-role'],
  ['Variable du libellé', '.accolade-libelle [data-token]', '.accolade-libelle [data-token]'],
  ['Nom du libellé', '.accolade-nom', '.accolade-nom'],
  ['Note du neutre', '.hors-rampe', '.hors-rampe'],
  ['Variable de la note', '.hors-rampe [data-token]', '.hors-rampe [data-token]'],
];

/** Ce qui se compare sans tolérance. */
const STYLES = [
  'display', 'fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'whiteSpace', 'overflowWrap',
  'color', 'backgroundColor', 'opacity', 'boxShadow',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderTopStyle', 'borderTopColor',
  'borderTopLeftRadius', 'borderBottomRightRadius', 'columnGap', 'rowGap',
  'alignItems', 'justifyItems', 'alignContent', 'gridTemplateColumns', 'gridTemplateRows',
  'gridColumnStart', 'gridColumnEnd', 'gridRowStart', 'gridRowEnd',
];

/** Les styles d'un élément peint d'une couleur de nuance : les palettes diffèrent, ils ne se comparent pas. */
const STYLES_DE_NUANCE = ['color', 'backgroundColor', 'borderTopColor'];

/**
 * Les écarts acceptés, chacun avec sa raison. Le script les imprime à part et
 * ne sort pas en erreur pour eux.
 */
const ACCEPTES = [
  {
    nom: 'encre claire de la surface en Dark',
    raison: 'le plugin garde #F5F5F5 / rgba(245, 245, 245, 0.72) de `encresSur`, que l’aperçu compact partage ; la maquette dessine #EDEDED / rgba(237, 237, 237, 0.72).',
    accepte: (cas, ecart) => cas.mode === 'dark' && ENCRES_CLAIRES[ecart.plugin] === ecart.maquette,
  },
  {
    nom: 'note du neutre',
    raison: 'dans la surface, en encre seconde de la surface, et non après la surface en `--muted`.',
    accepte: (cas, ecart) => cas.neutre === true
      && ((['Note du neutre', 'Variable de la note'].includes(ecart.element) && ['color', 'borderTopColor'].includes(ecart.propriete))
        // Dans la surface, la note perd les 18 px de sa bordure et de son retrait : elle est plus étroite que la maquette.
        || (ecart.element === 'Note du neutre' && ecart.propriete === 'largeur')
        // La note prend une rangée de la surface : sa trace et sa hauteur suivent.
        || (ecart.element === 'Surface' && ['gridTemplateRows', 'hauteur'].includes(ecart.propriete))),
  },
  {
    nom: 'retour à la ligne des libellés',
    raison: 'le plugin laisse un libellé passer à la ligne quand sa plage est trop étroite (`white-space: normal`, `overflow-wrap: anywhere`) ; la maquette garde `nowrap`. Un libellé collé à l’accolade suivante garde son texte à la même place, mais sa boîte, en `content-box` avec `min-width: calc(100% - 12px)`, dépasse de moins de 12 px la boîte `border-box` de la maquette. Ajouté par l’implémenteur : la liste du lot ne le portait pas.',
    accepte: (cas, ecart) => (['whiteSpace', 'overflowWrap'].includes(ecart.propriete) && /libellé|Code du|Variable du|Nom du/i.test(ecart.element))
      || (ecart.element === 'Libellé' && ecart.propriete === 'largeur' && (parseFloat(ecart.plugin) - parseFloat(ecart.maquette)) > 0 && (parseFloat(ecart.plugin) - parseFloat(ecart.maquette)) < 12),
  },
];
const ENCRES_CLAIRES = {
  'rgb(245, 245, 245)': 'rgb(237, 237, 237)',
  'rgba(245, 245, 245, 0.72)': 'rgba(237, 237, 237, 0.72)',
};

/**
 * Relève, dans la page, les styles et le texte de chaque élément, et les
 * boîtes de l'alignement. `colonne` vaut 1 pour la maquette et 2 pour le
 * plugin ; `origine` est le sélecteur de la racine.
 */
function relever({ elements, styles, stylesDeNuance, origine, colonne }) {
  const racineDeLaPage = document.querySelector(origine);
  if (!racineDeLaPage) return null;
  const trouver = (selecteur) => (selecteur === ':scope' ? [racineDeLaPage] : [...racineDeLaPage.querySelectorAll(selecteur)]);
  const mesures = elements.map((ligne) => trouver(ligne[colonne]).filter((element) => element.getClientRects().length > 0).map((element) => {
    const calcule = getComputedStyle(element);
    const nuance = element.matches('[data-cran], .specimen');
    // Le texte d'une pastille de la rampe, ◆ ou rien, dépend de la palette : il ne se compare pas.
    const propre = element.matches('.pastille') ? '' : element.matches('.hors-rampe') ? element.textContent.trim() : [...element.childNodes].filter((noeud) => noeud.nodeType === 3).map((noeud) => noeud.textContent).join('').trim();
    // La boîte de bordure, que `box-sizing` ne change pas : la maquette est en border-box, la feuille du plugin non partout.
    const boite = element.getBoundingClientRect();
    return {
      styles: Object.fromEntries(styles.filter((nom) => !(nuance && stylesDeNuance.includes(nom))).map((nom) => [nom, calcule[nom]])),
      largeur: boite.width,
      hauteur: boite.height,
      texte: propre,
    };
  }));
  // L'alignement : chaque petite pastille sur la pastille de son cran, dans sa rangée d'intensité.
  const pastilles = trouver('.nuancier-grille .pastille:not(.pastille-on-solid)');
  const caseTiretee = trouver('.pastille-on-solid')[0];
  const alignements = trouver('.rayure i').map((petite) => {
    const boite = petite.getBoundingClientRect();
    const rangDeLaRayure = Number.parseInt(getComputedStyle(petite).gridRowStart, 10);
    const cran = petite.dataset.cran;
    const cible = cran === undefined
      ? caseTiretee
      : pastilles.find((pastille) => pastille.dataset.cran === cran && Number.parseInt(getComputedStyle(pastille).gridRowStart, 10) === rangDeLaRayure + 1);
    const nom = cran === undefined ? 'solid/foreground' : `${cran}, rangée ${rangDeLaRayure}`;
    if (!cible) return { nom, absent: true };
    const visee = cible.getBoundingClientRect();
    return { nom, gauche: boite.left - visee.left, droite: boite.right - visee.right };
  });
  return { mesures, alignements, largeur: racineDeLaPage.getBoundingClientRect().width };
}

async function sansReseau(page) {
  // La maquette demande ses polices à Google : sans réseau, la requête ne doit pas retenir le chargement.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
}

/** Règle les contrôles de la barre de la maquette. */
async function reglerLaMaquette(page, reglage) {
  for (const [controle, valeur] of [['c-palette', reglage.palette], ['c-mode', reglage.mode], ['c-light', reglage.light], ['c-dark', reglage.dark]]) {
    await page.locator(`#${controle} [data-v="${valeur}"]`).click();
  }
  await page.mouse.move(2, 2);
  await page.waitForTimeout(30);
}

function ecartsDe(cas, maquette, plugin) {
  const ecarts = [];
  ELEMENTS.forEach(([nom], rang) => {
    const attendus = maquette.mesures[rang];
    const obtenus = plugin.mesures[rang];
    if (attendus.length !== obtenus.length) {
      ecarts.push({ element: nom, ou: nom, propriete: 'nombre', maquette: String(attendus.length), plugin: String(obtenus.length) });
      return;
    }
    attendus.forEach((attendu, position) => {
      const obtenu = obtenus[position];
      const ou = attendus.length > 1 ? `${nom} ${position + 1}` : nom;
      for (const style of Object.keys(attendu.styles)) {
        if (attendu.styles[style] !== obtenu.styles[style]) ecarts.push({ element: nom, ou, propriete: style, maquette: attendu.styles[style], plugin: obtenu.styles[style] });
      }
      for (const [cote, valeur] of [['largeur', 'largeur'], ['hauteur', 'hauteur']]) {
        if (Math.abs(attendu[valeur] - obtenu[valeur]) > 1) ecarts.push({ element: nom, ou, propriete: cote, maquette: `${attendu[valeur].toFixed(1)} px`, plugin: `${obtenu[valeur].toFixed(1)} px` });
      }
      if (attendu.texte !== obtenu.texte) ecarts.push({ element: nom, ou, propriete: 'texte', maquette: `« ${attendu.texte} »`, plugin: `« ${obtenu.texte} »` });
    });
  });
  for (const [page, releve] of [['la maquette', maquette], ['le plugin', plugin]]) {
    for (const alignement of releve.alignements) {
      if (alignement.absent) ecarts.push({ element: 'Alignement', ou: `Petite pastille ${alignement.nom}`, propriete: 'pastille de son cran', maquette: '', plugin: '', detail: `introuvable dans ${page}` });
      else if (Math.abs(alignement.gauche) > 1 || Math.abs(alignement.droite) > 1) {
        ecarts.push({ element: 'Alignement', ou: `Petite pastille ${alignement.nom}`, propriete: 'alignement', maquette: '', plugin: '', detail: `dans ${page}, décalage de ${alignement.gauche.toFixed(1)} px à gauche et ${alignement.droite.toFixed(1)} px à droite` });
      }
    }
  }
  return ecarts;
}

const decrire = (ecart) => (ecart.detail
  ? `${ecart.ou} : ${ecart.detail}`
  : `${ecart.ou} : ${ecart.propriete} ${ecart.maquette} dans la maquette, ${ecart.plugin} dans le plugin`);

async function comparer() {
  if (!fs.existsSync(GALERIE)) throw new Error('dist/galerie absent. Lancer npm run galerie --workspace ucm-palettes-plugin.');
  if (!fs.existsSync(MAQUETTE)) throw new Error(`Maquette introuvable : ${MAQUETTE}`);
  const { chromium } = require('playwright');
  fs.rmSync(SORTIE, { recursive: true, force: true });
  fs.mkdirSync(SORTIE, { recursive: true });
  const navigateur = await chromium.launch();
  const rapport = [];
  const acceptes = [];
  let horsListe = 0;
  const entrees = { elements: ELEMENTS, styles: STYLES, stylesDeNuance: STYLES_DE_NUANCE };
  try {
    for (const cas of CAS) {
      const pageMaquette = await navigateur.newPage({ viewport: { width: 1400, height: 1400 } });
      await sansReseau(pageMaquette);
      await pageMaquette.goto(pathToFileURL(MAQUETTE).href, { waitUntil: 'domcontentloaded' });
      await reglerLaMaquette(pageMaquette, cas.maquette);
      await pageMaquette.locator('#pu-v2').screenshot({ path: path.join(SORTIE, `${cas.id}-maquette.png`) });
      const maquette = await pageMaquette.evaluate(relever, { ...entrees, origine: '#pu-v2', colonne: 1 });
      await pageMaquette.close();

      const pagePlugin = await navigateur.newPage({ viewport: { width: 600, height: 1400 } });
      await pagePlugin.goto(pathToFileURL(path.join(GALERIE, `${cas.etat}.html`)).href);
      await pagePlugin.waitForFunction(() => document.documentElement.dataset.galerie === 'pret');
      // La largeur de la galerie se règle jusqu'à ce que la surface ait celle de `#pu-v2`.
      let largeurDeLaFenetre = 600;
      for (let essai = 0; essai < 3; essai += 1) {
        const surface = await pagePlugin.evaluate(() => document.querySelector('.nuancier-surface').getBoundingClientRect().width);
        if (Math.abs(surface - LARGEUR_DE_LA_SURFACE) < 0.01) break;
        largeurDeLaFenetre += LARGEUR_DE_LA_SURFACE - surface;
        await pagePlugin.setViewportSize({ width: Math.round(largeurDeLaFenetre), height: 1400 });
        await pagePlugin.waitForTimeout(60);
      }
      await pagePlugin.mouse.move(2, 2);
      await pagePlugin.waitForTimeout(60);
      await pagePlugin.locator('.nuancier-surface').screenshot({ path: path.join(SORTIE, `${cas.id}-plugin.png`) });
      const plugin = await pagePlugin.evaluate(relever, { ...entrees, origine: '.nuancier-surface', colonne: 2 });
      await pagePlugin.close();

      const ecarts = ecartsDe(cas, maquette, plugin);
      if (Math.abs(plugin.largeur - maquette.largeur) > 0.01) ecarts.push({ element: 'Surface', ou: 'Surface', propriete: 'largeur de la galerie', maquette: String(maquette.largeur), plugin: String(plugin.largeur) });
      const refuses = [];
      for (const ecart of ecarts) {
        const regle = ACCEPTES.find((candidate) => candidate.accepte(cas, ecart));
        if (regle) acceptes.push({ cas, regle, ecart });
        else refuses.push(ecart);
      }
      horsListe += refuses.length;
      rapport.push(`${cas.titre} (${cas.etat}) : surface de ${plugin.largeur} px dans le plugin, ${maquette.largeur} px dans la maquette ; ${plugin.alignements.length} petites pastilles alignées dans le plugin, ${maquette.alignements.length} dans la maquette ; ${refuses.length === 0 ? 'aucun écart' : `${refuses.length} écart${refuses.length > 1 ? 's' : ''}`}`, ...refuses.map((ecart) => `  ${decrire(ecart)}`));
    }
  } finally {
    await navigateur.close();
  }
  rapport.push('', `Écarts acceptés : ${acceptes.length}`);
  for (const regle of ACCEPTES) {
    const lignes = acceptes.filter((entree) => entree.regle === regle);
    rapport.push(`- ${regle.nom} (${lignes.length}) : ${regle.raison}`, ...lignes.map(({ cas, ecart }) => `    ${cas.titre} · ${decrire(ecart)}`));
  }
  const cellules = CAS.map((cas) => `<figure><figcaption>${cas.titre}</figcaption><div><img src="./${cas.id}-maquette.png" alt="Maquette"><img src="./${cas.id}-plugin.png" alt="Plugin"></div></figure>`).join('\n');
  fs.writeFileSync(path.join(SORTIE, 'index.html'), `<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><title>Fidélité de l’aperçu en bandes</title><style>body{margin:0;padding:16px;background:#8f8f8f;color:#fff;font:13px/1.4 system-ui,sans-serif}figure{margin:0 0 24px}figcaption{font-weight:600;margin-bottom:6px}figure div{display:flex;gap:16px;align-items:flex-start}</style></head><body>\n<p>À gauche le bloc #pu-v2 de la maquette ; à droite l’aperçu du plugin.</p>\n${cellules}\n</body></html>\n`);
  rapport.push('', `Total : ${horsListe} écart${horsListe > 1 ? 's' : ''} hors de la liste acceptée, sur ${CAS.length} cas. Captures : ${SORTIE}`);
  fs.writeFileSync(path.join(SORTIE, 'releve.txt'), `${rapport.join('\n')}\n`);
  console.log(rapport.join('\n'));
  if (horsListe > 0) process.exitCode = 1;
}

if (require.main === module) {
  comparer().catch((erreur) => {
    console.error(erreur);
    process.exit(1);
  });
}

module.exports = { CAS, ELEMENTS, ACCEPTES };
