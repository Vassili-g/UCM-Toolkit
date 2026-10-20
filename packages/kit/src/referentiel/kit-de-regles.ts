/**
 * La grammaire du kit de règles Figma : les noms des trois maîtres, les calques que chaque règle lit, le marqueur des textes d'aide, et le validateur d'un relevé de ces maîtres.
 *
 * Après une modification : relancer `npm test`. Un nom ou un calque modifié demande aussi de republier le kit sur Figma Community et de corriger `docs/guides/KIT-DE-REGLES.md`, que `tests/guideDuKitDeRegles.test.ts` compare à ce fichier.
 */
import { TAGS_DES_REGLES, type RuleTag } from './regles.js';

export const MAITRES_DU_KIT_DE_REGLES = {
  conteneur: '.componentRules',
  section: '.rulesSection',
  regle: '.ruleItem',
} as const;

export const CALQUES_DU_KIT_DE_REGLES = {
  nomDuComposant: 'component-name',
  contenu: 'content',
  cible: 'prop',
  icone: 'icon',
  modifiable: 'modifiable',
  strict: 'strict',
} as const;
export type CalqueDuKitDeRegles = (typeof CALQUES_DU_KIT_DE_REGLES)[keyof typeof CALQUES_DU_KIT_DE_REGLES];

/** Les variants de `.rulesSection`, dans l'ordre du maître. */
export const SECTIONS_DU_KIT_DE_REGLES = ['GÉNÉRAL', 'PROPRIÉTÉS', 'OPTIONS', 'ICONES', 'DOCUMENTATION'] as const;

/**
 * Début d'un texte d'aide : un calque lu qui le contient n'est pas rédigé. Sans lui, le texte d'exemple d'une règle posée, ou le nom pré-rempli d'un conteneur, partirait dans le contrat comme une documentation réelle.
 */
export const MARQUEUR_A_COMPLETER = '[À compléter]';

/** Le calque qui porte un tag : `@usage`, `@prop`… */
export function calqueDuTag(tag: RuleTag): `@${RuleTag}` {
  return `@${tag}`;
}

/** Les calques par lesquels une règle écrit quelque chose : son texte, sa cible ou son icône. */
export const CALQUES_DE_CONTENU: readonly CalqueDuKitDeRegles[] = [
  CALQUES_DU_KIT_DE_REGLES.contenu,
  CALQUES_DU_KIT_DE_REGLES.cible,
  CALQUES_DU_KIT_DE_REGLES.icone,
];

/**
 * Les calques où chaque tag cherche le marqueur : ceux que l'export lit. `@default` ne lit pas son `content`, qui explique quoi écrire dans `prop` et garde son texte d'aide.
 */
export const CALQUES_LUS_PAR_TAG: Readonly<Record<RuleTag, readonly CalqueDuKitDeRegles[]>> = {
  usage: [CALQUES_DU_KIT_DE_REGLES.contenu],
  do: [CALQUES_DU_KIT_DE_REGLES.contenu],
  dont: [CALQUES_DU_KIT_DE_REGLES.contenu],
  pairs: [CALQUES_DU_KIT_DE_REGLES.contenu],
  prop: [CALQUES_DU_KIT_DE_REGLES.contenu, CALQUES_DU_KIT_DE_REGLES.cible],
  boolean: [CALQUES_DU_KIT_DE_REGLES.contenu, CALQUES_DU_KIT_DE_REGLES.cible],
  default: [CALQUES_DU_KIT_DE_REGLES.cible],
  icons: [CALQUES_DU_KIT_DE_REGLES.icone],
};

/**
 * Les calques d'aide que l'écriture ne remplit pas, et qui doivent donc porter le marqueur dans le maître : le texte d'une règle posée sans être rédigée.
 *
 * `@default` n'y est pas, l'écriture ne posant aucune règle de ce tag. `@icons` non plus : un maître antérieur écrit `icon-name` sans marqueur dans son calque `icon`, et l'écriture pose elle-même le marqueur dans chaque règle `@icons` qu'elle crée.
 */
export const AIDES_A_MARQUER: Readonly<Partial<Record<RuleTag, CalqueDuKitDeRegles>>> = {
  usage: CALQUES_DU_KIT_DE_REGLES.contenu,
  prop: CALQUES_DU_KIT_DE_REGLES.contenu,
  boolean: CALQUES_DU_KIT_DE_REGLES.contenu,
};

/** Compacte un nom (sans espaces, en minuscules) pour comparer un nom de composant. */
export function nomCompacte(nom: string): string {
  return nom.replace(/\s+/g, '').toLowerCase();
}

/** Les noms compactés des maîtres, dérivés de `MAITRES_DU_KIT_DE_REGLES`. */
export const MAITRES_COMPACTES: { readonly [K in keyof typeof MAITRES_DU_KIT_DE_REGLES]: string } = {
  conteneur: nomCompacte(MAITRES_DU_KIT_DE_REGLES.conteneur),
  section: nomCompacte(MAITRES_DU_KIT_DE_REGLES.section),
  regle: nomCompacte(MAITRES_DU_KIT_DE_REGLES.regle),
};

/**
 * Vrai d'un texte qui contient le marqueur, sans tenir compte de la casse.
 *
 * La normalisation Unicode compte : un « À » collé depuis un autre outil arrive parfois en deux points de code, et le marqueur serait alors publié.
 */
export function porteLeMarqueur(texte: string): boolean {
  return texte.normalize('NFC').toLowerCase()
    .includes(MARQUEUR_A_COMPLETER.normalize('NFC').toLowerCase());
}

/** Ce qu'une instance ou un variant de règle écrit, calque par calque : le nom du calque, puis son texte (vide pour un calque sans texte). */
export type TextesDesCalques = Readonly<Record<string, string>>;

export interface ReleveDuKitDeRegles {
  /** Les calques du maître `.componentRules`, avec leurs textes. */
  readonly conteneur: TextesDesCalques | null;
  /** Les variants de `.ruleItem` par tag ; un tag absent n'a pas de variant. */
  readonly regles: Readonly<Partial<Record<RuleTag, TextesDesCalques>>>;
}

export interface VerdictDuKitDeRegles {
  /** Les calques attendus et absents, sous la forme `.ruleItem/@prop/prop` ou `.componentRules/component-name`. */
  readonly manquants: readonly string[];
  /** Les tags sans variant dans `.ruleItem`. */
  readonly tagsSansVariant: readonly RuleTag[];
  /** Les tags dont le calque d'aide ne porte pas le marqueur. */
  readonly aidesSansMarqueur: readonly RuleTag[];
}

/** Les noms de calque se comparent sans casse ni espaces de bord, comme l'export les rapproche. */
function cleDeCalque(nom: string): string {
  return nom.trim().toLowerCase();
}

function aLeCalque(textes: TextesDesCalques, calque: string): boolean {
  const cible = cleDeCalque(calque);
  return Object.keys(textes).some((nom) => cleDeCalque(nom) === cible);
}

/** Le texte d'un calque, vide quand il manque. */
function texteDuCalque(textes: TextesDesCalques, calque: string): string {
  const cible = cleDeCalque(calque);
  const nom = Object.keys(textes).find((candidat) => cleDeCalque(candidat) === cible);
  return nom === undefined ? '' : textes[nom];
}

/** Les calques qu'une règle de ce tag attend, hors le calque du tag. `modifiable` et `strict` ne se lisent que pour `icons`. */
function calquesAttendus(tag: RuleTag): readonly CalqueDuKitDeRegles[] {
  return tag === 'icons'
    ? [...CALQUES_LUS_PAR_TAG[tag], CALQUES_DU_KIT_DE_REGLES.modifiable, CALQUES_DU_KIT_DE_REGLES.strict]
    : CALQUES_LUS_PAR_TAG[tag];
}

/**
 * Juge un relevé du kit sans Figma. Un calque en plus n'est pas une faute, le designer pouvant décorer un maître : le verdict ne liste donc que ce qui manque.
 *
 * Un tag sans variant est dit dans `tagsSansVariant` seulement, ses calques ne sont pas répétés dans `manquants`.
 */
export function validerLeKitDeRegles(releve: ReleveDuKitDeRegles): VerdictDuKitDeRegles {
  const manquants: string[] = [];
  const conteneur = releve.conteneur ?? {};
  if (!aLeCalque(conteneur, CALQUES_DU_KIT_DE_REGLES.nomDuComposant)) {
    manquants.push(`${MAITRES_DU_KIT_DE_REGLES.conteneur}/${CALQUES_DU_KIT_DE_REGLES.nomDuComposant}`);
  }

  const tagsSansVariant: RuleTag[] = [];
  const aidesSansMarqueur: RuleTag[] = [];
  for (const tag of TAGS_DES_REGLES) {
    const textes = releve.regles[tag];
    if (textes === undefined) {
      tagsSansVariant.push(tag);
      continue;
    }
    for (const calque of [calqueDuTag(tag), ...calquesAttendus(tag)]) {
      if (!aLeCalque(textes, calque)) {
        manquants.push(`${MAITRES_DU_KIT_DE_REGLES.regle}/${calqueDuTag(tag)}/${calque}`);
      }
    }
    const aide = AIDES_A_MARQUER[tag];
    if (aide !== undefined && !porteLeMarqueur(texteDuCalque(textes, aide))) aidesSansMarqueur.push(tag);
  }

  return { manquants, tagsSansVariant, aidesSansMarqueur };
}

/**
 * Vrai quand aucune règle de l'instance n'écrit autre chose que du vide ou le marqueur.
 *
 * Le critère est ce que les règles écrivent, jamais leur nom : une instance qui n'est pas une règle et qui écrit quelque chose compte pour du travail. Une instance remplie n'est donc jamais modifiée.
 */
export function estUneInstanceVierge(regles: readonly TextesDesCalques[]): boolean {
  return regles.every((textes) => CALQUES_DE_CONTENU.every((calque) => {
    const texte = texteDuCalque(textes, calque).trim();
    return texte === '' || porteLeMarqueur(texte);
  }));
}
