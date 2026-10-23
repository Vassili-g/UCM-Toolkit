const { preferences, etroite, choisir, composant, apercu, tag } = require('./aide.cjs');

const identite = { sujet: tag.sujet.id, generation: 1 };
const noms = [
  'Severity=info, Style=soft', 'Severity=info, Style=outline', 'Severity=error, Style=soft', 'Severity=error, Style=outline',
  'Severity=success, Style=soft', 'Severity=success, Style=outline', 'Severity=warning, Style=soft', 'Severity=warning, Style=outline',
];
const variants = noms.map((nom, rang) => ({ id: rang === 0 ? tag.sujet.id : `tag:variant:${rang}`, nom }));
const tagDuJeu = {
  ...tag,
  sujet: { ...tag.sujet, variant: 'Outline' },
  releve: {
    ...tag.releve,
    collections: tag.releve.collections.map((collection) => collection.id === 'brand'
      ? { ...collection, modes: collection.modes.map((mode, rang) => rang === 0 ? { ...mode, nom: 'intencial' } : mode) }
      : collection),
  },
};
const analyse = {
  type: 'analyse', analyse: identite, statut: 'complete',
  constats: [{ id: 'preparation:tag-sans-token', code: 'C16', type: 'corriger', famille: 'liaisons', variants: [], layers: [], faits: {} }],
  lecture: { layersLus: 16, layersNonLus: 0, variantsNonLus: [], manquees: [] }, variants,
};
const identiteLiaisons = { ...identite, generation: 2 };
const entree = [preferences(), etroite, choisir(tagDuJeu), composant(tagDuJeu), apercu(tagDuJeu), { message: analyse }, { clic: '.bouton-panneau' }, { clic: '[data-focus="directes"]' }, { clic: '#onglet-a-faire' }];

const questions = [
  { id: 'intensite', indice: 'Les statuts : soft ou vivid ?', candidats: [{ nom: 'soft' }, { nom: 'vivid' }] },
  { id: 'style:soft', indice: 'Style=soft : quel dossier ?', candidats: [{ nom: 'solid' }, { nom: 'surface' }, { nom: 'page' }] },
  { id: 'style:outline', indice: 'Style=outline : quel dossier ?', candidats: [{ nom: 'solid' }, { nom: 'surface' }, { nom: 'page' }] },
  { id: 'nom:Frame 12', indice: 'Le layer Frame 12 : quel nom ?', candidats: [{ nom: 'label' }, { nom: 'badge' }, { nom: 'Autre nom…' }] },
];
const variables = [
  ['components/tag/color/danger/soft/background', 'theme/danger/soft/surface/default'],
  ['components/tag/color/danger/outline/border', null],
  ['components/tag/color/danger/soft/border', 'theme/danger/soft/surface/border'],
  ['components/tag/color/danger/soft/solid/background', 'theme/danger/soft/solid/default'],
  ['components/tag/color/danger/soft/page/foreground', 'theme/danger/soft/page/foreground'],
  ['components/tag/color/danger/outline/border', 'theme/danger/soft/page/border'],
  ['components/tag/color/warning/soft/background', 'theme/warning/soft/surface/default'],
  ['components/tag/color/warning/soft/foreground', 'theme/warning/soft/surface/foreground'],
  ['components/tag/color/warning/soft/border', 'theme/warning/soft/surface/border'],
  ['components/tag/color/success/soft/background', 'theme/success/soft/surface/default'],
  ['components/tag/color/success/soft/foreground', 'theme/success/soft/surface/foreground'],
  ['components/tag/color/success/soft/border', 'theme/success/soft/surface/border'],
  ['components/tag/size/padding-x', 'layout/sizing/2'],
  ['components/tag/size/padding-y', 'layout/sizing/1'],
  ['components/tag/size/corner-radius', 'layout/radius/2'],
  ['components/tag/color/info/soft/background', 'theme/info/soft/surface/default'],
];
const couchesLiaisons = ['tag:0', 'tag:1', ...Array.from({ length: 12 }, (_, rang) => `tag:preparation:${rang}`)];
const liaisonsVisibles = [
  { nom: 'components/tag/color/danger/soft/background', variants: [], calque: undefined, ajout: 'background' },
  { nom: 'components/tag/color/danger/soft/foreground', variants: [], calque: undefined, ajout: 'foreground' },
  { nom: 'components/tag/color/warning/outline/border', variants: [], calque: 'container', ajout: undefined },
];
const analyseLiaisons = { ...analyse, analyse: identiteLiaisons, constats: liaisonsVisibles.map(({ nom, variants: variantsDuConstat, calque, ajout }, rang) => ({
  id: `preparation:tag:${rang}`, code: 'C16', type: 'corriger', famille: 'liaisons', variants: variantsDuConstat, layers: couchesLiaisons.slice(rang * 5, rang === 2 ? 14 : rang * 5 + 5),
  faits: { preparation: 'tag', variablesNonPubliees: 2, ...(calque ? { calque } : {}), ...(ajout ? { ajout } : {}) },
  correction: { id: `prep:${rang}`, sorte: 'liaison', cible: { layer: rang === 1 ? 'tag:1' : 'tag:0', champ: 'fills', indice: 0 }, avant: null, apres: { cle: `key:${rang}`, nom }, aRelire: { axes: {}, regle: 'Préparation de Tag', avant: null } },
})) };
const plan = {
  variables: variables.map(([nom, cible], rang) => ({
    nom, type: rang < 12 || rang === 15 ? 'COLOR' : 'FLOAT', vise: cible ? { nom: cible } : null, statut: rang === 15 ? 'existe' : 'a-creer', attend: [], concerne: [],
  })),
  questions,
};
const source = { fichier: 'Tag', cleDuFichier: 'tag-file', jeu: { cle: 'tag', nom: 'Tag' } };
const rangee = {
  id: 'prep-tag', source, creeLe: '2026-10-23T12:00:00.000Z', regles: [],
  variables: variables.map(([nom, cible], rang) => ({ nom, type: rang < 12 || rang === 15 ? 'COLOR' : 'FLOAT', cibles: { Light: cible }, layers: rang + 1, etat: rang === 15 ? 'existe-identique' : 'a-creer' })),
};
const preparations = { message: { type: 'preparations', preparations: [rangee], nouvelle: rangee.id } };
const ouvrir = { clic: '.prep-ouvrir' };
const coller = { clic: '.prep-coller' };
const copier = { clic: '.prep-copier' };

const ETATS = [
  { id: 'g-entree', titre: 'Préparer les tokens', quand: 'Tag est sélectionné et analysé.', regarder: 'Le bouton Préparer les tokens apparaît dans le panneau des constats.', existe: true, atteinte: entree },
  { id: 'g-preparer', titre: 'Répondre à la préparation', quand: 'Les questions du plan sont ouvertes.', regarder: 'Les termes UCM et leur description sont présentés avec les tokens visés.', existe: true, atteinte: [...entree, ouvrir, { message: { type: 'plan-de-preparation', analyse: identite, plan, refus: null } }, { clic: 'input[name="intensite"][value="soft"]' }, { message: { type: 'plan-de-preparation', analyse: identite, plan, refus: null } }, { clic: 'input[name="style:soft"][value="surface"]' }, { message: { type: 'plan-de-preparation', analyse: identite, plan, refus: null } }] },
  { id: 'g-pret', titre: 'Préparation rangée', quand: 'La préparation de Tag est rangée sur le poste.', regarder: 'La préparation propose de copier en texte ou de l’abandonner.', existe: true, atteinte: [...entree, ouvrir, preparations] },
  { id: 'g-lier', titre: 'Liaisons préparées', quand: 'La préparation est revenue au composant.', regarder: 'Les liaisons préparées sont annoncées dans le panneau.', existe: true, atteinte: [...entree, { message: { ...analyseLiaisons } }, { message: { type: 'liaisons-preparees', analyse: identiteLiaisons, preparation: rangee.id, corrections: Array.from({ length: 14 }, (_, rang) => ({ id: `prep:${rang}`, sorte: 'liaison', cible: { layer: 'tag:0', champ: 'fills', indice: 0 }, avant: null, apres: { cle: `key:${rang}`, nom: variables[rang][0] }, aRelire: { axes: {}, regle: 'préparé', avant: null } })), enAttente: [], ecartees: 0, refus: null } }, { clic: '#onglet-corrections' }] },
  { id: 'g-sans-cibles', titre: 'Cibles absentes', quand: 'Les tokens visés ne sont pas disponibles dans le fichier.', regarder: 'Une information indique que la collection theme manque.', existe: true, atteinte: [...entree, ouvrir, { message: { type: 'plan-de-preparation', analyse: identite, plan: null, refus: 'sans-cibles' } }], disposition: 'etroite' },
  { id: 'g-autre', titre: 'Autre composant', quand: 'Une préparation rangée vient d’un autre composant.', regarder: 'Les liaisons restent indisponibles pour ce composant.', existe: true, atteinte: [...entree, ouvrir, { message: { type: 'liaisons-preparees', analyse: identite, preparation: rangee.id, corrections: [], enAttente: [], ecartees: 0, refus: 'autre-composant' } }], disposition: 'etroite' },
  { id: 'g-coller', titre: 'Préparation reçue', quand: 'Un autre designer a envoyé le texte de sa préparation.', regarder: 'Le texte peut être collé puis lu.', existe: true, atteinte: [...entree, ouvrir, { message: { type: 'preparations', preparations: [] } }, { clic: '.prep-coller' }, { message: { type: 'preparations', preparations: [] } }], disposition: 'etroite' },
  { id: 'g-preparation-copiee', titre: 'Texte copié', quand: 'Le designer copie une préparation rangée.', regarder: 'La préparation est transmise en texte.', existe: true, atteinte: [...entree, ouvrir, preparations, copier, { message: { type: 'preparation-texte', preparation: rangee.id, texte: '{"format":"ucm-preparation"}' } }] },
  { id: 'g-texte-refuse', titre: 'Texte refusé', quand: 'Le texte reçu ne décrit pas une préparation UCM.', regarder: 'Le motif de refus est présenté dans la zone de collage.', existe: true, atteinte: [...entree, ouvrir, preparations, coller, { message: { type: 'texte-refuse', motif: 'format' } }], disposition: 'etroite' },
];

module.exports = { ETATS };
