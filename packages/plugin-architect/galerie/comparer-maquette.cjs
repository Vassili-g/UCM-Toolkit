/**
 * Le comparateur de fidélité : chaque cadre de MAQUETTE-ARCHITECT.html contre
 * l'état de galerie du même identifiant.
 *
 *   npm run galerie:plugin -- architect
 *   node packages/plugin-architect/galerie/comparer-maquette.cjs [<cadre>…]
 *
 * Sans argument, tous les cadres de `galerie/cadres.json`. Pour chacun, le
 * script ouvre la maquette et l'état de galerie à la taille du cadre, relève
 * les feuilles de texte et les éléments des sélecteurs du manifeste, puis
 * imprime chaque écart : 1 px de tolérance sur une position et une taille,
 * aucune sur une police, une couleur, un fond et un texte. Il sort en échec
 * (code 1) sur un écart, un cadre absent de la galerie ou un sélecteur
 * obligatoire vide, et range les captures côte à côte dans `dist/fidelite/`.
 *
 * Deux champs facultatifs du manifeste bornent un cadre dont la maquette
 * contredit ses propres données (des totaux qui ne s'additionnent pas) :
 * `zonesDeDonnees` liste des sélecteurs dont les descendants ne se comparent
 * que sur leurs styles (police, taille, graisse, couleur, fond), ni en nombre,
 * ni en position, ni en taille ; `ecartsDeclares` liste des textes
 * (`{ texte, raison }`) dont la présence ou l'absence d'un côté n'est pas un
 * écart. Le verdict imprime combien d'éléments chacun couvre, pour qu'un
 * relecteur voie ce qui est borné.
 *
 * Les pastilles roses (`.repere-n`) et les légendes de la maquette ne
 * s'implémentent jamais : le comparateur les ignore, ainsi que le contour
 * `.repere`. Les positions sont relatives au cadre ; la barre latérale d'un
 * cadre `fenetre` est une iframe imbriquée dans la maquette, que le relevé
 * replace dans le repère du cadre.
 *
 * Les fonctions pures (filtre, appariement, comparaison, verdict) ne touchent
 * pas au navigateur : `tests/comparateur.test.ts` les joue sur des relevés
 * synthétiques.
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const racine = path.resolve(__dirname, '..');
const MAQUETTE = path.resolve(racine, '../../docs/notes/Recherches/UCM Architect/2 Maquettes/MAQUETTE-ARCHITECT.html');
const MANIFESTE = path.join(__dirname, 'cadres.json');
const SORTIE = path.join(racine, 'dist', 'fidelite');
/** Les dossiers de `dist` où la galerie range ses états, selon la taille de la fenêtre. */
const DOSSIERS_DE_GALERIE = ['galerie', 'galerie-etroite', 'galerie-minimale'];
const THEME = 'sombre';

const TOLERANCE = 1;
const STYLES = ['fontFamily', 'fontSize', 'fontWeight', 'color', 'backgroundColor'];
const COTES = ['x', 'y', 'largeur', 'hauteur'];

/* ---------- Fonctions pures ---------- */

/** Retire du relevé ce que la maquette ajoute pour le lecteur : les pastilles numérotées et leur contenu. */
function sansRepere(elements) {
  return elements.filter((element) => !element.classes.includes('repere-n') && !element.dansPastille);
}

/** Groupe les éléments des deux côtés par clé, en gardant l'ordre du document dans chaque groupe. */
function apparier(attendus, obtenus, cle) {
  const groupes = new Map();
  const groupe = (nom) => {
    if (!groupes.has(nom)) groupes.set(nom, { attendus: [], obtenus: [] });
    return groupes.get(nom);
  };
  attendus.forEach((element) => groupe(cle(element)).attendus.push(element));
  obtenus.forEach((element) => groupe(cle(element)).obtenus.push(element));
  return groupes;
}

/** Les écarts de boîte et de style entre deux éléments appariés. */
function ecartsDeDeux(ou, attendu, obtenu) {
  const ecarts = [];
  COTES.forEach((cote, axe) => {
    if (Math.abs(attendu.boite[axe] - obtenu.boite[axe]) > TOLERANCE) {
      ecarts.push(`${ou} : ${cote} ${attendu.boite[axe].toFixed(1)} dans la maquette, ${obtenu.boite[axe].toFixed(1)} dans le plugin`);
    }
  });
  for (const style of STYLES) {
    if (attendu.styles[style] !== obtenu.styles[style]) ecarts.push(`${ou} : ${style} ${attendu.styles[style]} dans la maquette, ${obtenu.styles[style]} dans le plugin`);
  }
  return ecarts;
}

/** Compare les éléments d'un groupe : même nombre, puis deux à deux dans l'ordre du document. */
function ecartsDuGroupe(nom, groupe) {
  const ecarts = [];
  const { attendus, obtenus } = groupe;
  if (attendus.length !== obtenus.length) {
    if (obtenus.length === 0) ecarts.push(`${nom} : ${attendus.length} dans la maquette, absent du plugin`);
    else if (attendus.length === 0) ecarts.push(`${nom} : ${obtenus.length} dans le plugin, absent de la maquette`);
    else ecarts.push(`${nom} : ${attendus.length} dans la maquette, ${obtenus.length} dans le plugin`);
  }
  const communs = Math.min(attendus.length, obtenus.length);
  for (let rang = 0; rang < communs; rang += 1) {
    const ou = communs > 1 ? `${nom} ${rang + 1}` : nom;
    ecarts.push(...ecartsDeDeux(ou, attendus[rang], obtenus[rang]));
  }
  return ecarts;
}

/** Les sélecteurs de zone de données qui contiennent l'élément ; vide hors de toute zone. */
const zonesDe = (element) => element.zones ?? [];

/**
 * Compare les éléments des zones de données : par texte, dans l'ordre du
 * document, sur les seuls styles. Un texte qui n'a pas de vis-à-vis de l'autre
 * côté, ou un surplus d'un côté, ne compte pas.
 */
function ecartsDesZones(attendus, obtenus) {
  const ecarts = [];
  for (const [texte, groupe] of apparier(attendus, obtenus, (element) => element.texte)) {
    const communs = Math.min(groupe.attendus.length, groupe.obtenus.length);
    for (let rang = 0; rang < communs; rang += 1) {
      const ou = communs > 1 ? `« ${texte} » ${rang + 1}` : `« ${texte} »`;
      for (const style of STYLES) {
        const attendu = groupe.attendus[rang].styles[style];
        const obtenu = groupe.obtenus[rang].styles[style];
        if (attendu !== obtenu) ecarts.push(`${ou} (zone de données) : ${style} ${attendu} dans la maquette, ${obtenu} dans le plugin`);
      }
    }
  }
  return ecarts;
}

/**
 * Compare le relevé de la maquette à celui du plugin pour un cadre. Un relevé
 * `null` est une page absente : la maquette n'a pas le cadre, ou la galerie
 * n'a pas l'état. Un relevé est `{ elements, parSelecteur }`. Le résultat porte
 * aussi `bornes` : ce que chaque zone et chaque écart déclaré a couvert.
 */
function comparerCadre(cadre, maquette, galerie) {
  const resultat = { cadre: cadre.cadre, ecarts: [], bornes: [] };
  if (!maquette) resultat.ecarts.push('cadre absent de la maquette');
  if (!galerie) resultat.ecarts.push('cadre absent de la galerie : aucun état de galerie ne porte cet identifiant');
  if (!maquette || !galerie) return resultat;

  const zones = cadre.zonesDeDonnees ?? [];
  const declares = cadre.ecartsDeclares ?? [];
  const textesDeclares = new Set(declares.map(({ texte }) => texte));
  const attendus = sansRepere(maquette.elements);
  const obtenus = sansRepere(galerie.elements);

  for (const { texte, raison } of declares) {
    resultat.bornes.push(`écart déclaré « ${texte} » : ${attendus.filter((element) => element.texte === texte).length} dans la maquette, ${obtenus.filter((element) => element.texte === texte).length} dans le plugin (${raison})`);
  }
  for (const zone of zones) {
    const dedans = (liste) => liste.filter((element) => !textesDeclares.has(element.texte) && zonesDe(element).includes(zone)).length;
    resultat.bornes.push(`zone de données ${zone} : ${dedans(attendus)} éléments dans la maquette, ${dedans(obtenus)} dans le plugin, comparés sur les styles seuls`);
  }

  const libres = (liste) => liste.filter((element) => !textesDeclares.has(element.texte));
  const horsZone = (liste) => libres(liste).filter((element) => zonesDe(element).length === 0);
  const enZone = (liste) => libres(liste).filter((element) => zonesDe(element).length > 0);
  const textes = apparier(horsZone(attendus), horsZone(obtenus), (element) => element.texte);
  for (const [texte, groupe] of textes) resultat.ecarts.push(...ecartsDuGroupe(`« ${texte} »`, groupe));
  resultat.ecarts.push(...ecartsDesZones(enZone(attendus), enZone(obtenus)));

  for (const selecteur of cadre.selecteurs ?? []) {
    const vus = maquette.parSelecteur?.[selecteur] ?? [];
    const vusPlugin = galerie.parSelecteur?.[selecteur] ?? [];
    if (vus.length === 0) resultat.ecarts.push(`sélecteur obligatoire ${selecteur} : aucun élément dans la maquette`);
    if (vusPlugin.length === 0) resultat.ecarts.push(`sélecteur obligatoire ${selecteur} : aucun élément dans le plugin`);
    if (vus.length === 0 || vusPlugin.length === 0) continue;
    resultat.ecarts.push(...ecartsDuGroupe(selecteur, { attendus: sansRepere(vus), obtenus: sansRepere(vusPlugin) }));
  }
  return resultat;
}

/** Le verdict d'une série de cadres : les lignes à imprimer et l'issue. */
function verdict(resultats) {
  const lignes = [];
  let total = 0;
  for (const { cadre, ecarts } of resultats) {
    total += ecarts.length;
    lignes.push(`${cadre} : ${ecarts.length === 0 ? 'aucun écart' : `${ecarts.length} écart${ecarts.length > 1 ? 's' : ''}`}`, ...ecarts.map((ecart) => `  ${ecart}`));
  }
  for (const { cadre, bornes = [] } of resultats) {
    if (bornes.length > 0) lignes.push(`Borné dans ${cadre} :`, ...bornes.map((borne) => `  ${borne}`));
  }
  const echecs = resultats.filter((resultat) => resultat.ecarts.length > 0).length;
  lignes.push(`Total : ${total} écart${total > 1 ? 's' : ''}, ${echecs} cadre${echecs > 1 ? 's' : ''} en échec sur ${resultats.length}.`);
  return { ok: total === 0, lignes };
}

/* ---------- Relevé dans le navigateur ---------- */

/**
 * Relève, dans la page, les feuilles de texte et les éléments des sélecteurs.
 * Sérialisée par Playwright : elle ne s'appuie sur rien d'autre que son
 * argument. `id` désigne un cadre de la maquette (le document de son iframe) ;
 * sans `id`, c'est la page de galerie.
 */
function releverDansLaPage({ id, selecteurs, styles, zones = [] }) {
  const racineDuCadre = id ? document.querySelector(`#${id} iframe`)?.contentDocument : document;
  if (!racineDuCadre?.body) return null;
  const elements = [];
  const parSelecteur = Object.fromEntries(selecteurs.map((selecteur) => [selecteur, []]));
  const ignores = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TITLE']);

  const decrire = (element, decalage) => {
    const fenetre = element.ownerDocument.defaultView;
    const boite = element.getBoundingClientRect();
    const calcule = fenetre.getComputedStyle(element);
    return {
      boite: [boite.left + fenetre.scrollX + decalage[0], boite.top + fenetre.scrollY + decalage[1], boite.width, boite.height],
      styles: Object.fromEntries(styles.map((nom) => [nom, calcule[nom]])),
      classes: [...element.classList],
      dansPastille: element.closest('.repere-n') !== null,
      zones: zones.filter((zone) => element.parentElement?.closest(zone) ?? false),
    };
  };

  const parcourir = (document_, decalage) => {
    for (const element of document_.body.querySelectorAll('*')) {
      if (element.tagName === 'IFRAME') {
        const boite = element.getBoundingClientRect();
        const fenetre = document_.defaultView;
        const interieur = element.contentDocument;
        if (interieur?.body) parcourir(interieur, [decalage[0] + boite.left + fenetre.scrollX + element.clientLeft, decalage[1] + boite.top + fenetre.scrollY + element.clientTop]);
        continue;
      }
      if (ignores.has(element.tagName) || element.getClientRects().length === 0) continue;
      const texte = [...element.childNodes].filter((noeud) => noeud.nodeType === 3).map((noeud) => noeud.textContent).join(' ').replace(/\s+/g, ' ').trim();
      if (texte !== '') elements.push({ texte, ...decrire(element, decalage) });
    }
    for (const selecteur of selecteurs) {
      for (const element of document_.body.querySelectorAll(selecteur)) {
        if (element.getClientRects().length > 0) parSelecteur[selecteur].push({ texte: '', ...decrire(element, decalage) });
      }
    }
  };
  parcourir(racineDuCadre, [0, 0]);
  return { elements, parSelecteur };
}

/* ---------- Pilote ---------- */

function lireManifeste() {
  return JSON.parse(fs.readFileSync(MANIFESTE, 'utf8'));
}

/** Le fichier de l'état de galerie du même identifiant, ou `null`. */
function etatDeGalerie(id) {
  for (const dossier of DOSSIERS_DE_GALERIE) {
    const fichier = path.join(racine, 'dist', dossier, THEME, `${id}.html`);
    if (fs.existsSync(fichier)) return fichier;
  }
  return null;
}

async function attendreLesCadres(page, ids) {
  await page.waitForFunction((liste) => liste.every((id) => {
    const cadre = document.querySelector(`#${id} iframe`);
    const pret = (iframe) => iframe?.contentDocument?.readyState === 'complete' && iframe.contentDocument.body?.children.length > 0;
    if (!pret(cadre)) return false;
    const laterale = cadre.contentDocument.querySelector('.arch-laterale iframe');
    return laterale === null || pret(laterale);
  }), ids, { timeout: 30000 }).catch(() => {});
  // Les repères de la maquette se posent 450 ms après le chargement d'un cadre.
  await page.waitForTimeout(700);
}

function ecrireLaPlanche(resultats) {
  const cellules = resultats.map(({ cadre, images }) => `<figure><figcaption>${cadre}</figcaption><div>${images.map((image) => `<img src="./${image.fichier}" alt="${image.legende}">`).join('')}</div></figure>`).join('\n');
  fs.writeFileSync(path.join(SORTIE, 'index.html'), `<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><title>Fidélité des cadres d'Architect</title><style>body{margin:0;padding:16px;background:#8f8f8f;color:#fff;font:13px/1.4 system-ui,sans-serif}figure{margin:0 0 24px}figcaption{font-weight:600;margin-bottom:6px}figure div{display:flex;gap:16px;align-items:flex-start}</style></head><body>\n<p>À gauche le cadre de la maquette ; à droite l'état de galerie.</p>\n${cellules}\n</body></html>\n`);
}

async function comparer(demandes) {
  const manifeste = lireManifeste();
  const connus = new Map(manifeste.map((cadre) => [cadre.cadre, cadre]));
  const inconnus = demandes.filter((id) => !connus.has(id));
  if (inconnus.length > 0) throw new Error(`Cadre inconnu du manifeste : ${inconnus.join(', ')}.`);
  const cadres = demandes.length > 0 ? demandes.map((id) => connus.get(id)) : manifeste;
  if (!DOSSIERS_DE_GALERIE.some((dossier) => fs.existsSync(path.join(racine, 'dist', dossier)))) throw new Error('La galerie est absente de dist. Lancer npm run galerie:plugin -- architect.');

  const { chromium } = require('playwright');
  fs.rmSync(SORTIE, { recursive: true, force: true });
  fs.mkdirSync(SORTIE, { recursive: true });
  const navigateur = await chromium.launch();
  const resultats = [];
  try {
    const pageMaquette = await navigateur.newPage({ viewport: { width: 1700, height: 1000 } });
    await pageMaquette.goto(pathToFileURL(MAQUETTE).href);
    const presents = [];
    for (const cadre of cadres) if (await pageMaquette.locator(`#${cadre.cadre} iframe`).count() > 0) presents.push(cadre.cadre);
    await attendreLesCadres(pageMaquette, presents);

    for (const cadre of cadres) {
      const images = [];
      const options = { id: cadre.cadre, selecteurs: cadre.selecteurs, styles: STYLES, zones: cadre.zonesDeDonnees ?? [] };
      let maquette = null;
      if (presents.includes(cadre.cadre)) {
        maquette = await pageMaquette.evaluate(releverDansLaPage, options);
        await pageMaquette.locator(`#${cadre.cadre}`).screenshot({ path: path.join(SORTIE, `${cadre.cadre}-maquette.png`) });
        images.push({ fichier: `${cadre.cadre}-maquette.png`, legende: 'Maquette' });
      }

      let galerie = null;
      const fichier = etatDeGalerie(cadre.cadre);
      if (fichier) {
        const pageGalerie = await navigateur.newPage({ viewport: { width: cadre.largeur, height: cadre.hauteur } });
        try {
          await pageGalerie.goto(pathToFileURL(fichier).href);
          await pageGalerie.waitForFunction(() => document.documentElement.dataset.galerie === 'pret');
          await pageGalerie.waitForFunction(() => [...document.images].every((image) => image.complete));
          await pageGalerie.waitForTimeout(250);
          await pageGalerie.screenshot({ path: path.join(SORTIE, `${cadre.cadre}-galerie.png`) });
          images.push({ fichier: `${cadre.cadre}-galerie.png`, legende: 'Plugin' });
          galerie = await pageGalerie.evaluate(releverDansLaPage, { id: null, selecteurs: cadre.selecteurs, styles: STYLES, zones: cadre.zonesDeDonnees ?? [] });
        } finally {
          await pageGalerie.close();
        }
      }
      resultats.push({ ...comparerCadre(cadre, maquette, galerie), images });
    }
  } finally {
    await navigateur.close();
  }
  ecrireLaPlanche(resultats);
  const { ok, lignes } = verdict(resultats);
  fs.writeFileSync(path.join(SORTIE, 'releve.txt'), `${lignes.join('\n')}\n`);
  console.log(lignes.join('\n'));
  return ok;
}

if (require.main === module) {
  comparer(process.argv.slice(2)).then(
    (ok) => process.exit(ok ? 0 : 1),
    (erreur) => {
      console.error(erreur.message ?? erreur);
      process.exit(1);
    },
  );
}

module.exports = { TOLERANCE, STYLES, sansRepere, apparier, comparerCadre, verdict, releverDansLaPage };
