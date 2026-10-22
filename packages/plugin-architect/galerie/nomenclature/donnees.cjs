/**
 * Les données factices de la galerie, à la forme des contrats de
 * `src/messages.ts`. Les noms sont ceux d'un fichier de tokens réel.
 *
 * Les messages numérotés suivent le compteur de la frontière de l'écran : la
 * lecture du bilan est la demande 1, la première lecture des termes la
 * demande 2, puis chaque geste du scénario prend le numéro suivant.
 */
// Un renommage : le nom complet avant et après, et les rangs des segments que la règle de la carte change.
const renom = (id, ancien, nouveau, marques, aussi = []) => ({ id, ancien, nouveau, marques, aussi });
// Un nom qui emploie déjà le terme : il ne change pas, le segment du terme est marqué.
const employe = (id, nom, marques) => renom(id, nom, nom, marques);
const terme = (mot, nombre, exemples, ucm = false) => ({ mot, nombre, exemples, ucm });

const boutonFond = renom('v1', 'Button/bg/hover', 'Button/background/hover', [1]);
const carteFond = renom('v2', 'Card/bg/default', 'Card/background/default', [1]);
const pageFond = renom('v3', 'Page/bg/default', 'Page/background/default', [1]);
const survol = renom('v7', 'Link/hovered/text', 'Link/hover/text', [1]);
const survolBouton = renom('v8', 'Button/hovered/border', 'Button/hover/border', [1]);
const police = renom('v9', 'fontSize/bodyLarge', 'font-size/body-large', [0, 1], ['terme:background']);
const boutonFondEmploye = employe('v4', 'Button/background/hover', [1]);
const boutonFondAbrege = employe('v1', 'Button/bg/hover', [1]);
const rayon = employe('v10', 'Button/radius/default', [1]);
const rayonCarte = employe('v11', 'Card/radius/default', [1]);
const coinCarte = employe('v21', 'Card/corner/default', [1]);

const minusculesEtTirets = { casse: 'minuscules', separateur: 'tiret' };
const ecritureDesGroupes = { convention: minusculesEtTirets, suivent: 18, total: 21, exemple: employe('g1', 'colors/brand-colors/primary', [1]) };
const ecritureDesVariables = { convention: minusculesEtTirets, suivent: 734, total: 800, exemple: employe('g2', 'color/brand/primary/default', [3]) };

const groupeBackground = {
  cle: 'terme:background', regle: { sorte: 'terme', origine: 'ucm', categorie: null },
  avant: 'bg', apres: 'background', autres: 0, variables: 12, collections: 0, aussiDEcriture: 4, nouveau: true, apercu: [boutonFond, carteFond],
};
const groupeHover = {
  cle: 'terme:hover', regle: { sorte: 'terme', origine: 'personnalise', categorie: null },
  avant: 'hovered', apres: 'hover', autres: 0, variables: 8, collections: 0, aussiDEcriture: 0, nouveau: false, apercu: [survol, survolBouton],
};
const groupeEcriture = {
  cle: 'ecriture:variables', regle: { sorte: 'ecriture', categorie: 'variables', convention: minusculesEtTirets },
  avant: 'fontSize/bodyLarge', apres: 'font-size/body-large', autres: 0, variables: 66, collections: 0, aussiDEcriture: 0, nouveau: false, apercu: [police],
};
const groupeCollection = {
  cle: 'collection:c2', regle: { sorte: 'collection' },
  avant: 'Couleurs', apres: 'brands', autres: 0, variables: 0, collections: 1, aussiDEcriture: 0, nouveau: false, apercu: [],
};

const paire = {
  type: 'paire', cle: 'paire:bg|background', indice: 'abreviation',
  termes: [terme('bg', 12, [boutonFondAbrege]), terme('background', 40, [boutonFondEmploye], true)], propose: 1, cibleCommune: null,
  effet: boutonFond,
};
const faute = {
  type: 'ecriture-du-terme', cle: 'ecriture:backgrond', indice: 'faute', terme: terme('backgrond', 2, [employe('v12', 'Modal/backgrond/default', [1])]),
  proposition: ['background'], reference: { mot: 'background', nombre: 40 },
  effet: renom('v12', 'Modal/backgrond/default', 'Modal/background/default', [1]),
};
const motsColles = {
  type: 'ecriture-du-terme', cle: 'ecriture:contrasthovered', indice: 'mots-colles', terme: terme('contrasthovered', 1, [employe('v13', 'Link/contrasthovered/text', [1])]),
  proposition: ['contrast', 'hovered'], reference: null,
  effet: renom('v13', 'Link/contrasthovered/text', 'Link/contrast-hovered/text', [1]),
};
const collection = { type: 'collection', cle: 'collection:c2', nom: 'Couleurs', nombre: 34, proposee: 'brands' };
const paireDeTailles = {
  type: 'paire', cle: 'paire:radius|corner', indice: 'synonymes',
  termes: [terme('radius', 9, [rayon]), terme('corner', 3, [coinCarte])], propose: 0, cibleCommune: null,
  effet: renom('v21', 'Card/corner/default', 'Card/radius/default', [1]),
};

// `protegees` compte les variables que `causeDeProtection` empêche de renommer, toutes causes, collection exclue comprise.
const collections = [
  { id: 'c1', nom: 'brands', nombre: 420, analysee: true, protegees: 0 },
  { id: 'c2', nom: 'Couleurs', nombre: 34, analysee: true, protegees: 0 },
  { id: 'c3', nom: 'primitives', nombre: 346, analysee: false, protegees: 120 },
];
// Le fichier sans variable protégée.
const collectionsLibres = collections.map((c) => ({ ...c, protegees: 0 }));
// Une variable de Palettes que la règle de background renomme : la marque est lue, Palettes suit les règles.
const fondDePalettes = renom('vp1', 'Poppy/bg/subtle', 'Poppy/background/subtle', [1]);

// Les dates du journal se calculent au build : « aujourd'hui » et « hier » restent vrais le jour où l'on ouvre la galerie.
const quand = (jours, heures, minutes) => {
  const date = new Date();
  date.setDate(date.getDate() - jours);
  date.setHours(heures, minutes, 0, 0);
  return date.toISOString();
};
const nomDuJournal = (aujourdhui, ancien, sort = 'revient') => ({ type: 'variable', aujourdhui, ancien, sort });
const lignesDeBrands = [
  ['background/default', 'bg/default'], ['background/subtle', 'bg/subtle'], ['background/inverse', 'bg/inverse'], ['text/hover', 'text/hovered'],
  ['border/hover', 'border/hovered'], ['font-size/body-large', 'fontSize/bodyLarge'], ['font-size/body-small', 'fontSize/bodySmall'], ['font-size/title', 'fontSize/title'],
].map(([aujourdhui, ancien]) => nomDuJournal(aujourdhui, ancien));
const lignesDeCouleurs = [
  ['brand/primary-hover', 'brand/primaryHovered'], ['brand/background', 'brand/bg'], ['neutral/background-subtle', 'neutral/bgSubtle'], ['neutral/text-hover', 'neutral/textHovered'],
].map(([aujourdhui, ancien]) => nomDuJournal(aujourdhui, ancien));
// Le lot de 12 noms : tous reviennent.
const journalNominal = {
  nombre: 12, reviennent: 12, heure: quand(0, 14, 32),
  collections: [
    { id: 'c1', nom: 'brands', exclue: false, lignes: lignesDeBrands },
    { id: 'c2', nom: 'Couleurs', exclue: false, lignes: lignesDeCouleurs },
  ],
};
// Le lot d'hier : un nom a changé depuis dans brands, et Couleurs est exclue de l'analyse (ses 4 noms ne reviennent pas).
const journalPartiel = {
  nombre: 12, reviennent: 7, heure: quand(1, 17, 5),
  collections: [
    { id: 'c1', nom: 'brands', exclue: false, lignes: lignesDeBrands.map((ligne, rang) => (rang === 3 ? nomDuJournal('text/hover-strong', ligne.ancien, 'change-depuis') : ligne)) },
    { id: 'c2', nom: 'Couleurs', exclue: true, lignes: lignesDeCouleurs },
  ],
};
// L'import de 3 règles : l'écriture des variables, un terme ajouté (hover) et un terme modifié (background).
const importDeTroisRegles = {
  heure: quand(0, 14, 35),
  lignes: [
    { sorte: 'ecriture', avant: { groupes: minusculesEtTirets, variables: { casse: 'camelCase', separateur: 'camelCase' } }, apres: { groupes: minusculesEtTirets, variables: minusculesEtTirets } },
    { sorte: 'terme', terme: 'hover', avant: null, apres: ['hovered'] },
    { sorte: 'terme', terme: 'background', avant: ['bg'], apres: ['bg', 'bkg'] },
  ],
};

const bilanDeBase = {
  generation: 1, premierLancement: false, sansVariableLocale: false, reglesFutures: false, architecture: 'absente',
  ecriture: { groupes: ecritureDesGroupes, variables: ecritureDesVariables, collections: { reconnues: 5, total: 7 } },
  groupes: [groupeBackground, groupeHover, groupeEcriture, groupeCollection],
  bloques: [{ avant: 'Font Size', apres: 'font-size', collection: 'Typographie' }],
  proteges: 3,
  protections: [{ cause: 'marque-absente', nombre: 3 }],
  questions: [paire, faute, motsColles],
  autresPistes: 2,
  plusTard: [collection],
  collections,
  dernierRenommage: journalNominal,
  dernierImport: null,
};

const bilans = {
  travail: bilanDeBase,
  premierLancement: { ...bilanDeBase, premierLancement: true, groupes: [], questions: [], plusTard: [], bloques: [], proteges: 0, protections: [], collections: collectionsLibres, autresPistes: 0, dernierRenommage: null },
  // Les règles ne sont pas rangées : les variables de Palettes gardent leur nom jusqu'à l'écriture choisie. La Configuration s'ouvre déjà.
  premierLancementSansRegles: {
    ...bilanDeBase, premierLancement: true, groupes: [], questions: [], plusTard: [], bloques: [], proteges: 120, protections: [{ cause: 'sans-regles', nombre: 120 }],
    collections: collections.map((c) => ({ ...c, analysee: true })), autresPistes: 0, dernierRenommage: null,
  },
  collectionsEtPlusTard: { ...bilanDeBase, questions: [collection, motsColles], plusTard: [paireDeTailles] },
  rienAFaire: { ...bilanDeBase, groupes: [], bloques: [], proteges: 0, protections: [], collections: collectionsLibres, questions: [], plusTard: [], autresPistes: 0 },
  // Une variable de Palettes parmi les renommages : plus aucune ligne de protection.
  marqueCourante: {
    ...bilanDeBase, proteges: 0, protections: [], collections: collectionsLibres,
    groupes: [{ ...groupeBackground, variables: 13, apercu: [fondDePalettes, boutonFond] }, groupeHover, groupeEcriture, groupeCollection],
  },
  marqueIllisible: { ...bilanDeBase, protections: [{ cause: 'marque-illisible', nombre: 3 }] },
  marqueFuture: { ...bilanDeBase, protections: [{ cause: 'marque-future', nombre: 3 }] },
  // Une règle de nommage rangée par une version plus récente du plugin : le pied remplace le compte, et Appliquer reste inactif.
  reglesFutures: { ...bilanDeBase, reglesFutures: true },
  lectureRefusee: { ...bilanDeBase, proteges: 120, protections: [{ cause: 'lecture-refusee', nombre: 120 }] },
  deuxCauses: { ...bilanDeBase, proteges: 43, protections: [{ cause: 'marque-absente', nombre: 3 }, { cause: 'lecture-refusee', nombre: 40 }] },
  // Ni groupe, ni nom bloqué, ni question : seule la carte des protégés reste.
  protectionSeule: { ...bilanDeBase, groupes: [], bloques: [], questions: [], plusTard: [], autresPistes: 0 },
  sansVariableLocale: { ...bilanDeBase, sansVariableLocale: true, groupes: [], bloques: [], proteges: 0, protections: [], questions: [], plusTard: [], autresPistes: 0, collections: [], dernierRenommage: null },
  avecUnImport: { ...bilanDeBase, dernierImport: importDeTroisRegles },
  // Le lot d'hier, partiel, sans import.
  journalPartiel: { ...bilanDeBase, dernierRenommage: journalPartiel },
  // Ni renommage ni import à annuler.
  sansHistorique: { ...bilanDeBase, dernierRenommage: null, dernierImport: null },
  // Le renommage est annulé : il sort du journal, l'import reste.
  apresUneAnnulation: { ...bilanDeBase, generation: 2, dernierRenommage: null, dernierImport: importDeTroisRegles },
  // Aucune question à poser, mais des renommages (le bilan de base garde ses groupes) : la vue vide propose de les voir.
  sansQuestion: { ...bilanDeBase, questions: [], plusTard: [] },
  sansQuestionAvecPlusTard: { ...bilanDeBase, questions: [], plusTard: [collection, paireDeTailles] },
  apresUneReponse: {
    ...bilanDeBase, generation: 2,
    groupes: [{ ...groupeBackground, variables: 52, nouveau: false }, groupeHover, groupeEcriture, groupeCollection],
    questions: [faute, motsColles],
  },
  // Button/bg/hover a été corrigé hors du plugin : le groupe de background garde 11 noms, sans cette ligne.
  apresUneCorrection: {
    ...bilanDeBase, generation: 2,
    groupes: [{ ...groupeBackground, variables: 11, nouveau: false, apercu: [carteFond] }, groupeHover, groupeEcriture, groupeCollection],
    questions: [faute, motsColles],
  },
  apresLApplication: {
    ...bilanDeBase, generation: 2, groupes: [], bloques: [{ avant: 'Font Size', apres: 'font-size', collection: 'Typographie' }],
    dernierRenommage: { ...journalNominal, nombre: 87, reviennent: 87, heure: quand(0, 14, 41) },
  },
  // Le lot a laissé deux variables de couleur dont la protection ne se lit pas : la relecture les compte non vérifiées.
  apresUnLotPartiel: {
    ...bilanDeBase, generation: 2, groupes: [], proteges: 2, protections: [{ cause: 'lecture-refusee', nombre: 2 }],
    dernierRenommage: { ...journalNominal, nombre: 85, reviennent: 85, heure: quand(0, 14, 41) },
  },
};

// Les lignes de la liste de l'onglet Règles, une fabrique par statut. `forme` est le terme écrit selon la convention de sa place ;
// `place` vaut `variables`, sauf pour un nom de composant ou de palette, qui n'a de ligne qu'aux groupes.
const termeRegle = (type, mot, forme, origine, remplace, nombre, place = 'variables') => ({ mot, place, forme, type, nature: null, origine, statut: 'regle', remplace, avec: null, nombre, trouve: null });
const termeATrancher = (mot, avec, nombre, place = 'variables', forme = mot) => ({ mot, place, forme, type: 'a-trancher', nature: null, origine: null, statut: 'a-trancher', remplace: [], avec, nombre, trouve: null });
const termeSansRegle = (mot, forme, nombre, statut = 'sans-regle', origine = null, place = 'variables') => ({ mot, place, forme, type: 'sans-regle', nature: null, origine, statut, remplace: [], avec: null, nombre, trouve: null });
const nomDeLaListe = (type, mot, forme, nombre) => ({ mot, place: 'groupes', forme, type, nature: type, origine: null, statut: 'sans-regle', remplace: [], avec: null, nombre, trouve: null });

const background = termeRegle('remplace', 'background', 'background', 'ucm', ['bg', 'back'], 40);
const hover = termeRegle('remplace', 'hover', 'hover', 'personnalise', ['hovered'], 8);
const bg = termeATrancher('bg', 'background', 12);
const sm = termeATrancher('sm', null, 20);
const radius = termeSansRegle('radius', 'radius', 9);
const surface = termeSansRegle('surface', 'surface', 6, 'ecart', 'ucm');
const button = nomDeLaListe('composant', 'button', 'Button', 245);
const stressTest = nomDeLaListe('composant', 'stress-test', 'StressTest', 66);
const poppy = nomDeLaListe('palette', 'poppy', 'Poppy', 44);

const PLACES = ['groupes', 'variables'];
/** Une section : `totaux` compte les lignes de chaque place ; sans lui, toutes les lignes sont à la place de la première. */
const section = (type, total, termes, totaux) => ({
  type, total,
  totaux: totaux ?? Object.fromEntries(PLACES.map((place) => [place, termes[0]?.place === place ? total : 0])),
  termes,
});
const comptesVides = { 'a-trancher': 0, remplace: 0, conforme: 0, 'sans-regle': 0, composant: 0, palette: 0 };

// Le fichier de base : des termes à trancher, deux règles, deux mots sans règle, tous à la place des variables.
const sectionsDeBase = [section('a-trancher', 2, [bg, sm]), section('remplace', 2, [background, hover]), section('sans-regle', 2, [radius, surface])];
const comptesDeBase = { types: { ...comptesVides, 'a-trancher': 2, remplace: 2, 'sans-regle': 2 }, origines: { ucm: 1, personnalise: 1 }, places: { groupes: 0, variables: 6 } };

// Un fichier qui a des noms : un composant, un autre nom de composant et une palette, qui n'ont de ligne qu'aux groupes.
const sectionsAvecNoms = [section('remplace', 2, [background, hover]), section('sans-regle', 1, [surface]), section('composant', 2, [button, stressTest]), section('palette', 1, [poppy])];
const comptesAvecNoms = { types: { ...comptesVides, remplace: 2, 'sans-regle': 1, composant: 2, palette: 1 }, origines: { ucm: 1, personnalise: 1 }, places: { groupes: 3, variables: 3 } };

// Le Playground : des termes aux deux places (`Size` en groupe et `size` en variable, `Color` et `color`, `LineHeight` et `line-height`).
// En tri A → Z, une section porte jusqu'à cinq lignes de chaque place, les groupes d'abord ; les composants tiennent en quatre.
const smDuPlayground = termeATrancher('sm', null, 13);
const smEnGroupe = termeATrancher('sm', null, 7, 'groupes', 'Small');
const remplaceEnGroupe = [termeRegle('remplace', 'icon', 'Icon', 'ucm', ['Icons'], 33, 'groupes'), termeRegle('remplace', 'size', 'Size', 'ucm', ['Sizes'], 45, 'groupes')];
const remplaceEnVariable = [
  background, termeRegle('remplace', 'dimension', 'dimension', 'ucm', ['dimensions'], 30), termeRegle('remplace', 'disabled', 'disabled', 'ucm', ['disable'], 49), hover,
  termeRegle('remplace', 'icon', 'icon', 'ucm', ['icons'], 6),
];
const remplaceSuivant = [
  termeRegle('remplace', 'large', 'large', 'ucm', ['big'], 5), termeRegle('remplace', 'pressed', 'pressed', 'ucm', ['press', 'push'], 38),
  termeRegle('remplace', 'radius', 'radius', 'ucm', ['border-radius'], 26), termeRegle('remplace', 'size', 'size', 'ucm', ['sizes'], 81),
];
const conformes = [['50', 59], ['100', 59], ['200', 59], ['300', 59], ['400', 60]].map(([mot, nombre]) => termeRegle('conforme', mot, mot, 'ucm', [], nombre));
const sansRegleEnGroupe = [termeSansRegle('color', 'Color', 18, 'sans-regle', null, 'groupes'), termeSansRegle('line-height', 'LineHeight', 7, 'sans-regle', null, 'groupes')];
const sansRegleEnVariable = [termeSansRegle('color', 'color', 30), termeSansRegle('gap', 'gap', 12), termeSansRegle('line-height', 'line-height', 15), termeSansRegle('padding', 'padding', 15), radius];
const composants = [nomDeLaListe('composant', 'alert', 'Alert', 16), button, stressTest, nomDeLaListe('composant', 'tile-link', 'TileLink', 11)];
const palettes = ['Deep', 'Grass', 'Orange', 'Poppy', 'Sky'].map((forme, rang) => nomDeLaListe('palette', forme.toLowerCase(), forme, rang === 0 ? 22 : 44));
const sectionsDuPlayground = [
  section('a-trancher', 3, [smEnGroupe, bg, smDuPlayground], { groupes: 1, variables: 2 }),
  section('remplace', 11, [...remplaceEnGroupe, ...remplaceEnVariable], { groupes: 2, variables: 9 }),
  section('conforme', 37, conformes),
  section('sans-regle', 9, [...sansRegleEnGroupe, ...sansRegleEnVariable], { groupes: 2, variables: 7 }),
  section('composant', 4, composants),
  section('palette', 8, palettes),
];
const comptesDuPlayground = {
  types: { 'a-trancher': 3, remplace: 11, conforme: 37, 'sans-regle': 9, composant: 4, palette: 8 },
  origines: { ucm: 47, personnalise: 1 },
  places: { groupes: 17, variables: 55 },
};
// Le même fichier en tri par nombre : cinq lignes au plus par section, les places mêlées, du plus employé au moins employé.
const sectionsParNombre = [
  section('a-trancher', 3, [smDuPlayground, bg, smEnGroupe], { groupes: 1, variables: 2 }),
  section('remplace', 11, [remplaceSuivant[3], remplaceEnVariable[2], remplaceEnGroupe[1], background, remplaceSuivant[1]], { groupes: 2, variables: 9 }),
  section('conforme', 37, [...conformes].sort((a, b) => b.nombre - a.nombre)),
  section('sans-regle', 9, [sansRegleEnVariable[0], termeSansRegle('scale-wrap', 'scale-wrap', 22), sansRegleEnGroupe[0], sansRegleEnVariable[2], sansRegleEnVariable[3]], { groupes: 2, variables: 7 }),
  section('composant', 4, [button, stressTest, composants[0], composants[3]]),
  section('palette', 8, [...palettes.slice(1), palettes[0]]),
];
/** Les sections du Playground réduites à une place : le total de chaque section suit, et une section sans ligne disparaît. */
const dansLaPlace = (sections, place) => sections
  .map((autre) => ({
    ...autre, total: autre.totaux[place], totaux: Object.fromEntries(PLACES.map((p) => [p, p === place ? autre.totaux[place] : 0])),
    termes: autre.termes.filter((terme) => terme.place === place),
  }))
  .filter((autre) => autre.total > 0);

const fiches = {
  ucm: {
    mot: 'background', forme: 'background', nature: null, origine: 'ucm', categorieUcm: 'roles', definition: 'La couleur de fond d’un élément.',
    remplace: [{ mot: 'bg', forme: 'bg', nombre: 12, ucm: true }, { mot: 'back', forme: 'back', nombre: 3, ucm: true }],
    emploi: { nombre: 40, exemples: [boutonFondEmploye, employe('v14', 'Card/background/default', [1]), employe('v15', 'Page/background/default', [1])] },
    aRenommer: { nombre: 12, exemples: [boutonFond, carteFond, pageFond] },
    ecart: false, voulu: false, ordinaire: false, distincts: [], question: null,
  },
  personnalise: {
    mot: 'hover', forme: 'hover', nature: null, origine: 'personnalise', categorieUcm: null, definition: null,
    remplace: [{ mot: 'hovered', forme: 'hovered', nombre: 8, ucm: false }],
    emploi: { nombre: 8, exemples: [employe('v16', 'Link/hover/text', [1]), employe('v17', 'Button/hover/border', [1])] },
    aRenommer: { nombre: 8, exemples: [survol, survolBouton] },
    ecart: false, voulu: false, ordinaire: false, distincts: [], question: null,
  },
  sansRegle: {
    mot: 'radius', forme: 'radius', nature: null, origine: null, categorieUcm: null, definition: null, remplace: [],
    emploi: { nombre: 9, exemples: [rayon, rayonCarte] },
    aRenommer: { nombre: 0, exemples: [] },
    ecart: false, voulu: false, ordinaire: false, distincts: [], question: 'paire:radius|corner',
  },
  // Un nom : le premier segment de 245 noms, que le sandbox lit comme un composant.
  composant: {
    mot: 'button', forme: 'Button', nature: 'composant', origine: null, categorieUcm: null, definition: null, remplace: [],
    emploi: { nombre: 245, exemples: [employe('v30', 'Button/Colors/Primary/Text/Press/Foreground', [0]), employe('v31', 'Button/Sizes/Medium/Padding-x', [0]), employe('v32', 'Button/Colors/Secondary/Outlined/Default/Border', [0])] },
    aRenommer: { nombre: 0, exemples: [] },
    ecart: false, voulu: false, ordinaire: false, distincts: [], question: null,
  },
};

// Les dix noms que le groupe ne montre pas encore (12 en tout, deux en aperçu).
const lignesSupplementaires = [pageFond, ...['Input', 'Tooltip', 'Modal', 'Menu', 'Badge', 'Tab', 'Toast', 'Chip', 'Table'].map((composant, rang) => renom(`vb${rang}`, `${composant}/bg/default`, `${composant}/background/default`, [1]))];

const effetDeTerme = { sorte: 'terme', avant: 'radius', apres: 'corner', nombre: 9, exemple: renom('v10', 'Button/radius/default', 'Button/corner/default', [1]) };

const conflitDeFichier = { type: 'contredit-ucm', terme: 'surface', remplace: 'bg', termeUcm: 'background' };
const conflitDeCycle = { type: 'cycle', termes: ['bg', 'back', 'bg'] };

const m = (type, demande, reste) => ({ type, demande, ...reste });

const reponseDeTermes = (demande, sections, comptes, reste = {}) => m('termes', demande, { generation: 1, section: null, debut: 0, sections, comptes, ...reste });

const messages = {
  initial: (dejaAnalyse) => ({ type: 'initial', dejaAnalyse }),
  lecture: (lues, total) => m('lecture', 1, { lues, total }),
  bilan: (demande, bilan) => m('bilan', demande, { bilan }),
  lignes: (demande, debut) => m('lignes', demande, { generation: 1, groupe: groupeBackground.cle, debut, lignes: lignesSupplementaires.slice(debut - groupeBackground.apercu.length, debut - groupeBackground.apercu.length + 50), total: 12 }),
  // Une réponse de la liste : sans `section`, les premières lignes de chaque section ; avec `section`, la page qui commence à `debut`.
  termes: (demande) => reponseDeTermes(demande, sectionsDeBase, comptesDeBase),
  termesAvecNoms: (demande) => reponseDeTermes(demande, sectionsAvecNoms, comptesAvecNoms),
  termesDuPlayground: (demande) => reponseDeTermes(demande, sectionsDuPlayground, comptesDuPlayground),
  /** Le menu Filtrer avec Remplace et Sans règle cochés : seules ces deux sections reviennent, les comptes restent ceux du fichier. */
  termesFiltres: (demande) => reponseDeTermes(demande, [sectionsDuPlayground[1], sectionsDuPlayground[3]], comptesDuPlayground),
  /** Le tri par nombre : cinq lignes au plus par section, les groupes et les variables mêlés. */
  termesParNombre: (demande) => reponseDeTermes(demande, sectionsParNombre, comptesDuPlayground),
  /** Le menu Filtrer avec Groupes coché : chaque section ne garde que ses groupes, les comptes restent ceux du fichier. */
  termesDesGroupes: (demande) => reponseDeTermes(demande, dansLaPlace(sectionsDuPlayground, 'groupes'), comptesDuPlayground),
  /** « Afficher les 4 autres variables » de la section Remplace : les quatre variables qui suivent les cinq premières. */
  termesPage: (demande) => reponseDeTermes(demande, [section('remplace', 11, remplaceSuivant, { groupes: 2, variables: 9 })], comptesDuPlayground, { section: 'remplace', debut: 5 }),
  /** La recherche d'une variante : la ligne de sa référence porte la variante trouvée. */
  termesTrouves: (demande) => reponseDeTermes(demande, [section('remplace', 1, [{ ...background, trouve: 'bg' }])], comptesDeBase),
  fiche: (demande, fiche) => m('fiche', demande, { generation: 1, fiche }),
  /** La lecture de la sélection : les identifiants encore à renommer, avec la clé de leur groupe principal. */
  selection: (demande, generation, principaux) => m('selection', demande, { generation, principaux }),
  simulation: (demande) => m('simulation', demande, { generation: 1, effet: effetDeTerme, conflit: null }),
  refus: (demande, conflits) => m('refus', demande, { conflits }),
  application: (demande) => m('application', demande, { resultat: { sorte: 'application', statut: 'applique', renommes: 87, sautes: 0, annulable: true } }),
  /** Un lot partiel : 85 noms renommés, deux variables de couleur non vérifiées. */
  applicationPartielleNonVerifiee: (demande) => m('application', demande, { resultat: { sorte: 'application', statut: 'partiel', renommes: 85, sautes: 2, nonVerifiees: 2, annulable: true } }),
  /** Un lot refusé : les deux variables cochées sont non vérifiées. */
  applicationRefuseeNonVerifiee: (demande) => m('application', demande, { resultat: { sorte: 'application', statut: 'refuse', renommes: 0, sautes: 2, nonVerifiees: 2, annulable: false } }),
  /** La réponse à l'annulation du dernier renommage : 12 noms rétablis. */
  annulation: (demande) => m('application', demande, { resultat: { sorte: 'annulation', statut: 'applique', renommes: 12, sautes: 0, annulable: false } }),
  annulationPartielleNonVerifiee: (demande) => m('application', demande, { resultat: { sorte: 'annulation', statut: 'partiel', renommes: 10, sautes: 2, nonVerifiees: 2, annulable: true } }),
  annulationRefuseeNonVerifiee: (demande) => m('application', demande, { resultat: { sorte: 'annulation', statut: 'refuse', renommes: 0, sautes: 1, nonVerifiees: 1, annulable: true } }),
  annulationRefuseeReglesFutures: (demande) => m('application', demande, { resultat: { sorte: 'annulation', statut: 'refuse', renommes: 0, sautes: 0, annulable: false, cause: 'regles-futures' } }),
  applicationRefusee: (demande, cause) => m('application', demande, { resultat: { sorte: 'application', statut: 'refuse', renommes: 0, sautes: 0, annulable: false, cause } }),
  diagnostic: (demande) => m('diagnostic', demande, { generation: 1, texte: '{"version":1,"termes":[],"noms":[]}' }),
  reglesExportees: (demande) => m('regles-exportees', demande, { texte: '{"version":1,"termes":{"hover":{"remplace":["hovered"]}}}' }),
  erreur: (demande, code) => m('erreur', demande, { code }),
};

module.exports = { bilans, fiches, messages, conflitDeFichier, conflitDeCycle };
