/**
 * Les états des corrections du panneau des constats, dans la fenêtre du mode Composant, et les données d'Alert qu'ils
 * partagent avec `analyse.cjs` : un jeu de 11 variants, 24 constats, dont 9 portent une correction exacte.
 *
 * Les 19 premiers constats sont ceux de `donnees.cjs`, avec leurs variants et leurs types : la section Variants compte les mêmes
 * puces. Cinq constats sans variant s'y ajoutent, de quoi donner à chaque élément des points. Les layers prennent les
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
const modelePropose = { type: 'modele-propose', analyse: IDENTITE, variant: 'alert:0', constats: constatsDuModele().filter((constat) => constat.correction || constat.question || constat.id.startsWith('C40:')), retires: [] };

/**
 * La carte du modèle (C81) : le variant `alert:0` (info et standard) lie déjà des layers que dix autres variants gardent en dur. Une carte
 * par sorte, dans la section de sa sorte. `faits.lignes` est le texte JSON que le kit range : un layer, son champ et le token du modèle.
 * Les layers de `constatsCarteDuModele` sont ceux de la lecture ; `ailleurs` pose ceux d'un variant que la vue ne lit pas.
 */
const lignes = (...entrees) => JSON.stringify(entrees.map(([layer, champ, token]) => ({ layer, champ, token })));
const LIGNES_DES_COULEURS = lignes(['container', 'fills', 'alert/colors/info/standard/background'], ['icon', 'fills', 'alert/colors/info/standard/icon'], ['message', 'fills', 'alert/colors/info/standard/foreground']);
const LIGNES_DES_TAILLES = lignes(['container', 'itemSpacing', 'alert/sizes/gap'], ['container', 'paddingLeft', 'alert/sizes/padding-x'], ['container', 'paddingTop', 'alert/sizes/padding-y'], ['container', 'topLeftRadius', 'alert/sizes/border-radius']);
const c81 = (sorte, layers, faits) => ({
  id: `C81:${sorte}:alert:0`, code: 'C81', type: 'corriger', famille: sorte === 'couleurs' ? 'liaisons' : 'tailles', variants: ['alert:0'], layers, faits: { modele: 'alert:0', ...faits },
});
const constatsCarteDuModele = [c81('couleurs', [CONTAINER, ICON, MESSAGE], { layers: 3, variants: 10, liaisons: 3, lignes: LIGNES_DES_COULEURS }), c81('tailles', [CONTAINER], { layers: 1, variants: 10, liaisons: 4, lignes: LIGNES_DES_TAILLES })];
const analyseCarteDuModele = { type: 'analyse', analyse: IDENTITE, statut: 'complete', constats: constatsCarteDuModele, lecture: null, variants: variantsDuModele };
const analyseModeleAilleurs = { ...analyseCarteDuModele, constats: [c81('couleurs', ['alert:v:ailleurs:container', 'alert:v:ailleurs:icon'], { layers: 2, variants: 10, liaisons: 2, lignes: lignes(['container', 'fills', 'alert/colors/error/outlined/background'], ['icon', 'fills', 'alert/colors/error/outlined/icon']) })] };
/** Ce que le sandbox rend au clic : les deux C81 quittent l'analyse, les corrections du modèle arrivent. */
const modeleProposeApresLaCarte = { ...modelePropose, retires: constatsCarteDuModele.map((constat) => constat.id), constats: modelePropose.constats.filter((constat) => constat.correction) };
const panneauDuModele = (analyse) => [preferences(), etroite, choisir(alertModele), composant(alertModele), apercu(alertModele), { message: analyse }, { message: aucunIgnore }, { clic: '.bouton-panneau' }];
const proposer = { clic: '.bloc-actions .btn:not(.bouton-selectionner)' };
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
    regarder: 'Le sommaire : Tout, Couleurs 18, Tailles et forme 2, Tokens du composant 3, Règles d’utilisation 1 ; Couleurs repliée, les autres sections ouvertes ; chaque carte de correction a son Appliquer ; Texte tenu, la coche seule ; le pied compte 4 corrections, 8 layers et 1 instance, et propose Appliquer tout.',
    existe: true, atteinte: [preferences(), etroite, choisir(alertTexteSuccess), composant(alertTexteSuccess), apercu(alertTexteSuccess), ...panneauOuvert.slice(5)],
  },
  {
    id: 'c-modele', titre: 'Liaisons copiées depuis un variant', quand: 'Le sandbox propose les liaisons du variant info et standard aux autres variants, sans carte de modèle avant : l’analyse d’avant ne porte que des constats ordinaires.',
    regarder: 'Une carte « Copier les liaisons de Severity=info, Variant=standard » ; le variant copié s’écrit comme Figma le nomme ; le segment qui change d’un variant à l’autre est en vert ; la ligne qui lie une couleur en dur dit d’abord « couleur en dur », puis le variant en puces de valeurs seules ; le pied compte les liaisons cochées ; les constats d’avant la proposition restent.',
    existe: true, atteinte: [preferences(), etroite, choisir(alertModele), composant(alertModele), apercu(alertModele), { message: analyseAvantLeModele }, { message: aucunIgnore }, { message: modelePropose }, { clic: '.bouton-panneau' }],
  },
  {
    id: 'c-carte-modele', titre: 'La carte du modèle', quand: 'Alert est analysé : le variant info et standard lie déjà des layers que dix autres variants gardent en dur. Le designer ouvre le panneau.',
    regarder: 'Une carte À corriger dans Couleurs : « 3 layers ont une couleur en dur dans 10 variants. » ; la ligne grise « Un variant les lie déjà : » suivie des puces info et standard ; en bas de la carte, « Proposer les liaisons » puis Sélectionner ; le chevron reste en haut à droite. Une seconde carte dans Tailles et forme : « 1 layer a une taille en dur dans 10 variants. »',
    existe: true, atteinte: panneauDuModele(analyseCarteDuModele),
  },
  {
    id: 'c-carte-modele-ouverte', titre: 'La carte du modèle, dépliée', quand: 'Le designer ouvre la carte des couleurs par son chevron. Ouvrir une carte ne sélectionne rien dans Figma.',
    regarder: 'Deux colonnes, Layer et Token dans le modèle ; une ligne par layer lié du modèle : container fill, icon fill, message fill, chacune avec son token sans le préfixe du composant ; la ligne d’actions reste sous la liste.',
    existe: true, atteinte: [...panneauDuModele(analyseCarteDuModele), { clic: '.bloc-constat .bloc-bouton' }],
  },
  {
    id: 'c-carte-modele-proposee', titre: 'Après « Proposer les liaisons »', quand: 'Le designer clique « Proposer les liaisons » : le sandbox calcule sans rien écrire, puis rend les corrections du modèle et les deux cartes qu’elles remplacent.',
    regarder: 'Les deux cartes du modèle ont quitté le panneau ; Couleurs reste ouverte et porte la carte « Copier les liaisons de » avec ses lignes cochées et son Appliquer ; Tailles et forme n’a plus de point et passe en section tenue.',
    existe: true, atteinte: [...panneauDuModele(analyseCarteDuModele), proposer, { message: modeleProposeApresLaCarte }],
  },
  {
    id: 'c-carte-modele-ailleurs', titre: 'La carte d’un modèle que la vue ne lit pas', quand: 'Le variant modèle n’est pas celui que la vue affiche : ses layers sont absents de la lecture. Le designer ouvre le panneau, puis la carte par son chevron.',
    regarder: 'La carte a son chevron ; la liste donne les layers et les tokens du modèle error et outlined, tirés du constat et non de la vue : container fill et icon fill.',
    existe: true, atteinte: [...panneauDuModele(analyseModeleAilleurs), { clic: '.bloc-constat .bloc-bouton' }],
  },
  {
    id: 'c-clic', titre: 'Un constat cliqué', quand: 'Le designer choisit la puce Couleurs et ouvre la carte « info devient success ». Ouvrir une carte ne sélectionne rien dans Figma.',
    regarder: 'Le corps déplié montre la propriété, la règle, puis une ligne d’actions : Sélectionner, avec le signe de la sélection de Figma, et « Ne plus proposer pour ces 2 layers » ; la ligne grise de la carte ne dit rien de la sélection ; l’aperçu n’entoure aucun layer.',
    existe: true, atteinte: [preferences(), etroite, choisir(alertTexteSuccess), composant(alertTexteSuccess), apercu(alertTexteSuccess), ...panneauOuvert.slice(5), { clic: '.puce-element[data-element="couleurs"]' }, { clic: '.bloc-bouton' }, { clic: '.bloc-bouton' }],
  },
  {
    id: 'c-apres', titre: 'Après Appliquer', quand: 'Le designer applique les 4 corrections : le sandbox écrit, rend la ligne de réussite, puis périme l’analyse.',
    regarder: 'L’alerte « Le composant a changé depuis l’analyse » ; la ligne de réussite avec « Ctrl+Z dans Figma défait ce lot. » ; ni sommaire ni section tant que l’analyse est périmée.',
    existe: true, atteinte: [...panneauOuvert, appliquer, { message: lot }, perime('ecriture')],
  },
  {
    id: 'c-ctrlz', titre: 'Après un Ctrl+Z', quand: 'Le designer défait le lot dans Figma : le document change, l’analyse reste périmée.',
    regarder: 'L’alerte du composant changé ; plus de ligne de réussite : « Les constats datent d’avant le changement. » ; rien ne se relance avant Actualiser ou Analyser.',
    existe: true, atteinte: [...panneauOuvert, appliquer, { message: lot }, perime('ecriture'), perime('document')],
  },
  {
    id: 'e-ecriture', titre: 'Écriture en cours', quand: 'Le designer clique Appliquer ; le sandbox n’a pas encore répondu.',
    regarder: '« Écriture de 8 liaisons en cours. » à la place de la liste ; le pied garde son décompte, Appliquer tout est inactif.',
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

module.exports = { ETATS, alertCorrections, alertModele, analyseModele, analyseAvantLeModele, modelePropose, constatsCarteDuModele, modeleProposeApresLaCarte, constatsAlert, analyseCorrections, aucunIgnore, panneauOuvert, appliquer, lot, perime, lesIds, nomDeVariant, CONTAINER, ICON, MESSAGE };
