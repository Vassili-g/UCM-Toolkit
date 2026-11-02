/**
 * Les signatures des écarts de la chaîne F3 : un écart de l'écran, de l'écriture ou de `comparer` se rattache à un écart connu de
 * l'inventaire (E-25 à E-45 de `INVENTAIRE-VERIFICATIONS.md`) ou de la mesure (N-04 à N-22 de `MESURE-DES-FAILLES.md`), sinon il se
 * marque « nouveau ». Une signature lit la propriété violée, la sorte d'écart, le texte du détail et le cas qui l'a produit. Elle ne
 * juge rien : la mesure décrit, le rattachement dit si l'écart était déjà au registre.
 */
import type { Ecart } from '../../../../kit/tests/stress/commun/types';
import type { EcartDEcran } from './chaine';

export const NOUVEAU = 'nouveau';

/** Ce qu'une signature voit d'un écart, qu'il vienne de l'écran (`EcartDEcran`) ou de `comparer` (`Ecart`). */
export interface VueDEcart {
  readonly cas: string;
  readonly propriete: string;
  /** Sorte d'un écart d'écran, ou sorte d'un écart de `comparer`. */
  readonly sorte: string;
  readonly detail: string;
}

export interface Signature {
  readonly ids: readonly string[];
  /** Ce que le rattachement dit en une phrase. */
  readonly resume: string;
  reconnait(vue: VueDEcart): boolean;
}

const dit = (motif: RegExp) => (vue: VueDEcart): boolean => motif.test(vue.detail);

/** Dans l'ordre : la première signature qui reconnaît l'écart le rattache. */
export const SIGNATURES: readonly Signature[] = [
  {
    ids: ['E-25'], resume: 'C25 ne juge que le texte `title` : aucun constat sur un fond, un trait ou une plage (Q-06)',
    reconnait: (vue) => /C25/.test(vue.detail) && /attendu et absent|aucun constat C25|aucune carte lier \(C25\)|pour C25/.test(vue.detail),
  },
  {
    ids: ['E-25'], resume: 'sans C25 du kit, le point C30 du moteur reste seul sur le layer',
    reconnait: (vue) => /^D4-[12]$/.test(vue.cas) && /C30/.test(vue.detail),
  },
  {
    ids: ['N-15'], resume: 'C63 `vide` ne sort jamais sur un composant conforme : la sœur en alias ne compte pas',
    reconnait: (vue) => /C63 vide/.test(vue.detail),
  },
  {
    ids: ['E-38'], resume: 'le panneau périmé remplace ses cartes par une note au lieu de garder ses constats',
    reconnait: (vue) => vue.cas === 'D3-4',
  },
  {
    ids: ['E-34'], resume: 'une correction arrive cochée, ou le pied dit qu\'une correction l\'est',
    reconnait: (vue) => vue.propriete === 'P11' && vue.sorte === 'cochee',
  },
  {
    ids: ['E-34'], resume: '« Tout cocher » ou « Tout décocher » manque (Q-03)',
    reconnait: (vue) => vue.propriete === 'P11' && vue.sorte === 'bouton-manquant',
  },
  {
    ids: ['E-35'], resume: 'Ignorer ou « Ne plus proposer » manque sur une carte de question (Q-11)',
    reconnait: (vue) => vue.propriete === 'P13' && vue.sorte === 'bouton-manquant',
  },
  {
    ids: ['E-30'], resume: 'doublon du kit et du moteur : deux constats ou deux cartes pour un même layer (Q-09)',
    reconnait: (vue) => vue.propriete === 'P12' || (vue.cas.startsWith('D4-') && (vue.sorte === 'doublon' || vue.sorte === 'faux-constat')),
  },
  {
    ids: ['E-28', 'N-15', 'N-16'], resume: 'C63 sans genre, phrase de repli « Constat C63. » ou question sans lieu',
    reconnait: (vue) => vue.propriete === 'P15' && /C63|Constat C\d+/.test(vue.detail),
  },
  {
    ids: ['E-28'], resume: 'la correction alias-de-mode est comptée mais l\'écriture ne la fait pas',
    reconnait: (vue) => vue.propriete === 'P16' && /alias-de-mode/.test(vue.detail),
  },
  {
    ids: ['E-36'], resume: 'le texte de C64 parle d\'un autre variant que le motif ne compare pas',
    reconnait: (vue) => /C64/.test(vue.detail) && vue.propriete === 'P15',
  },
  {
    ids: ['E-32'], resume: 'moteur partiel avec un relevé complet : la bannière dit « N variants lus sur N »',
    reconnait: (vue) => vue.propriete === 'P18' && /lus sur/.test(vue.detail),
  },
  {
    ids: ['E-31'], resume: "le statut final ignore la lecture refusée : l'analyse reste complète et ne dit pas qu'elle est partielle",
    reconnait: (vue) => vue.propriete === 'P18' && /statut final est complete|ne dit pas que l'analyse est partielle/.test(vue.detail),
  },
  {
    ids: ['N-06'], resume: 'palette et rôle faux sur la même liaison : deux corrections, dont une saute en fait-faux',
    reconnait: (vue) => vue.propriete === 'P21',
  },
  {
    ids: ['N-04'], resume: 'C18 accuse une forme dont le token porte le scope SHAPE_FILL',
    reconnait: (vue) => vue.sorte === 'faux-constat' && dit(/C18/)(vue),
  },
  {
    ids: ['N-09'], resume: 'la propagation pose une question sans candidat par plage de texte',
    reconnait: (vue) => /^(M2|D2-1[6-8])/.test(vue.cas) && vue.sorte === 'faux-constat',
  },
  {
    ids: ['N-22'], resume: 'un rôle divider, inverse ou ring reçoit une correction de rôle (Q-F3-3)',
    reconnait: (vue) => /C24/.test(vue.detail) && /divider|inverse|ring/.test(vue.detail),
  },
];

/** L'écart connu que ce cas rattache à cet écart, ou « nouveau ». Une signature par écart : la première qui reconnaît gagne. */
export function rattacher(vue: VueDEcart): { readonly ids: readonly string[]; readonly resume: string } {
  const signature = SIGNATURES.find((candidate) => candidate.reconnait(vue));
  return signature ? { ids: signature.ids, resume: signature.resume } : { ids: [NOUVEAU], resume: 'aucune signature ne le reconnaît' };
}

export const vueDeLEcran = (cas: string, ecart: EcartDEcran): VueDEcart => ({ cas, propriete: ecart.propriete, sorte: ecart.sorte, detail: ecart.detail });

export const vueDeComparer = (cas: string, propriete: string, ecart: Ecart): VueDEcart => ({ cas, propriete, sorte: ecart.sorte, detail: ecart.detail });
