/**
 * L'acquisition des variables du mode Tokens : ce que `lire-releve` a lu, et que les deux lectures du même Actualiser reprennent
 * au lieu d'appeler Figma de nouveau. Elle ne vit que le temps de cet Actualiser.
 *
 * Figma n'émet aucun événement quand le designer change une variable, ni sur un Ctrl+Z : une acquisition gardée entre deux demandes
 * serait fausse sans que rien le montre. Une demande ne la reprend donc que si elle prouve qu'elle suit cet Actualiser.
 * - `rafraichir` de Nomenclature la prouve par le recouvrement : la demande arrive pendant que `lire-releve` lit, et reprend les
 *   objets locaux qu'il vient de lire (`attendreLesLocalesEnCours`). Une demande qui arrive après la fin de `lire-releve` lit Figma.
 * - `lire-structure` la prouve par l'ordre : l'interface l'envoie en réponse au message `releve` de la révision `revision`. Il
 *   reprend le catalogue si aucune écriture n'est passée, si aucune autre demande de structure (Ignorer, Appliquer) ne l'a précédé,
 *   si aucun autre Actualiser n'a commencé et si moins de `DELAI_DE_REPRISE` s'est écoulé depuis la fin du relevé. Il la prend
 *   une seule fois. La demande ne porte pas la révision : cet ordre en tient lieu.
 * Toute autre demande (Analyser de Nomenclature lancé plus tard, Ignorer, Appliquer, renommage, annulation) lit Figma.
 *
 * L'acquisition garde des objets convertis (`VariablesLues`), jamais les objets de Figma. Les objets locaux ne passent d'une
 * lecture à l'autre que le temps de la lecture en cours, et le lecteur qui les reçoit les relit comme s'il les avait demandés.
 *
 * Toute écriture de variable ou de collection la périme (`pendantUneEcriture`, appelée par chaque écriture de `ecriture/`), au
 * début puis à la fin : une lecture qui a commencé pendant l'écriture n'est pas retenue. Une lecture annulée ne remplace pas
 * l'acquisition précédente ; une lecture qui échoue, ou dont une cible a été refusée, n'en laisse aucune.
 */
import type { LocalesLues, VariablesLues } from '../lecture';
import type { CollectionRelevee, ValeurSource, VariableRelevee } from '../modele';

/** Ce qu'un relevé réussi laisse : les variables lues avant `separerLesModes`, et les locales dans l'ordre de Figma. */
export interface Acquisition {
  readonly revision: number;
  readonly luA: number;
  readonly lues: VariablesLues;
  readonly idsLocaux: readonly string[];
}

/** La lecture du relevé en cours, vue par celui qui la mène. */
export interface LectureEnCours {
  /** Les objets locaux viennent d'être lus : une demande de Nomenclature qui arrive pendant la lecture les reprend. */
  offrirLesLocales(locales: LocalesLues): void;
  /** Le relevé est lu, sans refus : l'acquisition remplace la précédente. */
  conclure(acquisition: Acquisition): void;
  /** La lecture est annulée : l'acquisition précédente reste. */
  annuler(): void;
  /** La lecture a échoué : plus aucune acquisition ne reste. */
  echouer(): void;
}

interface EnVol {
  readonly numero: number;
  readonly generation: number;
  readonly locales: Promise<LocalesLues | null>;
  resoudre(locales: LocalesLues | null): void;
}

/** Le temps, en millisecondes, pendant lequel `lire-structure` peut reprendre l'acquisition qui suit le relevé. */
export const DELAI_DE_REPRISE = 5000;

let generation = 0;
let compteur = 0;
let dernierConclu = 0;
let courante: Acquisition | null = null;
/** Vrai tant que le prochain `lire-structure` peut encore reprendre `courante`. */
let repriseOuverte = false;
let concluA = 0;
let enVol: EnVol | null = null;

/** Périme l'acquisition et celles des lectures en cours : une écriture vient de changer, ou va changer, une variable. */
export function perimerLAcquisition(): void {
  generation += 1;
  courante = null;
  repriseOuverte = false;
}

/** Oublie tout ; les tests l'appellent entre deux cas. */
export function oublierLAcquisition(): void {
  generation += 1;
  courante = null;
  repriseOuverte = false;
  enVol?.resoudre(null);
  enVol = null;
  dernierConclu = compteur;
}

/** Exécute une écriture de variable ou de collection en périmant l'acquisition avant et après, même si elle lève. */
export function pendantUneEcriture<T>(ecriture: () => T): T {
  perimerLAcquisition();
  let rendu: T;
  try {
    rendu = ecriture();
  } catch (erreur) {
    perimerLAcquisition();
    throw erreur;
  }
  if (rendu instanceof Promise) return rendu.finally(perimerLAcquisition) as T;
  perimerLAcquisition();
  return rendu;
}

/** Les refus sont les seules issues qu'une relecture pourrait changer : une acquisition qui en porte un n'est pas retenue. */
const estComplete = (lues: VariablesLues): boolean => [...lues.manquees.values()].every((manquee) => manquee.issue !== 'refusee');

/** Ouvre la lecture du relevé : à appeler avant la première lecture de Figma, puis `conclure`, `annuler` ou `echouer`. */
export function commencerUneAcquisition(maintenant: () => number = Date.now): LectureEnCours {
  compteur += 1;
  const numero = compteur;
  const sienne = generation;
  repriseOuverte = false;
  let resoudre: (locales: LocalesLues | null) => void = () => {};
  const locales = new Promise<LocalesLues | null>((fin) => { resoudre = fin; });
  const lecture: EnVol = { numero, generation: sienne, locales, resoudre };
  enVol?.resoudre(null);
  enVol = lecture;
  let close = false;
  const finir = (): void => {
    close = true;
    lecture.resoudre(null);
    if (enVol === lecture) enVol = null;
  };
  return {
    offrirLesLocales(offertes) {
      if (!close && generation === sienne) lecture.resoudre(offertes);
    },
    conclure(acquisition) {
      if (close) return;
      finir();
      if (generation !== sienne || numero <= dernierConclu) return;
      dernierConclu = numero;
      courante = estComplete(acquisition.lues) ? acquisition : null;
      repriseOuverte = courante !== null;
      concluA = maintenant();
    },
    annuler: finir,
    echouer() {
      finir();
      if (numero > dernierConclu) {
        dernierConclu = numero;
        courante = null;
      }
    },
  };
}

/**
 * Les objets locaux que la lecture du relevé en cours a déjà lus, ou `null` quand aucune ne lit, qu'elle n'a rien offert, qu'elle
 * est annulée, ou qu'une écriture est passée depuis. Attend que la lecture les offre.
 */
export async function attendreLesLocalesEnCours(): Promise<LocalesLues | null> {
  const lecture = enVol;
  if (!lecture || lecture.generation !== generation) return null;
  const locales = await lecture.locales;
  return lecture.generation === generation ? locales : null;
}

/**
 * L'acquisition du dernier Actualiser, pour le `lire-structure` qui le suit : une seule fois, et seulement si elle n'a pas
 * été périmée, ni fermée par une autre demande de structure, ni dépassé `DELAI_DE_REPRISE`. Sinon `null` : Figma est lu.
 */
export function prendreLAcquisitionPourLaStructure(maintenant: () => number = Date.now): Acquisition | null {
  const ouverte = repriseOuverte;
  repriseOuverte = false;
  if (!ouverte || !courante || maintenant() - concluA > DELAI_DE_REPRISE) return null;
  return courante;
}

/** Une demande de structure qui n'est pas le `lire-structure` du relevé (Ignorer, Appliquer) ferme la reprise. */
export function fermerLaReprise(): void {
  repriseOuverte = false;
}

/** L'acquisition courante, sans la prendre ; pour les tests. */
export function acquisitionCourante(): Acquisition | null {
  return courante;
}

/**
 * Les collections et variables que `lireLesVariables` rendrait pour `lire-structure` : les variables locales lues, puis les cibles
 * de leurs alias, et les collections de ces variables. Les membres des autres collections, les collections vides et les bases
 * d'extension que le relevé lit en plus n'y entrent pas. Les cibles se suivent par vagues, comme l'ancienne lecture ; l'ordre
 * de chaque liste est celui de l'acquisition.
 */
export function variablesDuCatalogue(acquisition: Acquisition): { collections: CollectionRelevee[]; variables: VariableRelevee[] } {
  const { collections: lesCollections, variables: lesVariables } = acquisition.lues;
  const collections = new Map<string, CollectionRelevee>();
  const variables = new Map<string, VariableRelevee>();
  let vague: string[] = [];
  const ajouter = (id: string): void => {
    const variable = lesVariables.get(id);
    if (!variable || variables.has(id)) return;
    variables.set(id, variable);
    vague.push(id);
    const collection = lesCollections.get(variable.collection);
    if (collection) collections.set(collection.id, collection);
  };
  const cibles = (valeurs: Readonly<Record<string, ValeurSource>>): void => {
    for (const valeur of Object.values(valeurs)) if (valeur.nature === 'alias') ajouter(valeur.cible);
  };
  for (const id of acquisition.idsLocaux) ajouter(id);
  // Les surcharges d'une extension se lisent avec les collections déjà rangées, comme les valeurs des variables.
  const surchargesLues = new Set<string>();
  while (vague.length > 0) {
    const courantes = vague;
    vague = [];
    for (const id of courantes) cibles(variables.get(id)!.valeurs);
    for (const collection of [...collections.values()]) {
      if (surchargesLues.has(collection.id)) continue;
      surchargesLues.add(collection.id);
      for (const valeurs of Object.values(collection.extension?.surcharges ?? {})) cibles(valeurs);
    }
  }
  return { collections: [...collections.values()], variables: [...variables.values()] };
}
