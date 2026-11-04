/**
 * Les signatures des écarts de la chaîne F8 et F9 (section D) : un écart se rattache à un écart connu de l'inventaire (E-25 à E-45 de
 * `INVENTAIRE-VERIFICATIONS.md`), de la mesure (N-64 à N-85 de `MESURE-DES-FAILLES.md`) ou à une hypothèse de la section 6.1 du plan,
 * sinon il se marque « nouveau ». Une signature lit la propriété violée, la sorte d'écart, le texte du détail et le cas qui l'a produit.
 * Elle ne juge rien : la mesure décrit, le rattachement dit si l'écart était déjà au registre.
 *
 * La première signature qui reconnaît l'écart gagne. À défaut, le rattachement que le cas déclare (l'écart ou l'hypothèse qu'il met à
 * l'épreuve) s'applique, puis « nouveau ». Les signatures ne citent aucun nom tiré d'une capture : elles lisent les formes des phrases
 * de l'oracle.
 */
export const NOUVEAU = 'nouveau';

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
const serieDe = (vue: VueDEcart): string => vue.cas.replace(/-\d+$/, '');

export const SIGNATURES: readonly Signature[] = [
  {
    ids: ['E-34'], resume: 'une correction arrive cochée, ou « Tout cocher » et « Tout décocher » manquent (Q-03)',
    reconnait: (vue) => vue.sorte === 'cochee' || (vue.sorte === 'bouton-manquant' && /Tout (cocher|décocher)/.test(vue.detail)),
  },
  {
    ids: ['N-77'], resume: 'quand tous les constats sont ignorés, l’écran répond « Aucun constat » et ne garde pas « Ne plus ignorer »',
    reconnait: (vue) => /Ne plus ignorer/.test(vue.detail) && vue.cas === 'F9-D1-19',
  },
  {
    ids: ['E-25'], resume: 'le kit ne juge pas ce layer : C25 ne juge que le texte `title`, le C30 du moteur reste seul',
    reconnait: (vue) => /^F8-D6/.test(vue.cas) && vue.sorte === 'manque' && /le kit signale l’écart \(C25\)/.test(vue.detail),
  },
  {
    ids: ['E-30'], resume: 'doublon du kit et du moteur, ou C43 et C44 « aucune instance » : deux cartes pour un même écart (Q-09)',
    reconnait: (vue) => vue.propriete === 'P11',
  },
  {
    ids: ['E-29'], resume: 'C30 et C41 vont dans Couleurs même pour une marge ou un style de texte',
    reconnait: (vue) => /^F8-D3/.test(vue.cas) && vue.sorte === 'non-affiche' && /(va dans l’élément|dessine la section) « (tailles|texte|tokens) »/.test(vue.detail),
  },
  {
    ids: ['E-32'], resume: 'moteur partiel avec relevé complet : la bannière dit « N variants lus sur N »',
    reconnait: (vue) => vue.propriete === 'P15' && /lus sur/.test(vue.detail),
  },
  {
    ids: ['E-31'], resume: 'le statut final ignore les lectures refusées : complete sans signal, et l’écran ne dit pas la part non jugée',
    reconnait: (vue) => vue.propriete === 'P14' || (vue.sorte === 'muet' && /l['’]écran dit que (les règles|le niveau|les ignorés|les lectures)/.test(vue.detail)),
  },
  {
    ids: ['E-38'], resume: 'le panneau périmé remplace la liste des constats par une note',
    reconnait: (vue) => /^F9-D1-(15|16|17)$/.test(vue.cas) && vue.sorte === 'non-affiche',
  },
  {
    ids: ['N-80'], resume: '`occupe` met l’écriture affichée à `null` alors que l’écriture continue',
    reconnait: (vue) => vue.propriete === 'P22' && vue.sorte === 'fuite',
  },
  {
    ids: ['E-39'], resume: '`occupe` ne dit rien au designer',
    reconnait: (vue) => vue.propriete === 'P22' && vue.sorte === 'muet',
  },
  {
    ids: ['N-71'], resume: 'une analyse annulée laisse son entrée ou son modèle retenu',
    reconnait: (vue) => vue.propriete === 'P18' && /entrée de session/.test(vue.detail),
  },
];

export interface Rattachement { readonly ids: readonly string[]; readonly resume: string }

/** L'écart connu que ce cas rattache à cet écart ; à défaut, ce que le cas déclare ; sinon « nouveau ». */
export function rattacher(vue: VueDEcart, declare?: string): Rattachement {
  const signature = SIGNATURES.find((candidate) => candidate.reconnait(vue));
  if (signature) return { ids: signature.ids, resume: signature.resume };
  if (declare) return { ids: [declare.split(' ')[0]], resume: `rattachement déclaré par le cas (${serieDe(vue)}) : ${declare}` };
  return { ids: [NOUVEAU], resume: 'aucune signature ne le reconnaît' };
}

export { dit };
