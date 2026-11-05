/**
 * Le cadre des cas du stress test F8 : le type d'un cas, la clé qui rattache un constat émis à un constat attendu, les constructeurs
 * d'attendus, le registre qui numérote les cas `<opérateur>-<n>`, et la mesure d'un cas (`mesurerLeCas`).
 *
 * La clé d'un constat dit ce qu'il juge, jamais où il est écrit à l'écran :
 * - C43 : `-` (un seul par composant) ;
 * - C45 : l'écart et la propriété ou la règle, en minuscules sans espaces ni ponctuation (`sans-regle|hasicon`) ;
 * - C44 des règles : la sorte du point (`aucune-instance`, `a-completer|@prop`, `plusieurs-instances`…), lue sur le titre du scan ;
 * - les autres points du moteur : le titre, l'impact et les nœuds du point.
 *
 * Un cas rend ses constats par `jouer(variante)`, asynchrone parce que le scan des règles et l'écriture le sont. Il ne lit jamais les
 * constats du plugin pour construire son oracle : les `attendus` viennent de l'opérateur, du plan et de l'inventaire.
 */
import type { Constat } from '@ucm-kit/core/controles';
import { sorteDuPointDeRegles } from 'ucm-plugin-socle/src/composant/contract/extractRules';

import { comparer } from '../../../../kit/tests/stress/commun/comparer';
import type { CasDeStress, ConstatAttendu, SorteDEcart, Verdict } from '../../../../kit/tests/stress/commun/types';
import type { LectureDeLaPage, Variante } from './pageDeRegles';

export type { Variante };
export type Relation = 'ordre' | 'casse';

/** Un constat attendu et ce que l'oracle dit de lui au-delà de la clé. */
export interface AttenduF8 extends ConstatAttendu {
  /** Des faits que le constat émis doit porter (`regles`, `valeurs`, `ecart`…), comparés en texte. */
  readonly faits?: Readonly<Record<string, string | number>>;
  readonly type?: Constat['type'];
  readonly famille?: Constat['famille'];
  /** Les nœuds que le constat range comme variants et comme layers. */
  readonly variants?: readonly string[];
  readonly layers?: readonly string[];
}

export interface SortieDeCas {
  readonly constats: readonly Constat[];
  readonly lecture?: LectureDeLaPage;
  /** Ce qu'une vérification propre au cas relit : résultats d'écriture, appels du double, éléments du panneau. */
  readonly donnees?: Readonly<Record<string, unknown>>;
}

export interface EntreeF8 {
  readonly description: string;
  jouer(variante: Variante): Promise<SortieDeCas>;
  /** Des vérifications au-delà de `comparer` : chaque message est un fait inexact. */
  verifier?(sortie: SortieDeCas): string[];
  /** Les relations métamorphiques qui s'appliquent au cas. */
  readonly relations: readonly Relation[];
  /** L'hypothèse de la section 6.1 du plan, ou l'écart connu (E-xx, N-xx), que le cas met à l'épreuve. */
  readonly rattachement?: string;
  /** Les cas de F9 : l'attente écrite à la main (`Attente` de `seance.ts`), que la garde relit sans passer le cas. */
  readonly oracle?: unknown;
}

export interface CasF8 extends CasDeStress<EntreeF8> {
  readonly attendus: readonly AttenduF8[];
}

/** Les hypothèses de la section 6.1 du plan que F8 touche, dans l'ordre du tableau. */
export const HYPOTHESES = {
  H01: 'hypothèse 1 de 6.1 (une valeur à point fausse l’axe de la cible)',
  H02: 'hypothèse 2 de 6.1 (`show-icon` et `show_icon` ne compactent pas comme `Show Icon`)',
  H03: 'hypothèse 3 de 6.1 (une règle `Size.xxl` n’est jamais signalée)',
  H04: 'hypothèse 4 de 6.1 (les identifiants de phrases jumelles dépendent de l’ordre)',
  H05: 'hypothèse 5 de 6.1 (le code du moteur dépend d’un mot du texte)',
  H06: 'hypothèse 6 de 6.1 (C34 reçoit « aucun variant », « aucune propriété » et « état non reconnu »)',
  H07: 'hypothèse 7 de 6.1 (C30 et C41 vont dans Couleurs même pour une marge)',
  H08: 'hypothèse 8 de 6.1 (C43 et C44 « aucune instance » donnent deux cartes)',
  H09: 'hypothèse 9 de 6.1 (deux composants au nom compacté égal partagent un conteneur)',
  H10: 'hypothèse 10 de 6.1 (un conteneur dans une instance fait compter l’instance parente)',
  H11: 'hypothèse 11 de 6.1 (instance d’une autre page ou calque vide : `creer` pose un second conteneur)',
  H12: 'hypothèse 12 de 6.1 (`creer` saute en objet-change quand le modèle manque)',
  H13: 'hypothèse 13 de 6.1 (le statut final ignore les lectures refusées ; AAA devient AA sans le dire)',
  H14: 'hypothèse 14 de 6.1 (moteur partiel « N variants lus sur N » ; le relevé et le moteur coupent à des variants différents)',
  H15: 'hypothèse 15 de 6.1 (une analyse partielle sans constat montre les sections tenues)',
  H16: 'hypothèse 16 de 6.1 (tous les constats ignorés : « Aucun constat » avant la liste des ignorés)',
  H17: 'hypothèse 17 de 6.1 (une déclaration UCM qui lève donne `architectureUcm` faux en silence)',
  H18: 'hypothèse 18 de 6.1 (une library illisible ou une collection inaccessible laisse `complete` sans signal)',
  H19: 'hypothèse 19 de 6.1 (le panneau périmé remplace la liste par une note)',
  H20: 'hypothèse 20 de 6.1 (`occupe` ne dit rien et met l’écriture à `null`)',
  H21: 'hypothèse 21 de 6.1 (un `parcourir` ou un décompte qui lève coupe les variants suivants ou arrête le moteur)',
  H22: 'hypothèse 22 de 6.1 (la garde « library à choisir » ne vaut que pour une première analyse, et la prélecture l’ignore)',
  H23: 'hypothèse 23 de 6.1 (une erreur après le message final envoie un second message `analyse` arrêtée)',
  H24: 'hypothèse 24 de 6.1 (les lecteurs avalent `AnalyseAnnulee` : une annulation compte comme lecture refusée)',
} as const;

// ---------------------------------------------------------------------------------------------------------------------------
// Clés

/** Minuscules, sans espaces ni ponctuation : deux écritures d'un même nom donnent la même clé. */
export const compacter = (texte: string): string => texte.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/** La sorte d'un point C44 que le scan des règles écrit, lue sur son titre. `null` : un autre point, gardé par son titre. */
export function sorteDeC44(titre: string): string | null {
  const sorte = sorteDuPointDeRegles(titre);
  if (sorte) return sorte;
  const marque = /(?:règle|règles) (@\w+) contien(?:t|nent) encore/.exec(titre);
  return marque ? `a-completer|${marque[1]}` : null;
}

export function cleDeConstat(constat: Constat): string {
  const { faits } = constat;
  if (constat.code === 'C43') return '-';
  if (constat.code === 'C45') return `${String(faits.ecart)}|${compacter(String(faits.propriete ?? faits.regle ?? ''))}`;
  const titre = String(faits.titre ?? faits.message ?? '');
  const sorte = constat.code === 'C44' ? sorteDeC44(titre) : null;
  return sorte ?? `${titre}|${String(faits.impact ?? '')}|${[...constat.variants, ...constat.layers].sort().join(',')}`;
}

export const cleComplete = (constat: Constat): string => `${constat.code}|${cleDeConstat(constat)}`;

// ---------------------------------------------------------------------------------------------------------------------------
// Constructeurs d'attendus

export function attenduC43(regles: number, plus: { creer?: boolean; apres?: ConstatAttendu['apres'] } = {}): AttenduF8 {
  return { code: 'C43', cle: '-', forme: 'correction', apres: plus.apres ?? { nom: 'creer' }, faits: { regles }, type: 'corriger' };
}

export function attenduSansRegle(propriete: string, regles: number): AttenduF8 {
  return { code: 'C45', cle: `sans-regle|${compacter(propriete)}`, forme: 'correction', apres: { nom: 'ajouter' }, faits: { ecart: 'sans-regle', regles }, type: 'corriger' };
}

export function attenduSansValeur(propriete: string, valeurs: readonly string[]): AttenduF8 {
  return {
    code: 'C45', cle: `sans-valeur|${compacter(propriete)}`, forme: 'correction', apres: { nom: 'ajouter' },
    faits: { ecart: 'sans-valeur', valeurs: valeurs.join(', '), regles: valeurs.length }, type: 'corriger',
  };
}

/** `sans-propriete` n'a jamais de correction. */
export function attenduSansPropriete(ecrit: string): AttenduF8 {
  return { code: 'C45', cle: `sans-propriete|${compacter(ecrit)}`, forme: 'a-faire', faits: { ecart: 'sans-propriete' }, type: 'corriger' };
}

export function attenduC44(sorte: string): AttenduF8 {
  return { code: 'C44', cle: sorte, forme: 'a-faire' };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Registre

export interface DefinitionDeCas {
  readonly description: string;
  readonly attendus?: readonly AttenduF8[];
  readonly jouer: EntreeF8['jouer'];
  readonly verifier?: EntreeF8['verifier'];
  readonly relations?: readonly Relation[];
  readonly rattachement?: string;
  readonly oracle?: unknown;
  /** `mesure` : la question de la section 9 dont dépend l'oracle. */
  readonly question?: string;
  readonly codesJuges?: readonly string[];
}

export class Registre {
  readonly cas: CasF8[] = [];
  private readonly compteurs = new Map<string, number>();

  constructor(readonly famille: string) {}

  ajouter(operateur: string, definition: DefinitionDeCas): CasF8 {
    const rang = (this.compteurs.get(operateur) ?? 0) + 1;
    this.compteurs.set(operateur, rang);
    const cas: CasF8 = {
      id: `${operateur}-${rang}`, famille: this.famille, operateur, verdict: definition.question ? 'mesure' : 'attendu',
      ...(definition.question ? { question: definition.question } : {}),
      entree: {
        description: definition.description, jouer: definition.jouer, ...(definition.verifier ? { verifier: definition.verifier } : {}),
        relations: definition.relations ?? ['ordre', 'casse'], ...(definition.rattachement ? { rattachement: definition.rattachement } : {}),
        ...(definition.oracle !== undefined ? { oracle: definition.oracle } : {}),
      },
      attendus: definition.attendus ?? [],
      ...(definition.codesJuges ? { codesJuges: definition.codesJuges } : {}),
    };
    this.cas.push(cas);
    return cas;
  }
}

// ---------------------------------------------------------------------------------------------------------------------------
// Mesure

export type SorteF8 = SorteDEcart | 'fait-inexact';

export interface EcartF8 {
  readonly cas: string;
  readonly sorte: SorteF8;
  readonly detail: string;
}

export interface EcartDeRelation {
  readonly cas: string;
  readonly relation: Relation;
  readonly detail: string;
}

export interface ResultatF8 {
  readonly cas: CasF8;
  readonly sortie?: SortieDeCas;
  readonly exception?: string;
  readonly attendus: number;
  readonly detectes: number;
  readonly ecarts: readonly EcartF8[];
}

const messageDe = (erreur: unknown): string => (erreur instanceof Error ? `${erreur.name} : ${erreur.message}` : String(erreur));
export { messageDe };

/** Compare les faits que l'oracle attend (`faits`, `type`) à ceux du constat émis de même clé. */
function verifierLesFaits(cas: CasF8, emis: readonly Constat[]): EcartF8[] {
  const ecarts: EcartF8[] = [];
  for (const attendu of cas.attendus) {
    const constat = emis.find((candidat) => candidat.code === attendu.code && cleDeConstat(candidat) === attendu.cle);
    if (!constat) continue;
    for (const [nom, valeur] of Object.entries(attendu.faits ?? {})) {
      if (String(constat.faits[nom]) !== String(valeur)) ecarts.push({ cas: cas.id, sorte: 'fait-inexact', detail: `${attendu.code}|${attendu.cle} : ${nom} = ${String(constat.faits[nom])}, attendu ${String(valeur)}` });
    }
    if (attendu.type !== undefined && constat.type !== attendu.type) ecarts.push({ cas: cas.id, sorte: 'fait-inexact', detail: `${attendu.code}|${attendu.cle} : type ${constat.type}, attendu ${attendu.type}` });
    if (attendu.famille !== undefined && constat.famille !== attendu.famille) ecarts.push({ cas: cas.id, sorte: 'fait-inexact', detail: `${attendu.code}|${attendu.cle} : famille ${constat.famille}, attendu ${attendu.famille}` });
    for (const champ of ['variants', 'layers'] as const) {
      const voulus = attendu[champ];
      if (voulus !== undefined && JSON.stringify([...constat[champ]].sort()) !== JSON.stringify([...voulus].sort())) ecarts.push({ cas: cas.id, sorte: 'fait-inexact', detail: `${attendu.code}|${attendu.cle} : ${champ} [${constat[champ].join(', ')}], attendu [${voulus.join(', ')}]` });
    }
  }
  return ecarts;
}

export async function mesurerLeCas(cas: CasF8): Promise<ResultatF8> {
  let sortie: SortieDeCas;
  try {
    sortie = await cas.entree.jouer({});
  } catch (erreur) {
    return { cas, exception: messageDe(erreur), attendus: cas.attendus.length, detectes: 0, ecarts: [] };
  }
  const compare = comparer(cas, sortie.constats, cleDeConstat);
  const ecarts: EcartF8[] = compare.ecarts.map(({ sorte, detail }) => ({ cas: cas.id, sorte, detail }));
  ecarts.push(...verifierLesFaits(cas, sortie.constats));
  try {
    for (const detail of cas.entree.verifier?.(sortie) ?? []) ecarts.push({ cas: cas.id, sorte: 'fait-inexact', detail });
  } catch (erreur) {
    ecarts.push({ cas: cas.id, sorte: 'fait-inexact', detail: `vérification impossible : ${messageDe(erreur)}` });
  }
  const detectes = cas.attendus.filter((attendu) => !ecarts.some((ecart) => ecart.sorte !== 'faux-constat' && ecart.sorte !== 'doublon' && ecart.detail.startsWith(`${attendu.code}|${attendu.cle}`))).length;
  return { cas, sortie, attendus: cas.attendus.length, detectes, ecarts };
}

export type { Verdict };
