/**
 * Le domaine `analyse` : l'analyse du composant sélectionné, son identité et ce
 * qui la rend périmée.
 *
 * `analyser` lit le relevé du jeu de variants et le catalogue de référence (la
 * library choisie, sinon les variables du fichier), lance le moteur de
 * l'exporteur, puis les contrôles du kit. Les constats rendus sont ceux du kit
 * et ceux du moteur, traduits. Rien n'est écrit dans le document, et un
 * résultat `partielle` ne produit jamais de contrat. Une seule analyse court à
 * la fois : une seconde demande reçoit `occupe`.
 *
 * Une analyse se périme de trois façons, et une seule fois : après une
 * écriture du plugin (`ecriture`), sur un changement de la page qui touche un
 * nœud du jeu analysé (`document`, dont le Ctrl+Z), sur une sélection Figma
 * d'un autre jeu de variants (`selection`). La sélection que le plugin pose
 * lui-même, au clic sur un constat, ne périme rien.
 */
import {
  controlerCouches, controlerLAccessibilite, controlerLaTypographie, controlerMapping, controlerNommage, controlerOublis,
  type CatalogueDeReference, type Constat, type ReleveDeComposant,
} from '@ucm-kit/core/controles';
import { lireLesLibraries, type PortDeBibliotheque } from 'ucm-plugin-socle/src/bibliotheque';
import { BUDGET_DE_LAYERS_PAR_DEFAUT } from 'ucm-plugin-socle/src/composant/contract/budget';
import { analyserLeComposant, type ResultatDAnalyse } from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import type { JetonDAnnulation } from 'ucm-plugin-socle/src/composant/contract/porteeDAnalyse';

import { catalogueDuFichier, chargerLesValeurs, lireLeCatalogueDeLibrary } from '../catalogue';
import type { NoeudLu } from '../consommateurs';
import { constatsDuMoteur } from '../constatsDuMoteur';
import { lireLesVariables } from '../lecture';
import { sujetDe, type PortDuComposant } from '../lectureDuComposant';
import { lireLaLibraryRangee } from '../ecriture/configuration';
import type { NiveauDAccessibilite } from '../messages/configuration';
import type { CauseDePeremption, DemandeDAnalyse, StatutDAnalyse } from '../messages/analyse';
import type { IdentiteDAnalyse, OrigineDeSelection } from '../messages/commun';
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
  perimee: boolean;
}

let generation = 0;
let courante: AnalyseCourante | null = null;

/** Ouvre une analyse : la génération monte, l'analyse précédente n'est plus la courante. */
export function commencerUneAnalyse(sujet: string, noeuds: Iterable<string>, contexte: Contexte): IdentiteDAnalyse {
  generation += 1;
  const identite = { sujet, generation };
  courante = { identite, noeuds: new Set(noeuds), perimee: false };
  contexte.surveillerLeDocument();
  return identite;
}

export function analyseCourante(): IdentiteDAnalyse | null {
  return courante?.identite ?? null;
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
  /** Le niveau d'accessibilité rangé ; AA sans lecteur. */
  niveau?(contexte: Contexte): Promise<NiveauDAccessibilite>;
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

function controlesDuKit(releve: ReleveDeComposant, catalogue: CatalogueDeReference, niveau: NiveauDAccessibilite): Constat[] {
  return [
    ...controlerNommage(releve, catalogue),
    ...controlerMapping(releve, catalogue),
    ...controlerCouches(releve, catalogue),
    ...controlerOublis(releve, catalogue),
    ...controlerLAccessibilite(releve, catalogue, { niveau }),
    ...controlerLaTypographie(releve, catalogue),
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
  const rendre = (statut: StatutDAnalyse, constats: readonly Constat[], releve: ReleveDeComposant | null): void => {
    contexte.envoyer({
      type: 'analyse',
      analyse: identite as IdentiteDAnalyse,
      statut,
      constats,
      lecture: releve?.lecture ?? null,
      variants: releve?.variants.map(({ id, nom }) => ({ id, nom })) ?? [],
    });
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
    if (jeton.leve) return rendre('annulee', [], null);
    const resultat = await lecteurs.moteur(sujet, jeton, contexte);
    if (resultat.etat === 'annulee' || jeton.leve) return rendre('annulee', [], null);

    const constats = [...controlesDuKit(releve, catalogue, niveau), ...constatsDuMoteur(resultat.export, new Set(releve.variants.map((variant) => variant.id)))];
    const lectureComplete = releve.lecture.variantsNonLus.length === 0 && releve.lecture.layersNonLus === 0;
    rendre(resultat.etat === 'partielle' || !lectureComplete ? 'partielle' : 'complete', constats, releve);
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
