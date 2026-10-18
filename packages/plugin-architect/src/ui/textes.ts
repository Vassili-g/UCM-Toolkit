/**
 * Tous les textes de l'écran. Un texte entre accents graves met ces mots en
 * code : c'est l'écriture d'un nom, jamais une phrase.
 */
import type { IndiceDePaire } from '@ucm-kit/core/referentiel';
import type { CodeDErreur, ConflitVue } from '../messages';

const noms = (nombre: number): string => (nombre === 1 ? '1 nom' : `${nombre} noms`);
const questions = (nombre: number): string => (nombre === 1 ? '1 question' : `${nombre} questions`);
/** La ligne de détail d'une carte : « 60 variables », « 159 variables et 1 collection ». */
function nombreDeNoms(variables: number, collections: number): string {
  const lesVariables = variables === 1 ? '1 variable' : `${variables} variables`;
  const lesCollections = collections === 1 ? '1 collection' : `${collections} collections`;
  if (collections === 0) return lesVariables;
  return variables === 0 ? lesCollections : `${lesVariables} et ${lesCollections}`;
}

export const TEXTES = {
  marque: 'UCM Architect',
  titreConfiguration: 'Configuration',
  boutonConfiguration: 'Configuration',
  ouvrirLaConfiguration: 'Ouvrir la configuration',
  retour: 'Retour',

  etiquetteDesOnglets: 'Sections d’UCM Architect',
  ongletAAppliquer: 'À appliquer',
  ongletATrancher: 'À trancher',
  ongletRegles: 'Règles',
  /** Le nom que les lecteurs d'écran donnent à l'onglet quand son compte s'affiche. */
  nomDeLOngletAAppliquer: (nombre: number): string => `À appliquer, ${noms(nombre)}`,
  nomDeLOngletATrancher: (nombre: number): string => `À trancher, ${questions(nombre)}`,

  analyseEnCours: 'Lecture des variables',
  avancementDeLAnalyse: 'Avancement de la lecture',
  variablesLues: (lues: number, total: number): string => `${lues} sur ${total}`,

  rienAFaire: 'Tous les noms suivent vos règles',
  relancerLAnalyse: 'Relancer l’analyse',

  sansVariableLocale: 'Aucune variable à harmoniser ici',
  sansVariableLocaleExplication: 'Les variables de ce fichier viennent d’une bibliothèque. Ouvrez le plugin dans le fichier des tokens.',

  fichierModifie: 'Le fichier a changé',

  // U1b : premier lancement, écriture des noms, Configuration.
  titreDuPremierLancement: 'Harmoniser les noms des variables',
  ligneDuPremierLancement: 'Leur écriture et les termes qu’elles emploient.',
  analyserLeFichier: 'Analyser le fichier',

  titreDeLEcriture: 'Écriture des noms',
  ligneDeLEcriture: 'Proposée d’après votre fichier ; modifiable ensuite dans Règles.',
  continuer: 'Continuer',

  ecritureDesGroupes: 'Groupes',
  ecritureDesNoms: 'Noms',
  ecritureDesCollections: 'Collections',
  choisirLEcritureDesGroupes: 'Écriture des groupes',
  choisirLEcritureDesNoms: 'Écriture des noms',
  suiventSurTotal: (suivent: number, total: number): string => `· ${suivent} sur ${total}`,
  collectionsReconnues: (reconnues: number, total: number): string => `· ${reconnues} sur ${total} reconnues`,
  collectionsSuiventUcm: 'Elles portent les noms du référentiel UCM.',
  nomsUcm: 'noms UCM',

  collectionsAnalysees: 'Collections analysées',
  variablesDeLaCollection: (nombre: number): string => (nombre === 1 ? '1 variable' : `${nombre} variables`),
  palettesProtegees: 'palettes protégées',
  sansCollection: 'Les collections du fichier apparaissent après la première analyse.',
  reglesDeCeFichier: 'Règles de ce fichier',
  exporter: 'Exporter',
  importer: 'Importer',
  nomDuFichierDeRegles: 'regles-ucm-architect.json',
  choisirLeFichierDeRegles: 'Fichier de règles à importer',
  dernierRenommage: 'Dernier renommage',
  renommagesALHeure: (nombre: number, heure: string): string => `${noms(nombre)}, à ${heure}`,
  annulerLeRenommage: 'Annuler',
  annulationDuRenommageRefusee: 'L’annulation a été refusée. Relancez l’analyse, puis annulez de nouveau.',
  annulationDuRenommagePartielle: (retablis: number, sautes: number): string =>
    `${noms(retablis)} rétablis, ${sautes} n’ont pas pu l’être. Relancez l’analyse pour voir ce qui reste.`,

  /** Ce qui s'est passé et ce que le designer fait ensuite, pour chaque erreur du sandbox. */
  erreur: {
    'analyse-en-cours': 'Une analyse est en cours. Attendez la fin de la lecture, puis recommencez.',
    'fichier-modifie': 'Le fichier a changé depuis l’analyse. Relancez l’analyse.',
    'generation-perimee': 'Les noms affichés ne correspondent plus au fichier. Relancez l’analyse, puis recommencez.',
    'regles-modifiees': 'Les règles ont changé depuis le calcul de cette liste. Relisez la liste, puis recommencez.',
    'import-illisible': 'Ce fichier de règles est illisible. Choisissez un fichier exporté depuis la Configuration d’UCM Architect.',
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

  intertitreTermes: 'Termes',
  intertitreEcriture: 'Écriture',
  intertitreCollections: 'Collections',

  nombreDeNoms,
  /** Ce que la catégorie d'une règle d'écriture nomme dans la carte. */
  categorieDEcriture: {
    collections: 'Collections',
    variables: 'Noms',
    groupes: 'Groupes',
    proprietes: 'Propriétés',
    valeurs: 'Valeurs',
  },
  collectionUcm: 'Collection UCM',
  nomsCochesDansLeGroupe: (coches: number, total: number): string => `${coches} sur ${total} cochés`,
  nomsNonCoches: (total: number): string => (total === 1 ? 'non coché' : 'non cochés'),
  renommerUnGroupe: (avant: string, apres: string): string => `Renommer ${avant} en ${apres}`,

  pastilleUcm: 'UCM',
  pastillePersonnalise: 'Personnalisé',
  pastilleNouveau: 'Nouveau',
  pastilleBloque: 'Bloqué',
  pastilleProtege: 'Protégé',

  autresNoms: (nombre: number): string => (nombre === 1 ? '1 autre nom' : `${nombre} autres noms`),

  nonRenommes: (bloques: number, proteges: number): string => {
    const parties = [
      ...(bloques > 0 ? [bloques === 1 ? '1 bloqué' : `${bloques} bloqués`] : []),
      ...(proteges > 0 ? [proteges === 1 ? '1 protégé' : `${proteges} protégés`] : []),
    ];
    return `Non renommés : ${parties.join(', ')}`;
  },
  /** Le nom bloqué et la collection qui contient déjà le nom visé. */
  nomBloque: (collection: string, apres: string): string => `\`${collection}\` contient déjà \`${apres}\` : supprimez ou renommez l’une des deux dans Figma.`,
  nomsProteges: (nombre: number): string => (nombre === 1 ? '1 nom écrit par UCM Palettes' : `${nombre} noms écrits par UCM Palettes`),
  nomsProtegesExplication: 'Renommez une palette dans Palettes, qui la retrouve par son nom.',

  aucunNomCoche: 'Aucun nom coché',
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
  nomsNonRetablis: (nombre: number): string =>
    nombre === 1 ? '1 nom n’a pas retrouvé son ancien nom : il a changé depuis le renommage.' : `${nombre} noms n’ont pas retrouvé leur ancien nom : ils ont changé depuis le renommage.`,
  annulationRefusee: 'Le dernier renommage n’a pas pu être annulé.',

  // U4a : onglet Règles, liste des termes.
  modifier: 'Modifier',
  modifierLEcriture: 'Modifier l’écriture des noms',
  chercherUnTerme: 'Chercher un terme',
  filtresDesTermes: 'Filtrer les termes',
  filtreTous: (nombre: number | null): string => (nombre === null ? 'Tous' : `Tous ${nombre}`),
  filtreAvecRegle: (nombre: number | null): string => (nombre === null ? 'Avec règle' : `Avec règle ${nombre}`),
  filtreSansRegle: (nombre: number | null): string => (nombre === null ? 'Sans règle' : `Sans règle ${nombre}`),
  listeDesTermes: 'Termes du fichier',
  afficherPlus: 'Afficher plus',
  aucunTerme: 'Aucun terme ne correspond.',
  termeRemplace: (remplaces: readonly string[]): string => `remplace ${remplaces.join(', ')}`,
  termeATrancher: (avec: string | null): string => (avec ? `à trancher avec ${avec}` : 'à trancher'),
  termeNonApplique: 'non appliqué dans ce fichier',
  nomsDuTerme: noms,

  // U3 : onglet À trancher.
  questionDePaire: 'Ces termes désignent-ils la même chose ?',
  questionDEchelle: 'Quelle écriture garder pour les tailles ?',
  questionDeFaute: 'Ce terme est-il mal écrit ?',
  questionDeMotsColles: 'Ce terme réunit-il plusieurs mots ?',
  questionDeCollection: (nom: string): string => `À quelle collection UCM correspond ${nom} ?`,
  indiceDePaire: {
    terminaison: 'Terminaison',
    pluriel: 'Singulier et pluriel',
    abreviation: 'Abréviation',
    synonymes: 'Synonymes',
    'meme-place': 'Même place',
  } satisfies Record<IndiceDePaire, string>,
  indiceDEchelle: 'Deux écritures',
  indiceDeFaute: 'Une lettre d’écart',
  indiceDeMotsColles: 'Mots collés',
  lesDeuxVisent: (cible: string): string => `Les deux visent ${cible}.`,
  /** « 1 variable ; contrasthovered est employé dans 14 variables » : le nombre du terme, puis celui de la référence. */
  detailDuTerme: (nombre: number, reference: { readonly mot: string; readonly nombre: number } | null): string => {
    const lesVariables = (valeur: number): string => nombreDeNoms(valeur, 0);
    return reference ? `${lesVariables(nombre)} ; ${reference.mot} est employé dans ${lesVariables(reference.nombre)}` : lesVariables(nombre);
  },

  garderLeTerme: (terme: string): string => `Garder ${terme}`,
  garderCelleCi: 'Garder celle-ci',
  termesDifferents: 'Termes différents',
  autreTerme: 'Autre terme…',
  plusTard: 'Plus tard',
  corriger: 'Corriger',
  separer: 'Séparer',
  cEstVoulu: 'C’est voulu',
  cEstUnSeulMot: 'C’est un seul mot',
  garderCeNom: 'Garder ce nom',
  choisirUneCollection: 'Choisir une collection',

  remplacerPar: (premier: string, second: string): string => `Remplacer ${premier} et ${second} par`,
  termeAEmployer: 'Terme à employer',
  enregistrer: 'Enregistrer',
  rejoindrontAAppliquer: (nombre: number): string => (nombre === 1 ? '1 variable rejoindra À appliquer' : `${nombre} variables rejoindront À appliquer`),

  /** Le détail de la ligne qui remplace une carte répondue. */
  ajouteesAAppliquer: (variables: number, collections: number): string =>
    `${nombreDeNoms(variables, collections)} ${variables + collections === 1 ? 'ajoutée' : 'ajoutées'} à À appliquer`,
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
} as const;
