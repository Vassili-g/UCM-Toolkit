/**
 * Les états de Nomenclature : un par écran des maquettes, feuilles comprises,
 * et au moins un par type de `MessageDeNomenclature`. Chaque état rejoue la suite de
 * gestes et de messages qui le produit dans l'interface réelle.
 *
 * Sans sandbox, l'écran n'accepte que les réponses à ses propres demandes. Les
 * messages numérotés répondent donc aux demandes que les gestes précédents
 * ont émises : le bilan est la demande 1, la lecture des termes la 2, et
 * chaque geste qui interroge le sandbox prend le numéro suivant.
 */
const { bilans, fiches, messages, conflitDeFichier, conflitDeCycle, renommagesInterface, pagesInterface, variablesDeInterface } = require('../nomenclature/donnees.cjs');
const { preferences, releve, groupe, chevron, constructeur, alias, nombre, couleur } = require('./aide.cjs');
const { structureAFaire } = require('../structure/donnees.cjs');

/**
 * Le fichier Intencial de la maquette : cinq collections aux nombres de variables de l'arbre, dont Interface, que les Corrections font passer
 * à UCM. `brands` et `theme` ont deux modes, d'où les deux menus des modes affichés ; les autres collections n'en ont qu'un.
 */
function releveIntencial() {
  const c = constructeur('Intencial');
  c.collection('primitives', 'primitives', ['Valeur']);
  c.collection('brands', 'brands', ['intencial', 'apicil']);
  c.collection('theme', 'theme', ['light', 'dark']);
  c.collection('layout', 'layout', ['Valeur']);
  c.collection('interface', 'Interface', ['Valeur']);
  const remplir = (collection, total, deja, modes) => {
    for (let rang = deja; rang < total; rang += 1) c.variable(`${collection}-${rang}`, collection, `remplissage-${rang}`, 'FLOAT', Object.fromEntries(modes.map((mode) => [mode, nombre(rang)])));
  };
  const theme = [['primary/solid/default', '#B15152'], ['primary/solid/hover', '#8E3F40'], ['primary/solid/foreground', '#FFFFFF'], ['primary/surface/default', '#F6E6E6'], ['neutral/page/border', '#D4D4D8'],
    ['primary/page/foreground', '#9A3F40'], ['neutral/elevation/raised', '#FFFFFF'], ['neutral/elevation/page', '#F8FAFC'], ['neutral/solid/hover', '#3F3F46']];
  for (const [nom, valeur] of theme) c.variable(`theme:${nom}`, 'theme', nom, 'COLOR', { light: couleur(valeur), dark: couleur(valeur) });
  c.variable('layout:sizing/4', 'layout', 'sizing/4', 'FLOAT', { Valeur: nombre(16) });
  remplir('primitives', 346, 0, ['Valeur']);
  remplir('brands', 420, 0, ['intencial', 'apicil']);
  remplir('theme', 180, theme.length, ['light', 'dark']);
  remplir('layout', 60, 1, ['Valeur']);
  const cibles = { i1: 'primary/solid/default', i2: 'primary/solid/hover', i3: 'primary/solid/foreground', i4: 'primary/surface/default', i5: 'neutral/page/border', i7: 'primary/page/foreground', i8: 'neutral/elevation/raised', i9: 'neutral/elevation/page', i10: 'neutral/solid/hover' };
  for (const variable of variablesDeInterface) {
    const nombreDirect = variable.id === 'i6' || !cibles[variable.id];
    if (variable.id === 'i6') c.variable(variable.id, 'interface', variable.ancien, 'FLOAT', { Valeur: alias('layout:sizing/4') });
    else if (nombreDirect) c.variable(variable.id, 'interface', variable.ancien, 'FLOAT', { Valeur: nombre(1) });
    else c.variable(variable.id, 'interface', variable.ancien, 'COLOR', { Valeur: alias(`theme:${cibles[variable.id]}`) });
  }
  return { ...c.releve(), luA: new Date(2026, 0, 1, 14, 0).getTime() };
}


/** Les règles que le mode Composant prépare : un terme d'Alert et un terme de Tag, chacun avec un nom réel du composant. */
const reglesRecues = {
  type: 'regles-recues',
  regles: [
    { ancien: 'outline', nouveau: 'outlined', composant: 'Alert', exemple: { ancien: 'alert/color/info/outline/border', nouveau: 'alert/color/info/outlined/border' } },
    { ancien: 'txt', nouveau: 'text', composant: 'Tag', exemple: { ancien: 'tag/color/danger/soft/txt', nouveau: 'tag/color/danger/soft/text' } },
  ],
};

const etat = (id, titre, quand, regarder, atteinte) => ({ id, titre, quand, regarder, existe: true, atteinte });
const msg = (message, attendre) => (attendre ? { message, attendre } : { message });
const clic = (selecteur, attendre) => (attendre ? { clic: selecteur, attendre } : { clic: selecteur });

/** L'ouverture d'un fichier déjà analysé, jusqu'au bilan (demande 1). */
const ouvert = (bilan) => [msg(messages.initial(true)), msg(messages.bilan(1, bilan), '.liste')];
/** L'onglet Règles : le clic relit les termes (demande 3), dont la réponse remplit la liste. */
const reglesOuvertes = () => [...ouvert(bilans.travail), clic('#onglet-regles'), msg(messages.termes(3), '.ligne-terme')];
/** L'onglet Règles d'un fichier qui a des noms : la liste porte un composant et une palette. */
const reglesAvecNoms = () => [...ouvert(bilans.travail), clic('#onglet-regles'), msg(messages.termesAvecNoms(3), '.ligne-terme')];
/** L'onglet Règles sur le Playground : toutes les sections, avec les cinq premières lignes de chacune. */
const reglesDuPlayground = () => [...ouvert(bilans.travail), clic('#onglet-regles'), msg(messages.termesDuPlayground(3), '.ligne-terme')];
/** La ligne d'un terme dans la liste, retrouvée par le début de son nom accessible. */
const ligneDe = (mot) => `.ligne-terme[aria-label^="${mot},"]`;
/** La feuille d'un terme : sa ligne dans la liste, puis sa fiche (demande 4). */
const termeOuvert = (mot, fiche) => [
  ...reglesOuvertes(),
  clic(ligneDe(mot), '.feuille'),
  msg(messages.fiche(4, fiche), '.fiche-bloc, .fiche-regle'),
];
/** Le délai de la simulation d'une saisie : l'écran attend 250 ms avant de demander. */
const delai = () => Array.from({ length: 60 }, () => ({ survol: 'body' }));
const repondreAuPremier = '.carte.question .question-actions:first-child .btn-secondary';
const appliquer = [clic('.noms-pied .btn-primary', '.feuille'), clic('.feuille-groupe .btn-primary')];

const ETATS = [
  {
    id: 't-renommages', titre: 'Tokens, Corrections filtrées par l’arbre', quand: 'La collection Interface passe à UCM : le designer clique le terme vert background d’une ligne du tableau des tokens, pendant que la lecture des noms d’écriture continue.',
    regarder: 'Les noms entiers après renommage, seul le terme nouveau en vert ; la carte de background ouverte et ciblée dans Corrections, avec ses trois noms de Interface ; la carte d’écriture ouverte, qui charge ses noms ; la puce « collection Interface » sous les onglets  ; le pied attend la fin de la lecture.',
    existe: true,
    atteinte: [
      preferences(), releve(releveIntencial()), { message: structureAFaire(1) }, groupe('interface'), chevron('interface'), { message: messages.initial(true) }, { message: messages.bilan(1, renommagesInterface), attendre: '.liste' },
      ...pagesInterface({ fonds: 2, survols: 3, ecriture: 4, collection: 5, suiteEcriture: 7 }).slice(0, 4).map((message) => ({ message })),
      { clic: '.liste .tete-bouton' },
      { clic: '.autres' },
      { clic: '.table-ligne:nth-child(2) .ch-lien' },
    ],
  },
  {
    id: 't-regle', titre: 'Tokens, règles reçues du mode Composant', quand: 'Le mode Composant a préparé deux règles : le designer ouvre Questions, qui les range en tête.',
    regarder: 'Sous l’intertitre « Règles reçues du mode Composant », deux cartes : le terme retiré en rouge, le terme voulu en vert, le composant d’où vient la règle, un exemple avant et après, Ajouter la règle, Écarter et Plus tard ; puis l’intertitre « Noms du fichier » et les questions du fichier ; la pastille de Questions dit 5.',
    existe: true,
    atteinte: [
      preferences(), releve(releveIntencial()), { message: structureAFaire(1) }, groupe('interface'), chevron('interface'), { message: messages.initial(true) },
      { message: messages.bilan(1, { ...renommagesInterface, questions: bilans.travail.questions }), attendre: '.liste' },
      ...pagesInterface({ fonds: 2, survols: 3, ecriture: 4, collection: 5, suiteEcriture: 7 }).slice(0, 4).map((message) => ({ message })),
      { clic: '#onglet-a-trancher', attendre: '.carte.question' },
      { clic: '.puce-x' },
      { message: reglesRecues },
    ],
  },
  etat('premier-lancement', 'Premier lancement', 'Le plugin vient de s’ouvrir sur un fichier jamais analysé.',
    'Un titre, une ligne, un bouton Analyser le fichier, sans onglets.',
    [msg(messages.initial(false))]),
  etat('lecture', 'Lecture des variables', 'Une analyse parcourt les variables du fichier.',
    'La barre d’avancement et le compte « 400 sur 1200 », à la place des onglets.',
    [msg(messages.initial(true)), msg(messages.lecture(400, 1200), '[role="progressbar"]')]),
  etat('ecriture-des-noms', 'Écriture des noms', 'La première analyse est finie et propose l’écriture du fichier.',
    'La carte des groupes, des noms et des collections, avec un exemple réel par ligne, et Continuer en bas.',
    [msg(messages.initial(false)), clic('.etat > .btn'), msg(messages.bilan(1, bilans.premierLancement), '.ecriture')]),
  etat('a-appliquer', 'Renommages, repliée', 'Le bilan propose des renommages dans les trois sections.',
    'Termes, Écriture et Collections ; chaque carte coche, dit avant → après, son nombre de variables et son origine.',
    ouvert(bilans.travail)),
  etat('a-appliquer-depliee', 'Renommages, dépliée', 'Le designer déplie un groupe et demande les autres noms.',
    'Une variable par ligne, le bouton des autres noms, puis les noms reçus dans la carte.',
    [...ouvert(bilans.travail), clic('.liste .tete-bouton'), clic('.autres'), msg(messages.lignes(3, 2))]),
  etat('a-appliquer-non-renommes', 'Renommages, noms non renommés', 'Un nom bloqué et des noms protégés accompagnent les renommages.',
    'Le titre « Non renommés : 1 bloqué, 3 protégés », puis le nom bloqué avec sa raison, « 3 noms écrits par UCM Palettes » avec la pastille Protégé et « Ouvrez UCM Palettes une fois dans ce fichier pour qu’il suive les règles, puis revenez ici. ».',
    [...ouvert(bilans.travail), clic('.carte.muette .tete-bouton')]),
  etat('protection-marque-courante', 'Protection, la marque est lue', 'Palettes suit les règles de Nomenclature : ses variables ne sont plus protégées.',
    'Le titre « Non renommés : 1 bloqué », sans mot « protégés » ni ligne de protection ; le groupe background déplié montre Poppy/bg/subtle → Poppy/background/subtle parmi ses renommages.',
    [...ouvert(bilans.marqueCourante), clic('.liste .tete-bouton'), clic('.carte.muette .tete-bouton')]),
  etat('protection-marque-illisible', 'Protection, marque illisible', 'Ce qu’UCM Palettes a noté dans le fichier ne se lit pas.',
    'La ligne « 3 noms écrits par UCM Palettes » avec la pastille Protégé et le texte « Ce qu’UCM Palettes a noté dans ce fichier est illisible. Signalez ce fichier au mainteneur des plugins UCM. », sans « Ouvrez UCM Palettes ».',
    [...ouvert(bilans.marqueIllisible), clic('.carte.muette .tete-bouton')]),
  etat('protection-marque-future', 'Protection, marque d’une version plus récente', 'Le fichier a été ouvert avec une version d’UCM Palettes que Nomenclature ne connaît pas.',
    'La ligne « 3 noms écrits par UCM Palettes » avec la pastille Protégé et le texte « Ce fichier a été ouvert avec une version d’UCM Palettes plus récente que celle qu’UCM Nomenclature connaît. Mettez à jour UCM Nomenclature pour renommer ces variables. ».',
    [...ouvert(bilans.marqueFuture), clic('.carte.muette .tete-bouton')]),
  etat('regles-futures', 'Renommages, règles d’une version plus récente', 'Une version plus récente d’UCM Nomenclature a rangé des règles dans le fichier.',
    'Le pied de l’onglet remplace le compte de noms cochés par « Une version plus récente d’UCM Nomenclature a rangé des règles dans ce fichier. Mettez le plugin à jour pour renommer. » ; Appliquer est inactif.',
    ouvert(bilans.reglesFutures)),
  etat('protection-sans-regles', 'Protection, écriture non enregistrée', 'Au premier lancement, le designer ouvre la Configuration avant de choisir l’écriture.',
    'La ligne de primitives « 346 variables, dont 120 gardent leur nom », puis sous la liste « 120 noms écrits par UCM Palettes » et « Les variables d’UCM Palettes gardent leur nom tant que l’écriture des noms n’est pas enregistrée. Choisissez l’écriture, puis appuyez sur Continuer. ».',
    [msg(messages.initial(false)), clic('.etat > .btn'), msg(messages.bilan(1, bilans.premierLancementSansRegles), '.ecriture'), clic('.icon-button', '.config-liste')]),
  etat('protection-lecture-refusee', 'Protection, lecture refusée', 'Figma a refusé de lire ce qu’UCM Palettes a noté : 120 variables de couleur ne sont pas vérifiées.',
    'La ligne « 120 variables de couleur non vérifiées » avec la pastille Non vérifié, le texte « UCM Nomenclature n’a pas pu lire ce qu’UCM Palettes a noté dans ce fichier. Relancez l’analyse pour renommer ces variables. » et le bouton Relancer l’analyse.',
    [...ouvert(bilans.lectureRefusee), clic('.carte.muette .tete-bouton')]),
  etat('protection-deux-causes', 'Protection, deux causes', 'Des variables sont protégées et d’autres ne sont pas vérifiées.',
    'Le titre « Non renommés : 1 bloqué, 3 protégés, 40 non vérifiés », puis deux lignes dans l’ordre des causes : « 3 noms écrits par UCM Palettes » et « 40 variables de couleur non vérifiées ».',
    [...ouvert(bilans.deuxCauses), clic('.carte.muette .tete-bouton')]),
  etat('protection-seule', 'Protection, seule carte', 'Il ne reste que des variables protégées : ni renommage, ni nom bloqué, ni question.',
    'La carte « Non renommés : 3 protégés » dépliée, sans le message « Tous les noms suivent vos règles ».',
    [...ouvert(bilans.protectionSeule), clic('.carte.muette .tete-bouton')]),
  etat('configuration-protegees', 'Configuration, collection protégée', 'Le designer ouvre la Configuration d’un fichier où la collection primitives garde ses noms.',
    'La ligne de primitives « 346 variables, dont 120 gardent leur nom », puis sous la liste « 3 noms écrits par UCM Palettes » et son explication.',
    [...ouvert(bilans.travail), clic('.icon-button', '.config-liste')]),
  etat('a-appliquer-nom-corrige', 'Renommages, un nom décoché puis corrigé', 'Le designer décoche Button/bg/hover ; le nom est corrigé dans Figma ; la nouvelle analyse ne le propose plus.',
    'Le groupe background garde ses 11 noms, tous cochés, sans mention « non cochés » ; le pied compte 86 noms cochés et Appliquer reste disponible.',
    [...ouvert(bilans.travail), clic('.case[aria-label="Button/bg/hover"]'), clic('#onglet-a-trancher', '.carte.question'), clic(repondreAuPremier),
      msg(messages.bilan(3, bilans.apresUneCorrection), '.faite-texte'), msg(messages.selection(4, 2, []), '.noms-pied .btn-primary:not([disabled])'),
      clic('#onglet-a-appliquer')]),
  etat('confirmation', 'Confirmation', 'Le designer appuie sur Appliquer.',
    'La feuille « Renommer 87 noms ? », ses quatre faits, Retour et Renommer ; le focus sur Retour.',
    [...ouvert(bilans.travail), clic('.noms-pied .btn-primary', '.feuille')]),
  etat('application', 'Après application', 'Les noms cochés ont été renommés.',
    'La ligne « 87 noms renommés » avec Annuler, suivie de « Les anciens noms sont gardés dans Configuration › Historique. » ; la liste ne garde que ce qui n’était pas coché.',
    [...ouvert(bilans.travail), ...appliquer, msg(messages.application(3)), msg(messages.bilan(3, bilans.apresLApplication), '.resultat:not([hidden])')]),
  etat('annulation-partielle-non-verifiee', 'Annulation partielle, lecture refusée', 'Le designer annule un renommage ; deux variables de couleur ne peuvent pas être vérifiées.',
    '« 10 noms rétablis. » puis « 2 variables de couleur n’ont pas pu être rétablies. UCM Nomenclature n’a pas pu lire ce qu’UCM Palettes a noté dans ce fichier. Relancez l’analyse, puis annulez de nouveau. » et Relancer l’analyse.',
    [...ouvert(bilans.travail), ...appliquer, msg(messages.application(3)), msg(messages.bilan(3, bilans.apresLApplication), '.resultat-action'),
      clic('.resultat-action'), msg(messages.annulationPartielleNonVerifiee(4), '.resultat:not([hidden])')]),
  etat('annulation-refusee-non-verifiee', 'Annulation refusée, lecture refusée', 'La variable à rétablir ne peut pas être vérifiée.',
    '« 1 variable de couleur n’a pas pu être rétablie. UCM Nomenclature n’a pas pu lire ce qu’UCM Palettes a noté dans ce fichier. Relancez l’analyse, puis annulez de nouveau. » et Relancer l’analyse.',
    [...ouvert(bilans.travail), ...appliquer, msg(messages.application(3)), msg(messages.bilan(3, bilans.apresLApplication), '.resultat-action'),
      clic('.resultat-action'), msg(messages.annulationRefuseeNonVerifiee(4), '.resultat:not([hidden])')]),
  etat('annulation-refusee-regles-futures', 'Annulation refusée, règles d’une version plus récente', 'Le designer annule un renommage ; une version plus récente d’UCM Nomenclature a rangé des règles dans le fichier.',
    'La ligne d’avertissement « Une version plus récente d’UCM Nomenclature a rangé des règles dans ce fichier. Mettez le plugin à jour pour annuler ce renommage. », sans bouton Relancer l’analyse.',
    [...ouvert(bilans.travail), ...appliquer, msg(messages.application(3)), msg(messages.bilan(3, bilans.apresLApplication), '.resultat-action'),
      clic('.resultat-action'), msg(messages.annulationRefuseeReglesFutures(4), '.resultat:not([hidden])')]),
  etat('historique-annulation-regles-futures', 'Historique, annulation refusée, règles d’une version plus récente', 'Le designer annule depuis l’Historique ; une version plus récente d’UCM Nomenclature a rangé des règles dans le fichier.',
    'Le message « Une version plus récente d’UCM Nomenclature a rangé des règles dans ce fichier. Mettez le plugin à jour pour annuler ce renommage. » au-dessus de l’Historique.',
    [...ouvert(bilans.avecUnImport), clic('.icon-button', '.config-liste'), clic('#onglet-historique', '.historique-liste'),
      clic('.config-ecartes .btn', '.feuille'), clic('.feuille-groupe .btn-primary'), msg(messages.annulationRefuseeReglesFutures(3), '.etat-erreur:not([hidden])')]),
  etat('journal-impossible', 'Application refusée, journal impossible', 'Le fichier ne peut pas garder de quoi remettre les noms : le lot est refusé avant tout renommage.',
    'La ligne d’avertissement « Rien n’a été renommé : le fichier ne peut pas garder de quoi remettre ces noms… » avec Relancer l’analyse.',
    [...ouvert(bilans.travail), ...appliquer, msg(messages.applicationRefusee(3, 'journal-impossible'), '.resultat:not([hidden])')]),
  etat('application-non-verifiee', 'Application refusée, variables non vérifiées', 'Les deux variables cochées ont une protection que le plugin ne peut pas lire : le lot est refusé.',
    'La ligne d’avertissement « Rien n’a été renommé. UCM Nomenclature n’a pas pu lire ce qu’UCM Palettes a noté dans ce fichier. Relancez l’analyse. » avec le bouton Relancer l’analyse.',
    [...ouvert(bilans.travail), ...appliquer, msg(messages.applicationRefuseeNonVerifiee(3), '.resultat:not([hidden])')]),
  etat('application-partielle-non-verifiee', 'Application partielle, variables non vérifiées', 'Le lot renomme 85 noms et laisse deux variables de couleur dont la protection ne se lit pas.',
    'La ligne « ✓ 85 noms renommés » avec Annuler, puis la note « 2 variables de couleur n’ont pas été renommées. UCM Nomenclature n’a pas pu lire ce qu’UCM Palettes a noté dans ce fichier. » ; la carte Non renommés compte « 1 bloqué, 2 non vérifiés ».',
    [...ouvert(bilans.travail), ...appliquer, msg(messages.applicationPartielleNonVerifiee(3)), msg(messages.bilan(3, bilans.apresUnLotPartiel), '.resultat:not([hidden])')]),
  etat('bilan-illisible', 'Application faite, bilan illisible', 'Les noms ont changé, mais la relecture du fichier a échoué.',
    'La ligne « 87 noms renommés » avec Annuler, suivie de « Les noms sont changés, mais le plugin n’a pas pu relire le fichier ».',
    [...ouvert(bilans.travail), ...appliquer, msg(messages.application(3)), msg(messages.erreur(3, 'echec'), '.resultat:not([hidden])')]),
  etat('rien-a-faire', 'Rien à faire', 'Aucun renommage ni aucune question ne reste.',
    'Le message « Tous les noms suivent vos règles » et le bouton pour relancer l’analyse.',
    ouvert(bilans.rienAFaire)),
  etat('sans-variable-locale', 'Sans variable locale', 'Le fichier n’a que des variables de bibliothèque.',
    'Le message qui renvoie au fichier des tokens, sur Corrections, Questions et À faire dans Figma.',
    ouvert(bilans.sansVariableLocale)),
  etat('a-trancher', 'Questions', 'Le designer ouvre l’onglet des questions.',
    'La paire de termes face à face, la proposition bordée de bleu, puis la faute et l’échelle ; Autres pistes en bas.',
    [...ouvert(bilans.travail), clic('#onglet-a-trancher', '.carte.question')]),
  etat('a-trancher-collection-et-plus-tard', 'Questions, collection et Plus tard', 'La liste porte une collection, des mots collés, et des questions remises à plus tard.',
    'La carte de collection avec son choix, la carte des mots collés, la section Plus tard dépliée avec Reprendre.',
    [...ouvert(bilans.collectionsEtPlusTard), clic('#onglet-a-trancher', '.carte.question'), clic('.tete-bouton:has(.plus-tard-titre)')]),
  etat('questions-vide', 'Questions, aucune question', 'Le designer ouvre l’onglet des questions : aucun terme du fichier n’en rappelle un autre, et des renommages restent.',
    'La vue « Aucune question pour l’instant », sa ligne et le bouton Voir les renommages, au-dessus de la carte Autres pistes.',
    [...ouvert(bilans.sansQuestion), clic('#onglet-a-trancher', '.etat')]),
  etat('questions-vide-plus-tard', 'Questions, aucune question et Plus tard', 'Aucune question à poser, mais le designer en a gardé pour plus tard.',
    'La vue vide dit « Vous avez gardé 2 questions pour plus tard » avec Voir les renommages ; dessous, la section Plus tard dépliée avec Reprendre, puis Autres pistes.',
    [...ouvert(bilans.sansQuestionAvecPlusTard), clic('#onglet-a-trancher', '.etat'), clic('.tete-bouton:has(.plus-tard-titre)')]),
  etat('a-trancher-reponse', 'Questions, réponse donnée', 'Le designer garde un terme ; l’analyse relit le fichier.',
    'La carte répondue se réduit à une ligne avec Annuler ; le compte de Renommages a changé.',
    [...ouvert(bilans.travail), clic('#onglet-a-trancher', '.carte.question'), clic(repondreAuPremier),
      msg(messages.bilan(3, bilans.apresUneReponse), '.faite-texte')]),
  etat('a-trancher-conflit', 'Questions, réponse refusée', 'La réponse du designer contredit un terme UCM.',
    'La carte de conflit : le titre, l’explication et le bouton qui écarte le terme UCM dans ce fichier.',
    [...ouvert(bilans.travail), clic('#onglet-a-trancher', '.carte.question'), clic(repondreAuPremier),
      msg(messages.refus(3, [conflitDeFichier]))]),
  etat('regles', 'Règles', 'Le designer ouvre l’onglet des règles.',
    'L’écriture résumée avec Modifier ; sous le vocabulaire, la barre (Filtrer, recherche, tri) puis une section par type non vide : À trancher, Remplace, Sans règle, chacune avec son icône, son total et ses lignes.',
    reglesOuvertes()),
  etat('regles-noms', 'Règles, avec des noms', 'Le fichier a un composant et une palette : la liste les reconnaît.',
    'Les sections Composants (Button, StressTest sous sa forme du fichier) et Palettes (Poppy), sans pastille de nature : l’icône et le titre de la section disent le type. Les lignes de background et de hover gardent leur origine.',
    reglesAvecNoms()),
  etat('regles-sections', 'Règles, toutes les sections', 'Le fichier a des lignes de chaque type : le Playground.',
    'Six sections ouvertes, de À trancher à Palettes, dans cet ordre, chacune sous sa bande (icône grise par type, ambre pour À trancher, titre, total, ligne, chevron) ; cinq lignes au plus par place et « Afficher les 4 autres variables » sous Remplace ; le jeton d’une règle et « remplace » avec ses variantes ; l’origine en texte gris et la pastille À trancher à droite.',
    reglesDuPlayground()),
  etat('regles-places', 'Règles, groupes et variables', 'Le designer lit une section qui a des termes aux deux places, en tri A → Z.',
    'Dans Remplace, À trancher et Sans règle : l’intertitre Groupes (échantillon orchidée, total) puis ses lignes, l’intertitre Variables (échantillon olive, total) puis ses lignes ; Size et size, Color et color, LineHeight et line-height ; un lien « Afficher les n autres variables » par place qui en a de reste. Conforme, Composants et Palettes n’ont qu’une place et pas d’intertitre.',
    reglesDuPlayground()),
  etat('regles-tri-nombre', 'Règles, tri par nombre', 'Le designer choisit « Trier : nombre de variables ».',
    'Chaque section ne montre plus que cinq lignes, du plus employé au moins employé, groupes et variables mêlés, sans intertitre de place ; un seul lien « Afficher les n autres » par section.',
    [...reglesDuPlayground(), { selection: { dans: '.tri', valeur: 'nombre' } }, msg(messages.termesParNombre(4), '.ligne-terme')]),
  etat('regles-section-suite', 'Règles, la suite d’une section', 'Le designer appuie sur « Afficher les 4 autres variables », sous Remplace.',
    'Les variables de Remplace passent de cinq à neuf et perdent leur lien ; ses groupes et les autres sections ne bougent pas.',
    [...reglesDuPlayground(), clic('[data-cle="plus:remplace:variables"]'), msg(messages.termesPage(4), ligneDe('size'))]),
  etat('regles-section-repliee', 'Règles, une section repliée', 'Le designer replie la section Palettes.',
    'La bande de Palettes garde son icône, son titre, son total et sa ligne, le chevron tourné vers la droite ; ses lignes ont disparu.',
    [...reglesDuPlayground(), clic('[data-cle="entete:palette"]')]),
  etat('regles-menu-filtrer', 'Règles, menu Filtrer ouvert', 'Le designer ouvre Filtrer et coche Remplace et Sans règle.',
    'Le bouton « Filtrer · 2 », le menu avec les six types (icône, libellé, compte), les deux origines puis les deux places, deux cases cochées ; les jetons Remplace et Sans règle avec leur × ; seules les deux sections correspondantes restent.',
    [...reglesDuPlayground(), clic('.ancre-menu .btn'), clic('.menu-filtres label:nth-of-type(2) input'), clic('.menu-filtres label:nth-of-type(4) input'),
      msg(messages.termesFiltres(5), '.filtre-actif')]),
  etat('regles-filtre-place', 'Règles, filtre de place', 'Le designer ouvre Filtrer et coche Groupes, dans le groupe Place.',
    'Le menu reste ouvert sur son groupe Place (échantillons, Groupes 17, Variables 55) avec Groupes coché ; le jeton Groupes avec son × ; chaque section ne montre que ses groupes, sans intertitre.',
    [...reglesDuPlayground(), clic('.ancre-menu .btn'), clic('.menu-filtres label:nth-of-type(9) input'),
      msg(messages.termesDesGroupes(5), '.filtre-actif')]),
  etat('regles-recherche', 'Règles, variante cherchée', 'Le designer cherche bg dans Règles.',
    'La phrase « bg est remplacé par background » sous la recherche ; bg en blanc dans la ligne de background.',
    [...reglesOuvertes(), { saisie: { dans: '.noms-recherche', valeur: 'bg' } }, ...delai(), msg(messages.termesTrouves(4), '.resultat-recherche:not([hidden])')]),
  etat('regles-detail-exporte', 'Règles, détail du vocabulaire', 'Le sandbox rend le détail du vocabulaire.',
    'L’onglet Règles, avec le lien gris « Exporter le détail du vocabulaire » en bas de page. Le message rejoue la réponse sans le clic, qui lancerait le téléchargement.',
    [...reglesOuvertes(), msg(messages.diagnostic(4))]),
  etat('feuille-ecriture', 'Feuille de l’écriture', 'Le designer appuie sur Modifier, dans Règles.',
    'La même carte qu’au premier lancement, dans une feuille ; Annuler et Enregistrer en bas.',
    [...reglesOuvertes(), clic('.btn[aria-label="Modifier l’écriture"]', '.feuille')]),
  etat('feuille-terme-ucm', 'Feuille d’un terme UCM', 'Le designer ouvre un terme défini par UCM.',
    'Le terme et UCM · rôle dans l’en-tête, la définition, le bloc gris Règle avec Formes fixées par UCM et des jetons sans ×, À renommer en deux colonnes avec Voir dans Renommages, Déjà employé ; Ne pas appliquer ce terme dans ce fichier en bas, sans Fermer.',
    termeOuvert('background', fiches.ucm)),
  etat('feuille-terme-personnalise', 'Feuille d’un terme personnalisé', 'Le designer ouvre un terme défini dans ce fichier.',
    'Le terme et Personnalisé dans l’en-tête, le bloc gris Règle avec des jetons à × et + Terme, À renommer, Déjà employé ; Supprimer la règle (rouge) à gauche et Proposer à UCM à droite.',
    termeOuvert('hover', fiches.personnalise)),
  etat('feuille-terme-sans-regle', 'Feuille d’un terme sans règle', 'Le designer ouvre un terme qu’aucune règle ne couvre.',
    'Sans règle dans l’en-tête, la question qui porte sur le terme, Déjà employé ; Remplace d’autres termes… et Remplacer par… en bas, sans Fermer.',
    termeOuvert('radius', fiches.sansRegle)),
  etat('feuille-composant', 'Feuille d’un composant', 'Le designer ouvre Button, nom d’un composant du fichier.',
    'Button et la pastille grise Composant dans l’en-tête, la phrase « Nom d’un composant du fichier… » et le lien Traiter comme un terme, Déjà employé ; Remplace d’autres termes… et Remplacer par… en bas.',
    [...reglesAvecNoms(), clic(ligneDe('Button'), '.feuille'), msg(messages.fiche(4, fiches.composant), '.fiche-bloc, .fiche-regle')]),
  etat('feuille-remplacer-par', 'Remplacer par…', 'Le designer choisit le terme qui remplacera radius.',
    'L’étape dans la même feuille : le champ, le retour ‹, l’effet « 9 variables rejoindront les renommages » avec un chemin réel.',
    [...termeOuvert('radius', fiches.sansRegle), clic('.feuille-groupe .btn-primary', '#feuille-saisie'),
      { saisie: { dans: '#feuille-saisie', valeur: 'corner' } }, ...delai(), msg(messages.simulation(5), '.feuille .effet')]),
  etat('configuration', 'Configuration, Réglages', 'Le designer appuie sur le bouton Configuration.',
    'Le titre Configuration et Retour ; les onglets Réglages (actif) et Historique ; l’architecture du fichier, les collections analysées, puis les règles du fichier avec Exporter et Importer.',
    [...ouvert(bilans.travail), clic('.icon-button', '.config-liste')]),
  etat('configuration-architecture-libre', 'Configuration, architecture libre', 'Le fichier porte une déclaration d’architecture libre.',
    'L’intertitre Architecture du fichier, l’interrupteur désactivé et son aide, avant Collections analysées.',
    [...ouvert({ ...bilans.travail, architecture: 'libre' }), clic('.icon-button', '#architecture-ucm[aria-checked="false"]')]),
  etat('configuration-architecture-ucm', 'Configuration, architecture UCM', 'Le fichier suit l’architecture UCM.',
    'L’interrupteur activé et son aide sur les collections theme, brands et utility.',
    [...ouvert({ ...bilans.travail, architecture: 'ucm' }), clic('.icon-button', '#architecture-ucm[aria-checked="true"]')]),
  etat('configuration-architecture-illisible', 'Configuration, architecture illisible', 'La déclaration rangée dans le fichier ne se lit pas.',
    'L’interrupteur désactivé reste utilisable ; la ligne « La déclaration rangée dans ce fichier est illisible. » apparaît sous son aide.',
    [...ouvert({ ...bilans.travail, architecture: 'illisible' }), clic('.icon-button', '#architecture-ucm[aria-checked="false"]')]),
  etat('configuration-historique', 'Configuration, Historique', 'Le designer ouvre l’onglet Historique : un renommage d’aujourd’hui et un import.',
    'Dernier renommage (« 12 noms, aujourd’hui à 14:32 », Annuler le renommage, brands ouverte avec ses 8 noms, Couleurs fermée), puis Dernier import (« 3 règles changées, aujourd’hui à 14:35 », Annuler l’import, trois lignes de règles).',
    [...ouvert(bilans.avecUnImport), clic('.icon-button', '.config-liste'), clic('#onglet-historique', '.historique-liste')]),
  etat('historique-partiel', 'Historique, des noms ne reviendront pas', 'Le lot d’hier : un nom a changé dans Figma depuis, et Couleurs est exclue de l’analyse.',
    '« 12 noms, hier à 17:05 », l’avertissement « 5 noms ne reviendront pas. », une ligne « Changé dans Figma depuis » dans brands, la pastille Non analysée et la note sur Couleurs.',
    [...ouvert(bilans.journalPartiel), clic('.icon-button', '.config-liste'), clic('#onglet-historique', '.historique-avertissement'), clic('.nom-de-collection:has(.pastille-attente)')]),
  etat('historique-vide', 'Historique, rien à annuler', 'Le journal est vide et aucun import n’est gardé.',
    'Les deux notes « Rien à annuler pour l’instant » et « Après chaque renommage ou import… », sans bouton.',
    [...ouvert(bilans.sansHistorique), clic('.icon-button', '.config-liste'), clic('#onglet-historique', '.historique-note')]),
  etat('historique-apres-annulation', 'Historique, après l’annulation', 'Le designer confirme l’annulation ; le sandbox répond puis le bilan suivant arrive.',
    'La ligne verte « 12 noms rétablis » en tête de l’Historique, sans section Dernier renommage ; le dernier import reste.',
    [...ouvert(bilans.avecUnImport), clic('.icon-button', '.config-liste'), clic('#onglet-historique', '.historique-liste'),
      clic('.config-ecartes .btn', '.feuille'), clic('.feuille-groupe .btn-primary'), msg(messages.annulation(3)),
      msg(messages.bilan(3, bilans.apresUneAnnulation), '.resultat')]),
  etat('historique-annulation-non-verifiee', 'Historique, restitution non vérifiée', 'Le designer annule depuis l’Historique ; deux variables de couleur ne peuvent pas être vérifiées.',
    '« 10 noms rétablis. » puis « 2 variables de couleur n’ont pas pu être rétablies. UCM Nomenclature n’a pas pu lire ce qu’UCM Palettes a noté dans ce fichier. Relancez l’analyse, puis annulez de nouveau. », sans supposer des noms changés.',
    [...ouvert(bilans.avecUnImport), clic('.icon-button', '.config-liste'), clic('#onglet-historique', '.historique-liste'),
      clic('.config-ecartes .btn', '.feuille'), clic('.feuille-groupe .btn-primary'), msg(messages.annulationPartielleNonVerifiee(3), '.etat-erreur:not([hidden])')]),
  etat('confirmation-annulation', 'Confirmation de l’annulation', 'Le designer appuie sur Annuler le renommage, dans l’onglet Historique.',
    'La feuille « Annuler le renommage ? 12 noms reprennent leur ancien nom. », Garder et Remettre les anciens noms ; le focus sur Garder.',
    [...ouvert(bilans.travail), clic('.icon-button', '.config-liste'), clic('#onglet-historique', '.historique-liste'), clic('.config-ecartes .btn', '.feuille')]),
  etat('regles-exportees', 'Règles exportées', 'Le sandbox rend le texte des règles exportées.',
    'La page Configuration, sans message d’erreur. Le message rejoue la réponse sans le clic sur Exporter, qui lancerait le téléchargement du fichier.',
    [...ouvert(bilans.travail), clic('.icon-button', '.config-liste'), msg(messages.reglesExportees(3))]),
  etat('import-refuse', 'Import refusé', 'Un fichier de règles importé contredit une règle du fichier.',
    'La phrase « Aucune règle n’a été importée » suivie d’une ligne par conflit.',
    [...ouvert(bilans.travail), clic('.icon-button', '.config-liste'),
      { fichier: { dans: 'input[type="file"]', nom: 'regles-ucm-nomenclature.json', contenu: '{"version":1}' } },
      msg(messages.refus(3, [conflitDeFichier, conflitDeCycle]), '.etat-erreur:not([hidden])')]),
  etat('import-mot-refuse', 'Import, mot refusé', 'Un fichier de règles contient un terme que le plugin ne peut pas écrire.',
    'Le message « Ce terme ne peut pas s’écrire ainsi » sous le titre de la Configuration.',
    [...ouvert(bilans.travail), clic('.icon-button', '.config-liste'),
      { fichier: { dans: 'input[type="file"]', nom: 'regles-ucm-nomenclature.json', contenu: '{"version":1}' } },
      msg(messages.erreur(3, 'mot-refuse'), '.etat-erreur:not([hidden])')]),
  etat('import-partiel', 'Import, arrêté en route', 'L’import s’est arrêté avant la fin et les règles sont revenues à leur état d’avant.',
    'Le message « L’import s’est arrêté en route » sous le titre de la Configuration.',
    [...ouvert(bilans.travail), clic('.icon-button', '.config-liste'),
      { fichier: { dans: 'input[type="file"]', nom: 'regles-ucm-nomenclature.json', contenu: '{"version":1}' } },
      msg(messages.erreur(3, 'import-partiel'), '.etat-erreur:not([hidden])')]),
  etat('erreur', 'Fichier modifié', 'Le fichier a changé depuis l’analyse.',
    'Le bandeau « Le fichier a changé » avec son bouton, au-dessus des onglets.',
    [...ouvert(bilans.travail), msg(messages.erreur(9, 'fichier-modifie'))]),
];

module.exports = { ETATS, releveIntencial };
