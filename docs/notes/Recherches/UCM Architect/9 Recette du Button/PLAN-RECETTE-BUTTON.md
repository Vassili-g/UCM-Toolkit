# Plan de la recette du Button (25 novembre)

Le rapport `ucm-architect-rapport-Button-2026-11-25-16-33-55.json` du fichier « UCM Tests - Composants » porte 184 constats.
Les 180 constats C24 sont faux. Ils accusent le `Vector` des deux icônes (`arrow-left-long`, `arrow-right-long`) dans chacun
des 90 variants, lié à `Button/Color/…/foreground`, d'attendre un token `background`. Le mainteneur a validé les quatre corrections
ci-dessous. C10 ×3 et C53 sont justes et ne changent pas.

## Causes lues dans le code

- `rolesAdmisDuLayer` (`packages/kit/src/controles/mapping.ts`) rend `['background']` pour tout remplissage qui n'est ni un texte
  ni une icône, quel que soit le type du calque.
- `estUneIcone` (`packages/kit/src/referentiel/layers.ts`) ne reconnaît pas `arrow-left-long`. Son nom n'a pas de mot d'icône,
  aucune propriété d'échange d'instance ne la pilote, et le tracé s'appelle `Vector`. La propriété booléenne `Icon-Left#1261:147`
  pilote sa visibilité, et rien ne la lit.
- La surcharge ne garde que `{ id, nom, type }` du calque peint (`packages/plugin-architect/src/releveDuComposant.ts`, ligne 478).
  Les instances entre le layer lu (`.sizeWrapperButton`) et le calque peint sont perdues, donc un tracé imbriqué à deux niveaux
  n'est jamais reconnu comme icône.
- « Sélectionner » envoie `constat.layers`, ici `.sizeWrapperButton`, qui a la taille du variant (125×44).
- Chaque constat donne sa carte : 180 cartes « 1 variant », dont le lieu dit « layer Vector ».
- Les 90 variants posent `.sizeWrapperButton` en `Size=Medium`. Button n'a pas de propriété `Size` et l'instance n'est pas
  exposée (`exposedInstances: []`). Les tokens `Button/Size/Small/…` et `Button/Size/Large/…` ne se choisissent pas depuis une
  instance de Button, et aucun constat ne le dit.

## Décisions

- D1. Un indice fort suffit pour ne pas accuser un calque. Il faut un indice certain pour l'accuser. La décision provisoire d'E13
  (« un VECTOR de nom libre n'est pas une icône », `8 Fiabilisation/Plan/lots/E13.md`) est remplacée pour C17 par la table de D2.
  La définition d'icône de C49 et C66 suit D3.
- D2. Rôles admis pour un remplissage, dans l'ordre que pose une correction :

  | Calque peint | Rôles admis |
  |---|---|
  | Remplissage d'un cadre, d'un composant, d'une instance ou d'un groupe | `background` |
  | Texte ou plage de texte | `foreground`, `text` |
  | Icône (D3), ou calque à l'intérieur d'une icône | `icon`, `foreground` |
  | Tracé (`VECTOR`, `BOOLEAN_OPERATION`) hors icône | `icon`, `foreground`, `background` |
  | Autre forme (`RECTANGLE`, `ELLIPSE`, `POLYGON`, `STAR`, `LINE`) | `background`, `foreground` |

  `Divider`, `Separator`, `Ring` et `Focus ring` gardent leur seul rôle. Le contour d'un calque à l'intérieur d'une icône admet
  `icon` et `foreground`. Le contour d'un autre calque ne change pas. C25 garde sa règle : un seul candidat donne une correction,
  plusieurs donnent une question sans réponse cochée.
- D3. Une icône est aussi :
  - l'instance d'un composant dont chaque descendant visible est un tracé (`VECTOR`, `BOOLEAN_OPERATION`), ou un groupe ou un cadre
    qui n'en contient que ; ce critère ne lit aucun nom ;
  - l'instance dont la visibilité est pilotée par une propriété dont le nom contient un mot de `MOTS_D_ICONE` (`Icon-Left`).
- D4. Le calque peint par une surcharge est une icône s'il en est une, ou si l'une des instances entre le layer lu et lui en est une.
- D5. « Sélectionner » vise le calque peint (`faits.surcharge`) quand le constat en a un, puis centre la vue sur la sélection.
- D6. Les constats C17 et C24 sans correction ni question qui ont le même code, le même champ, le même rôle lu, le même rôle
  attendu et le même chemin de calque forment une seule carte. Elle compte les variants, et « Sélectionner » vise tous leurs calques.
- D7. Le lieu d'une surcharge donne le chemin depuis le layer lu (`arrow-left-long › Vector`). Les phrases de liaison disent
  « remplissage » et « contour » au lieu de « fill » et « stroke ».
- D8. Nouveau code C83 (`variants`, `verifier`). Il signale un composant imbriqué qui porte un axe que l'hôte n'a pas, quand
  son instance n'est exposée dans aucun variant de l'hôte. La phrase dit « La propriété `Size` de `.sizeWrapperButton` ne se
  choisit pas depuis Button. » Le statut dit « Dans Figma, exposez les propriétés de `.sizeWrapperButton` (Expose properties from
  nested instances) ».

## Lots

| Lot | Contenu | Agent | Dépend de | État |
|---|---|---|---|---|
| L1 | Kit : table D2, critères D3, D4 côté kit, `faits.chemin` | `implementeur-exigeant` | aucun | [ ] |
| L2 | Architect : relevé des faits de D3 et D4, `isExposedInstance` des wrappers | `implementeur` | L1 | [ ] |
| L3 | Kit et Architect : C83 (D8) | `implementeur` | L2 | [ ] |
| L4 | Architect : sélection D5, regroupement D6, lieu et mots D7 | `implementeur-exigeant` | aucun (contrat de `faits.chemin` ci-dessous) | [ ] |
| L5 | Conversation principale : invariants, SPEC, cartes, version, publication | conversation principale | L1 à L4 | [ ] |

L1 et L4 n'ont aucun fichier commun et tournent ensemble. L3 touche les textes de L4 et part après lui.

### L1. Rôles admis et définition d'icône (kit)

- [ ] `packages/kit/src/referentiel/layers.ts` : `LayerPourLesDefinitions.instanceDe` gagne deux champs facultatifs,
  `dessin?: boolean` (D3, premier critère) et `visibilitePar?: string | null` (nom brut de la propriété, `Icon-Left#1261:147`).
  `estUneIcone` lit les deux. Un champ absent ne fait rien.
- [ ] `packages/kit/src/controles/releve.ts` : `LiaisonLue.surcharge` gagne `instances?: LayerPourLesDefinitions[]`, les instances
  entre le layer lu et le calque peint, de la plus externe à la plus interne, sans l'un ni l'autre.
- [ ] `packages/kit/src/controles/mapping.ts` : `rolesAdmisDuLayer` suit D2 et D4. Le constat C17 porte
  `faits.chemin: string[]`, les noms des `instances` puis le nom du calque peint, seulement quand la liaison a une surcharge.
  Si le type de `faits` ne prend pas de tableau, `chemin` est une chaîne aux noms joints par ` › `, et L4 en est prévenu.
- [ ] Les lecteurs de `estUneIcone` (`accessibilite.ts` C49, `typographie.ts` C66, `plugin-architect/src/ui/composant/signes.ts`)
  restent justes. Un test le montre pour C49 et C66 sur une instance `dessin`.
- [ ] Tests de régression qui échouent sur les sources d'avant : le cas du Button (variant › wrapper › instance `arrow-left-long`
  faite d'un `Vector`, visibilité pilotée par `Icon-Left`, remplissage lié à `…/foreground`) ne donne ni C17 ni C24 ; un
  `RECTANGLE` et une `ELLIPSE` liés à `foreground` n'en donnent pas ; un `FRAME` lié à `foreground` en donne toujours ; un `VECTOR`
  libre lié à `border` en donne ; un `Divider` lié à `foreground` en donne toujours.
- Fin : `npm run test --workspace @ucm-kit/core` passe, sauf `versionSuitLeContenu` et `corpusUcm`, attendus avant L5.

### L2. Relevé d'Architect

- [ ] `packages/plugin-architect/src/releveDuComposant.ts` : `instanceDe` relève `dessin` (descendants visibles du composant
  principal, en cache par composant) et `visibilitePar` (`componentPropertyReferences.visible`). La surcharge relève `instances`
  en remontant les parents du porteur jusqu'au layer lu, avec les mêmes faits.
- [ ] Le relevé d'un wrapper (`WrapperLu`) porte `expose: boolean | 'inconnu'`, vrai si l'instance du wrapper a
  `isExposedInstance` dans au moins un variant de l'hôte. Le type vit dans `packages/kit/src/controles/releve.ts`.
- [ ] `packages/plugin-architect/src/sandbox/capture.ts` capture `isExposedInstance`.
- [ ] Tests dans `packages/plugin-architect/tests/`, sur `atelierDeCalques` : la structure du Button donne `dessin`, `visibilitePar`
  et la chaîne `instances` ; l'analyse complète ne rend aucun C24 ; une lecture qui lève donne `'inconnu'`, jamais `false`.
- [ ] La durée de l'analyse de Button ne double pas. Le cache par composant principal le garantit, et le compte rendu de l'agent le
  dit.
- Fin : `npm run test:paquet -- architect` passe.

### L3. C83, axe d'un wrapper non exposé

- [ ] `packages/kit/src/controles/codes.ts` : C83. Le contrôle vit à côté de la lecture des wrappers de `oublis.ts`. Un constat par
  wrapper, `faits.wrapper`, `faits.proprietes` (les axes que l'hôte n'a pas). `expose: 'inconnu'` ne donne rien.
- [ ] Textes de D8 dans `packages/plugin-architect/src/ui/textes/ignores.ts`, carte dans `src/ui/ignores/modele.ts`, état de galerie.
  Les listes de codes du dépôt (tests de `controle-du-code`, ignores) suivent.
- [ ] Tests : wrapper non exposé avec un axe absent de l'hôte donne C83 ; wrapper exposé n'en donne pas ; wrapper dont l'hôte a l'axe
  n'en donne pas.
- Fin : tests du kit et `npm run test:paquet -- architect` passent.

### L4. Sélection, regroupement et lieu

- [ ] `packages/plugin-architect/src/ui/…` et `src/sandbox/corrections.ts` : « Sélectionner » envoie `faits.surcharge` à la place du
  layer quand il existe (D5). `src/ecriture/selection.ts` centre la vue (`figma.viewport.scrollAndZoomIntoView`) sur les calques posés.
- [ ] Regroupement D6 des cartes « À faire ». Ignorer une carte de groupe ignore tous ses constats.
- [ ] Lieu D7 : `faits.chemin` (tableau de noms, ou chaîne jointe par ` › `) remplace le nom du calque. `PROPRIETES_DE_FIGMA` dit
  `remplissage` pour `fills` et `contour` pour `strokes`. Les phrases qui les lisent restent correctes en français.
- [ ] Tests et états de galerie de chaque écran changé.
- Fin : `npm run test:paquet -- architect` passe et la galerie se construit.

### L5. Fin du plan

- [ ] Invariants : `packages/kit/invariants/referentiel.md` (définition d'icône, table des rôles), invariants d'Architect que rend
  `npm run agents:diff`, `packages/plugin-architect/SPEC.md#vue-composant`, cartes des paquets.
- [ ] Montée de version du kit et des dépendants (skill `publier-paquets`), tests racine, `npm run vues`.
- [ ] Publication de `@ucm-kit/core`, `@ucm-kit/cli` et `@ucm-kit/adapter-typescript`.
- [ ] Recette Figma du mainteneur sur le Button : 0 C24, C83 sur `.sizeWrapperButton`, sélection de la flèche.

## Avancement
