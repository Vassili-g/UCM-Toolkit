/**
 * Le contrôle de fidélité de la vue composant : la galerie étroite contre la
 * fenêtre du plugin de MAQUETTE-VUE-COMPOSANT.html.
 *
 *   npm run galerie --workspace ucm-explorateur-plugin
 *   node packages/plugin-explorateur/galerie/comparer-maquette.cjs
 *
 * Pour chaque paire, le script joue les mêmes gestes dans les deux pages,
 * range leurs captures côte à côte dans `dist/fidelite/`, puis mesure les
 * éléments du dessin par `getBoundingClientRect` et `getComputedStyle`. Il
 * imprime chaque écart : 1 px de tolérance sur une position et une taille,
 * aucune sur une police, une couleur, un espacement ou un texte.
 *
 * La maquette dessine la barre de titre de Figma dans sa fenêtre de 364 px,
 * et ne dessine pas la barre du plugin. La page de galerie est donc ouverte à
 * la taille de la zone que la maquette laisse au plugin, augmentée de la
 * hauteur de la barre du plugin : la vue a la même taille dans les deux
 * dessins.
 *
 * Borne : l'image de l'aperçu est un dessin de test ; seule sa boîte se
 * compare. Les infobulles ne se comparent pas.
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const racine = path.resolve(__dirname, '..');
const MAQUETTE = path.resolve(racine, '../../docs/notes/Recherches/Plugin Explorateur Tokens/Vue composant/MAQUETTE-VUE-COMPOSANT.html');
const GALERIE = path.join(racine, 'dist', 'galerie-etroite', 'sombre');
const SORTIE = path.join(racine, 'dist', 'fidelite');

const composant = (nom) => ({ clic: `[data-composant="${nom}"]` });

/** Les onze paires : l'état de galerie, les gestes joués dans la maquette, et ceux ajoutés dans la galerie. */
const PAIRES = [
  { id: 'alert', titre: 'Alert ouvert', etat: 'composant-simple', maquette: [composant('Alert')] },
  { id: 'chaine', titre: 'Chaîne dépliée', etat: 'composant-chaine', maquette: [composant('Alert'), { clic: '.ligne[data-cle="{components.alert.sizes.border-radius}"]' }] },
  { id: 'style', titre: 'Style de texte déplié', etat: 'composant-style', maquette: [composant('Alert'), { clic: '.ligne[data-cle="style:Body/Large"]' }] },
  { id: 'stresstest', titre: 'StressTest replié', etat: 'composant-complexe', maquette: [composant('StressTest')] },
  { id: 'section-couleur', titre: 'Section Couleur dépliée', etat: 'composant-section', maquette: [composant('StressTest'), { clic: '[data-section="nature:Couleur"]' }] },
  { id: 'calque', titre: 'Calque UserInput sélectionné', etat: 'composant-portee', maquette: [composant('StressTest'), { clic: '#calques [data-calque="18"]' }] },
  { id: 'imbrique', titre: 'Button ouvert depuis StressTest', etat: 'composant-frontiere', maquette: [composant('StressTest'), { clic: '[data-imbrique="Button"]' }] },
  { id: 'filtre', titre: 'Filtre « radius »', etat: 'composant-filtre', maquette: [composant('StressTest'), { clic: '#chercher' }, { saisie: { dans: '#filtre', valeur: 'radius' } }] },
  { id: 'tag', titre: 'Tag, chaîne interrompue et valeurs sans token', etat: 'composant-interrompu', maquette: [composant('Tag'), { clic: '.ligne[data-cle="texte"]' }, { clic: '#directes' }], galerie: [{ clic: '[data-focus="directes"]' }] },
  { id: 'avatar', titre: 'Avatar sans token', etat: 'composant-sans-token', maquette: [composant('Avatar')] },
  { id: 'vide', titre: 'État vide', etat: 'composant-vide', maquette: [] },
];

/** Les éléments du dessin : le sélecteur de la maquette, puis celui du plugin. */
const ELEMENTS = [
  ['Fil d’Ariane', '.fil', '.vc-fil'],
  ['Miette', '.fil > *', '.vc-fil > *'],
  ['En-tête', '.tete', '.vc-tete'],
  ['Nom', '.tete h2', '.vc-tete h2'],
  ['Glyphe du nom', '.tete h2 span', '.vc-tete h2 span'],
  ['Variant et modes', '.sous', '.vc-sous'],
  ['Variant', '.sous > span:not(.mode)', '.vc-sous > span:not(.vc-mode)'],
  ['Pastille de mode', '.mode', '.vc-mode'],
  ['Bouton d’outil', '.icone', '.vc-icone'],
  ['Aperçu', '.apercu', '.vc-apercu'],
  ['Frontière', '.imbriques button', '.vc-imbriques button'],
  ['Compte de frontière', '.imbriques small', '.vc-imbriques small'],
  ['Filtre', '.filtre input', '.vc-filtre input'],
  ['Titre de section', '.section-tete', '.vc-section-tete'],
  ['Chevron de section', '.section-tete i', '.vc-section-tete i'],
  ['Nom de section', '.section-tete span', '.vc-section-tete span'],
  ['Compte de section', '.section-tete b', '.vc-section-tete b'],
  ['Résumé', '.resume', '.vc-resume'],
  ['Pastille de résumé', '.resume button', '.vc-resume button'],
  ['Texte de résumé', '.resume span', '.vc-resume span'],
  ['Ligne', '.ligne', '.vc-ligne'],
  ['Pastille de ligne', '.ligne .pastille', '.vc-ligne .vc-pastille'],
  ['Nom de ligne', '.nom', '.vc-nom'],
  ['Point', '.points i', '.vc-points i'],
  ['Valeur', '.valeur', '.vc-valeur'],
  ['Compte de calques', '.fois', '.vc-fois'],
  ['Étape de chaîne', '.chaine li', '.vc-chaine li'],
  ['Collection d’étape', '.etape-col', '.vc-etape-col'],
  ['Nom d’étape', '.etape-nom', '.vc-etape-nom'],
  ['Valeur à copier', '.copie', '.vc-copie'],
  ['Cause', '.rompue-texte', '.vc-rompue-texte'],
  ['Libellés et calques', '.sur-calques', '.vc-sur-calques'],
  ['Champ de style', '.champs li', '.vc-champs li'],
  ['Partie de champ', '.champs li > *', '.vc-champs li > *'],
  ['Valeur sans token', '.directes li', '.vc-directes li'],
  ['Partie de valeur sans token', '.directes li > *', '.vc-directes li > *'],
  ['Aucun token', '.aucun', '.vc-aucun'],
  ['État vide', '.vide p', '.vc-vide p'],
  ['Pied', '.pied', '.vc-pied'],
  ['Texte du pied', '.pied > *', '.vc-pied > *'],
];

/** Ce qui se compare sans tolérance. */
const STYLES = ['fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'color', 'backgroundColor', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'borderTopWidth', 'borderLeftWidth', 'borderTopColor', 'borderTopLeftRadius', 'columnGap', 'rowGap'];

/** Relève, dans la page, la boîte, les styles et le texte de chaque élément ; `origine` est le sélecteur du repère. */
function relever({ elements, styles, origine, colonne }) {
  const repere = document.querySelector(origine);
  if (!repere) return null;
  const depart = repere.getBoundingClientRect();
  return elements.map((ligne) => [...repere.parentElement.querySelectorAll(ligne[colonne])].filter((element) => element.getClientRects().length > 0).map((element) => {
    const boite = element.getBoundingClientRect();
    const calcule = getComputedStyle(element);
    const propre = [...element.childNodes].filter((noeud) => noeud.nodeType === 3).map((noeud) => noeud.textContent).join('').trim();
    return {
      boite: [boite.left - depart.left, boite.top - depart.top, boite.width, boite.height],
      styles: Object.fromEntries(styles.map((nom) => [nom, calcule[nom]])),
      texte: element.children.length === 0 ? element.textContent.trim() : propre,
    };
  }));
}

async function jouer(page, gestes) {
  for (const geste of gestes) {
    if (geste.clic) await page.locator(geste.clic).first().click();
    else if (geste.saisie) await page.locator(geste.saisie.dans).fill(geste.saisie.valeur);
    await page.waitForTimeout(30);
  }
  await page.mouse.move(2, 2);
  await page.waitForTimeout(30);
}

function ecartsDe(maquette, galerie) {
  const ecarts = [];
  ELEMENTS.forEach(([nom], rang) => {
    const attendus = maquette[rang];
    const obtenus = galerie[rang];
    if (attendus.length !== obtenus.length) {
      ecarts.push(`${nom} : ${attendus.length} dans la maquette, ${obtenus.length} dans le plugin`);
      return;
    }
    attendus.forEach((attendu, position) => {
      const obtenu = obtenus[position];
      const ou = attendus.length > 1 ? `${nom} ${position + 1}` : nom;
      ['x', 'y', 'largeur', 'hauteur'].forEach((cote, axe) => {
        if (Math.abs(attendu.boite[axe] - obtenu.boite[axe]) > 1) ecarts.push(`${ou} : ${cote} ${attendu.boite[axe].toFixed(1)} dans la maquette, ${obtenu.boite[axe].toFixed(1)} dans le plugin`);
      });
      for (const style of STYLES) {
        if (attendu.styles[style] !== obtenu.styles[style]) ecarts.push(`${ou} : ${style} ${attendu.styles[style]} dans la maquette, ${obtenu.styles[style]} dans le plugin`);
      }
      if (attendu.texte !== obtenu.texte) ecarts.push(`${ou} : texte « ${attendu.texte} » dans la maquette, « ${obtenu.texte} » dans le plugin`);
    });
  });
  return ecarts;
}

async function comparer() {
  if (!fs.existsSync(GALERIE)) throw new Error('dist/galerie-etroite absent. Lancer npm run galerie.');
  const { chromium } = require('playwright');
  fs.rmSync(SORTIE, { recursive: true, force: true });
  fs.mkdirSync(SORTIE, { recursive: true });
  const navigateur = await chromium.launch();
  const rapport = [];
  let total = 0;
  try {
    for (const paire of PAIRES) {
      const pageMaquette = await navigateur.newPage({ viewport: { width: 1400, height: 1100 } });
      await pageMaquette.goto(pathToFileURL(MAQUETTE).href);
      await jouer(pageMaquette, paire.maquette);
      const zone = await pageMaquette.evaluate(() => {
        const corps = document.querySelector('.plugin .corps').getBoundingClientRect();
        const fenetre = document.querySelector('.plugin').getBoundingClientRect();
        return { largeur: Math.round(corps.width), hauteur: Math.round(fenetre.bottom - 1 - corps.top) };
      });
      await pageMaquette.locator('.plugin').screenshot({ path: path.join(SORTIE, `${paire.id}-maquette.png`) });
      const mesuresMaquette = await pageMaquette.evaluate(relever, { elements: ELEMENTS, styles: STYLES, origine: '.plugin .corps', colonne: 1 });
      await pageMaquette.close();

      const pageGalerie = await navigateur.newPage({ viewport: { width: zone.largeur, height: zone.hauteur } });
      await pageGalerie.goto(pathToFileURL(path.join(GALERIE, `${paire.etat}.html`)).href);
      await pageGalerie.waitForFunction(() => document.documentElement.dataset.galerie === 'pret');
      const barre = await pageGalerie.evaluate(() => Math.round(document.querySelector('.barre')?.getBoundingClientRect().height ?? 0));
      await pageGalerie.setViewportSize({ width: zone.largeur, height: zone.hauteur + barre });
      // L'image de l'aperçu se décode après le dernier message du scénario.
      await pageGalerie.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
      await pageGalerie.waitForTimeout(250);
      await jouer(pageGalerie, paire.galerie ?? []);
      await pageGalerie.screenshot({ path: path.join(SORTIE, `${paire.id}-galerie.png`) });
      const mesuresGalerie = await pageGalerie.evaluate(relever, { elements: ELEMENTS, styles: STYLES, origine: '.vc-corps', colonne: 2 });
      await pageGalerie.close();

      const ecarts = ecartsDe(mesuresMaquette, mesuresGalerie);
      total += ecarts.length;
      rapport.push(`${paire.titre} (${paire.etat}) : ${ecarts.length === 0 ? 'aucun écart' : `${ecarts.length} écart${ecarts.length > 1 ? 's' : ''}`}`, ...ecarts.map((ecart) => `  ${ecart}`));
    }
  } finally {
    await navigateur.close();
  }
  const cellules = PAIRES.map((paire) => `<figure><figcaption>${paire.titre}</figcaption><div><img src="./${paire.id}-maquette.png" alt="Maquette"><img src="./${paire.id}-galerie.png" alt="Plugin"></div></figure>`).join('\n');
  fs.writeFileSync(path.join(SORTIE, 'index.html'), `<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><title>Fidélité de la vue composant</title><style>body{margin:0;padding:16px;background:#8f8f8f;color:#fff;font:13px/1.4 system-ui,sans-serif}figure{margin:0 0 24px}figcaption{font-weight:600;margin-bottom:6px}figure div{display:flex;gap:16px;align-items:flex-start}</style></head><body>\n<p>À gauche la fenêtre de la maquette, barre de titre comprise ; à droite le plugin.</p>\n${cellules}\n</body></html>\n`);
  rapport.push(`Total : ${total} écart${total > 1 ? 's' : ''} sur ${PAIRES.length} paires.`);
  fs.writeFileSync(path.join(SORTIE, 'releve.txt'), `${rapport.join('\n')}\n`);
  console.log(rapport.join('\n'));
}

if (require.main === module) {
  comparer().catch((erreur) => {
    console.error(erreur);
    process.exit(1);
  });
}

module.exports = { PAIRES, ELEMENTS };
