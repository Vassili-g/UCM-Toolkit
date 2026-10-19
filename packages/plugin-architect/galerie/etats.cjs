/**
 * Les états d'UCM Architect : un par écran des maquettes, feuilles comprises,
 * et au moins un par type de `PluginMessage`. Chaque état rejoue la suite de
 * gestes et de messages qui le produit dans l'interface réelle.
 *
 * Sans sandbox, l'écran n'accepte que les réponses à ses propres demandes. Les
 * messages numérotés répondent donc aux demandes que les gestes précédents
 * ont émises : le bilan est la demande 1, la lecture des termes la 2, et
 * chaque geste qui interroge le sandbox prend le numéro suivant.
 */
const { bilans, fiches, messages, conflitDeFichier, conflitDeCycle } = require('./donnees.cjs');

const etat = (id, titre, quand, regarder, atteinte) => ({ id, titre, quand, regarder, existe: true, atteinte });
const msg = (message, attendre) => (attendre ? { message, attendre } : { message });
const clic = (selecteur, attendre) => (attendre ? { clic: selecteur, attendre } : { clic: selecteur });

/** L'ouverture d'un fichier déjà analysé, jusqu'au bilan (demande 1). */
const ouvert = (bilan) => [msg(messages.initial(true)), msg(messages.bilan(1, bilan), '.liste')];
/** L'onglet Règles : le clic relit les termes (demande 3), dont la réponse remplit la liste. */
const reglesOuvertes = () => [...ouvert(bilans.travail), clic('#onglet-regles'), msg(messages.termes(3), '.ligne-terme')];
/** La feuille d'un terme : la ligne `rang` de la liste, puis sa fiche (demande 4). */
const termeOuvert = (rang, fiche) => [
  ...reglesOuvertes(),
  clic(`.liste-termes .ligne-terme:nth-child(${rang})`, '.feuille'),
  msg(messages.fiche(4, fiche), '.fiche-entete'),
];
/** Le délai de la simulation d'une saisie : l'écran attend 250 ms avant de demander. */
const delai = () => Array.from({ length: 60 }, () => ({ survol: 'body' }));
const repondreAuPremier = '.carte.question .question-actions:first-child .btn-primary';
const appliquer = [clic('.pied .btn-primary', '.feuille'), clic('.feuille-groupe .btn-primary')];

module.exports.ETATS = [
  etat('premier-lancement', 'Premier lancement', 'Le plugin vient de s’ouvrir sur un fichier jamais analysé.',
    'Un titre, une ligne, un bouton Analyser le fichier, sans onglets.',
    [msg(messages.initial(false))]),
  etat('lecture', 'Lecture des variables', 'Une analyse parcourt les variables du fichier.',
    'La barre d’avancement et le compte « 400 sur 1200 », à la place des onglets.',
    [msg(messages.initial(true)), msg(messages.lecture(400, 1200), '[role="progressbar"]')]),
  etat('ecriture-des-noms', 'Écriture des noms', 'La première analyse est finie et propose l’écriture du fichier.',
    'La carte des groupes, des noms et des collections, avec un exemple réel par ligne, et Continuer en bas.',
    [msg(messages.initial(false)), clic('.etat > .btn'), msg(messages.bilan(1, bilans.premierLancement), '.ecriture')]),
  etat('a-appliquer', 'À appliquer, repliée', 'Le bilan propose des renommages dans les trois sections.',
    'Termes, Écriture et Collections ; chaque carte coche, dit avant → après, son nombre de variables et son origine.',
    ouvert(bilans.travail)),
  etat('a-appliquer-depliee', 'À appliquer, dépliée', 'Le designer déplie un groupe et demande les autres noms.',
    'Une variable par ligne, le bouton des autres noms, puis les noms reçus dans la carte.',
    [...ouvert(bilans.travail), clic('.liste .tete-bouton'), clic('.autres'), msg(messages.lignes(3, 2))]),
  etat('a-appliquer-non-renommes', 'À appliquer, noms non renommés', 'Un nom bloqué et des noms protégés accompagnent les renommages.',
    'La carte Non renommés dépliée : le nom bloqué avec sa raison, les noms écrits par UCM Palettes.',
    [...ouvert(bilans.travail), clic('.carte.muette .tete-bouton')]),
  etat('confirmation', 'Confirmation', 'Le designer appuie sur Appliquer.',
    'La feuille « Renommer 87 noms ? », ses quatre faits, Retour et Renommer ; le focus sur Retour.',
    [...ouvert(bilans.travail), clic('.pied .btn-primary', '.feuille')]),
  etat('application', 'Après application', 'Les noms cochés ont été renommés.',
    'La ligne « 87 noms renommés » avec Annuler en haut ; la liste ne garde que ce qui n’était pas coché.',
    [...ouvert(bilans.travail), ...appliquer, msg(messages.application(3)), msg(messages.bilan(3, bilans.apresLApplication), '.resultat:not([hidden])')]),
  etat('rien-a-faire', 'Rien à faire', 'Aucun renommage ni aucune question ne reste.',
    'Le message « Tous les noms suivent vos règles » et le bouton pour relancer l’analyse.',
    ouvert(bilans.rienAFaire)),
  etat('sans-variable-locale', 'Sans variable locale', 'Le fichier n’a que des variables de bibliothèque.',
    'Le message qui renvoie au fichier des tokens, sur les trois onglets.',
    ouvert(bilans.sansVariableLocale)),
  etat('a-trancher', 'À trancher', 'Le designer ouvre l’onglet des questions.',
    'La paire de termes face à face, la proposition bordée de bleu, puis la faute et l’échelle ; Autres pistes en bas.',
    [...ouvert(bilans.travail), clic('#onglet-a-trancher', '.carte.question')]),
  etat('a-trancher-collection-et-plus-tard', 'À trancher, collection et Plus tard', 'La liste porte une collection, des mots collés, et des questions remises à plus tard.',
    'La carte de collection avec son choix, la carte des mots collés, la section Plus tard dépliée avec Reprendre.',
    [...ouvert(bilans.collectionsEtPlusTard), clic('#onglet-a-trancher', '.carte.question'), clic('.tete-bouton:has(.plus-tard-titre)')]),
  etat('a-trancher-reponse', 'À trancher, réponse donnée', 'Le designer garde un terme ; l’analyse relit le fichier.',
    'La carte répondue se réduit à une ligne avec Annuler ; le compte de À appliquer a changé.',
    [...ouvert(bilans.travail), clic('#onglet-a-trancher', '.carte.question'), clic(repondreAuPremier),
      msg(messages.bilan(3, bilans.apresUneReponse), '.faite-texte')]),
  etat('a-trancher-conflit', 'À trancher, réponse refusée', 'La réponse du designer contredit un terme UCM.',
    'La carte de conflit : le titre, l’explication et le bouton qui écarte le terme UCM dans ce fichier.',
    [...ouvert(bilans.travail), clic('#onglet-a-trancher', '.carte.question'), clic(repondreAuPremier),
      msg(messages.refus(3, [conflitDeFichier]))]),
  etat('regles', 'Règles', 'Le designer ouvre l’onglet des règles.',
    'L’écriture résumée avec Modifier, la recherche, les filtres avec leur compte, les termes avec leur origine et leur état.',
    reglesOuvertes()),
  etat('regles-recherche', 'Règles, variante cherchée', 'Le designer cherche bg dans Règles.',
    'La phrase « bg est remplacé par background » sous la recherche ; bg en blanc dans la ligne de background.',
    [...reglesOuvertes(), { saisie: { dans: '.recherche', valeur: 'bg' } }, ...delai(), msg(messages.termesTrouves(4), '.resultat-recherche:not([hidden])')]),
  etat('feuille-ecriture', 'Feuille de l’écriture', 'Le designer appuie sur Modifier, dans Règles.',
    'La même carte qu’au premier lancement, dans une feuille ; Annuler et Enregistrer en bas.',
    [...reglesOuvertes(), clic('.btn[aria-label="Modifier l’écriture des noms"]', '.feuille')]),
  etat('feuille-terme-ucm', 'Feuille d’un terme UCM', 'Le designer ouvre un terme défini par UCM.',
    'Le terme et UCM · rôle dans l’en-tête, la définition, le bloc gris Règle avec Formes fixées par UCM et des jetons sans ×, À renommer en deux colonnes avec Voir dans Renommages, Déjà employé ; Ne pas appliquer ce terme dans ce fichier en bas, sans Fermer.',
    termeOuvert(1, fiches.ucm)),
  etat('feuille-terme-personnalise', 'Feuille d’un terme personnalisé', 'Le designer ouvre un terme défini dans ce fichier.',
    'Le terme et Personnalisé dans l’en-tête, le bloc gris Règle avec des jetons à × et + Terme, À renommer, Déjà employé ; Supprimer la règle (rouge) à gauche et Proposer à UCM à droite.',
    termeOuvert(2, fiches.personnalise)),
  etat('feuille-terme-sans-regle', 'Feuille d’un terme sans règle', 'Le designer ouvre un terme qu’aucune règle ne couvre.',
    'Sans règle dans l’en-tête, la question qui porte sur le terme, Déjà employé ; Remplace d’autres termes… et Remplacer par… en bas, sans Fermer.',
    termeOuvert(5, fiches.sansRegle)),
  etat('feuille-remplacer-par', 'Remplacer par…', 'Le designer choisit le terme qui remplacera radius.',
    'L’étape dans la même feuille : le champ, le retour ‹, l’effet « 9 variables rejoindront À appliquer » avec un chemin réel.',
    [...termeOuvert(5, fiches.sansRegle), clic('.feuille-groupe .btn-primary', '#feuille-saisie'),
      { saisie: { dans: '#feuille-saisie', valeur: 'corner' } }, ...delai(), msg(messages.simulation(5), '.feuille .effet')]),
  etat('configuration', 'Configuration', 'Le designer appuie sur le bouton Configuration.',
    'Le titre Configuration et Retour ; les collections analysées, les règles du fichier, le dernier renommage.',
    [...ouvert(bilans.travail), clic('.icon-button', '.config-liste')]),
  etat('regles-exportees', 'Règles exportées', 'Le sandbox rend le texte des règles exportées.',
    'La page Configuration, sans message d’erreur. Le message rejoue la réponse sans le clic sur Exporter, qui lancerait le téléchargement du fichier.',
    [...ouvert(bilans.travail), clic('.icon-button', '.config-liste'), msg(messages.reglesExportees(3))]),
  etat('import-refuse', 'Import refusé', 'Un fichier de règles importé contredit une règle du fichier.',
    'La phrase « Aucune règle n’a été importée » suivie d’une ligne par conflit.',
    [...ouvert(bilans.travail), clic('.icon-button', '.config-liste'),
      { fichier: { dans: 'input[type="file"]', nom: 'regles-ucm-architect.json', contenu: '{"version":1}' } },
      msg(messages.refus(3, [conflitDeFichier, conflitDeCycle]), '.etat-erreur:not([hidden])')]),
  etat('erreur', 'Fichier modifié', 'Le fichier a changé depuis l’analyse.',
    'Le bandeau « Le fichier a changé » avec son bouton, au-dessus des onglets.',
    [...ouvert(bilans.travail), msg(messages.erreur(9, 'fichier-modifie'))]),
];
