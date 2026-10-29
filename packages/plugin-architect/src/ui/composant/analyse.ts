/**
 * Ce que l'interface retient de l'analyse : les constats que le bouton
 * Constats compte, que la section Variants répartit par valeur et que le
 * panneau des constats range en onglets. Une seule analyse est retenue, sous
 * son identité (sujet, génération) : le message d'une autre identité est
 * ignoré, sauf celui qui ouvre une analyse.
 */
import type { ReleveDeComposant } from '@ucm-kit/core/controles';
import { TYPES_D_ALERTE, type TypeDAlerte } from '@ucm-kit/core/referentiel';

import type { LectureDeComposant } from '../../composant';
import type { PluginMessage } from '../../messages';
import type { CauseDePeremption, ProgressionDAnalyse, RenduDAnalyse } from '../../messages/analyse';
import type { Constat, Correction, IdentiteDAnalyse } from '../../messages/commun';
import type { PreparationVue } from '../../messages/preparation';
import type { LiaisonEnAttente } from '../../preparations';
import type { Etat } from '../etat';

/** Les messages qui touchent l'analyse retenue. */
export type MessageRecuDeLAnalyse = Extract<PluginMessage, { type: 'analyse-commencee' | 'analyse-en-cours' | 'analyse-provisoire' | 'analyse' | 'perime' | 'occupe' | 'corrections-appliquees' | 'ignores' | 'question-repondue' | 'modele-propose' | 'liaisons-preparees' }>;

/** Le dernier lot écrit : la ligne de réussite du sandbox, et ce qui s'est écrit. */
export interface LotEcrit {
  readonly resume: string;
  readonly ecrites: number;
  /** Les identifiants des corrections envoyées que le sandbox n'a pas sautées. */
  readonly appliquees: readonly string[];
}

/** Les liaisons que le sandbox tire d'une préparation rangée pour l'analyse retenue ; `enAttente` n'a pas de case. */
export interface LiaisonsPreparees {
  readonly preparation: string;
  readonly corrections: readonly Correction[];
  readonly enAttente: readonly LiaisonEnAttente[];
}

export interface AnalyseRecue {
  readonly identite: IdentiteDAnalyse;
  /** `provisoire` : les premiers constats sont reçus, le résultat final manque ; ce n'est pas `partielle`, qui dit une lecture incomplète terminée. */
  readonly statut: 'en-cours' | 'provisoire' | 'complete' | 'partielle' | 'annulee' | 'arretee';
  /** Les constats visibles : les ignorés n'y sont pas. */
  readonly constats: readonly Constat[];
  /** Tous les constats du message, ignorés compris. */
  readonly tous: readonly Constat[];
  readonly ignores: readonly string[];
  /** Les corrections que les réponses du designer ont tirées, par identifiant de question. */
  readonly repondues: Readonly<Record<string, Correction>>;
  readonly variants: ReadonlyArray<{ readonly id: string; readonly nom: string }>;
  readonly lecture: ReleveDeComposant['lecture'] | null;
  /** Le composant n'a aucun token `components` : le panneau propose de les préparer. */
  readonly sansTokens: boolean;
  /** Les variants lus sur le total, pendant l'analyse. */
  readonly progression: ({ readonly lus: number; readonly total: number } & Partial<ProgressionDAnalyse>) | null;
  /** Un changement du document ou de la sélection a rendu ces constats périmés ; l'interface les garde. */
  readonly perimee: boolean;
  readonly cause: CauseDePeremption | null;
  /** Le sandbox écrit un lot : la demande est partie, la réponse n'est pas revenue. */
  readonly ecriture: { readonly liaisons: number; readonly ids: readonly string[] } | null;
  readonly lot: LotEcrit | null;
  /** Les corrections déjà écrites pour cette analyse. */
  readonly appliquees: readonly string[];
  /** Les liaisons préparées reçues ; `null` avant la réponse, après un refus, et dès que l'analyse est périmée. */
  readonly liaisons: LiaisonsPreparees | null;
  /** Vrai dès que `lier-preparation` est parti pour cette analyse : il ne part qu'une fois. */
  readonly liaisonsDemandees: boolean;
  /** L'heure de réception, en millisecondes. */
  readonly recueA: number;
  /** Du clic sur Analyser au résultat final, horloge de l'interface ; absente sans clic retenu pour cette demande. */
  readonly dureeMs?: number;
  /** Le sujet que la sélection désignait à l'ouverture de l'analyse ; absent d'une analyse ouverte sans sélection connue. */
  readonly selection?: string;
}

/**
 * Vrai quand la sélection courante désigne encore le jeu analysé : le sujet sélectionné à l'ouverture, ou l'un des variants
 * lus. Sans sélection connue, rien ne dit qu'elle a changé.
 */
export function selectionSurLAnalyse(analyse: Pick<AnalyseRecue, 'selection' | 'variants'>, selection: string | null): boolean {
  if (selection === null || analyse.selection === undefined) return true;
  return selection === analyse.selection || analyse.variants.some((variant) => variant.id === selection);
}

const memeIdentite = (a: IdentiteDAnalyse, b: IdentiteDAnalyse): boolean => a.sujet === b.sujet && a.generation === b.generation;

/** Vrai quand l'identité est celle de l'analyse retenue. */
export const deLAnalyseCourante = (etat: Etat, identite: IdentiteDAnalyse): boolean => etat.analyse !== null && memeIdentite(etat.analyse.identite, identite);

const visibles = (tous: readonly Constat[], ignores: readonly string[]): Constat[] => tous.filter((constat) => !ignores.includes(constat.id));

/** Vrai tant que le résultat final manque, provisoire reçu ou non. Une analyse périmée ne calcule plus pour l'interface : son final sera refusé, Analyser redevient possible. */
export const calculEnCours = (analyse: Pick<AnalyseRecue, 'statut' | 'perimee'>): boolean => (analyse.statut === 'en-cours' || analyse.statut === 'provisoire') && !analyse.perimee;

/** Retient le message du sandbox. `occupe` ne change que l'écriture en cours. */
export function recevoirUneAnalyse(etat: Etat, message: MessageRecuDeLAnalyse): void {
  const courante = etat.analyse;
  const demande = demandes.get(etat);
  if ('demande' in message && message.demande !== undefined && demande && message.demande !== demande.id) return;
  if ((message.type === 'analyse' || message.type === 'occupe') && demande && message.demande === demande.id) demande.terminee = true;
  const dureeMs = message.type === 'analyse' && demande && message.demande === demande.id ? Math.max(0, performance.now() - demande.debut) : undefined;
  if (message.type === 'analyse-commencee') {
    if (courante && message.analyse.generation <= courante.identite.generation) return;
    etat.analyse = {
      identite: message.analyse, statut: 'en-cours', constats: [], tous: [], ignores: [], repondues: {}, variants: [], lecture: null, sansTokens: false, progression: null,
      perimee: false, cause: null, ecriture: null, lot: null, appliquees: [], liaisons: null, liaisonsDemandees: false, recueA: Date.now(),
      ...(etat.composant?.selection ? { selection: etat.composant.selection.id } : {}),
    };
    return;
  }
  // Une analyse sans `analyse-commencee` ouvre la sienne quand sa génération est plus récente que celle retenue.
  if ((message.type === 'analyse' || message.type === 'analyse-provisoire') && (!courante || message.analyse.generation > courante.identite.generation)) {
    const provisoire = message.type === 'analyse-provisoire';
    const ignores = provisoire ? message.ignores : [];
    etat.analyse = {
      identite: message.analyse, statut: provisoire ? 'provisoire' : message.statut, constats: visibles(message.constats, ignores), tous: message.constats, ignores, repondues: {}, variants: message.variants,
      lecture: message.lecture, sansTokens: provisoire ? false : message.sansTokens, progression: null, perimee: false, cause: null, ecriture: null, lot: null, appliquees: [], liaisons: null, liaisonsDemandees: false, recueA: Date.now(),
      ...(dureeMs !== undefined ? { dureeMs } : {}),
      ...(etat.composant?.selection ? { selection: etat.composant.selection.id } : {}),
    };
    return;
  }
  if (!courante || !memeIdentite(courante.identite, message.analyse)) return;
  switch (message.type) {
    case 'analyse-en-cours':
      if (!calculEnCours(courante) || courante.perimee) return;
      etat.analyse = { ...courante, progression: { lus: message.variantsLus, total: message.variantsTotal, ...message.progression, ...(message.progression ? { fraction: Math.max(courante.progression?.fraction ?? 0, Math.min(0.99, message.progression.fraction)) } : {}) } };
      return;
    case 'analyse-provisoire':
      // Un seul provisoire par analyse : un second, un tardif après le final et celui d'une analyse périmée sont refusés.
      if (courante.statut !== 'en-cours' || courante.perimee) return;
      etat.analyse = { ...courante, statut: 'provisoire', constats: visibles(message.constats, message.ignores), tous: message.constats, ignores: message.ignores, variants: message.variants, lecture: message.lecture };
      return;
    case 'analyse':
      // Une analyse déjà finie ou périmée ne reprend pas un final tardif de la même identité : les constats reçus restent, non applicables.
      if (courante.perimee || (courante.statut !== 'en-cours' && courante.statut !== 'provisoire')) return;
      // Le sandbox garde périmée l'analyse qu'un `perime` a atteinte : le message final ne la rend pas applicable.
      etat.analyse = {
        ...courante, statut: message.statut, constats: visibles(message.constats, courante.ignores), tous: message.constats, variants: message.variants,
        lecture: message.lecture, sansTokens: message.sansTokens, progression: null, recueA: Date.now(),
        ...(dureeMs !== undefined ? { dureeMs } : {}),
      };
      return;
    case 'ignores':
      etat.analyse = { ...courante, ignores: message.constats, constats: visibles(courante.tous, message.constats) };
      return;
    case 'question-repondue': {
      if (!analyseApplicable(courante)) return;
      const repondues: Record<string, Correction> = { ...courante.repondues };
      if (message.correction === null) delete repondues[message.question];
      else repondues[message.question] = message.correction;
      etat.analyse = { ...courante, repondues };
      return;
    }
    case 'modele-propose': {
      if (!analyseApplicable(courante)) return;
      // Les constats que la proposition remplace (`retires`, les C81 du modèle) quittent l'analyse. Ceux du modèle prennent la place de ceux qui portent le même identifiant ; les autres restent.
      const retires = new Set(message.retires);
      const restants = courante.tous.filter((constat) => !retires.has(constat.id));
      const nouveaux = new Map(message.constats.map((constat) => [constat.id, constat]));
      const tous = [...restants.map((constat) => nouveaux.get(constat.id) ?? constat), ...message.constats.filter((constat) => !restants.some((connu) => connu.id === constat.id))];
      etat.analyse = { ...courante, tous, constats: visibles(tous, courante.ignores) };
      return;
    }
    case 'liaisons-preparees':
      // Une réponse qui arrive après la péremption, ou avant le résultat final, n'est pas applicable.
      if (!analyseApplicable(courante)) return;
      etat.analyse = { ...courante, liaisons: message.refus === null ? { preparation: message.preparation, corrections: message.corrections, enAttente: message.enAttente } : null };
      return;
    case 'perime':
      // Un changement du document après une écriture est un Ctrl+Z : la ligne « Ctrl+Z défait ce lot » n'a plus d'objet.
      etat.analyse = { ...courante, perimee: true, cause: message.cause, lot: message.cause === 'ecriture' ? courante.lot : null, liaisons: null };
      return;
    case 'occupe':
      etat.analyse = { ...courante, ecriture: null };
      return;
    case 'corrections-appliquees':
      {
        const sautees = new Set(message.sautees.map(({ id }) => id));
        const ecrites = (courante.ecriture?.ids ?? []).filter((id) => !sautees.has(id));
        etat.analyse = { ...courante, ecriture: null, lot: { resume: message.resume, ecrites: message.ecrites, appliquees: ecrites }, appliquees: [...courante.appliquees, ...ecrites] };
      }
      return;
  }
}

/** Note les corrections que la demande d'écriture a envoyées, pour retirer de la liste celles que le sandbox n'a pas sautées. */
export function noterLEnvoi(etat: Etat, ids: readonly string[], liaisons: number): void {
  const { analyse } = etat;
  if (analyse) etat.analyse = { ...analyse, ecriture: { liaisons, ids }, lot: null };
}

/**
 * L'analyse retenue quand elle porte sur le composant lu (un de ses variants est un variant du jeu affiché), sinon `null`.
 * La section Variants s'appuie sur elle : sans constat, ou pendant l'écriture d'un lot, elle n'a rien à répartir.
 */
export function analyseDe(etat: Etat, lecture: LectureDeComposant | null): AnalyseRecue | null {
  const analyse = analyseDuComposant(etat, lecture);
  if (!analyse || analyse.statut === 'provisoire' || analyse.ecriture !== null || analyse.constats.length === 0) return null;
  return analyse;
}

/** Comme `analyseDe`, mais aussi pour une analyse sans constat ou pendant l'écriture : le panneau en a besoin. */
export function analyseDuComposant(etat: Etat, lecture: LectureDeComposant | null): AnalyseRecue | null {
  const { analyse } = etat;
  // Un résultat provisoire se montre ; seul le calcul sans constat n'a rien à rendre.
  if (!analyse || !lecture || analyse.statut === 'en-cours') return null;
  const ids = new Set([lecture.sujet.id, ...lecture.sujet.variants.map((variant) => variant.id)]);
  return analyse.variants.some((variant) => ids.has(variant.id)) ? analyse : null;
}

/**
 * La préparation rangée à lier au composant analysé, tant que la demande n'est pas partie : l'analyse est complète et non périmée,
 * et la préparation vient du même jeu (`source.jeu.cle` est le sujet de l'analyse) et a déjà vu une création de variables. Sans telle préparation, rien ne part.
 */
export function preparationALier(etat: Etat): PreparationVue | null {
  const { analyse } = etat;
  if (!analyse || analyse.statut !== 'complete' || analyse.perimee || analyse.liaisonsDemandees) return null;
  // Tant qu'aucune création n'a été tentée dans le fichier des tokens, aucune variable n'existe : chaque ligne attendrait sa publication.
  return etat.preparations.find((candidat) => candidat.source.jeu.cle === analyse.identite.sujet && candidat.variables.some((variable) => variable.etat !== 'a-creer')) ?? null;
}

/** Note que `lier-preparation` est parti pour l'analyse retenue. */
export function noterLaDemandeDesLiaisons(etat: Etat): void {
  if (etat.analyse) etat.analyse = { ...etat.analyse, liaisonsDemandees: true };
}

/** Vrai quand l'analyse non périmée porte des liaisons préparées à montrer : une ligne cochable ou une ligne en attente. */
export const aDesLiaisonsPreparees = (analyse: AnalyseRecue | null): boolean => analyse !== null && !analyse.perimee && analyse.liaisons !== null && analyse.liaisons.corrections.length + analyse.liaisons.enAttente.length > 0;

/** Vrai quand le composant analysé n'a aucun token et que l'analyse n'est pas périmée : le panneau le dit et propose de les préparer. */
export const aPreparer = (analyse: AnalyseRecue | null): boolean => analyseApplicable(analyse) && analyse!.sansTokens;

/** Seul un résultat final non périmé autorise une action d'écriture : réponse, Ignorer, correction, modèle, préparation. */
export const analyseApplicable = (analyse: AnalyseRecue | null): boolean => analyse !== null && (analyse.statut === 'complete' || analyse.statut === 'partielle') && !analyse.perimee;

/** Vrai quand plusieurs libraries portent des variables et qu'aucune n'est liée au composant : l'analyse attend le choix de la Configuration. */
export const libraryAChoisir = (etat: Etat): boolean => etat.reference !== null && etat.reference.library === null && etat.reference.candidates > 1;

/** Le plus grave des types, dans l'ordre du kit ; `null` sans constat. */
export function tonLePlusGrave(constats: readonly Pick<Constat, 'type'>[]): TypeDAlerte | null {
  let meilleur: TypeDAlerte | null = null;
  let rang: number = TYPES_D_ALERTE.length;
  for (const { type } of constats) {
    const candidat = TYPES_D_ALERTE.findIndex((entree) => entree.id === type);
    if (candidat < rang) {
      rang = candidat;
      meilleur = type;
    }
  }
  return meilleur;
}

type DemandeRetenue = { id: number; debut: number; mesurer: boolean; terminee: boolean; rendus: Set<RenduDAnalyse> };
const demandes = new WeakMap<Etat, DemandeRetenue>();

/** Le clic est horodaté dans l'interface ; aucun instant du sandbox n'est soustrait de cette horloge. */
export function noterLaDemandeDAnalyse(etat: Etat, id: number, mesurer: boolean, maintenant = performance.now()): void {
  demandes.set(etat, { id, debut: maintenant, mesurer, terminee: false, rendus: new Set() });
}

/** Acquitte après une occasion de peinture ; la durée inclut l'attente des frames, sans prétendre mesurer le compositeur. */
export function acquitterLeRenduDeLAnalyse(
  etat: Etat, message: MessageRecuDeLAnalyse,
  envoyer: (message: Extract<import('../../messages/analyse').DemandeDAnalyse, { type: 'analyse-rendue' }>) => void,
  planifier: (rendre: () => void) => void = (rendre) => requestAnimationFrame(() => requestAnimationFrame(rendre)),
  horloge: () => number = () => performance.now(),
  recueA?: number,
): void {
  const demande = demandes.get(etat);
  if (!demande?.mesurer || !('demande' in message) || message.demande !== demande.id || !deLAnalyseCourante(etat, message.analyse)) return;
  const reception = recueA ?? horloge();
  // Les premiers constats sont ceux du provisoire quand il en porte ; le final ne les acquitte qu'à défaut.
  const rendus: RenduDAnalyse[] = message.type === 'analyse-commencee' ? ['premier-affichage']
    : message.type === 'analyse-provisoire' ? (message.constats.length ? ['premiers-constats'] : [])
    : message.type === 'analyse' ? [...(message.constats.length ? ['premiers-constats' as const] : []), 'resultat-final'] : [];
  for (const rendu of rendus) {
    if (demande.rendus.has(rendu)) continue;
    demande.rendus.add(rendu);
    planifier(() => {
      if (demandes.get(etat) !== demande || !deLAnalyseCourante(etat, message.analyse)) return;
      const maintenant = horloge();
      const trace = { type: 'analyse-rendue' as const, demande: demande.id, analyse: message.analyse, rendu, depuisClicMs: maintenant - demande.debut, receptionAuRenduMs: maintenant - reception };
      console.info('Analyse : rendu interface', trace);
      envoyer(trace);
    });
  }
}

export const demandeDAnalyseEnCours = (etat: Etat): number | null => {
  const demande = demandes.get(etat);
  return demande && !demande.terminee ? demande.id : null;
};
