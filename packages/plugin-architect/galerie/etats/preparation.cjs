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
  constats: [],
  lecture: { layersLus: 16, layersNonLus: 0, variantsNonLus: [], manquees: [] }, variants, sansTokens: true,
};
const identiteLiaisons = { ...identite, generation: 2 };
const entree = [preferences(), etroite, choisir(tagDuJeu), composant(tagDuJeu), apercu(tagDuJeu), { message: analyse }, { clic: '.bouton-panneau' }, { clic: '[data-focus="directes"]' }, { clic: '.puce-element[data-element="tokens"]' }];

const questions = [
  { id: 'intensite', indice: 'Les statuts : soft ou vivid ?', candidats: [{ nom: 'soft' }, { nom: 'vivid' }] },
  { id: 'dossier:soft', indice: 'Style=soft : quel dossier ?', candidats: [{ nom: 'solid' }, { nom: 'surface' }, { nom: 'page' }] },
  { id: 'dossier:outline', indice: 'Style=outline : quel dossier ?', candidats: [{ nom: 'solid' }, { nom: 'surface' }, { nom: 'page' }] },
  { id: 'nom:Frame 12', indice: 'Le layer Frame 12 : quel nom ?', candidats: [{ nom: 'label' }, { nom: 'badge' }, { nom: 'Autre nom…' }] },
  { id: 'cible:components/tag/size/corner-radius', indice: 'components/tag/size/corner-radius : quel token ?', candidats: [] },
];
const CRANS_DE_SURFACE = { light: 100, dark: 300 };
const CRANS_DU_TEXTE = { light: 800, dark: 950 };
const couleur = (nom, crans) => ({ nom, crans });
const lieu = (champ) => ({ variant: tag.sujet.id, layer: tag.sujet.id, champ, indice: 0 });
/** Seize variables : dix savent ce qu'elles visent, cinq couleurs attendent leurs questions, le rayon attend un token qui vaut sa valeur. */
const variables = [
  ['components/tag/color/danger/soft/background', null, ['intensite', 'dossier:soft']],
  ['components/tag/color/danger/outline/border', null, ['intensite', 'dossier:outline']],
  ['components/tag/color/danger/soft/foreground', null, ['intensite', 'dossier:soft']],
  ['components/tag/color/danger/soft/border', null, ['intensite', 'dossier:soft']],
  ['components/tag/color/danger/soft/frame-12/foreground', null, ['nom:Frame 12']],
  ['components/tag/color/warning/soft/background', couleur('theme/warning/soft/surface/default', CRANS_DE_SURFACE), []],
  ['components/tag/color/warning/soft/foreground', couleur('theme/warning/soft/surface/foreground', CRANS_DU_TEXTE), []],
  ['components/tag/color/warning/soft/border', couleur('theme/warning/soft/surface/border', CRANS_DU_TEXTE), []],
  ['components/tag/color/success/soft/background', couleur('theme/success/soft/surface/default', CRANS_DE_SURFACE), []],
  ['components/tag/color/success/soft/foreground', couleur('theme/success/soft/surface/foreground', CRANS_DU_TEXTE), []],
  ['components/tag/color/success/soft/border', couleur('theme/success/soft/surface/border', CRANS_DU_TEXTE), []],
  ['components/tag/color/info/soft/background', couleur('theme/info/soft/surface/default', CRANS_DE_SURFACE), []],
  ['components/tag/color/info/soft/foreground', couleur('theme/info/soft/surface/foreground', CRANS_DU_TEXTE), []],
  ['components/tag/color/danger/disabled/background', couleur('theme/disabled/background', { light: 100, dark: 100 }), []],
  ['components/tag/size/padding-x', { nom: 'layout/sizing/2', valeur: 8 }, [], ['paddingLeft', 'paddingRight']],
  ['components/tag/size/corner-radius', null, ['cible:components/tag/size/corner-radius'], ['cornerRadius']],
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
/** Le Tag du retour au composant : la ligne en attente nomme son layer par le message, la lecture du composant n'y change rien. */
const tagLie = tagDuJeu;
const analyseLiaisons = { ...analyse, analyse: identiteLiaisons, sansTokens: false };
const REGLE_DE_LIAISON = 'La variable a été préparée pour ce layer.';
const liaison = (layer, champ, nom, rang) => ({ id: `preparation:prep-tag:${layer}:${champ}:0`, sorte: 'liaison', cible: { layer, champ, indice: 0 }, avant: null, apres: { cle: `key:${rang}`, nom }, aRelire: { axes: {}, regle: REGLE_DE_LIAISON, avant: null } });
/** Le message du sandbox : deux liaisons que la library publiée permet déjà, une dont la variable attend sa publication. */
const liaisonsPreparees = {
  type: 'liaisons-preparees', analyse: identiteLiaisons, preparation: 'prep-tag',
  corrections: [liaison(tag.sujet.id, 'fills', 'components/tag/color/danger/soft/background', 0), liaison('tag:1', 'fills', 'components/tag/color/danger/soft/foreground', 1)],
  enAttente: [{ variable: 'components/tag/color/warning/outline/border', layer: tag.sujet.id, nomDuLayer: 'container', variant: 'tag:variant:7', champ: 'strokes' }],
  ecartees: 0, refus: null,
};
const plan = {
  variables: variables.map(([nom, vise, attend, champs = ['fills']]) => ({
    nom, type: nom.includes('/size/') ? 'FLOAT' : 'COLOR', vise, statut: 'a-creer', attend,
    concerne: champs.map(lieu),
  })),
  questions,
};
const cible = (role, nom, couleurHexa, crans) => ({ role, cible: nom, couleur: couleurHexa, crans });
const CRANS_700 = { light: 700, dark: 700 };
/** Ce que chaque réponse viserait, tel que le sandbox le calcule : la palette danger, une cible par rôle. */
const apercus = {
  intensite: {
    soft: [cible('background', 'theme/danger/soft/surface/default', '#FBE4DF', { light: 100, dark: 100 })],
    vivid: [cible('background', 'theme/danger/vivid/surface/default', '#F9C9BE', { light: 100, dark: 100 })],
  },
  'dossier:soft': {
    solid: [cible('background', 'theme/danger/soft/solid/default', '#C2412D', CRANS_700)],
    surface: [
      cible('background', 'theme/danger/soft/surface/default', '#FBE4DF', CRANS_DE_SURFACE),
      cible('foreground', 'theme/danger/soft/surface/foreground', '#8A2B1E', CRANS_DU_TEXTE),
      cible('border', 'theme/danger/soft/surface/border', '#8A2B1E', CRANS_DU_TEXTE),
    ],
    page: [cible('foreground', 'theme/danger/soft/page/foreground', '#B4402C', CRANS_700)],
  },
  'dossier:outline': {
    solid: [cible('background', 'theme/danger/soft/solid/default', '#C2412D', CRANS_700)],
    surface: [cible('background', 'theme/danger/soft/surface/default', '#FBE4DF', { light: 100, dark: 100 })],
    page: [cible('border', 'theme/danger/soft/page/border', '#B4402C', CRANS_700)],
  },
};
/** Le plan que le sandbox envoie : `mesures` donne les tailles que les layers portent en dur. */
const messageDuPlan = {
  type: 'plan-de-preparation', analyse: identite, plan, refus: null, apercus,
  mesures: { 'components/tag/size/padding-x': 8, 'components/tag/size/corner-radius': 13 },
};
/** Le même plan quand le fichier porte deux collections de thème et deux de mise en page : la préparation lit la première de chacune. */
const messageAvecDeuxCollections = {
  ...messageDuPlan,
  plan: { ...plan, collectionsEnDouble: [{ role: 'theme', retenue: 'theme', ignoree: 'theme-archive' }, { role: 'layout', retenue: 'layout', ignoree: 'layout-mobile' }] },
};
const source = { fichier: 'Tag', cleDuFichier: 'tag-file', jeu: { cle: tag.sujet.id, nom: 'Tag' } };
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
  { id: 'g-preparer', titre: 'Répondre à la préparation', quand: 'Les questions du plan sont ouvertes.', regarder: 'Les termes UCM et leur description sont présentés avec les tokens visés.', existe: true, atteinte: [...entree, ouvrir, { message: messageDuPlan }, { clic: 'input[name="intensite"][value="soft"]' }, { message: messageDuPlan }, { clic: 'input[name="dossier:soft"][value="surface"]' }, { message: messageDuPlan }] },
  { id: 'g-collections-en-double', titre: 'Deux collections de thème', quand: 'Le fichier porte deux collections reconnues comme theme et deux comme layout.', regarder: 'Deux informations à vérifier au-dessus des questions : chacune nomme les deux collections, celle que la préparation lit et celle qu’elle ignore. Aucun bouton.', existe: true, atteinte: [...entree, ouvrir, { message: messageAvecDeuxCollections }] },
  { id: 'g-pret', titre: 'Préparation rangée', quand: 'La préparation de Tag est rangée sur le poste.', regarder: 'La préparation propose de copier en texte ou de l’abandonner.', existe: true, atteinte: [...entree, ouvrir, preparations] },
  { id: 'g-lier', titre: 'Liaisons préparées', quand: 'La préparation est revenue au composant, après une nouvelle analyse.', regarder: 'Les liaisons préparées sont annoncées dans le panneau, et la section Tokens du composant montre la carte : deux lignes cochées, une ligne sans case qui attend sa publication.', existe: true, atteinte: [preferences(), configuration, etroite, choisir(tagLie), composant(tagLie), apercu(tagLie), { message: analyse }, { clic: '.bouton-panneau' }, { clic: '[data-focus="directes"]' }, { clic: '.puce-element[data-element="tokens"]' }, rangements, { message: analyseLiaisons }, { message: liaisonsPreparees }] },
  { id: 'g-creer', titre: 'Variables préparées', quand: 'Le fichier des tokens reçoit une préparation rangée sur ce poste, et le designer ouvre la liste.', regarder: 'L’alerte annonce 16 variables à créer pour Tag ; la feuille liste les trois premières, celle qui existe déjà, Afficher les 12 autres et Créer 15 variables.', existe: true, atteinte: [...ouvertureTokens(), rangements, voirLesVariables] },
  { id: 'g-cree', titre: 'Variables créées', quand: 'Le designer crée les variables préparées dans le fichier des tokens.', regarder: 'La ligne de résultat de Corrections dit 15 variables créées pour Tag, la publication et l’Historique ; l’alerte des variables à créer a disparu.', existe: true, atteinte: [...ouvertureTokens(bilans.apresLApplication), rangements, voirLesVariables, creer, creations, rangementsApresCreation] },
  { id: 'g-a-regler', titre: 'Variables à régler', quand: 'La création laisse une variable qui existe déjà avec une autre cible et deux échecs.', regarder: 'La feuille reste ouverte : « 3 variables restent à régler. », la ligne qui existe déjà propose Garder et Remplacer, les deux échecs disent pourquoi.', existe: true, atteinte: [...ouvertureTokens(), rangements, voirLesVariables, creer, aReglerApresCreation, rangementsAReglerApresCreation] },
  { id: 'cf-reglages', titre: 'Configuration des tokens', quand: 'Le designer ouvre Configuration dans le fichier des tokens.', regarder: 'La Configuration prend toute la fenêtre : architecture UCM, Library de tokens, niveau de contraste AA, préparation reçue, puis collections et règles du fichier.', existe: true, atteinte: [preferences(), releve(releveTokens), { message: structureAFaire(1) }, { message: messages.initial(true) }, { message: messages.bilan(1, { ...bilans.travail, architecture: 'ucm' }), attendre: '.liste' }, ...ouvrirConfiguration] },
  { id: 'cf-historique', titre: 'Historique de la configuration', quand: 'Le designer consulte l’historique après une création de variables.', regarder: 'Le dernier renommage, le dernier import, puis la dernière création de variables avec Annuler la création.', existe: true, atteinte: [...ouvertureTokens(bilans.avecUnImport), rangements, voirLesVariables, creer, creations, rangementsApresCreation, ...ouvrirConfiguration, { clic: '#onglet-historique' }] },
  { id: 'annuler-creation', titre: 'Création annulée', quand: 'Le designer annule la dernière création de variables dans Configuration, Historique.', regarder: 'Le résultat confirme les 15 variables supprimées et rappelle que les usages dans les autres fichiers ne se vérifient pas ; le bouton Annuler la création est inactif.', existe: true, atteinte: [...creationFaite, ...ouvrirConfiguration, { clic: '#onglet-historique' }, { clic: '[data-action="annuler-creation"]' }, structureAnnulee] },
  { id: 'g-sans-cibles', titre: 'Cibles absentes', quand: 'Les tokens visés ne sont pas disponibles dans le fichier.', regarder: 'Une information indique que la collection theme manque.', existe: true, atteinte: [...entree, ouvrir, { message: { type: 'plan-de-preparation', analyse: identite, plan: null, refus: 'sans-cibles', apercus: {}, mesures: {} } }], disposition: 'etroite' },
  { id: 'g-autre', titre: 'Autre composant', quand: 'Une préparation rangée vient d’un autre composant.', regarder: 'Les liaisons restent indisponibles pour ce composant.', existe: true, atteinte: [...entree, ouvrir, preparations, { message: { type: 'liaisons-preparees', analyse: identite, preparation: rangee.id, corrections: [], enAttente: [], ecartees: 0, refus: 'autre-composant' } }], disposition: 'etroite' },
  { id: 'g-coller', titre: 'Préparation reçue', quand: 'Un autre designer a envoyé le texte de sa préparation.', regarder: 'Le texte peut être collé puis lu.', existe: true, atteinte: [...entree, ouvrir, { message: { type: 'preparations', preparations: [] } }, { clic: '.prep-coller' }, { message: { type: 'preparations', preparations: [] } }], disposition: 'etroite' },
  { id: 'g-preparation-copiee', titre: 'Texte copié', quand: 'Le designer copie une préparation rangée.', regarder: 'La préparation est transmise en texte.', existe: true, atteinte: [...entree, ouvrir, preparations, copier, { message: { type: 'preparation-texte', preparation: rangee.id, texte: '{"format":"ucm-preparation"}' } }] },
  { id: 'g-texte-refuse', titre: 'Texte refusé', quand: 'Le texte reçu ne décrit pas une préparation UCM.', regarder: 'Le motif de refus est présenté dans la zone de collage.', existe: true, atteinte: [...entree, ouvrir, preparations, coller, { message: { type: 'texte-refuse', motif: 'format' } }], disposition: 'etroite' },
];

module.exports = { ETATS, rangeeAvec, variablesRangee, tagLie, analyseTag: analyse, analyseLiaisons, liaisonsPreparees, identite, identiteLiaisons, messageDuPlan, configuration: configuration.message };
