# Les points à corriger, rangés par type

Proposition pour le compte rendu d'UCM Exporter : ranger les points « À
corriger dans Figma » en sections repliables, une par type de geste, chacune
avec son compte. La maquette à valider est
[MAQUETTE-SECTIONS-DU-COMPTE-RENDU.html](./MAQUETTE-SECTIONS-DU-COMPTE-RENDU.html).
Rien n'est implémenté.

## Ce que l'écran fait aujourd'hui

`packages/plugin-exporter/src/ui/components/CompteRendu.ts` pose une seule
liste plate, « À corriger dans Figma (n) ». Les points `danger` passent en
tête, les autres suivent dans l'ordre d'arrivée. Chaque carte porte une
pastille « Bloquant » ou « À corriger », le titre, l'impact, l'action et
« Sélectionner le calque ».

Le message `diagnostic` (`src/messages.ts`) ne transmet aucun type : l'interface
ne peut grouper que par sévérité. Le moteur publie deux codes dans
`meta.diagnostics`, `UCM_PORTABLE_PROJECTION_WARNING` et `UCM_EXPORT_NOTICE`,
qui disent la portabilité et pas le geste à faire.

## Inventaire du moteur

Le moteur compte 161 sites d'émission. Deux seulement sont `danger`, les points
des composants imbriqués (`contract/imbriques.ts:313` et `:341`), et eux seuls
portent `elements`. Le test `tests/diagnosticsComposantReel.test.ts` reproduit
un composant réel à quatre variants : il produit de 12 à 15 points.

Regroupés par le geste que le designer fait dans Figma :

| Type | Geste dans Figma | Sites |
|---|---|---|
| Auto layout et disposition | appliquer un auto layout, régler l'alignement, Fill ou Fixed, remonter un calque, montrer un calque masqué | 20 |
| Propriétés et variants | ajouter une combinaison ou une propriété, renommer une propriété ou une valeur | 11 |
| Composants imbriqués et icônes | documenter un imbriqué, restaurer une instance, placer ou nommer un calque d'icône | 17, dont les 2 `danger` |
| Variables à relier | relier une valeur à une variable, séparer une variable qui peint deux rôles | 28 |
| Styles de texte et d'effets | appliquer ou réappliquer un style, retirer une surcharge, régler « Max lines » | 11 |
| Règles d'usage | écrire, corriger ou dédoubler une règle `@usage`, `@prop`, `@boolean`, `@default`, `@icons` | 26 |
| Réglages non exportés | retirer un dégradé, un masque, un tiret, une liste, ou ressaisir un réglage illisible | 17 |
| Collections et variables du fichier | renommer une variable, une collection ou un mode, donner une valeur manquante | 31, carte Tokens seulement |

« Structure et visibilité » (4 sites) rejoint « Auto layout et disposition » :
le designer y déplace ou montre un calque dans le même panneau de Figma.

## Ce que disent les sources

Outils d'audit :

- Les linters Figma qui corrigent (« Check designs » de Figma, Roller, Design
  Lint, Stark) groupent par type de valeur, et proposent un geste sur tous les
  calques du groupe : « Apply all », « Select All ».
  [Aide Figma](https://help.figma.com/hc/en-us/articles/39592284074263-Check-designs-in-Figma),
  [Design Lint](https://github.com/destefanis/Design-Lint).
- Les outils de conformité (axe DevTools, panneau Issues de Chrome) groupent
  par règle, une ligne par règle et ses occurrences dedans.
  [Deque](https://docs.deque.com/devtools-for-web/4/en/devtools-scanning/),
  [Chrome](https://developer.chrome.com/docs/devtools/issues).
- Aucun de ces outils ne propose une bascule d'axe documentée, sauf Chrome,
  derrière un réglage expérimental.
- Un problème répété s'écrit sur une ligne avec « N calques » ou « N
  ressources ».

Littérature et design systems :

- Ce que chaque lecteur doit voir ne se replie pas.
  [NN/g](https://www.nngroup.com/articles/accordions-on-desktop/),
  [GOV.UK](https://design-system.service.gov.uk/components/accordion/),
  [Carbon](https://carbondesignsystem.com/components/accordion/usage/).
- Le repli convient à un panneau latéral étroit et à une liste longue (Carbon).
- Plusieurs sections s'ouvrent à la fois. NN/g et GOV.UK recommandent « Tout
  déplier ». GOV.UK garde l'état ouvert pendant la session.
- Le chevron est l'indicateur le plus sûr. Un en-tête ne porte qu'un
  comportement : il déplie, il ne fait rien d'autre.
  [NN/g, 136 participants](https://www.nngroup.com/articles/accordion-icons/).
- L'en-tête est un titre qui contient un seul bouton, avec `aria-expanded` et
  `aria-controls`.
  [W3C, motif accordéon](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/).
- Un compte en pastille se pose à côté d'un libellé qui dit ce qu'il compte.
  [Atlassian](https://atlassian.design/components/badge/usage).
- La sévérité ne se dit pas par la couleur seule.
  [WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).

Aucune source ne chiffre un seuil de repli, ni ne compare par étude un
regroupement par type et un regroupement par calque.

## Proposition

1. **Les bloquants restent hors des sections**, en tête, toujours visibles.
   Ils changent la décision de publier, et ce qui doit être lu ne se replie
   pas.
2. **Une section par type de geste**, dans un ordre fixe : Auto layout et
   disposition, Propriétés et variants, Composants imbriqués et icônes,
   Variables à relier, Styles de texte et d'effets, Règles d'usage, Réglages
   non exportés. L'ordre suit celui où le designer corrige : un calque sans
   auto layout produit aussi des points de gap et de padding, qui disparaissent
   quand l'auto layout est posé. Un ordre fixe garde chaque type à la même
   place d'une analyse à l'autre. Une section vide ne paraît pas.
3. **L'en-tête** porte le chevron, le titre et le compte de points en pastille,
   comme les sections de Gestion dans UCM Palettes (`section.ts`). Replié, il
   montre à droite les noms des premiers calques visés, sur une ligne.
4. **Au-dessus des sections**, une ligne donne le total et « Tout déplier ».
5. **État à l'arrivée** : jusqu'à cinq points, ou un seul type, tout est
   ouvert. Au-delà, les sections sont repliées : l'écran montre alors la liste
   des types sans défiler. Une section que le designer a ouverte reste ouverte
   quand il relance l'analyse du même composant.
6. **Dans une section**, la carte perd la pastille « À corriger », que le
   titre de section rend redondante. Elle garde titre, impact, action et
   « Sélectionner le calque ». Une section ouverte dont les points visent des
   calques commence par « Sélectionner les N calques ».
7. **La carte Tokens** reprend le même modèle, avec ses propres types.

Pour l'implémentation, chaque point devra porter son type depuis le moteur :
un champ `famille` dans `PointACorriger` et dans le message `diagnostic`, posé
par chaque site d'émission, et une loi qui refuse un site sans famille.
L'interface ne déduira pas le type du texte.

## Décisions du mainteneur

Le mainteneur a retenu D1 à D4, D6 et D7 tels que proposés,
et refusé D5 : une section ne porte pas « Sélectionner les N calques ». Chaque
carte garde son propre bouton.

## Plan d'implémentation

**Lot 1, le moteur.** Le type `FamilleDePoint` vaut `disposition`,
`proprietes`, `imbriques`, `variables`, `styles`, `regles`, `non-exportes` ou
`fichier`, dans cet ordre. `PointACorriger` et `Constat` prennent un champ
`famille` obligatoire : le compilateur désigne ainsi chaque site d'émission.
Les sites de l'export des tokens prennent `fichier`, sauf la variable
introuvable et la collection introuvable (`variables.ts`), qui prennent
`variables`. `PointACorriger` prend aussi `calque`, facultatif : le nom que
l'en-tête replié affiche. `pousserLocalise` y pose `node.name`, et
`pousserPourLesVariants` y pose « Variants ». Le message `diagnostic` transmet
`famille` et `calque`. Les messages de `galerie/etats.cjs` portent leur
famille.

**Lot 2, l'interface.** `CompteRendu.ts` pose les bloquants en tête, sans
section, avec leur pastille. Suivent la ligne du total et « Tout déplier » ou
« Tout replier », puis une section par famille non vide, dans l'ordre de
`FamilleDePoint`. L'en-tête de section suit `section.ts` d'UCM Palettes :
titre contenant un bouton à chevron, `aria-expanded`, `aria-controls`, compte
en pastille, et, replié, les noms de `calque` distincts sur une ligne. Les
points arrivent un à un, et l'état par défaut se recalcule à chaque arrivée :
tout est ouvert jusqu'à cinq points hors bloquants, ou quand une seule
famille en a, et tout est replié au-delà. Un clic du designer fixe l'état de
sa section, et cet état survit à une nouvelle analyse du même sujet. Une carte
dans une section ne porte plus de pastille. Les états de galerie et les tests
d'interface suivent, et `CONTRIBUTING.md` décrit le compte rendu.
