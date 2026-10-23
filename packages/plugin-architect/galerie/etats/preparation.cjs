const { preferences, etroite, choisir, composant, apercu, tag, releve, groupe, chevron } = require('./aide.cjs');
const { structureAFaire } = require('../structure/donnees.cjs');
const { bilans, messages, renommagesInterface } = require('../nomenclature/donnees.cjs');
const { releveIntencial } = require('./nomenclature.cjs');

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
/** Les seize variables de la préparation rangée : quinze à créer, dont les trois premières que la feuille montre, et une qui existe déjà. */
const variablesRangee = [
  ['components/tag/color/danger/soft/background', 'theme/danger/soft/surface/default'],
  ['components/tag/color/danger/soft/foreground', 'theme/danger/soft/surface/foreground'],
  ['components/tag/size/padding-x', 'layout/sizing/2'],
  ['components/tag/size/padding-y', 'layout/sizing/1'],
  ['components/tag/size/corner-radius', 'layout/radius/2'],
  ['components/tag/color/danger/soft/border', 'theme/danger/soft/surface/border'],
  ['components/tag/color/warning/soft/background', 'theme/warning/soft/surface/default'],
  ['components/tag/color/warning/soft/foreground', 'theme/warning/soft/surface/foreground'],
  ['components/tag/color/warning/soft/border', 'theme/warning/soft/surface/border'],
  ['components/tag/color/success/soft/background', 'theme/success/soft/surface/default'],
  ['components/tag/color/success/soft/foreground', 'theme/success/soft/surface/foreground'],
  ['components/tag/color/success/soft/border', 'theme/success/soft/surface/border'],
  ['components/tag/color/danger/outline/border', 'theme/danger/soft/page/border'],
  ['components/tag/color/danger/soft/solid/background', 'theme/danger/soft/solid/default'],
  ['components/tag/color/danger/soft/page/foreground', 'theme/danger/soft/page/foreground'],
  ['components/tag/color/info/soft/background', 'theme/info/vivid/surface/default'],
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
const creeLe = new Date();
creeLe.setHours(14, 20, 0, 0);
const rangeeAvec = (etats) => ({
  id: 'prep-tag', source, creeLe: creeLe.toISOString(), regles: [],
  variables: variablesRangee.map(([nom, cible], rang) => ({
    nom, type: cible.startsWith('layout/') ? 'FLOAT' : 'COLOR', cibles: { Light: cible }, layers: rang + 1, etat: etats(rang),
  })),
});
const rangee = rangeeAvec((rang) => (rang === 15 ? 'existe-identique' : 'a-creer'));
const preparations = { message: { type: 'preparations', preparations: [rangee], nouvelle: rangee.id } };
const ouvrir = { clic: '.prep-ouvrir' };
const coller = { clic: '.prep-coller' };
const copier = { clic: '.prep-copier' };
const releveTokens = { ...releveIntencial(), fichier: 'Intencial Tokens' };
/** Le fichier des tokens ouvert sur Interface, bilan et noms lus, puis le filtre de la collection retiré comme dans la maquette. */
const bilanDeTokens = (bilan) => ({ ...bilan, questions: renommagesInterface.questions });
const ouvertureTokens = (bilan = bilans.travail) => [
  preferences(), releve(releveTokens), { message: structureAFaire(1) }, groupe('interface'), chevron('interface'),
  { message: messages.initial(true) }, { message: messages.bilan(1, bilanDeTokens(bilan)), attendre: '.liste' }, { clic: '.puce-x' },
];
const rangements = { message: { type: 'preparations', preparations: [rangee] } };
const voirLesVariables = { clic: '[data-action="preparation-voir"]', attendre: '.feuille' };
const creer = { clic: '[data-action="preparation-creer"]' };
const creations = { message: { type: 'variables-creees', preparation: rangee.id, creees: 15, gardees: 1, sautees: 0, remplacees: 0, divergentes: [], echecs: [], journal: true, refus: null, collections: [] } };
const rangementsApresCreation = { message: { type: 'preparations', preparations: [rangeeAvec((rang) => (rang === 15 ? 'existe-identique' : 'creee'))] } };
const creationFaite = [...ouvertureTokens(), rangements, voirLesVariables, creer, creations, rangementsApresCreation];
const structureAnnulee = { message: { type: 'structure-annulee', demande: 1, refus: null, journal: 'lu', defaites: 15, sautees: [], restantes: 0, limiteDesUsages: true } };
const configuration = { message: { type: 'configuration', library: { cle: 'tokens', nom: 'Intencial Tokens', liaisons: 412 }, candidates: [{ cle: 'tokens', nom: 'Intencial Tokens', liaisons: 412 }, { cle: 'icons', nom: 'Icônes Intencial', liaisons: 0 }], niveau: 'AA' } };
const ouvrirConfiguration = [{ clic: '.icon-button', attendre: '.config-liste' }, configuration];
const aReglerApresCreation = { message: { type: 'variables-creees', preparation: rangee.id, creees: 12, gardees: 1, sautees: 3, remplacees: 0, divergentes: [{ nom: variablesRangee[2][0], vise: variablesRangee[2][1] }], echecs: [{ nom: variablesRangee[4][0], motif: 'cible-introuvable' }, { nom: variablesRangee[5][0], motif: 'erreur' }], journal: true, refus: null, collections: [] } };
const rangementsAReglerApresCreation = { message: { type: 'preparations', preparations: [{ ...rangee, variables: rangee.variables.map((variable, rang) => ({ ...variable, etat: rang === 15 ? 'existe-identique' : rang === 2 ? 'existe-divergente' : rang === 4 || rang === 5 ? 'echec' : 'creee' })) }] } };

const ETATS = [
  { id: 'g-entree', titre: 'Préparer les tokens', quand: 'Tag est sélectionné et analysé.', regarder: 'Le bouton Préparer les tokens apparaît dans le panneau des constats.', existe: true, atteinte: entree },
  { id: 'g-preparer', titre: 'Répondre à la préparation', quand: 'Les questions du plan sont ouvertes.', regarder: 'Les termes UCM et leur description sont présentés avec les tokens visés.', existe: true, atteinte: [...entree, ouvrir, { message: { type: 'plan-de-preparation', analyse: identite, plan, refus: null } }, { clic: 'input[name="intensite"][value="soft"]' }, { message: { type: 'plan-de-preparation', analyse: identite, plan, refus: null } }, { clic: 'input[name="style:soft"][value="surface"]' }, { message: { type: 'plan-de-preparation', analyse: identite, plan, refus: null } }] },
  { id: 'g-pret', titre: 'Préparation rangée', quand: 'La préparation de Tag est rangée sur le poste.', regarder: 'La préparation propose de copier en texte ou de l’abandonner.', existe: true, atteinte: [...entree, ouvrir, preparations] },
  { id: 'g-lier', titre: 'Liaisons préparées', quand: 'La préparation est revenue au composant.', regarder: 'Les liaisons préparées sont annoncées dans le panneau.', existe: true, atteinte: [...entree, { message: { ...analyseLiaisons } }, { message: { type: 'liaisons-preparees', analyse: identiteLiaisons, preparation: rangee.id, corrections: Array.from({ length: 14 }, (_, rang) => ({ id: `prep:${rang}`, sorte: 'liaison', cible: { layer: 'tag:0', champ: 'fills', indice: 0 }, avant: null, apres: { cle: `key:${rang}`, nom: variables[rang][0] }, aRelire: { axes: {}, regle: 'préparé', avant: null } })), enAttente: [], ecartees: 0, refus: null } }, { clic: '#onglet-corrections' }] },
  { id: 'g-creer', titre: 'Variables préparées', quand: 'Le fichier des tokens reçoit une préparation rangée sur ce poste, et le designer ouvre la liste.', regarder: 'L’alerte annonce 16 variables à créer pour Tag ; la feuille liste les trois premières, celle qui existe déjà, Afficher les 12 autres et Créer 15 variables.', existe: true, atteinte: [...ouvertureTokens(), rangements, voirLesVariables] },
  { id: 'g-cree', titre: 'Variables créées', quand: 'Le designer crée les variables préparées dans le fichier des tokens.', regarder: 'La ligne de résultat de Corrections dit 15 variables créées pour Tag, la publication et l’Historique ; l’alerte des variables à créer a disparu.', existe: true, atteinte: [...ouvertureTokens(bilans.apresLApplication), rangements, voirLesVariables, creer, creations, rangementsApresCreation] },
  { id: 'g-a-regler', titre: 'Variables à régler', quand: 'La création laisse une variable qui existe déjà avec une autre cible et deux échecs.', regarder: 'La feuille reste ouverte : « 3 variables restent à régler. », la ligne qui existe déjà propose Garder et Remplacer, les deux échecs disent pourquoi.', existe: true, atteinte: [...ouvertureTokens(), rangements, voirLesVariables, creer, aReglerApresCreation, rangementsAReglerApresCreation] },
  { id: 'cf-reglages', titre: 'Configuration des tokens', quand: 'Le designer ouvre Configuration dans le fichier des tokens.', regarder: 'La Configuration prend toute la fenêtre : architecture UCM, Library de tokens, niveau de contraste AA, préparation reçue, puis collections et règles du fichier.', existe: true, atteinte: [preferences(), releve(releveTokens), { message: structureAFaire(1) }, { message: messages.initial(true) }, { message: messages.bilan(1, { ...bilans.travail, architecture: 'ucm' }), attendre: '.liste' }, ...ouvrirConfiguration] },
  { id: 'cf-historique', titre: 'Historique de la configuration', quand: 'Le designer consulte l’historique après une création de variables.', regarder: 'Le dernier renommage, le dernier import, puis la dernière création de variables avec Annuler la création.', existe: true, atteinte: [...ouvertureTokens(bilans.avecUnImport), rangements, voirLesVariables, creer, creations, rangementsApresCreation, ...ouvrirConfiguration, { clic: '#onglet-historique' }] },
  { id: 'annuler-creation', titre: 'Création annulée', quand: 'Le designer annule la dernière création de variables dans Configuration, Historique.', regarder: 'Le résultat confirme les 15 variables supprimées et rappelle que les usages dans les autres fichiers ne se vérifient pas ; le bouton Annuler la création est inactif.', existe: true, atteinte: [...creationFaite, ...ouvrirConfiguration, { clic: '#onglet-historique' }, { clic: '[data-action="annuler-creation"]' }, structureAnnulee] },
  { id: 'g-sans-cibles', titre: 'Cibles absentes', quand: 'Les tokens visés ne sont pas disponibles dans le fichier.', regarder: 'Une information indique que la collection theme manque.', existe: true, atteinte: [...entree, ouvrir, { message: { type: 'plan-de-preparation', analyse: identite, plan: null, refus: 'sans-cibles' } }], disposition: 'etroite' },
  { id: 'g-autre', titre: 'Autre composant', quand: 'Une préparation rangée vient d’un autre composant.', regarder: 'Les liaisons restent indisponibles pour ce composant.', existe: true, atteinte: [...entree, ouvrir, { message: { type: 'liaisons-preparees', analyse: identite, preparation: rangee.id, corrections: [], enAttente: [], ecartees: 0, refus: 'autre-composant' } }], disposition: 'etroite' },
  { id: 'g-coller', titre: 'Préparation reçue', quand: 'Un autre designer a envoyé le texte de sa préparation.', regarder: 'Le texte peut être collé puis lu.', existe: true, atteinte: [...entree, ouvrir, { message: { type: 'preparations', preparations: [] } }, { clic: '.prep-coller' }, { message: { type: 'preparations', preparations: [] } }], disposition: 'etroite' },
  { id: 'g-preparation-copiee', titre: 'Texte copié', quand: 'Le designer copie une préparation rangée.', regarder: 'La préparation est transmise en texte.', existe: true, atteinte: [...entree, ouvrir, preparations, copier, { message: { type: 'preparation-texte', preparation: rangee.id, texte: '{"format":"ucm-preparation"}' } }] },
  { id: 'g-texte-refuse', titre: 'Texte refusé', quand: 'Le texte reçu ne décrit pas une préparation UCM.', regarder: 'Le motif de refus est présenté dans la zone de collage.', existe: true, atteinte: [...entree, ouvrir, preparations, coller, { message: { type: 'texte-refuse', motif: 'format' } }], disposition: 'etroite' },
];

module.exports = { ETATS, rangeeAvec, variablesRangee };
