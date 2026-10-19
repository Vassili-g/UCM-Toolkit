/**
 * Les données factices de la galerie, à la forme des contrats de
 * `src/messages.ts`. Les noms sont ceux d'un fichier de tokens réel.
 *
 * Les messages numérotés suivent le compteur de la frontière de l'écran : la
 * lecture du bilan est la demande 1, la première lecture des termes la
 * demande 2, puis chaque geste du scénario prend le numéro suivant.
 */
const ligne = (id, avant, terme, apres, aussi = []) => ({ id, avant, terme, apres, aussi });
const terme = (mot, nombre, exemples, ucm = false) => ({ mot, nombre, exemples, ucm });

const boutonFond = ligne('v1', 'Button/', 'bg', '/hover');
const carteFond = ligne('v2', 'Card/', 'bg', '/default');
const pageFond = ligne('v3', 'Page/', 'bg', '/default');
const boutonFondPlein = ligne('v4', 'Button/', 'background', '/hover');
const survol = ligne('v7', 'Link/', 'hovered', '/text');
const survolBouton = ligne('v8', 'Button/', 'hovered', '/border');
const police = ligne('v9', '', 'fontSize', '/bodyLarge', ['terme:background']);
const rayon = ligne('v10', 'Button/', 'radius', '/default');
const rayonCarte = ligne('v11', 'Card/', 'radius', '/default');

const minusculesEtTirets = { casse: 'minuscules', separateur: 'tiret' };
const ecritureDesGroupes = { convention: minusculesEtTirets, suivent: 18, total: 21, exemple: ligne('g1', 'colors/', 'brand-colors', '/primary') };
const ecritureDesVariables = { convention: minusculesEtTirets, suivent: 734, total: 800, exemple: ligne('g2', 'color/brand/primary/', 'default', '') };

const groupeBackground = {
  cle: 'terme:background', regle: { sorte: 'terme', origine: 'ucm' },
  avant: 'bg', apres: 'background', autres: 0, variables: 12, collections: 0, nouveau: true, apercu: [boutonFond, carteFond],
};
const groupeHover = {
  cle: 'terme:hover', regle: { sorte: 'terme', origine: 'personnalise' },
  avant: 'hovered', apres: 'hover', autres: 0, variables: 8, collections: 0, nouveau: false, apercu: [survol, survolBouton],
};
const groupeEcriture = {
  cle: 'ecriture:variables', regle: { sorte: 'ecriture', categorie: 'variables', convention: minusculesEtTirets },
  avant: 'fontSize/bodyLarge', apres: 'font-size/body-large', autres: 0, variables: 66, collections: 0, nouveau: false, apercu: [police],
};
const groupeCollection = {
  cle: 'collection:c2', regle: { sorte: 'collection' },
  avant: 'Couleurs', apres: 'color-brands', autres: 0, variables: 0, collections: 1, nouveau: false, apercu: [],
};

const paire = {
  type: 'paire', cle: 'paire:bg|background', indice: 'abreviation',
  termes: [terme('bg', 12, [boutonFond]), terme('background', 40, [boutonFondPlein], true)], propose: 1, cibleCommune: null,
};
const faute = {
  type: 'ecriture-du-terme', cle: 'ecriture:backgrond', indice: 'faute', terme: terme('backgrond', 2, [ligne('v12', 'Modal/', 'backgrond', '/default')]),
  proposition: ['background'], reference: { mot: 'background', nombre: 40 },
};
const motsColles = {
  type: 'ecriture-du-terme', cle: 'ecriture:contrasthovered', indice: 'mots-colles', terme: terme('contrasthovered', 1, [ligne('v13', 'Link/', 'contrasthovered', '/text')]),
  proposition: ['contrast', 'hovered'], reference: null,
};
const collection = { type: 'collection', cle: 'collection:c2', nom: 'Couleurs', nombre: 34, proposee: 'color-brands' };
const paireDeTailles = {
  type: 'paire', cle: 'paire:radius|corner', indice: 'synonymes',
  termes: [terme('radius', 9, [rayon]), terme('corner', 3, [rayonCarte])], propose: 0, cibleCommune: null,
};

const collections = [
  { id: 'c1', nom: 'color-brands', nombre: 420, analysee: true, palettes: false },
  { id: 'c2', nom: 'Couleurs', nombre: 34, analysee: true, palettes: false },
  { id: 'c3', nom: 'primitives', nombre: 346, analysee: false, palettes: true },
];

const bilanDeBase = {
  generation: 1, premierLancement: false, sansVariableLocale: false,
  ecriture: { groupes: ecritureDesGroupes, variables: ecritureDesVariables, collections: { reconnues: 5, total: 7 } },
  groupes: [groupeBackground, groupeHover, groupeEcriture, groupeCollection],
  bloques: [{ avant: 'Font Size', apres: 'font-size', collection: 'Typographie' }],
  proteges: 3,
  questions: [paire, faute, motsColles],
  autresPistes: 2,
  plusTard: [collection],
  collections,
  dernierRenommage: { nombre: 12, heure: '14:32' },
};

const bilans = {
  travail: bilanDeBase,
  premierLancement: { ...bilanDeBase, premierLancement: true, groupes: [], questions: [], plusTard: [], bloques: [], proteges: 0, autresPistes: 0, dernierRenommage: null },
  collectionsEtPlusTard: { ...bilanDeBase, questions: [collection, motsColles], plusTard: [paireDeTailles] },
  rienAFaire: { ...bilanDeBase, groupes: [], bloques: [], questions: [], plusTard: [], autresPistes: 0 },
  sansVariableLocale: { ...bilanDeBase, sansVariableLocale: true, groupes: [], bloques: [], questions: [], plusTard: [], autresPistes: 0, collections: [], dernierRenommage: null },
  apresUneReponse: {
    ...bilanDeBase, generation: 2,
    groupes: [{ ...groupeBackground, variables: 52, nouveau: false }, groupeHover, groupeEcriture, groupeCollection],
    questions: [faute, motsColles],
  },
  apresLApplication: {
    ...bilanDeBase, generation: 2, groupes: [], bloques: [{ avant: 'Font Size', apres: 'font-size', collection: 'Typographie' }],
    dernierRenommage: { nombre: 87, heure: '14:41' },
  },
};

const termes = [
  { mot: 'background', origine: 'ucm', statut: 'regle', remplace: ['bg', 'back'], avec: null, nombre: 40 },
  { mot: 'hover', origine: 'personnalise', statut: 'regle', remplace: ['hovered'], avec: null, nombre: 8 },
  { mot: 'bg', origine: null, statut: 'a-trancher', remplace: [], avec: 'background', nombre: 12 },
  { mot: 'sm', origine: null, statut: 'a-trancher', remplace: [], avec: null, nombre: 20 },
  { mot: 'radius', origine: null, statut: 'sans-regle', remplace: [], avec: null, nombre: 9 },
  { mot: 'surface', origine: 'ucm', statut: 'ecart', remplace: [], avec: null, nombre: 6 },
];

const fiches = {
  ucm: {
    mot: 'background', origine: 'ucm', categorieUcm: 'roles', definition: 'La couleur de fond d’un élément.',
    remplace: [{ mot: 'bg', nombre: 12, ucm: true }, { mot: 'back', nombre: 3, ucm: true }],
    emploi: { nombre: 40, exemples: [boutonFondPlein, ligne('v14', 'Card/', 'background', '/default'), ligne('v15', 'Page/', 'background', '/default')] },
    ecart: false, voulu: false, distincts: [], question: null,
  },
  personnalise: {
    mot: 'hover', origine: 'personnalise', categorieUcm: null, definition: null,
    remplace: [{ mot: 'hovered', nombre: 8, ucm: false }],
    emploi: { nombre: 8, exemples: [ligne('v16', 'Link/', 'hover', '/text'), ligne('v17', 'Button/', 'hover', '/border')] },
    ecart: false, voulu: false, distincts: [], question: null,
  },
  sansRegle: {
    mot: 'radius', origine: null, categorieUcm: null, definition: null, remplace: [],
    emploi: { nombre: 9, exemples: [rayon, rayonCarte] },
    ecart: false, voulu: false, distincts: [], question: 'paire:radius|corner',
  },
};

const lignesSupplementaires = [pageFond, ligne('v18', 'Input/', 'bg', '/default'), ligne('v19', 'Tooltip/', 'bg', '/default')];

const effetDeTerme = { sorte: 'terme', avant: 'radius', apres: 'corner', nombre: 9, exemple: rayon };

const conflitDeFichier = { type: 'contredit-ucm', terme: 'surface', remplace: 'bg', termeUcm: 'background' };
const conflitDeCycle = { type: 'cycle', termes: ['bg', 'back', 'bg'] };

const m = (type, demande, reste) => ({ type, demande, ...reste });

const messages = {
  initial: (dejaAnalyse) => ({ type: 'initial', dejaAnalyse }),
  lecture: (lues, total) => m('lecture', 1, { lues, total }),
  bilan: (demande, bilan) => m('bilan', demande, { bilan }),
  lignes: (demande, debut) => m('lignes', demande, { generation: 1, groupe: groupeBackground.cle, debut, lignes: lignesSupplementaires, total: 12 }),
  termes: (demande) => m('termes', demande, {
    generation: 1, debut: 0, termes, total: termes.length,
    comptes: { tous: termes.length, avecRegle: 3, sansRegle: 3 },
  }),
  fiche: (demande, fiche) => m('fiche', demande, { generation: 1, fiche }),
  simulation: (demande) => m('simulation', demande, { generation: 1, effet: effetDeTerme, conflit: null }),
  refus: (demande, conflits) => m('refus', demande, { conflits }),
  application: (demande) => m('application', demande, { resultat: { sorte: 'application', statut: 'applique', renommes: 87, sautes: 0, annulable: true } }),
  reglesExportees: (demande) => m('regles-exportees', demande, { texte: '{"version":1,"termes":{"hover":{"remplace":["hovered"]}}}' }),
  erreur: (demande, code) => m('erreur', demande, { code }),
};

module.exports = { bilans, fiches, messages, conflitDeFichier, conflitDeCycle };
