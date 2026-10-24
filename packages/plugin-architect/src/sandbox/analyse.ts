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
  controlerCouches, controlerLAccessibilite, controlerLaStructure, controlerLaTypographie, controlerLeTheme, controlerMapping, controlerNommage, controlerOublis, proposerLesCorrections, tokensDuComposant,
  type CatalogueDeReference, type Constat, type Correction, type ReleveDeComposant,
} from '@ucm-kit/core/controles';
import { lireLesLibraries, type PortDeBibliotheque } from 'ucm-plugin-socle/src/bibliotheque';
import { BUDGET_DE_LAYERS_PAR_DEFAUT } from 'ucm-plugin-socle/src/composant/contract/budget';
import { analyserLeComposant, type ComponentExport, type ResultatDAnalyse } from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import type { JetonDAnnulation } from 'ucm-plugin-socle/src/composant/contract/porteeDAnalyse';

import { catalogueDuFichier, chargerLesValeurs, lireLeCatalogueDeLibrary } from '../catalogue';
import type { NoeudLu } from '../consommateurs';
import { constatsDuMoteur } from '../constatsDuMoteur';
import { lireLesVariables } from '../lecture';
import { sujetDe, type PortDuComposant } from '../lectureDuComposant';
import { lireLaLibraryRangee } from '../ecriture/configuration';
import { lireLesIgnores, separerLesIgnores } from '../ecriture/ignores';
import type { NiveauDAccessibilite } from '../messages/configuration';
import type { CauseDePeremption, DemandeDAnalyse, StatutDAnalyse } from '../messages/analyse';
import type { IdentiteDAnalyse, OrigineDeSelection } from '../messages/commun';
import { constatsDeRegles, lireLesRegles, retenirLesModeles, type ReleveDesRegles } from '../regles';
import { lireLeReleve, type IssueDuReleve } from '../releveDuComposant';
import { lireLaDeclaration } from './commun';
import { retenirLesLiaisons } from './bibliotheque';
import { libraryDeReference, lireLeNiveau } from './configuration';
import type { Contexte, Traiter } from './contexte';
import { portDeLecture, selectionLue } from './lectureDeFigma';

export const TYPES: readonly DemandeDAnalyse['type'][] = ['analyser', 'annuler-analyse'];

interface AnalyseCourante {
  readonly identite: IdentiteDAnalyse;
  /** Les identifiants des nœuds du jeu analysé : le jeu, ses variants et leurs calques. */
  readonly noeuds: ReadonlySet<string>;
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
export function commencerUneAnalyse(sujet: string, noeuds: Iterable<string>, contexte: Contexte): IdentiteDAnalyse {
  generation += 1;
  const identite = { sujet, generation };
  courante = { identite, noeuds: new Set(noeuds), corrections: new Map(), constats: new Map(), releve: null, catalogue: null, perimee: false };
  contexte.surveillerLeDocument();
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
  if (!courante.noeuds.has(sujetId)) perimer('selection', contexte);
}


/** Le jeu de variants que la sélection désigne : sa clé, le nœud que les lectures reçoivent et ses nœuds. */
export interface SujetAAnalyser {
  readonly cle: string;
  readonly noeud: NoeudLu;
  /** Le jeu, ses variants et leurs calques. */
  readonly noeuds: readonly string[];
}

/** Les lectures de Figma d'une analyse : le sandbox donne les siennes, les tests des doubles. */
export interface Lecteurs {
  /** Le sujet de la sélection, `null` hors de tout composant. */
  sujet(contexte: Contexte): Promise<SujetAAnalyser | null>;
  releve(sujet: SujetAAnalyser, jeton: JetonDAnnulation, contexte: Contexte): Promise<IssueDuReleve>;
  catalogue(releve: ReleveDeComposant, jeton: JetonDAnnulation, contexte: Contexte): Promise<CatalogueDeReference>;
  moteur(sujet: SujetAAnalyser, jeton: JetonDAnnulation, contexte: Contexte): Promise<ResultatDAnalyse>;
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
  return { cle: typeof cle === 'string' && cle !== '' ? cle : jeu.id, noeud: jeu, noeuds: [jeu.id, ...enfants, ...descendants.map((noeud) => noeud.id)] };
}

function portDuComposant({ figma }: Contexte): PortDuComposant {
  return {
    selection: () => selectionLue(figma),
    getNodeByIdAsync: (id) => figma.getNodeByIdAsync(id) as unknown as Promise<NoeudLu | null>,
    getStyleByIdAsync: (id) => figma.getStyleByIdAsync(id) as never,
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

async function catalogueDeFigma(releve: ReleveDeComposant, jeton: JetonDAnnulation, contexte: Contexte): Promise<CatalogueDeReference> {
  const { figma } = contexte;
  const liaisons = liaisonsParCle(releve);
  try {
    const lecture = await lireLesLibraries(figma as unknown as PortDeBibliotheque);
    if (lecture.etat === 'lue') {
      const choisie = libraryDeReference(lecture.collections, liaisons, lireLaLibraryRangee(figma));
      if (choisie !== null) {
        const catalogue = await lireLeCatalogueDeLibrary(figma as unknown as PortDeBibliotheque, choisie);
        if (catalogue.etat === 'lu') return (await chargerLesValeurs(portDeLecture(figma), catalogue.catalogue, [...liaisons.keys()])).catalogue;
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

const LECTEURS_DE_FIGMA: Lecteurs = {
  sujet: sujetDeFigma,
  releve: (sujet, jeton, contexte) => lireLeReleve(portDuComposant(contexte), sujet.noeud, {
    budgetDeLayers: BUDGET_DE_LAYERS_PAR_DEFAUT,
    jeton,
    espaceDeCouleur: contexte.figma.root.documentColorProfile === 'DISPLAY_P3' ? 'display-p3' : 'srgb',
  }),
  catalogue: catalogueDeFigma,
  niveau: ({ figma }) => lireLeNiveau(figma),
  ignores: async ({ figma }) => lireLesIgnores(figma),
  regles: (sujet, resultat) => lireLesRegles(sujet.noeud as unknown as ComponentSetNode, (resultat as { export: ComponentExport }).export),
  moteur: (sujet, jeton, { figma }) => analyserLeComposant(async () => {}, {
    composant: sujet.noeud as unknown as ComponentSetNode,
    page: figma.currentPage,
    budgetDeLayers: BUDGET_DE_LAYERS_PAR_DEFAUT,
    jeton,
    respirer: () => new Promise((resolve) => setTimeout(resolve, 0)),
  }),
};

interface Operation {
  /** Connue dès que le sujet est résolu ; une seconde demande l'attend pour répondre `occupe`. */
  readonly identite: Promise<IdentiteDAnalyse>;
  connue: IdentiteDAnalyse | null;
  readonly jeton: { leve: boolean };
}

let operation: Operation | null = null;

const messageDErreur = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));

function controlesDuKit(releve: ReleveDeComposant, catalogue: CatalogueDeReference, niveau: NiveauDAccessibilite, architectureUcm: boolean): Constat[] {
  return [
    ...controlerNommage(releve, catalogue),
    ...controlerMapping(releve, catalogue),
    ...controlerCouches(releve, catalogue),
    ...controlerOublis(releve, catalogue),
    ...controlerLAccessibilite(releve, catalogue, { niveau }),
    ...controlerLaTypographie(releve, catalogue),
    ...(architectureUcm ? [...controlerLeTheme(releve, catalogue), ...controlerLaStructure(releve, catalogue)] : []),
  ];
}

/** L'unique constat d'une analyse arrêtée : le code C42 sert de réserve à la famille `export`. */
function bloquant(message: string): Constat {
  return { id: 'export:arret', code: 'C42', type: 'bloquant', famille: 'export', variants: [], layers: [], faits: { message } };
}

async function analyser(contexte: Contexte, lecteurs: Lecteurs): Promise<void> {
  if (operation) {
    contexte.envoyer({ type: 'occupe', analyse: await operation.identite });
    return;
  }
  let connaitre!: (identite: IdentiteDAnalyse) => void;
  const courant: Operation = { identite: new Promise((resolve) => { connaitre = resolve; }), connue: null, jeton: { leve: false } };
  operation = courant;
  let identite: IdentiteDAnalyse | null = null;
  let catalogueLu: CatalogueDeReference | null = null;
  const rendre = (statut: StatutDAnalyse, constats: readonly Constat[], releve: ReleveDeComposant | null, ecartes: readonly string[] = [], tous: readonly Constat[] = constats): void => {
    retenirLesCorrections(identite as IdentiteDAnalyse, constats, releve, tous, catalogueLu);
    contexte.envoyer({
      type: 'analyse',
      analyse: identite as IdentiteDAnalyse,
      statut,
      // Ignorés compris : l'interface les range sous « Ignorés » d'après le message `ignores` qui suit.
      constats: tous,
      lecture: releve?.lecture ?? null,
      variants: releve?.variants.map(({ id, nom }) => ({ id, nom })) ?? [],
      sansTokens: releve !== null && catalogueLu !== null && tokensDuComposant(releve, catalogueLu).length === 0,
    });
    if (releve !== null) contexte.envoyer({ type: 'ignores', analyse: identite as IdentiteDAnalyse, constats: ecartes });
  };
  try {
    const sujet = await lecteurs.sujet(contexte).catch(() => null);
    identite = commencerUneAnalyse(sujet?.cle ?? '', sujet?.noeuds ?? [], contexte);
    courant.connue = identite;
    connaitre(identite);
    contexte.envoyer({ type: 'analyse-commencee', analyse: identite });
    if (!sujet) return rendre('arretee', [bloquant('Aucun composant n’est sélectionné.')], null);
    const { jeton } = courant;

    const issue = await lecteurs.releve(sujet, jeton, contexte);
    if (issue.statut === 'annule' || jeton.leve) return rendre('annulee', [], null);
    if (issue.statut === 'sans-sujet') return rendre('arretee', [bloquant('Aucun composant n’est sélectionné.')], null);
    const { releve } = issue;
    contexte.envoyer({ type: 'analyse-en-cours', analyse: identite, variantsLus: releve.variants.length, variantsTotal: releve.variants.length + releve.lecture.variantsNonLus.length });

    retenirLesLiaisons(liaisonsParCle(releve));
    const niveau = await lecteurs.niveau?.(contexte).catch((): NiveauDAccessibilite => 'AA') ?? 'AA';
    const catalogue = await lecteurs.catalogue(releve, jeton, contexte);
    catalogueLu = catalogue;
    if (jeton.leve) return rendre('annulee', [], null);
    const resultat = await lecteurs.moteur(sujet, jeton, contexte);
    if (resultat.etat === 'annulee' || jeton.leve) return rendre('annulee', [], null);

    // Une lecture des règles qui lève ne coûte que C43 et C45 : le reste de l'analyse reste vrai.
    const reglesLues = resultat.etat === 'complete' ? await lecteurs.regles?.(sujet, resultat, contexte).catch(() => null) ?? null : null;
    retenirLesModeles(reglesLues);
    const architectureUcm = (() => {
      try { return lireLaDeclaration(contexte.figma) === 'ucm'; }
      catch { return false; }
    })();
    const brut = [...controlesDuKit(releve, catalogue, niveau, architectureUcm), ...constatsDeRegles(reglesLues), ...constatsDuMoteur(resultat.export, new Set(releve.variants.map((variant) => variant.id)))];
    const tous = proposerLesCorrections(releve, catalogue, brut);
    const rangees = await lecteurs.ignores?.(contexte).catch((): readonly string[] => []) ?? [];
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

function annuler(identite: IdentiteDAnalyse): void {
  const connue = operation?.connue;
  if (!operation || !connue || connue.sujet !== identite.sujet || connue.generation !== identite.generation) return;
  operation.jeton.leve = true;
}

/** Le traitement du domaine sur des lectures données. */
export function traiterAvec(lecteurs: Lecteurs): Traiter<DemandeDAnalyse> {
  return async (demande, contexte) => {
    switch (demande.type) {
      case 'analyser':
        await analyser(contexte, lecteurs);
        return;
      case 'annuler-analyse':
        annuler(demande.analyse);
        return;
    }
  };
}

export const traiter = traiterAvec(LECTEURS_DE_FIGMA);

/** Pour les tests : oublie l'opération en cours et l'analyse courante. */
export function reinitialiserLAnalyse(): void {
  operation = null;
  courante = null;
}
