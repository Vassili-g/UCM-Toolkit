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
- D7. Le lieu d'une surcharge donne le chemin depuis le layer lu (`arrow-left-long › Vector`). Les phrases gardent les mots
  anglais du panneau Design de Figma (`fill`, `stroke`), comme le veut la table de vocabulaire de `CONTRIBUTING.md`.
- D8. Nouveau code C83 (`variants`, `verifier`). Il signale un composant imbriqué qui porte un axe que l'hôte n'a pas, quand
  son instance n'est exposée dans aucun variant de l'hôte. La phrase dit « La propriété `Size` de `.sizeWrapperButton` ne se
  choisit pas depuis Button. » Le statut dit « Dans Figma, exposez les propriétés de `.sizeWrapperButton` (Expose properties from
  nested instances) ».

## La recette d'Alert

Le rapport `ucm-architect-rapport-Alert-2026-11-25-16-52-51.json` porte 42 constats sur Alert (`Type` vaut Info, Success,
Warning ou Error, `Variant` vaut Filled ou Outlined ; tokens `Alert/Color/<Info|Success|Warning|Danger>/<Filled|Outlined>/<rôle>`).

- 37 constats viennent d'une seule lecture fausse. `type` est un nom de style dans `NOMS_D_AXES`
  (`packages/kit/src/referentiel/architecture.ts`), donc Alert a deux styles et aucune couleur : C63 `deux-axes-de-style`, C13
  « Renommer Info en Outlined ? » ×4, C7 ×4, C32 `sans-variant` ×12, C33 ×8.
- C65 ×2 accuse Titre et Description, qui suivent le style `Body/Large`. Ce style lie `fontFamily` à `Primitives/FontFamily/base`.
  La référence UCM range `font-family/base` dans `primitives` seulement (`packages/kit/src/referentiel/reference.ts`), et
  `typography` n'en a pas.
- C44 et C45 ×2 disent trois fois une seule chose. Les règles d'Alert décrivent `severity.info`, `severity.success`,
  `severity.warning` et `severity.error`, et le composant appelle cette propriété `Type`.
- C24 ×8 suit la cause du Button (icônes `circle-info`, `circle-check`, `triangle-exclamation`, visibilité par `Icon#265:4`).

## Les causes communes aux deux recettes

Button et Alert sont simples, et 220 de leurs 226 constats sont faux ou redondants. Six défauts de méthode les produisent, et ils
reviendront sur des composants plus complexes.

- M1. Un seul indice décide d'une lecture, puis un constat accuse avec certitude. Le nom `Type` décide du rôle d'un axe, le type
  du calque décide de son rôle, le nom `Vector` décide qu'un tracé n'est pas une icône.
- M2. Une lecture fausse en amont se multiplie en aval. L'axe mal lu d'Alert donne 37 constats dans cinq codes, la table des
  rôles du Button en donne 180.
- M3. Un contrôle contredit la référence du kit. C65 écrit `typography` en dur, alors que la référence range la famille de police
  dans `primitives`.
- M4. Le relevé perd l'origine d'une liaison. Une liaison du style de texte se juge comme celle du calque, et une surcharge oublie
  les instances qu'elle traverse.
- M5. Une cause donne plusieurs cartes : trois pour les règles, 180 pour une icône.
- M6. Une proposition peut casser le composant. « Renommer Info en Outlined » crée un doublon avec l'axe `Variant`.

Les tests du dépôt jugent une règle à la fois, sur des cas fabriqués pour elle. Aucun composant réaliste ne se rejoue en entier,
donc aucun test ne voit l'effet combiné des règles.

## Décisions de la recette d'Alert

- D9 (M1). Un nom d'axe explicite décide de son rôle (`Variant`, `Style`, `Appearance`, `Color`, `Severity`, `Size`, `State`…).
  Un nom générique (`Type`, `Kind`) ou inconnu prend le rôle que ses valeurs donnent quand toutes appartiennent à un seul registre
  (palettes, tailles, états). Sinon, la position où les tokens écrivent ses valeurs donne son rôle. `Variant=primary|danger` reste
  un style, comme le dit `packages/kit/invariants/referentiel.md`. Pour Alert, `Type` devient la palette, et C8 propose
  de renommer `Error` en `Danger` côté variant.
- D10 (M2). Quand la moitié au moins des tokens de couleur du composant ne correspond à aucun variant, C7, C13, C32 `sans-variant`
  et C33 se taisent. Un seul constat C84 (`variants`, `verifier`) le dit à leur place. La phrase dit « {n} tokens de couleur sur
  {total} ne correspondent à aucun variant. » Quand un axe a ses valeurs dans les tokens à une autre place, elle ajoute « Les
  valeurs de `{axe}` sont écrites dans les tokens à la place de {rôle}. » Le statut dit « Vérifiez le nom des propriétés et des
  tokens ».
- D11 (M3). L'attente de C65 se lit dans la référence (`ECHELLES_DE_REFERENCE`). `fontFamily` admet `primitives`, les autres
  champs `typography`.
- D12 (M4). Le relevé marque `provenance: 'style'` une liaison que porte le style appliqué au calque (même variable que le style
  pour le même champ). Les contrôles par calque ne jugent pas une liaison de style.
- D13 (M5). Une règle sans propriété et une propriété sans règle qui ont les mêmes valeurs donnent un seul C45 `renommee`. La
  phrase dit « Les règles décrivent `severity`, et le composant appelle cette propriété `Type`. » Le statut dit « Renommez la
  propriété du composant ou la règle ». `sansLesDoublonsDuMoteur` retire le C44 qui dit la même chose pour la même règle.
- D14 (M6). Un renommage proposé n'a jamais pour candidat une valeur d'un autre axe ni une valeur déjà présente dans l'axe.
- D15 (tests). Deux filets. Le premier, dans le dépôt, reconstruit Button et Alert sur `atelierDeCalques` (wrapper de taille,
  icônes de bibliothèque à visibilité booléenne, styles de texte, axe `Type` de palette, Button imbriqué, règles). L'analyse complète
  doit y rendre la liste exacte des constats attendus, écrite dans le test. Le second, `npm run recette:architect -- <capture>`,
  rejoue une capture de `_local/recettes/` par `doubleDepuisCapture` et l'analyse complète. Il compare les constats à
  `<capture>.attendus.json`, et le mainteneur le lance avant une publication. Les captures restent hors de git.

## La chasse de Codex

Codex a rejoué les deux captures et fabriqué 18 composants sur le commit `2869487b`. Son journal et ses tests rouges sont dans
`_local/chasse-faux-constats/` (`JOURNAL-CODEX.txt`, `cas/`). Le rejeu du Button ne rend plus aucun C24 après L1. Les causes
d'Alert sont celles du plan. Onze défauts sont nouveaux, et Codex y ajoute quatre défauts de méthode.

- M7. Un nom remplace l'identité d'un calque. Deux textes `Label` sous deux parents deviennent un seul calque pour C21, C64 et la
  propagation (cas C6, C10, N2).
- M8. Le sujet analysé est pris pour le propriétaire des tokens. Une pièce interne analysée seule réclame des tokens à son nom (C7),
  et Alert accuse les tokens du Button qu'il imbrique (C12).
- M9. Deux contrôles ne partagent pas la même preuve du fond. C59 ignore un rectangle frère qui peint la surface (C8), C49 compte
  les coins vides d'une ellipse (C9), et les modes forcés par calque sont effacés (C13).
- M10. Le nom d'une collection est pris pour sa clé (N3), et les propositions de liaison perdent leur candidat.

## Décisions de la chasse

- D16 (M7). Un calque s'identifie par son chemin depuis le variant et son rang parmi ses homonymes, par une seule fonction du kit.
  C21 (`ecartsDeFratrie`), C64 (`sources`, `groupesDeComparaison`) et la propagation (`cheminDuLayer`) la lisent. Le masquage d'un
  autre calque ne change pas cette identité. C21 compte des variants distincts avant de conclure à une majorité.
- D17 (M9). Le contraste (C49) et la surface (C59) lisent une seule preuve du fond : ancêtres, frères peints dessous, couverture
  peinte réelle d'une forme (une ellipse ne couvre pas les coins de sa boîte). Sans preuve suffisante, la mesure devient une limite.
  Un layer et sa plage ne donnent pas deux constats de même identifiant.
- D18 (M4, M9). Le relevé garde les modes explicites et hérités de chaque calque. C49 ne fait varier que les modes héritables
  depuis le composant.
- D19 (M6). Une proposition de couleur (C25, C59) n'est une correction que si la couleur résolue reste la même dans chaque mode,
  ou si le contraste reste tenu. Sinon elle devient une question sans réponse cochée.
- D20 (M4, M8). Le relevé marque l'origine des liaisons d'un composant imbriqué documenté (`marquerLImbrique`, retour anticipé
  de `imbriquesDuReleve.ts`). Il garde aussi la peinture visible d'un calque sous une instance, pour C50 et le contraste.
- D21 (M3). L'attente par champ de typographie se lit dans `ECHELLES_DE_REFERENCE` pour C20 comme pour C65 (cas C4), par une
  seule fonction.
- D22 (M8, Q1 validée). Une pièce interne analysée seule montre la lecture de ses calques et une information « Analysez le
  composant qui l'utilise pour juger ses tokens ». C19, C43 et les autres contrôles qui supposent un propriétaire ne tournent pas.
- D23 (M5, Q2 validée). Tant que l'instance de règles manque, C43 seul s'affiche. C44 sur l'usage absent se tait.
- D24 (M10). Les corrections résolvent la collection par la clé de la variable du catalogue (`presentesDeLaCollection` de
  `corrections.ts`).

## Lots

| Lot | Contenu | Agent | Dépend de | État |
|---|---|---|---|---|
| L1 | Kit : table D2, critères D3, D4 côté kit, `faits.chemin` | `implementeur-exigeant` | aucun | [x] 0236e84b |
| L2 | Architect : relevé des faits de D3, D4 et D12, `isExposedInstance` des wrappers | `implementeur` | L1 | [x] 944b459b |
| L3 | Kit et Architect : C83 (D8) | `implementeur` | L2 | [x] 861adcbc |
| L4 | Architect : sélection D5, regroupement D6, lieu D7 | `implementeur-exigeant` | aucun (contrat de `faits.chemin` ci-dessous) | [x] 0236e84b |
| L6 | Kit : lecture des axes D9, garde des renommages D14 | `implementeur-exigeant` | aucun | [x] 944b459b |
| L7 | Kit et Architect : C84 et silence de la cascade D10 | `implementeur-exigeant` | L6, L3 | [ ] |
| L8 | Kit : attente de C65 par la référence D11, liaisons de style D12 | `implementeur` | L2 | [x] 861adcbc |
| L9 | Architect : C45 `renommee` et doublon de C44 D13 | `implementeur` | L7 | [ ] |
| L11 | Kit : identité d'un calque D16 | `implementeur-exigeant` | L6 | [ ] |
| L12 | Kit : preuve du fond partagée D17 | `implementeur-exigeant` | L11 | [ ] |
| L13 | Architect et kit : modes par calque D18 | `implementeur` | L2 | [ ] |
| L14 | Kit : propositions de couleur vérifiées D19 | `implementeur-exigeant` | L12 | [ ] |
| L15 | Architect : origine des liaisons des dépendances et peinture sous instance D20 | `implementeur` | L2 | [ ] |
| L16 | Kit et Architect : pièce interne seule D22, clé de collection D24 | `implementeur` | L3 | [ ] |
| L10 | Architect : composants de référence et banc de recette D15, cas rouges de Codex rendus verts | `implementeur-exigeant` | L1 à L16 | [ ] |
| L5 | Conversation principale : invariants, SPEC, cartes, version, publication | conversation principale | L1 à L16 | [ ] |

L1 et L4 n'ont aucun fichier commun et tournent ensemble. L2 et L6 tournent ensemble, puis L3 et L8. L7 et L9 touchent les textes
de L3 et passent l'un après l'autre. L8 couvre aussi C20 (D21), et L9 aussi D23. L13 et L15 touchent le relevé d'Architect et
passent l'un après l'autre. L11, L12 et L14 touchent les contrôles du kit et se suivent.

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
- L1 et L4, commit `0236e84b`. Kit 2144 tests, Architect 2437, socle 304, typecheck. La racine attend L5 (`versionSuitLeContenu`,
  `inventaire`). `faits.chemin` est une chaîne jointe par ` › `. C25 sur un tracé ou une forme sans token pose une question.
- L2 et L6, commit `944b459b`. Kit 2160 tests, Architect 2446, socle 304, racine 713 sur 714 (`versionSuitLeContenu` attend L5).
  `WrapperLu.expose` reste facultatif : absent vaut `'inconnu'`. Un axe d'un nom générique dont le rôle est déjà pris par un nom
  explicite garde le repli. `Scale=small|medium` de l'aide de test `donneesRiches.ts` devient `compact|roomy`, hors du registre.
- L3 et L8, commit `861adcbc`. Kit 2171 tests, Architect 2449, socle 304, racine 713 sur 714 (`versionSuitLeContenu` attend L5).
  C83 porte `faits.composant` en plus de D8. `collectionDuChampDeTypographie` vit dans `reference.ts`. C17 et C18 jugent encore une
  liaison de style : le rôle et le scope ne dépendent pas de sa source.
