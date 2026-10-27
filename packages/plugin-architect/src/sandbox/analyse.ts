/**
 * Le domaine `analyse` : l'analyse du composant sélectionné, son identité et ce
 * qui la rend périmée.
 *
 * `analyser` lit le relevé du jeu de variants et le catalogue de référence (la
 * library choisie, sinon les variables du fichier), lance le moteur de
 * l'exporteur, puis les contrôles du kit. Les constats rendus sont ceux du kit
 * et ceux du moteur, traduits. Rien n'est écrit dans le document, et un
 * résultat `partielle` ne produit jamais de contrat. Une seule opération court à
 * la fois, analyse ou écriture de corrections : une seconde demande reçoit
 * `occupe`. Les constats passent par `proposerLesCorrections` du kit puis par les ignorés rangés dans le document ; l'analyse retient les corrections des constats visibles, par identifiant.
 *
 * Une analyse se périme de trois façons, et une seule fois : après une
 * écriture du plugin (`ecriture`), sur un changement de la page qui touche un
 * nœud du jeu analysé (`document`, dont le Ctrl+Z), sur une sélection Figma
 * d'un autre jeu de variants (`selection`). La sélection que le plugin pose
 * lui-même, au clic sur un constat, ne périme rien.
 *
 * Les nœuds surveillés viennent de la topologie du jeu (`topologie.ts` du
 * socle), lue avec le sujet. L'écoute des pages s'ouvre avant cette lecture et
 * garde les identifiants reçus jusqu'à ce que l'inventaire soit connu : un
 * événement reçu dans l'intervalle périme l'analyse si son nœud y figure. La
 * couverture de l'inventaire, trous de lecture et pages non écoutées compris,
 * reste sur l'analyse (`analyseARelire`) : une analyse dont la couverture est
 * incomplète ou inconnue doit être relue, jamais réutilisée.
 *
 * La session (`sessionDesAnalyses`) retient d'un sujet les sorties des lecteurs, les requêtes pures calculées sur elles et
 * le suivi de l'acquisition. Une demande prépare une révision de travail ; la session ne la reçoit qu'à la promotion
 * (`promouvoirLaRevision`), et une révision jetée la laisse telle quelle. Le journal marque d'invalides les sujets retenus qu'il
 * a touchés (`etatDeLEntree`), et la marque survit aux demandes annulées, arrêtées ou périmées. Elle est séparée de `AnalyseCourante`, qui porte
 * l'état affiché d'une génération : réponses, corrections fixées et péremption ne passent jamais dans la session.
 *
 * Une demande Analyser ne reprend le résultat du moteur d'une entrée qu'après `validerLEntree` : relevé, catalogue,
 * dépendances du moteur et règles relus égaux à ceux de l'entrée, et rien dans le jeu que la relecture ne couvre pas
 * (maître distant ou hors page écoutée, style illisible). Contrôles, corrections et projection ne dépendent pas de cette validation : chaque requête
 * pure se reprend de l'entrée du sujet quand les entrées qu'elle lit égalent celles que la demande vient de lire (`creerLesRequetes`).
 */
import {
  controlerCouchesParEtapes, controlerLAccessibiliteParEtapes, controlerLaStructureParEtapes, controlerLaTypographieParEtapes, controlerLeThemeParEtapes, controlerMappingParEtapes, controlerNommageParEtapes, controlerOublisParEtapes, clesDesTokensDeTailleAttendus, proposerLesCorrectionsParEtapes, tokensDuComposant,
  type CatalogueDeReference, type Constat, type Correction, type ReleveDeComposant,
} from '@ucm-kit/core/controles';
import { lireLesLibraries, type LectureDesLibraries, type PortDeBibliotheque } from 'ucm-plugin-socle/src/bibliotheque';
import { acquis, doitEtreRelue, type Couverture, type FaitDeRessource, type MaitreLu } from 'ucm-plugin-socle/src/composant/analyse/faits';
import { porteeDesChangements, porteeDesChangementsDeStyle, relecturesObligatoires, type AnciensParents, type ChangementDeStyleRecu, type ChangementRecu } from 'ucm-plugin-socle/src/composant/analyse/couverture';
import { creerLeJournal, type JournalDeChangements, type OrigineDEcriture, type RaisonDInterruption } from 'ucm-plugin-socle/src/composant/analyse/journal';
import { creerInventairesDeLaDemande, type InventairesDeLaDemande } from 'ucm-plugin-socle/src/composant/analyse/inventaires';
import { BORNES_DE_RETENTION, type BornesDeRetention } from 'ucm-plugin-socle/src/composant/analyse/retention';
import { creerLaSession, type EntreeDeSession, type RequeteRetenue, type SessionDAnalyse } from 'ucm-plugin-socle/src/composant/analyse/session';
import { raisonsDInvalidation, type RaisonDInvalidation } from 'ucm-plugin-socle/src/composant/analyse/invalidations';
import { ouvrirUneRevision, type RevisionDeTravail } from 'ucm-plugin-socle/src/composant/analyse/revisions';
import { ecartsDesSorties, egalesExactement, type EcartDeSortie } from 'ucm-plugin-socle/src/composant/analyse/validation';
import { avecLesPagesNonEcoutees, inventaireDePeremption, lireLaTopologieDuJeu, type NoeudALire } from 'ucm-plugin-socle/src/composant/analyse/topologie';
import { BUDGET_DE_LAYERS_PAR_DEFAUT } from 'ucm-plugin-socle/src/composant/contract/budget';
import { analyserLeComposant, type ResultatSansPublication } from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import { nomsDeLaPage } from 'ucm-plugin-socle/src/composant/contract/composedComponents';
import { extractRules, type ExtractedRules } from 'ucm-plugin-socle/src/composant/contract/extractRules';
import type { ResultatInterne } from 'ucm-plugin-socle/src/composant/analyse/resultat';
import { ouvrirLaMesure, fermerLaMesure, etape, compter, retenirLeMaximum, attendrePourLaMesure, mesurerLeCalcul, mesurerSousCompteur, type TraceDeMesure } from 'ucm-plugin-socle/src/composant/contract/mesure';
import { AnalyseAnnulee, creerContexteCooperatif, type ContexteCooperatif, type JetonDAnnulation, type OptionsDeCooperation } from 'ucm-plugin-socle/src/composant/contract/porteeDAnalyse';

import { catalogueDuFichier, chargerLesValeurs, lireLeCatalogueDeLibrary } from '../catalogue';
import type { NoeudLu } from '../consommateurs';
import { constatsDuMoteur } from '../constatsDuMoteur';
import { enregistrerLesImports, lireLesVariables } from '../lecture';
import { sujetDe, type PortDuComposant } from '../lectureDuComposant';
import { lireLaLibraryRangee } from '../ecriture/configuration';
import { lireLesIgnores, separerLesIgnores } from '../ecriture/ignores';
import type { NiveauDAccessibilite } from '../messages/configuration';
import type { CauseDePeremption, DemandeDAnalyse, IntentionDAnalyse, StatutDAnalyse, PhaseDAnalyse, ProgressionDAnalyse } from '../messages/analyse';
import type { IdentiteDAnalyse, OrigineDeSelection } from '../messages/commun';
import { constatsDeRegles, lireLesRegles, retenirLesModeles, type ReleveDesRegles } from '../regles';
import { lireLeReleve, type IssueDuReleve } from '../releveDuComposant';
import { abandonnerLesLibrariesAnticipees, lireLesLibrariesAuClic } from './anticipation';
import { capturerSiDemande, PROPRIETES_DE_STYLE } from './capture';
import { lireLaDeclaration } from './commun';
import { retenirLesLiaisons } from './bibliotheque';
import { FAMILLES_DE_CONTROLES, FAMILLES_UCM, PROJECTIONS, type NomDeFamille } from './projectionsDesControles';
import { libraryDeReference, lireLeNiveau } from './configuration';
import type { Contexte, Traiter } from './contexte';
import { portDeLecture, selectionLue } from './lectureDeFigma';

export const TYPES: readonly DemandeDAnalyse['type'][] = ['analyser', 'annuler-analyse', 'analyse-rendue'];

interface AnalyseCourante {
  readonly identite: IdentiteDAnalyse;
  /** Les identifiants des nœuds du jeu analysé : le jeu, ses variants et leurs calques. */
  readonly noeuds: ReadonlySet<string>;
  /** Les sujets que la sélection peut désigner sans périmer l'analyse : le jeu et ses variants. */
  readonly admis: ReadonlySet<string>;
  /** Ce que la surveillance couvre : les trous de lecture du jeu et les pages non écoutées. */
  readonly couverture: Couverture;
  /** Le curseur du journal à l'ouverture de l'écoute de la demande : `depuis(curseur)` rend ce qui a changé depuis. */
  readonly curseur: number;
  /** Le parent de chaque sommet de l'inventaire, tel que la topologie l'a lu : de quoi situer une suppression ou un déplacement. */
  readonly parents: ReadonlyMap<string, string>;
  /** Les pages que l'écoute de l'analyse couvre : celle du sujet et la page courante à l'ouverture. */
  readonly pages: ReadonlySet<string>;
  /**
   * Les maîtres locaux des instances du jeu, sur une page écoutée, et leurs descendants : un changement dessous touche le
   * sujet. Connus après la lecture des dépendances (`suivreLesMaitres`), vides avant.
   */
  maitres: ReadonlySet<string>;
  /** Les corrections des constats rendus, par identifiant : l'écriture n'écrit que celles-là. */
  corrections: ReadonlyMap<string, Correction>;
  /** Tous les constats de l'analyse, ignorés compris, par identifiant : Ignorer et les questions les retrouvent ici. */
  constats: ReadonlyMap<string, Constat>;
  releve: ReleveDeComposant | null;
  /** Le catalogue de l'analyse : la propagation depuis un modèle y cherche les variables visées. */
  catalogue: CatalogueDeReference | null;
  /** Vrai dès que le résultat final complet ou partiel a retenu ses corrections ; ni le provisoire, ni une fin annulée ou arrêtée n'y suffisent. */
  finalisee: boolean;
  perimee: boolean;
}

let generation = 0;
let courante: AnalyseCourante | null = null;

/**
 * Le relevé des règles tel que la session le retient : les nœuds Figma de `ReleveDeSource` (conteneur vierge, maître local,
 * instance source) y sont réduits à leur identifiant. Aucune requête reprise ni validation ne les lit : les règles se relisent
 * sur la page, et seul `lireLesRegles` lit le scan frais.
 */
export type RelevesDeSourceRetenu = { readonly conteneurDuComposant: boolean; readonly conteneurVierge: string | null; readonly maitreLocal: string | null; readonly instanceSource: string | null };

/** Le résultat du moteur tel que la session le retient : sans `pourLaPublication` ni nœud Figma (voir `sansPublication`). */
export type MoteurRetenu = Omit<ResultatInterne, 'pourLaPublication' | 'rules'> & { rules: Omit<ExtractedRules, 'releve'> & { releve: RelevesDeSourceRetenu } };

/** Ce que la lecture des règles prend du moteur : un résultat interne ou un résultat retenu. */
export type SurfaceDuMoteurRetenu = Pick<MoteurRetenu, 'props' | 'stateModel' | 'imbriques'>;

/** Un style de texte ou d'effet du jeu, avec sa définition lue par identifiant. */
export interface StyleDeDependance {
  /** `mixte` pour un texte dont le style ne se lit pas en un identifiant. */
  readonly id: string;
  /** Les propriétés de `PROPRIETES_DE_STYLE`, en valeurs simples ; `null` quand le style ne se lit pas (mixte, introuvable, refusé). */
  readonly definition: unknown;
}

/** Le maître d'une ou plusieurs instances du jeu, tel que `getMainComponentAsync` le rend. */
export interface MaitreDeDependance {
  readonly id: string;
  /** Combien d'instances du jeu ont ce maître. */
  readonly instances: number;
  /** Vrai pour un maître de library ; `null` quand `remote` ne se lit pas. */
  readonly remote: boolean | null;
  /** La page du maître ; `null` sans page (maître distant). */
  readonly page: string | null;
  /** Le maître local, ou son jeu de variants, et tous leurs descendants. Vide pour un maître distant ou d'origine inconnue. */
  readonly noeuds: readonly string[];
  /**
   * Les instances sous le maître local (son jeu compris). Le moteur en lit les maîtres, leur page et leurs propres
   * instances, hors de `noeuds` : aucun événement ni aucune dépendance ne les couvre. 0 pour un maître distant, non lu.
   */
  readonly instancesImbriquees: number;
  /** Ce que le moteur lit de la page du maître local, par la même fonction (`nomsDeLaPage`) : les noms de composant des conteneurs de règles. `null` sans page ou pour un maître distant. */
  readonly nomsDeLaPage: readonly string[] | null;
}

/**
 * Ce que le moteur lit hors du jeu, du relevé et du catalogue, lu avant lui à chaque demande : le scan des règles de la
 * page du sujet, l'index des variables et collections locales, la définition des styles du jeu et le maître de ses
 * instances. La validation les compare ; ce qu'elle ne peut pas relire refuse la reprise.
 */
export interface DependancesDuMoteur {
  /** Le scan des règles (`extractRules`), ses nœuds réduits à leur identifiant. */
  readonly regles: unknown;
  readonly collectionsLocales: readonly { readonly id: string; readonly nom: string }[];
  /** Dans l'ordre de `getLocalVariablesAsync` : le premier occupant d'un nom de token garde ce nom dans l'index du moteur. */
  readonly variablesLocales: readonly { readonly id: string; readonly nom: string; readonly collection: string }[];
  /** Les styles de texte et d'effet du jeu et de ses calques, dans l'ordre du parcours. */
  readonly styles: readonly StyleDeDependance[];
  /** Les instances du jeu et de ses calques, y compris celles dont le maître ne se lit pas. */
  readonly instances: number;
  /** Les maîtres lus, dans l'ordre du parcours, un par identifiant. */
  readonly maitres: readonly MaitreDeDependance[];
}

/** Ce que les lecteurs ont rendu à une analyse complète. */
export interface SortiesDeSession {
  readonly releve: ReleveDeComposant;
  readonly catalogue: CatalogueDeReference;
  readonly moteur: MoteurRetenu;
  readonly regles: ReleveDesRegles | null;
  /** `null` sans lecteur de dépendances : l'entrée ne se valide alors jamais. */
  readonly dependances: DependancesDuMoteur | null;
  readonly niveau: NiveauDAccessibilite;
  readonly architectureUcm: boolean;
  readonly ignores: readonly string[];
  /** Les lecteurs (`regles`, `niveau`, `ignores`, `dependances`) dont la lecture a levé et dont la sortie est une valeur par défaut. */
  readonly lecturesRefusees: readonly string[];
}

type NomDeRequete = NomDeFamille | 'corrections' | 'projection';
/** `controles` : les constats des familles du kit, rassemblés dans l'ordre du produit ; `corrections` les lit. */
type NomDEntree = keyof SortiesDeSession | NomDeRequete | 'controles';

/**
 * Les requêtes pures de l'analyse, avec ce que chacune a lu. Les constats sont ceux du kit, sans réponse ni correction fixée.
 * Une famille de contrôles est une requête ; `controle-theme` et `controle-structure` n'y figurent que pour une architecture
 * UCM (clés de l'index) : une entrée qui ne les porte pas ne les a pas jugées.
 */
export interface RequetesDeSession extends Record<string, RequeteRetenue<unknown, NomDEntree>> {
  readonly 'controle-nommage': RequeteRetenue<readonly Constat[], NomDEntree>;
  readonly 'controle-mapping': RequeteRetenue<readonly Constat[], NomDEntree>;
  readonly 'controle-couches': RequeteRetenue<readonly Constat[], NomDEntree>;
  readonly 'controle-oublis': RequeteRetenue<readonly Constat[], NomDEntree>;
  readonly 'controle-accessibilite': RequeteRetenue<readonly Constat[], NomDEntree>;
  readonly 'controle-typographie': RequeteRetenue<readonly Constat[], NomDEntree>;
  readonly corrections: RequeteRetenue<readonly Constat[], NomDEntree>;
  readonly projection: RequeteRetenue<{ readonly visibles: readonly Constat[]; readonly ignores: readonly string[] }, NomDEntree>;
}

export type EntreeDeSessionDAnalyse = EntreeDeSession<SortiesDeSession, RequetesDeSession>;

/**
 * Ce que chaque requête lit, et rien d'autre : l'entrée retenue en session part de cette liste. Aucune requête ne lit un
 * état de module, l'heure ni un ordre d'itération rempli ailleurs : les mémoires du kit sont des `WeakMap` par catalogue ou
 * relevé, qui ne changent pas un résultat.
 * - une famille de contrôles : le relevé et le catalogue, dont elle ne lit qu'une part (`projectionsDesControles.ts`) ; le
 *   niveau d'accessibilité pour l'accessibilité ;
 * - `corrections` : les constats du moteur et des règles s'ajoutent aux contrôles, d'où `moteur` et `regles` ;
 * - `projection` : les ignorés rangés écartent des constats des corrections.
 */
const ENTREES_DES_REQUETES: Readonly<Record<NomDeRequete, readonly NomDEntree[]>> = {
  'controle-nommage': ['releve', 'catalogue'],
  'controle-mapping': ['releve', 'catalogue'],
  'controle-couches': ['releve', 'catalogue'],
  'controle-oublis': ['releve', 'catalogue'],
  'controle-accessibilite': ['releve', 'catalogue', 'niveau'],
  'controle-typographie': ['releve', 'catalogue'],
  'controle-theme': ['releve', 'catalogue'],
  'controle-structure': ['releve', 'catalogue'],
  corrections: ['releve', 'catalogue', 'moteur', 'regles', 'controles'],
  projection: ['corrections', 'ignores'],
};

/**
 * Rend les deux fonctions par lesquelles `analyser` passe ses requêtes, sur l'entrée promue `entree` du sujet, quel que soit son
 * état (`null` pour Actualiser et sans entrée : rien ne se reprend alors) et les valeurs `actuelles` de la demande.
 * Une requête est une fonction pure de ses entrées : son résultat retenu vaut pour les entrées que la demande a lues, et la
 * comparaison suffit, que l'entrée soit invalidée par le journal, à relire ou refusée par la validation. Chacune compte la requête dans
 * `requetesNonRejouees` ou `requetesRejouees`, et sous son nom (`reprise:<requête>`, `rejeu:<requête>`).
 * - `famille` reprend le résultat de l'entrée quand la part des données que la famille lit est égale (`egalesExactement`) à
 *   celle de l'entrée, projection fraîche contre projection retenue ; la famille se calcule toujours sur les données entières.
 *   La projection retenue se recalcule sur le relevé et le catalogue de l'entrée : la session ne la double pas. Quand le
 *   relevé, le catalogue et le niveau sont égaux en entier, les projections le sont aussi, sans être calculées. Une famille
 *   que l'entrée n'a pas jugée (UCM déclarée depuis) se calcule.
 * - `requete` reprend `corrections` ou `projection` quand toutes leurs entrées égalent les valeurs `actuelles`. Une valeur
 *   absente de `actuelles` ne vaut jamais égale. Le résultat de chaque requête s'y inscrit, repris ou recalculé : une requête
 *   amont rejouée dont le résultat reste égal ne rejoue pas celles qui la lisent. `controles` y est le rassemblement des
 *   familles, posé par l'appelant.
 */
export function creerLesRequetes(entree: EntreeDeSessionDAnalyse | null, actuelles: Map<NomDEntree, unknown>) {
  const egales = new Map<NomDEntree, boolean>();
  const retenue = (nom: Exclude<NomDEntree, NomDeFamille>): unknown => {
    if (nom === 'controles') return entree && FAMILLES_DE_CONTROLES.flatMap((famille) => (entree.requetes[famille] as RequeteRetenue<readonly Constat[]> | undefined)?.resultat ?? []);
    return nom === 'corrections' || nom === 'projection' ? entree?.requetes[nom].resultat : entree?.sorties[nom];
  };
  const egale = (nom: Exclude<NomDEntree, NomDeFamille>): boolean => {
    let issue = egales.get(nom);
    if (issue === undefined) {
      issue = actuelles.has(nom) && egalesExactement(retenue(nom), actuelles.get(nom));
      egales.set(nom, issue);
    }
    return issue;
  };
  const entreesIdentiques = (): boolean => egale('releve') && egale('catalogue') && egale('niveau');
  const projectionInchangee = (nom: NomDeFamille, retenu: EntreeDeSessionDAnalyse): boolean => {
    if (entreesIdentiques()) return true;
    if (!actuelles.has('releve') || !actuelles.has('catalogue') || !actuelles.has('niveau')) return false;
    const fraiche = PROJECTIONS[nom](actuelles.get('releve') as ReleveDeComposant, actuelles.get('catalogue') as CatalogueDeReference, { niveau: actuelles.get('niveau') as NiveauDAccessibilite });
    const gardee = PROJECTIONS[nom](retenu.sorties.releve, retenu.sorties.catalogue, { niveau: retenu.sorties.niveau });
    return egalesExactement(fraiche, gardee);
  };
  const famille = async (nom: NomDeFamille, calculer: () => Promise<Constat[]>): Promise<readonly Constat[]> => {
    const gardee = entree?.requetes[nom] as RequeteRetenue<readonly Constat[]> | undefined;
    if (entree && gardee && projectionInchangee(nom, entree)) {
      compter('requetesNonRejouees');
      compter(`reprise:${nom}`);
      return gardee.resultat;
    }
    compter('requetesRejouees');
    compter(`rejeu:${nom}`);
    return calculer();
  };
  const requete = async <N extends 'corrections' | 'projection'>(nom: N, calculer: () => Promise<RequetesDeSession[N]['resultat']>): Promise<RequetesDeSession[N]['resultat']> => {
    let resultat: RequetesDeSession[N]['resultat'];
    if (entree && ENTREES_DES_REQUETES[nom].every((lue) => egale(lue as Exclude<NomDEntree, NomDeFamille>))) {
      resultat = entree.requetes[nom].resultat as RequetesDeSession[N]['resultat'];
      compter('requetesNonRejouees');
      compter(`reprise:${nom}`);
    } else {
      compter('requetesRejouees');
      compter(`rejeu:${nom}`);
      resultat = await calculer();
    }
    actuelles.set(nom, resultat);
    return resultat;
  };
  return { famille, requete };
}

let bornesDeRetention: BornesDeRetention = BORNES_DE_RETENTION;

/** Pour les tests : change les bornes de la session jusqu'à `reinitialiserLAnalyse`. */
export function fixerLesBornesDeRetention(bornes: Partial<BornesDeRetention>): void {
  bornesDeRetention = { ...BORNES_DE_RETENTION, ...bornes };
}

const session: SessionDAnalyse<SortiesDeSession, RequetesDeSession> = creerLaSession({
  bornes: () => bornesDeRetention,
  // Les ressources que la validation relit : chacune est une arête entre l'entrée et ce qu'elle suppose de Figma.
  aretes: ({ sorties: { dependances } }) => dependances ? dependances.collectionsLocales.length + dependances.variablesLocales.length + dependances.styles.length + dependances.maitres.length : 0,
});

/** La session d'analyse : une entrée par sujet, remplie par les analyses complètes. */
export function sessionDesAnalyses(): SessionDAnalyse<SortiesDeSession, RequetesDeSession> {
  return session;
}

/**
 * Le résultat du moteur sans `pourLaPublication` et sans les nœuds Figma que `rules.releve` porte. Les doubles de test
 * du moteur n'ont pas de `rules` : ils passent tels quels.
 */
function sansPublication({ pourLaPublication, rules, ...reste }: ResultatInterne): MoteurRetenu {
  if (!rules) return reste as MoteurRetenu;
  const { releve } = rules;
  return { ...reste, rules: { ...rules, releve: { conteneurDuComposant: releve.conteneurDuComposant, conteneurVierge: idDuNoeud(releve.conteneurVierge), maitreLocal: idDuNoeud(releve.maitreLocal), instanceSource: idDuNoeud(releve.instanceSource) } } };
}

export type RevisionDAnalyse = RevisionDeTravail<SortiesDeSession, RequetesDeSession>;

/**
 * Promeut la révision de l'analyse `identite` dans la session, ou la jette. La promotion exige une fin `complete`, une
 * identité encore courante (même sujet, même génération), une analyse non périmée (génération inapplicable comprise) et
 * rien au journal depuis son curseur qui l'invalide : écriture, interruption de page, débordement. Un changement de
 * portée `sujet` ou `inconnue` a déjà périmé l'analyse à sa réception. Un changement reçu après la promotion n'y change
 * rien : l'entrée promue passe alors par la validation de la demande suivante.
 */
function promouvoirLaRevision(revision: RevisionDAnalyse, identite: IdentiteDAnalyse, statut: StatutDAnalyse, sorties: SortiesDeSession, requetes: RequetesDeSession): void {
  if (statut !== 'complete' || !courante || !memeIdentite(courante.identite, identite)) return revision.jeter();
  const { curseur, noeuds, admis, parents, pages, couverture, maitres, perimee } = courante;
  revision.preparer({ sorties, requetes, suivi: { curseur, noeuds, admis, parents, pages, couverture, maitres } });
  revision.promouvoir(!perimee && !ecritureDepuisLAnalyse(identite) && !couvertureInterrompue(identite));
}

/** Pourquoi une entrée retenue ne se réutilise pas, quoi qu'en dise le journal : une lecture refusée ou une couverture incomplète. */
export type RaisonDeRelecture = 'releve-incomplet' | 'catalogue-inaccessible' | 'moteur-partiel' | 'couverture-incomplete' | `lecture-refusee:${string}`;

/**
 * Pourquoi la validation refuse une entrée `utilisable` à la demande courante :
 * - `couverture-de-la-demande` : l'écoute de la demande est incomplète ou interrompue, ou une écriture suit son curseur ;
 * - `page-des-regles` : le jeu n'a pas de page, et le moteur balaierait les règles de la page courante ;
 * - `page-non-suivie` : la page du jeu n'est pas une des pages que l'entrée écoutait ;
 * - `non-couvert:maitres` : une instance du jeu a un maître que ni le journal ni la validation ne couvrent. Seul un maître
 *   local, sur une page que l'entrée et la demande écoutent, est suivi par le journal (matrice de couverture) : un maître
 *   de library peut changer par une mise à jour sans événement, et sa définition n'est pas relue ;
 * - `non-couvert:maitres-autres-instances` : un maître local contient lui-même des instances. Le moteur en lit les maîtres,
 *   leur page et leurs instances, que ni le journal ni les dépendances ne couvrent ;
 * - `non-couvert:styles` : un style du jeu ne se lit pas par identifiant (mixte, introuvable, refusé). Sa définition,
 *   sinon, est relue avec les dépendances et comparée ;
 * - `lecture-refusee:dependances`, `lecture-refusee:regles` : la relecture a levé ;
 * - `different:<sortie>` : le relevé, le catalogue, les dépendances ou les règles relus diffèrent de ceux de l'entrée.
 */
export type RaisonDeNonReprise =
  | 'couverture-de-la-demande' | 'page-des-regles' | 'page-non-suivie' | 'non-couvert:maitres' | 'non-couvert:maitres-autres-instances' | 'non-couvert:styles'
  | 'lecture-refusee:dependances' | 'lecture-refusee:regles' | EcartDeSortie<'releve' | 'catalogue' | 'dependances' | 'regles'>;

export type EtatDeLEntree =
  | { readonly etat: 'absent' }
  | { readonly etat: 'utilisable' }
  | { readonly etat: 'invalide'; readonly raisons: readonly (RaisonDInvalidation | RaisonDeNonReprise)[] }
  | { readonly etat: 'a-relire'; readonly raisons: readonly RaisonDeRelecture[] };

function raisonsDeRelecture({ sorties, suivi }: EntreeDeSessionDAnalyse): RaisonDeRelecture[] {
  const raisons: RaisonDeRelecture[] = [];
  const { lecture } = sorties.releve;
  if (lecture.manquees.length > 0 || lecture.layersNonLus !== 0 || lecture.variantsNonLus.length > 0) raisons.push('releve-incomplet');
  if (sorties.catalogue.collections.some(({ etat }) => etat === 'inaccessible') || sorties.catalogue.variables.some(({ etat }) => etat === 'inaccessible')) raisons.push('catalogue-inaccessible');
  if (sorties.moteur.couverture.etat !== 'complete') raisons.push('moteur-partiel');
  if (doitEtreRelue(suivi.couverture)) raisons.push('couverture-incomplete');
  for (const lecteur of sorties.lecturesRefusees) raisons.push(`lecture-refusee:${lecteur}`);
  return raisons;
}

/**
 * Pose sur chaque entrée retenue les raisons que le journal donne depuis le dernier point évalué, puis avance ce point.
 * Les raisons restent jusqu'à la promotion d'une nouvelle entrée : une demande annulée, arrêtée ou périmée ne les efface pas.
 * Sans relecture de Figma. Appelée à l'ouverture de chaque demande, avant que le journal oublie ses vieilles entrées.
 */
function evaluerLesInvalidations(sujets: Iterable<string> = session.sujets()): void {
  if (!journal) return;
  const fin = journal.marquer();
  for (const sujet of sujets) {
    const entree = session.entree(sujet);
    if (!entree) continue;
    session.invalider(sujet, raisonsDInvalidation(entree.suivi, session.evalueJusqua(sujet) ?? entree.suivi.curseur, journal));
    session.avancerLEvaluation(sujet, fin);
  }
}

/**
 * Ce que 9.4 consulte avant de valider une entrée : `absent` sans entrée, `invalide` quand le journal a touché le sujet
 * depuis son curseur, `a-relire` quand une lecture refusée ou une couverture incomplète la rend irréutilisable,
 * `utilisable` sinon. `utilisable` n'est pas encore `valide` : les ressources sans événement se revalident par `validerLEntree`.
 */
export function etatDeLEntree(sujet: string): EtatDeLEntree {
  const entree = session.entree(sujet);
  if (!entree) return { etat: 'absent' };
  evaluerLesInvalidations([sujet]);
  const invalidations = session.invalidations(sujet) as (RaisonDInvalidation | RaisonDeNonReprise)[];
  if (invalidations.length > 0) return { etat: 'invalide', raisons: invalidations };
  const relectures = raisonsDeRelecture(entree);
  return relectures.length > 0 ? { etat: 'a-relire', raisons: relectures } : { etat: 'utilisable' };
}

/** L'issue de la validation. Seul `valide` permet de reprendre le résultat du moteur retenu ; `regles` est la relecture, égale à celle de l'entrée. */
export type ValidationDeLEntree =
  | { readonly etat: 'valide'; readonly moteur: MoteurRetenu; readonly regles: ReleveDesRegles | null }
  | { readonly etat: 'invalide'; readonly raisons: readonly RaisonDeNonReprise[] };

/** Ce que la demande courante a déjà lu avant le moteur : la validation ne relit ni le relevé ni le catalogue. `dependances` vaut `null` quand sa lecture a levé. */
export interface SortiesRelues {
  readonly releve: ReleveDeComposant;
  readonly catalogue: CatalogueDeReference;
  readonly dependances: DependancesDuMoteur | null;
}

/** La lecture des règles sur la surface d'un moteur ; `refusee` quand le lecteur a levé. */
export type RelireLesRegles = (moteur: SurfaceDuMoteurRetenu) => Promise<{ readonly regles: ReleveDesRegles | null; readonly refusee: boolean }>;

/**
 * Les maîtres des instances du jeu que le journal couvre sur les `pages` écoutées (`relecturesObligatoires`, 8.2), et
 * les identifiants que `SuivisDuSujet.maitres` doit porter : chaque maître suivi et ses descendants.
 */
function maitresSuivisParLeJournal(dependances: DependancesDuMoteur | null, pages: ReadonlySet<string>): { readonly maitres: ReadonlySet<string>; readonly noeuds: ReadonlySet<string> } {
  const aucun = { maitres: new Set<string>(), noeuds: new Set<string>() };
  if (!dependances || dependances.maitres.length === 0) return aucun;
  const faits: Record<string, FaitDeRessource<MaitreLu>> = {};
  const pageDe = new Map<string, string | null>();
  for (const { id, remote, page } of dependances.maitres) {
    pageDe.set(id, page);
    faits[id] = {
      id,
      provenance: { appel: { appel: 'getMainComponentAsync', instance: id }, origine: remote === null ? 'inconnue' : remote ? 'distante' : 'locale' },
      etat: acquis({ id, key: '', nom: '', remote: remote === true, jeu: null }),
    };
  }
  const { maitresSuivis } = relecturesObligatoires(
    { noeudsParIdentifiant: {}, variables: {}, collections: {}, styles: {}, maitres: faits, variablesDeLibrary: {}, inventaires: {} },
    { ecoutees: pages, pageDe: (id) => pageDe.get(id) ?? null },
  );
  const suivis = new Set(maitresSuivis);
  const noeuds = new Set<string>();
  for (const maitre of dependances.maitres) if (suivis.has(maitre.id)) for (const id of [maitre.id, ...maitre.noeuds]) noeuds.add(id);
  return { maitres: suivis, noeuds };
}

/** Un maître est couvert quand l'entrée le suivait et que la demande l'écoute encore : le journal a vu tout ce qui lui est arrivé depuis le curseur de l'entrée. */
function instancesCouvertes(dependances: DependancesDuMoteur, retenus: ReadonlySet<string>, maintenant: ReadonlySet<string>): number {
  let couvertes = 0;
  for (const { id, instances } of dependances.maitres) if (retenus.has(id) && maintenant.has(id)) couvertes += instances;
  return couvertes;
}

function raisonsDeNonReprise({ sorties, suivi }: EntreeDeSessionDAnalyse, sujet: SujetAAnalyser, identite: IdentiteDAnalyse, relues: SortiesRelues): RaisonDeNonReprise[] {
  const raisons: RaisonDeNonReprise[] = [];
  if (analyseARelire(identite)) raisons.push('couverture-de-la-demande');
  const page = pageDuNoeud<{ readonly id?: unknown } | null>(sujet.noeud, null)?.id;
  if (typeof page !== 'string') raisons.push('page-des-regles');
  else if (!suivi.pages.has(page)) raisons.push('page-non-suivie');
  if (relues.dependances === null) raisons.push('lecture-refusee:dependances');
  const { dependances } = relues;
  if (dependances) {
    const instancesDuReleve = relues.releve.variants.reduce((total, { layers }) => total + layers.filter((layer) => layer.instanceDe !== undefined).length, 0);
    const pagesEcoutees = courante && memeIdentite(courante.identite, identite) ? courante.pages : new Set<string>();
    const couvertes = instancesCouvertes(dependances, suivi.maitres ?? new Set(), maitresSuivisParLeJournal(dependances, pagesEcoutees).maitres);
    if (couvertes !== dependances.instances || instancesDuReleve > dependances.instances) raisons.push('non-couvert:maitres');
    if (dependances.maitres.some(({ instancesImbriquees }) => instancesImbriquees > 0)) raisons.push('non-couvert:maitres-autres-instances');
    if (dependances.styles.some(({ definition }) => definition === null)) raisons.push('non-couvert:styles');
  }
  raisons.push(...ecartsDesSorties<'releve' | 'catalogue' | 'dependances'>([
    { nom: 'releve', retenue: sorties.releve, relue: relues.releve },
    // Une library choisie autre change tout le catalogue. Le moteur ne lit ni le catalogue ni la library choisie : seules les
    // requêtes qui le lisent se rejouent, par la comparaison de leurs entrées (`creerLesRequetes`).
    ...(egalesExactement(sorties.catalogue.library, relues.catalogue.library) ? [{ nom: 'catalogue' as const, retenue: sorties.catalogue, relue: relues.catalogue }] : []),
    { nom: 'dependances', retenue: sorties.dependances, relue: relues.dependances },
  ]));
  return raisons;
}

/**
 * Valide l'entrée du sujet avant que la demande `identite` reprenne le résultat de son moteur. `null` quand l'entrée n'est
 * pas `utilisable` (`etatDeLEntree`) : rien à valider, la demande suit le chemin complet. Sinon chaque condition de
 * `RaisonDeNonReprise` se vérifie ; quand aucune ne manque, les règles se relisent sur le moteur retenu et se comparent
 * à celles de l'entrée. Une entrée refusée reçoit ses raisons comme marque d'invalidation, levée par la promotion suivante.
 */
export async function validerLEntree(sujet: SujetAAnalyser, identite: IdentiteDAnalyse, relues: SortiesRelues, relireLesRegles: RelireLesRegles): Promise<ValidationDeLEntree | null> {
  const entree = session.entree(sujet.cle);
  if (!entree || etatDeLEntree(sujet.cle).etat !== 'utilisable') return null;
  const raisons = raisonsDeNonReprise(entree, sujet, identite, relues);
  let regles = entree.sorties.regles;
  if (raisons.length === 0) {
    const relu = await relireLesRegles(entree.sorties.moteur);
    if (relu.refusee) raisons.push('lecture-refusee:regles');
    else raisons.push(...ecartsDesSorties([{ nom: 'regles' as const, retenue: entree.sorties.regles, relue: relu.regles }]));
    regles = relu.regles;
  }
  if (raisons.length > 0) {
    session.invalider(sujet.cle, raisons);
    return { etat: 'invalide', raisons };
  }
  return { etat: 'valide', moteur: entree.sorties.moteur, regles };
}

/**
 * Dit dans la trace pourquoi le moteur est repris ou ne l'est pas : `repriseDuMoteur`, ou un `nonReprise:<raison>` par raison.
 * Une entrée absente, invalidée par le journal ou à relire n'a pas été validée : ses raisons sont celles de `etatDeLEntree`.
 */
function compterLaValidation(sujet: string, validation: ValidationDeLEntree | null): void {
  if (validation?.etat === 'valide') return compter('repriseDuMoteur');
  if (validation) {
    for (const raison of validation.raisons) compter(`nonReprise:${raison}`);
    return;
  }
  const etat = etatDeLEntree(sujet);
  if (etat.etat === 'absent') compter('nonReprise:entree-absente');
  else if (etat.etat !== 'utilisable') for (const raison of etat.raisons) compter(`nonReprise:${raison}`);
}

/**
 * Les changements reçus depuis le début d'une demande d'analyse, tant que son inventaire n'est pas connu ; `null` hors
 * de cet intervalle. Le journal les garde aussi, mais sans l'ascendance des nœuds que la décision lit.
 */
let changementsEnAttente: { noeuds: ChangementRecu[]; styles: ChangementDeStyleRecu[] } | null = null;

/** Borne du journal : au-delà, ses lecteurs savent qu'il manque des changements (`debordeDepuis`). */
const BORNE_DU_JOURNAL = 5000;

/**
 * Le journal des changements reçus depuis la première analyse : il survit à la péremption et à l'analyse suivante.
 * `null` avant la première demande d'analyse.
 */
let journal: JournalDeChangements | null = null;

function ouvrirLeJournal(): JournalDeChangements {
  journal ??= creerLeJournal({ borne: BORNE_DU_JOURNAL });
  return journal;
}

/** Le journal des changements, `null` avant la première analyse. */
export function journalDesChangements(): JournalDeChangements | null {
  return journal;
}

/** Sans topologie lue, aucun trou n'est connu et rien n'est couvert : la couverture est inconnue. */
const COUVERTURE_INCONNUE: Couverture = { instances: 'descendues', complete: false, trous: [] };

/**
 * Ouvre une analyse : la génération monte, l'analyse précédente n'est plus la courante. `couverture` est celle de
 * l'inventaire `noeuds` ; les pages que Figma ne laisse pas écouter s'y ajoutent.
 */
export function commencerUneAnalyse(sujet: string, noeuds: Iterable<string>, contexte: Contexte, admis?: Iterable<string>, page?: PageNode, couverture: Couverture = COUVERTURE_INCONNUE, curseur: number = ouvrirLeJournal().marquer(), parents: ReadonlyMap<string, string> = new Map()): IdentiteDAnalyse {
  generation += 1;
  const identite = { sujet, generation };
  const tous = new Set(noeuds);
  const nonEcoutees = contexte.surveillerLeDocument(page) ?? [];
  const pages = new Set<string>();
  for (const candidate of [page, contexte.figma.currentPage]) if (typeof candidate?.id === 'string') pages.add(candidate.id);
  courante = { identite, noeuds: tous, admis: admis ? new Set(admis) : tous, couverture: avecLesPagesNonEcoutees(couverture, nonEcoutees), curseur, parents, pages, maitres: new Set(), corrections: new Map(), constats: new Map(), releve: null, catalogue: null, finalisee: false, perimee: false };
  return identite;
}

export function analyseCourante(): IdentiteDAnalyse | null {
  return courante?.identite ?? null;
}

/** Le curseur du journal au début de la demande de l'analyse `identite` ; `null` quand cette identité n'est plus la courante. */
export function curseurDeLAnalyse(identite: IdentiteDAnalyse): number | null {
  return courante && memeIdentite(courante.identite, identite) ? courante.curseur : null;
}

/** La couverture de la surveillance de l'analyse `identite` ; `null` quand cette identité n'est plus la courante. */
export function couvertureDeLAnalyse(identite: IdentiteDAnalyse): Couverture | null {
  return courante && memeIdentite(courante.identite, identite) ? courante.couverture : null;
}

/** Vrai quand une réutilisation de l'analyse `identite` doit relire Figma : couverture incomplète ou inconnue, ou analyse qui n'est plus la courante. */
export function analyseARelire(identite: IdentiteDAnalyse): boolean {
  const couverture = couvertureDeLAnalyse(identite);
  if (couverture === null || doitEtreRelue(couverture)) return true;
  return couvertureInterrompue(identite) || ecritureDepuisLAnalyse(identite);
}

/** Vrai quand une écriture du plugin ou un changement de configuration est postérieur au curseur de l'analyse `identite`. */
export function ecritureDepuisLAnalyse(identite: IdentiteDAnalyse): boolean {
  if (!courante || !journal || !memeIdentite(courante.identite, identite)) return false;
  return journal.ecritureDepuis(courante.curseur);
}

/** Vrai quand une page de l'analyse a cessé d'être écoutée, ou que le journal a perdu des changements, depuis son curseur. */
export function couvertureInterrompue(identite: IdentiteDAnalyse): boolean {
  if (!courante || !journal || !memeIdentite(courante.identite, identite)) return false;
  return journal.couvertureDepuis(courante.curseur, courante.pages).etat === 'interrompue';
}

/**
 * Une page a cessé d'être écoutée (quittée, ou que Figma refuse d'écouter). Le journal l'inscrit ; l'analyse courante
 * dont c'est une page ne reçoit plus ses changements et se périme.
 */
export function surInterruptionDePage(page: string, raison: RaisonDInterruption, contexte: Contexte): void {
  ouvrirLeJournal().signaler(page, raison);
  if (courante?.pages.has(page)) perimer('document', contexte);
}

const memeIdentite = (a: IdentiteDAnalyse, b: IdentiteDAnalyse): boolean => a.sujet === b.sujet && a.generation === b.generation;

/**
 * Retient les corrections des constats que l'analyse `identite` vient de rendre ;
 * une autre analyse courante les ignore. `tous` ajoute les constats écartés
 * (ignorés), `releve` sert à bâtir la correction qu'une réponse tire.
 */
export function retenirLesCorrections(identite: IdentiteDAnalyse, constats: readonly Constat[], releve: ReleveDeComposant | null = null, tous: readonly Constat[] = constats, catalogue: CatalogueDeReference | null = null): void {
  if (!courante || !memeIdentite(courante.identite, identite)) return;
  courante.finalisee = true;
  courante.catalogue = catalogue;
  courante.corrections = new Map(constats.flatMap((constat) => (constat.correction ? [[constat.correction.id, constat.correction] as const] : [])));
  courante.constats = new Map(tous.map((constat) => [constat.id, constat] as const));
  courante.releve = releve;
}

/** Le catalogue de l'analyse `identite`, `null` quand elle n'est plus la courante ou n'en a pas lu. */
export function catalogueDeLAnalyse(identite: IdentiteDAnalyse): CatalogueDeReference | null {
  return courante && courante.finalisee && memeIdentite(courante.identite, identite) ? courante.catalogue : null;
}

/**
 * Ajoute les corrections et les constats d'une propagation depuis un modèle à
 * l'analyse `identite`, sans toucher aux autres. `false` quand cette identité
 * n'est plus la courante ou que l'analyse est périmée.
 */
export function retenirLaPropagation(identite: IdentiteDAnalyse, constats: readonly Constat[]): boolean {
  if (!courante || !courante.finalisee || courante.perimee || !memeIdentite(courante.identite, identite)) return false;
  courante.corrections = new Map([...courante.corrections, ...constats.flatMap((constat) => (constat.correction ? [[constat.correction.id, constat.correction] as const] : []))]);
  courante.constats = new Map([...courante.constats, ...constats.map((constat) => [constat.id, constat] as const)]);
  return true;
}

/** Le constat de l'analyse `identite`, ignoré ou non ; `null` quand cette identité n'est plus la courante. */
export function constatDeLAnalyse(identite: IdentiteDAnalyse, id: string): Constat | null {
  if (!courante || !courante.finalisee || !memeIdentite(courante.identite, identite)) return null;
  return courante.constats.get(id) ?? null;
}

/** Le constat dont la question porte l'identifiant `question`. */
export function constatDeLaQuestion(identite: IdentiteDAnalyse, question: string): Constat | null {
  if (!courante || !courante.finalisee || courante.perimee || !memeIdentite(courante.identite, identite)) return null;
  return [...courante.constats.values()].find((constat) => constat.question?.id === question) ?? null;
}

export function releveDeLAnalyse(identite: IdentiteDAnalyse): ReleveDeComposant | null {
  return courante && courante.finalisee && memeIdentite(courante.identite, identite) ? courante.releve : null;
}

/**
 * Pose ou retire la correction `id` du lot de l'analyse `identite` : la réponse
 * à une question en pose une, Annuler la réponse et Ignorer la retirent.
 * `false` quand cette identité n'est plus la courante.
 */
export function fixerUneCorrection(identite: IdentiteDAnalyse, id: string, correction: Correction | null): boolean {
  if (!courante || !courante.finalisee || !memeIdentite(courante.identite, identite)) return false;
  const suivantes = new Map(courante.corrections);
  if (correction) suivantes.set(id, correction);
  else suivantes.delete(id);
  courante.corrections = suivantes;
  return true;
}

/**
 * Les corrections de l'analyse `identite`, par identifiant. `null` quand cette
 * identité n'est plus la courante, que l'analyse est périmée ou que son résultat
 * final manque : rien ne s'écrit alors.
 */
export function correctionsDeLAnalyse(identite: IdentiteDAnalyse): ReadonlyMap<string, Correction> | null {
  if (!courante || !courante.finalisee || courante.perimee || !memeIdentite(courante.identite, identite)) return null;
  return courante.corrections;
}

/**
 * Vrai quand l'analyse `identite` est la courante et que son résultat final a retenu ses corrections. Pendant le provisoire, ou après une fin
 * annulée ou arrêtée, aucune réponse, aucun Ignorer ni aucune préparation ne s'appuie sur elle.
 */
export function analyseFinalisee(identite: IdentiteDAnalyse): boolean {
  return courante !== null && courante.finalisee && memeIdentite(courante.identite, identite);
}

/** Oublie l'analyse courante, sans toucher à la génération. */
export function oublierLAnalyse(): void {
  courante = null;
}

function perimer(cause: CauseDePeremption, contexte: Contexte): void {
  if (!courante || courante.perimee) return;
  courante.perimee = true;
  if (operation?.connue && memeIdentite(operation.connue, courante.identite)) operation.cloreMesure?.('perimee');
  contexte.envoyer({ type: 'perime', analyse: courante.identite, cause });
}

/**
 * À appeler quand le plugin vient d'écrire (document) ou de changer effectivement la configuration. L'écriture entre au journal avec le
 * sujet entier pour portée, même sans analyse courante ; l'analyse courante se périme. Un refus ou une valeur identique n'appelle pas.
 */
export function perimerApresUneEcriture(contexte: Contexte, origine: OrigineDEcriture = 'ecriture'): void {
  ouvrirLeJournal().signalerUneEcriture(origine);
  perimer('ecriture', contexte);
}

/**
 * Dernier contrôle avant le résultat final, après une cession de la main : les changements du nœud et du style se jugent à
 * leur réception, donc déjà ; reste ce que le journal sait sans nœud. Une écriture du plugin ou un journal débordé depuis le
 * curseur de l'analyse la rendent inapplicable (`perimee`), le résultat restant lisible. Les interruptions de page ne comptent
 * pas ici : `surveillerLeDocument` en inscrit une à chaque demande pour une page que Figma refuse, et cette couverture
 * incomplète est déjà dite par `analyseARelire`.
 */
function verifierLaGeneration(contexte: Contexte): void {
  if (!courante || courante.perimee || !journal) return;
  if (journal.ecritureDepuis(courante.curseur)) perimer('document', contexte);
}

/** Un identifiant seul (tests) se lit comme une propriété changée d'un nœud sans parent : hors de l'inventaire, il n'a pas de portée. */
const enChangement = (changement: string | ChangementRecu): ChangementRecu =>
  typeof changement === 'string' ? { type: 'PROPERTY_CHANGE', id: changement, node: { id: changement, parent: null } } : changement;

/**
 * Les anciens parents que connaît l'analyse courante : la topologie de l'inventaire, puis `depuisLeCurseur`, ce que le
 * journal a vu de ses nœuds. Un nœud vu sans parent lisible (supprimé, illisible) vaut `null`.
 */
function ancienParents(depuisLeCurseur: ReadonlyMap<string, string | null>): AnciensParents | null {
  if (!courante || !journal) return null;
  const { parents, curseur } = courante;
  const perdu = journal.debordeDepuis(curseur);
  return {
    deborde: perdu,
    parentDe(id) {
      const vu = depuisLeCurseur.get(id);
      if (typeof vu === 'string') return vu;
      return parents.get(id) ?? (vu === null ? null : undefined);
    },
  };
}

/** Ce que le journal a appris des parents depuis le curseur de l'analyse courante : le dernier parent lisible de chaque nœud. */
function parentsVusParLeJournal(): Map<string, string | null> {
  const vus = new Map<string, string | null>();
  if (!courante || !journal) return vus;
  for (const entree of journal.depuis(courante.curseur)) {
    if (entree.nature !== 'noeud') continue;
    if (entree.parent !== null) vus.set(entree.id, entree.parent);
    else if (!vus.has(entree.id)) vus.set(entree.id, null);
  }
  return vus;
}

/** Périme l'analyse courante quand un changement touche le jeu analysé ou que sa portée est inconnue. */
function jugerLesNoeuds(changements: readonly ChangementRecu[], contexte: Contexte, depuisLeCurseur: ReadonlyMap<string, string | null>): void {
  if (!courante || courante.perimee || changements.length === 0) return;
  const anciens = ancienParents(depuisLeCurseur) ?? undefined;
  if (porteeDesChangements(changements, { noeuds: courante.noeuds, maitres: courante.maitres }, anciens).portee !== 'hors-sujet') perimer('document', contexte);
}

/**
 * Les dépendances de l'analyse `identite` sont lues : ses maîtres locaux suivis, avec leurs descendants, entrent dans ce
 * qui touche le sujet. Les changements déjà au journal depuis le curseur se rejugent contre eux, parce qu'un événement
 * reçu avant cette lecture a pu viser un maître que l'on ne connaissait pas.
 */
function suivreLesMaitres(identite: IdentiteDAnalyse, noeuds: ReadonlySet<string>, contexte: Contexte): void {
  if (!courante || !memeIdentite(courante.identite, identite) || noeuds.size === 0) return;
  courante.maitres = noeuds;
  if (courante.perimee || !journal) return;
  const { curseur, admis, parents, pages, couverture, maitres } = courante;
  const raisons = raisonsDInvalidation({ curseur, noeuds: courante.noeuds, admis, parents, pages, couverture, maitres }, curseur, journal);
  if (raisons.includes('sujet-touche') || raisons.includes('portee-inconnue')) perimer('document', contexte);
}

/** Périme l'analyse courante pour un changement de style : elle ne sait pas quels styles elle a lus. */
function jugerLesStyles(changements: readonly ChangementDeStyleRecu[], contexte: Contexte): void {
  if (!courante) return;
  if (porteeDesChangementsDeStyle(changements, null).portee !== 'hors-sujet') perimer('document', contexte);
}

/**
 * `nodechange` de la page. Le journal inscrit chaque changement, même sans analyse courante ou après sa péremption.
 * La portée décide avant l'inscription : un nœud de l'inventaire, un calque sous l'un d'eux, un nœud supprimé ou déplacé
 * dont l'ancien parent est dans l'inventaire, ou une portée inconnue (dont un journal débordé) périme l'analyse. Tant qu'une demande d'analyse n'a pas son inventaire, les changements sont gardés pour
 * `rejouerLesEvenementsRecus`.
 */
export function surChangementDuDocument(recus: Iterable<string | ChangementRecu>, contexte: Contexte): void {
  const changements = [...recus].map(enChangement);
  // La décision lit les parents d'avant ces changements : elle précède leur inscription.
  jugerLesNoeuds(changements, contexte, parentsVusParLeJournal());
  journal?.enregistrer(changements.map((changement) => ({ nature: 'noeud', ...changement })));
  if (changementsEnAttente) changementsEnAttente.noeuds.push(...changements);
}

/**
 * `stylechange` : les changements de style, inscrits au journal comme les nœuds. L'analyse ne sait pas quels styles
 * ses lecteurs ont lus (le relevé, le moteur et les effets les chargent chacun) : tout changement de style d'un type
 * connu la périme.
 */
export function surChangementDeStyle(changements: Iterable<ChangementDeStyleRecu>, contexte: Contexte): void {
  const recus = [...changements];
  journal?.enregistrer(recus.map((changement) => ({ nature: 'style', ...changement })));
  if (changementsEnAttente) changementsEnAttente.styles.push(...recus);
  jugerLesStyles(recus, contexte);
}

/** L'inventaire de l'analyse courante est connu : les changements gardés se jugent contre lui, puis la garde se ferme. */
function rejouerLesEvenementsRecus(contexte: Contexte): void {
  const attente = changementsEnAttente;
  changementsEnAttente = null;
  if (!attente) return;
  // Le journal ne contient alors que ces changements : leurs anciens parents ne viennent que de la topologie.
  jugerLesNoeuds(attente.noeuds, contexte, new Map());
  jugerLesStyles(attente.styles, contexte);
}

/**
 * Une sélection a changé. `sujetId` est le composant que la sélection désigne,
 * `null` quand elle n'en désigne aucun : une sélection vide ou hors composant
 * ne périme pas l'analyse.
 */
export function surSelection(sujetId: string | null, origine: OrigineDeSelection, contexte: Contexte): void {
  if (!courante || origine === 'plugin' || sujetId === null) return;
  if (!courante.admis.has(sujetId)) perimer('selection', contexte);
}


/** Le jeu de variants que la sélection désigne : sa clé, le nœud que les lectures reçoivent et ses nœuds. */
export interface SujetAAnalyser {
  readonly cle: string;
  readonly noeud: NoeudLu;
  /** Le jeu, ses variants et leurs calques. */
  readonly noeuds: readonly string[];
  /** Le jeu et ses variants : une sélection d'un autre nœud, calque ou composant imbriqué, périme l'analyse. Absent : `noeuds`. */
  readonly admis?: readonly string[];
  /** La couverture de `noeuds` ; absente, elle est inconnue et l'analyse doit être relue avant toute réutilisation. */
  readonly couverture?: Couverture;
  /** Le parent des sommets de l'inventaire (variants → jeu). Absent : aucun ancien parent connu. */
  readonly parents?: ReadonlyMap<string, string>;
}

/** L'issue d'une lecture des libraries lancée en avance : une promesse qui ne rejette jamais, l'erreur y est une valeur. */
export type LibrariesEnAvance = Promise<{ readonly lecture: LectureDesLibraries } | { readonly erreur: unknown }>;

/** Les lectures de Figma d'une analyse : le sandbox donne les siennes, les tests des doubles. */
export interface Lecteurs {
  /** Le sujet de la sélection, `null` hors de tout composant. */
  sujet(contexte: Contexte): Promise<SujetAAnalyser | null>;
  releve(sujet: SujetAAnalyser, jeton: JetonDAnnulation, contexte: Contexte, progresser?: (fait: number, total: number) => void, cooperation?: ContexteCooperatif): Promise<IssueDuReleve>;
  /**
   * Les libraries activées, lues sans le relevé. L'analyse les lance avec le relevé et passe leur issue à `catalogue` ;
   * sans ce lecteur, `catalogue` les lit après le relevé.
   */
  bibliotheques?(contexte: Contexte, cooperation?: ContexteCooperatif): Promise<LectureDesLibraries>;
  /** `inventaires` est celui de la demande : les libraries et les variables locales s'y lisent une fois pour tous les lecteurs. */
  catalogue(releve: ReleveDeComposant, jeton: JetonDAnnulation, contexte: Contexte, cooperation?: ContexteCooperatif, libraries?: LibrariesEnAvance, inventaires?: InventairesDeLaDemande): Promise<CatalogueDeReference>;
  moteur(sujet: SujetAAnalyser, jeton: JetonDAnnulation, contexte: Contexte, progresser?: (phase: PhaseDAnalyse) => void, cooperation?: ContexteCooperatif, inventaires?: InventairesDeLaDemande): Promise<ResultatSansPublication>;
  /** Les règles d'usage du composant, lues avec les props, le modèle d'états et les imbriqués du moteur ; sans lecteur, aucun constat C43 ni C45. */
  regles?(sujet: SujetAAnalyser, interne: SurfaceDuMoteurRetenu, contexte: Contexte, inventaires?: InventairesDeLaDemande): Promise<ReleveDesRegles>;
  /** Ce que le moteur lit hors du relevé et du catalogue, lu avant lui. Sans ce lecteur, aucune demande ne valide ni ne reprend une entrée de session. */
  dependances?(sujet: SujetAAnalyser, contexte: Contexte, inventaires?: InventairesDeLaDemande, cooperation?: ContexteCooperatif): Promise<DependancesDuMoteur>;
  /** Le niveau d'accessibilité rangé ; AA sans lecteur. */
  niveau?(contexte: Contexte): Promise<NiveauDAccessibilite>;
  /** Les clés d'Ignorer rangées dans le document ; aucune sans lecteur. */
  ignores?(contexte: Contexte): Promise<readonly string[]>;
}

const estUnVariant = (noeud: NoeudLu): boolean => noeud.type === 'COMPONENT' && noeud.parent?.type === 'COMPONENT_SET';

async function sujetDeFigma(contexte: Contexte): Promise<SujetAAnalyser | null> {
  const depart = selectionLue(contexte.figma)[0];
  const trouve = depart ? sujetDe(depart) : null;
  if (!trouve) return null;
  let { sujet } = trouve;
  if (sujet.type === 'INSTANCE') {
    const maitre = await sujet.getMainComponentAsync?.().catch(() => null);
    if (!maitre) return null;
    sujet = maitre;
  }
  const jeu = sujet.type !== 'COMPONENT_SET' && estUnVariant(sujet) && sujet.parent ? sujet.parent : sujet;
  // Un `children` ou un `findAll` qui lève laisse un trou dans la couverture, et seuls les nœuds lus font périmer l'analyse.
  const topologie = lireLaTopologieDuJeu(jeu as unknown as NoeudALire);
  const inventaire = inventaireDePeremption(topologie);
  const parents = new Map<string, string>();
  for (const noeud of Object.values(topologie.topologie)) if (noeud.parent !== null) parents.set(noeud.id, noeud.parent);
  const cle = (jeu as unknown as { key?: unknown }).key;
  return { cle: typeof cle === 'string' && cle !== '' ? cle : jeu.id, noeud: jeu, noeuds: inventaire.noeuds, admis: inventaire.admis, couverture: inventaire.couverture, parents };
}

function portDuComposant({ figma }: Contexte): PortDuComposant {
  return {
    selection: () => selectionLue(figma),
    getNodeByIdAsync: (id) => attendrePourLaMesure(() => figma.getNodeByIdAsync(id), 'api') as unknown as Promise<NoeudLu | null>,
    getStyleByIdAsync: (id) => attendrePourLaMesure(() => figma.getStyleByIdAsync(id), 'api') as never,
    variables: portDeLecture(figma),
    pause: () => new Promise((resolve) => setTimeout(resolve, 0)),
  };
}

/** Le nombre de calques liés, par clé de variable : de quoi départager des libraries. */
function liaisonsParCle(releve: ReleveDeComposant): Map<string, number> {
  const comptes = new Map<string, number>();
  for (const variant of releve.variants) {
    for (const layer of variant.layers) {
      for (const cle of new Set(layer.liaisons.map((liaison) => liaison.variable.cle))) comptes.set(cle, (comptes.get(cle) ?? 0) + 1);
    }
  }
  return comptes;
}

/**
 * Le catalogue de référence : la library choisie, sinon les variables du fichier. Avec `libraries`, la lecture des
 * libraries est déjà lancée : la fonction attend son issue au lieu de la relancer, et une erreur y garde le repli sur
 * le fichier. Avec `inventaires`, la lecture des libraries et celle des variables locales, quand une autre de la
 * demande les a faites, sont reprises.
 */
export async function catalogueDeFigma(releve: ReleveDeComposant, jeton: JetonDAnnulation, contexte: Contexte, cooperation?: ContexteCooperatif, libraries?: LibrariesEnAvance, inventaires?: InventairesDeLaDemande): Promise<CatalogueDeReference> {
  const { figma } = contexte;
  const liaisons = liaisonsParCle(releve);
  try {
    let lecture: LectureDesLibraries;
    if (libraries) {
      // Ce qui reste à attendre des libraries après le relevé ; sa durée, avec celle de la phase `libraries`, donne le chevauchement.
      etape('catalogue-attente-libraries');
      const issue = await libraries;
      if ('erreur' in issue) throw issue.erreur;
      lecture = issue.lecture;
      etape('catalogue-valeurs');
    } else {
      const lireLesLibrariesDuFichier = () => lireLesLibraries(figma as unknown as PortDeBibliotheque, cooperation);
      lecture = await (inventaires ? inventaires.libraries(lireLesLibrariesDuFichier) : lireLesLibrariesDuFichier());
    }
    if (lecture.etat === 'lue') {
      const choisie = libraryDeReference(lecture.collections, liaisons, lireLaLibraryRangee(figma));
      if (choisie !== null) {
        const catalogue = await lireLeCatalogueDeLibrary(figma as unknown as PortDeBibliotheque, choisie, lecture);
        if (catalogue.etat === 'lu') {
          // C29 compare les valeurs en dur aux tokens de taille du composant : on charge celles-là, et chargerLesValeurs suit leurs alias.
          const tailles = mesurerSousCompteur('msTokensDeTailleCatalogue', () => clesDesTokensDeTailleAttendus(releve, catalogue.catalogue));
          return (await chargerLesValeurs(portDeLecture(figma), catalogue.catalogue, [...liaisons.keys(), ...tailles])).catalogue;
        }
      }
    }
  } catch (erreur) {
    if (erreur instanceof AnalyseAnnulee) throw erreur;
    // La library ne se lit pas : le catalogue du fichier ouvert suit.
  }
  const port = portDeLecture(figma);
  const locales = await (inventaires ? inventaires.variablesLocales(() => port.getLocalVariablesAsync()) : port.getLocalVariablesAsync());
  const lues = await lireLesVariables(port, locales.map((variable) => variable.id), { annulee: () => jeton.leve });
  const architecture = lireLaDeclaration(figma) === 'ucm' ? 'ucm' : 'libre';
  return catalogueDuFichier({ collections: [...(lues?.collections.values() ?? [])], variables: [...(lues?.variables.values() ?? [])] }, architecture);
}

/**
 * La page qui porte `noeud` : on remonte `parent` jusqu'au nœud `PAGE`. Le
 * maître d'une instance peut vivre sur une autre page que la page courante, et
 * le moteur y cherche les règles d'usage. Sans page trouvée : `repli`.
 */
export function pageDuNoeud<T>(noeud: { readonly type?: string; readonly parent?: unknown } | null | undefined, repli: T): T {
  let courant = noeud as { type?: string; parent?: unknown } | null | undefined;
  for (let i = 0; courant && i < 1000; i += 1) {
    if (courant.type === 'PAGE') return courant as unknown as T;
    courant = courant.parent as typeof courant;
  }
  return repli;
}

/** Un nœud tel que le parcours des dépendances le lit. */
interface NoeudDeDependance {
  readonly id?: unknown;
  readonly type?: string;
  readonly parent?: unknown;
  readonly remote?: unknown;
  readonly textStyleId?: unknown;
  readonly effectStyleId?: unknown;
  findAll?(filtre: (noeud: NoeudDeDependance) => boolean): readonly NoeudDeDependance[];
  getMainComponentAsync?(): Promise<NoeudDeDependance | null>;
}

/** Une valeur de style en données simples : les paints, effets et grilles de Figma deviennent des objets comparables. */
function valeurSimple(valeur: unknown): unknown {
  const texte = JSON.stringify(valeur);
  return texte === undefined ? null : JSON.parse(texte) as unknown;
}

/** La définition du style `id`, `null` quand il ne se lit pas : un identifiant mixte, un style introuvable ou refusé. */
async function definitionDuStyle(figma: PluginAPI, id: string): Promise<unknown> {
  if (id === 'mixte') return null;
  try {
    const style = await (figma as unknown as { getStyleByIdAsync?(id: string): Promise<Record<string, unknown> | null> }).getStyleByIdAsync?.(id);
    if (!style) return null;
    const definition: Record<string, unknown> = {};
    for (const propriete of PROPRIETES_DE_STYLE) definition[propriete] = valeurSimple(style[propriete]);
    return definition;
  } catch (erreur) {
    if (erreur instanceof AnalyseAnnulee) throw erreur;
    return null;
  }
}

/** Le maître d'une instance tel que le moteur le lira ; `null` quand il ne se lit pas. */
async function decrireLeMaitre(maitre: NoeudDeDependance): Promise<Omit<MaitreDeDependance, 'instances'> | null> {
  try {
    if (typeof maitre.id !== 'string') return null;
    const remote = typeof maitre.remote === 'boolean' ? maitre.remote : null;
    const pageId = pageDuNoeud<{ readonly id?: unknown } | null>(maitre as { type?: string; parent?: unknown }, null)?.id;
    const noeuds: string[] = [];
    let instancesImbriquees = 0;
    let noms: readonly string[] | null = null;
    if (remote === false) {
      // Un variant se lit avec son jeu : le moteur en lit les propriétés et les autres variants.
      const parent = maitre.parent as NoeudDeDependance | null | undefined;
      const racine = maitre.type === 'COMPONENT' && parent?.type === 'COMPONENT_SET' ? parent : maitre;
      for (const noeud of [racine, ...(racine.findAll?.(() => true) ?? [])]) {
        if (typeof noeud.id === 'string') noeuds.push(noeud.id);
        if (noeud !== racine && noeud.type === 'INSTANCE') instancesImbriquees += 1;
      }
      const page = pageDuNoeud<PageNode | null>(maitre as { type?: string; parent?: unknown }, null);
      if (page) noms = [...nomsDeLaPage(page)];
    }
    return { id: maitre.id, remote, page: typeof pageId === 'string' ? pageId : null, noeuds, instancesImbriquees, nomsDeLaPage: noms };
  } catch {
    return null;
  }
}

const idDuNoeud = (noeud: { readonly id: string } | null): string | null => noeud?.id ?? null;

/**
 * Le scan des règles, chaque nœud de son relevé réduit à son identifiant. Un nœud qu'un autre champ porterait se compare
 * par identité, et la validation refuse alors l'entrée.
 */
function reglesSansNoeuds(regles: ExtractedRules): unknown {
  const { releve } = regles;
  return {
    ...regles,
    releve: { conteneurDuComposant: releve.conteneurDuComposant, conteneurVierge: idDuNoeud(releve.conteneurVierge), maitreLocal: idDuNoeud(releve.maitreLocal), instanceSource: idDuNoeud(releve.instanceSource) },
  };
}

/**
 * Les dépendances du moteur, lues dans Figma. Avec `inventaires`, le scan des règles et les listes locales sont ceux que
 * le moteur de la même demande reprend. Les styles et les instances viennent d'un parcours du jeu par `findAll` ; un
 * texte dont `textStyleId` n'est pas une chaîne compte comme `mixte`. Chaque style se relit par identifiant (local ou
 * distant), et chaque instance par `getMainComponentAsync` : un style ou un maître qui ne se lit pas manque à la liste et
 * refuse la reprise. Les scans et les listes qui lèvent font lever la lecture.
 */
export async function dependancesDeFigma(sujet: SujetAAnalyser, { figma }: Contexte, inventaires?: InventairesDeLaDemande, cooperation?: ContexteCooperatif): Promise<DependancesDuMoteur> {
  const composant = sujet.noeud as unknown as ComponentSetNode;
  const page = pageDuNoeud(sujet.noeud, figma.currentPage);
  const scanDesRegles = () => extractRules(composant, page);
  const lireLesCollections = () => figma.variables.getLocalVariableCollectionsAsync();
  const lireLesVariables = () => figma.variables.getLocalVariablesAsync();
  const [regles, collections, variables] = await Promise.all([
    inventaires ? inventaires.reglesDeLaPage(page, composant, scanDesRegles) : scanDesRegles(),
    inventaires ? inventaires.collectionsLocales(lireLesCollections) : lireLesCollections(),
    inventaires ? inventaires.variablesLocales(lireLesVariables) : lireLesVariables(),
  ]);
  const jeu = sujet.noeud as unknown as NoeudDeDependance;
  const identifiants: string[] = [];
  const lesInstances: NoeudDeDependance[] = [];
  for (const noeud of [jeu, ...(jeu.findAll?.(() => true) ?? [])]) {
    await cooperation?.cederSiBesoin();
    if (noeud.type === 'INSTANCE') lesInstances.push(noeud);
    if (noeud.type === 'TEXT') {
      const style = noeud.textStyleId;
      if (typeof style !== 'string') identifiants.push('mixte');
      else if (style !== '') identifiants.push(style);
    }
    const effet = noeud.effectStyleId;
    if (typeof effet === 'string' && effet !== '') identifiants.push(effet);
  }
  const definitions = new Map<string, unknown>();
  const styles: StyleDeDependance[] = [];
  for (const id of identifiants) {
    await cooperation?.cederSiBesoin();
    if (!definitions.has(id)) definitions.set(id, await definitionDuStyle(figma, id));
    styles.push({ id, definition: definitions.get(id) });
  }
  const lus = new Map<string, { maitre: Omit<MaitreDeDependance, 'instances'>; instances: number }>();
  for (const instance of lesInstances) {
    await cooperation?.cederSiBesoin();
    let natif: NoeudDeDependance | null = null;
    try {
      natif = await instance.getMainComponentAsync?.() ?? null;
    } catch (erreur) {
      if (erreur instanceof AnalyseAnnulee) throw erreur;
    }
    const id = natif?.id;
    if (!natif || typeof id !== 'string') continue;
    const deja = lus.get(id);
    if (deja) {
      deja.instances += 1;
      continue;
    }
    const maitre = await decrireLeMaitre(natif);
    if (maitre) lus.set(id, { maitre, instances: 1 });
  }
  return {
    regles: reglesSansNoeuds(regles),
    collectionsLocales: collections.map(({ id, name }) => ({ id, nom: name })),
    variablesLocales: variables.map(({ id, name, variableCollectionId }) => ({ id, nom: name, collection: variableCollectionId })),
    styles,
    instances: lesInstances.length,
    maitres: [...lus.values()].map(({ maitre, instances }) => ({ ...maitre, instances })),
  };
}

export const LECTEURS_DE_FIGMA: Lecteurs = {
  sujet: sujetDeFigma,
  releve: (sujet, jeton, contexte, progresser, cooperation) => lireLeReleve(portDuComposant(contexte), sujet.noeud, {
      budgetDeLayers: BUDGET_DE_LAYERS_PAR_DEFAUT,
      jeton,
      cooperation,
    progresser,
    espaceDeCouleur: contexte.figma.root.documentColorProfile === 'DISPLAY_P3' ? 'display-p3' : 'srgb',
  }),
  bibliotheques: ({ figma }, cooperation) => lireLesLibrariesAuClic(figma, cooperation),
  catalogue: catalogueDeFigma,
  niveau: ({ figma }) => lireLeNiveau(figma),
  ignores: async ({ figma }) => lireLesIgnores(figma),
  regles: (sujet, interne, _contexte, inventaires) => lireLesRegles(sujet.noeud as unknown as ComponentSetNode, interne, inventaires),
  dependances: dependancesDeFigma,
  moteur: async (sujet, jeton, { figma }, progresser, cooperation, inventaires) => {
    const resultat = await analyserLeComposant(async (texte) => {
      progresser?.(texte.includes('variables') ? 'structure' : 'imbriques');
    }, {
      composant: sujet.noeud as unknown as ComponentSetNode,
      page: pageDuNoeud(sujet.noeud, figma.currentPage),
      budgetDeLayers: BUDGET_DE_LAYERS_PAR_DEFAUT,
      jeton,
      cooperation,
      inventaires,
      respirer: () => new Promise((resolve) => setTimeout(resolve, 0)),
      publier: false,
    });
    // La phase « structure » finissait avec les annonces de la publication, que ce lecteur n'émet plus.
    if (resultat.etat === 'calculee') progresser?.('structure');
    return resultat;
  },
};

interface Operation {
  progresser?: (phase: PhaseDAnalyse, fait?: number, total?: number) => void;
  demande?: number;
  cloreMesure?: (fin: string, contenu?: string) => TraceDeMesure | null;
  /** Connue dès que le sujet est résolu ; une seconde demande l'attend pour répondre `occupe`. */
  readonly identite: Promise<IdentiteDAnalyse>;
  connue: IdentiteDAnalyse | null;
  readonly jeton: { leve: boolean };
  /** Se résout quand l'opération a rendu la place ; absent d'une écriture, qui ne s'interrompt pas. */
  fini?: Promise<void>;
}

let operation: Operation | null = null;
const mesuresEnvoyees = new Map<number, { reception: number; identite: IdentiteDAnalyse; envois: Partial<Record<import('../messages/analyse').RenduDAnalyse, number>> }>();

const messageDErreur = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));

/**
 * Les contrôles du kit, famille par famille dans l'ordre du produit ; le budget partagé se consulte avant chacune, et chacune
 * ouvre l'étape qui porte son nom. `famille` décide de la reprendre ou de la calculer (`creerLesRequetes`). Rend les constats
 * rassemblés et ceux de chaque famille jugée.
 */
async function controlesDuKit(
  releve: ReleveDeComposant, catalogue: CatalogueDeReference, niveau: NiveauDAccessibilite, architectureUcm: boolean, cooperation: ContexteCooperatif,
  famille: (nom: NomDeFamille, calculer: () => Promise<Constat[]>) => Promise<readonly Constat[]>,
): Promise<{ constats: Constat[]; parFamille: Partial<Record<NomDeFamille, readonly Constat[]>> }> {
  const calculs: Record<NomDeFamille, () => Generator<void, Constat[]>> = {
    'controle-nommage': () => controlerNommageParEtapes(releve, catalogue),
    'controle-mapping': () => controlerMappingParEtapes(releve, catalogue),
    'controle-couches': () => controlerCouchesParEtapes(releve, catalogue),
    'controle-oublis': () => controlerOublisParEtapes(releve, catalogue),
    'controle-accessibilite': () => controlerLAccessibiliteParEtapes(releve, catalogue, { niveau }),
    'controle-typographie': () => controlerLaTypographieParEtapes(releve, catalogue),
    'controle-theme': () => controlerLeThemeParEtapes(releve, catalogue),
    'controle-structure': () => controlerLaStructureParEtapes(releve, catalogue),
  };
  const constats: Constat[] = [];
  const parFamille: Partial<Record<NomDeFamille, readonly Constat[]>> = {};
  for (const nom of FAMILLES_DE_CONTROLES) {
    if (!architectureUcm && FAMILLES_UCM.includes(nom)) continue;
    await cooperation.cederSiBesoin();
    etape(nom);
    const resultat = await famille(nom, () => calculerParEtapes(calculs[nom](), cooperation));
    parFamille[nom] = resultat;
    constats.push(...resultat);
  }
  return { constats, parFamille };
}

/**
 * Un calcul du kit (contrôle ou corrections) conduit par tranches : une tranche enchaîne les étapes jusqu'à ce que le
 * budget soit écoulé ou le jeton levé, puis cède. Une étape du kit peut couvrir 256 variables : un nombre fixe
 * d'étapes par tranche ne bornerait pas sa durée.
 */
async function calculerParEtapes<T>(calcul: Generator<void, T>, cooperation: ContexteCooperatif, phase: 'controles' | 'corrections' = 'controles'): Promise<T> {
  for (;;) {
    await cooperation.cederSiBesoin();
    const fin = mesurerLeCalcul(() => {
      for (;;) {
        const suivant = calcul.next();
        if (suivant.done) return suivant;
        if (cooperation.doitCeder()) return null;
      }
    }, phase, true);
    if (fin) return fin.value;
  }
}

/** L'unique constat d'une analyse arrêtée : le code C42 sert de réserve à la famille `export`. */
function bloquant(message: string): Constat {
  return { id: 'export:arret', code: 'C42', type: 'bloquant', famille: 'export', variants: [], layers: [], faits: { message } };
}

/** L'intention d'une demande ; un ancien émetteur n'en envoie pas et demande un Analyser. */
export const intentionDe = (demande: Extract<DemandeDAnalyse, { type: 'analyser' }>): IntentionDAnalyse => demande.intention ?? 'analyser';

/**
 * Vrai quand la demande peut reprendre un résultat d'une demande précédente, après validation. Actualiser n'en reprend aucun.
 * Point unique : toute mémoire entre demandes se branche ici, et seulement ici.
 */
export const reutilisationPermise = (demande: Extract<DemandeDAnalyse, { type: 'analyser' }>): boolean => intentionDe(demande) === 'analyser';

async function analyser(contexte: Contexte, lecteurs: Lecteurs, demande: Extract<DemandeDAnalyse, { type: 'analyser' }>, optionsDeCooperation: Omit<OptionsDeCooperation, 'jeton'>): Promise<void> {
  // Une analyse déjà périmée ne sert plus à personne : sa suite annulée, la nouvelle demande est servie. Une opération non périmée,
  // et toute écriture, gardent la réponse `occupe`.
  if (operation?.fini && operation.connue && courante?.perimee && memeIdentite(operation.connue, courante.identite)) {
    operation.jeton.leve = true;
    await operation.fini;
    return analyser(contexte, lecteurs, demande, optionsDeCooperation);
  }
  if (operation) {
    contexte.envoyer({ type: 'occupe', analyse: await operation.identite, ...(demande.demande !== undefined ? { demande: demande.demande } : {}) });
    return;
  }
  // Seule mémoire entre demandes aujourd'hui : les libraries lues à la sélection. Actualiser les abandonne et relit.
  if (!reutilisationPermise(demande)) abandonnerLesLibrariesAnticipees();
  const reception = Date.now();
  let connaitre!: (identite: IdentiteDAnalyse) => void;
  const courant: Operation = { identite: new Promise((resolve) => { connaitre = resolve; }), connue: null, jeton: { leve: false } };
  courant.demande = demande.demande;
  operation = courant;
  let terminer!: () => void;
  courant.fini = new Promise<void>((resolve) => { terminer = resolve; });
  // Un seul contexte par analyse : le relevé, le moteur et les contrôles se partagent son budget.
  const cooperation = creerContexteCooperatif({
    respirer: () => new Promise((resolve) => setTimeout(resolve, 0)),
    ...optionsDeCooperation,
    jeton: courant.jeton,
  });
  // Les inventaires de la demande : ils meurent avec elle, Actualiser et l'analyse suivante relisent.
  const inventaires = creerInventairesDeLaDemande();
  if (demande.mesurer) ouvrirLaMesure();
  const importsEnregistres = enregistrerLesImports(demande.capturer === true);
  let mesureOuverte = demande.mesurer === true;
  let mesureClose: TraceDeMesure | null = null;
  courant.cloreMesure = (fin, contenu = '') => {
    if (!mesureOuverte) return mesureClose;
    mesureOuverte = false;
    const trace = fermerLaMesure(contenu);
    if (trace) trace.fin = fin;
    mesureClose = trace;
    return trace;
  };
  let progression: ProgressionDAnalyse = { phase: 'sujet', fraction: 0 };
  let dernierProgres = '';
  courant.progresser = (phase, fait, total) => {
    const fractions: Record<PhaseDAnalyse, number> = { sujet: 0, releve: 0.05, catalogue: 0.25, imbriques: 0.5, structure: 0.65, regles: 0.8, controles: 0.35, corrections: 0.9, projection: 0.98 };
    progression = { phase, fraction: Math.max(progression.fraction, fractions[phase] + (phase === 'releve' && total ? 0.19 * Math.min(fait ?? 0, total) / total : 0)), ...(fait !== undefined && total !== undefined ? { fait, total } : {}) };
    const cle = JSON.stringify(progression);
    if (!identite || cle === dernierProgres) return;
    dernierProgres = cle;
    contexte.envoyer({ type: 'analyse-en-cours', analyse: identite, ...(demande.demande !== undefined ? { demande: demande.demande } : {}), variantsLus: phase === 'releve' ? fait ?? 0 : 0, variantsTotal: phase === 'releve' ? total ?? 0 : 0, progression });
  };
  const phase = (nom: PhaseDAnalyse): void => { etape(nom); courant.progresser?.(nom); };
  const lecturesRefusees: string[] = [];
  let identite: IdentiteDAnalyse | null = null;
  let revision: RevisionDAnalyse | null = null;
  let catalogueLu: CatalogueDeReference | null = null;
  let libraries: LibrariesEnAvance | undefined;
  let librariesEnCours = false;
  const rendre = (statut: StatutDAnalyse, constats: readonly Constat[], releve: ReleveDeComposant | null, ecartes: readonly string[] = [], tous: readonly Constat[] = constats): void => {
    phase('projection');
    const sansTokens = (lu: ReleveDeComposant | null): boolean => {
      if (lu === null || catalogueLu === null) return false;
      const nombre = tokensDuComposant(lu, catalogueLu).length;
      compter('tokensDuComposant', nombre);
      return nombre === 0;
    };
    if (statut === 'complete' || statut === 'partielle') mesurerLeCalcul(() => retenirLesCorrections(identite as IdentiteDAnalyse, constats, releve, tous, catalogueLu), 'projection');
    const sortie = mesurerLeCalcul(() => ({
      constats: tous,
      lecture: releve?.lecture ?? null,
      variants: releve?.variants.map(({ id, nom }) => ({ id, nom })) ?? [],
      sansTokens: sansTokens(releve),
    }), 'projection');
    const contenu = mesureOuverte ? JSON.stringify(sortie) : '';
    if (mesureOuverte) compter('tailleSortieArchitect', contenu.length);
    const mesure = courant.cloreMesure?.(statut, contenu);
    const envoyee = demande.demande === undefined ? undefined : mesuresEnvoyees.get(demande.demande);
    if (envoyee) {
      envoyee.envois['resultat-final'] = Date.now();
      if (tous.length && envoyee.envois['premiers-constats'] === undefined) envoyee.envois['premiers-constats'] = Date.now();
    }
    contexte.envoyer({ type: 'analyse', analyse: identite as IdentiteDAnalyse, ...(demande.demande !== undefined ? { demande: demande.demande } : {}), statut, ...sortie, progression: { phase: 'projection', fraction: 1 }, ...(mesure ? { mesure } : {}) });
    if (releve !== null) contexte.envoyer({ type: 'ignores', analyse: identite as IdentiteDAnalyse, constats: ecartes });
  };
  try {
    phase('sujet');
    // L'écoute de la page courante précède la première lecture du document : l'inventaire n'est connu qu'après le sujet.
    // Le journal n'a plus besoin de ce qui précède le curseur le plus ancien que la session ou l'analyse précédente retient.
    evaluerLesInvalidations();
    const plusAncien = Math.min(courante?.curseur ?? Infinity, ...session.sujets().map((sujet) => session.evalueJusqua(sujet) ?? Infinity));
    if (Number.isFinite(plusAncien)) ouvrirLeJournal().oublierAvant(plusAncien);
    const curseur = ouvrirLeJournal().marquer();
    changementsEnAttente = { noeuds: [], styles: [] };
    contexte.surveillerLeDocument();
    const sujet = await attendrePourLaMesure(() => lecteurs.sujet(contexte).catch(() => null), 'attente', 'sujet');
    identite = commencerUneAnalyse(sujet?.cle ?? '', sujet?.noeuds ?? [], contexte, sujet?.admis, sujet ? pageDuNoeud<PageNode | undefined>(sujet.noeud, undefined) : undefined, sujet?.couverture, curseur, sujet?.parents);
    courant.connue = identite;
    revision = ouvrirUneRevision(session, identite.sujet);
    connaitre(identite);
    if (demande.mesurer && demande.demande !== undefined) {
      mesuresEnvoyees.clear();
      mesuresEnvoyees.set(demande.demande, { reception, identite, envois: { 'premier-affichage': Date.now() } });
    }
    contexte.envoyer({ type: 'analyse-commencee', analyse: identite, ...(demande.demande !== undefined ? { demande: demande.demande } : {}), ...(demande.mesurer ? { mesure: true } : {}) });
    // `perime` part après `analyse-commencee` : l'interface ignore le message d'une identité qu'elle n'a pas retenue.
    rejouerLesEvenementsRecus(contexte);
    courant.progresser('sujet');
    if (courant.jeton.leve) return rendre('annulee', [], null);
    if (!sujet) return rendre('arretee', [bloquant('Aucun composant n’est sélectionné.')], null);
    const { jeton } = courant;

    phase('releve');
    // La lecture des libraries ne dépend pas du relevé : elle court pendant lui, et `catalogue` en attend l'issue.
    // Elle partage le jeton et le budget de l'analyse ; `libraries` ne rejette jamais.
    if (lecteurs.bibliotheques) {
      const lire = lecteurs.bibliotheques;
      librariesEnCours = true;
      libraries = attendrePourLaMesure(async () => inventaires.libraries(() => lire(contexte, cooperation)), 'parallele', 'libraries')
        .then((lecture) => ({ lecture }), (erreur: unknown) => ({ erreur }))
        .finally(() => { librariesEnCours = false; });
    }
    const issue = await attendrePourLaMesure(() => lecteurs.releve(sujet, jeton, contexte, (fait, total) => courant.progresser?.('releve', fait, total), cooperation), 'attente', 'releve');
    if (issue.statut === 'annule' || jeton.leve) return rendre('annulee', [], null);
    if (issue.statut === 'sans-sujet') return rendre('arretee', [bloquant('Aucun composant n’est sélectionné.')], null);
    const { releve } = issue;
    courant.progresser('releve', releve.variants.length, releve.variants.length + releve.lecture.variantsNonLus.length);

    retenirLesLiaisons(liaisonsParCle(releve));
    const niveau = await attendrePourLaMesure(async () => await lecteurs.niveau?.(contexte).catch((): NiveauDAccessibilite => { lecturesRefusees.push('niveau'); return 'AA'; }) ?? 'AA');
    phase('catalogue');
    const catalogue = await attendrePourLaMesure(() => lecteurs.catalogue(releve, jeton, contexte, cooperation, libraries, inventaires), 'attente', 'catalogue');
    catalogueLu = catalogue;
    compter('variablesDuCatalogue', catalogue.variables.length);
    if (jeton.leve) return rendre('annulee', [], null);

    // Les valeurs actuelles que les requêtes comparent à celles de l'entrée retenue (`creerLesRequetes`).
    const actuelles = new Map<NomDEntree, unknown>([['releve', releve], ['catalogue', catalogue], ['niveau', niveau]]);
    const architectureUcm = (() => {
      try { return lireLaDeclaration(contexte.figma) === 'ucm'; }
      catch { return false; }
    })();
    actuelles.set('architectureUcm', architectureUcm);
    // Une lecture des règles qui lève ne coûte que C43 et C45 : le reste de l'analyse reste vrai.
    const lireLesReglesDe: RelireLesRegles = (surface) => attendrePourLaMesure(async () => {
      if (!lecteurs.regles) return { regles: null, refusee: false };
      try {
        return { regles: await lecteurs.regles(sujet, surface, contexte, inventaires), refusee: false };
      } catch {
        return { regles: null, refusee: true };
      }
    }, 'attente', 'regles');
    // Ce que le moteur lit hors du relevé et du catalogue se lit avant lui, puis la validation décide de reprendre le sien.
    // `undefined` sans lecteur de dépendances, `null` quand sa lecture lève : l'entrée ne se valide alors pas.
    let dependances = undefined as DependancesDuMoteur | null | undefined;
    let validation = null as ValidationDeLEntree | null;
    const lireLesDependancesEtValider = async (): Promise<void> => {
      phase('imbriques');
      const lireLesDependances = lecteurs.dependances;
      dependances = lireLesDependances
        ? await attendrePourLaMesure(() => lireLesDependances(sujet, contexte, inventaires, cooperation).catch((erreur: unknown) => {
          if (erreur instanceof AnalyseAnnulee) throw erreur;
          lecturesRefusees.push('dependances');
          return null;
        }), 'attente', 'dependances')
        : undefined;
      if (jeton.leve) return;
      if (dependances) suivreLesMaitres(identite as IdentiteDAnalyse, maitresSuivisParLeJournal(dependances, courante?.pages ?? new Set()).noeuds, contexte);
      // Seule une validation `valide` reprend le moteur retenu (les requêtes pures ne la demandent pas) ; Actualiser et un sujet sans lecteur de dépendances n'en demandent pas.
      validation = reutilisationPermise(demande) && dependances !== undefined
        ? await validerLEntree(sujet, identite as IdentiteDAnalyse, { releve, catalogue, dependances }, lireLesReglesDe)
        : null;
      if (reutilisationPermise(demande) && dependances !== undefined) compterLaValidation(sujet.cle, validation);
    };
    // Les requêtes pures se reprennent de l'entrée promue du sujet, quel que soit son état : leurs entrées se comparent aux
    // valeurs lues par cette demande, jamais à celles de l'entrée. Actualiser ne reprend rien. Les contrôles précèdent donc la
    // lecture des dépendances, et le provisoire part avec les familles reprises.
    const { famille, requete } = creerLesRequetes(reutilisationPermise(demande) ? session.entree(sujet.cle) : null, actuelles);
    // Les contrôles du kit passent avant le moteur : leurs constats partent en provisoire, sans correction, pendant que le moteur lit les composants imbriqués.
    phase('controles');
    const { constats: controles, parFamille } = await controlesDuKit(releve, catalogue, niveau, architectureUcm, cooperation, famille);
    actuelles.set('controles', controles);
    if (jeton.leve) return rendre('annulee', [], null);
    // Les ignorés se lisent avant le premier envoi : le provisoire dit déjà lesquels ne comptent pas. Son étape garde leur coût hors du dernier contrôle.
    etape('provisoire');
    const rangees = await attendrePourLaMesure(async () => await lecteurs.ignores?.(contexte).catch((): readonly string[] => { lecturesRefusees.push('ignores'); return []; }) ?? []);
    actuelles.set('ignores', rangees);
    if (jeton.leve) return rendre('annulee', [], null);
    const envoyee = demande.demande === undefined ? undefined : mesuresEnvoyees.get(demande.demande);
    if (envoyee && controles.length) envoyee.envois['premiers-constats'] = Date.now();
    contexte.envoyer({
      type: 'analyse-provisoire', analyse: identite, ...(demande.demande !== undefined ? { demande: demande.demande } : {}),
      constats: controles, ignores: separerLesIgnores(controles, rangees).ignores, lecture: releve.lecture, variants: releve.variants.map(({ id, nom }) => ({ id, nom })),
    });
    await cooperation.cederSiBesoin();
    if (jeton.leve) return rendre('annulee', [], null);

    await lireLesDependancesEtValider();
    if (jeton.leve) return rendre('annulee', [], null);
    let moteur: MoteurRetenu;
    let reglesLues: ReleveDesRegles | null = null;
    if (validation?.etat === 'valide') {
      phase('regles');
      ({ moteur, regles: reglesLues } = validation);
    } else {
      const resultat = await attendrePourLaMesure(() => lecteurs.moteur(sujet, jeton, contexte, courant.progresser, cooperation, inventaires), 'attente', 'moteur');
      if (resultat.etat === 'annulee' || jeton.leve) return rendre('annulee', [], null);
      moteur = sansPublication(resultat.interne);
      phase('regles');
      if (moteur.couverture.etat === 'complete') {
        const lues = await lireLesReglesDe(resultat.interne);
        if (lues.refusee) lecturesRefusees.push('regles');
        reglesLues = lues.regles;
      }
    }
    actuelles.set('moteur', moteur);
    actuelles.set('regles', reglesLues);
    retenirLesModeles(reglesLues);
    const tous = await requete('corrections', async () => {
      etape('controle-fusion');
      const brut = mesurerLeCalcul(() => [...controles, ...constatsDeRegles(reglesLues), ...constatsDuMoteur(moteur, new Set(releve.variants.map((variant) => variant.id)))], 'controles', true);
      phase('corrections');
      await cooperation.cederSiBesoin();
      return calculerParEtapes(proposerLesCorrectionsParEtapes(releve, catalogue, brut), cooperation, 'corrections');
    });
    if (jeton.leve) return rendre('annulee', [], null);
    await cooperation.cederSiBesoin();
    const { visibles, ignores } = await requete('projection', async () => separerLesIgnores(tous, rangees));
    // Les événements déjà émis par Figma n'arrivent qu'à la prochaine macrotâche : sans cette cession, le résultat partirait comme
    // applicable alors que le sujet a changé pendant le calcul. Aucune barrière atomique : un changement émis après la cession
    // périme l'analyse par le chemin ordinaire.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    if (jeton.leve) return rendre('annulee', [], null);
    verifierLaGeneration(contexte);
    const lectureComplete = releve.lecture.variantsNonLus.length === 0 && releve.lecture.layersNonLus === 0 && releve.lecture.manquees.length === 0;
    const statutFinal: StatutDAnalyse = moteur.couverture.etat === 'partielle' || !lectureComplete ? 'partielle' : 'complete';
    // La promotion précède l'envoi du résultat : la trace qu'il porte se ferme à l'envoi et doit déjà compter ce que la session retient.
    if (revision) {
      promouvoirLaRevision(revision, identite, statutFinal, { releve, catalogue, moteur, regles: reglesLues, dependances: dependances ?? null, niveau, architectureUcm, ignores: rangees, lecturesRefusees }, {
        ...Object.fromEntries(Object.entries(parFamille).map(([nom, resultat]) => [nom, { resultat, entrees: ENTREES_DES_REQUETES[nom as NomDeFamille] }])) as Record<NomDeFamille, RequeteRetenue<readonly Constat[], NomDEntree>>,
        corrections: { resultat: tous, entrees: ENTREES_DES_REQUETES.corrections },
        projection: { resultat: { visibles, ignores }, entrees: ENTREES_DES_REQUETES.projection },
      });
      const retenu = session.mesure();
      retenirLeMaximum('sujetsRetenus', retenu.sujets);
      retenirLeMaximum('octetsRetenus', retenu.octets);
      retenirLeMaximum('aretesRetenues', retenu.aretes);
      retenirLeMaximum('entreesDuJournal', journal?.depuis(0).length ?? 0);
    }
    rendre(statutFinal, visibles, releve, ignores, tous);
    // La capture suit l'envoi de la trace et garde la place d'opération : une écriture demandée pendant ce temps rend `occupe`.
    await capturerSiDemande(demande, contexte, { noeud: sujet.noeud, page: pageDuNoeud(sujet.noeud, contexte.figma.currentPage), imports: importsEnregistres });
  } catch (erreur) {
    if (identite === null) {
      identite = commencerUneAnalyse('', [], contexte);
      connaitre(identite);
    }
    if (courant.jeton.leve) rendre('annulee', [], null);
    else rendre('arretee', [bloquant(messageDErreur(erreur))], null);
  } finally {
    changementsEnAttente = null;
    // Une révision non promue (fin annulée, arrêtée, erreur) est jetée : la session garde l'entrée d'avant.
    (revision as RevisionDAnalyse | null)?.jeter();
    // Une analyse finie avant d'avoir attendu les libraries (arrêt, erreur) ne laisse pas leur lecture courir : le jeton ne sert plus.
    if (librariesEnCours) courant.jeton.leve = true;
    courant.cloreMesure?.('arretee');
    enregistrerLesImports(false);
    operation = null;
    terminer();
  }
}

/**
 * Une écriture prend l'unique place d'opération : une analyse ou une autre
 * écriture demandée pendant ce temps rend `occupe`. Rend `occupe` avec
 * l'identité de l'opération en cours quand la place est prise, sinon la
 * libération à appeler quand l'écriture finit.
 */
export function prendreLaPlaceDUneEcriture(identite: IdentiteDAnalyse): { liberer(): void } | { occupe: Promise<IdentiteDAnalyse> } {
  if (operation) return { occupe: operation.identite };
  const prise: Operation = { identite: Promise.resolve(identite), connue: identite, jeton: { leve: false } };
  operation = prise;
  return { liberer: () => { if (operation === prise) operation = null; } };
}

function annuler(demande: Extract<DemandeDAnalyse, { type: 'annuler-analyse' }>): void {
  const identite = demande.analyse;
  if (operation && demande.demande !== undefined && operation.demande === demande.demande) { operation.jeton.leve = true; return; }
  const connue = operation?.connue;
  if (!operation || !connue || !identite || connue.sujet !== identite.sujet || connue.generation !== identite.generation) return;
  operation.jeton.leve = true;
}

/** Le traitement du domaine sur des lectures données. */
export function traiterAvec(lecteurs: Lecteurs, optionsDeCooperation: Omit<OptionsDeCooperation, 'jeton'> = {}): Traiter<DemandeDAnalyse> {
  return async (demande, contexte) => {
    switch (demande.type) {
      case 'analyser':
        await analyser(contexte, lecteurs, demande, optionsDeCooperation);
        return;
      case 'analyse-rendue': {
        const envoyee = mesuresEnvoyees.get(demande.demande);
        const envoi = envoyee?.envois[demande.rendu];
        if (!envoyee || envoi === undefined || !memeIdentite(envoyee.identite, demande.analyse)) return;
        delete envoyee.envois[demande.rendu];
        console.info('Analyse : acquittement sandbox', { ...demande, receptionAAcquittementMs: Date.now() - envoyee.reception, allerRetourMs: Date.now() - envoi });
        if (Object.keys(envoyee.envois).length === 0) mesuresEnvoyees.delete(demande.demande);
        return;
      }
      case 'annuler-analyse':
        annuler(demande);
        return;
    }
  };
}

export const traiter = traiterAvec(LECTEURS_DE_FIGMA);

/**
 * Fermeture du plugin : l'analyse en cours s'arrête, et la session, le journal et l'analyse courante sont vidés. Une analyse
 * qui finit après ne promeut rien (plus d'analyse courante). Les écoutes de Figma se retirent dans `code.ts`.
 */
export function fermerLaSession(): void {
  if (operation) operation.jeton.leve = true;
  courante = null;
  changementsEnAttente = null;
  journal = null;
  session.vider();
}

/** Pour les tests : oublie l'opération en cours et l'analyse courante. */
export function reinitialiserLAnalyse(): void {
  operation = null;
  courante = null;
  changementsEnAttente = null;
  journal = null;
  bornesDeRetention = BORNES_DE_RETENTION;
  session.vider();
  mesuresEnvoyees.clear();
}
