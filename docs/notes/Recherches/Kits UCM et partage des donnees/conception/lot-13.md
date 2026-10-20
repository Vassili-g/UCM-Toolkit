# Conception du lot 13

Entrée des tâches T13.1 et T13.2 du
[plan d'implémentation](../PLAN-IMPLEMENTATION-FIABILITE.md). Le pourquoi est
dans le [plan de fiabilité](../PLAN-FIABILITE-KITS-ET-PLUGINS.md), lot 13. Les
chemins de l'exporteur sont relatifs à `packages/plugin-exporter/src/`.

## Ce que le code fait aujourd'hui

- `contract/extractRules.ts` écrit les noms à la main : `RULES_CONTAINER_NAME`
  (`.componentRules`), `MAITRE_COMPACTE` (`.componentrules`),
  `RULE_ITEM_NAME` (`.ruleItem`), `RULES_COMPONENT_NAME` (`.ruleitem`),
  `COMPONENT_NAME_LAYER`, `MARQUEUR_A_COMPLETER`, `RULE_CONTENT_LAYERS`
  (`content`, `prop`, `icon`), `CALQUES_LUS` (les calques lus par tag), et les
  calques `modifiable` et `strict` en littéraux.
- `template/sources.ts` tient `AIDES_LUES` (les calques d'aide qui doivent
  porter le marqueur) et la fonction `aideSansMarqueur`.
- `template/modele.ts` importe `isDisabledStateValue` de
  `contract/parsers.ts` et `RuleTag` de `contract/rulesModel.ts`.
- Le guide `docs/guides/KIT-DE-REGLES.md` recopie les noms des trois maîtres,
  les calques et les cinq sections de `.rulesSection`.
- Le kit Figma ne porte aucun numéro de version.

## La grammaire : `packages/kit/src/referentiel/kit-de-regles.ts`

Le module est publié par `referentiel/index.ts`. Il importe `TAGS_DES_REGLES`
et `RuleTag` de `regles.ts`.

```ts
export const VERSION_DU_KIT_DE_REGLES = 1;

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

export const MARQUEUR_A_COMPLETER = '[À compléter]';

/** Le calque qui porte un tag : `@usage`, `@prop`… */
export function calqueDuTag(tag: RuleTag): `@${RuleTag}`;

/** Les calques par lesquels une règle écrit quelque chose. Était `RULE_CONTENT_LAYERS`. */
export const CALQUES_DE_CONTENU: readonly CalqueDuKitDeRegles[]; // content, prop, icon

/** Les calques que l'export lit pour chaque tag. Était `CALQUES_LUS`. */
export const CALQUES_LUS_PAR_TAG: Readonly<Record<RuleTag, readonly CalqueDuKitDeRegles[]>>;

/** Les calques d'aide qui doivent porter le marqueur dans le maître. Était `AIDES_LUES`. */
export const AIDES_A_MARQUER: Readonly<Partial<Record<RuleTag, CalqueDuKitDeRegles>>>;

/** Sans espaces, en minuscules. Était `compactName`. */
export function nomCompacte(nom: string): string;

/** Les noms compactés des maîtres, dérivés de `MAITRES_DU_KIT_DE_REGLES`. */
export const MAITRES_COMPACTES: { readonly [K in keyof typeof MAITRES_DU_KIT_DE_REGLES]: string };

/** Le marqueur, sans tenir compte de la casse ni de la forme Unicode. Était `porteLeMarqueur`. */
export function porteLeMarqueur(texte: string): boolean;
```

Les formes compactées ne s'écrivent plus nulle part : `MAITRE_COMPACTE` et
`RULES_COMPONENT_NAME` disparaissent au profit de `MAITRES_COMPACTES`.

`isDisabledStateValue` passe dans `packages/kit/src/format/names.ts` sous le
nom `estUneValeurDesactivee`, publiée par `format/index.ts`.
`contract/parsers.ts` l'importe et ne la redéfinit plus.

## Le relevé portable et le validateur

L'exporteur construit le relevé depuis Figma. Le kit le juge sans Figma.

```ts
/** Ce qu'une instance ou un variant de règle écrit, calque par calque. */
export type TextesDesCalques = Readonly<Record<string, string>>;

export interface ReleveDuKitDeRegles {
  /** La version lue dans la description du maître `.componentRules`, ou `null` sans mention. */
  readonly version: number | null;
  /** Les calques du maître `.componentRules`, avec leurs textes. */
  readonly conteneur: TextesDesCalques | null;
  /** Les variants de `.ruleItem` par tag ; un tag absent n'a pas de variant. */
  readonly regles: Readonly<Partial<Record<RuleTag, TextesDesCalques>>>;
}

export interface VerdictDuKitDeRegles {
  readonly version: 'courante' | 'future';
  /** Les calques attendus et absents, sous la forme `.ruleItem/@prop/prop` ou `.componentRules/component-name`. */
  readonly manquants: readonly string[];
  /** Les tags sans variant dans `.ruleItem`. */
  readonly tagsSansVariant: readonly RuleTag[];
  /** Les tags dont le calque d'aide ne porte pas le marqueur. */
  readonly aidesSansMarqueur: readonly RuleTag[];
}

export function validerLeKitDeRegles(releve: ReleveDuKitDeRegles): VerdictDuKitDeRegles;

/** Vrai quand aucune règle de l'instance n'écrit autre chose que du vide ou le marqueur. Était `estVierge`. */
export function estUneInstanceVierge(regles: readonly TextesDesCalques[]): boolean;
```

Règles du validateur :

- Le conteneur attend `component-name`. Une règle attend son calque de tag et
  les calques de `CALQUES_LUS_PAR_TAG[tag]`. Les calques `modifiable` et
  `strict` sont attendus pour `icons` seulement.
- Un calque en plus n'est pas une faute : le designer peut décorer le maître.
  Le validateur ne rend donc pas de liste « en trop ».
- `aidesSansMarqueur` reprend `aideSansMarqueur` de `template/sources.ts`.
- Version : `null` vaut 1. Au-dessus de `VERSION_DU_KIT_DE_REGLES`, le
  verdict est `future`.

### Le numéro de version dans Figma

La description du maître `.componentRules` peut porter la ligne
`ucm-kit-de-regles: 1`. L'exporteur la lit par
`/ucm-kit-de-regles\s*:\s*(\d+)/i`. Le kit actuel ne la porte pas et vaut 1 :
aucune migration du fichier Figma n'est demandée. Le mainteneur ajoutera la
ligne à la prochaine publication du kit sur Figma Community.

Un kit `future` :

- se lit toujours : l'export des règles déjà rédigées ne change pas ;
- ne sert pas à créer ou remplir des règles. L'offre de création
  (`offreDeCreation`, `resoudreLesSources`) rend un refus. Textes :
  - fr : « Ce kit de règles vient d'une version plus récente d'UCM Exporter.
    Mettez le plugin à jour pour créer des règles. »
  - en : « This rules kit comes from a newer version of UCM Exporter. Update
    the plugin to create rules. »

Une instance remplie n'est jamais modifiée : `estUneInstanceVierge` garde le
critère actuel (ce que les instances écrivent, pas leur nom).

## Ce que l'exporteur garde

- Le parcours de Figma et la construction du relevé (`ReleveDeSource`,
  `rulesContainerOwner`, `textOfLayer`, `nomLisible`, `porteLeNom`).
- Les messages des diagnostics et leur texte.
- `extractRules.ts` peut republier les constantes du kit le temps de migrer
  ses tests, puis le réexport est retiré : `git grep` des littéraux
  `'.componentRules'`, `'.ruleItem'`, `'component-name'` et
  `'[À compléter]'` sous `plugin-exporter/src` ne rend plus rien.
- `template/modele.ts` n'importe plus que `@ucm-kit/core/format` et
  `@ucm-kit/core/referentiel`.

## Le guide tenu par un test (T13.2)

Un test racine, `tests/guideDuKitDeRegles.test.ts`, lit
`docs/guides/KIT-DE-REGLES.md` et vérifie :

- les trois maîtres de la puce « Noms exacts » et de la table « Ce que le kit
  contient » valent `MAITRES_DU_KIT_DE_REGLES` ;
- les calques de la puce « Noms exacts » valent `CALQUES_DU_KIT_DE_REGLES`,
  et un calque par tag est annoncé ;
- les cinq sections de la table valent `SECTIONS_DU_KIT_DE_REGLES` ;
- le marqueur cité vaut `MARQUEUR_A_COMPLETER` ;
- la puce « Marqueur » cite les tags de `AIDES_A_MARQUER`.

Le guide gagne une puce « Version » dans « Vérifier avant de publier » : la
description de `.componentRules` porte `ucm-kit-de-regles:` suivi du numéro
courant.

## Les tests

- Kit : chaque tag et chaque calque attendu ; un relevé complet ne rend rien ;
  un calque retiré le rend dans `manquants` ; un tag sans variant ; une aide
  sans marqueur ; version `null`, 1 et 2 ; instance vierge, instance remplie.
- Exporteur : les tests actuels de `extractRules`, du modèle et des sources
  passent sans changement d'attente, et les contrats produits restent
  identiques octet pour octet. Un kit `future` refuse la création, sans
  écriture, avec le texte, et l'export des règles rédigées ne change pas.
