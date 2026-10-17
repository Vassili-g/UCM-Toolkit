/**
 * Les données factices de la galerie : une valeur par type de `PluginMessage`,
 * à la forme des contrats de `src/messages.ts`.
 */
const ligne = (id, avant, terme, apres, aussi = []) => ({ id, avant, terme, apres, aussi });

const fond = ligne('v1', 'colors/', 'bg', '/default');
const fondPlein = ligne('v2', 'colors/', 'background', '/default');
const tailleCourte = ligne('v3', 'spacing/', 'sm', '');
const tailleLongue = ligne('v4', 'spacing/', 'small', '');
const terme = (mot, nombre, exemples, ucm = false) => ({ mot, nombre, exemples, ucm });

const minusculesEtTirets = { casse: 'minuscules', separateur: 'tiret' };
const ecritureDesGroupes = { convention: minusculesEtTirets, suivent: 18, total: 21, exemple: fond };
const ecritureDesVariables = { convention: minusculesEtTirets, suivent: 734, total: 800, exemple: fondPlein };

const groupeDeTerme = {
  cle: 'terme:background', regle: { sorte: 'terme', origine: 'ucm' },
  avant: 'bg', apres: 'background', autres: 0, variables: 12, collections: 0, nouveau: true, apercu: [fond],
};
const groupeDEcriture = {
  cle: 'ecriture:variables', regle: { sorte: 'ecriture', categorie: 'variables', convention: minusculesEtTirets },
  avant: 'fontSize/bodyLarge', apres: 'font-size/body-large', autres: 0, variables: 66, collections: 0, nouveau: false,
  apercu: [ligne('v5', '', 'fontSize', '/bodyLarge', ['terme:background'])],
};

const questions = [
  { type: 'paire', cle: 'paire:bg|background', indice: 'abreviation', termes: [terme('bg', 12, [fond]), terme('background', 40, [fondPlein], true)], propose: 1, cibleCommune: null },
  { type: 'ecriture-du-terme', cle: 'ecriture:backgrond', indice: 'faute', terme: terme('backgrond', 2, [fond]), proposition: ['background'], reference: { mot: 'background', nombre: 40 } },
  { type: 'echelle', cle: 'echelle:sm|small', formes: [['sm', 'md'], ['small', 'medium']], nombres: [20, 8], exemples: [tailleCourte, tailleLongue], propose: 0 },
  { type: 'collection', cle: 'collection:c2', nom: 'Couleurs', nombre: 34, proposee: 'color-brands' },
];

const bilan = {
  generation: 1, premierLancement: false, sansVariableLocale: false,
  ecriture: { groupes: ecritureDesGroupes, variables: ecritureDesVariables, collections: { reconnues: 5, total: 7 } },
  groupes: [groupeDeTerme, groupeDEcriture],
  bloques: [{ avant: 'Font Size', apres: 'font-size', collection: 'Typographie' }],
  proteges: 3,
  questions: questions.slice(0, 3),
  autresPistes: 2,
  plusTard: [questions[3]],
  collections: [
    { id: 'c1', nom: 'color-brands', nombre: 420, analysee: true, palettes: false },
    { id: 'c2', nom: 'Couleurs', nombre: 34, analysee: true, palettes: false },
    { id: 'c3', nom: 'primitives', nombre: 346, analysee: false, palettes: true },
  ],
  dernierRenommage: { nombre: 12, heure: '14:32' },
};

const fiche = {
  mot: 'bg', origine: 'personnalise', categorieUcm: null, definition: null,
  remplace: [{ mot: 'background', nombre: 40, ucm: true }],
  emploi: { nombre: 12, exemples: [fond] },
  ecart: false, voulu: false, distincts: [], question: 'paire:bg|background',
};

module.exports = {
  initial: { type: 'initial', dejaAnalyse: false },
  lecture: { type: 'lecture', demande: 1, lues: 400, total: 1200 },
  bilan: { type: 'bilan', demande: 1, bilan },
  lignes: { type: 'lignes', demande: 2, generation: 1, groupe: 'terme:background', debut: 0, lignes: [fond, fondPlein], total: 12 },
  termes: {
    type: 'termes', demande: 3, generation: 1, debut: 0,
    termes: [
      { mot: 'background', origine: 'ucm', statut: 'regle', remplace: ['bg'], avec: null, nombre: 40 },
      { mot: 'bg', origine: 'personnalise', statut: 'ecart', remplace: [], avec: 'background', nombre: 12 },
      { mot: 'sm', origine: null, statut: 'a-trancher', remplace: [], avec: null, nombre: 20 },
      { mot: 'radius', origine: null, statut: 'sans-regle', remplace: [], avec: null, nombre: 9 },
    ],
    total: 4, comptes: { tous: 4, avecRegle: 2, sansRegle: 2 },
  },
  fiche: { type: 'fiche', demande: 4, generation: 1, fiche },
  simulation: {
    type: 'simulation', demande: 5, generation: 1,
    effet: { sorte: 'terme', avant: 'bg', apres: 'background', nombre: 12, exemple: fond }, conflit: null,
  },
  refus: { type: 'refus', demande: 6, conflits: [{ type: 'cycle', termes: ['bg', 'back', 'bg'] }] },
  application: { type: 'application', demande: 7, resultat: { sorte: 'application', statut: 'applique', renommes: 66, sautes: 0, annulable: true } },
  reglesExportees: { type: 'regles-exportees', demande: 8, texte: '{"version":1}' },
  erreur: { type: 'erreur', demande: 9, code: 'generation-perimee' },
};
