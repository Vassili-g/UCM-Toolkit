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

module.exports = { ETATS };
