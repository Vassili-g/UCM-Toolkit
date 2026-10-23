/**
 * Tous les textes de l'écran. Un texte entre accents graves met ces mots en
 * code : c'est l'écriture d'un nom, jamais une phrase.
 */
import type { IndiceDePaire } from '@ucm-kit/core/referentiel';
import type { CauseDeProtection, CodeDErreur, ConflitVue, TypeDeTerme } from '../../messages/nomenclature';

const noms = (nombre: number): string => (nombre === 1 ? '1 nom' : `${nombre} noms`);
const questions = (nombre: number): string => (nombre === 1 ? '1 question' : `${nombre} questions`);
/** La ligne de détail d'une carte : « 60 variables », « 159 variables et 1 collection ». */
function nombreDeNoms(variables: number, collections: number): string {
  const lesVariables = variables === 1 ? '1 variable' : `${variables} variables`;
  const lesCollections = collections === 1 ? '1 collection' : `${collections} collections`;
  if (collections === 0) return lesVariables;
  return variables === 0 ? lesCollections : `${lesVariables} et ${lesCollections}`;
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const deuxChiffres = (valeur: number): string => String(valeur).padStart(2, '0');

/**
 * Le moment d'un lot d'après sa date ISO, à l'heure locale : « aujourd’hui à 14:32 », « hier à 17:05 », « le 14 octobre à 09:12 ».
 * L'année s'ajoute quand elle diffère de celle de `maintenant`. Un texte qui n'est pas une date ISO s'écrit tel quel, après « à ».
 */
function quandLeLot(iso: string, maintenant: Date): string {
  const date = /^\d{4}-\d{2}-\d{2}T/u.test(iso) ? new Date(iso) : null;
  if (date === null || Number.isNaN(date.getTime())) return `à ${iso}`;
  const heure = `à ${deuxChiffres(date.getHours())}:${deuxChiffres(date.getMinutes())}`;
  const jour = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const hier = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() - 1);
  if (jour(date) === jour(maintenant)) return `aujourd’hui ${heure}`;
  if (jour(date) === jour(hier)) return `hier ${heure}`;
  const annee = date.getFullYear() === maintenant.getFullYear() ? '' : ` ${date.getFullYear()}`;
  return `le ${date.getDate() === 1 ? '1er' : date.getDate()} ${MOIS[date.getMonth()]}${annee} ${heure}`;
}

const INDICE_DE_FAUTE = 'Une lettre d’écart';

export const TEXTES = {
  marque: 'UCM Architect',
  titreConfiguration: 'Configuration',
  boutonConfiguration: 'Configuration',
  ouvrirLaConfiguration: 'Ouvrir la configuration',
  retour: 'Retour',

  etiquetteDesOnglets: 'Sections d’UCM Architect',
  ongletAAppliquer: 'Corrections',
  ongletATrancher: 'Questions',
  ongletAFaire: 'À faire dans Figma',
  ongletRegles: 'Règles',
  /** Le nom que les lecteurs d'écran donnent à l'onglet quand son compte s'affiche. */
  nomDeLOngletAAppliquer: (nombre: number): string => `Corrections, ${noms(nombre)}`,
  nomDeLOngletATrancher: (nombre: number): string => `Questions, ${questions(nombre)}`,

  analyseEnCours: 'Lecture des variables',
  avancementDeLAnalyse: 'Avancement de la lecture',
  variablesLues: (lues: number, total: number): string => `${lues} sur ${total}`,

  rienAFaire: 'Tous les noms suivent vos règles',
  relancerLAnalyse: 'Relancer l’analyse',

  sansVariableLocale: 'Aucune variable à harmoniser ici',
  sansVariableLocaleExplication: 'Les variables de ce fichier viennent d’une library. Ouvrez le plugin dans le fichier des tokens.',

  fichierModifie: 'Le fichier a changé',

  // U1b : premier lancement, écriture des noms, Configuration.
  titreDuPremierLancement: 'Harmoniser les noms des variables',
  ligneDuPremierLancement: 'Leur écriture et les termes qu’elles emploient.',
  analyserLeFichier: 'Analyser le fichier',

  titreDeLEcriture: 'Écriture des groupes et des variables',
  ligneDeLEcriture: 'Proposée d’après votre fichier ; modifiable ensuite dans Règles.',
  continuer: 'Continuer',

  ecritureDesGroupes: 'Groupes',
  ecritureDesNoms: 'Variables',
  ecritureDesCollections: 'Collections',
  choisirLEcritureDesGroupes: 'Écriture des groupes',
  choisirLEcritureDesNoms: 'Écriture des variables',
  suiventSurTotal: (suivent: number, total: number): string => `· ${suivent} sur ${total}`,
  collectionsReconnues: (reconnues: number, total: number): string => `· ${reconnues} sur ${total} reconnues`,
  collectionsSuiventUcm: 'Elles portent les noms du référentiel UCM.',
  nomsUcm: 'noms UCM',

  architectureDuFichier: 'Architecture du fichier',
  fichierUcm: 'Ce fichier suit l’architecture UCM',
  aideArchitecture: 'Activez-le pour qu’UCM Architect vérifie les tokens et les composants de ce fichier. Les collections theme, brands et utility contiennent alors seulement des alias.',
  architectureIllisible: 'La déclaration rangée dans ce fichier est illisible.',
  architectureFuture: 'Elle vient d’une version plus récente d’UCM Architect.',
  collectionsAnalysees: 'Collections analysées',
  variablesDeLaCollection: (nombre: number): string => (nombre === 1 ? '1 variable' : `${nombre} variables`),
  /** La ligne d'une collection : « 346 variables, dont 120 gardent leur nom » ; `gardees` compte les variables protégées de la collection. */
  variablesEtProtegees: (nombre: number, gardees: number): string => {
    const variables = nombre === 1 ? '1 variable' : `${nombre} variables`;
    if (gardees <= 0) return variables;
    if (gardees >= nombre) return `${variables}, ${nombre === 1 ? 'qui garde son nom' : 'qui gardent leur nom'}`;
    return `${variables}, dont ${gardees} ${gardees === 1 ? 'garde son nom' : 'gardent leur nom'}`;
  },
  sansCollection: 'Les collections du fichier apparaissent après la première analyse.',
  reglesDeCeFichier: 'Règles de ce fichier',
  exporter: 'Exporter',
  importer: 'Importer',
  nomDuFichierDeRegles: 'regles-ucm-nomenclature.json',
  choisirLeFichierDeRegles: 'Fichier de règles à importer',
  etiquetteDesOngletsDeLaConfiguration: 'Configuration',
  ongletReglages: 'Réglages',
  ongletHistorique: 'Historique',
  phraseReglages: 'Les collections que le plugin lit et les règles de ce fichier.',
  phraseHistorique: 'Revenez à l’état d’avant le dernier renommage ou le dernier import.',

  libraryDeTokens: 'Library de tokens',
  modeComposantLit: 'Le mode Composant lit',
  libraryChoisieParceQue: (nombre: number): string => `Choisie parce que ses variables sont liées à ${nombre} layers de ce fichier.`,
  accessibilite: 'Accessibilité',
  niveauDeContraste: 'Niveau de contraste',
  niveauAa: 'AA',
  niveauAaa: 'AAA',
  seuilAa: 'AA demande 4,5:1 pour un texte et 3:1 pour un stroke.',
  preparationRecue: 'Préparation reçue',
  preparationRecueAide: 'Collez le texte de variables préparées par un autre designer.',
  collerUnePreparation: 'Coller une préparation',

  dernierRenommage: 'Dernier renommage',
  /** « aujourd’hui à 14:32 », « hier à 17:05 », « le 14 octobre à 09:12 » : le moment du lot, à l'heure locale de `maintenant`. */
  quandLeLot: (iso: string, maintenant: Date): string => quandLeLot(iso, maintenant),
  renommagesALHeure: (nombre: number, quand: string): string => `${noms(nombre)}, ${quand}`,
  annulerLeRenommage: 'Annuler le renommage',
  seulLeDernierRenommage: 'Seul le dernier renommage est gardé.',
  nomsNeReviendrontPas: (nombre: number): string => (nombre === 1 ? '1 nom ne reviendra pas.' : `${nombre} noms ne reviendront pas.`),
  /** Le nombre de noms d'une carte de l'Historique : « 8 noms ». */
  nomsDuLot: noms,
  collectionsIntrouvables: 'Introuvables',
  pastilleNonAnalysee: 'Non analysée',
  cocherPourRetablir: 'Cochez cette collection dans Réglages pour rétablir ses noms.',
  legendeApresAnnulation: 'Après l’annulation',
  uneCollection: 'collection',
  changeDepuisDansFigma: 'Changé dans Figma depuis',
  supprimeDansFigma: 'Supprimé dans Figma',
  aucuneRegle: 'Aucune règle',
  autresReglesChangees: (nombre: number): string => (nombre === 1 ? '1 autre règle changée' : `${nombre} autres règles changées`),
  rienAAnnuler: 'Rien à annuler pour l’instant.',
  rienAAnnulerExplication: 'Après chaque renommage ou import, l’état d’avant apparaît ici.',
  nomsRetablis: (nombre: number): string => (nombre === 1 ? '1 nom rétabli' : `${nombre} noms rétablis`),
  renommagesReviennent: 'Les renommages reviennent dans l’onglet Corrections.',
  anciensNomsGardes: 'Les anciens noms sont gardés dans Configuration › Historique.',
  annulationDuRenommageRefusee: 'L’annulation a été refusée. Relancez l’analyse, puis annulez de nouveau.',
  annulationNonVerifiee: (nombre: number): string =>
    `${nombre === 1 ? '1 variable de couleur n’a pas pu être rétablie.' : `${nombre} variables de couleur n’ont pas pu être rétablies.`} `
    + 'UCM Architect n’a pas pu lire ce qu’UCM Palettes a noté dans ce fichier. Relancez l’analyse, puis annulez de nouveau.',
  annulationDuRenommagePartielle: (retablis: number, sautes: number): string =>
    `${noms(retablis)} rétablis, ${sautes} n’ont pas pu l’être : un autre nom occupe leur place ou ils ont changé depuis. Le plugin les garde ; annulez de nouveau après avoir corrigé.`,
  /**
   * Une annulation qui laisse des noms dans une collection décochée de « Collections analysées ». La collection se coche dans l'onglet
   * Réglages de la Configuration et l'annulation se refait dans l'onglet Historique ; depuis l'onglet Corrections (`depuis`),
   * le designer ouvre d'abord Configuration.
   */
  annulationDansUneCollectionExclue: (retablis: number, exclues: number, depuis: 'configuration' | 'renommages' = 'configuration'): string => {
    const un = exclues === 1;
    const debut = retablis === 0 ? 'Aucun nom n’a été rétabli.' : `${retablis === 1 ? '1 nom rétabli' : `${retablis} noms rétablis`}.`;
    const reste = retablis === 0 ? (un ? '1 nom' : `${exclues} noms`) : (un ? '1 autre nom' : `${exclues} autres noms`);
    const geste = depuis === 'configuration'
      ? 'cochez de nouveau la collection dans l’onglet Réglages, puis annulez de nouveau dans l’onglet Historique.'
      : 'ouvrez Configuration, cochez de nouveau la collection dans l’onglet Réglages, puis annulez de nouveau dans l’onglet Historique.';
    return `${debut} ${reste} ${un ? 'est' : 'sont'} dans une collection exclue de l’analyse : le plugin ${un ? 'le garde' : 'les garde'}. `
      + `Pour ${un ? 'le' : 'les'} rétablir, ${geste}`;
  },
  /** La suite de `annulationDansUneCollectionExclue` quand d'autres noms n'ont pas pu être rétablis pour une autre raison. */
  annulationAutresNomsNonRetablis: (nombre: number): string => (nombre === 1
    ? '1 autre nom n’a pas pu être rétabli : un nom occupe déjà sa place ou il a changé depuis. Le plugin le garde ; annulez de nouveau après avoir corrigé.'
    : `${nombre} autres noms n’ont pas pu être rétablis : un nom occupe déjà leur place ou ils ont changé depuis. Le plugin les garde ; annulez de nouveau après avoir corrigé.`),
  /** `reviennent` compte les noms que l'annulation remet, pas la taille du lot. */
  confirmerLAnnulation: (reviennent: number): string =>
    `Annuler le renommage ? ${reviennent === 1 ? '1 nom reprend son' : `${reviennent} noms reprennent leur`} ancien nom.`,
  remettreLesAnciensNoms: 'Remettre les anciens noms',
  garderLesNoms: 'Garder',
  dernierImport: 'Dernier import',
  derniereCreationDeVariables: 'Dernière création de variables',
  creationDeVariablesHistorique: (nombre: number, composant: string, quand: string): string => `${nombre} variables de ${composant}, ${quand}`,
  annulerLaCreation: 'Annuler la création',
  creationPublieeAide: 'Si la library est publiée, les layers liés à ces variables perdront leur liaison.',
  annulationStructureFaite: (nombre: number): string => `${nombre} variables supprimées.`,
  annulationStructureOccupee: 'Une opération est en cours. Réessayez après sa fin.',
  annulationStructureHorsUcm: 'Ce fichier ne déclare plus l’architecture UCM. Rien n’a été annulé.',
  annulationStructureJournalAbsent: 'Aucune structure ne peut être annulée : le journal est absent de ce fichier.',
  annulationStructureJournalIllisible: 'Aucune structure ne peut être annulée : le journal ne peut pas être lu.',
  annulationStructureObjetChange: (nom: string): string => `« ${nom} » a changé depuis sa création. La variable reste en place.`,
  annulationStructureUsageAjoute: (nom: string): string => `« ${nom} » est utilisée dans ce fichier. La variable reste en place.`,
  annulationStructureUsageIllisible: (nom: string): string => `Les usages de « ${nom} » ne peuvent pas être vérifiés. La variable reste en place.`,
  annulationStructureErreur: (nom: string): string => `Figma n’a pas pu retirer « ${nom} ». La variable reste en place.`,
  annulationStructureUsagesExternes: 'Les usages dans les autres fichiers ne peuvent pas être vérifiés.',
  importeALHeure: (regles: number, quand: string): string => `${regles === 1 ? '1 règle changée' : `${regles} règles changées`}, ${quand}`,
  annulerLImport: 'Annuler l’import',

  /** Ce qui s'est passé et ce que le designer fait ensuite, pour chaque erreur du sandbox. */
  erreur: {
    'analyse-en-cours': 'Une analyse est en cours. Attendez la fin de la lecture, puis recommencez.',
    'fichier-modifie': 'Le fichier a changé depuis l’analyse. Relancez l’analyse.',
    'generation-perimee': 'Les noms affichés ne correspondent plus au fichier. Relancez l’analyse, puis recommencez.',
    'regles-modifiees': 'Les règles ont changé depuis le calcul de cette liste. Relisez la liste, puis recommencez.',
    'regles-futures': 'Une version plus récente d’UCM Architect a rangé des règles dans ce fichier. Mettez le plugin à jour pour renommer.',
    'import-illisible': 'Ce fichier de règles est illisible. Choisissez un fichier exporté depuis la Configuration d’UCM Architect.',
    'mot-refuse': 'Ce terme ne peut pas s’écrire ainsi : retirez les espaces et les caractères / | . { } $.',
    'import-partiel': 'L’import s’est arrêté en route : les règles du fichier sont revenues à leur état d’avant.',
    echec: 'L’opération a échoué. Relancez l’analyse ; si le message revient, rouvrez le plugin.',
  } satisfies Record<CodeDErreur, string>,

  /** L'import est refusé en bloc : une phrase de tête, puis une ligne par conflit. */
  importRefuse: 'Aucune règle n’a été importée. Corrigez ces conflits dans le fichier, puis importez-le de nouveau.',
  conflitDImport: (conflit: ConflitVue): string => {
    switch (conflit.type) {
      case 'contredit-ucm':
        return `UCM remplace « ${conflit.remplace} » par « ${conflit.termeUcm} », le fichier importé par « ${conflit.terme} ».`;
      case 'deja-remplace':
        return `« ${conflit.remplace} » a déjà un autre remplaçant que « ${conflit.par} ».`;
      case 'cycle':
        return `Ces termes se remplacent en boucle : ${conflit.termes.join(', ')}.`;
    }
  },

  intertitreConventions: 'Conventions d’écriture',
  intertitreVocabulaire: 'Vocabulaire',
  intertitreCollections: 'Collections',

  legendeAujourdhui: 'Aujourd’hui',
  legendeApres: 'Après l’application',

  nombreDeNoms,
  /** La phrase qui précède le spécimen d'une écriture dans la tête d'une carte. */
  ecrireEn: {
    groupes: 'Écrire les groupes en',
    variables: 'Écrire les variables en',
    collections: 'Écrire les collections en',
    proprietes: 'Écrire les propriétés en',
    valeurs: 'Écrire les valeurs en',
  },
  /** « 313 variables · 280 changent aussi d’écriture » : le détail d'une carte de terme. */
  detailDeTerme: (variables: number, collections: number, aussiDEcriture: number): string => {
    const nombre = nombreDeNoms(variables, collections);
    if (aussiDEcriture === 0) return nombre;
    return `${nombre} · ${aussiDEcriture} ${aussiDEcriture === 1 ? 'change' : 'changent'} aussi d’écriture`;
  },
  /** Le détail d'une carte de terme dont la forme dépend de sa place. */
  detailDeTaille: (categorie: 'variables' | 'groupes', variables: number): string =>
    `${categorie === 'variables' ? 'Dans les variables' : 'Dans les groupes'} · ${nombreDeNoms(variables, 0)}`,
  collectionUcm: 'Collection UCM',
  nomsCochesDansLeGroupe: (coches: number, total: number): string => `${coches} sur ${total} cochés`,
  nomsNonCoches: (total: number): string => (total === 1 ? 'non coché' : 'non cochés'),
  renommerUnGroupe: (avant: string, apres: string): string => `Renommer ${avant} en ${apres}`,

  pastilleUcm: 'UCM',
  pastillePersonnalise: 'Personnalisé',
  pastilleNouveau: 'Nouveau',
  pastilleBloque: 'Bloqué',
  pastilleProtege: 'Protégé',
  pastilleNonVerifie: 'Non vérifié',

  afficherLesAutresNoms: (nombre: number): string => (nombre === 1 ? 'Afficher l’autre nom' : `Afficher les ${nombre} autres noms`),
  chargementDesNoms: 'Chargement des noms…',

  nonRenommes: (bloques: number, proteges: number, nonVerifiees = 0): string => {
    const parties = [
      ...(bloques > 0 ? [bloques === 1 ? '1 bloqué' : `${bloques} bloqués`] : []),
      ...(proteges > 0 ? [proteges === 1 ? '1 protégé' : `${proteges} protégés`] : []),
      ...(nonVerifiees > 0 ? [nonVerifiees === 1 ? '1 non vérifié' : `${nonVerifiees} non vérifiés`] : []),
    ];
    return `Non renommés : ${parties.join(', ')}`;
  },
  /** Le nom bloqué et la collection qui contient déjà le nom visé. */
  nomBloque: (collection: string, apres: string): string => `\`${collection}\` contient déjà \`${apres}\` : supprimez ou renommez l’une des deux dans Figma.`,
  /** Deux variables dont le chemin dans `tokens.json` est le même ; `apres` et `autre` portent leur collection. */
  memeToken: (apres: string, autre: string): string => `\`${apres}\` et \`${autre}\` donneraient le même token dans tokens.json : renommez l’une des deux dans Figma.`,
  /** `apres` est un token et le groupe de `autre`. */
  tokenEtGroupe: (apres: string, autre: string): string => `\`${apres}\` serait à la fois un token et le groupe de \`${autre}\` dans tokens.json : renommez l’une des deux dans Figma.`,
  /** Deux collections à modes dont les noms donnent la même clé d'axe ; `apres` et `autre` sont leurs noms. */
  memeAxe: (apres: string, autre: string): string => `\`${apres}\` et \`${autre}\` donneraient le même nom dans l’export des tokens : les modes de ces deux collections ne pourraient plus être générés. Gardez un nom différent pour l’une des deux.`,
  /** `autre` aurait le nom que l'export réserve aux extensions de `apres`. */
  axeEtExtensions: (apres: string, autre: string): string => `\`${autre}\` aurait le nom que l’export des tokens réserve aux collections étendues de \`${apres}\` : les extensions de \`${apres}\` ne pourraient plus être générées. Gardez un nom différent pour l’une des deux.`,
  nomsProteges: (nombre: number): string => (nombre === 1 ? '1 nom écrit par UCM Palettes' : `${nombre} noms écrits par UCM Palettes`),
  /** La ligne du nombre d'une cause de protection. */
  variablesNonVerifiees: (nombre: number): string => (nombre === 1 ? '1 variable de couleur non vérifiée' : `${nombre} variables de couleur non vérifiées`),
  /** Ce que chaque cause dit au designer, et le geste qui suit. */
  explicationDeProtection: {
    'marque-absente': 'UCM Palettes écrit ces variables, et leur groupe garde son nom. Ouvrez UCM Palettes une fois dans ce fichier pour qu’il suive les règles, puis revenez ici.',
    'marque-illisible': 'Ce qu’UCM Palettes a noté dans ce fichier est illisible. Signalez ce fichier au mainteneur des plugins UCM.',
    'marque-future': 'Ce fichier a été ouvert avec une version d’UCM Palettes plus récente que celle qu’UCM Architect connaît. Mettez à jour UCM Architect pour renommer ces variables.',
    'sans-regles': 'Les variables d’UCM Palettes gardent leur nom tant que l’écriture des noms n’est pas enregistrée. Choisissez l’écriture, puis appuyez sur Continuer.',
    'lecture-refusee': 'UCM Architect n’a pas pu lire ce qu’UCM Palettes a noté dans ce fichier. Relancez l’analyse pour renommer ces variables.',
  } satisfies Record<CauseDeProtection, string>,

  aucunNomCoche: 'Aucun nom coché',
  filtre: 'Filtre',
  filtreCollection: 'collection',
  enleverLeFiltre: 'Enlever le filtre',
  /** Le pied sous un filtre : « Appliquer renomme 24 variables de Interface. » ; seuls les noms affichés s'écrivent. */
  appliquerSousFiltre: (variables: number, collections: number, collection: string): { readonly debut: string; readonly nombre: string; readonly fin: string } => ({ debut: 'Appliquer renomme ', nombre: nombreDeNoms(variables, collections), fin: ` de ${collection}.` }),
  /** Le compte du pied, en deux morceaux : le nombre s'écrit en gras. */
  nomsCoches: (nombre: number): { readonly nombre: string; readonly suite: string } => ({ nombre: noms(nombre), suite: nombre === 1 ? ' coché' : ' cochés' }),
  appliquer: 'Appliquer',

  titreDeLaConfirmation: (nombre: number): string => `Renommer ${noms(nombre)} ?`,
  /** « 159 variables et 1 collection » : le morceau en gras de la première phrase. */
  nomsQuiChangent: (variables: number, collections: number): { readonly noms: string; readonly suite: string } => ({
    noms: nombreDeNoms(variables, collections),
    suite: variables + collections === 1 ? ' change de nom.' : ' changent de nom.',
  }),
  liaisonsConservees: 'Les liaisons et les alias suivent : composants et styles restent branchés.',
  fichiersUtilisateurs: 'Les fichiers qui utilisent la bibliothèque verront les nouveaux noms après sa publication.',
  prochainExport: 'Au prochain export, les noms des tokens changeront : prévenez le développeur.',
  renommer: 'Renommer',

  nomsRenommes: (nombre: number): string => (nombre === 1 ? '1 nom renommé' : `${nombre} noms renommés`),
  nomsSautes: (nombre: number): string => (nombre === 1 ? '1 nom n’a pas été renommé.' : `${nombre} noms n’ont pas été renommés.`),
  annuler: 'Annuler',
  rienNAEteRenomme: 'Rien n’a été renommé.',
  /** Un lot partiel : les variables dont la protection ne se lit pas. */
  nonVerifieesNonRenommees: (nombre: number): string =>
    `${nombre === 1 ? '1 variable de couleur n’a pas été renommée.' : `${nombre} variables de couleur n’ont pas été renommées.`} UCM Architect n’a pas pu lire ce qu’UCM Palettes a noté dans ce fichier.`,
  /** Un lot refusé parce que toutes les variables sautées sont non vérifiées. */
  rienNAEteRenommeNonVerifie: 'Rien n’a été renommé. UCM Architect n’a pas pu lire ce qu’UCM Palettes a noté dans ce fichier. Relancez l’analyse.',
  /** Une règle de nommage vient d'une version plus récente du plugin : le compte « À appliquer » cède la place à ce texte, et le bouton reste inactif. */
  reglesFutures: 'Une version plus récente d’UCM Architect a rangé des règles dans ce fichier. Mettez le plugin à jour pour renommer.',
  journalImpossible: 'Rien n’a été renommé : le fichier ne peut pas garder de quoi remettre ces noms. Cochez moins de noms, puis appliquez de nouveau.',
  bilanIllisible: 'Les noms sont changés, mais le plugin n’a pas pu relire le fichier. Relancez l’analyse.',
  nomsNonRetablis: (nombre: number): string =>
    nombre === 1 ? '1 nom n’a pas retrouvé son ancien nom : il a changé depuis le renommage.' : `${nombre} noms n’ont pas retrouvé leur ancien nom : ils ont changé depuis le renommage.`,
  annulationRefusee: 'Le dernier renommage n’a pas pu être annulé.',
  /** Une règle de nommage vient d'une version plus récente du plugin : l'annulation est refusée avant toute écriture, comme l'application. */
  annulationRefuseeReglesFutures: 'Une version plus récente d’UCM Architect a rangé des règles dans ce fichier. Mettez le plugin à jour pour annuler ce renommage.',

  // U4a : onglet Règles, liste des termes.
  modifier: 'Modifier',
  modifierLEcriture: 'Modifier l’écriture',
  chercherUnTerme: 'Chercher un terme',
  listeDesTermes: 'Termes du fichier',
  exporterLeDetailDuVocabulaire: 'Exporter le détail du vocabulaire',
  nomDuFichierDuVocabulaire: 'vocabulaire-ucm-nomenclature.json',
  aucunTerme: 'Aucun terme ne correspond.',
  termeRemplace: (remplaces: readonly string[]): string => `remplace ${remplaces.join(', ')}`,
  termeATrancher: (avec: string | null): string => (avec ? `à trancher avec ${avec}` : 'à trancher'),
  termeNonApplique: 'règle UCM non appliquée dans ce fichier',
  phraseDesConventions: 'Comment s’écrivent les groupes, les variables et les collections.',
  phraseDuVocabulaire: 'Le terme de référence de chaque notion, et les variantes qu’il remplace.',
  motRemplace: 'remplace',
  motOu: 'ou',
  estRemplacePar: 'est remplacé par',
  nomsDuTerme: noms,

  // Tour 2, T-U : la liste en sections par type, le menu Filtrer et le tri.
  typeDeTerme: { 'a-trancher': 'À trancher', remplace: 'Remplace', conforme: 'Conforme', 'sans-regle': 'Sans règle', composant: 'Composants', palette: 'Palettes' },
  typeDeTermeAuSingulier: { 'a-trancher': 'À trancher', remplace: 'Remplace', conforme: 'Conforme', 'sans-regle': 'Sans règle', composant: 'Composant', palette: 'Palette' },
  /** La ligne sous le titre d'une section de la liste des termes. */
  ligneDeSection: {
    'a-trancher': 'Termes qui attendent votre réponse dans l’onglet Questions.',
    remplace: 'Termes qui remplacent des variantes dans le fichier.',
    conforme: 'Termes déjà écrits selon leur règle.',
    'sans-regle': 'Termes qu’aucune règle ne couvre encore.',
    composant: 'Noms des composants du fichier.',
    palette: 'Noms des palettes du fichier.',
  } satisfies Record<TypeDeTerme, string>,
  /** Les intertitres d'une section qui a des groupes et des variables. */
  intertitreDePlace: { groupes: 'Groupes', variables: 'Variables' },
  /** La suite d'une place : le nombre de termes que la section ne montre pas encore. */
  afficherLesAutresDeLaPlace: {
    groupes: (n: number): string => (n === 1 ? 'Afficher l’autre groupe' : `Afficher les ${n} autres groupes`),
    variables: (n: number): string => (n === 1 ? 'Afficher l’autre variable' : `Afficher les ${n} autres variables`),
  },
  /** La place d'une ligne dans son nom accessible. */
  placeAuSingulier: { groupes: 'groupe', variables: 'variable' },
  titreDesPlaces: 'Place',
  placeDeFiltre: { groupes: 'Groupes', variables: 'Variables' },
  /** L'onglet Questions quand aucun terme n'en pose. */
  questionsVides: {
    titre: 'Aucune question pour l’instant',
    ligne: 'Aucun terme du fichier n’en rappelle un autre. Une question apparaîtra si une variante arrive, comme `bg` à côté de `background`.',
    ligneAvecPlusTard: (n: number): string =>
      n === 1 ? 'Vous avez gardé 1 question pour plus tard. Elle est ci-dessous.' : `Vous avez gardé ${n} questions pour plus tard. Elles sont ci-dessous.`,
    bouton: 'Voir les renommages',
  },
  filtrer: 'Filtrer',
  filtrerAvecNombre: (n: number): string => `Filtrer · ${n}`,
  titreDesTypes: 'Types',
  titreDesOrigines: 'Origine de la règle',
  origineDeFiltre: { ucm: 'UCM', personnalise: 'Personnalisé' },
  /** Le nom accessible du × d'un jeton de filtre. */
  retirerLeFiltre: (libelle: string): string => `Retirer le filtre ${libelle}`,
  trierAlpha: 'Trier : A → Z',
  trierNombre: 'Trier : nombre de variables',
  trier: 'Trier',
  afficherLesAutres: (n: number): string => (n === 1 ? 'Afficher l’autre' : `Afficher les ${n} autres`),
  replierLaSection: (titre: string): string => `Replier ${titre}`,
  deplierLaSection: (titre: string): string => `Déplier ${titre}`,

  // U3 : onglet À trancher.
  /** Le titre d'une proposition : `{avant} {a} {entre} {b} ?`, avec a et b cités en couleur. */
  titreDePaire: { avant: 'Remplacer', entre: 'par' },
  titreDeFaute: { avant: 'Corriger', entre: 'en' },
  titreDeMotsColles: { avant: 'Séparer', entre: 'en' },
  questionDeCollection: (nom: string): string => `À quelle collection UCM correspond ${nom} ?`,
  indiceDePaire: {
    terminaison: 'Terminaison',
    pluriel: 'Singulier et pluriel',
    abreviation: 'Abréviation',
    synonymes: 'Synonymes',
    'branches-paralleles': 'Branches parallèles',
  } satisfies Record<IndiceDePaire, string>,
  indiceDeFaute: INDICE_DE_FAUTE,
  indiceDeMotsColles: 'Mots collés',
  lesDeuxVisent: (cible: string): string => `Les deux visent ${cible}.`,
  /** « 1 variable ; contrasthovered est employé dans 14 variables » : le nombre du terme, puis celui de la référence. */
  detailDuTerme: (nombre: number, reference: { readonly mot: string; readonly nombre: number } | null): string => {
    const lesVariables = (valeur: number): string => nombreDeNoms(valeur, 0);
    return reference ? `${lesVariables(nombre)} ; ${reference.mot} est employé dans ${lesVariables(reference.nombre)}` : lesVariables(nombre);
  },

  /** « Une lettre d'écart. background est employé dans 40 variables. » : l'indice, puis la référence ; le nombre du terme est dans le lien qui suit. */
  detailDeFaute: (reference: { readonly mot: string; readonly nombre: number }): string => `${INDICE_DE_FAUTE}. ${reference.mot} est employé dans ${nombreDeNoms(reference.nombre, 0)}.`,
  voirLesVariables: (nombre: number): string => (nombre > 1 ? `Voir les ${nombre} variables` : 'Voir la variable'),
  filtrerLeTableau: 'Filtrer le tableau des tokens',

  /** « Abréviation · 12 variables à renommer · background déjà dans 40 » : l'indice, le nombre du terme écarté, puis celui du terme proposé. */
  detailDePaire: (indice: string, aRenommer: number, propose: string, dejaDans: number): string =>
    `${indice} · ${nombreDeNoms(aRenommer, 0)} à renommer · ${propose} déjà dans ${dejaDans}`,
  /** L'indice d'une faute ou de mots collés, devant le détail du terme. */
  detailAvecIndice: (indice: string, detail: string): string => `${indice} · ${detail}`,
  remplacer: 'Remplacer',
  garderLeTerme: (terme: string): string => `Garder ${terme}`,
  termesDifferents: 'Termes différents',
  autreTerme: 'Autre terme…',
  plusTard: 'Plus tard',
  /** Les règles reçues du mode Composant, en tête de Questions. */
  reglesRecues: {
    intertitre: 'Règles reçues du mode Composant',
    intertitreDuFichier: 'Noms du fichier',
    titre: 'Ajouter la règle',
    fleche: '→',
    detail: (composant: string): string => `Préparée depuis ${composant}, dans le fichier des composants.`,
    ajouter: 'Ajouter la règle',
    ecarter: 'Écarter',
  },
  corriger: 'Corriger',
  separer: 'Séparer',
  cEstVoulu: 'C’est voulu',
  cEstUnSeulMot: 'C’est un seul mot',
  garderCeNom: 'Garder ce nom',
  choisirUneCollection: 'Choisir une collection',

  remplacerPar: (premier: string, second: string): string => `Remplacer ${premier} et ${second} par`,
  termeAEmployer: 'Terme à employer',
  enregistrer: 'Enregistrer',
  rejoindrontAAppliquer: (nombre: number): string => (nombre === 1 ? '1 variable rejoindra les renommages' : `${nombre} variables rejoindront les renommages`),

  /** Le détail de la ligne qui remplace une carte répondue. */
  ajouteesAAppliquer: (variables: number, collections: number): string =>
    `${nombreDeNoms(variables, collections)} ${variables + collections === 1 ? 'ajoutée' : 'ajoutées'} aux renommages`,
  gardesSepares: 'Gardés séparés',
  remisAPlusTard: 'Remis à plus tard',
  ecritureGardee: 'Écriture gardée',
  nomGarde: 'Nom gardé',
  annulerLaReponse: (avant: string, apres: string | null): string => `Annuler : ${apres === null ? avant : `${avant} → ${apres}`}`,

  conflitContreditUcm: 'Cette règle contredit UCM',
  ucmRemplace: (remplace: string, termeUcm: string): string => `UCM remplace \`${remplace}\` par \`${termeUcm}\`.`,
  estUnTermeUcm: (terme: string): string => `\`${terme}\` est un terme UCM.`,
  nePasAppliquer: (terme: string): string => `Ne pas appliquer ${terme} dans ce fichier`,
  conflitDejaRemplace: 'Ce terme a déjà un remplaçant',
  dejaRemplaceExplication: (remplace: string, par: string): string =>
    `\`${remplace}\` est déjà remplacé par un autre terme que \`${par}\`. Retirez l’autre règle dans Règles, puis recommencez.`,
  conflitDeBoucle: 'Cette règle crée une boucle',
  boucleExplication: (termes: readonly string[]): string =>
    `Ces termes se remplaceraient les uns les autres : ${termes.join(', ')}. Retirez l’une de ces règles dans Règles, puis recommencez.`,

  sectionPlusTard: (nombre: number): string => `Plus tard · ${nombre}`,
  reprendre: 'Reprendre',
  reprendreLaQuestion: (avant: string, apres: string | null): string => `Reprendre : ${apres === null ? avant : `${avant} → ${apres}`}`,
  autresPistes: (nombre: number): string => `Autres pistes · ${nombre}`,

  // U4b : feuilles de l'écriture et des termes.
  aucunNomNeChange: 'Aucun nom ne change avec ce choix.',
  pastilleUcmDeCategorie: (categorie: string): string => `UCM · ${categorie}`,
  /** Le nom que le designer donne à la famille d'un terme UCM ; une famille inconnue garde son identifiant. */
  categorieDuTermeUcm: (identifiant: string): string => {
    const connues: Readonly<Record<string, string>> = {
      crans: 'cran',
      modes: 'mode',
      profils: 'profil',
      intensites: 'intensité',
      etats: 'état',
      'axes-etat': 'axe d’état',
      tailles: 'taille',
      statuts: 'statut',
      roles: 'rôle',
    };
    return connues[identifiant] ?? identifiant;
  },
  pastilleSansRegle: 'Sans règle',
  natureDuTerme: { composant: 'Composant', palette: 'Palette' },
  phraseDeNature: {
    composant: 'Nom d’un composant du fichier. Aucune question ne porte sur un nom.',
    palette: 'Nom d’une palette du fichier. Aucune question ne porte sur un nom.',
  },
  traiterCommeUnTerme: 'Traiter comme un terme',
  phraseOrdinaire: 'Ce nom est traité comme un terme du vocabulaire.',
  traiterCommeUnNom: 'Traiter comme un nom',
  pastilleATrancherDuTerme: 'À trancher',
  lectureDuTerme: 'Lecture du terme…',
  definitionPersonnalisee: 'Défini dans ce fichier.',
  termeEcarte: 'Ce terme n’est pas appliqué dans ce fichier.',
  questionSurLeTerme: 'Une question à trancher porte sur ce terme.',

  regle: 'Règle',
  formesFixeesParUcm: 'Formes fixées par UCM',
  ajouterUnTerme: '+ Terme',
  /** Le nom accessible du × d'un terme remplacé. */
  retirerLeTerme: (terme: string): string => `Retirer ${terme}`,
  /** « 12 variables à renommer · 40 déjà écrites ainsi » : le morceau en gras est marqué `gras`. */
  chiffresDeLaRegle: (aRenommer: number, dejaEcrites: number): readonly { readonly texte: string; readonly gras: boolean }[] => [
    { texte: nombreDeNoms(aRenommer, 0), gras: true },
    { texte: ' à renommer · ', gras: false },
    { texte: String(dejaEcrites), gras: true },
    { texte: dejaEcrites === 1 ? ' déjà écrite ainsi' : ' déjà écrites ainsi', gras: false },
  ],
  titreARenommer: (nombre: number): string => `À renommer · ${nombre}`,
  voirDansCorrections: 'Voir dans Corrections',
  titreDejaEmploye: (nombre: number): string => `Déjà employé · ${nombre}`,
  retirer: 'Retirer',
  sectionGardeSepare: 'Gardé séparé de',
  retirerLaSeparation: (mot: string, autre: string): string => `Ne plus garder ${mot} séparé de ${autre}`,
  ecritureVoulue: 'Ce terme est gardé tel qu’il est écrit.',
  retirerLEcritureVoulue: (mot: string): string => `Ne plus garder ${mot} tel qu’il est écrit`,

  nePasLAppliquer: 'Ne pas appliquer ce terme dans ce fichier',
  appliquerDeNouveau: 'Appliquer de nouveau dans ce fichier',
  supprimerLaRegle: 'Supprimer la règle',
  proposerAUcm: 'Proposer à UCM',
  proposerAUcmCopie: 'Copié, à transmettre à UCM',
  copieRefusee: 'La copie a été refusée. Sélectionnez ce texte, copiez-le, puis transmettez-le à UCM.',

  remplacerParPoints: 'Remplacer par…',
  remplaceDAutresTermes: 'Remplace d’autres termes…',
  titreRemplacerPar: (mot: string): string => `Remplacer ${mot} par`,
  titreRemplaceDAutres: (mot: string): string => `Termes que ${mot} remplace`,
  termesRemplaces: 'Termes remplacés, séparés par une virgule',
  termesDUcm: 'Termes d’UCM',
  unSeulTerme: 'Saisissez un seul terme.',
} as const;
