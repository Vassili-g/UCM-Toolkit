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
 */
import {
  controlerCouchesParEtapes, controlerLAccessibiliteParEtapes, controlerLaStructure, controlerLaTypographieParEtapes, controlerLeTheme, controlerMapping, controlerNommage, controlerOublisParEtapes, clesDesTokensDeTailleAttendus, proposerLesCorrectionsParEtapes, tokensDuComposant,
  type CatalogueDeReference, type Constat, type Correction, type ReleveDeComposant,
} from '@ucm-kit/core/controles';
import { lireLesLibraries, type PortDeBibliotheque } from 'ucm-plugin-socle/src/bibliotheque';
import { BUDGET_DE_LAYERS_PAR_DEFAUT } from 'ucm-plugin-socle/src/composant/contract/budget';
import { analyserLeComposant, type ComponentExport, type ResultatDAnalyse } from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import { ouvrirLaMesure, fermerLaMesure, etape, compter, attendrePourLaMesure, mesurerLeCalcul, type TraceDeMesure } from 'ucm-plugin-socle/src/composant/contract/mesure';
import { creerContexteCooperatif, type ContexteCooperatif, type JetonDAnnulation, type OptionsDeCooperation } from 'ucm-plugin-socle/src/composant/contract/porteeDAnalyse';

import { catalogueDuFichier, chargerLesValeurs, lireLeCatalogueDeLibrary } from '../catalogue';
import type { NoeudLu } from '../consommateurs';
import { constatsDuMoteur } from '../constatsDuMoteur';
import { lireLesVariables } from '../lecture';
import { sujetDe, type PortDuComposant } from '../lectureDuComposant';
import { lireLaLibraryRangee } from '../ecriture/configuration';
import { lireLesIgnores, separerLesIgnores } from '../ecriture/ignores';
import type { NiveauDAccessibilite } from '../messages/configuration';
import type { CauseDePeremption, DemandeDAnalyse, StatutDAnalyse, PhaseDAnalyse, ProgressionDAnalyse } from '../messages/analyse';
import type { IdentiteDAnalyse, OrigineDeSelection } from '../messages/commun';
import { constatsDeRegles, lireLesRegles, retenirLesModeles, type ReleveDesRegles } from '../regles';
import { lireLeReleve, type IssueDuReleve } from '../releveDuComposant';
import { lireLaDeclaration } from './commun';
import { retenirLesLiaisons } from './bibliotheque';
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
  /** Les corrections des constats rendus, par identifiant : l'écriture n'écrit que celles-là. */
  corrections: ReadonlyMap<string, Correction>;
  /** Tous les constats de l'analyse, ignorés compris, par identifiant : Ignorer et les questions les retrouvent ici. */
  constats: ReadonlyMap<string, Constat>;
  releve: ReleveDeComposant | null;
  /** Le catalogue de l'analyse : la propagation depuis un modèle y cherche les variables visées. */
  catalogue: CatalogueDeReference | null;
  perimee: boolean;
}

let generation = 0;
let courante: AnalyseCourante | null = null;

/** Ouvre une analyse : la génération monte, l'analyse précédente n'est plus la courante. */
export function commencerUneAnalyse(sujet: string, noeuds: Iterable<string>, contexte: Contexte, admis?: Iterable<string>, page?: PageNode): IdentiteDAnalyse {
  generation += 1;
  const identite = { sujet, generation };
  const tous = new Set(noeuds);
  courante = { identite, noeuds: tous, admis: admis ? new Set(admis) : tous, corrections: new Map(), constats: new Map(), releve: null, catalogue: null, perimee: false };
  contexte.surveillerLeDocument(page);
  return identite;
}

export function analyseCourante(): IdentiteDAnalyse | null {
  return courante?.identite ?? null;
}

const memeIdentite = (a: IdentiteDAnalyse, b: IdentiteDAnalyse): boolean => a.sujet === b.sujet && a.generation === b.generation;

/**
 * Retient les corrections des constats que l'analyse `identite` vient de rendre ;
 * une autre analyse courante les ignore. `tous` ajoute les constats écartés
 * (ignorés), `releve` sert à bâtir la correction qu'une réponse tire.
 */
export function retenirLesCorrections(identite: IdentiteDAnalyse, constats: readonly Constat[], releve: ReleveDeComposant | null = null, tous: readonly Constat[] = constats, catalogue: CatalogueDeReference | null = null): void {
  if (!courante || !memeIdentite(courante.identite, identite)) return;
  courante.catalogue = catalogue;
  courante.corrections = new Map(constats.flatMap((constat) => (constat.correction ? [[constat.correction.id, constat.correction] as const] : [])));
  courante.constats = new Map(tous.map((constat) => [constat.id, constat] as const));
  courante.releve = releve;
}

/** Le catalogue de l'analyse `identite`, `null` quand elle n'est plus la courante ou n'en a pas lu. */
export function catalogueDeLAnalyse(identite: IdentiteDAnalyse): CatalogueDeReference | null {
  return courante && memeIdentite(courante.identite, identite) ? courante.catalogue : null;
}

/**
 * Ajoute les corrections et les constats d'une propagation depuis un modèle à
 * l'analyse `identite`, sans toucher aux autres. `false` quand cette identité
 * n'est plus la courante ou que l'analyse est périmée.
 */
export function retenirLaPropagation(identite: IdentiteDAnalyse, constats: readonly Constat[]): boolean {
  if (!courante || courante.perimee || !memeIdentite(courante.identite, identite)) return false;
  courante.corrections = new Map([...courante.corrections, ...constats.flatMap((constat) => (constat.correction ? [[constat.correction.id, constat.correction] as const] : []))]);
  courante.constats = new Map([...courante.constats, ...constats.map((constat) => [constat.id, constat] as const)]);
  return true;
}

/** Le constat de l'analyse `identite`, ignoré ou non ; `null` quand cette identité n'est plus la courante. */
export function constatDeLAnalyse(identite: IdentiteDAnalyse, id: string): Constat | null {
  if (!courante || !memeIdentite(courante.identite, identite)) return null;
  return courante.constats.get(id) ?? null;
}

/** Le constat dont la question porte l'identifiant `question`. */
export function constatDeLaQuestion(identite: IdentiteDAnalyse, question: string): Constat | null {
  if (!courante || courante.perimee || !memeIdentite(courante.identite, identite)) return null;
  return [...courante.constats.values()].find((constat) => constat.question?.id === question) ?? null;
}

export function releveDeLAnalyse(identite: IdentiteDAnalyse): ReleveDeComposant | null {
  return courante && memeIdentite(courante.identite, identite) ? courante.releve : null;
}

/**
 * Pose ou retire la correction `id` du lot de l'analyse `identite` : la réponse
 * à une question en pose une, Annuler la réponse et Ignorer la retirent.
 * `false` quand cette identité n'est plus la courante.
 */
export function fixerUneCorrection(identite: IdentiteDAnalyse, id: string, correction: Correction | null): boolean {
  if (!courante || !memeIdentite(courante.identite, identite)) return false;
  const suivantes = new Map(courante.corrections);
  if (correction) suivantes.set(id, correction);
  else suivantes.delete(id);
  courante.corrections = suivantes;
  return true;
}

/**
 * Les corrections de l'analyse `identite`, par identifiant. `null` quand cette
 * identité n'est plus la courante ou que l'analyse est périmée : rien ne s'écrit
 * alors.
 */
export function correctionsDeLAnalyse(identite: IdentiteDAnalyse): ReadonlyMap<string, Correction> | null {
  if (!courante || courante.perimee || !memeIdentite(courante.identite, identite)) return null;
  return courante.corrections;
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

/** À appeler quand le plugin vient d'écrire dans le document pour l'analyse courante. */
export function perimerApresUneEcriture(contexte: Contexte): void {
  perimer('ecriture', contexte);
}

/** `nodechange` de la page : les identifiants des nœuds touchés. Un seul qui appartient au jeu analysé suffit. */
export function surChangementDuDocument(noeudsTouches: Iterable<string>, contexte: Contexte): void {
  if (!courante) return;
  for (const id of noeudsTouches) {
    if (courante.noeuds.has(id)) {
      perimer('document', contexte);
      return;
    }
  }
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
}

/** Les lectures de Figma d'une analyse : le sandbox donne les siennes, les tests des doubles. */
export interface Lecteurs {
  /** Le sujet de la sélection, `null` hors de tout composant. */
  sujet(contexte: Contexte): Promise<SujetAAnalyser | null>;
  releve(sujet: SujetAAnalyser, jeton: JetonDAnnulation, contexte: Contexte, progresser?: (fait: number, total: number) => void, cooperation?: ContexteCooperatif): Promise<IssueDuReleve>;
  catalogue(releve: ReleveDeComposant, jeton: JetonDAnnulation, contexte: Contexte): Promise<CatalogueDeReference>;
  moteur(sujet: SujetAAnalyser, jeton: JetonDAnnulation, contexte: Contexte, progresser?: (phase: PhaseDAnalyse) => void, cooperation?: ContexteCooperatif): Promise<ResultatDAnalyse>;
  /** Les règles d'usage du composant, lues avec le contrat du moteur ; sans lecteur, aucun constat C43 ni C45. */
  regles?(sujet: SujetAAnalyser, resultat: ResultatDAnalyse, contexte: Contexte): Promise<ReleveDesRegles>;
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
  let descendants: readonly { id: string }[] = [];
  try {
    descendants = (jeu as unknown as { findAll?: (filtre: () => boolean) => readonly { id: string }[] }).findAll?.(() => true) ?? [];
  } catch {
    // Sans la liste, seuls le jeu et ses variants font périmer l'analyse.
  }
  const enfants = (jeu.children ?? []).map((enfant) => enfant.id);
  const cle = (jeu as unknown as { key?: unknown }).key;
  return { cle: typeof cle === 'string' && cle !== '' ? cle : jeu.id, noeud: jeu, noeuds: [jeu.id, ...enfants, ...descendants.map((noeud) => noeud.id)], admis: [jeu.id, ...enfants] };
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

export async function catalogueDeFigma(releve: ReleveDeComposant, jeton: JetonDAnnulation, contexte: Contexte): Promise<CatalogueDeReference> {
  const { figma } = contexte;
  const liaisons = liaisonsParCle(releve);
  try {
    const lecture = await lireLesLibraries(figma as unknown as PortDeBibliotheque);
    if (lecture.etat === 'lue') {
      const choisie = libraryDeReference(lecture.collections, liaisons, lireLaLibraryRangee(figma));
      if (choisie !== null) {
        const catalogue = await lireLeCatalogueDeLibrary(figma as unknown as PortDeBibliotheque, choisie, lecture);
        if (catalogue.etat === 'lu') {
          // C29 compare les valeurs en dur aux tokens de taille du composant : on charge celles-là, et chargerLesValeurs suit leurs alias.
          const tailles = clesDesTokensDeTailleAttendus(releve, catalogue.catalogue);
          return (await chargerLesValeurs(portDeLecture(figma), catalogue.catalogue, [...liaisons.keys(), ...tailles])).catalogue;
        }
      }
    }
  } catch {
    // La library ne se lit pas : le catalogue du fichier ouvert suit.
  }
  const port = portDeLecture(figma);
  const locales = await port.getLocalVariablesAsync();
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

const LECTEURS_DE_FIGMA: Lecteurs = {
  sujet: sujetDeFigma,
  releve: (sujet, jeton, contexte, progresser, cooperation) => lireLeReleve(portDuComposant(contexte), sujet.noeud, {
    budgetDeLayers: BUDGET_DE_LAYERS_PAR_DEFAUT,
    jeton,
    cooperation,
    progresser,
    espaceDeCouleur: contexte.figma.root.documentColorProfile === 'DISPLAY_P3' ? 'display-p3' : 'srgb',
  }),
  catalogue: catalogueDeFigma,
  niveau: ({ figma }) => lireLeNiveau(figma),
  ignores: async ({ figma }) => lireLesIgnores(figma),
  regles: (sujet, resultat) => lireLesRegles(sujet.noeud as unknown as ComponentSetNode, (resultat as { export: ComponentExport }).export),
  moteur: (sujet, jeton, { figma }, progresser, cooperation) => analyserLeComposant(async (texte) => {
    progresser?.(texte.includes('variables') || texte.includes('exemples') || texte.includes('contrat') ? 'structure' : 'imbriques');
  }, {
    composant: sujet.noeud as unknown as ComponentSetNode,
    page: pageDuNoeud(sujet.noeud, figma.currentPage),
    budgetDeLayers: BUDGET_DE_LAYERS_PAR_DEFAUT,
    jeton,
    cooperation,
    respirer: () => new Promise((resolve) => setTimeout(resolve, 0)),
  }),
};

interface Operation {
  progresser?: (phase: PhaseDAnalyse, fait?: number, total?: number) => void;
  demande?: number;
  cloreMesure?: (fin: string, contenu?: string) => TraceDeMesure | null;
  /** Connue dès que le sujet est résolu ; une seconde demande l'attend pour répondre `occupe`. */
  readonly identite: Promise<IdentiteDAnalyse>;
  connue: IdentiteDAnalyse | null;
  readonly jeton: { leve: boolean };
}

let operation: Operation | null = null;
const mesuresEnvoyees = new Map<number, { reception: number; identite: IdentiteDAnalyse; envois: Partial<Record<import('../messages/analyse').RenduDAnalyse, number>> }>();

const messageDErreur = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));

/** Les contrôles du kit, dans l'ordre du produit ; le budget partagé se consulte avant chacun. */
async function controlesDuKit(releve: ReleveDeComposant, catalogue: CatalogueDeReference, niveau: NiveauDAccessibilite, architectureUcm: boolean, cooperation: ContexteCooperatif): Promise<Constat[]> {
  const controles: Array<() => Constat[] | Promise<Constat[]>> = [
    () => enUneTranche(() => controlerNommage(releve, catalogue)),
    () => enUneTranche(() => controlerMapping(releve, catalogue)),
    () => calculerParEtapes(controlerCouchesParEtapes(releve, catalogue), cooperation),
    () => calculerParEtapes(controlerOublisParEtapes(releve, catalogue), cooperation),
    () => calculerParEtapes(controlerLAccessibiliteParEtapes(releve, catalogue, { niveau }), cooperation),
    () => calculerParEtapes(controlerLaTypographieParEtapes(releve, catalogue), cooperation),
    ...(architectureUcm ? [() => enUneTranche(() => controlerLeTheme(releve, catalogue)), () => enUneTranche(() => controlerLaStructure(releve, catalogue))] : []),
  ];
  const constats: Constat[] = [];
  for (const controler of controles) {
    await cooperation.cederSiBesoin();
    constats.push(...await controler());
  }
  return constats;
}

const enUneTranche = (calcul: () => Constat[]): Constat[] => mesurerLeCalcul(calcul, 'controles', true);

/** Un calcul du kit (contrôle ou corrections) conduit par tranches de 32 étapes ; le budget et le jeton se vérifient entre deux tranches. */
async function calculerParEtapes<T>(calcul: Generator<void, T>, cooperation: ContexteCooperatif, phase: 'controles' | 'corrections' = 'controles'): Promise<T> {
  for (;;) {
    await cooperation.cederSiBesoin();
    const fin = mesurerLeCalcul(() => {
      for (let i = 0; i < 32; i += 1) {
        const suivant = calcul.next();
        if (suivant.done) return suivant;
      }
      return null;
    }, phase, true);
    if (fin) return fin.value;
  }
}

/** L'unique constat d'une analyse arrêtée : le code C42 sert de réserve à la famille `export`. */
function bloquant(message: string): Constat {
  return { id: 'export:arret', code: 'C42', type: 'bloquant', famille: 'export', variants: [], layers: [], faits: { message } };
}

async function analyser(contexte: Contexte, lecteurs: Lecteurs, demande: Extract<DemandeDAnalyse, { type: 'analyser' }>, optionsDeCooperation: Omit<OptionsDeCooperation, 'jeton'>): Promise<void> {
  if (operation) {
    contexte.envoyer({ type: 'occupe', analyse: await operation.identite, ...(demande.demande !== undefined ? { demande: demande.demande } : {}) });
    return;
  }
  const reception = Date.now();
  let connaitre!: (identite: IdentiteDAnalyse) => void;
  const courant: Operation = { identite: new Promise((resolve) => { connaitre = resolve; }), connue: null, jeton: { leve: false } };
  courant.demande = demande.demande;
  operation = courant;
  // Un seul contexte par analyse : le relevé, le moteur et les contrôles se partagent son budget.
  const cooperation = creerContexteCooperatif({
    respirer: () => new Promise((resolve) => setTimeout(resolve, 0)),
    ...optionsDeCooperation,
    jeton: courant.jeton,
  });
  if (demande.mesurer) ouvrirLaMesure();
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
  let identite: IdentiteDAnalyse | null = null;
  let catalogueLu: CatalogueDeReference | null = null;
  const rendre = (statut: StatutDAnalyse, constats: readonly Constat[], releve: ReleveDeComposant | null, ecartes: readonly string[] = [], tous: readonly Constat[] = constats): void => {
    phase('projection');
    mesurerLeCalcul(() => retenirLesCorrections(identite as IdentiteDAnalyse, constats, releve, tous, catalogueLu), 'projection');
    const sortie = mesurerLeCalcul(() => ({
      constats: tous,
      lecture: releve?.lecture ?? null,
      variants: releve?.variants.map(({ id, nom }) => ({ id, nom })) ?? [],
      sansTokens: releve !== null && catalogueLu !== null && tokensDuComposant(releve, catalogueLu).length === 0,
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
    const sujet = await attendrePourLaMesure(() => lecteurs.sujet(contexte).catch(() => null), 'attente', 'sujet');
    identite = commencerUneAnalyse(sujet?.cle ?? '', sujet?.noeuds ?? [], contexte, sujet?.admis, sujet ? pageDuNoeud<PageNode | undefined>(sujet.noeud, undefined) : undefined);
    courant.connue = identite;
    connaitre(identite);
    if (demande.mesurer && demande.demande !== undefined) {
      mesuresEnvoyees.clear();
      mesuresEnvoyees.set(demande.demande, { reception, identite, envois: { 'premier-affichage': Date.now() } });
    }
    contexte.envoyer({ type: 'analyse-commencee', analyse: identite, ...(demande.demande !== undefined ? { demande: demande.demande } : {}), ...(demande.mesurer ? { mesure: true } : {}) });
    courant.progresser('sujet');
    if (courant.jeton.leve) return rendre('annulee', [], null);
    if (!sujet) return rendre('arretee', [bloquant('Aucun composant n’est sélectionné.')], null);
    const { jeton } = courant;

    phase('releve');
    const issue = await attendrePourLaMesure(() => lecteurs.releve(sujet, jeton, contexte, (fait, total) => courant.progresser?.('releve', fait, total), cooperation), 'attente', 'releve');
    if (issue.statut === 'annule' || jeton.leve) return rendre('annulee', [], null);
    if (issue.statut === 'sans-sujet') return rendre('arretee', [bloquant('Aucun composant n’est sélectionné.')], null);
    const { releve } = issue;
    courant.progresser('releve', releve.variants.length, releve.variants.length + releve.lecture.variantsNonLus.length);

    retenirLesLiaisons(liaisonsParCle(releve));
    const niveau = await attendrePourLaMesure(async () => await lecteurs.niveau?.(contexte).catch((): NiveauDAccessibilite => 'AA') ?? 'AA');
    phase('catalogue');
    const catalogue = await attendrePourLaMesure(() => lecteurs.catalogue(releve, jeton, contexte), 'attente', 'catalogue');
    catalogueLu = catalogue;
    if (jeton.leve) return rendre('annulee', [], null);
    phase('imbriques');
    const resultat = await attendrePourLaMesure(() => lecteurs.moteur(sujet, jeton, contexte, courant.progresser, cooperation), 'attente', 'moteur');
    if (resultat.etat === 'annulee' || jeton.leve) return rendre('annulee', [], null);

    // Une lecture des règles qui lève ne coûte que C43 et C45 : le reste de l'analyse reste vrai.
    phase('regles');
    const reglesLues = resultat.etat === 'complete' ? await attendrePourLaMesure(async () => await lecteurs.regles?.(sujet, resultat, contexte).catch(() => null) ?? null, 'attente', 'regles') : null;
    retenirLesModeles(reglesLues);
    const architectureUcm = (() => {
      try { return lireLaDeclaration(contexte.figma) === 'ucm'; }
      catch { return false; }
    })();
    phase('controles');
    const controles = await controlesDuKit(releve, catalogue, niveau, architectureUcm, cooperation);
    const brut = mesurerLeCalcul(() => [...controles, ...constatsDeRegles(reglesLues), ...constatsDuMoteur(resultat.export, new Set(releve.variants.map((variant) => variant.id)))], 'controles', true);
    phase('corrections');
    await cooperation.cederSiBesoin();
    const tous = await calculerParEtapes(proposerLesCorrectionsParEtapes(releve, catalogue, brut), cooperation, 'corrections');
    if (jeton.leve) return rendre('annulee', [], null);
    await cooperation.cederSiBesoin();
    const rangees = await attendrePourLaMesure(async () => await lecteurs.ignores?.(contexte).catch((): readonly string[] => []) ?? []);
    const { visibles, ignores } = separerLesIgnores(tous, rangees);
    const lectureComplete = releve.lecture.variantsNonLus.length === 0 && releve.lecture.layersNonLus === 0 && releve.lecture.manquees.length === 0;
    rendre(resultat.etat === 'partielle' || !lectureComplete ? 'partielle' : 'complete', visibles, releve, ignores, tous);
  } catch (erreur) {
    if (identite === null) {
      identite = commencerUneAnalyse('', [], contexte);
      connaitre(identite);
    }
    if (courant.jeton.leve) rendre('annulee', [], null);
    else rendre('arretee', [bloquant(messageDErreur(erreur))], null);
  } finally {
    courant.cloreMesure?.('arretee');
    operation = null;
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

/** Pour les tests : oublie l'opération en cours et l'analyse courante. */
export function reinitialiserLAnalyse(): void {
  operation = null;
  courante = null;
  mesuresEnvoyees.clear();
}
