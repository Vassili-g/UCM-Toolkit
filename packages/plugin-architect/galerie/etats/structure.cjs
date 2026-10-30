/**
 * Les états du domaine `structure` : « À faire dans Figma » et les corrections de modes et de scopes, dans le mode Tokens. Le sandbox du
 * domaine n'existe pas encore : l'état joue le message `structure` qu'il rendra, sous la demande 1 de ce domaine, que l'interface numérote à part.
 */
const { releveDeStructure, bilanDeStructure, structure } = require('../structure/donnees.cjs');
const { messages } = require('../nomenclature/donnees.cjs');
const { preferences, releve, groupe, chevron } = require('./aide.cjs');

/** L'explorateur sur `theme/primary`, le bilan de Nomenclature et la réponse du sandbox sur la structure. */
const ouvert = () => [
  preferences(), releve(releveDeStructure()), chevron('primitives'), chevron('theme'), groupe('theme', 'primary'),
  { message: messages.initial(true) }, { message: messages.bilan(1, bilanDeStructure), attendre: '.liste' },
  { message: structure(1), attendre: '.structure-liste .bloc' },
];

const ETATS = [
  {
    id: 't-structure', titre: 'Tokens, À faire dans Figma', quand: 'Le designer ouvre À faire dans Figma, sur le groupe primary du thème ; le premier constat est déplié.',
    regarder: 'Six constats sous Alias, Modes, Valeurs et Couches ; chacun a son liseré, son icône et son mot ; les chemins sont cités dans les phrases, sur fond gris ; « vise » reste du texte ; « Ouvrir la fiche » est dans le constat déplié ; la pastille de l’onglet dit 6.',
    existe: true,
    atteinte: [...ouvert(), { clic: '#onglet-a-faire' }, { clic: '[role="tabpanel"]:not([hidden]) .bloc-bouton' }],
  },
  {
    id: 't-portees', titre: 'Corrections, modes et scopes', quand: 'Les corrections de la structure suivent les renommages dans Corrections, sans filtre de collection ; les deux cartes sont dépliées.',
    regarder: 'Sous Modes, « Viser la rampe Dark » avec brands/success/light/600 devenant dark ; sous Scopes, trois variables de surface qui passent de Show in all à Frame fill et Shape fill, en deux colonnes ; le pied dit « Appliquer écrit 4 corrections de modes et de scopes. ».',
    existe: true,
    atteinte: [...ouvert(), { clic: '.puce-x' }, { clic: '#panneau-a-appliquer .structure-liste .bloc-bouton' }, { clic: '#panneau-a-appliquer .structure-liste .bloc + .intertitre-structure + .bloc .bloc-bouton' }],
  },
];

/*
 * Le contrôle d'intégrité C82. Les constats sortent du vrai contrôle du kit sur sa fixture (`structure/integrite.cjs`). L'état joue
 * le message `structure` qu'en rend le sandbox, sous la demande 1 ; Appliquer prend la demande 2 et la relecture qui suit la 3.
 * Un bilan sans renommage laisse l'onglet Corrections à la structure seule, et la croix de la puce retire le filtre de l'arbre.
 */
const integrite = require('../structure/integrite.cjs');
const { bilans } = require('../nomenclature/donnees.cjs');

const ouvertIntegrite = (donneesDuReleve, constats, attendre, ignores) => [
  preferences(), releve(donneesDuReleve),
  { message: messages.initial(true) }, { message: messages.bilan(1, bilans.rienAFaire), attendre: '.etat' },
  { message: integrite.reponse(constats, 1, ignores), attendre },
  { clic: '.puce-x' },
];
const CARTES_DE_CORRECTION = '#panneau-a-appliquer .structure-liste .bloc';
const CARTES_A_FAIRE = '#panneau-a-faire .structure-liste .bloc';
const premiereCarte = { clic: '#panneau-a-appliquer .structure-liste .bloc-bouton' };
const appliquerLaStructure = { clic: '#panneau-a-appliquer .structure-pied .btn-primary' };
const creation = (ecrites, sautees) => ({ message: { type: 'structure-appliquee', demande: 2, ecrites, sautees }, attendre: '#panneau-a-appliquer .resultat:not([hidden])' });
const relecture = { message: integrite.reponse([], 3) };

ETATS.push(
  {
    id: 't-variables-manquantes', titre: 'Tokens, variables manquantes', quand: 'Le fichier n’a ni surface/subtle ni surface/divider dans ses 11 palettes, et neutral n’a pas page/foreground ; l’écriture des noms est choisie.',
    regarder: 'Sous « Variables manquantes », une carte par rôle, cochée, avec la phrase « Créer … dans 11 palettes de theme » ; la première est dépliée : une ligne par palette, le nom absent, puis ses alias Light et Dark et ses scopes ; le pied compte 23 corrections de structure ; « Tout désélectionner » est en tête de l’onglet.',
    existe: true,
    atteinte: [...ouvertIntegrite(integrite.releveDeBase(), integrite.manquantes, CARTES_DE_CORRECTION), premiereCarte],
  },
  {
    id: 't-crans', titre: 'Tokens, crans', quand: 'Les variables surface visent en Dark les crans de l’ancienne table.',
    regarder: 'Sous « Crans », une carte par rôle et par mode, décochée, qui dit le cran attendu, le cran visé et que la couleur change ; la première est dépliée : le segment qui change prend la couleur de sa colonne ; le pied dit « Aucune correction de structure cochée. ».',
    existe: true,
    atteinte: [...ouvertIntegrite(integrite.releveDeBase(), integrite.crans, CARTES_DE_CORRECTION), premiereCarte],
  },
  {
    id: 't-sans-ecriture', titre: 'Tokens, écriture non choisie', quand: 'Nomenclature n’a pas encore choisi l’écriture des noms : Architect ne crée aucune variable.',
    regarder: 'Sous « Variables manquantes » de À faire dans Figma, des cartes « Cette palette n’a pas … » qui renvoient à Nomenclature ; aucune carte dans Corrections.',
    existe: true,
    atteinte: [...ouvertIntegrite(integrite.releveDeBase(), integrite.sansEcriture.slice(0, 3), CARTES_A_FAIRE), { clic: '#onglet-a-faire' }],
  },
  {
    id: 't-sens-inconnu', titre: 'Tokens, sens de la palette inconnu', quand: 'Une palette vise des crans contraires : UCM ne sait pas quel texte elle met sur ses boutons.',
    regarder: 'Une carte à vérifier dans À faire dans Figma, dépliée : la phrase de la question, la variable en lieu, les deux cibles possibles en Light.',
    existe: true,
    atteinte: [...ouvertIntegrite(integrite.releveAuxEcarts(), integrite.sensInconnu, CARTES_A_FAIRE), { clic: '#onglet-a-faire' }, { clic: '#panneau-a-faire .bloc-bouton' }],
  },
  {
    id: 't-integrite-a-faire', titre: 'Tokens, À faire dans Figma, intégrité', quand: 'Un fichier aux écarts de toute sorte : un groupe sans alias, une rampe sans cran, un theme sans Dark, un type, un rangement, des couches.',
    regarder: 'Les intertitres « Variables manquantes », « Alias », « Modes », « Valeurs », « Couches », « Types » et « Rangement » ; chaque carte dit le problème, cite la variable et dit où le régler ; seules les cartes qui nomment une variable se déplient.',
    existe: true,
    atteinte: [...ouvertIntegrite(integrite.releveAuxEcarts(), integrite.aFaire, CARTES_A_FAIRE), { clic: '#onglet-a-faire' }],
  },
  {
    id: 't-apres-creation', titre: 'Tokens, après une création', quand: 'Le designer a appliqué les 23 variables manquantes ; le sandbox les a écrites et la relecture ne trouve plus rien.',
    regarder: 'La ligne verte « 23 corrections écrites. » et, dessous, « Publiez la library pour voir ces variables dans les fichiers de composants. » ; plus de pied ni de carte.',
    existe: true,
    atteinte: [...ouvertIntegrite(integrite.releveDeBase(), integrite.manquantes, CARTES_DE_CORRECTION), appliquerLaStructure, creation(23, []), relecture],
  },
  {
    id: 't-creation-sautee', titre: 'Tokens, création sautée', quand: 'Deux des variables existaient déjà dans le fichier : l’une avec les mêmes alias, l’autre avec d’autres.',
    regarder: 'La ligne verte « 21 corrections écrites, 2 sautées. », les deux noms sautés avec leur phrase, puis la phrase de publication.',
    existe: true,
    atteinte: [
      ...ouvertIntegrite(integrite.releveDeBase(), integrite.manquantes, CARTES_DE_CORRECTION), appliquerLaStructure,
      creation(21, [{ id: integrite.idsDeCreation[0], motif: 'deja-la' }, { id: integrite.idsDeCreation[1], motif: 'existe-divergente' }]), relecture,
    ],
  },
);

/*
 * Ignorer (Q6). Le sandbox ne rend plus `surface/subtle` (rôle ignoré dans tout le fichier) ni le `surface/divider` de `primary`
 * (ignoré pour cette palette) : il les range dans `ignores`, que l'onglet montre sous « Ignorés ».
 */
const sansLeRoleIgnore = integrite.sansEcriture.filter((constat) => constat.faits.variable !== 'surface/subtle');
const dividerDePrimary = sansLeRoleIgnore.find((constat) => constat.id === 'C82:variable-absente:theme:primary/surface/divider');
const encoreAFaire = sansLeRoleIgnore.filter((constat) => constat !== dividerDePrimary).slice(0, 1);

ETATS.push(
  {
    id: 't-role-ignore', titre: 'Tokens, rôle ignoré', quand: 'Le designer a ignoré surface/subtle dans tout le fichier, et surface/divider pour la seule palette primary.',
    regarder: 'Sous « Ignorés », en fin d’onglet, deux cartes muettes en tirets : « surface/subtle : ignorée dans tout le fichier. » et le constat de primary, chacune avec « Ne plus ignorer » ; les cartes du dessus ne citent plus surface/subtle.',
    existe: true,
    atteinte: [...ouvertIntegrite(integrite.releveDeBase(), encoreAFaire, CARTES_A_FAIRE, { constats: [dividerDePrimary], roles: ['surface/subtle'] }), { clic: '#onglet-a-faire' }],
  },
  {
    id: 't-menu-ignorer', titre: 'Tokens, menu Ignorer', quand: 'Le designer ouvre la carte d’un rôle absent d’une palette et clique sur Ignorer.',
    regarder: 'Un menu sous le bouton Ignorer, à deux choix : « Pour cette palette » et « Dans tout le fichier » ; la carte ne grandit pas.',
    existe: true,
    atteinte: [
      ...ouvertIntegrite(integrite.releveDeBase(), integrite.sansEcriture.slice(0, 3), CARTES_A_FAIRE), { clic: '#onglet-a-faire' },
      { clic: '#panneau-a-faire .bloc-bouton' }, { clic: '#panneau-a-faire .ignorer-hote button' },
    ],
  },
  {
    id: 't-cran-de-library', titre: 'Tokens, cran dont la cible est dans une library', quand: 'Les rampes Dark de primary viennent d’une library : UCM juge le cran sans pouvoir le corriger.',
    regarder: 'Sous « Crans », quatre cartes « En Dark, UCM attend le cran … Aujourd’hui elle vise le cran … », avec « Changez sa cible dans la fenêtre Variables » et la variable en lieu.',
    existe: true,
    atteinte: [...ouvertIntegrite(integrite.releveDeBase(), integrite.libraryEtScopes, CARTES_A_FAIRE), { clic: '#onglet-a-faire' }],
  },
  {
    id: 't-retrait-de-scopes', titre: 'Corrections, retrait de scopes', quand: 'Deux variables de brands portent encore le scope Show in all.',
    regarder: 'Sous « Scopes », une carte « Retirer les scopes de 2 variables de brands », cochée et dépliée : la colonne « Après l’application » dit « aucun scope ».',
    existe: true,
    atteinte: [...ouvertIntegrite(integrite.releveDeBase(), integrite.libraryEtScopes, CARTES_DE_CORRECTION), premiereCarte],
  },
);

module.exports = { ETATS };
