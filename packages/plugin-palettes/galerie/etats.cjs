/**
 * L'inventaire des états de l'interface d'UCM Palettes (section 13.3 de la
 * spécification). Un état atteignable déclare la suite exacte de messages qui
 * le produit ; un état que l'interface ne sait pas encore montrer nomme la
 * case du plan qui le créera.
 */
const path = require('path');

/**
 * Le moteur et le modèle de planche sont lus à leur source : une recette
 * classée ici est celle que le sandbox classerait, une empreinte de cadre
 * celle que l'interface recalcule, jamais une recopie.
 */
function compiler(entree, nom) {
  const compile = path.resolve(__dirname, `../dist/${nom}.cjs`);
  require('esbuild').buildSync({ entryPoints: [entree], outfile: compile, bundle: true, format: 'cjs', platform: 'node' });
  return require(compile);
}
const chargerLeMoteur = () => compiler(require.resolve('ucm-couleur'), 'galerie-couleur');

const {
  FORMAT_RECETTE,
  PREREGLAGE_CONSTANTE,
  boutsDe,
  classerRecette,
  ecrireHexa,
  estGrisPur,
  fnv1a,
  jsonCanonique,
  lireHexa,
  octetsUtf8,
  prereglageTailwind,
  recetteAvecTexteDesBoutons,
  recetteParDefaut,
  referenceReglee,
  rgb8VersOklch,
} = chargerLeMoteur();
const { modeleDeCadre } = compiler(path.resolve(__dirname, '../src/planche/modele.ts'), 'galerie-modele');
const { planDesVariables } = compiler(path.resolve(__dirname, '../src/variables/plan.ts'), 'galerie-plan');

/** Une planche sans page, avant tout dessin. */
const PLANCHE_VIDE = { page: null, nomDeLaPage: null, cadres: [], manquants: [], recherche: 'page', suiviFutur: false, pages: [{ id: '0:1', nom: 'Page 1', cadres: 0 }] };

/** Un fichier sans variable, et un suivi que rien n'a encore écrit. */
const VARIABLES_VIDES = {
  bibliotheques: { collections: [], palettes: [], lisibles: true },
  collections: [],
  variables: [],
  suivi: { version: 1, destination: { collection: { nom: 'primitives' }, groupe: 'colors', themes: 'chemin' }, confirmee: false, palettes: {} },
};

/** La collection où les états de la galerie écrivent leurs palettes, et la destination qui la désigne. */
const COLLECTION_DES_TOKENS = { id: 'VariableCollectionId:7:1', nom: 'primitives', modes: [{ id: '7:0', nom: 'Mode 1' }], variables: 0 };
const DESTINATION_DES_TOKENS = { collection: { id: COLLECTION_DES_TOKENS.id }, groupe: 'colors', themes: 'chemin' };

/**
 * Les variables d'un fichier où les palettes `ecrites` portent leurs tokens,
 * tels que le plan de la recette rangée les calcule. Les réglages faussent
 * une lecture : `lue` change la couleur que Figma porte, `ecrite` la
 * dernière couleur écrite, `disparue` retire une variable du fichier. Une
 * palette de `ecrites` absente de la recette garde ses variables : celles
 * d'une palette supprimée.
 */
function tokensEcrits(texte, ecrites, { lue = (hexa) => hexa, ecrite = (hexa) => hexa, disparue = () => false, confirmee = true } = {}) {
  const recette = classerRecette(texte).recette;
  const variables = [];
  const palettes = {};
  for (const palette of ecrites) {
    const complete = { ...recette, palettes: recette.palettes.some((candidate) => candidate.id === palette.id) ? recette.palettes : [...recette.palettes, palette] };
    const suivies = {};
    planDesVariables(complete, complete.palettes.find((candidate) => candidate.id === palette.id), DESTINATION_DES_TOKENS).forEach((entree, rang) => {
      const id = `VariableID:${palette.id}:${rang}`;
      suivies[entree.cle] = { id, ecrite: ecrite(entree.hexa, entree, palette) };
      if (!disparue(entree, palette)) variables.push({ id, nom: entree.nom, collection: COLLECTION_DES_TOKENS.id, valeurs: { '7:0': lue(ecrite(entree.hexa, entree, palette), entree, palette) } });
    });
    palettes[palette.id] = { collection: COLLECTION_DES_TOKENS.id, groupe: 'colors', modes: { unique: '7:0' }, variables: suivies, liaison: 'destination' };
  }
  return {
    collections: [{ ...COLLECTION_DES_TOKENS, variables: variables.length }, { id: 'VariableCollectionId:8:1', nom: 'Brand', modes: [{ id: '8:0', nom: 'Light' }, { id: '8:1', nom: 'Dark' }], variables: 48 }],
    variables,
    suivi: { version: 1, destination: DESTINATION_DES_TOKENS, confirmee, palettes },
  };
}

/** Deux rampes de Tailwind, comme un fichier les porte dans ses variables sans le plugin. */
const RAMPES_DU_FICHIER = {
  slate: ['#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B', '#475569', '#334155', '#1E293B', '#0F172A', '#020617'],
  emerald: ['#ECFDF5', '#D1FAE5', '#A7F3D0', '#6EE7B7', '#34D399', '#10B981', '#059669', '#047857', '#065F46', '#064E3B', '#022C22'],
};
const NUANCES_DU_FICHIER = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/**
 * Les variables d'un fichier, augmentées de deux palettes que le plugin n'a
 * pas écrites : `slate`, à la racine de « primitives », et `brand/emerald`,
 * dans la collection « Brand » à deux modes.
 */
function avecLesPalettesDuFichier(fichier) {
  const primitives = fichier.collections.find((collection) => collection.id === COLLECTION_DES_TOKENS.id) ?? COLLECTION_DES_TOKENS;
  const brand = fichier.collections.find((collection) => collection.nom === 'Brand') ?? { id: 'VariableCollectionId:8:1', nom: 'Brand', modes: [{ id: '8:0', nom: 'Light' }, { id: '8:1', nom: 'Dark' }], variables: 48 };
  const slate = NUANCES_DU_FICHIER.map((nuance, rang) => ({ id: `VariableID:slate:${nuance}`, nom: `slate/${nuance}`, collection: primitives.id, valeurs: { '7:0': RAMPES_DU_FICHIER.slate[rang] } }));
  const emerald = NUANCES_DU_FICHIER.map((nuance, rang) => ({
    id: `VariableID:emerald:${nuance}`,
    nom: `brand/emerald/${nuance}`,
    collection: brand.id,
    valeurs: { '8:0': RAMPES_DU_FICHIER.emerald[rang], '8:1': RAMPES_DU_FICHIER.emerald[10 - rang] },
  }));
  return {
    ...fichier,
    collections: [...new Map([...fichier.collections, primitives, brand].map((collection) => [collection.id, collection])).values()],
    variables: [...fichier.variables, ...slate, ...emerald],
  };
}

/**
 * `slate`, reprise des variables du fichier par « Modifier dans le plugin » :
 * la palette du plugin, recalculée ou figée aux couleurs lues, et le fichier
 * dont le suivi la lie à ses variables d'origine.
 */
function repriseDeSlate(figee) {
  const calculee = { ...palette('p-51a7e000', 'slate', '#475569'), intensites: 1 };
  const reprise = figee ? { ...calculee, crans: NUANCES_DU_FICHIER, figees: { light: RAMPES_DU_FICHIER.slate } } : calculee;
  const fichier = avecLesPalettesDuFichier(VARIABLES_VIDES);
  const variables = Object.fromEntries(NUANCES_DU_FICHIER.map((nuance, rang) => [`unique/light/${nuance}`, { id: `VariableID:slate:${nuance}`, ecrite: RAMPES_DU_FICHIER.slate[rang] }]));
  return {
    palette: reprise,
    fichier: {
      ...fichier,
      suivi: { ...fichier.suivi, palettes: { [reprise.id]: { collection: COLLECTION_DES_TOKENS.id, groupe: '', modes: { light: '7:0' }, variables, liaison: 'reprise' } } },
    },
  };
}

function reprisePartielleDeSlate() {
  const reprise = repriseDeSlate(false);
  const recette = classerRecette(rangee([reprise.palette, BLEU])).recette;
  const destination = { ...DESTINATION_DES_TOKENS, groupe: '' };
  const variables = [];
  const suivies = {};
  for (const entree of planDesVariables(recette, reprise.palette, destination)) {
    const id = `VariableID:slate:${entree.cle}`;
    if (entree.cle === 'unique/dark/50') {
      variables.push({ id: 'VariableID:etrangere:50', nom: entree.nom, collection: COLLECTION_DES_TOKENS.id, valeurs: { '7:0': '#FF0000' } });
    } else {
      variables.push({ id, nom: entree.nom, collection: COLLECTION_DES_TOKENS.id, valeurs: { '7:0': entree.hexa } });
      suivies[entree.cle] = { id, ecrite: entree.hexa };
    }
  }
  return { palette: reprise.palette, fichier: { ...reprise.fichier, variables, suivi: { ...reprise.fichier.suivi, destination, palettes: { [reprise.palette.id]: { collection: COLLECTION_DES_TOKENS.id, groupe: '', chemin: 'slate', modes: { light: '7:0' }, variables: suivies, liaison: 'reprise' } } } } };
}

function avecAncienneSortie(fichier, palette) {
  const suivie = fichier.suivi.palettes[palette.id];
  const ids = new Set(Object.values(suivie.variables).map((variable) => variable.id));
  return {
    ...fichier,
    variables: [...fichier.variables, ...fichier.variables.filter((variable) => ids.has(variable.id)).map((variable) => ({ ...variable, id: `${variable.id}:ancienne`, nom: variable.nom.replace(/^colors\//, 'anciens/') }))],
    suivi: { ...fichier.suivi, palettes: { ...fichier.suivi.palettes, [`ancienne:${palette.id}:1`]: { ...suivie, sortieAnterieureDe: palette.id, variables: Object.fromEntries(Object.entries(suivie.variables).map(([cle, variable]) => [cle, { ...variable, id: `${variable.id}:ancienne` }])) } } },
  };
}

/**
 * Les variables d'un fichier où deux bibliothèques publient chacune une
 * collection « primitive base », de 323 et de 6 variables ; la première
 * porte la palette `gray`, dont les couleurs ne se lisent qu'à la copie.
 */
function avecLesBibliotheques(fichier) {
  return {
    ...fichier,
    bibliotheques: {
      collections: [
        { cle: 'cle-de-collection-1', nom: 'primitive base', bibliotheque: 'Design system', variables: 323 },
        { cle: 'cle-de-collection-2', nom: 'primitive base', bibliotheque: 'Ancien kit', variables: 6 },
      ],
      palettes: [{ collection: 'cle-de-collection-1', nomDeLaCollection: 'primitive base', variablesDeLaCollection: 323, chemin: 'gray', nuances: NUANCES_DU_FICHIER }],
      lisibles: true,
    },
  };
}

/** L'état que le sandbox envoie pour un texte rangé sous la clé de la recette, en réponse à la demande `demande`. */
function etatDuFichier(texte, profil = 'SRGB', planche = PLANCHE_VIDE, demande = 1, variables = VARIABLES_VIDES) {
  return {
    message: {
      type: 'etat',
      demande,
      classement: classerRecette(texte),
      texte,
      empreinte: texte === '' ? null : fnv1a(octetsUtf8(texte)),
      profil,
      planche,
      variables,
    },
  };
}

/** Une palette au préréglage Tailwind, profils liés, comme l'onglet Création la crée : un gris pur n'a pas de dérive. */
function palette(id, nom, reference, recette = recetteParDefaut()) {
  const couleur = lireHexa(reference);
  const derive = estGrisPur(couleur) ? PREREGLAGE_CONSTANTE : prereglageTailwind(rgb8VersOklch(couleur), boutsDe(recette));
  return {
    id,
    nom,
    reference,
    derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } },
  };
}

/** Le texte rangé d'une recette : la recette par défaut, modifiée, avec ces palettes. */
function rangee(palettes, modifier = (recette) => recette) {
  return jsonCanonique({ ...modifier(recetteParDefaut()), palettes });
}

const BLEU = palette('p-3fa2c91e', 'Bleu', '#1E6FD9');
const JAUNE = palette('p-08b7d4a0', 'Jaune', '#FACC15');
const ROUGE_ANCRE = palette('p-7e3a5b21', 'Rouge', '#D94635');

/** Le texte des boutons de chaque thème posé sur la recette par défaut, courbes comprises. */
const avecLeTexteDesBoutons = (light, dark) => (recette) =>
  [['light', light], ['dark', dark]].reduce((courante, [mode, texte]) => recetteAvecTexteDesBoutons(courante, mode, texte).recette, recette);

/** Trois palettes que la configuration ne touche pas toutes : parts du designer, profils ternes. */
const TROIS_PALETTES = [
  BLEU,
  { ...JAUNE, parts: { soft: 0.3, vivid: 0.8, origine: 'designer' } },
  palette('p-5c1d0e77', 'Ardoise', '#6B7280'),
];
/**
 * Le cadre d'une palette tel que la lecture de la planche le relève. Son
 * empreinte est celle du modèle que la recette rangée donne, sauf réglage
 * contraire : le cadre est alors périmé. Chaque génération dessine la grille.
 */
function cadreDessine(texte, palette, cadre, { profil = 'SRGB', ...reglages } = {}) {
  const recette = classerRecette(texte).recette;
  const rangeeDansLaRecette = recette.palettes.find((candidate) => candidate.id === palette.id) ?? palette;
  const empreinte = modeleDeCadre(recette, rangeeDansLaRecette, profil).empreinte;
  return { palette: palette.id, cadre, nom: palette.nom, page: PAGE_DE_LA_PLANCHE, nomDeLaPage: 'Palettes', empreinte, grille: recette.contenuDesPlanches.grilles, possede: true, ...reglages };
}
const PAGE_DE_LA_PLANCHE = '40:1';

/** Les cadres de deux palettes supprimées de la recette, restés dans Figma et toujours possédés. */
const CADRES_SUPPRIMES = [
  { palette: 'p-5c1d0e77', cadre: '40:4', nom: 'Ardoise', page: PAGE_DE_LA_PLANCHE, nomDeLaPage: 'Palettes', empreinte: '0badc0de', grille: true, possede: true },
  { palette: 'p-1a2b3c4d', cadre: '40:6', nom: 'Rouge', page: PAGE_DE_LA_PLANCHE, nomDeLaPage: 'Palettes', empreinte: '0badc0de', grille: true, possede: true },
];

/**
 * Poppy, reprise du fichier puis retirée de la recette par erreur : son cadre
 * reste sur la planche, rattaché à son identifiant, et le suivi garde sa
 * liaison de reprise.
 */
const POPPY = palette('p-9e4d7c10', 'Poppy', '#DC2626');
const CADRE_DE_POPPY = { palette: POPPY.id, cadre: '40:8', nom: 'Poppy', page: PAGE_DE_LA_PLANCHE, nomDeLaPage: 'Palettes', empreinte: '0badc0de', grille: true, possede: true };
const RAMPE_DE_POPPY = ['#FEF2F2', '#FEE2E2', '#FECACA', '#FCA5A5', '#F87171', '#EF4444', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D', '#450A0A'];

/** Les quatre groupes `Poppy/<intensité>/<thème>` du fichier, et le suivi qui les lie à l'identifiant de Poppy. */
function variablesDePoppy(liaison = 'reprise') {
  const variables = [];
  const suivies = {};
  for (const intensite of ['soft', 'vivid']) {
    for (const theme of ['light', 'dark']) {
      NUANCES_DU_FICHIER.forEach((nuance, rang) => {
        const id = `VariableID:poppy:${intensite}:${theme}:${nuance}`;
        const hexa = (theme === 'light' ? RAMPE_DE_POPPY : [...RAMPE_DE_POPPY].reverse())[rang];
        variables.push({ id, nom: `Poppy/${intensite}/${theme}/${nuance}`, collection: COLLECTION_DES_TOKENS.id, valeurs: { '7:0': hexa } });
        suivies[`${intensite}/${theme}/${nuance}`] = { id, ecrite: hexa };
      });
    }
  }
  return {
    ...VARIABLES_VIDES,
    collections: [{ ...COLLECTION_DES_TOKENS, variables: variables.length }],
    variables,
    suivi: { ...VARIABLES_VIDES.suivi, destination: DESTINATION_DES_TOKENS, confirmee: true, palettes: { [POPPY.id]: { collection: COLLECTION_DES_TOKENS.id, groupe: '', chemin: 'Poppy', modes: { light: '7:0' }, variables: suivies, liaison } } },
  };
}

/** Les quatre groupes de Poppy et les deux palettes seules du fichier, sans aucune palette suivie par le plugin. */
function variablesDuFichierAvecPoppy() {
  const fichier = avecLesPalettesDuFichier(variablesDePoppy());
  return { ...fichier, suivi: { ...fichier.suivi, palettes: {} } };
}

/** La planche que la lecture relève : sa page, ses cadres, et ce qu'elle n'a pas trouvé. */
const plancheLue = (cadres, reglages = {}) => ({ ...PLANCHE_VIDE, page: PAGE_DE_LA_PLANCHE, nomDeLaPage: 'Palettes', cadres, ...reglages });
const ouvrirLaPlanche = { clic: '#onglet-gestion' };
const ouvrirLaVerification = { clic: '#onglet-verification' };

/** Le designer choisit un fichier de recette dans l'onglet Gestion. */
const importer = (contenu) => ({ fichier: { dans: '#panneau-gestion input[type="file"]', nom: 'palettes-et-reglages.json', contenu } });

const ouvrirLaConfiguration = { clic: '[aria-label="Ouvrir les réglages communs"]' };
/** Déplie la ligne d'une palette du plugin dans l'onglet Gestion ouvert ([UI-27]). */
const deplier = (palette) => ({ clic: `#panneau-gestion .palette-depliable[data-cle="${palette.id}"] [data-geste="deplier"]` });
/** Déplie la première ligne d'une palette du fichier, ou d'une bibliothèque. */
const deplierLeFichier = { clic: '#panneau-gestion .palette-depliable[data-cle^="fichier:"] [data-geste="deplier"]' };
const deplierLaBibliotheque = { clic: '#panneau-gestion .palette-depliable[data-cle^="bibliotheque:"] [data-geste="deplier"]' };
/**
 * Déplie la première ligne dont la planche demande un geste, puis clique ce
 * geste. Une ligne repliée montre sa pastille : une ligne déjà dépliée ne
 * répond pas au sélecteur.
 */
const dessinerLaPalette = [
  { clic: '#panneau-gestion .palette-depliable[data-palette]:has(.pastille-d-etat:is([data-etat="jamais-dessinee"], [data-etat="perimee"], [data-etat="introuvable"])) [data-geste="deplier"]' },
  { clic: '#panneau-gestion .palette-depliable[data-palette] [data-geste="generer"]' },
];
/** Les pages d'un fichier dont la planche porte deux cadres. */
const PAGES_DU_FICHIER = [{ id: '0:1', nom: 'Cover', cadres: 0 }, { id: '12:1', nom: 'Design system', cadres: 0 }, { id: PAGE_DE_LA_PLANCHE, nom: 'Palettes', cadres: 2 }];
/**
 * Bleu à jour, Jaune périmée, Ardoise jamais dessinée, dans un fichier de
 * trois pages. `variables` donne l'état de leurs tokens ; sans lui, aucune
 * palette n'est écrite et la destination n'est pas confirmée.
 */
const gestionDeTroisPalettes = (variables = VARIABLES_VIDES) => etatDuFichier(rangee(TROIS_PALETTES), 'SRGB', plancheLue(
  [cadreDessine(rangee(TROIS_PALETTES), BLEU, '40:2'), cadreDessine(rangee(TROIS_PALETTES), JAUNE, '40:3', { empreinte: '0badc0de' })],
  { pages: PAGES_DU_FICHIER },
), 1, variables);
/** Une couleur lue ou écrite faussée sur les nuances 700 et 800 de Vivid en Light, pour la seule palette nommée. */
const fausser = (cible, remplacements) => (hexa, entree, palette) =>
  (palette.id === cible.id && remplacements[entree.cle] ? remplacements[entree.cle] : hexa);
const deplierLInterfaceDeTest = { clic: '[aria-label="Interface de test"] .carte-bascule' };
/** Le segment « Dark » de la bascule « Aperçu » de la ligne du titre : le thème se montre dans les deux onglets. */
const montrerLeThemeDark = { clic: '#panneau-creation .tete-de-la-palette .bascule-option:nth-child(2)' };
/**
 * Le banc n'a pas de geste de défilement : le focus donné au dernier bouton de
 * l'écran amène la page jusqu'à lui, et « Maj » n'active rien.
 */
const defilerJusquAuDernierBoutonDeLEssai = { touche: { dans: '#panneau-creation .essai-actions .essai-bouton:last-child', cle: 'Shift' } };

/** Vert, ajusté d'un pas plus sombre : #16A34A devient #0DA047, et l'originale se garde (W7). */
const VERT_AJUSTE = { ...palette('p-2b3c4d5e', 'Vert', '#0DA047'), originale: '#16A34A' };
/** Déplier une carte de réglage attend la fin du calcul de ses limites ([DER-20]). */
const deplierLaDerive = { clic: '[aria-label="Color shift"] .carte-bascule', attendre: '.editeur-derive[data-limites="pretes"]' };
const deplierLesReglages = { clic: '[aria-label="Réglage global"] .carte-bascule', attendre: '.reglages-de-la-palette[data-limites="pretes"]' };
/** Un onglet de grandeur du Color shift ([DER-18]). */
const ongletDuColorShift = (grandeur) => ({ clic: `.editeur-derive [role="tab"][data-grandeur="${grandeur}"]`, attendre: '.editeur-derive[data-limites="pretes"]' });

/** Bleu, dont le Color shift règle aussi la saturation et la luminosité, aux deux profils liés. */
const BLEU_COLOR_SHIFT = {
  ...palette('p-1e6fd900', 'Bleu', '#1E6FD9'),
};
BLEU_COLOR_SHIFT.derive = {
  ...BLEU_COLOR_SHIFT.derive,
  soft: { ...BLEU_COLOR_SHIFT.derive.soft, saturation: { clair: -0.4, sombre: 0.25 }, clarte: { clair: 0.02, sombre: -0.05 } },
  vivid: { ...BLEU_COLOR_SHIFT.derive.vivid, saturation: { clair: -0.4, sombre: 0.25 }, clarte: { clair: 0.02, sombre: -0.05 } },
};

/**
 * Bleu réglé dans la carte « Teinte, saturation, luminosité » (Z10.5) : Soft
 * tourné de 8°, Vivid, qui porte la référence, assombri de 0,02. La référence
 * se tire de l'originale par le moteur, comme le geste la récrit.
 */
const BLEU_REGLE = {
  ...BLEU,
  reference: ecrireHexa(referenceReglee(lireHexa(BLEU.reference), 0, -0.02, undefined, recetteParDefaut().gamut)),
  originale: BLEU.reference,
  reglages: { teinte: { soft: 8 }, clarte: { vivid: -0.02 }, porteur: 'vivid' },
};

/** Sept palettes : une de plus que le seuil au-delà duquel tout dessiner se confirme. */
const SEPT_PALETTES = [
  BLEU,
  JAUNE,
  palette('p-5c1d0e77', 'Ardoise', '#6B7280'),
  palette('p-1a2b3c4d', 'Rouge', '#DC2626'),
  palette('p-2b3c4d5e', 'Vert', '#16A34A'),
  palette('p-3c4d5e6f', 'Violet', '#7C3AED'),
  palette('p-4d5e6f70', 'Cyan', '#0891B2'),
];

/** Une palette par état de cadre : à jour, périmée, jamais générée, introuvable, illisible. */
const CINQ_ETATS = SEPT_PALETTES.slice(0, 5);

/**
 * Le texte des boutons noir en Light, donc inversé : la 700 de Bleu, ancrée sur
 * la référence #1E6FD9, porte le noir à 4,33:1 et manque G1 (solid/foreground
 * sur solid/default) en Vivid. Dark garde son noir et ne manque rien.
 */
const texteNoirEnLight = avecLeTexteDesBoutons('noir', 'noir');

/** Deux fautes : une courbe claire qui remonte au 500, un fond sombre à cinq chiffres. */
function recetteCassee() {
  const recette = recetteParDefaut();
  const light = [...recette.courbes.light];
  light[5] = 0.8;
  return JSON.stringify({ ...recette, courbes: { ...recette.courbes, light }, fonds: { ...recette.fonds, dark: '#12121' } });
}

const ETATS = [
  {
    id: 'sans-palette-choisie',
    titre: 'Onglet Création sans palette choisie',
    quand: 'Le fichier porte trois palettes ; le plugin s’ouvre, et aucune n’est choisie.',
    regarder: '« Sélectionner une palette » en couleur secondaire dans le sélecteur, « Nouvelle palette » sans « … » ; sous le filet, « Choisissez une palette » en titre de premier rang et sa phrase, sans bouton.',
    existe: true,
    sansPaletteChoisie: true,
    atteinte: [etatDuFichier(rangee(TROIS_PALETTES))],
  },
  {
    id: 'ajuster-en-modale',
    titre: 'Ajuster la référence, en modale',
    quand: 'Vert manque une garantie en Thème Light ; le designer ouvre « Ajuster la référence ».',
    regarder: 'La modale centrée sur le voile, 520 px au plus : « La palette utilise votre couleur telle quelle. En Thème Light, elle est trop claire pour « anneau de focus » (page/focus). », les deux témoins, les pas, la ligne des nuances, le code, le tableau avant et après, le bilan par intensité, puis Annuler et Appliquer ; sans luminosité. À 500 px, le thème et l’intensité en titre, chaque garantie sur une ligne.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([palette('p-2b3c4d5e', 'Vert', '#16A34A')])),
      { clic: '[aria-label="Configuration de la palette"] .colonnes-de-base .lien-de-constat' },
    ],
  },
  {
    id: 'garanties-refaites',
    titre: 'Garanties de contraste, refaites',
    quand: 'Bleu, deux intensités, une garantie en échec choisie, dans l’onglet Vérification.',
    regarder: 'Un encadré par minimum, les états nommés une fois, les badges sur la ligne de leur ratio, les codes des rôles lisibles, la rangée choisie marquée d’une barre écartée du texte. Sous 700 px, le spécimen au-dessus des numéros, chaque rangée sur une ligne.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU, JAUNE], texteNoirEnLight)), ouvrirLaVerification],
  },
  {
    id: 'premier-lancement',
    titre: 'Premier lancement',
    quand: 'Le fichier ne porte aucune recette : la recette par défaut est proposée, sans palette.',
    regarder: 'L’encart au fond bleuté : la rampe d’exemple, « Créez votre première palette », une phrase et « Nouvelle palette ». Ni barre de palette ni carte de création.',
    existe: true,
    atteinte: [etatDuFichier('')],
  },
  {
    id: 'recette-future',
    titre: 'Recette future',
    quand: 'Une version plus récente du plugin a rangé la recette.',
    regarder: 'Le bloquant en tête de l’onglet, ses trois parties séparées, la demande de mise à jour, et les trois gestes de sortie : exporter, importer, repartir de la recette par défaut.',
    existe: true,
    atteinte: [etatDuFichier(JSON.stringify({ ...recetteParDefaut(), formatVersion: FORMAT_RECETTE + 1 }))],
  },
  {
    id: 'recette-illisible',
    titre: 'Recette illisible',
    quand: 'La recette rangée ne passe pas la validation : deux champs sont faux.',
    regarder: 'Le compte des champs invalides, le premier refus en mots du designer, le bloquant sans écriture, et ses trois gestes de sortie.',
    existe: true,
    atteinte: [etatDuFichier(recetteCassee())],
  },
  {
    id: 'palette-en-saisie',
    titre: 'Palette en saisie',
    quand: 'Le designer tape une nouvelle référence : l’aperçu suit la saisie, rien n’est dessiné.',
    regarder: 'Le nuancier recalculé pour #7C3AED, le résumé de la dérive, et le détail de la nuance Vivid 700 choisie.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU])),
      { saisie: { dans: '#panneau-creation .champ-hexa', valeur: '#7C3AED' } },
      { clic: '[aria-label^="Profil Vivid, nuance 700,"]' },
    ],
  },
  {
    id: 'promesses-manquees',
    titre: 'Palette avec promesses manquées',
    quand: 'Le texte des boutons du thème Light est noir, donc inversé : la 700 de Bleu, ancrée sur #1E6FD9, ne tient plus le noir à 4,5:1 (4,33:1), G1 est manquée en Light.',
    regarder: 'Sous le code, la ligne qui compte les garanties manquées ; le pied en danger, son compte et « Vérifier » ; le ✗ du verdict dans le sélecteur ; le focus clavier déplacé sur la rampe.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU, JAUNE], texteNoirEnLight)),
      { touche: { dans: '.nuancier-grille [tabindex="0"]', cle: 'ArrowRight' } },
    ],
  },
  {
    id: 'alertes-seules',
    titre: 'Référence plus vive que la saturation commune',
    quand: 'Une référence jaune, plus vive que la saturation commune de Vivid : Vivid la porte au 300 en Light et prend sa saturation, 98 %.',
    regarder: 'Les garanties respectées, la ligne « Référence : Vivid · nuance 300 », et aucune notice : la référence n’est pas plus vive que Vivid.',
    existe: true,
    atteinte: [etatDuFichier(rangee([JAUNE, BLEU]))],
  },
  {
    id: 'profils-confondus',
    titre: 'Profils presque identiques',
    quand: 'Le designer règle Soft et Vivid sur des parts de chroma voisines.',
    regarder: 'La carte Réglage global annonce un point à vérifier ; le message nomme les nuances concernées et propose Ajuster la saturation.',
    existe: true,
    atteinte: [etatDuFichier(rangee([{ ...BLEU, parts: { soft: 0.1, vivid: 0.105, origine: 'designer' } }]))],
  },
  {
    id: 'palette-desaturee',
    titre: 'Palette désaturée',
    quand: 'La référence #897288, saturation 16 % : Soft la porte et prend sa saturation, Vivid garde le rapport des saturations communes.',
    regarder: 'Les voisines de la référence dans Soft, aussi ternes qu’elle ; Vivid plus vif, sans couleur franche ; aucun point à vérifier ; la dérive de teinte réglable.',
    existe: true,
    atteinte: [etatDuFichier(rangee([palette('p-89728800', 'Mauve', '#897288')]))],
  },
  {
    id: 'palette-tres-desaturee',
    titre: 'Palette très désaturée',
    quand: 'La référence #7C717B, saturation 8 % : sa teinte se lit encore, et la dérive Tailwind s’y applique.',
    regarder: 'Soft et Vivid distincts, Vivid plus vif ; aucun point à vérifier, « Profils confondus » compris ; le Color shift et la piste de teinte de la carte « Réglage global » réglables.',
    existe: true,
    atteinte: [etatDuFichier(rangee([palette('p-7c717b00', 'Taupe', '#7C717B')])), deplierLesReglages],
  },
  {
    id: 'palette-grise',
    titre: 'Palette grise',
    quand: 'La référence #808080 est un gris pur : toutes les nuances sont grises, dans les deux profils et les deux thèmes.',
    regarder: 'Dans la carte « Réglage global », la piste de teinte désactivée, la note « Cette palette est entièrement grise. Il n’y a pas de teinte à régler. » dessous, et la ligne « Votre couleur de référence est un gris pur. Soft et Vivid sont gris. » ; dans le Color shift, les onglets Teinte et Saturation désactivés, l’onglet Luminosité choisi et réglable, et la note « Cette palette est entièrement grise : teinte et saturation ne se voient pas. La luminosité reste réglable. » ; aucun point à vérifier.',
    existe: true,
    atteinte: [etatDuFichier(rangee([palette('p-80808000', 'Gris', '#808080')])), deplierLesReglages, deplierLaDerive],
  },
  {
    id: 'presque-noir',
    titre: 'Presque noir',
    quand: 'La référence #060605 : R, G et B ne diffèrent que d’une unité, c’est un gris pur, plus sombre que toutes les nuances.',
    regarder: 'Des rampes grises, sans teinte crème dans les clairs ; la référence à la place du 950 en Light ; aucun point à vérifier, ni « hors de la rampe » ; le Color shift sur l’onglet Luminosité, sa note de palette grise à la place de celle de la poignée masquée.',
    existe: true,
    atteinte: [etatDuFichier(rangee([palette('p-06060500', 'Encre', '#060605')])), deplierLaDerive],
  },
  {
    id: 'premier-lancement-palette-creee',
    titre: 'Premier lancement, palette créée',
    quand: 'Sur un fichier sans recette, le designer crée sa première palette : la recette se range.',
    regarder: 'La palette ouverte, « Palette » suivi de son code seul sur la ligne du titre, sans indication d’enregistrement ; la carte « Configuration de la palette » repliée, son résumé « #1E6FD9 · Standard · Une intensité » aligné à droite et le focus sur son bouton.',
    existe: true,
    atteinte: [
      etatDuFichier(''),
      { clic: '.appel .btn-primary' },
      { saisie: { dans: '.champ-creation', valeur: '#1E6FD9' } },
      { clic: '.creation-ligne .btn-primary' },
      { message: { type: 'rangement', demande: 2, issue: { issue: 'rangee', empreinte: '5e0c1a7b' } } },
    ],
  },
  {
    id: 'hexa-invalide',
    titre: 'Hexa invalide',
    quand: 'Le designer tape une lettre qui n’est pas hexadécimale dans la référence.',
    regarder: 'L’erreur sous le champ, en rouge, et l’aperçu resté celui de #1E6FD9.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), { saisie: { dans: '#panneau-creation .champ-hexa', valeur: '#1E6FZ9' } }],
  },
  {
    id: 'recette-modifiee-ailleurs',
    titre: 'Recette modifiée ailleurs',
    quand: 'Le designer duplique une palette, mais la recette rangée a changé depuis sa lecture.',
    regarder: 'Le refus en tête, au-dessus de la barre, et ses gestes « Exporter mes modifications » et « Recharger les palettes ».',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU])),
      { clic: '.menu-palette .icon-button' },
      { clic: '[data-geste="dupliquer"]' },
      { message: { type: 'rangement', demande: 2, issue: { issue: 'modifiee-ailleurs' } } },
    ],
  },
  {
    id: 'configuration-de-la-recette',
    titre: 'Configuration de la recette',
    quand: 'Le designer ouvre l’engrenage sur un fichier de trois palettes, dont une aux parts propres et une aux profils ternes.',
    regarder: 'En tête, Bleu en Thème Light avec « Soft ✓ · Vivid ✓ » et ses rampes ; les cartes Couleurs de fond, Intensités et Luminosité des nuances, chacune avec son compte (3, 1 et 3 palettes concernées) et « Rétablir » inactif ; le tracé des deux courbes et les deux ◆ de Bleu, puis une colonne par nuance sous son point, Light puis Dark ; puis Minimums des promesses et Détection des couleurs proches repliées, avec leur résumé.',
    existe: true,
    atteinte: [etatDuFichier(rangee(TROIS_PALETTES)), ouvrirLaConfiguration],
  },
  {
    id: 'reglages-sans-palette',
    titre: 'Réglages communs sans palette',
    quand: 'Le designer ouvre l’engrenage sur un fichier qui n’a encore aucune palette.',
    regarder: 'Les cinq cartes sans aperçu en tête, aucune palette inventée, le tracé sans ◆, et « Aucune palette concernée » dans chaque compte.',
    existe: true,
    atteinte: [etatDuFichier(''), ouvrirLaConfiguration],
  },
  {
    id: 'courbe-hors-garantie',
    titre: 'Courbe hors garantie',
    quand: 'Le designer remonte le cran 700 clair à 0,56 : il ne tient plus 4,5 contre le cran 50.',
    regarder: 'Les deux alertes sous la table, soft et vivid, avec la teinte du pire cas et son contraste.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee(TROIS_PALETTES)),
      ouvrirLaConfiguration,
      { saisie: { dans: '[data-mode="light"][data-rang="7"]', valeur: '0,56' } },
    ],
  },
  {
    id: 'derive-liee-tailwind',
    titre: 'Color shift lié, teinte Tailwind',
    quand: 'Le designer déplie le Color shift d’une palette au préréglage, Soft et Vivid synchronisés.',
    regarder: 'Dans l’en-tête de la carte, aucun choix « Régler » : Soft et Vivid sont synchronisés ; l’onglet Teinte choisi, ses deux valeurs ; une seule ligne brisée, le pivot sur 0° dans la colonne 600, qui porte #1E6FD9, les deux poignées sur leurs rails, leurs étiquettes, les rampes sans et avec Color shift sous les mêmes colonnes ; les repères Tailwind confondus avec les pouces des réglettes ; sous les réglettes, la ligne de la butée, vide.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), deplierLaDerive],
  },
  {
    id: 'derive-deliee-libre',
    titre: 'Color shift délié et personnalisé',
    quand: 'Soft garde la teinte Tailwind, Vivid une teinte personnalisée : les profils sont désynchronisés.',
    regarder: 'Deux lignes, pleine et tiretée, les poignées marquées de l’initiale du profil réglé, et les repères Tailwind à l’écart des pouces.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([{ ...BLEU, derive: { lien: false, soft: BLEU.derive.soft, vivid: { clair: 20, sombre: -25, origine: 'libre' } } }])),
      deplierLaDerive,
    ],
  },
  {
    id: 'color-shift-saturation',
    titre: 'Color shift, saturation',
    quand: 'Bleu : le Color shift retire 40 % de saturation aux nuances claires et en ajoute 25 % aux sombres ; le designer choisit l’onglet Saturation.',
    regarder: 'L’onglet Saturation choisi, « −40 % · +25 % », la pastille de chaque onglet réglé ; l’échelle en pourcentage, ±50 % ; les rails des poignées, sans hachure quand toute la plage est sûre ; les réglettes peintes du gris au vif.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU_COLOR_SHIFT])), deplierLaDerive, ongletDuColorShift('saturation')],
  },
  {
    id: 'color-shift-luminosite',
    titre: 'Color shift, luminosité',
    quand: 'Bleu : le Color shift éclaircit les nuances claires de 0,020 et assombrit les sombres de 0,050 ; le designer choisit l’onglet Luminosité.',
    regarder: 'L’onglet Luminosité choisi, « +0,020 · −0,050 » ; l’échelle en clarté, ±0,10 ; les rails hachurés au-delà de la plage sûre ; la rampe sans Color shift et la rampe avec, plus claire à gauche et plus sombre à droite ; sous les réglettes, la ligne de la butée, vide.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU_COLOR_SHIFT])), deplierLaDerive, ongletDuColorShift('clarte')],
  },
  {
    id: 'color-shift-en-butee',
    titre: 'Color shift en butée',
    quand: 'Bleu, onglet Luminosité : le designer pousse les nuances claires à leur borne permise, puis d’un pas au-delà.',
    regarder: 'Le pouce des nuances claires posé à +0,040, contre la zone hachurée ; la ligne en ton de butée « Luminosité, nuances claires : limite atteinte à +0,040. Au-delà, deux nuances voisines se rapprocheraient à moins de 0,01 de luminosité. ».',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU])),
      deplierLaDerive,
      ongletDuColorShift('clarte'),
      { touche: { dans: '.editeur-derive .reglettes > .reglette:first-child .reglette-curseur', cle: 'End' } },
      { touche: { dans: '.editeur-derive .reglettes > .reglette:first-child .reglette-curseur', cle: 'ArrowRight' } },
    ],
  },
  {
    id: 'reglage-global-en-butee',
    titre: 'Réglage global en butée',
    quand: 'Vert, deux intensités, « Les deux » : le designer pousse la luminosité à sa borne permise, +0,005, puis d’un pas au-delà.',
    regarder: 'Le pouce de la luminosité contre sa zone hachurée ; la ligne en ton de butée « Luminosité de Soft et Vivid : limite atteinte à +0,005. Au-delà, … tomberait à …, sous 3:1. ».',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([palette('p-2b3c4d5e', 'Vert', '#16A34A')])),
      deplierLesReglages,
      { clic: '.cible-des-reglages .bascule-option:nth-child(3)', attendre: '.reglages-de-la-palette[data-limites="pretes"]' },
      { touche: { dans: '.reglages-de-la-palette > .reglette:nth-child(5) .reglette-curseur', cle: 'End' } },
      { touche: { dans: '.reglages-de-la-palette > .reglette:nth-child(5) .reglette-curseur', cle: 'ArrowRight' } },
    ],
  },
  {
    id: 'reference-hors-rampe',
    titre: 'Référence hors de la rampe',
    quand: 'La référence #0B1F4B est plus sombre que le bout sombre de la rampe.',
    regarder: 'La poignée sombre masquée, sa note sous le graphe, et le pivot dans la colonne 950, qui porte la référence.',
    existe: true,
    atteinte: [etatDuFichier(rangee([palette('p-2b7e40c1', 'Nuit', '#0B1F4B')])), deplierLaDerive],
  },
  {
    id: 'dessin-en-cours',
    titre: 'Dessin en cours',
    quand: 'Le designer clique « Générer sur Figma » dans la fiche de Bleu : le sandbox annonce le premier cadre.',
    regarder: 'La progression à la place de « Générer tout (1 palette) », et les deux onglets inertes : aucun geste possible.',
    existe: true,
    // L'ouverture de l'onglet relit l'état (demande 2) : la génération porte la demande 3.
    atteinte: [
      etatDuFichier(rangee([BLEU])),
      ouvrirLaPlanche,
      ...dessinerLaPalette,
      { message: { type: 'progression', demande: 3, fait: 0, total: 1, nom: 'Bleu' } },
    ],
  },
  {
    id: 'dessin-interrompu',
    titre: 'Dessin interrompu',
    quand: 'Figma refuse un calque au milieu du cadre de Bleu.',
    regarder: 'Le bloquant qui nomme la palette et l’erreur, dit qu’aucun cadre n’est resté, et son geste « Réessayer ».',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU])),
      ouvrirLaPlanche,
      ...dessinerLaPalette,
      { message: { type: 'dessin', demande: 3, resultat: { issue: 'interrompue', palette: BLEU.id, message: 'in set_characters: font not loaded', dessines: 0 } } },
    ],
  },
  {
    id: 'planche-sans-palette',
    titre: 'Onglet Gestion sans palette',
    quand: 'Le designer ouvre l’onglet Gestion d’un fichier sans palette.',
    regarder: 'Le bloc « Connexion à Figma » sans bilan, la page « Palettes » à créer ; « Palettes du plugin · 0 » ; le texte qui dit qu’il n’y a rien à dessiner, et le geste vers l’onglet Création.',
    existe: true,
    atteinte: [etatDuFichier(''), { clic: '#onglet-gestion' }],
  },
  {
    id: 'police-indisponible',
    titre: 'Police indisponible',
    quand: 'Inter Medium ne se charge pas : le dessin s’arrête avant tout calque.',
    regarder: 'Le bloquant qui nomme la police, et son geste « Réessayer ».',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU])),
      ouvrirLaPlanche,
      ...dessinerLaPalette,
      { message: { type: 'dessin', demande: 3, resultat: { issue: 'police', style: 'Inter Medium' } } },
    ],
  },
  {
    id: 'pastilles-des-etats',
    titre: 'Pastilles des cinq états',
    quand: 'Cinq palettes : Bleu à jour, Jaune périmée, Ardoise jamais générée, Rouge au cadre introuvable, Vert au cadre illisible.',
    regarder: 'Les pastilles des lignes « Planche » : « À jour » sur fond vert ; « À actualiser » et « Pas encore créée » en orange ; « Introuvable » et « Lecture impossible » en rouge. L’en-tête de fiche ne porte que « Modifier ». La planche introuvable invite à synchroniser et n’offre aucun geste. Chaque texte lisible sur son fond.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee(CINQ_ETATS), 'SRGB', plancheLue(
        [cadreDessine(rangee(CINQ_ETATS), BLEU, '40:2'), cadreDessine(rangee(CINQ_ETATS), JAUNE, '40:3', { empreinte: '0badc0de' })],
        { manquants: [{ palette: 'p-1a2b3c4d', cadre: '40:7', raison: 'introuvable' }, { palette: 'p-2b3c4d5e', cadre: '40:8', raison: 'illisible' }] },
      )),
      ouvrirLaPlanche,
    ],
  },
  {
    id: 'planche-a-jour',
    titre: 'Planche à jour',
    quand: 'Bleu et Jaune ont été dessinées, et la recette n’a pas changé depuis.',
    regarder: 'Deux lignes dépliées, « Modifier » seul au bord droit, chacune avec ses rampes Soft et Vivid, le ◆ de la référence, le résultat de ses garanties, puis la ligne « Planche » : « À jour », « page Palettes » et « Afficher ».',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU, JAUNE]), 'SRGB', plancheLue([cadreDessine(rangee([BLEU, JAUNE]), BLEU, '40:2'), cadreDessine(rangee([BLEU, JAUNE]), JAUNE, '40:3')])),
      ouvrirLaPlanche,
      deplier(BLEU),
      deplier(JAUNE),
    ],
  },
  {
    id: 'planche-perimee',
    titre: 'Planche périmée',
    quand: 'Le cadre de Jaune a été dessiné sur une recette d’avant ; Ardoise n’a jamais été dessinée.',
    regarder: 'Bleu, sa planche « À jour » avec « Afficher » ; Jaune, sa planche « À actualiser » avec « Actualiser » et « Afficher », de 24 px ; Ardoise, sa planche « Pas encore créée » avec « Créer la planche ».',
    existe: true,
    atteinte: [
      etatDuFichier(rangee(TROIS_PALETTES), 'SRGB', plancheLue([cadreDessine(rangee(TROIS_PALETTES), BLEU, '40:2'), cadreDessine(rangee(TROIS_PALETTES), JAUNE, '40:3', { empreinte: '0badc0de' })])),
      ouvrirLaPlanche,
      deplier(BLEU),
      deplier(JAUNE),
      deplier(TROIS_PALETTES[2]),
    ],
  },
  {
    id: 'gestion-liste',
    titre: 'Gestion, liste repliée',
    quand: 'Trois palettes dans un fichier de trois pages : Bleu à jour, Jaune périmée, Ardoise jamais dessinée.',
    regarder: 'La connexion repliée résume ses destinations. « Palettes du plugin · 3 » est ouverte : la bascule Light, Dark au bord droit, puis la liste sous ses en-têtes « Palette », « Nuances », « Tokens Figma » et « Planche » : une ligne repliée par palette, son chevron, sa teinte et son nom, sa rampe en miniature, l’état de ses tokens et celui de sa planche.',
    existe: true,
    atteinte: [gestionDeTroisPalettes(), ouvrirLaPlanche],
  },
  {
    id: 'gestion-depliee',
    titre: 'Gestion, une palette dépliée',
    quand: 'Le designer clique la ligne de Bleu.',
    regarder: 'Le chevron de Bleu tourné, ses deux états remplacés par « Modifier » au bord droit ; dessous, sa fiche : les rampes Soft et Vivid, la référence et les garanties, les lignes « Tokens Figma » et « Planche » avec leurs gestes. Jaune et Ardoise restent repliées ; le focus sur la ligne de Bleu.',
    existe: true,
    atteinte: [gestionDeTroisPalettes(), ouvrirLaPlanche, deplier(BLEU)],
  },
  {
    id: 'gestion-page-des-planches',
    titre: 'Gestion : la page des planches',
    quand: 'Le designer clique « Changer » sur la ligne « Planches ».',
    regarder: 'La carte « Page des planches » à la place du bloc, grise et sans fond ; la liste sur un fond gris plus foncé : Cover, Design system, Palettes cochée avec « 2 planches », puis « Nouvelle page » et son champ ; « Annuler » et « Enregistrer » au bord droit, « Enregistrer » inactif ; le focus sur la page cochée.',
    existe: true,
    atteinte: [gestionDeTroisPalettes(), ouvrirLaPlanche, { clic: '[data-section="connexion"] .section-bascule' },  { clic: '#panneau-gestion [data-geste="changer-la-page"]' }],
  },
  {
    id: 'page-des-planches-refusee',
    titre: 'Gestion : un nom de page déjà pris',
    quand: 'Le designer saisit « Palettes » comme nom de page neuve, puis enregistre : une page du fichier porte ce nom.',
    regarder: 'La carte restée ouverte, « Nouvelle page » cochée, et sous la liste le message qui nomme la page et propose de la choisir dans la liste ou de donner un autre nom.',
    existe: true,
    // L'ouverture de l'onglet relit l'état (demande 2) : le choix de la page porte la demande 3.
    atteinte: [
      gestionDeTroisPalettes(),
      ouvrirLaPlanche,
      { clic: '[data-section="connexion"] .section-bascule' },

      { clic: '#panneau-gestion [data-geste="changer-la-page"]' },
      { saisie: { dans: '#panneau-gestion .choix .input', valeur: 'Palettes' } },
      { clic: '#panneau-gestion [data-geste="enregistrer"]' },
      { message: { type: 'page-choisie', demande: 3, issue: { issue: 'nom-pris', nom: 'Palettes' } } },
    ],
  },
  {
    id: 'tokens-jamais-ecrits',
    titre: 'Tokens pas encore écrits',
    quand: 'Aucune palette n’est écrite dans les variables, et la destination n’a jamais été confirmée.',
    regarder: 'Les trois lignes dépliées. Dans chaque fiche, la ligne « Tokens Figma » avant la ligne « Planche » : « Pas encore écrits », « 44 variables à créer » et « Écrire dans les tokens » en bleu.',
    existe: true,
    atteinte: [gestionDeTroisPalettes(), ouvrirLaPlanche, deplier(BLEU), deplier(JAUNE), deplier(TROIS_PALETTES[2])],
  },
  {
    id: 'tokens-a-jour',
    titre: 'Tokens à jour',
    quand: 'Bleu et Jaune sont écrites dans la collection « primitives », et leurs planches sont à jour.',
    regarder: 'Deux fiches : « Tokens Figma », « À jour », « 44 variables », sans geste.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU, JAUNE]), 'SRGB', plancheLue([cadreDessine(rangee([BLEU, JAUNE]), BLEU, '40:2'), cadreDessine(rangee([BLEU, JAUNE]), JAUNE, '40:3')]), 1, tokensEcrits(rangee([BLEU, JAUNE]), [BLEU, JAUNE])),
      ouvrirLaPlanche,
      deplier(BLEU),
      deplier(JAUNE),
    ],
  },
  {
    id: 'tokens-a-mettre-a-jour',
    titre: 'Tokens à mettre à jour',
    quand: 'Deux couleurs de Jaune ont changé dans le plugin depuis la dernière écriture.',
    regarder: 'Jaune : « Tokens Figma », « À mettre à jour », « 2 couleurs ont changé dans le plugin » et « Mettre à jour » en bleu, sans encart.',
    existe: true,
    atteinte: [
      gestionDeTroisPalettes(tokensEcrits(rangee(TROIS_PALETTES), [BLEU, TROIS_PALETTES[1]], { ecrite: fausser(JAUNE, { 'vivid/light/700': '#8A5A00', 'vivid/light/800': '#6E4500' }) })),
      ouvrirLaPlanche,
      deplier(JAUNE),
    ],
  },
  {
    id: 'tokens-introuvables',
    titre: 'Tokens introuvables',
    quand: 'Trois variables de Jaune ont été supprimées du fichier.',
    regarder: 'Jaune : « Tokens Figma », « Introuvables » en rouge, « 3 variables ont disparu du fichier » et « Mettre à jour ».',
    existe: true,
    atteinte: [
      gestionDeTroisPalettes(tokensEcrits(rangee(TROIS_PALETTES), [BLEU, TROIS_PALETTES[1]], { disparue: (entree, palette) => palette.id === JAUNE.id && ['soft/light/50', 'soft/light/100', 'soft/light/200'].includes(entree.cle) })),
      ouvrirLaPlanche,
      deplier(JAUNE),
    ],
  },
  {
    id: 'tokens-modifies',
    titre: 'Couleurs changées dans Figma',
    quand: 'Le designer a changé à la main deux variables de Jaune dans Figma.',
    regarder: 'Jaune dépliée seule, sa décision attendant : « Tokens Figma », « Modifiés dans Figma », « 2 couleurs changées à la main », sans geste sur la ligne ; dessous, l’encart d’avertissement : « 2 couleurs de Jaune ne sont plus celles du plugin. », chaque variable avec sa valeur dans Figma et sa valeur dans le plugin, puis « Laisser les couleurs de Figma » et « Remettre les couleurs du plugin ».',
    existe: true,
    atteinte: [
      gestionDeTroisPalettes(tokensEcrits(rangee(TROIS_PALETTES), [BLEU, TROIS_PALETTES[1]], { lue: fausser(JAUNE, { 'vivid/light/700': '#8A5A00', 'vivid/light/800': '#6E4500' }) })),
      ouvrirLaPlanche,
    ],
  },
  {
    id: 'premiere-ecriture',
    titre: 'Première écriture',
    quand: 'La destination est confirmée ; le designer clique « Écrire dans les tokens » sur Ardoise.',
    regarder: 'L’encart sous les lignes de sortie d’Ardoise : « Écrire Ardoise dans les tokens Figma ? », 44 variables, la collection « primitives », le premier et le dernier nom, « Aucune variable existante n’est modifiée. », puis « Annuler » et « Écrire 44 variables », qui porte le focus. La ligne « Tokens Figma » n’a plus de geste.',
    existe: true,
    atteinte: [
      gestionDeTroisPalettes(tokensEcrits(rangee(TROIS_PALETTES), [BLEU, TROIS_PALETTES[1]])),
      ouvrirLaPlanche,
      deplier(TROIS_PALETTES[2]),
      { clic: '#panneau-gestion .palette-depliable[data-palette] [data-geste="ecrire"]' },
    ],
  },
  {
    id: 'destination-ouverte',
    titre: 'Destination des tokens',
    quand: 'Le designer clique « Changer » sur la ligne « Tokens ».',
    regarder: 'La carte « Destination des tokens » à la place du bloc, grise et sans fond. La liste des collections sur un fond gris plus foncé : « Nouvelle collection » et son champ, « primitives » cochée avec son nombre de variables, « Brand » et « 48 variables ». « Groupe » et « Thèmes Light et Dark » sur une rangée, « Dans le chemin » pressé. La simulation : « 44 variables · 1 mode », le panneau au nom de la collection, quatre chemins, chacun avec « 50 … 950 » et son compte de 11 variables. « Annuler » et « Enregistrer » au bord droit.',
    existe: true,
    atteinte: [
      gestionDeTroisPalettes(tokensEcrits(rangee(TROIS_PALETTES), [BLEU])),
      ouvrirLaPlanche,
      { clic: '[data-section="connexion"] .section-bascule' },

      { clic: '#panneau-gestion [data-geste="changer-la-destination"]' },
    ],
  },
  {
    id: 'destination-en-modes',
    titre: 'Destination des tokens, thèmes en modes',
    quand: 'Dans la carte de la destination, le designer presse « En modes ».',
    regarder: 'La simulation suit le choix : « 22 variables · 2 modes », « modes Light, Dark » en tête et deux chemins, Soft et Vivid, sans segment de thème.',
    existe: true,
    atteinte: [
      gestionDeTroisPalettes(tokensEcrits(rangee(TROIS_PALETTES), [BLEU])),
      ouvrirLaPlanche,
      { clic: '[data-section="connexion"] .section-bascule' },

      { clic: '#panneau-gestion [data-geste="changer-la-destination"]' },
      { clic: '#panneau-gestion .carte-ouverte .bascule-option:nth-child(2)' },
    ],
  },
  {
    id: 'destination-refusee',
    titre: 'Destination refusée',
    quand: 'Le designer saisit le groupe « colors.brand », puis enregistre : Figma refuse le point dans un nom de variable.',
    regarder: 'La carte restée ouverte, et sous la simulation le message « Groupe », qui nomme les caractères refusés et demande de les retirer.',
    existe: true,
    // L'ouverture de l'onglet relit l'état (demande 2) : le rangement de la destination porte la demande 3.
    atteinte: [
      gestionDeTroisPalettes(tokensEcrits(rangee(TROIS_PALETTES), [BLEU])),
      ouvrirLaPlanche,
      { clic: '[data-section="connexion"] .section-bascule' },

      { clic: '#panneau-gestion [data-geste="changer-la-destination"]' },
      { saisie: { dans: '#panneau-gestion .colonnes-de-base .input', valeur: 'colors.brand' } },
      { clic: '#panneau-gestion .carte-ouverte [data-geste="enregistrer"]' },
      { message: { type: 'destination-rangee', demande: 3, issue: { issue: 'invalide', refus: 'groupe' } } },
    ],
  },
  {
    id: 'nom-deja-pris',
    titre: 'Nom de variable déjà pris',
    quand: 'Le designer écrit Ardoise ; la collection porte déjà une variable « colors/ardoise/soft/light/50 » que le plugin n’a pas écrite.',
    regarder: 'Sous l’encart d’Ardoise, resté ouvert, le message « Tokens non écrits : Ardoise », qui nomme la variable et propose de renommer la palette ou de changer le groupe.',
    existe: true,
    atteinte: [
      gestionDeTroisPalettes(tokensEcrits(rangee(TROIS_PALETTES), [BLEU, TROIS_PALETTES[1]])),
      ouvrirLaPlanche,
      deplier(TROIS_PALETTES[2]),
      { clic: '#panneau-gestion .palette-depliable[data-palette] [data-geste="ecrire"]' },
      { clic: '#panneau-gestion .palette-depliable[data-palette] [data-geste="confirmer-ecriture"]' },
      { message: { type: 'variables-ecrites', demande: 3, resultat: { issue: 'ecrites', palettes: [{ palette: 'p-5c1d0e77', issue: 'nom-pris', nom: 'colors/ardoise/soft/light/50' }] } } },
    ],
  },
  {
    id: 'palette-supprimee-avec-variables',
    titre: 'Palette supprimée, variables restées',
    quand: 'Ardoise a été supprimée du plugin ; son cadre et ses 44 variables sont restés dans Figma. Le designer clique « Supprimer les variables… ».',
    regarder: 'La carte d’Ardoise, d’un orange proche du fond : la phrase qui compte ses variables, « Afficher dans Figma » et « Supprimer définitivement », puis la confirmation « Supprimer 44 variables de Figma ? », ses gestes « Supprimer 44 variables », qui porte le focus, et « Annuler ».',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU]), 'SRGB', plancheLue([cadreDessine(rangee([BLEU]), BLEU, '40:2'), CADRES_SUPPRIMES[0]]), 1, tokensEcrits(rangee([BLEU]), [BLEU, palette('p-5c1d0e77', 'Ardoise', '#6B7280')])),
      ouvrirLaPlanche,
      { clic: '.carte-supprimee [data-geste="supprimer-variables"]' },
    ],
  },
  {
    id: 'variables-supprimees',
    titre: 'Variables supprimées',
    quand: 'Le designer confirme la suppression des variables d’Ardoise ; le sandbox les retire.',
    regarder: 'La ligne qui dit que 44 variables sont supprimées et que Ctrl+Z dans Figma les rétablit ; la confirmation refermée.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU]), 'SRGB', plancheLue([cadreDessine(rangee([BLEU]), BLEU, '40:2'), CADRES_SUPPRIMES[0]]), 1, tokensEcrits(rangee([BLEU]), [BLEU, palette('p-5c1d0e77', 'Ardoise', '#6B7280')])),
      ouvrirLaPlanche,
      { clic: '.carte-supprimee [data-geste="supprimer-variables"]' },
      { clic: '.carte-supprimee [data-geste="confirmer-variables"]' },
      { message: { type: 'variables-retirees', demande: 3, issue: { issue: 'retirees', retirees: 44 } } },
    ],
  },
  {
    id: 'palettes-du-fichier',
    titre: 'Palettes du fichier',
    quand: 'Les variables du fichier portent deux palettes que le plugin n’a pas écrites : slate, et emerald dans une collection à deux modes.',
    regarder: 'Sous les lignes du plugin, dans la même liste, l’intertitre « Déjà dans le fichier · 2 » et sa phrase. Deux lignes à la teinte en tirets, chacune avec sa rampe et l’étiquette « Variables du fichier ». slate dépliée : « Modifier dans le plugin » au bord droit, la rampe du premier mode en tirets, « primitives / slate / 50 … 950 » et « 11 couleurs · 1 mode ».',
    existe: true,
    atteinte: [
      gestionDeTroisPalettes(avecLesPalettesDuFichier(tokensEcrits(rangee(TROIS_PALETTES), [BLEU, TROIS_PALETTES[1]]))),
      ouvrirLaPlanche,
      deplierLeFichier,
    ],
  },
  {
    id: 'fichier-vide-avec-variables',
    titre: 'Fichier vide avec variables',
    quand: 'Le fichier n’a aucune palette du plugin, et ses variables en portent deux.',
    regarder: 'L’encart au fond bleuté, puis dessous la ligne « Ce fichier porte déjà 2 palettes dans ses variables. » et son lien « Les voir dans Gestion ».',
    existe: true,
    atteinte: [etatDuFichier('', 'SRGB', PLANCHE_VIDE, 1, avecLesPalettesDuFichier(VARIABLES_VIDES))],
  },
  {
    id: 'reprise-recalculee',
    titre: 'Reprise recalculée',
    quand: 'Le designer a cliqué « Modifier dans le plugin » sur slate : Création s’ouvre sur la palette reprise.',
    regarder: 'Sous le titre « Palette slate », l’encart : « Palette reprise des variables du fichier », la rampe « Fichier » et la rampe « Plugin » l’une sous l’autre, la bascule « Recalculées · Telles quelles » avec « Recalculées » pressé et le nombre de couleurs qui changeront. Les cartes de réglage suivent, sans le choix des intensités.',
    existe: true,
    atteinte: [((reprise) => etatDuFichier(rangee([reprise.palette, BLEU]), 'SRGB', PLANCHE_VIDE, 1, reprise.fichier))(repriseDeSlate(false))],
  },
  {
    id: 'reprise-telle-quelle',
    titre: 'Reprise telle quelle',
    quand: 'Dans l’encart de la palette reprise, le designer presse « Telles quelles ».',
    regarder: '« Telles quelles » pressé ; les deux rampes identiques ; « Aucune couleur ne change. » ; le nom seul dans la carte de configuration ; ni « Réglage global » ni « Color shift » ; le pied « Palette libre ».',
    existe: true,
    atteinte: [((reprise) => etatDuFichier(rangee([reprise.palette, BLEU]), 'SRGB', PLANCHE_VIDE, 1, reprise.fichier))(repriseDeSlate(true))],
  },
  {
    id: 'reprise-dans-gestion',
    titre: 'Reprise dans Gestion',
    quand: 'Dans Gestion, le designer clique « Mettre à jour » sur la ligne des tokens de slate, reprise et recalculée.',
    regarder: 'La fiche de slate parmi les palettes du plugin : « Tokens Figma », « À mettre à jour », « primitives / slate » et le nombre de couleurs qui changent. Dessous, l’encart de remplacement : « Remplacer N couleurs de slate dans Figma ? », chaque variable avec sa valeur dans Figma et sa valeur dans le plugin, six au plus, « Et N autres. Les variables gardent leur nom et leurs liaisons. », puis « Annuler » et « Remplacer N couleurs ». L’intertitre « Déjà dans le fichier · 1 » ne précède plus que brand/emerald.',
    existe: true,
    atteinte: [
      ((reprise) => etatDuFichier(rangee([reprise.palette, BLEU]), 'SRGB', PLANCHE_VIDE, 1, reprise.fichier))(repriseDeSlate(false)),
      ouvrirLaPlanche,
      { clic: '#panneau-gestion .palette-depliable[data-palette] [data-geste="deplier"]' },
      { clic: '#panneau-gestion .palette-depliable[data-palette] [data-geste="mettre-a-jour"]' },
    ],
  },
  {
    id: 'reprise-partielle',
    titre: 'Reprise partiellement écrite',
    quand: 'Une variable étrangère occupe slate/dark/50 après écriture des autres nuances.',
    regarder: 'La palette reste À mettre à jour ; le constat nomme slate/dark/50 et le geste de renommage. La ligne précise Thèmes dans le chemin.',
    existe: true,
    atteinte: [((reprise) => etatDuFichier(rangee([reprise.palette, BLEU]), 'SRGB', PLANCHE_VIDE, 1, reprise.fichier))(reprisePartielleDeSlate()), ouvrirLaPlanche],
  },
  {
    id: 'ancienne-sortie-des-tokens',
    titre: 'Ancienne destination des tokens',
    quand: 'Une migration a conservé les variables de la destination précédente.',
    regarder: 'La carte de l’ancienne sortie nomme son chemin et propose Supprimer les variables avec une confirmation propre.',
    existe: true,
    atteinte: [gestionDeTroisPalettes(avecAncienneSortie(tokensEcrits(rangee(TROIS_PALETTES), [BLEU]), BLEU)), ouvrirLaPlanche],
  },
  {
    id: 'reprise-refusee',
    titre: 'Reprise refusée',
    quand: 'Le designer clique « Modifier dans le plugin » sur slate ; le fichier ne porte plus ces variables.',
    regarder: 'Sous le bloc de la connexion, le message « Palette non reprise », qui dit que le fichier ne porte plus la palette et demande de synchroniser ; « Modifier dans le plugin » de nouveau actif.',
    existe: true,
    // L'ouverture de l'onglet relit l'état (demande 2) : la reprise porte la demande 3.
    atteinte: [
      gestionDeTroisPalettes(avecLesPalettesDuFichier(tokensEcrits(rangee(TROIS_PALETTES), [BLEU, TROIS_PALETTES[1]]))),
      ouvrirLaPlanche,
      deplierLeFichier,

      { clic: '#panneau-gestion [data-geste="reprendre"]' },
      { message: { type: 'reprise', demande: 3, issue: { issue: 'palette-introuvable' } } },
    ],
  },
  {
    id: 'bibliotheques',
    titre: 'Bibliothèques',
    quand: 'Deux bibliothèques activées publient chacune une collection « primitive base » ; la première porte la palette gray.',
    regarder: 'Après slate et brand/emerald, l’intertitre « Dans les bibliothèques · 1 » et sa phrase, puis la ligne de gray, des pastilles vides. Dépliée : « Copier dans le plugin » au bord droit, des pastilles vides en tirets, « primitive base (323 variables) », « gray / 50 … 950 », « 11 couleurs · Couleurs lues à la copie ».',
    existe: true,
    atteinte: [
      gestionDeTroisPalettes(avecLesBibliotheques(avecLesPalettesDuFichier(tokensEcrits(rangee(TROIS_PALETTES), [BLEU, TROIS_PALETTES[1]])))),
      ouvrirLaPlanche,
      deplierLaBibliotheque,
    ],
  },
  {
    id: 'destination-avec-bibliotheques',
    titre: 'Destination des tokens, collections de bibliothèque',
    quand: 'Sur le même fichier, le designer clique « Changer » sur la ligne « Tokens ».',
    regarder: 'Dans la liste des collections, après les collections locales : deux « primitive base » grisées, l’étiquette « Bibliothèque », « 323 variables · lecture seule » et « 6 variables · lecture seule », leur choix inactif.',
    existe: true,
    atteinte: [
      gestionDeTroisPalettes(avecLesBibliotheques(avecLesPalettesDuFichier(tokensEcrits(rangee(TROIS_PALETTES), [BLEU, TROIS_PALETTES[1]])))),
      ouvrirLaPlanche,
      { clic: '[data-section="connexion"] .section-bascule' },

      { clic: '#panneau-gestion [data-geste="changer-la-destination"]' },
    ],
  },
  {
    id: 'copie-de-bibliotheque',
    titre: 'Copie de bibliothèque',
    quand: 'Le designer clique « Copier dans le plugin » sur la palette gray de la bibliothèque.',
    regarder: 'Dans la fiche de gray, l’encart : « Copier gray dans le plugin ? », « 11 variables de la bibliothèque seront ajoutées au fichier. », puis « Annuler » et « Copier », qui porte le focus.',
    existe: true,
    atteinte: [
      gestionDeTroisPalettes(avecLesBibliotheques(tokensEcrits(rangee(TROIS_PALETTES), [BLEU, TROIS_PALETTES[1]]))),
      ouvrirLaPlanche,
      deplierLaBibliotheque,
      { clic: '#panneau-gestion [data-geste="copier"]' },
    ],
  },
  {
    id: 'copie-refusee',
    titre: 'Copie de bibliothèque refusée',
    quand: 'Le designer confirme la copie de gray ; Figma refuse l’import des variables de la bibliothèque.',
    regarder: 'Sous le bloc de la connexion, le message « Palette non copiée », qui dit que Figma n’a pas rendu les variables et demande de vérifier que la bibliothèque est activée, avec le détail de l’erreur replié ; la confirmation restée ouverte dans la fiche.',
    existe: true,
    // L'ouverture de l'onglet relit l'état (demande 2) : la copie porte la demande 3.
    atteinte: [
      gestionDeTroisPalettes(avecLesBibliotheques(tokensEcrits(rangee(TROIS_PALETTES), [BLEU, TROIS_PALETTES[1]]))),
      ouvrirLaPlanche,
      deplierLaBibliotheque,
      { clic: '#panneau-gestion [data-geste="copier"]' },
      { clic: '#panneau-gestion [data-geste="confirmer-copie"]' },
      { message: { type: 'copie', demande: 3, issue: { issue: 'bibliotheque-illisible', message: 'in importVariableByKeyAsync: could not find variable' } } },
    ],
  },
  {
    id: 'bibliotheques-illisibles',
    titre: 'Bibliothèques illisibles',
    quand: 'Figma n’a pas rendu les collections des bibliothèques.',
    regarder: 'Gestion fonctionne : lignes, tokens et planches. Sous la liste, la notice « Bibliothèques », qui dit que leurs palettes ne paraissent pas et demande de synchroniser.',
    existe: true,
    atteinte: [
      gestionDeTroisPalettes({ ...tokensEcrits(rangee(TROIS_PALETTES), [BLEU, TROIS_PALETTES[1]]), bibliotheques: { collections: [], palettes: [], lisibles: false } }),
      ouvrirLaPlanche,
    ],
  },
  {
    id: 'lecture-des-variables-refusee',
    titre: 'Lecture des variables refusée',
    quand: 'Figma refuse de relire les variables locales.',
    regarder: 'Le refus dans Gestion avec le geste Synchroniser ; les palettes déjà lues restent affichées.',
    existe: true,
    atteinte: [
      gestionDeTroisPalettes(tokensEcrits(rangee(TROIS_PALETTES), [BLEU])),
      ouvrirLaPlanche,
      { message: { type: 'etat-refuse', demande: 2, message: 'variables indisponibles' } },
    ],
  },
  {
    id: 'palette-supprimee',
    titre: 'Palette supprimée',
    quand: 'Les palettes Ardoise et Rouge ont été supprimées ; leurs cadres sont restés dans Figma.',
    regarder: 'Une carte par palette supprimée sous les fiches, d’un orange proche du fond de la page : son nom, sa phrase, « Afficher dans Figma » et « Supprimer définitivement », de la hauteur des gestes des fiches.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU]), 'SRGB', plancheLue([cadreDessine(rangee([BLEU]), BLEU, '40:2'), ...CADRES_SUPPRIMES])),
      ouvrirLaPlanche,
    ],
  },
  {
    id: 'palette-supprimee-a-reprendre',
    titre: 'Palette supprimée, reprenable depuis les variables',
    quand: 'Poppy n’est plus dans la recette ; son cadre est resté sur la planche, et le suivi la lie par une reprise à quatre groupes de variables, Soft et Vivid, Light et Dark.',
    regarder: 'La carte de Poppy sous les fiches : sa phrase, puis « Afficher dans Figma », « Supprimer définitivement » et « Reprendre depuis les variables » sur une seule ligne. Les quatre groupes Poppy restent sous « Déjà dans le fichier ».',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU]), 'SRGB', plancheLue([cadreDessine(rangee([BLEU]), BLEU, '40:2'), CADRE_DE_POPPY]), 1, variablesDePoppy()),
      ouvrirLaPlanche,
    ],
  },
  {
    id: 'palette-groupee-du-fichier',
    titre: 'Palette groupée dans « Déjà dans le fichier »',
    quand: 'Le fichier porte Poppy en quatre groupes de variables (Soft et Vivid, Light et Dark), sans que le plugin les suive, à côté des palettes seules slate et emerald.',
    regarder: 'Sous « Déjà dans le fichier · 3 », une seule ligne Poppy suivie de « Soft et Vivid, Light et Dark », puis les lignes slate et emerald, qui gardent leur ligne habituelle. Poppy déplié : « Modifier dans le plugin », sans « Copier ».',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU]), 'SRGB', PLANCHE_VIDE, 1, variablesDuFichierAvecPoppy()),
      ouvrirLaPlanche,
      { clic: '#panneau-gestion .palette-depliable[data-cle^="fichier:"] [data-geste="deplier"]' },
    ],
  },
  {
    id: 'palette-reprise-sous-son-identifiant',
    titre: 'Palette reprise sous son identifiant',
    quand: 'Le designer a cliqué « Reprendre depuis les variables » sur la carte de Poppy ; le sandbox a rangé la recette, et l’état relu la porte.',
    regarder: 'Plus de carte « Palette supprimée du plugin » pour Poppy, plus de groupe Poppy sous « Déjà dans le fichier », et une fiche Poppy dans la liste du plugin, avec son cadre.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU, POPPY]), 'SRGB', plancheLue([cadreDessine(rangee([BLEU, POPPY]), BLEU, '40:2'), cadreDessine(rangee([BLEU, POPPY]), POPPY, '40:8')]), 1, variablesDePoppy()),
      ouvrirLaPlanche,
    ],
  },
  {
    id: 'cadre-supprime',
    titre: 'Cadre supprimé définitivement',
    quand: 'Le designer clique « Supprimer définitivement » sur la carte d’Ardoise ; le sandbox retire le cadre.',
    regarder: 'La carte d’Ardoise disparue, celle de Rouge restante avec le focus sur « Afficher dans Figma », et la ligne qui dit que Ctrl+Z dans Figma rétablit le cadre.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU]), 'SRGB', plancheLue([cadreDessine(rangee([BLEU]), BLEU, '40:2'), ...CADRES_SUPPRIMES])),
      ouvrirLaPlanche,
      { clic: '.carte-supprimee[data-cadre="40:4"] [data-geste="supprimer"]' },
      { message: { type: 'retrait', demande: 3, issue: { issue: 'retire' } } },
    ],
  },
  {
    id: 'copie-de-cadre',
    titre: 'Copie de cadre',
    quand: 'Le designer a dupliqué le cadre de Bleu sur la planche.',
    regarder: 'La fiche de Bleu « À jour », et la notice de la copie, qui dit que le plugin ne met à jour que le cadre d’origine.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU]), 'SRGB', plancheLue([cadreDessine(rangee([BLEU]), BLEU, '40:2'), cadreDessine(rangee([BLEU]), BLEU, '40:5', { nom: 'Bleu copie', possede: false })])),
      ouvrirLaPlanche,
    ],
  },
  {
    id: 'calques-etrangers',
    titre: 'Calques étrangers',
    quand: 'Le designer a posé une note et une flèche dans le cadre périmé de Bleu, puis clique « Actualiser » sur la ligne « Planche ».',
    regarder: 'La confirmation qui nomme les deux calques, et ses gestes « Redessiner quand même » et « Annuler ».',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU]), 'SRGB', plancheLue([cadreDessine(rangee([BLEU]), BLEU, '40:2', { empreinte: '0badc0de' })])),
      ouvrirLaPlanche,
      ...dessinerLaPalette,
      {
        message: {
          type: 'dessin',
          demande: 3,
          resultat: { issue: 'etrangers', cadres: [{ palette: BLEU.id, calques: [{ id: '40:7', nom: 'Note' }, { id: '40:8', nom: 'Flèche' }] }] },
        },
      },
    ],
  },
  {
    id: 'document-display-p3',
    titre: 'Document Display P3',
    quand: 'Le fichier est en Display P3, et Bleu y a été dessinée.',
    regarder: 'La notice qui dit que la pipette lit des valeurs P3, et de copier l’hexa depuis la carte.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU]), 'DISPLAY_P3', plancheLue([cadreDessine(rangee([BLEU]), BLEU, '40:2', { profil: 'DISPLAY_P3' })])),
      ouvrirLaPlanche,
    ],
  },
  {
    id: 'import-invalide',
    titre: 'Import invalide',
    quand: 'Le designer importe un fichier dont le fond sombre a cinq chiffres et la courbe claire remonte au cran 500.',
    regarder: 'Le bloquant sous les gestes de la recette, qui nomme le fichier, compte les champs invalides et dit que la recette du fichier reste intacte.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), ouvrirLaPlanche, importer(recetteCassee())],
  },
  {
    id: 'ecart-d-import',
    titre: 'Écart d’import',
    quand: 'Bleu et Jaune sont à jour sur la planche ; le fichier importé renomme Bleu, retire Jaune, ajoute Ardoise et relève le seuil de texte.',
    regarder: 'La confirmation : palettes ajoutées et retirées, « Palette à modifier : Bleu roi (nom) », « minimum des textes », les lignes Couleurs et Minimums, « Sur la planche : 1 cadre passera « À actualiser » (Bleu roi) ; 1 cadre restera sans palette (Jaune) », puis ses gestes.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU, JAUNE]), 'SRGB', plancheLue([cadreDessine(rangee([BLEU, JAUNE]), BLEU, '40:2'), cadreDessine(rangee([BLEU, JAUNE]), JAUNE, '40:3')])),
      ouvrirLaPlanche,
      importer(rangee([{ ...BLEU, nom: 'Bleu roi' }, palette('p-5c1d0e77', 'Ardoise', '#6B7280')], (recette) => ({ ...recette, seuils: { ...recette.seuils, texte: 7 } }))),
    ],
  },
  {
    id: 'creation-ouverte',
    titre: 'Création ouverte',
    quand: 'Le designer clique « Nouvelle palette » : la création s’ouvre sous le sélecteur.',
    regarder: 'La carte « Nouvelle palette » en disposition P2 : nom et couleur de référence sur une ligne, puis Modèle Standard pressé, puis les deux cartes d’intensités, « Une intensité » choisie, sans rampe avant un code lisible ; « Créer la palette » puis « Annuler » à gauche, le focus dans le code.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), { clic: '.bouton-de-barre' }],
  },
  {
    id: 'reference-soft',
    titre: 'Référence Soft',
    quand: 'Une référence peu intense, #A0B599 : Soft la porte, dans les deux thèmes. Le designer déplie le Color shift.',
    regarder: 'La ligne « Référence : Soft · nuance 400 », le ◆ dans la pastille Soft 400, puis dans le Color shift la ligne et les rampes de Soft, et le pivot dans la colonne 400.',
    existe: true,
    atteinte: [etatDuFichier(rangee([palette('p-6a0b5990', 'Sauge', '#A0B599')])), deplierLaDerive],
  },
  {
    id: 'reference-vivid',
    titre: 'Référence Vivid',
    quand: 'Une référence intense, #A855F7 : Vivid la porte, en 600 en Light et en 700 en Dark. Le designer passe au thème Dark.',
    regarder: 'Le ◆ dans la pastille Vivid 700 du thème Dark, la ligne « Référence : Vivid · nuance 700 », et la garantie manquée que l’ancrage fait apparaître.',
    existe: true,
    atteinte: [etatDuFichier(rangee([palette('p-a855f700', 'Violet', '#A855F7')])), montrerLeThemeDark],
  },
  {
    id: 'fond-personnalise',
    titre: 'Fond personnalisé',
    quand: 'Le fond du thème Light est un jaune saturé, #FFD84D : le nuancier le porte.',
    regarder: 'La surface peinte de #FFD84D, ses numéros et ses noms de profil lisibles dessus, et le point à vérifier sur le fond.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU], (recette) => ({ ...recette, fonds: { ...recette.fonds, light: '#FFD84D' } })))],
  },
  {
    id: 'generation-reussie',
    titre: 'Génération réussie',
    quand: 'Bleu vient d’être générée depuis sa fiche, et l’état du fichier est relu.',
    regarder: 'La fiche de Bleu, sa planche « À jour » avec « Afficher », sans message de succès empilé.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU])),
      ouvrirLaPlanche,
      ...dessinerLaPalette,
      { message: { type: 'dessin', demande: 3, resultat: { issue: 'dessinee', page: PAGE_DE_LA_PLANCHE, cadres: [{ palette: BLEU.id, cadre: '40:2' }], peints: [] } } },
      etatDuFichier(rangee([BLEU]), 'SRGB', plancheLue([cadreDessine(rangee([BLEU]), BLEU, '40:2')]), 4),
    ],
  },
  {
    id: 'palette-de-base-forcee',
    titre: 'Palette de base forcée',
    quand: 'Le designer force Soft sur une référence saturée, #1E6FD9, qu’Auto confiait à Vivid.',
    regarder: 'Soft pressé sous « Référence exacte dans », sous le segment « Deux » des intensités, le ◆ passé dans la rangée Soft avec le même code, et le résumé « Référence dans Soft » de la carte Intensités.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), { clic: '[aria-label="Configuration de la palette"] [aria-label="Référence exacte dans"] .bascule-option:nth-child(2)' }],
  },
  {
    id: 'palette-modifiee-depuis-l-ouverture',
    titre: 'Palette modifiée depuis son ouverture',
    quand: 'Le designer force Soft sur Bleu, puis le rangement aboutit : la palette n’est plus celle de son ouverture.',
    regarder: 'Sous la rangée de la liste, « Nouvelle palette » et « … », « Annuler les modifications » en bouton discret, calé à droite ; « Rétablir » absent. « Supprimer la palette » reste dans le menu « … ».',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU])),
      { clic: '[aria-label="Configuration de la palette"] [aria-label="Référence exacte dans"] .bascule-option:nth-child(2)' },
      { message: { type: 'rangement', demande: 2, issue: { issue: 'rangee', empreinte: '5e0c1a7b' } } },
    ],
  },
  {
    id: 'palette-apres-l-annulation',
    titre: 'Palette juste après l’annulation',
    quand: 'Le designer force Soft sur Bleu, puis clique sur « Annuler les modifications ». L’aperçu retrouve l’état d’ouverture.',
    regarder: 'À la place d’« Annuler les modifications », « Rétablir » en bouton discret, calé à droite ; la référence exacte est revenue à Auto.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU])),
      { clic: '[aria-label="Configuration de la palette"] [aria-label="Référence exacte dans"] .bascule-option:nth-child(2)' },
      { message: { type: 'rangement', demande: 2, issue: { issue: 'rangee', empreinte: '5e0c1a7b' } } },
      { clic: '.barre-annulation button:not([hidden])' },
      { message: { type: 'rangement', demande: 3, issue: { issue: 'rangee', empreinte: '5e0c1a7c' } } },
    ],
  },
  {
    id: 'garanties-respectees',
    titre: 'Garanties respectées',
    quand: 'Bleu tient toutes ses garanties, texte des boutons blanc en Light ; le designer ouvre Vérification : la carte est sur le texte des boutons.',
    regarder: 'Le verdict d’avertissement, « 64 garanties tenues » et le point à vérifier de Bleu ; la carte fixe, sans chevron et sans thème dans son en-tête : le thème se choisit dans la ligne du titre « Palette Bleu », par la bascule « Aperçu » Light, Dark ; en tête du corps, une rangée dont le choix « Afficher », calé à droite, porte les segments « Soft ✓ » et « Vivid ✓ », Vivid pressé, sept lignes sans numéro, « Textes lisibles » puis « Éléments visibles », sous les quatre colonnes « sur la page », default, hover et pressed, la réglette avec ses deux repères, page et boutons, et les numéros sous chaque spécimen ; le pied et « Passer à Gestion ».',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), ouvrirLaVerification],
  },
  {
    id: 'garantie-en-echec',
    titre: 'Garantie en échec',
    quand: 'Le texte des boutons du thème Light est noir : le noir sur la 700 de Bleu manque 4,5:1 en Light.',
    regarder: 'Dans Vérification : en tête du corps de la carte, calé à droite, le libellé « Afficher » et les segments « Soft ✓ » et « Vivid ✗ 1 », Vivid pressé, et aucun thème dans l’en-tête de la carte ; la ligne en échec choisie d’office, son arc de la couleur de danger, l’état fautif et ses liens vers les réglages.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU, JAUNE], texteNoirEnLight)), ouvrirLaVerification],
  },
  {
    id: 'garantie-dark-inverse-g1',
    titre: 'Garantie en échec, Dark inversé',
    quand: 'Le texte des boutons du thème Dark est blanc, donc inversé ; la palette Rouge, référence #D94635, ancrée sur solid/default, manque G1 : le texte blanc ne tient pas 4,5:1 sur le bouton (4,31:1).',
    regarder: 'La carte en thème Dark : la ligne du texte des boutons en échec, choisie d’office, son arc de la couleur de danger, le bloc d’échec dessous et son lien « Ajuster la référence ».',
    existe: true,
    atteinte: [etatDuFichier(rangee([ROUGE_ANCRE], avecLeTexteDesBoutons('blanc', 'blanc'))), montrerLeThemeDark, ouvrirLaVerification],
  },
  {
    id: 'garantie-autre-theme',
    titre: 'Garantie de l’autre thème',
    quand: 'La carte des garanties montre le thème Dark, et le thème Light a des garanties manquées : le designer suit la ligne qui les compte.',
    regarder: 'La carte revenue au thème Light : « Light » pressé dans la bascule « Aperçu » de la ligne du titre, la carte sans thème dans son en-tête, les échecs de ce thème dans la liste, et « Revenir au thème Dark » sous elle.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU, JAUNE], texteNoirEnLight)), ouvrirLaVerification, montrerLeThemeDark, { clic: '.autre-theme .lien-de-constat' }],
  },
  {
    id: 'detail-de-la-reference',
    titre: 'Détail de la référence',
    quand: 'Le designer choisit la nuance Vivid 600 de Bleu, qui porte la référence.',
    regarder: 'L’en-tête : grande pastille, « Vivid · 600 » en titre, le code et « ◆ Votre couleur de référence exacte » ; l’encadré « Sert à », border-control et focus avec leurs garanties et leur pastille AA ; l’encadré « Contrastes de la nuance », fond du thème, blanc et noir ; OKLCH replié.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), { clic: '[aria-label^="Profil Vivid, nuance 600,"]' }],
  },
  {
    id: 'nuance-libre',
    titre: 'Nuance sans rôle',
    quand: 'Le designer choisit la nuance Vivid 500, qu’aucun rôle n’emploie.',
    regarder: 'L’encadré « Sans rôle », qui dit qu’aucun rôle ne vise la nuance, puis l’encadré « Contrastes de la nuance » et OKLCH replié : aucun contraste écrit deux fois.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), { clic: '[aria-label^="Profil Vivid, nuance 500,"]' }],
  },
  {
    id: 'cartes-repliees',
    titre: 'Cartes repliées',
    quand: 'Bleu à l’ouverture : les cartes « Réglage global » et « Color shift » repliées, sous l’aperçu.',
    regarder: 'Aucun titre de section ; les deux cartes repliées, leur chevron, leur glyphe, leur titre et leur sous-titre, et leur résumé aligné à droite sur une ligne, son état sans valeurs, « Aucun réglage · synchronisé » pour le Color shift, et aucun choix « Régler » dans leur en-tête ; la carte « Configuration de la palette » ouverte, avec son chevron et sans glyphe, qui cache son résumé ; la carte « Aperçu » fixe, sans chevron, avec son glyphe, son titre, son sous-titre et la pastille du fond à droite.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU]))],
  },
  {
    id: 'cadre-deplace',
    titre: 'Cadre déplacé',
    quand: 'Le designer a rangé le cadre de Bleu dans une section de la page « Archives », et coupé puis collé celui de Jaune, qui change alors d’identifiant.',
    regarder: 'La planche de Bleu « À jour », « page Archives », avec « Afficher » ; celle de Jaune « Introuvable » en rouge, « Synchronisez pour la chercher dans tout le fichier », sans geste.',
    existe: true,
    atteinte: [
      etatDuFichier(
        rangee([BLEU, JAUNE]),
        'SRGB',
        plancheLue([cadreDessine(rangee([BLEU, JAUNE]), BLEU, '41:2', { page: '41:1', nomDeLaPage: 'Archives' })], {
          manquants: [{ palette: JAUNE.id, cadre: '40:3', raison: 'introuvable' }],
        }),
      ),
      ouvrirLaPlanche,
    ],
  },
  {
    id: 'fond-dans-le-selecteur',
    titre: 'Fond dans le sélecteur de couleur',
    quand: 'Le designer clique la pastille du fond, dans l’en-tête de la carte d’aperçu.',
    regarder: 'Le sélecteur de 232 px sous la pastille, par-dessus l’aperçu : la zone, la teinte, le code en Hex, la mention du fond commun, puis les deux fonds par défaut, le blanc et Vivid 50 et 100.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), { clic: '.pastille-du-fond' }],
  },
  {
    id: 'reference-dans-le-selecteur',
    titre: 'Référence dans le sélecteur de couleur',
    quand: 'Le designer clique la pastille de la couleur de référence, dans « Configuration de la palette ».',
    regarder: 'Le sélecteur aligné sur la pastille, sans mention, et les onze nuances Vivid du thème montré, la référence pressée quand elle en est une.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), { clic: '[aria-label="Configuration de la palette"] .pipette' }],
  },
  {
    id: 'palette-libre',
    titre: 'Palette libre',
    quand: 'Une palette sort du modèle du design system : six nuances, numérotées par le designer.',
    regarder: 'Le modèle Libre pressé et « Sans rôles ni garanties » sur sa rangée, pas de choix des intensités, les puces 100, 200, 400, 600, 800 et 900 allumées, l’aperçu à six colonnes sans on-solid ni accolades ; le pied dit « Palette libre ».',
    existe: true,
    atteinte: [etatDuFichier(rangee([{ ...BLEU, crans: [100, 200, 400, 600, 800, 900] }]))],
  },
  {
    id: 'reference-ajustee',
    titre: 'Référence ajustée',
    quand: 'La référence #16A34A a été ajustée d’un pas plus sombre, en #0DA047, et l’originale est gardée.',
    regarder: 'Sous le code #0DA047, « Ajustée depuis #16A34A · Revenir à l’originale », sans « Ajuster la référence » : les garanties sont tenues ; le ◆ au 600 dans les deux thèmes.',
    existe: true,
    atteinte: [etatDuFichier(rangee([VERT_AJUSTE]))],
  },
  {
    id: 'avertissement-long',
    titre: 'Avertissement long, sur une ligne fixe',
    quand: 'Vert, #16A34A, garde l’originale #15803D d’un ajustement et manque encore une garantie ; le designer clique la ligne sous le code.',
    regarder: 'La ligne de 24 px sous le code : ✗, le texte coupé par une ellipse, puis « Ajuster la référence » et « Revenir à l’originale ». La bulle posée sous elle, par-dessus les cartes, dans la fenêtre, avec le texte entier ; rien n’a bougé dessous. À 500 × 520, le texte se réduit à quelques lettres et les deux gestes restent entiers.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([{ ...palette('p-2b3c4d5e', 'Vert', '#16A34A'), originale: '#15803D' }])),
      { clic: '[aria-label="Configuration de la palette"] .ligne-de-la-reference .ligne-fixe-texte' },
    ],
  },
  {
    id: 'verification-manquee',
    titre: 'Vérification, des garanties manquées',
    quand: 'Le texte des boutons du thème Light est noir : Bleu manque une garantie ; le designer suit « Vérifier », dans le pied de Création.',
    regarder: 'L’onglet Vérification : le ✗ sur le bouton du sélecteur ; « Palette Bleu » ; le verdict sur son fond de danger, « N garanties manquées sur 64 » et les points à vérifier ; « Contrastes à corriger » en premier, chaque message avec ses liens, qui nomment le geste ; la carte des garanties, fixe ; le pied « Corrigez la palette dans Création, ou écrivez-la telle quelle dans Gestion. » et « Retour à Création ».',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU, JAUNE], texteNoirEnLight)),
      { clic: '#panneau-creation .pied-de-la-palette .bouton-discret' },
    ],
  },
  {
    id: 'verification-tenue',
    titre: 'Vérification, des garanties tenues',
    quand: 'Jaune tient ses garanties, sans point à vérifier ; le designer ouvre Vérification.',
    regarder: 'Le ✓ du verdict sur le bouton du sélecteur ; « Palette Jaune » ; le verdict sur son fond de succès, « 64 garanties tenues » et « Aucun point à vérifier » ; aucun message ; la carte des garanties ; le pied « La palette tient ses garanties. » et « Passer à Gestion », bouton principal.',
    existe: true,
    atteinte: [etatDuFichier(rangee([JAUNE, BLEU])), ouvrirLaVerification],
  },
  {
    id: 'verification-libre',
    titre: 'Vérification d’une palette libre',
    quand: 'Une palette libre, sortie du modèle : ni rôles, ni garanties ; le designer ouvre Vérification.',
    regarder: '« Palette libre · 6 nuances » en verdict de succès, aucune carte des garanties, et le pied « Une palette libre n’a pas de garantie à vérifier. » avec « Passer à Gestion ».',
    existe: true,
    atteinte: [etatDuFichier(rangee([{ ...BLEU, crans: [100, 200, 400, 600, 800, 900] }])), ouvrirLaVerification],
  },
  {
    id: 'verdicts-du-selecteur',
    titre: 'Verdicts dans le sélecteur',
    quand: 'Le fichier porte Vert, qui manque des garanties, Bleu, qui a un point à vérifier, et Jaune ; le designer ouvre la liste.',
    regarder: 'À droite de chaque option, ✗ en danger pour Vert, ! en avertissement pour Bleu, ✓ en succès pour Jaune ; le ✗ de Vert, la palette ouverte, sur le bouton, avant la flèche.',
    existe: true,
    atteinte: [etatDuFichier(rangee([palette('p-2b3c4d5e', 'Vert', '#16A34A'), BLEU, JAUNE])), { clic: '.selecteur-bouton' }],
  },
  {
    id: 'ajustement-ouvert',
    titre: 'Ajuster la référence',
    quand: 'Sur Vert, #16A34A, le designer ouvre « Ajuster la référence » et fait deux pas plus sombres.',
    regarder: 'La modale après deux pas : Originale #16A34A et Proposition #029D44 côte à côte, la piste de luminosité entre « − » et « + », la ligne de la nuance visée, le code, la garantie passée de ✗ à ✓ avec son badge, « Soft ✓ inchangé · Vivid ✗ 1 → ✓ », puis Annuler et Appliquer actif.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([palette('p-2b3c4d5e', 'Vert', '#16A34A')])),
      { clic: '[aria-label="Configuration de la palette"] .colonnes-de-base .lien-de-constat' },
      { clic: '[aria-label="Un pas plus sombre"]' },
      { clic: '[aria-label="Un pas plus sombre"]' },
    ],
  },
  {
    id: 'nuance-deselectionnee',
    titre: 'Nuance désélectionnée',
    quand: 'Le designer choisit la nuance Vivid 600, puis la reclique.',
    regarder: 'Le détail refermé, aucune pastille entourée, et le focus resté sur Vivid 600.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), { clic: '[aria-label^="Profil Vivid, nuance 600,"]' }, { clic: '[aria-label^="Profil Vivid, nuance 600,"]' }],
  },
  {
    id: 'titre-seul',
    titre: 'Titre seul',
    quand: 'Le cadre de Bleu a été dessiné sur une recette d’avant : il a changé depuis.',
    regarder: '« Palette Bleu » seul sur la ligne du titre : ni bouton de génération, ni état du cadre, ni « Afficher dans Figma » ; 15 px de part et d’autre du filet au-dessus.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU]), 'SRGB', plancheLue([cadreDessine(rangee([BLEU]), BLEU, '40:2', { empreinte: '0badc0de' })]))],
  },
  {
    id: 'titre-nom-long',
    titre: 'Titre d’un nom long',
    quand: 'La palette porte un nom de soixante caractères, à la largeur minimale de la fenêtre.',
    regarder: 'Le nom coupé par des points de suspension, dans le panneau.',
    existe: true,
    atteinte: [etatDuFichier(rangee([{ ...BLEU, nom: 'Bleu institutionnel des parcours de souscription en ligne' }]))],
  },
  {
    id: 'interface-de-test-light',
    titre: 'Interface de test, thème Light',
    quand: 'Le designer déplie « Interface de test », la dernière carte de l’onglet.',
    regarder: 'Dans l’en-tête de la carte ouverte, calés à droite, hors du bouton de repli, « Vue » avec Écran pressé puis « Afficher » avec Soft et Vivid, Vivid pressé, et aucun résumé ; la vue « Écran » : la page « Membres de l’équipe » peinte de Bleu sur le fond Light, navigation avec l’entrée active en surface, encart, tableau et sa ligne choisie, badges, champ, case, interrupteur et trois boutons.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), deplierLInterfaceDeTest],
  },
  {
    id: 'interface-de-test-etats',
    titre: 'Interface de test, vue États',
    quand: 'Le designer déplie « Interface de test » et choisit « États ».',
    regarder: 'Bleu #1E6FD9, thème Light, texte des boutons blanc, Vivid. Dans l’en-tête de la carte, calé à droite, « Vue » avec États pressé sur un fond visible, puis « Afficher » ; une rangée par composant, boutons plein, soft, contour et sans fond, champ, lien et badge, et une colonne par état, default, hover, pressed et focus ; un tiret pour un état que le composant n’a pas ; la colonne focus garde la forme du repos et ajoute l’anneau ; le texte du bouton soft reste le même aux trois états ; les anneaux de focus de deux rangées voisines séparés par un jour ; aucune rangée « Carte ».',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), deplierLInterfaceDeTest, { clic: '.choix-de-la-vue .bascule-option:nth-child(2)' }],
  },
  {
    id: 'interface-de-test-bulle',
    titre: 'Interface de test, la bulle des variables',
    quand: 'Le designer déplie « Interface de test » et survole le bouton « Enregistrer ».',
    regarder: 'Le bouton « Enregistrer » entouré d’un contour tireté de 1 px ; sous lui, une bulle de deux lignes : « fond », solid/default et 700, « texte », solid/foreground et « blanc » ; la bulle ne recouvre pas le bouton et n’ajoute aucun texte à l’écran hors d’elle.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), deplierLInterfaceDeTest, { survol: '#panneau-creation .essai-actions .essai-bouton:last-child' }],
  },
  {
    id: 'interface-de-test-dark',
    titre: 'Interface de test, thème Dark',
    quand: 'L’aperçu passe au thème Dark, « Interface de test » dépliée.',
    regarder: 'La même page sur le fond Dark, peinte des nuances Dark, « Dark » pressé dans la bascule « Aperçu » de la ligne du titre ; le résumé « Thème Dark · Vivid » est caché, la carte étant ouverte, et se lit à la fermeture de la carte.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), deplierLInterfaceDeTest, montrerLeThemeDark],
  },
  {
    id: 'titre-fixe-defile',
    titre: 'Titre fixe, page défilée',
    quand: 'Bleu, thème Dark choisi dans la ligne du titre ; le designer déplie « Interface de test » et défile la page jusqu’à elle, par le dernier bouton de l’écran.',
    regarder: 'La ligne du titre « Palette Bleu » collée au haut de la fenêtre, sur le fond de la page, avec, calée à droite, la bascule « Aperçu » Light, Dark, Dark pressé, de la même forme que les choix des cartes ; la barre de la palette a quitté l’écran avec la page ; les cartes passent sous la ligne sans la recouvrir ; l’écran de l’interface de test sur le fond Dark.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), deplierLInterfaceDeTest, montrerLeThemeDark, defilerJusquAuDernierBoutonDeLEssai],
  },
  {
    id: 'palette-une-intensite',
    titre: 'Palette à une intensité',
    quand: 'Bleu porte une seule intensité, celle de sa couleur de référence.',
    regarder: 'Le segment « Une » des intensités pressé et son aide, sous les intensités aucune part de la référence ; l’aperçu à une rangée par thème, sans nom de profil ; la carte « Réglage global » repliée, ni choix « Afficher » dans les garanties ni dans l’Interface de test, qui ne garde que « Vue », ni synchronisation dans le Color shift.',
    existe: true,
    atteinte: [etatDuFichier(rangee([{ ...BLEU, intensites: 1 }]))],
  },
  {
    id: 'palette-deux-intensites',
    titre: 'Palette à deux intensités',
    quand: 'Bleu porte Soft et Vivid.',
    regarder: 'Le segment « Deux » des intensités pressé, son aide, puis « Référence exacte dans » Auto pressé avec « Auto a choisi Vivid » dessous ; Soft et Vivid dans l’aperçu.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU]))],
  },
  {
    id: 'apercu-une-intensite-dark-inverse',
    titre: 'Aperçu en bandes, une intensité, Dark inversé',
    quand: 'Bleu porte une seule intensité ; le texte des boutons est blanc dans les deux thèmes, donc inversé en Dark ; l’aperçu montre le thème Dark.',
    regarder: 'Trois bandes solid, surface et page sous une seule rangée de nuances ; la case tiretée et la petite pastille de solid/foreground blanches ; solid écrit « pressed · hover · default » et « appui · survol · repos » sous 500, 600, 700, page/foreground sous la 700 ; les petites pastilles de 5 px de haut, alignées sur les pastilles de leur cran.',
    existe: true,
    atteinte: [etatDuFichier(rangee([{ ...BLEU, intensites: 1 }], avecLeTexteDesBoutons('blanc', 'blanc'))), montrerLeThemeDark],
  },
  {
    id: 'apercu-neutre',
    titre: 'Aperçu en bandes, palette neutral',
    quand: 'La palette se nomme neutral et porte une seule intensité ; l’aperçu montre le thème Light.',
    regarder: 'La bande page écrit « foreground-subtle · border » et « texte secondaire · contour » ; sous la surface, en encre seconde, « page/foreground-main · » et sa note, hors de la rampe.',
    existe: true,
    atteinte: [etatDuFichier(rangee([{ ...palette('p-6e7a1b00', 'neutral', '#6B7280'), intensites: 1 }]))],
  },
  {
    id: 'reglages-une-intensite',
    titre: 'Réglage global, à une intensité',
    quand: 'Bleu porte une seule intensité ; le designer déplie la carte « Réglage global ».',
    regarder: 'Aucun choix de profil dans l’en-tête de la carte ; l’avertissement « Attention : ce réglage va modifier votre couleur de référence. » en tête ; trois réglettes, Teinte, Saturation et Luminosité, chacune avec son champ, sa piste peinte et « Rétablir », la teinte absolue après son champ ; la saturation à celle de la référence, sans repère ; la ligne de la butée, vide, sans phrase sur le Color shift dessous.',
    existe: true,
    atteinte: [etatDuFichier(rangee([{ ...BLEU, intensites: 1 }])), deplierLesReglages],
  },
  {
    id: 'reglages-profil-delie',
    titre: 'Réglage global, un profil réglé seul',
    quand: 'Bleu, deux intensités : Soft tourné de 8° ; le designer déplie la carte, ouverte sur Soft.',
    regarder: 'Dans l’en-tête de la carte ouverte, calé à droite, le libellé « Régler » et les segments « Soft · Vivid ◆ · Les deux », Soft pressé ; aucun avertissement ; « +8° » dans le champ de la teinte et la teinte absolue à côté ; sur chaque piste, la lettre V qui situe Vivid ; sur la piste de saturation, le repère de la référence ; le résumé « Réglé · 1 point à vérifier », et sous les curseurs l’alerte des profils confondus.',
    existe: true,
    atteinte: [etatDuFichier(rangee([{ ...BLEU, reglages: { teinte: { soft: 8 }, porteur: 'vivid' } }])), deplierLesReglages],
  },
  {
    id: 'reglages-avant-le-porteur',
    titre: 'Réglage global, avant un réglage du porteur',
    quand: 'Bleu, deux intensités ; le designer déplie la carte et choisit Vivid, qui porte la référence.',
    regarder: 'Dans l’en-tête de la carte, « Régler » avec Vivid ◆ pressé, et dans le corps, avant tout geste, l’avertissement « Attention : ce réglage va modifier votre couleur de référence. » sur fond d’avertissement ; la lettre S qui situe Soft sur chaque piste.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), deplierLesReglages, { clic: '.cible-des-reglages .bascule-option:nth-child(2)' }],
  },
  {
    id: 'reglages-reference-modifiee',
    titre: 'Réglage global, référence modifiée',
    quand: 'Bleu : Soft tourné de 8°, Vivid assombri de 0,02, ce qui a déplacé la référence ; le designer rouvre la carte sur Vivid.',
    regarder: 'L’avertissement devenu « Attention, votre couleur de référence a été modifiée. » ; « −0,02 » dans le champ de la luminosité ; sous le code de la configuration, la ligne de l’originale #1E6FD9 et « Revenir à l’originale » ; l’aide « Référence dans Vivid, fixée par les réglages. » sous « Référence exacte dans » ; le résumé « Réglé ».',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU_REGLE])), deplierLesReglages, { clic: '.cible-des-reglages .bascule-option:nth-child(2)' }],
  },
  {
    id: 'fiche-refaite',
    titre: 'Fiche d’une palette',
    quand: 'Trois palettes dans l’onglet Palettes : Bleu à jour, Jaune périmée, Ardoise jamais générée.',
    regarder: 'Chaque fiche en disposition A : le nom et « Modifier » ; les rampes ; la référence et les garanties sur une ligne ; puis les gestes, sans premier geste pour Bleu.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee(TROIS_PALETTES), 'SRGB', plancheLue([cadreDessine(rangee(TROIS_PALETTES), BLEU, '40:2'), cadreDessine(rangee(TROIS_PALETTES), JAUNE, '40:3', { empreinte: '0badc0de' })])),
      ouvrirLaPlanche,
      deplier(BLEU),
      deplier(JAUNE),
      deplier(TROIS_PALETTES[2]),
    ],
  },
  {
    id: 'contenu-des-planches',
    titre: 'Contenu des planches',
    quand: 'Les grilles ne se dessinent plus ; le designer déplie la carte « Contenu des planches » des Réglages communs.',
    regarder: 'Les parties d’un cadre et les thèmes, chacun avec ses calques dans le cadre de Bleu ; « En-tête et rampes » bloqué allumé, les grilles éteintes, « Sans grilles » en résumé, et l’effet sur le cadre de Bleu.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU], (recette) => ({ ...recette, contenuDesPlanches: { ...recette.contenuDesPlanches, grilles: false } }))),
      ouvrirLaConfiguration,
      { clic: '[aria-label="Contenu des planches"] .carte-bascule' },
    ],
  },
  {
    id: 'fonds-sombres',
    titre: 'Fonds du thème Dark',
    quand: 'Le designer règle « Fonds du thème Dark » à 0,5 dans la carte Intensités des Réglages communs.',
    regarder: 'La ligne « Fonds du thème Dark » sous Soft et Vivid, son aide, le compte des palettes, « Rétablir » actif, et l’aperçu compact en tête qui suit.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU])),
      ouvrirLaConfiguration,
      { saisie: { dans: 'input.champ-nombre[aria-label="Fonds du thème Dark"]', valeur: '0,5' } },
    ],
  },
  ...[
    ['blanc', 'noir', 'Light blanc, Dark noir', 'Le réglage par défaut : aucun thème inversé.', 'Les segments Blanc du thème Light et Noir du thème Dark pressés, aucun message d’effet, aucune étiquette « inversé » dans la table des courbes, aucun résumé de courbe inversée.'],
    ['noir', 'noir', 'Light noir, Dark noir', 'Le designer passe le texte des boutons du thème Light au noir.', 'Noir pressé dans les deux thèmes, le message d’effet du thème Light seul, l’étiquette « inversé » sur la ligne Light, ses nuances 500 à 700 cerclées à 0,745 · 0,69 · 0,61 (la 800 reste à 0,42, sans cercle), et le résumé « Courbe inversée : Light ».'],
    ['blanc', 'blanc', 'Light blanc, Dark blanc', 'Le designer passe le texte des boutons du thème Dark au blanc.', 'Blanc pressé dans les deux thèmes, le message d’effet du thème Dark seul, l’étiquette « inversé » sur la ligne Dark, ses nuances 500 à 800 cerclées à 0,45 · 0,5 · 0,55 · 0,7, et le résumé « Courbe inversée : Dark ».'],
    ['noir', 'blanc', 'Light noir, Dark blanc', 'Le designer inverse le texte des boutons des deux thèmes.', 'Noir pressé en Light et Blanc pressé en Dark, un message d’effet par thème puis l’effet commun, l’étiquette « inversé » sur les deux lignes, les valeurs cerclées, et le résumé « Courbe inversée : Light, Dark ».'],
  ].map(([light, dark, nom, quand, regarder]) => ({
    id: `texte-des-boutons-${light}-${dark}`,
    titre: `Texte des boutons, ${nom}`,
    quand,
    regarder: `${regarder} Sous chaque « Fond de la page » : son code elevation/page, puis « Texte des boutons » et son code solid/foreground.`,
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU], avecLeTexteDesBoutons(light, dark))), ouvrirLaConfiguration],
  })),
  {
    id: 'texte-des-boutons-confirmation',
    titre: 'Texte des boutons, confirmation du remplacement',
    quand: 'Le designer règle la nuance 700 du thème Light à 0,52, puis clique sur le segment Noir du texte des boutons Light.',
    regarder: 'Sous les segments, la confirmation « Vos luminosités des nuances 500 à 800 en Light seront remplacées… » avec Remplacer et Annuler ; le segment Blanc reste pressé tant que rien n’est confirmé.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU])),
      ouvrirLaConfiguration,
      { saisie: { dans: '[data-mode="light"][data-rang="7"]', valeur: '0,52' } },
      { clic: '[role="group"][aria-label="Texte des boutons du thème Light"] .bascule-option:nth-child(2)' },
    ],
  },
];

/** Le designer choisit la première palette de la liste : l'onglet Création n'en ouvre aucune de lui-même ([UI-06]). */
const ouvrirLaPremierePalette = [{ clic: '.selecteur-bouton' }, { clic: '.selecteur-option' }];

/**
 * Un fichier qui porte des palettes s'ouvre sur Gestion ([UI-21]) : l'état
 * passe d'abord à Création. Il y montre la première palette, choisie par le
 * designer, sauf s'il montre l'onglet sans palette choisie. `ouvertSurGestion`
 * garde l'onglet d'ouverture.
 */
function avecLaPremierePalette(etat) {
  if (!etat.atteinte) return etat;
  const [lu, ...suite] = etat.atteinte;
  const palettes = lu.message?.type === 'etat' ? lu.message.classement.recette?.palettes ?? [] : [];
  if (palettes.length === 0 || etat.ouvertSurGestion) return etat;
  return { ...etat, atteinte: [lu, { clic: '#onglet-creation' }, ...(etat.sansPaletteChoisie ? [] : ouvrirLaPremierePalette), ...suite] };
}

ETATS.push(
  {
    id: 'sept-palettes',
    titre: 'Gestion de sept palettes',
    quand: 'Sept palettes attendent leurs premières sorties dans Figma.',
    regarder: 'Une ligne repliée par palette, l’état de ses tokens et celui de sa planche.',
    existe: true,
    ouvertSurGestion: true,
    atteinte: [etatDuFichier(rangee(SEPT_PALETTES), 'SRGB', PLANCHE_VIDE, 1, tokensEcrits(rangee(SEPT_PALETTES), [])), ouvrirLaPlanche],
  },
  {
    id: 'gestion-sections-repliees',
    titre: 'Gestion, sections repliables',
    quand: 'Le designer ouvre Gestion sans préférence de sections.',
    regarder: 'Seule la section « Palettes du plugin » est ouverte. La connexion résume ses destinations ; les palettes du fichier et des bibliothèques suivent celles du plugin dans la même liste, chacune sous son intertitre.',
    existe: true,
    ouvertSurGestion: true,
    atteinte: [gestionDeTroisPalettes(avecLesBibliotheques(avecLesPalettesDuFichier(tokensEcrits(rangee(TROIS_PALETTES), [BLEU])))), ouvrirLaPlanche],
  },
  {
    id: 'gestion-connexion-depliee',
    titre: 'Gestion, connexion dépliée',
    quand: 'Le designer déplie « Connexion à Figma ».',
    regarder: 'La destination des tokens et la page des planches portent « Changer ». Le pied porte l’heure de lecture et « Synchroniser ».',
    existe: true,
    ouvertSurGestion: true,
    atteinte: [gestionDeTroisPalettes(), ouvrirLaPlanche, { clic: '[data-section="connexion"] .section-bascule' }],
  },
  {
    id: 'fichier-sans-variable-avec-bibliotheque',
    titre: 'Fichier sans variable, bibliothèque distante',
    quand: 'Le fichier ne porte aucune palette ni variable locale ; une bibliothèque activée publie gray.',
    regarder: 'Sous l’invitation à créer une palette, la liste : l’intertitre « Dans les bibliothèques · 1 », « Publiées par une bibliothèque distante », puis gray dépliée, son geste « Copier dans le plugin ».',
    existe: true,
    ouvertSurGestion: true,
    atteinte: [etatDuFichier('', 'SRGB', PLANCHE_VIDE, 1, avecLesBibliotheques(VARIABLES_VIDES)), ouvrirLaPlanche, deplierLaBibliotheque],
  },
);

ETATS.push({
  id: 'preference-de-langue',
  titre: 'Préférence de langue non enregistrée',
  quand: 'Le stockage personnel refuse la préférence de langue.',
  regarder: 'Le choix reste actif pour la session ; le designer peut réessayer son enregistrement.',
  existe: true,
  atteinte: [
    { message: { type: 'langue', langue: 'en' } },
    { clic: '.icon-button' },
    { message: { type: 'langue-rangee', selection: 0, reussie: false } },
  ],
});

module.exports = { ETATS: ETATS.map(avecLaPremierePalette) };
