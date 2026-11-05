/**
 * Le domaine `structure` : le mode Tokens lit les scopes et les alias de mode des variables du fichier ouvert, sans composant, et
 * écrit les corrections que l'on coche.
 *
 * `lire-structure` rend `structure` : les constats de `controlerLeCatalogue` et de `controlerLIntegriteUcm` du kit sur le
 * catalogue du fichier, et les corrections que ces constats portent. C82 ne propose une création que si le fichier a choisi son
 * écriture dans Nomenclature, et n'omet que les rôles que le fichier n'ignore pas. Un constat ignoré par son identifiant n'est pas
 * rendu, ni sa correction ; une proposition retirée garde le constat sans correction. Hors UCM, ou quand la lecture échoue, les
 * listes sont vides. Le sandbox retient ces corrections, par identifiant : `appliquer-structure` n'écrit que celles-là
 * (`ecriture/structure.ts`), une opération à la fois, analyse comprise (une demande reçue pendant ce temps saute tout en
 * `occupe`). Le lot écrit, `structure-appliquee` part (avec les noms des variables créées que l'Historique ne pourra pas annuler), les corrections retenues sont oubliées et l'analyse d'un composant
 * éventuelle est périmée.
 *
 * Après Appliquer (D4b), la relecture est complète : l'interface envoie `lire-structure` à la réponse `structure-appliquee`, et il lit
 * tout Figma. `appliquer-structure` ferme la reprise de l'acquisition du relevé et oublie la lecture gardée avant d'écrire ; l'écriture
 * périme l'acquisition même refusée ou levée (`pendantUneEcriture`), comme l'annulation de l'Historique. Avant d'écrire, l'écriture relit
 * les variables visées (existence, scopes, alias du mode, cible, collection de `theme`) et saute ce qui a changé depuis la lecture.
 * Aucune relecture ciblée des variables écrites n'existe, parce que les contrôles du kit lisent plus que ces variables :
 * - scopes (`C63` scopes, `C82` scopes d'une couche) : la variable écrite et ses seuls constats ; aucun contrôle ne lit les scopes
 *   d'une autre variable. Le cas le plus local, mais il ne se relit pas seul : un lot mêle les sortes.
 * - alias d'un mode : la valeur de la variable, donc son jugement de cran, les rampes que ses jumelles du groupe visent (le sens de la
 *   palette et l'alias des créations C82 en dépendent) et, pour `C63` alias supprimé, la voisine de même dernier segment dont la cible sert de repère.
 * - création : la liste des variables, donc les `C82` « variable absente » de son groupe, les jumelles du groupe et les index du kit,
 *   mémorisés par catalogue sur la longueur de la liste : une variable ajoutée ou changée en place à un catalogue gardé n'y serait pas vue.
 * - renommage, écrit avant les corrections par le même Appliquer : le rôle reconnu et le groupe de la variable, les identifiants des
 *   constats `C82` (ils portent le nom), les scopes attendus par `C63`, les candidats que `C63` cherche par nom, et la clé d'Ignorer d'un constat.
 * La relecture complète garde donc les voisins et les candidats justes, et rend le même message qu'un Actualiser (`tests/relectureApresAppliquer.test.ts`).
 * Un Ctrl+Z de Figma ou un changement à la main ne se signale pas : seule la lecture suivante, d'Actualiser ou d'Appliquer, les voit.
 *
 * Ignorer (Q6) : `ignorer-constat-de-structure` range un constat du dernier `structure` envoyé, pour sa palette ;
 * `ignorer-role` range un rôle du thème, pour tout le fichier ; `retablir-*` retire la clé. Chacune refiltre la dernière lecture
 * de structure si elle est fraîche, sinon relit Figma, et répond `structure` sous son propre numéro. Une demande faite pendant une autre écriture, un constat inconnu, un
 * rôle hors du référentiel ou un refus du rangement (hors UCM, constat `limite`) n'écrit rien et relit quand même : la liste
 * rendue dit ce qui est resté. Le message `structure` porte `ignores` : les constats écartés pour leur palette et les rôles écartés.
 */
import { VARIABLES_DU_THEME, type VariableDuTheme } from '@ucm-kit/core/emplois';
import { controlerLIntegriteUcm, controlerLeCatalogue, type CatalogueDeReference, type Constat, type Correction } from '@ucm-kit/core/controles';
import { CLE_ECRITURE, lireEcriture, lireEntree, type EcritureChoisie } from '@ucm-kit/core/protocoles';
import { ESPACE_ARCHITECT } from '@ucm-kit/core/referentiel';

import { catalogueDuFichier } from '../catalogue';
import { ignorerUnConstat, ignorerUnRole, lireLesIgnores, nePlusIgnorer, retablirUnRole, rolesIgnoresDe, separerLesIgnores, type PortDIgnores, type ResultatDIgnorer } from '../ecriture/ignores';
import { ecrireLaStructure, type ResultatDEcritureDeStructure } from '../ecriture/structure';
import { compterLesAppelsDuPort, idsDesLocales, lireLesVariables, mesurerUnePhaseDeTokens, type AppelsDePhase } from '../lecture';
import type { DemandeDeStructure, IgnoresDeStructure } from '../messages/structure';
import { fermerLaReprise, prendreLAcquisitionPourLaStructure, reperDesLectures, variablesDuCatalogue } from './acquisition';
import { perimerApresUneEcriture, prendreLaPlaceDUneEcriture } from './analyse';
import { lireLaDeclaration } from './commun';
import type { Contexte, Traiter } from './contexte';
import { portDeLecture } from './lectureDeFigma';

export const TYPES: readonly DemandeDeStructure['type'][] = [
  'lire-structure', 'appliquer-structure', 'ignorer-constat-de-structure', 'retablir-constat-de-structure', 'ignorer-role', 'retablir-role',
];

/** Les clés d'Ignorer du document : le sandbox donne celles de Figma, les tests des doubles. */
export interface RangementDeStructure {
  ignorerUnConstat(constat: Constat): ResultatDIgnorer;
  nePlusIgnorer(idDuConstat: string): ResultatDIgnorer;
  ignorerUnRole(role: VariableDuTheme): ResultatDIgnorer;
  retablirUnRole(role: VariableDuTheme): ResultatDIgnorer;
}

export const rangementDeFigma = (api: PortDIgnores): RangementDeStructure => ({
  ignorerUnConstat: (constat) => ignorerUnConstat(api, constat, 'constat'),
  nePlusIgnorer: (id) => nePlusIgnorer(api, id),
  ignorerUnRole: (role) => ignorerUnRole(api, role),
  retablirUnRole: (role) => retablirUnRole(api, role),
});

/** Les lectures et les écritures du domaine : le sandbox donne celles de Figma, les tests des doubles. */
export interface Acces {
  /**
   * Le catalogue du fichier ouvert ; `null` hors UCM ou quand la lecture n'aboutit pas. `depuisLeReleve` est vrai pour la demande
   * `lire-structure`, que l'interface envoie après le relevé : le catalogue peut venir de l'acquisition du relevé, sinon Figma est lu.
   */
  catalogue(contexte: Contexte, appels?: AppelsDePhase, depuisLeReleve?: boolean): Promise<CatalogueDeReference | null>;
  /** L'écriture choisie dans Nomenclature, `null` tant qu'elle n'y est pas rangée, et les clés d'Ignorer du fichier. */
  reglages(contexte: Contexte): Promise<{ readonly ecriture: EcritureChoisie | null; readonly cles: readonly string[] }>;
  /** `nomsLus` : le nom que l'analyse a lu sur la variable de chaque correction, par identifiant ; l'écriture saute celle dont la variable a été renommée. */
  ecrire(corrections: readonly Correction[], nomsLus?: ReadonlyMap<string, string>): Promise<ResultatDEcritureDeStructure>;
  rangement(contexte: Contexte): RangementDeStructure;
}

/**
 * Le catalogue par lecture de Figma : les variables locales, chacune relue par identifiant, puis les cibles de leurs alias. Le
 * chemin de `lire-structure` sans acquisition, et la référence à laquelle les tests comparent le catalogue de l'acquisition.
 */
export async function catalogueParLesLectures(figma: PluginAPI, appels: AppelsDePhase = {}): Promise<CatalogueDeReference | null> {
  const port = compterLesAppelsDuPort(portDeLecture(figma), appels);
  const locales = await port.getLocalVariablesAsync();
  const lues = await lireLesVariables(port, locales.map((variable) => variable.id), { annulee: () => false }, idsDesLocales(locales));
  if (!lues) return null;
  const catalogue = catalogueDuFichier({ collections: [...lues.collections.values()], variables: [...lues.variables.values()] }, 'ucm');
  if ([...lues.manquees.values()].some((manquee) => manquee.issue === 'refusee')) cataloguesAvecUnRefus.add(catalogue);
  return catalogue;
}

/**
 * Les catalogues dont une lecture a été refusée : leur contenu dépend d'un refus que la lecture suivante peut ne plus avoir. Ils
 * s'envoient, mais ne se gardent pas pour Ignorer, qui relit Figma. L'acquisition du relevé n'en retient aucune (`estComplete`).
 */
const cataloguesAvecUnRefus = new WeakSet<CatalogueDeReference>();

export const ACCES_DE_FIGMA: Acces = {
  async catalogue({ figma }, appels = {}, depuisLeReleve = false) {
    // La reprise se prend d'abord : une demande hors UCM la consomme aussi, elle ne reste pas pour la suivante.
    const acquisition = depuisLeReleve ? prendreLAcquisitionPourLaStructure() : null;
    if (lireLaDeclaration(figma) !== 'ucm') return null;
    if (acquisition) return catalogueDuFichier(variablesDuCatalogue(acquisition), 'ucm');
    return catalogueParLesLectures(figma, appels);
  },
  async reglages({ figma }) {
    const texte = figma.root.getSharedPluginData(ESPACE_ARCHITECT, CLE_ECRITURE);
    const brut = texte ? lireEntree(texte) : undefined;
    return { ecriture: (brut && lireEcriture(brut)) || null, cles: lireLesIgnores(figma) };
  },
  ecrire: (corrections, nomsLus) => ecrireLaStructure(corrections, { nomsLus }),
  rangement: ({ figma }) => rangementDeFigma(figma as unknown as PortDIgnores),
};

/** Les corrections du dernier `structure` envoyé, par identifiant. */
let retenues: ReadonlyMap<string, Correction> = new Map();
/** Les constats du dernier `structure` envoyé, visibles ou ignorés pour leur palette, par identifiant. */
let envoyes: ReadonlyMap<string, Constat> = new Map();

/** Les sortes que ce domaine écrit ; une autre sorte retenue ne s'y écrit pas. */
export const estDeStructure = (correction: Correction): boolean => correction.sorte === 'scope' || correction.sorte === 'alias-de-mode' || correction.sorte === 'variable';

/** Les constats des deux contrôles, le premier de chaque identifiant. */
function sansDoublon(constats: readonly Constat[]): Constat[] {
  const vus = new Set<string>();
  return constats.filter((constat) => !vus.has(constat.id) && vus.add(constat.id));
}

/** La lecture du domaine : les constats des deux contrôles moins les ignorés, et leurs corrections, sous le numéro de la demande. */
async function lire(numero: number, acces: Acces, contexte: Contexte, depuisLeReleve = false): Promise<void> {
  await mesurerUnePhaseDeTokens('lire-structure', (appels) => lireLaStructure(numero, acces, contexte, appels, depuisLeReleve));
}

/** Ce que la dernière lecture de structure a calculé, pour qu'Ignorer et Rétablir refiltrent sans relire Figma. */
interface LectureGardee {
  readonly catalogue: CatalogueDeReference;
  readonly ecriture: EcritureChoisie | null;
  /** Les rôles ignorés pour lesquels `tous` a été calculé. */
  readonly roles: readonly VariableDuTheme[];
  /** Les constats des deux contrôles avant `separerLesIgnores`, sans doublon. */
  readonly tous: readonly Constat[];
  readonly reper: string;
}

/**
 * La dernière lecture complète, gardée jusqu'à la prochaine lecture. Rien n'est gardé quand le catalogue est absent (hors UCM,
 * lecture annulée), qu'une lecture a été refusée (`cataloguesAvecUnRefus`) ou que les réglages ne se lisent pas : ces cas relisent
 * Figma. Une écriture de variable, un Appliquer ou un nouvel Actualiser change le repère ou l'efface, et la périme.
 */
let gardee: LectureGardee | null = null;

/** Oublie la lecture gardée ; les tests l'appellent entre deux cas. */
export function oublierLaLectureGardee(): void {
  gardee = null;
}

/** Les constats des deux contrôles du kit sur le catalogue, pour les rôles ignorés et l'écriture donnés. */
function controler(catalogue: CatalogueDeReference, ecriture: EcritureChoisie | null, roles: readonly VariableDuTheme[]): Constat[] {
  return sansDoublon([
    ...mesurerUnePhaseDeTokens('controler-le-catalogue', () => controlerLeCatalogue(catalogue)),
    ...mesurerUnePhaseDeTokens('controler-l-integrite', () => controlerLIntegriteUcm(catalogue, { ecriture, rolesIgnores: [...roles] })),
  ]);
}

/** Sépare les ignorés, retient les corrections et envoie `structure` : la fin commune de la lecture complète et du refiltrage. */
function rendre(numero: number, contexte: Contexte, tous: readonly Constat[], cles: readonly string[], roles: readonly VariableDuTheme[]): void {
  const separes = separerLesIgnores(tous, cles);
  const constats = separes.visibles;
  const ignores: IgnoresDeStructure = {
    constats: tous.filter(({ id }) => separes.ignores.includes(id)).map((constat) => ({ ...constat, correction: undefined, question: undefined })),
    roles: [...roles],
  };
  const corrections = constats.flatMap((constat) => (constat.correction ? [constat.correction] : []));
  retenues = new Map(corrections.map((correction) => [correction.id, correction] as const));
  envoyes = new Map([...constats, ...ignores.constats].map((constat) => [constat.id, constat] as const));
  contexte.envoyer({ type: 'structure', demande: numero, constats, corrections, ignores });
}

async function lireLaStructure(numero: number, acces: Acces, contexte: Contexte, appels: AppelsDePhase, depuisLeReleve: boolean): Promise<void> {
  gardee = null;
  const reper = reperDesLectures();
  let catalogue: CatalogueDeReference | null = null;
  try { catalogue = await mesurerUnePhaseDeTokens('lire-le-catalogue', (appelsDuCatalogue) => {
    const lecture = acces.catalogue(contexte, appelsDuCatalogue, depuisLeReleve);
    return lecture.finally(() => { for (const [nom, n] of Object.entries(appelsDuCatalogue)) appels[nom] = (appels[nom] ?? 0) + n; });
  }); } catch { catalogue = null; }
  if (!catalogue) {
    rendre(numero, contexte, [], [], []);
    return;
  }
  let reglages: Awaited<ReturnType<Acces['reglages']>> = { ecriture: null, cles: [] };
  let lus = true;
  try { reglages = await acces.reglages(contexte); } catch { lus = false; /* sans réglages : aucune création, aucun constat écarté */ }
  const roles = rolesIgnoresDe(reglages.cles);
  const tous = controler(catalogue, reglages.ecriture, roles);
  if (lus && !cataloguesAvecUnRefus.has(catalogue) && reper === reperDesLectures()) gardee = { catalogue, ecriture: reglages.ecriture, roles, tous, reper };
  rendre(numero, contexte, tous, reglages.cles, roles);
}

/**
 * Refiltre la lecture gardée avec les clés d'Ignorer relues, sans lire de variable. Rend faux, sans rien envoyer, quand rien n'est
 * gardé, qu'une écriture ou un Actualiser est passé, ou que les réglages ne se lisent pas : l'appelant relit alors Figma.
 */
async function refiltrerLaLectureGardee(numero: number, acces: Acces, contexte: Contexte): Promise<boolean> {
  const garde = gardee;
  if (!garde || garde.reper !== reperDesLectures()) return false;
  let reglages: Awaited<ReturnType<Acces['reglages']>>;
  try { reglages = await acces.reglages(contexte); } catch { return false; }
  if (garde.reper !== reperDesLectures()) return false;
  await mesurerUnePhaseDeTokens('lire-structure', () => {
    const roles = rolesIgnoresDe(reglages.cles);
    // Les rôles ignorés (ou l'écriture choisie) ont changé : C82 se recalcule sur le catalogue gardé. Sinon les constats sont ceux de la lecture.
    const memeSource = roles.join('|') === garde.roles.join('|') && JSON.stringify(reglages.ecriture) === JSON.stringify(garde.ecriture);
    const tous = memeSource ? garde.tous : controler(garde.catalogue, reglages.ecriture, roles);
    if (!memeSource) gardee = { ...garde, ecriture: reglages.ecriture, roles, tous };
    rendre(numero, contexte, tous, reglages.cles, roles);
  });
  return true;
}

type DemandeDIgnorerDeStructure = Exclude<DemandeDeStructure, { type: 'lire-structure' | 'appliquer-structure' }>;

/** Range ou retire la clé que la demande désigne, puis refiltre la lecture gardée ou relit la structure. */
async function ignorer(demande: DemandeDIgnorerDeStructure, acces: Acces, contexte: Contexte): Promise<void> {
  fermerLaReprise();
  const place = await prendreLaPlaceDUneEcriture({ sujet: 'structure', generation: 0 });
  if (!('occupe' in place)) {
    try {
      const rangement = acces.rangement(contexte);
      const role = 'role' in demande ? VARIABLES_DU_THEME.find((candidat) => candidat === demande.role) : undefined;
      const constat = 'constat' in demande ? envoyes.get(demande.constat) : undefined;
      if (demande.type === 'ignorer-role' && role) rangement.ignorerUnRole(role);
      else if (demande.type === 'retablir-role' && role) rangement.retablirUnRole(role);
      else if (demande.type === 'ignorer-constat-de-structure' && constat) rangement.ignorerUnConstat(constat);
      else if (demande.type === 'retablir-constat-de-structure' && constat) rangement.nePlusIgnorer(constat.id);
    } catch {
      /* le rangement a levé : la relecture dit ce qui est resté */
    } finally {
      place.liberer();
    }
  }
  if (!(await refiltrerLaLectureGardee(demande.demande, acces, contexte))) await lire(demande.demande, acces, contexte);
}

/** Le traitement du domaine sur des accès donnés. */
export function traiterAvec(acces: Acces): Traiter<DemandeDeStructure> {
  return async (demande, contexte) => {
    if (demande.type === 'lire-structure') await lire(demande.demande, acces, contexte, true);
    else if (demande.type === 'appliquer-structure') await appliquer(demande, acces, contexte);
    else await ignorer(demande, acces, contexte);
  };
}

/** Le nom que la dernière lecture a lu sur la variable de chaque correction : le fait `variable` du constat qui la porte. */
function nomsLues(corrections: readonly Correction[]): ReadonlyMap<string, string> {
  const noms = new Map<string, string>();
  for (const { id } of corrections) {
    const nom = envoyes.get(id)?.faits.variable;
    if (typeof nom === 'string') noms.set(id, nom);
  }
  return noms;
}

async function appliquer(demande: Extract<DemandeDeStructure, { type: 'appliquer-structure' }>, acces: Acces, contexte: Contexte): Promise<void> {
  fermerLaReprise();
  const ids = [...new Set(demande.ids)];
  const place = await prendreLaPlaceDUneEcriture({ sujet: 'structure', generation: 0 });
  if ('occupe' in place) {
    contexte.envoyer({ type: 'structure-appliquee', demande: demande.demande, ecrites: 0, sautees: ids.map((id) => ({ id, motif: 'occupe' })), sansAnnulation: [] });
    return;
  }
  try {
    const sautees: { id: string; motif: string }[] = [];
    const aEcrire: Correction[] = [];
    for (const id of ids) {
      const correction = retenues.get(id);
      if (!correction) sautees.push({ id, motif: 'correction-inconnue' });
      else if (estDeStructure(correction)) aEcrire.push(correction);
      else sautees.push({ id, motif: 'non-pris-en-charge' });
    }
    let ecrit = false;
    let ecrites = 0;
    let sansAnnulation: readonly string[] = [];
    if (aEcrire.length > 0) {
      // Une écriture, même refusée ou levée, a pu changer des variables : la lecture gardée ne sert plus, quelle que soit l'écriture.
      gardee = null;
      try {
        const lot = await acces.ecrire(aEcrire, nomsLues(aEcrire));
        ecrites = lot.ecrites.length;
        ecrit = ecrites > 0;
        sautees.push(...lot.sautees);
        sansAnnulation = lot.sansAnnulation;
      } catch {
        // Le lot a pu écrire avant de lever : l'analyse se périme dans tous les cas.
        ecrit = true;
        sautees.push(...aEcrire.map(({ id }) => ({ id, motif: 'erreur' })));
      }
    }
    retenues = new Map();
    contexte.envoyer({ type: 'structure-appliquee', demande: demande.demande, ecrites, sautees, sansAnnulation });
    if (ecrit) perimerApresUneEcriture(contexte);
  } finally {
    place.liberer();
  }
}

export const traiter = traiterAvec(ACCES_DE_FIGMA);
