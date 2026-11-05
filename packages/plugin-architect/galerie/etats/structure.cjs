/**
 * Les états du domaine `structure` : les constats à régler dans Figma et les corrections de structure, rangés par catégorie dans l'onglet
 * Constats du mode Tokens. Le sandbox du
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
    id: 't-structure', titre: 'Tokens, constats à régler dans Figma', quand: 'Le designer ouvre Constats, sur le groupe primary du thème ; le premier constat à régler dans Figma est déplié.',
    regarder: 'Six constats à régler dans Figma, sous Alias, Modes, Valeurs et Couches ; chacun a son liseré, son icône et son mot ; les chemins sont cités dans les phrases, sur fond gris ; « vise » reste du texte ; « Ouvrir la fiche » est dans le constat déplié ; les renommages de Noms ouvrent la liste.',
    existe: true,
    atteinte: [...ouvert(), { clic: '#panneau-a-appliquer .bloc-constat .bloc-bouton' }],
  },
  {
    id: 't-portees', titre: 'Constats, modes et scopes', quand: 'Les corrections de la structure sont dans les sections Modes et Scopes de Constats, sans filtre de collection ; les deux cartes sont dépliées.',
    regarder: 'Dans la section Modes, « Viser la rampe Dark » avec brands/success/light/600 devenant dark ; dans la section Scopes, trois variables de surface qui passent de Show in all à Frame fill et Shape fill, en deux colonnes ; chaque section a « Tout cocher » et « Tout décocher » sous sa bande ; les cases sont décochées, le pied dit « Aucune correction cochée » et Appliquer est inactif.',
    existe: true,
    atteinte: [...ouvert(), { clic: '.puce-x' }, { clic: '.section-element[data-element="modes"] .bloc-bouton' }, { clic: '.section-element[data-element="scopes"] .bloc-bouton' }],
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
  { message: messages.initial(true) }, { message: messages.bilan(1, bilans.rienAFaire) },
  { message: integrite.reponse(constats, 1, ignores), attendre },
  { clic: '.puce-x' },
];
const CARTES_DE_CORRECTION = '#panneau-a-appliquer .structure-liste .bloc';
const CARTES_A_FAIRE = '#panneau-a-appliquer .structure-liste .bloc-constat';
const premiereCarte = { clic: '#panneau-a-appliquer .structure-liste .bloc-bouton' };
/** Toutes les cases arrivent décochées : « Tout cocher » du pied les coche, puis Appliquer du pied commun écrit la structure. */
const toutCocher = { clic: '#panneau-a-appliquer .corrections-pied .cocher-global' };
const appliquerLaStructure = { clic: '#panneau-a-appliquer .corrections-pied .btn-primary' };
const creation = (ecrites, sautees, sansAnnulation = []) => ({ message: { type: 'structure-appliquee', demande: 2, ecrites, sautees, sansAnnulation }, attendre: '#panneau-a-appliquer .resultat:not([hidden])' });
const relecture = { message: integrite.reponse([], 3) };

ETATS.push(
  {
    id: 't-variables-manquantes', titre: 'Tokens, variables manquantes', quand: 'Le fichier n’a ni surface/subtle ni surface/divider dans ses 11 palettes, et neutral n’a pas page/foreground ; l’écriture des noms est choisie.',
    regarder: 'Dans la section Variables manquantes, sous la bande, « Tout cocher » et « Tout décocher » ; une carte par rôle, décochée, avec la phrase « Créer … dans 11 palettes de theme » ; la première est dépliée : une ligne par palette, le nom absent, puis ses alias Light et Dark et ses scopes ; le pied dit « Aucune correction cochée », « Tout cocher » est à côté d’Appliquer, qui est inactif.',
    existe: true,
    atteinte: [...ouvertIntegrite(integrite.releveDeBase(), integrite.manquantes, CARTES_DE_CORRECTION), premiereCarte],
  },
  {
    id: 't-crans', titre: 'Tokens, crans', quand: 'Les variables surface visent en Dark les crans de l’ancienne table.',
    regarder: 'Dans la section Crans, une carte par rôle et par mode, décochée, qui dit le cran attendu, le cran visé et que la couleur change ; la première est dépliée : le segment qui change prend la couleur de sa colonne ; sous la bande, « Tout cocher » et « Tout décocher » ; le pied dit « Aucune correction cochée ».',
    existe: true,
    atteinte: [...ouvertIntegrite(integrite.releveDeBase(), integrite.crans, CARTES_DE_CORRECTION), premiereCarte],
  },
  {
    id: 't-sans-ecriture', titre: 'Tokens, écriture non choisie', quand: 'Nomenclature n’a pas encore choisi l’écriture des noms : Architect ne crée aucune variable.',
    regarder: 'Dans la section Variables manquantes, des constats « Cette palette n’a pas … » qui renvoient à Nomenclature ; aucune carte de correction à cocher, aucun bouton « Tout cocher » ni « Tout décocher » et aucun pied d’Appliquer.',
    existe: true,
    atteinte: ouvertIntegrite(integrite.releveDeBase(), integrite.sansEcriture.slice(0, 3), CARTES_A_FAIRE),
  },
  {
    id: 't-sens-inconnu', titre: 'Tokens, texte des boutons à contre-sens', quand: 'Le texte des boutons de primary vise le noir en Light quand les autres rôles de la palette attendent le blanc : UCM ne corrige pas ce choix et pose la question.',
    regarder: 'Une carte à vérifier dans la section Crans, dépliée : la phrase de la question, la variable en lieu, les deux cibles possibles en Light.',
    existe: true,
    atteinte: [...ouvertIntegrite(integrite.releveAuxEcarts(), integrite.sensInconnu, CARTES_A_FAIRE), { clic: '#panneau-a-appliquer .bloc-constat .bloc-bouton' }],
  },
  {
    id: 't-integrite-a-faire', titre: 'Tokens, constats d’intégrité', quand: 'Un fichier aux écarts de toute sorte : un groupe sans alias, une rampe sans cran, un theme sans Dark, un type, un rangement, des couches.',
    regarder: 'Les sections Variables manquantes, Crans, Modes, Couches, Types et Rangement ; Noms, Alias, Valeurs et Scopes sont tenues, en fin de liste ; chaque carte dit le problème, cite la variable et dit où le régler ; seules les cartes qui nomment une variable se déplient.',
    existe: true,
    atteinte: ouvertIntegrite(integrite.releveAuxEcarts(), integrite.aFaire, CARTES_A_FAIRE),
  },
  {
    id: 't-apres-creation', titre: 'Tokens, après une création', quand: 'Le designer a appliqué les 23 variables manquantes ; le sandbox les a écrites et la relecture ne trouve plus rien.',
    regarder: 'Le designer a coché les 23 corrections avec « Tout cocher » avant Appliquer. La ligne verte « 23 corrections écrites. » et, dessous, « Publiez la library pour voir ces variables dans les fichiers de composants. » ; plus de pied ni de carte de correction.',
    existe: true,
    atteinte: [...ouvertIntegrite(integrite.releveDeBase(), integrite.manquantes, CARTES_DE_CORRECTION), toutCocher, appliquerLaStructure, creation(23, []), relecture],
  },
  {
    id: 't-creation-sautee', titre: 'Tokens, création sautée', quand: 'Deux des variables existaient déjà dans le fichier : l’une avec les mêmes alias, l’autre avec d’autres.',
    regarder: 'Le designer a coché les 23 corrections avant Appliquer. La ligne verte « 21 corrections écrites, 2 sautées. », les deux noms sautés avec leur phrase, puis la phrase de publication.',
    existe: true,
    atteinte: [
      ...ouvertIntegrite(integrite.releveDeBase(), integrite.manquantes, CARTES_DE_CORRECTION), toutCocher, appliquerLaStructure,
      creation(21, [{ id: integrite.idsDeCreation[0], motif: 'deja-la' }, { id: integrite.idsDeCreation[1], motif: 'existe-divergente' }]), relecture,
    ],
  },
  {
    id: 't-creation-sans-annulation', titre: 'Tokens, création sans trace', quand: 'Le sandbox a créé trois variables, mais le fichier n’a pas gardé le journal réécrit : l’Historique ne pourra pas les annuler.',
    regarder: 'Le designer a coché les 23 corrections avant Appliquer. La ligne verte « 23 corrections écrites. », puis une alerte « À vérifier » : « UCM n’a pas pu garder la trace de ces créations. », les trois noms, puis « L’Historique ne pourra pas les annuler. Supprimez-les dans la fenêtre Variables si vous voulez revenir en arrière. » ; aucun bouton.',
    existe: true,
    atteinte: [
      ...ouvertIntegrite(integrite.releveDeBase(), integrite.manquantes, CARTES_DE_CORRECTION), toutCocher, appliquerLaStructure,
      creation(23, [], ['theme/primary/surface/subtle', 'theme/secondary/surface/subtle', 'theme/neutral/page/foreground']), relecture,
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
    atteinte: ouvertIntegrite(integrite.releveDeBase(), encoreAFaire, CARTES_A_FAIRE, { constats: [dividerDePrimary], roles: ['surface/subtle'] }),
  },
  {
    id: 't-menu-ignorer', titre: 'Tokens, menu Ignorer', quand: 'Le designer ouvre la carte d’un rôle absent d’une palette et clique sur Ignorer.',
    regarder: 'Un menu sous le bouton Ignorer, à deux choix : « Pour cette palette » et « Dans tout le fichier » ; la carte ne grandit pas.',
    existe: true,
    atteinte: [
      ...ouvertIntegrite(integrite.releveDeBase(), integrite.sansEcriture.slice(0, 3), CARTES_A_FAIRE),
      { clic: '#panneau-a-appliquer .bloc-constat .bloc-bouton' }, { clic: '#panneau-a-appliquer .ignorer-hote button' },
    ],
  },
  {
    id: 't-cran-de-library', titre: 'Tokens, cran dont la cible est dans une library', quand: 'Les rampes Dark de primary viennent d’une library : UCM juge le cran sans pouvoir le corriger.',
    regarder: 'Dans la section Crans, quatre cartes « En Dark, UCM attend le cran … Aujourd’hui elle vise le cran … », avec « Changez sa cible dans la fenêtre Variables » et la variable en lieu.',
    existe: true,
    atteinte: ouvertIntegrite(integrite.releveDeBase(), integrite.libraryEtScopes, CARTES_A_FAIRE),
  },
  {
    id: 't-retrait-de-scopes', titre: 'Corrections, retrait de scopes', quand: 'Deux variables de brands portent encore le scope Show in all.',
    regarder: 'Dans la section Scopes, une carte « Retirer les scopes de 2 variables de brands », décochée et dépliée : la colonne « Après l’application » dit « aucun scope ».',
    existe: true,
    atteinte: [...ouvertIntegrite(integrite.releveDeBase(), integrite.libraryEtScopes, CARTES_DE_CORRECTION), premiereCarte],
  },
  {
    id: 't-rapport', titre: 'Tokens, rapport d’analyse', quand: 'La structure est lue ; le designer descend au pied de l’onglet Constats.',
    regarder: 'Sous la liste des constats, un bouton texte gris « Télécharger le rapport d’analyse », sans surface ni bordure, comme sous la liste du mode Composant ; il n’apparaît pas avant la première lecture de la structure.',
    existe: true,
    atteinte: ouvert(),
  },
);

/*
 * Le cadre « Proposé » de la section 1 de la maquette de la fiabilisation : la barre latérale seule, à 680 px, sur un fichier qui a des
 * renommages, des questions et des constats de toute catégorie. `cadre: 'constats'` l'envoie dans la galerie de 680 px
 * (`build-galerie.cjs`), pas dans celles du mode Tokens.
 */
ETATS.push({
  id: 't-constats', cadre: 'constats', titre: 'Tokens, Constats à 680 px', quand: 'Le designer ouvre Constats sur un fichier qui a des renommages, des questions et des constats à régler dans Figma.',
  regarder: 'Deux onglets, Constats et Règles ; le sommaire (Tout, une puce par catégorie qui a des cartes, Questions) ; une section par catégorie qui a des cartes, de Noms à Rangement, avec son signe, son titre et son nombre ; Alias, Valeurs et Scopes tenues en fin de liste ; dans Noms, les questions avant les renommages, puis « Plus tard » et les autres pistes ; le compte de Constats est le total des cartes ; « Tout cocher » et « Tout décocher » sous la bande de Noms ; toutes les cases sont décochées, un seul pied dit « Aucune correction cochée », avec « Tout cocher » à côté d’Appliquer, inactif.',
  existe: true,
  atteinte: [
    preferences(), releve(integrite.releveAuxEcarts()),
    { message: messages.initial(true) }, { message: messages.bilan(1, bilans.travail), attendre: '.liste' },
    { message: integrite.reponse(integrite.aFaire, 1), attendre: CARTES_A_FAIRE },
    { clic: '.puce-x' },
  ],
});

/*
 * Le cochage commun : les renommages de Noms et les corrections de structure ont un seul pied. Les cases arrivent décochées ; « Tout cocher »
 * du pied coche celles des deux domaines, et le pied compte les deux. Appliquer envoie les renommages, puis les corrections de structure.
 */
const bilanDuCochage = bilans.travail;
const ouvertAuCochage = () => [
  preferences(), releve(integrite.releveDeBase()),
  { message: messages.initial(true) }, { message: messages.bilan(1, bilanDuCochage), attendre: '.liste' },
  { message: integrite.reponse(integrite.manquantes, 1), attendre: CARTES_DE_CORRECTION },
  { clic: '.puce-x' },
];

ETATS.push(
  {
    id: 't-cochage-decoche', cadre: 'constats', titre: 'Tokens, cases décochées des deux domaines', quand: 'Le fichier a des renommages et 23 variables manquantes à créer ; le designer n’a rien coché.',
    regarder: 'Sous la bande de Noms et sous celle de Variables manquantes, « Tout cocher » et « Tout décocher » ; chaque carte, dans les deux sections, est décochée ; un seul pied : « Aucune correction cochée », « Tout cocher » à côté d’Appliquer, qui est inactif.',
    existe: true,
    atteinte: ouvertAuCochage(),
  },
  {
    id: 't-cochage-commun', cadre: 'constats', titre: 'Tokens, un pied pour les deux domaines', quand: 'Le designer appuie sur « Tout cocher » du pied : les renommages et les corrections de structure sont cochés.',
    regarder: 'Les cartes de Noms et celles de Variables manquantes sont cochées ; un seul pied dit « Appliquer renomme 86 variables et 1 collection, puis écrit 23 corrections de structure. » ; Appliquer est actif.',
    existe: true,
    atteinte: [...ouvertAuCochage(), { clic: '#panneau-a-appliquer .corrections-pied .cocher-global' }],
  },
  {
    id: 't-cochage-confirmation', cadre: 'constats', titre: 'Tokens, confirmation des renommages avant la structure', quand: 'Le designer appuie sur Appliquer avec les deux domaines cochés : les renommages passent d’abord, par leur confirmation ; les corrections de structure partent après.',
    regarder: 'La feuille « Renommer 87 noms ? » avec Retour et Renommer ; derrière elle, le pied est inactif : rien n’est envoyé à la structure tant que les renommages ne sont pas écrits.',
    existe: true,
    atteinte: [...ouvertAuCochage(), { clic: '#panneau-a-appliquer .corrections-pied .cocher-global' }, { clic: '#panneau-a-appliquer .corrections-pied .btn-primary', attendre: '.feuille' }],
  },
);

/*
 * Noms longue (C3.3) : 24 renommages et 3 questions font 27 cartes, au-delà des 20 que la section montre ouvertes. Elle arrive repliée :
 * la bande garde son compte, le sommaire ses puces, et les cartes attendent le clic sur la bande ou sur la puce.
 */
const [renommageDeBase] = bilans.travail.groupes;
const bilanLong = { ...bilans.travail, groupes: Array.from({ length: 24 }, (_, rang) => ({ ...renommageDeBase, cle: `terme:t${rang}`, avant: `t${rang}`, apres: `terme-${rang}` })) };

ETATS.push({
  id: 't-constats-noms-longue', cadre: 'constats', titre: 'Tokens, Constats, Noms longue repliée', quand: 'Le fichier a 24 renommages et 3 questions : Noms dépasse 20 cartes.',
  regarder: 'La section Noms est repliée, sa bande dit 27 ; aucune carte de renommage ni de question n’est montrée ; les sections de structure, plus courtes, sont ouvertes sous elle ; la puce Noms du sommaire dit 27 et déplie la section.',
  existe: true,
  atteinte: [
    preferences(), releve(integrite.releveAuxEcarts()),
    { message: messages.initial(true) }, { message: messages.bilan(1, bilanLong), attendre: '.liste' },
    { message: integrite.reponse(integrite.aFaire, 1), attendre: CARTES_A_FAIRE },
    { clic: '.puce-x' },
  ],
});

/*
 * Les listes virtuelles (D6b) : une section de plus de 50 cartes range ses cartes dans une liste qui défile seule, à hauteur bornée, et
 * ne garde dans le DOM que les cartes à l'écran. Le bandeau et la puce disent toujours le nombre entier de cartes.
 */
const bilanTresLong = { ...bilans.travail, groupes: Array.from({ length: 120 }, (_, rang) => ({ ...renommageDeBase, cle: `terme:t${rang}`, avant: `t${rang}`, apres: `terme-${rang}`, variables: 4 })) };
/** 60 variables du thème portent une valeur directe : une carte de constat chacune, sous Couches. */
const constatsTresLongs = Array.from({ length: 60 }, (_, rang) => ({
  id: `C82:valeur-directe:long-${rang}:light`, code: 'C82', type: 'corriger', famille: 'liaisons', variants: [], layers: [],
  faits: { genre: 'valeur-directe', variable: `theme/primary/surface/etat-${rang}`, mode: 'light' },
}));
const ouvrirNoms = { clic: '.section-element[data-element="noms"] .bande-element', attendre: '.liste-de-cartes' };

ETATS.push(
  {
    id: 't-liste-longue-noms', cadre: 'constats', titre: 'Tokens, Noms de 120 renommages en liste virtuelle', quand: 'Le fichier a 120 renommages ; la section Noms arrive repliée, et le designer l’ouvre.',
    regarder: 'La bande de Noms et la puce disent 123 ; la section ouverte ne montre que les cartes à l’écran, dans une liste à hauteur bornée qui défile seule, avec les intertitres de section en tête ; « Tout cocher » et « Tout décocher » sont sous la bande ; le pied dit « Aucune correction cochée » ; les sections de structure suivent la liste.',
    existe: true,
    atteinte: [
      preferences(), releve(integrite.releveAuxEcarts()),
      { message: messages.initial(true) }, { message: messages.bilan(1, bilanTresLong), attendre: '.liste' },
      { message: integrite.reponse(integrite.aFaire, 1), attendre: CARTES_A_FAIRE },
      { clic: '.puce-x' },
      ouvrirNoms,
    ],
  },
  {
    id: 't-liste-longue-noms-cochee', cadre: 'constats', titre: 'Tokens, Noms de 120 renommages, tout coché', quand: 'Le designer appuie sur « Tout cocher » du pied avec la liste de 120 renommages ouverte.',
    regarder: 'Les cartes à l’écran sont cochées ; le pied compte les noms des 120 cartes, y compris celles qui ne sont pas dans le DOM : « 480 noms cochés » avec les corrections de structure ; Appliquer est actif.',
    existe: true,
    atteinte: [
      preferences(), releve(integrite.releveAuxEcarts()),
      { message: messages.initial(true) }, { message: messages.bilan(1, bilanTresLong), attendre: '.liste' },
      { message: integrite.reponse([], 1) },
      { clic: '.puce-x' },
      ouvrirNoms,
      { clic: '#panneau-a-appliquer .corrections-pied .cocher-global' },
    ],
  },
  {
    id: 't-liste-longue-constats', cadre: 'constats', titre: 'Tokens, Couches de 60 constats en liste virtuelle', quand: 'Le fichier a 60 variables du thème à valeur directe : Couches dépasse 50 cartes.',
    regarder: 'La bande de Couches et la puce disent 60 ; les cartes sont dans une liste à hauteur bornée, qui défile seule ; chaque carte a son liseré, son icône et son mot ; les sections courtes sont en cartes ordinaires.',
    existe: true,
    atteinte: [
      preferences(), releve(integrite.releveAuxEcarts()),
      { message: messages.initial(true) }, { message: messages.bilan(1, bilans.rienAFaire) },
      { message: integrite.reponse([...integrite.aFaire, ...constatsTresLongs], 1), attendre: '.liste-de-cartes' },
      { clic: '.puce-x' },
    ],
  },
);

/*
 * Le mode Tokens à deux onglets, sans carte (C6.1). « Tout tenu » : le bilan et la structure sont lus et rien n'est à faire ; chaque
 * catégorie est tenue, sans sommaire ni pied. « Partielle » : la structure n'est pas encore lue, donc aucune catégorie ne se dit tenue
 * et seules les cartes de Noms se montrent (Q-F89-16).
 */
ETATS.push(
  {
    id: 't-constats-tout-tenu', cadre: 'constats', titre: 'Tokens, Constats, toutes les catégories tenues', quand: 'Le fichier n’a ni renommage, ni question, ni constat : le bilan et la structure sont lus.',
    regarder: 'Les dix catégories sont tenues, de Noms à Scopes : une coche grise et le nom, sans nombre ni chevron ; ni sommaire, ni pied, ni « Tout cocher » ; aucune section ouverte.',
    existe: true,
    atteinte: [
      preferences(), releve(integrite.releveAuxEcarts()),
      { message: messages.initial(true) }, { message: messages.bilan(1, bilans.rienAFaire) },
      { message: integrite.reponse([], 1), attendre: '.bande-element.tenue' },
      { clic: '.puce-x' },
    ],
  },
  {
    id: 't-constats-partielle', cadre: 'constats', titre: 'Tokens, Constats, structure pas encore lue', quand: 'Le bilan de Nomenclature est arrivé, la lecture de la structure ne l’est pas encore.',
    regarder: 'Seule la section Noms se montre, avec ses cartes ; aucune catégorie de structure n’est tenue : une catégorie sans carte n’a pas encore été lue ; le sommaire compte les seules cartes de Noms.',
    existe: true,
    atteinte: [
      preferences(), releve(integrite.releveAuxEcarts()),
      { message: messages.initial(true) }, { message: messages.bilan(1, bilans.travail), attendre: '.liste' },
      { clic: '.puce-x' },
    ],
  },
);

/*
 * Lot E4a. La question du texte des boutons décrit le rendu, les couches d'une collection forment une carte, l'information de QV-4 passe
 * en tête du mode Tokens, et les genres de structure qui n'avaient que le repli ont leur carte (`structure/questions.cjs`).
 */
const e4a = require('../structure/questions.cjs');
const ouvertEnTete = (constats, attendre) => [
  preferences(), releve(integrite.releveDeBase()),
  { message: messages.initial(true) }, { message: messages.bilan(1, bilans.rienAFaire) },
  { message: integrite.reponse(constats, 1), attendre },
  { clic: '.puce-x' },
];

ETATS.push(
  {
    id: 't-sens-partage', titre: 'Tokens, texte des boutons d’une palette partagée', quand: 'Les variables de secondary se répartissent entre les deux tables : UCM ne sait pas quel texte les boutons portent.',
    regarder: 'Dans Crans, une carte à vérifier par mode : « Texte sur secondary, que les boutons et les encadrés partagent » ; dessous, deux réponses, « Passer au texte blanc » et « Passer au texte noir », chacune avec un bouton et un encadré dessinés dans la couleur, légendés « Bouton » et « Encadré » ; aucune réponse n’est cochée ; la ligne grise dit le mode.',
    existe: true,
    atteinte: ouvertEnTete(e4a.sensPartage, CARTES_A_FAIRE),
  },
  {
    id: 't-couches-groupees', titre: 'Tokens, couches groupées', quand: 'Huit couleurs de theme visent primitives sur deux modes, une vise layout ; le designer ouvre la première carte.',
    regarder: 'Dans Couches, une carte par couple de collection et de couche visée : « 4 variables de theme visent primitives, sur 2 modes. » et « 1 variable de theme vise layout, sur 1 mode. » ; sous la phrase, « Choisissez une cible dans brands ou utility dans la fenêtre Variables » puis « Voir les 4 variables » ; la carte ouverte liste les quatre variables, une par ligne.',
    existe: true,
    atteinte: [...ouvertEnTete(e4a.couches, CARTES_A_FAIRE), { clic: '#panneau-a-appliquer .bloc-constat .bloc-bouton' }],
  },
  {
    id: 't-theme-non-reconnu', titre: 'Tokens, aucune collection theme', quand: 'Le fichier a des collections UCM mais aucune ne se lit comme theme ; il garde un constat de rangement.',
    regarder: 'En tête de l’onglet Constats, sous le sommaire et avant les sections, une alerte d’information : « Aucune collection n’est reconnue comme theme. L’intégrité UCM n’est pas contrôlée. » et, en gris, « Répondez à la question de collection dans la section Noms » ; l’information n’est pas une carte et ne compte pas.',
    existe: true,
    atteinte: ouvertEnTete([e4a.themeNonReconnu, ...integrite.sansEcriture.slice(0, 1)], '#panneau-a-appliquer .alerte'),
  },
  {
    id: 't-questions-de-structure', titre: 'Tokens, questions et cartes de structure', quand: 'Une variable au nom proche d’un rôle, une rampe d’une autre palette, une branche de mode, un rôle en double, deux collections theme et des cibles non lues.',
    regarder: 'Variables manquantes : « Le nom … ressemble au rôle … » ; Crans : la rampe d’une autre palette avec « Viser … » pour chaque candidat ; Modes : « En Dark, cette variable vise la branche Light de sa palette. » avec deux « Viser … » ; Valeurs : « 2 variables portent le rôle … » avec « Garder … » ; Rangement : « Deux collections se lisent comme theme : … » ; Alias : « Les cibles rangées dans brands ne sont pas lues … » ; chaque carte dit où le régler.',
    existe: true,
    atteinte: ouvertEnTete(e4a.genresSansCarte, CARTES_A_FAIRE),
  },
);

/*
 * Lots E4b et E4c. Une lecture qui n'aboutit pas le dit ; chaque motif de saut a sa phrase ; un constat de scopes sans sa proposition
 * garde sa carte ; le rôle écrit deux fois se fusionne d'un clic sur « Garder … ».
 */
const echec = (cause) => [
  preferences(), releve(integrite.releveDeBase()),
  { message: messages.initial(true) }, { message: messages.bilan(1, bilans.rienAFaire) },
  { message: { ...integrite.reponse([], 1), echec: cause }, attendre: '#panneau-a-appliquer .alerte' },
  { clic: '.puce-x' },
];
const idsDeScopes = integrite.libraryEtScopes.filter((constat) => constat.correction && constat.correction.sorte === 'scope').map((constat) => constat.correction.id);
const choixDeFusion = '#panneau-a-appliquer .constat-choix-ligne button';

ETATS.push(
  {
    id: 't-lecture-impossible', titre: 'Tokens, lecture des variables impossible', quand: 'Le plugin n’a pas pu lire les variables du fichier : le sandbox répond sans constat et le dit.',
    regarder: 'En tête de l’onglet Constats, une alerte « À vérifier » : « Le plugin n’a pas pu lire les variables du fichier. Actualisez pour relancer la lecture. » ; aucune catégorie de structure n’est tenue ; seule Noms se montre ; aucune ligne ne dit que rien n’est à régler.',
    existe: true,
    atteinte: echec('lecture-levee'),
  },
  {
    id: 't-lecture-library', titre: 'Tokens, library de tokens illisible', quand: 'Le fichier déclare UCM, mais le sandbox n’a aucun catalogue à contrôler.',
    regarder: 'En tête de l’onglet Constats, une alerte « À vérifier » : « Le plugin n’a pas pu lire la library de tokens. Vérifiez-la dans la Configuration, puis actualisez. » ; aucune catégorie de structure n’est tenue.',
    existe: true,
    atteinte: echec('catalogue-absent'),
  },
  {
    id: 't-lecture-refusee', titre: 'Tokens, lecture refusée par Figma', quand: 'Figma refuse au plugin la lecture des variables locales.',
    regarder: 'En tête de l’onglet Constats, une alerte « À vérifier » : « Figma a refusé la lecture des variables. Actualisez pour relancer la lecture. » ; aucune catégorie de structure n’est tenue.',
    existe: true,
    atteinte: echec('refus-de-figma'),
  },
  {
    id: 't-motifs-de-saut', titre: 'Tokens, corrections de scopes sautées', quand: 'Le designer a coché les corrections de scopes avant Appliquer ; le sandbox en a sauté trois : une autre écriture était en cours, Figma a refusé, le plugin ne sait pas l’écrire.',
    regarder: 'La ligne verte « 0 corrections écrites, 3 sautées. » et, dessous, une phrase grise par correction sautée : la variable, puis « Une autre écriture était en cours. Relancez Appliquer. », « Figma a refusé l’écriture. Recommencez, ou faites-la dans la fenêtre Variables. » ou « Le plugin ne sait pas écrire cette correction. Faites-la dans la fenêtre Variables. ».',
    existe: true,
    atteinte: [
      ...ouvertIntegrite(integrite.releveDeBase(), integrite.libraryEtScopes, CARTES_DE_CORRECTION), toutCocher, appliquerLaStructure,
      creation(0, [{ id: idsDeScopes[0], motif: 'occupe' }, { id: idsDeScopes[1], motif: 'erreur' }, { id: idsDeScopes[2] ?? idsDeScopes[0], motif: 'non-pris-en-charge' }]), relecture,
    ],
  },
  {
    id: 't-scopes-sans-proposition', titre: 'Tokens, scopes sans proposition', quand: 'Le designer a retiré la proposition de deux constats de scopes : ils restent à régler, sans correction à cocher.',
    regarder: 'Dans la section Scopes, deux cartes à corriger sans case ni bouton d’écriture : « Aujourd’hui, son scope est Show in all. » et « Aujourd’hui, ses scopes sont Show in all, Text fill. », chacune avec sa variable en lieu et « Ouvrir la fiche » une fois dépliée.',
    existe: true,
    atteinte: ouvertEnTete(e4a.scopesSansProposition, CARTES_A_FAIRE),
  },
  {
    id: 't-fusion-de-variables', titre: 'Tokens, rôle écrit deux fois', quand: 'La palette primary écrit surface/default deux fois : le kit pose la question, chaque variable porte sa clé.',
    regarder: 'Dans Valeurs, une carte « 2 variables portent le rôle surface/default. » ; ses deux choix sont des boutons texte, « Garder primary/surface/default » et « Garder primary/surface/Default » ; aucune case n’est cochée et le pied ne propose rien.',
    existe: true,
    atteinte: ouvertEnTete([e4a.roleEnDoubleFusion], CARTES_A_FAIRE),
  },
  {
    id: 't-fusion-ecrite', titre: 'Tokens, fusion écrite', quand: 'Le designer a cliqué « Garder primary/surface/default » : le sandbox a fusionné, la relecture ne trouve plus de doublon.',
    regarder: 'La ligne verte « 1 correction écrite. » en tête de l’onglet ; la carte du rôle en double a disparu après la relecture.',
    existe: true,
    atteinte: [
      ...ouvertEnTete([e4a.roleEnDoubleFusion], CARTES_A_FAIRE), { clic: choixDeFusion },
      { message: { type: 'structure-appliquee', demande: 2, ecrites: 1, sautees: [], sansAnnulation: [] }, attendre: '#panneau-a-appliquer .resultat:not([hidden])' }, relecture,
    ],
  },
  {
    id: 't-fusion-sautee', titre: 'Tokens, fusion sautée', quand: 'Le designer a cliqué « Garder … » ; Figma a refusé une écriture en route.',
    regarder: 'La ligne verte « 0 corrections écrites, 1 sautée. » et, dessous, « Figma a refusé l’écriture. Recommencez, ou faites-la dans la fenêtre Variables. » ; la carte du rôle en double reste, ses boutons aussi.',
    existe: true,
    atteinte: [
      ...ouvertEnTete([e4a.roleEnDoubleFusion], CARTES_A_FAIRE), { clic: choixDeFusion },
      { message: { type: 'structure-appliquee', demande: 2, ecrites: 0, sautees: [{ id: e4a.roleEnDoubleFusion.id, motif: 'erreur' }], sansAnnulation: [] }, attendre: '#panneau-a-appliquer .resultat:not([hidden])' },
      { message: integrite.reponse([e4a.roleEnDoubleFusion], 3) },
    ],
  },
);

/*
 * Actualiser dans le mode Tokens. Le clic prend la demande 2 du relevé ; l'analyse des noms qu'il relance prend la demande 7 de la frontière
 * (le bilan 1 a fait lire quatre groupes, demandes 2 à 5, et les termes, demande 6) et la relecture de la structure la demande 2 du domaine.
 * Le panneau reste visible pendant l'analyse : le message de lecture paraît en tête tant que la structure manque, les cartes de la lecture
 * précédente restent affichées et désactivées, Noms est en cours tant que le bilan manque et Appliquer est inactif. La durée paraît à la
 * dernière réponse.
 */
const actualiser = { clic: '.barre-lecture .bouton-discret' };
const actualiserEtAttendre = { ...actualiser, attendre: '#panneau-a-appliquer .accueil:not([hidden])' };
ETATS.push(
  {
    id: 't-actualiser-chargement', titre: 'Tokens, Actualiser en cours', quand: 'Le designer a lu les constats, puis clique Actualiser ; le sandbox n’a encore rien rendu.',
    regarder: 'Dans l’onglet Constats, « Lecture des variables… » paraît une seule fois, en tête ; dessous, la section Noms est en cours (sa bande sans nombre, sans texte tant que le calcul des noms n’a rien annoncé) et les sections de structure de la lecture précédente restent affichées, avec leurs cases, « Tout cocher », « Tout décocher » et Appliquer grisés ; aucune catégorie n’est tenue ; la table à gauche n’a plus de message qui la décale ; Actualiser est grisé et Annuler paraît.',
    existe: true,
    atteinte: [...ouvert(), actualiserEtAttendre],
  },
  {
    id: 't-actualiser-structure-recue', titre: 'Tokens, Actualiser, structure reçue', quand: 'Le designer a cliqué Actualiser ; le sandbox a rendu le relevé et la structure, mais pas encore le bilan des noms.',
    regarder: 'Le message de tête a disparu ; les cartes de structure sont celles de la nouvelle lecture et leurs cases sont ouvertes ; la section Noms, en tête, reste en cours (« La vérification des noms continue. », sans nombre ni puce) ; aucune catégorie n’est tenue ; Appliquer reste grisé.',
    existe: true,
    atteinte: [...ouvert(), actualiser, releve(releveDeStructure(), 2), { message: structure(2), attendre: '#panneau-a-appliquer .bande-element.en-cours' }],
  },
  {
    id: 't-actualiser-duree', titre: 'Tokens, durée de l’analyse', quand: 'Le sandbox a rendu le relevé, les noms et la structure de l’Actualiser.',
    regarder: 'Tout en haut de l’onglet Constats, au-dessus du sommaire, la ligne grise « analysé à 14:32 en 3 s » du mode Composant, avec son filet dessous ; les constats ont repris leur place.',
    existe: true,
    atteinte: [
      ...ouvert(), actualiser,
      releve(releveDeStructure(), 2), { message: messages.bilan(7, bilanDeStructure) },
      { message: structure(2), attendre: '#panneau-a-appliquer .arch-resume' },
    ],
  },
);

/*
 * La structure arrive avant les noms. Le fichier a déjà été analysé : à l'ouverture, le plugin relit les variables et demande les noms.
 * Le sandbox rend la structure (demande 1 du domaine) et le bilan n'est pas encore là.
 */
ETATS.push({
  id: 't-structure-avant-les-noms', titre: 'Tokens, structure affichée avant les noms', quand: 'Le fichier a déjà été analysé et le plugin vient de s’ouvrir ; le sandbox a rendu la structure, le bilan des noms n’est pas encore là.',
  regarder: 'La page de lecture a laissé la place à l’onglet Constats : le sommaire n’a pas de puce Noms ; la section Noms est en tête, en cours, sa bande sans nombre ni chevron, avec « La vérification des noms continue. » dessous ; les sections de structure ont leurs cartes (Alias, Modes, Valeurs, Couches, Scopes) ; aucune catégorie sans carte n’est tenue en fin de liste ; le pied dit « Aucune correction cochée » et Appliquer est grisé.',
  existe: true,
  atteinte: [
    preferences(), releve(releveDeStructure()), chevron('primitives'), chevron('theme'), groupe('theme', 'primary'),
    { message: messages.initial(true) }, { message: structure(1), attendre: '#panneau-a-appliquer .bande-element.en-cours' },
  ],
});

/*
 * G3 : chaque message suit un événement. Le clic d'Actualiser prend la demande 2 du relevé ; l'analyse des noms qu'il relance prend la demande 7.
 * L'événement `progression` vient du relevé, `lecture` de l'inventaire des noms, `etape-des-noms` du calcul (sandbox ou Worker).
 */
const progression = (phase, fait, total) => ({ message: { type: 'progression', demande: 2, phase, fait, total } });
const etape = (nom) => ({ message: { type: 'etape-des-noms', demande: 7, etape: nom } });
const lectureDesNoms = (lues, total) => ({ message: { type: 'lecture', demande: 7, lues, total } });
const apresLaStructure = [...ouvert(), actualiser, releve(releveDeStructure(), 2), { message: structure(2), attendre: '#panneau-a-appliquer .bande-element.en-cours' }];
ETATS.push(
  {
    id: 't-actualiser-cibles', titre: 'Tokens, Actualiser, cibles des alias', quand: 'Le designer a cliqué Actualiser ; le sandbox lit les cibles des alias qui sortent du fichier.',
    regarder: 'En tête des constats, « Lecture des cibles des alias… », sans total ; la section Noms, dessous, n’a pas de texte.',
    existe: true,
    atteinte: [...ouvert(), actualiserEtAttendre, progression('references', 3, 9)],
  },
  {
    id: 't-actualiser-compte-des-noms', titre: 'Tokens, Actualiser, inventaire des noms', quand: 'Le designer a cliqué Actualiser ; l’analyse des noms a lu 500 variables sur 2 415.',
    regarder: 'En tête, « Lecture des variables… » ; dans la section Noms, « Lecture des variables, 500 sur 2 415 ».',
    existe: true,
    atteinte: [...ouvert(), actualiserEtAttendre, lectureDesNoms(500, 2415)],
  },
  {
    id: 't-actualiser-verification-structure', titre: 'Tokens, Actualiser, vérification de la structure', quand: 'Le sandbox a rendu le relevé ; il vérifie les variables et les alias.',
    regarder: 'En tête, « Vérification des variables et des alias… » ; la section Noms garde sa bande sans texte, et les cartes de la lecture précédente restent grisées.',
    existe: true,
    atteinte: [...ouvert(), actualiser, releve(releveDeStructure(), 2)],
  },
  {
    id: 't-actualiser-verification-des-noms', titre: 'Tokens, Actualiser, vérification des noms', quand: 'La structure est affichée ; le calcul des noms en est au lexique et aux renommages.',
    regarder: 'Le message de tête a disparu ; la section Noms dit « Vérification des noms… ».',
    existe: true,
    atteinte: [...apresLaStructure, etape('lexique')],
  },
  {
    id: 't-actualiser-recherche-des-termes', titre: 'Tokens, Actualiser, recherche des termes', quand: 'La structure est affichée ; le calcul des noms cherche les termes à harmoniser.',
    regarder: 'La section Noms dit « Recherche des termes à harmoniser… ».',
    existe: true,
    atteinte: [...apresLaStructure, etape('lexique'), etape('questions')],
  },
);

ETATS.push({
  id: 't-duree-ouverture', titre: 'Tokens, durée après l’ouverture', quand: 'Le plugin vient de s’ouvrir : le relevé, les noms et la structure sont lus, sans Actualiser.',
  regarder: 'Tout en haut de l’onglet Constats, au-dessus du sommaire, la ligne grise « analysé à 14:32 en 3 s » ; aucun message de lecture n’a pris la place des constats.',
  existe: true,
  atteinte: ouvert().map((etape, rang, etapes) => (rang === etapes.length - 1 ? { ...etape, attendre: '#panneau-a-appliquer .arch-resume' } : etape)),
});

module.exports = { ETATS };
