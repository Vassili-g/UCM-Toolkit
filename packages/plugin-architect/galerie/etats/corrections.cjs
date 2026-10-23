/**
 * Les états de l'onglet Corrections du panneau des constats, dans la fenêtre du mode Composant, et les données d'Alert qu'ils
 * partagent avec `analyse.cjs` : un jeu de 11 variants, 24 constats, dont 9 portent une correction exacte.
 *
 * Les 19 premiers constats sont ceux de `donnees.cjs`, avec leurs variants et leurs types : la section Variants compte les mêmes
 * puces. Cinq constats sans variant s'y ajoutent, de quoi donner à chaque onglet le compte de la maquette. Les layers prennent les
 * noms de la maquette : container, icon, message.
 */
const { alertEnJeu, analyseAlert, IDENTITE } = require('../composant/donnees.cjs');
const { preferences, etroite, choisir, composant, apercu } = require('./aide.cjs');

const NOMS_DES_LAYERS = { 0: 'container', 1: 'icon', 3: 'message' };

/**
 * Alert dont les layers portent les noms de la maquette ; `alertTexteSuccess` lit en plus le token foreground de success : la maquette
 * de Corrections montre ses trois lignes de couleur sous `success`, avec deux liaisons à changer seulement.
 */
const FOREGROUND = 'components/alert/colors/success/standard/foreground';
const variableForeground = alertEnJeu.releve.variables.find((variable) => variable.id.endsWith('/info/standard/foreground'));
const alertCorrections = { ...alertEnJeu, calques: alertEnJeu.calques.map((calque, rang) => (NOMS_DES_LAYERS[rang] ? { ...calque, nom: NOMS_DES_LAYERS[rang] } : calque)) };
const alertTexteSuccess = {
  ...alertCorrections,
  liaisons: alertEnJeu.liaisons.map((liaison) => (liaison.variable.endsWith('/info/standard/foreground') ? { ...liaison, variable: FOREGROUND } : liaison)),
  releve: { ...alertEnJeu.releve, variables: [...alertEnJeu.releve.variables, { ...variableForeground, id: FOREGROUND, nom: 'alert/colors/success/standard/foreground', cle: `cle-${FOREGROUND}` }] },
};
const CONTAINER = alertCorrections.calques[0].id;
const ICON = alertCorrections.calques[1].id;
const MESSAGE = alertCorrections.calques[3].id;

const REGLE_SUCCESS = 'Un variant Severity=success emploie les tokens de success.';
const liaison = (id, layer, champ, avant, apres, regle) => ({ id, sorte: 'liaison', cible: { layer, champ }, avant, apres: { nom: apres }, aRelire: { regle, avant } });
const nomDeVariant = (rang) => analyseAlert.variants[rang].nom;
const variantsAlert = analyseAlert.variants;
const de = (constat, rang) => ({ ...analyseAlert.constats[rang], ...constat });

/** Les constats d'Alert : quatre cartes de corrections, trois questions, douze constats à faire dans Figma. */
function constatsDAlert() {
  const base = analyseAlert.constats.map((constat) => ({ ...constat }));
  const idDuVariant = (nom) => variantsAlert.find((variant) => variant.nom === nom).id;
  const jeu = [...base];
  // Carte « info devient success » : deux layers du variant affiché.
  jeu[8] = de({ layers: [ICON], faits: { calque: 'icon' }, correction: liaison('cor:icon', ICON, 'fills', 'alert/colors/info/standard/icon', 'alert/colors/success/standard/icon', REGLE_SUCCESS) }, 8);
  jeu[9] = de({ layers: [CONTAINER], faits: { calque: 'container' }, correction: liaison('cor:container', CONTAINER, 'fills', 'alert/colors/info/standard/background', 'alert/colors/success/standard/background', REGLE_SUCCESS) }, 9);
  // Carte « Lier le texte » : le layer message des quatre variants outlined.
  for (const [rang, severity] of [[1, 'info'], [5, 'error'], [11, 'success'], [16, 'warning']]) {
    const variant = jeu[rang].variants[0];
    const layer = `${idDuVariant(`Severity=${severity}, Variant=outlined`)}:message`;
    jeu[rang] = de({ code: 'C59', layers: [layer], faits: { calque: 'message' }, correction: liaison(`cor:texte:${severity}`, layer, 'fills', null, `alert/colors/${severity}/outlined/foreground`, `Le texte d'un variant outlined emploie le token foreground de ${severity}.`) }, rang);
    jeu[rang].variants = [variant];
  }
  // Carte « Lier le padding » : deux layers, sans variant précis.
  jeu[18] = { ...base[18], code: 'C30', famille: 'tailles', layers: ['alert:l:gauche'], faits: { calque: 'container' }, correction: liaison('cor:padding-x', 'alert:l:gauche', 'paddingLeft', null, 'alert/sizes/padding-x', 'Le padding horizontal d’Alert vise alert/sizes/padding-x.') };
  jeu.push({ id: 'C30:19', code: 'C30', type: 'corriger', famille: 'tailles', variants: [], layers: ['alert:l:haut'], faits: { calque: 'container' }, correction: liaison('cor:padding-y', 'alert:l:haut', 'paddingTop', null, 'alert/sizes/padding-y', 'Le padding vertical d’Alert vise alert/sizes/padding-y.') });
  // Carte « Créer l'instance de règles ».
  jeu.push({ id: 'C60:20', code: 'C60', type: 'corriger', famille: 'regles', variants: [], layers: [], faits: { regles: 3, proprietes: 'Severity, Variant, Dismissible' }, correction: { id: 'cor:regles', sorte: 'regles', cible: {}, avant: null, apres: { nom: 'alert' }, aRelire: { regle: 'Alert a trois properties : une instance de règles les range.', avant: null } } });
  // Trois questions, sur des constats qui avaient déjà un variant.
  for (const rang of [12, 6, 14]) jeu[rang] = { ...jeu[rang], question: { id: `q:${jeu[rang].id}`, candidats: [{ nom: 'alert/colors/info/standard/title' }] } };
  // Trois constats à faire dans Figma de plus, sans variant.
  for (const rang of [21, 22, 23]) jeu.push({ id: `C40:${rang}`, code: 'C40', type: 'corriger', famille: 'tokens', variants: [], layers: [], faits: {} });
  // La carte « info devient success » ouvre la liste, comme dans la maquette.
  return [jeu[8], jeu[9], ...jeu.filter((_, rang) => rang !== 8 && rang !== 9)];
}

/**
 * Alert dont le variant affiché est `info, standard` : le designer le prend pour modèle. Trois liaisons exactes copient les siennes,
 * trois cas attendent dans Questions ; les 19 constats de base gardent leurs variants.
 */
const MODELE = 'Severity=info, Variant=standard';
const variantsDuModele = analyseAlert.variants.map((variant) => (variant.nom === MODELE ? { ...variant, id: 'alert:0' } : variant.id === 'alert:0' ? { ...variant, id: `alert:v:${variant.nom}` } : variant));
const alertModele = { ...alertCorrections, sujet: { ...alertCorrections.sujet, variant: MODELE, variants: variantsDuModele } };
function constatsDuModele() {
  const jeu = analyseAlert.constats.map((constat) => ({ ...constat }));
  const copie = (rang, id, avant, apres, calque, champ = 'fills') => {
    const layer = `alert:v:${id}`;
    jeu[rang] = { ...jeu[rang], layers: [layer], faits: { modele: MODELE, calque }, correction: liaison(`cor:modele:${id}`, layer, champ, avant, apres, `Le variant ${MODELE} sert de modèle.`) };
  };
  copie(5, 'erreur-icon', 'alert/colors/info/standard/icon', 'alert/colors/error/outlined/icon', 'icon');
  copie(14, 'alerte-fond', 'alert/colors/info/standard/background', 'alert/colors/warning/standard/background', 'container');
  copie(13, 'succes-icon', null, 'alert/colors/success/filled/icon', 'icon');
  const question = (rang, modele) => { jeu[rang] = { ...jeu[rang], faits: modele ? { modele: MODELE } : {}, question: { id: `q:${jeu[rang].id}`, candidats: [{ nom: 'alert/colors/info/standard/title' }] } }; };
  for (const rang of [12, 6, 15]) question(rang, true);
  for (const rang of [2, 10, 17]) question(rang, false);
  for (const rang of [19, 20]) jeu.push({ id: `C40:${rang}`, code: 'C40', type: 'corriger', famille: 'tokens', variants: [], layers: [], faits: {} });
  return [jeu[5], jeu[14], jeu[13], ...jeu.filter((_, rang) => ![5, 14, 13].includes(rang))];
}

const constatsAlert = constatsDAlert();
const analyseCorrections = { type: 'analyse', analyse: IDENTITE, statut: 'complete', constats: constatsAlert, lecture: null, variants: variantsAlert };
const analyseModele = { type: 'analyse', analyse: IDENTITE, statut: 'complete', constats: constatsDuModele(), lecture: null, variants: variantsDuModele };
/** L'analyse d'avant le geste : les 19 constats de base. Le sandbox y range ensuite ceux du modèle (`modele-propose`). */
const dEntree = [5, 14, 13];
const constatsAvantLeModele = [...dEntree.map((rang) => analyseAlert.constats[rang]), ...analyseAlert.constats.filter((_, rang) => !dEntree.includes(rang))];
const analyseAvantLeModele = { type: 'analyse', analyse: IDENTITE, statut: 'complete', constats: constatsAvantLeModele, lecture: null, variants: variantsDuModele };
/** Ce que le sandbox rend à `servir-de-modele` : les constats du modèle que `constatsDuModele` a changés ou ajoutés. */
const modelePropose = { type: 'modele-propose', analyse: IDENTITE, variant: 'alert:0', constats: constatsDuModele().filter((constat) => constat.correction || constat.question || constat.id.startsWith('C40:')) };
const aucunIgnore = { type: 'ignores', analyse: IDENTITE, constats: [] };
const lesIds = constatsAlert.flatMap((constat) => (constat.correction ? [constat.correction.id] : []));

/** Le composant lu, analysé, le panneau ouvert. */
const panneauOuvert = [preferences(), etroite, choisir(alertCorrections), composant(alertCorrections), apercu(alertCorrections), { message: analyseCorrections }, { message: aucunIgnore }, { clic: '.bouton-panneau' }];
const appliquer = { clic: '.corrections-pied .btn-primary' };
const lot = { type: 'corrections-appliquees', analyse: IDENTITE, ecrites: 9, sautees: [], resume: '8 layers liés, 1 instance de règles créée' };
const perime = (cause) => ({ message: { type: 'perime', analyse: IDENTITE, cause } });

const ETATS = [
  {
    id: 'c-corrections', titre: 'Corrections du composant', quand: 'Alert est analysé : 24 constats, dont 9 portent une correction ; le designer ouvre le panneau.',
    regarder: 'Trois onglets avec leur compte ; quatre intertitres de cartes, la première ouverte ; les liaisons que les corrections cochées vont changer, le segment nouveau en vert dans la vue ; le pied compte 4 corrections, 8 layers et 1 instance.',
    existe: true, atteinte: [preferences(), etroite, choisir(alertTexteSuccess), composant(alertTexteSuccess), apercu(alertTexteSuccess), ...panneauOuvert.slice(5)],
  },
  {
    id: 'c-modele', titre: 'Liaisons copiées depuis un variant', quand: 'Le designer clique « Copier ses liaisons aux autres variants » : le variant affiché, info et standard, sert de modèle, et le sandbox propose ses liaisons aux autres variants.',
    regarder: 'Une carte « Copier les liaisons de Severity=info, Variant=standard » ; le variant copié s’écrit comme Figma le nomme ; le segment qui change d’un variant à l’autre est en vert ; le pied compte les liaisons cochées ; les constats d’avant le geste restent.',
    existe: true, atteinte: [preferences(), etroite, choisir(alertModele), composant(alertModele), apercu(alertModele), { message: analyseAvantLeModele }, { message: aucunIgnore }, { clic: '[data-action="copier-les-liaisons"]' }, { message: modelePropose }, { clic: '.bouton-panneau' }],
  },
  {
    id: 'c-clic', titre: 'Un constat cliqué', quand: 'Le designer ouvre la carte « info devient success » : le plugin sélectionne ses deux layers dans Figma.',
    regarder: 'La ligne grise de la carte ajoute « Sélectionnés dans Figma. » ; la carte montre la propriété, la règle et « Ne plus proposer pour ces 2 layers » ; l’aperçu entoure le layer sélectionné.',
    existe: true, atteinte: [preferences(), etroite, choisir(alertTexteSuccess), composant(alertTexteSuccess), apercu(alertTexteSuccess), ...panneauOuvert.slice(5), { clic: '.bloc-bouton' }, { clic: '.bloc-bouton' }, { message: { type: 'selection', sujet: { id: alertCorrections.sujet.id, portee: CONTAINER }, ignores: 1, origine: 'plugin' } }],
  },
  {
    id: 'c-apres', titre: 'Après Appliquer', quand: 'Le designer applique les 4 corrections : le sandbox écrit, rend la ligne de réussite, puis périme l’analyse.',
    regarder: 'L’alerte « Le composant a changé depuis l’analyse » ; Corrections à 0 ; la ligne de réussite avec « Ctrl+Z dans Figma défait ce lot. » ; Questions et À faire gardent leur compte.',
    existe: true, atteinte: [...panneauOuvert, appliquer, { message: lot }, perime('ecriture')],
  },
  {
    id: 'c-ctrlz', titre: 'Après un Ctrl+Z', quand: 'Le designer défait le lot dans Figma : le document change, l’analyse reste périmée.',
    regarder: 'L’alerte du composant changé ; plus de ligne de réussite : « Les constats datent d’avant le changement. » ; rien ne se relance avant Actualiser ou Analyser.',
    existe: true, atteinte: [...panneauOuvert, appliquer, { message: lot }, perime('ecriture'), perime('document')],
  },
  {
    id: 'e-ecriture', titre: 'Écriture en cours', quand: 'Le designer clique Appliquer ; le sandbox n’a pas encore répondu.',
    regarder: '« Écriture de 8 liaisons en cours. » sous les onglets ; le pied garde son décompte, Appliquer est inactif.',
    existe: true, atteinte: [...panneauOuvert, appliquer],
  },
  {
    id: 'analyse-occupee', titre: 'Écriture refusée, le plugin est occupé', quand: 'Le designer clique Appliquer pendant une autre opération : le sandbox répond « occupé ».',
    regarder: 'La liste des corrections revient telle qu’elle était, Appliquer redevient actif ; rien n’a été écrit.',
    existe: true, atteinte: [...panneauOuvert, appliquer, { message: { type: 'occupe', analyse: IDENTITE } }],
  },
  {
    id: 'corrections-sautees', titre: 'Corrections sautées', quand: 'Le sandbox écrit 8 corrections sur 9 et en saute une : le layer a disparu.',
    regarder: 'La ligne de réussite compte la correction sautée et dit pourquoi ; la carte qui la portait reste à appliquer.',
    existe: true,
    atteinte: [...panneauOuvert, appliquer, { message: { type: 'corrections-appliquees', analyse: IDENTITE, ecrites: 8, sautees: [{ id: 'cor:icon', motif: 'layer-absent' }], resume: '7 layers liés, 1 instance de règles créée. 1 correction sautée : 1 car le layer n’existe plus.' } }, perime('ecriture')],
  },
].map((etat) => ({ ...etat, disposition: 'etroite' }));

module.exports = { ETATS, alertCorrections, alertModele, analyseModele, analyseAvantLeModele, modelePropose, constatsAlert, analyseCorrections, aucunIgnore, panneauOuvert, appliquer, lot, perime, lesIds, nomDeVariant, CONTAINER, ICON, MESSAGE };
