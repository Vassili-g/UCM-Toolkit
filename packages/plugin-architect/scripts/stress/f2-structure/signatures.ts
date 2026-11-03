/**
 * Les signatures des écarts de la chaîne F2 : un écart de l'écran se rattache à un écart connu de l'inventaire (E-20 à E-24 de
 * `INVENTAIRE-VERIFICATIONS.md`) ou de la mesure (N-24 à N-33 de `MESURE-DES-FAILLES.md`), sinon il se marque « nouveau ». Une
 * signature lit la propriété violée, la sorte d'écart, le texte du détail et le cas qui l'a produit. Elle ne juge rien : la mesure
 * décrit, le rattachement dit si l'écart était déjà au registre.
 */
import type { EcartDEcran } from './chaine';

export const NOUVEAU = 'nouveau';

/** Ce qu'une signature voit d'un écart. */
export interface VueDEcart {
  readonly cas: string;
  readonly propriete: string;
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
    ids: ['E-23'], resume: 'une lecture qui échoue envoie des listes vides : l\'onglet dit « Rien à régler », et des réglages illisibles font réapparaître les ignorés et perdre l\'écriture',
    reconnait: (vue) => vue.propriete === 'P13',
  },
  {
    ids: ['E-24'], resume: 'après une écriture, seuls `deja-la` et `existe-divergente` ont un texte : les autres motifs ne disent que « N sautée(s) »',
    reconnait: (vue) => vue.propriete === 'P14',
  },
  {
    ids: ['E-22'], resume: 'une correction arrive cochée, ou le pied dit qu\'une correction l\'est (Q-03)',
    reconnait: (vue) => vue.propriete === 'P12' && vue.sorte === 'cochee',
  },
  {
    ids: ['E-22'], resume: '« Tout cocher » ou « Tout décocher » manque dans une section de corrections (Q-03)',
    reconnait: (vue) => vue.propriete === 'P12' && vue.sorte === 'bouton-manquant',
  },
  {
    ids: ['E-20'], resume: 'un constat de C60 sans correction n\'a pas de genre déclaré : `lireLesConstats` le saute, il n\'apparaît nulle part',
    reconnait: (vue) => /C60/.test(vue.detail) && ['P9', 'P10', 'P11'].includes(vue.propriete),
  },
  {
    ids: ['E-21'], resume: 'C82 `scopes` n\'est pas dans `GENRES_DECLARES` : une proposition ignorée le fait disparaître',
    reconnait: (vue) => /C82 scopes/.test(vue.detail) && ['P9', 'P10', 'P11'].includes(vue.propriete),
  },
  {
    ids: ['E-21'], resume: 'C63 `scopes` n\'a pas de genre non plus (hypothèse 7) : une proposition ignorée le fait disparaître, comme C82 `scopes`',
    reconnait: (vue) => /C63 sans genre/.test(vue.detail) && ['P9', 'P10', 'P11'].includes(vue.propriete),
  },
];

/** L'écart connu que cet écart rattache, ou « nouveau ». Une signature par écart : la première qui reconnaît gagne. */
export function rattacher(vue: VueDEcart): { readonly ids: readonly string[]; readonly resume: string } {
  const signature = vue.sorte === 'exception' ? undefined : SIGNATURES.find((candidate) => candidate.reconnait(vue));
  return signature ? { ids: signature.ids, resume: signature.resume } : { ids: [NOUVEAU], resume: 'aucune signature ne le reconnaît' };
}

export const vueDeLEcran = (cas: string, ecart: EcartDEcran): VueDEcart => ({ cas, propriete: ecart.propriete, sorte: ecart.sorte, detail: ecart.detail });
