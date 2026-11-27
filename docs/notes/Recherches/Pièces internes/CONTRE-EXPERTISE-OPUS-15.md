# Contre-expertise de la forme 15.0

La forme du contrat 15.0 du commit `46b221bc` ne décrit pas fidèlement un assemblage dès qu'une variante change à une occurrence. Elle décrit juste l'occurrence posée quand chaque set n'est exposé qu'une fois et qu'aucun mode de variable n'est forcé. Le laboratoire de `_local/p22/opus/` le prouve sur 5 200 tirages et 21 assemblages écrits à la main, avec les trois réponses du mainteneur appliquées. Deux changements de forme ramènent les écarts silencieux de 18 % et 25 % des tirages à moins de 1 %.

## Verdicts

| Épreuve | Verdict | Preuve |
|---|---|---|
| 1. Couverture de Figma | 13 propriétés sur 80 ne sont ni portées ni signalées, en 14.0 comme en 15.0 ; la 15.0 couvre deux faits de plus, la variante d'une pièce de pièce et le changement de variante d'une occurrence, le second par une règle fausse (E01) ; le mode forcé sur une occurrence s'aggrave | `_local/p22/opus/couverture-figma.json` |
| 2. Génération en masse | infidèle dès qu'une variante change ; fidèle pour l'occurrence posée sans exposition double | `_local/p22/opus/sorties/analyse-*.json`, `reductions.json` |
| 3. Assemblages adverses | 9 assemblages sur 21 sont faux en silence, 4 sont refusés ou abandonnés, 8 sont justes ou portent une perte déclarée | `_local/p22/opus/sorties/adverses.json` |
| 4. Optimisation | un renvoi écrit en écarts retire 71,6 % des octets des renvois et 14,2 % du contrat, et corrige E01 et E02 | `_local/p22/opus/sorties/mesures.json` |
| 5. Question 4 | proposition retenue sur le principe, refusée à la lettre ; il faut une adresse Figma et une perte ciblée quand l'appariement est ambigu | A07, A13, A21, 5 200 tirages |

**Verdict** d'ensemble. La forme n'est pas fidèle à n'importe quel assemblage. Elle recopie dans le renvoi ce qu'une règle retrouve, puis applique cette copie à la mauvaise variante. Elle ne sait pas nommer deux instances exposées du même set. Elle ne publie pas un mode forcé. Les autres pertes sont déclarées.

| Lecteur | Tirages avec écart silencieux, occurrence posée | Bascule d'une prop `VARIANT` exposée | Changement d'état non exposé |
|---|---|---|---|
| forme de `46b221bc` | 890 sur 5 200 (exposition double), 0 sans exposition double | 945 sur 5 200 | 1 302 sur 5 200 (aucune règle écrite) |
| forme corrigée (renvoi en écarts, une seule règle) | même chiffre | 48 sur 5 200 | 29 sur 5 200 |

La première colonne vient du tirage complet, `node analyse.cjs 1 5200`, sur 81 974 configurations. Les deux autres viennent du tirage sans exposition double, `GEN='{"sansDoublon":true}' node analyse.cjs 1 5200`, sur 67 603 configurations, pour ne pas compter E03 deux fois.

## Méthode

Le laboratoire tient en cinq scripts de `_local/p22/opus/`.

- `lab.cjs` modélise Figma : sets, variantes, propriétés `VARIANT`, `BOOLEAN`, `TEXT`, `INSTANCE_SWAP`, instances, exposition, surcharges et mode forcé. Il construit le contrat selon la forme de `46b221bc`, avec la source résolue de propriétaire en propriétaire, la perte ciblée d'une sélection ambiguë et la source vers le contrat d'une dépendance. Il déplie le contrat selon le §2.12 et compare au rendu de vérité.
- `gen.cjs` tire des composants à graine. Il produit des matrices pleines, clairsemées ou à coordonnées répétées, trois pièces au plus imbriquées, `Icon` en dépendance, des expositions partielles ou sur plusieurs niveaux et des surcharges de couleur, de visibilité, de boîte, de style, de variante imbriquée et de glyphe.
- `run.cjs` et `analyse.cjs` rejouent chaque variant de l'hôte, quatre réglages d'une prop de l'hôte et chaque état d'une occurrence non exposée.
- `reduire.cjs` et `reduire-lot.cjs` réduisent une graine qui échoue au plus petit modèle qui garde la signature.
- `adverses.cjs` rejoue 17 des 21 assemblages de l'épreuve 3, A06 et A08 sur un même modèle. A03, A05, A10, A14 et A04 exposé sont analysés sur le texte de la forme.

Un écart est une perte déclarée quand une perte du §2.11 vise le renvoi traversé, ou la prop réglée dans la configuration. Sinon c'est une erreur. Le lecteur « forme » suit le §2.12 à la lettre, et prend la variante d'état telle quelle, faute de règle. Le lecteur « proposition » applique à la nouvelle variante ce que l'occurrence change, par adresse de slot.

## Erreurs

Les erreurs sont rangées de la plus grave à la moins grave.

### E01. La bascule exposée recopie le renvoi entier

Gravité haute. L'étape 4 du §2.12 rend V′ avec `paintPlacements`, les feuilles et les renvois imbriqués du renvoi. Le renvoi est complet (D4), donc ses feuilles contiennent aussi les couleurs réelles de V que l'hôte ne touche pas. Quand la prop exposée choisit V′, ces couleurs de V remplacent celles de V′, et aucune perte ne le dit : l'adresse existe, et la vue ne diffère pas de V. Une adresse que seule V′ possède reste sans couleur. Un renvoi imbriqué de V reste cité dans V′.

Preuve. A15 pose `.P` exposée, deux variantes `selected` aux fonds réels différents, sans surcharge. `selected=non` rend le fond de `oui`. La graine 108 se réduit de 29 675 à 2 272 octets de modèle au même cas (`sorties/reductions.json`, `E01-bascule-forme`). 945 tirages sur 5 200 portent cette erreur.

Button y échappe parce que `.sizeWrapperButton` n'a que des couleurs d'aperçu, toutes surchargées. Une pièce exposée à couleurs réelles, une puce `.Chip` dont l'hôte expose `selected`, tombe dedans.

Correction. Le renvoi porte ce que l'hôte change, séparé de ce que la variante citée donne (O1). La bascule rend V′ avec ces changements, à la même adresse. La perte E3 de la ligne 2 du §2.11 disparaît, puisque les changements de vue se transfèrent aussi.

### E02. Aucune règle pour l'état d'une occurrence non exposée

Gravité haute. La forme de `46b221bc` ne dit pas ce que rend `.Segment` au survol dans Groupe. Un lecteur qui prend la variante hover telle quelle perd ce que l'hôte change. A07 surcharge `Cadre` dans l'occurrence, et le survol rend le gris du maître. 1 302 tirages sur 5 200 portent l'écart. La section 5 donne la correction.

### E03. Deux instances exposées du même set n'ont qu'une clé

Gravité haute. Figma montre les propriétés de chaque instance exposée sous son nom. La forme publie une prop par clé, avec une seule `source`. La seconde instance perd son API et sa valeur posée, même sans aucun réglage. La même perte frappe une pièce atteinte par deux chemins d'exposition, posée sur l'hôte et exposée par une autre pièce.

Preuve. A12 pose deux `.P` exposées, la seconde avec `voir=false`. La pastille de la seconde s'affiche. Le constructeur relève `deux-sources` dans 1 826 tirages sur 5 200, et 890 tirages ont un écart silencieux dès l'occurrence posée. Le tirage sans exposition double n'en a aucun. La graine 2 se réduit à 1 998 octets (`E04-deux-expositions`).

Correction. Quand deux sources donnent la même clé, chaque clé reçoit l'identifiant du slot en tête (`segment2Selected`), et `source` garde la vérité. La règle est déterministe, puisque deux slots d'un même parent ne portent jamais le même nom. A11 reçoit la même règle : un axe `Size` de l'hôte et un axe `Size` exposé donnent deux props, que le diagnostic de collision refuse aujourd'hui.

### E04. Le mode de variable forcé n'est publié nulle part

Gravité haute pour un thème inversé dans une pièce. `setExplicitVariableModeForCollection` force un mode sur un calque ou une occurrence. Le contrat publie la référence du token, et le développeur la résout dans le mode de la page. Le moteur du contrat ne lit pas `explicitVariableModes` : seul `packages/plugin-socle/src/composant/analyse/faits.ts`, côté Architect, le relève. A20 force `theme:dark` sur la seconde occurrence de `.P`, sans écart déclaré. Avec un mode forcé sur 10 % des occurrences, 1 547 tirages sur 5 200 portent l'écart.

La capture de Button force un mode sur 90 occurrences sur 90 de `.sizeWrapperButton`, et ses trois variantes forcent chacune un mode différent de la collection `7:268`. Aucune variable liée relevée n'appartient à cette collection, donc le rendu de Button ne change pas.

Correction. Un slot et la racine d'une vue publient `modes`, l'axe de `tokens.json` et le mode forcé. À défaut, une perte nomme le calque.

### E05. Une couleur d'aperçu peut se montrer à l'exécution

Gravité moyenne. D2 juge un emplacement d'aperçu quand chaque instance posée qui le montre le remplace. Une occurrence posée sur une autre variante atteint pourtant cet emplacement par un état ou une prop exposée, sans le surcharger. A21 pose `.P` en hover avec `Halo` surchargé, et une seconde `.P` en default. Au survol de la seconde, Figma montre le gris du maître sur `Halo`, et le contrat ne publie aucune couleur. Les deux lecteurs se trompent.

Correction. Le jugement compte aussi les occurrences qui atteignent la variante par un axe d'état ou une prop exposée. Une telle occurrence qui ne remplace pas l'emplacement le rend réel.

### E06. Le §2.2 interdit la source que la réponse 1 exige

Gravité moyenne. Le §2.2 écrit que les `props` d'une entrée sont « toutes les propriétés du set, exposées ou non, sans `source` ». Une pièce `.P` non exposée qui expose `.Q` montre pourtant les props de `.Q` sur chaque occurrence. Sans `source` dans l'entrée, la valeur posée d'un booléen de `.Q` n'a aucune place : le renvoi imbriqué l'omet parce qu'elle est exposée, et le renvoi de `.P` l'omet parce qu'elle n'est pas une prop du set. A16 masque la pastille de `.Q` depuis l'occurrence, et le lecteur l'affiche (`texte46`). Avec la source dans l'entrée, A16 et A01, à trois niveaux, sont justes.

Correction. Le §2.2 admet `source` dans une entrée. `renvoi.values` porte les booléens sourcés. Le point 6 du §2.13 tolère l'absence d'une clé sourcée quand le slot de la source manque à la variante posée, puisque la valeur n'existe pas.

### E07. La valeur posée d'une prop exposée vit dans l'échantillon seul

Gravité moyenne. Une prop exposée a un seul `default`, alors que chaque variant de l'hôte pose sa valeur sur l'instance imbriquée. A17 pose `voir=true` dans un variant et `voir=false` dans l'autre. Seul `samples[].args` distingue les deux, et le §2.10 rappelle que `samples` n'est pas normatif. Le laboratoire ne lit juste qu'en prenant l'échantillon.

Correction. `renvoi.values` porte aussi les props exposées `BOOLEAN` et `INSTANCE_SWAP`, à leur valeur posée. Une valeur réglée sur l'hôte la remplace. La phrase du §2.4 « n'entre jamais dans `values` » change.

### E08. Une adresse de slot n'est pas l'identité de Figma

Gravité moyenne. Toute règle « à la même adresse » appariera des calques que Figma n'apparie pas. Un texte prend le slot `label`, puis `label-2`, selon son rang, et un slot d'icône est stable sur la matrice par son rôle, quel que soit le nom du calque (FORMAT.md, §6). Figma garde une surcharge selon le nom et la hiérarchie des calques, par une heuristique que l'API ne garantit pas : `swapComponent` « preserves overrides using the same heuristics as instance swap in the Figma editor UI. Note that we may update these override preservation heuristics from time to time. » (typings officielles 1.138.0, `InstanceNode`).

Preuve. A13 pose deux textes `Titre` et `Sous-titre`, et la variante hover garde le seul `Sous-titre`. L'hôte surcharge `Titre`. Au survol, l'adresse `label` désigne `Sous-titre`, et la règle par adresse lui donne la couleur de `Titre`. A14 en est la forme analysée sur une icône. `circle-info` dans une variante et `circle-check` dans l'autre partagent le slot de leur règle `@icons`, et une couleur que l'hôte pose sur la première passerait à la seconde, que Figma n'apparie pas.

Correction. La règle apparie par le chemin des `figmaLayer`, pas par le chemin de slots. L'Exporter publie une perte ciblée quand une variante atteignable depuis l'occurrence porte deux calques de même nom sous un parent, ou un slot à rôle dont le calque change de nom.

### E09. Trois assemblages valides sans description

Gravité moyenne. Figma les admet, la forme les refuse ou les abandonne.

- A03, une pièce posée dans le `SLOT` d'une autre pièce. La forme écrit une perte (Q6) et ne décrit pas le contenu.
- A04 exposé, un `INSTANCE_SWAP` exposé dont la valeur est une pièce. Le §2.12 n'a aucune étape pour la nouvelle pièce, ni pour sa variante. Non exposé, A04 est juste.
- A09, deux pièces `.Item` dans deux dossiers. La clé `Item` se répète, et F29 bloque l'export.

Correction pour A09. La seconde clé prend un suffixe dans l'ordre des `nodeId` (`Item`, `Item2`), et `name` garde le nom Figma. A03 et A04 attendent un fichier de test, comme D6 le prévoit.

### E10. Douze autres propriétés Figma ne sont ni portées ni signalées

Gravité basse à moyenne, héritée de la 14.0. Outre le mode forcé de E04, `scaleFactor`, `clipsContent`, `strokesIncludedInLayout`, `itemReverseZIndex`, `cornerSmoothing`, `strokeCap` et `strokeJoin`, `hyperlink`, une variable de texte sur `characters`, `TextPathNode`, `TransformGroupNode`, `reactions` et les animations changent le rendu sans un mot du contrat (`couverture-figma.json`). `fontVariations` s'y ajoute en partie. `clipsContent` compte pour P22, puisque `.Ring` déborde de 4 px et qu'un cadre qui découpe le cacherait. Une visibilité liée à une variable garde le calque et perd sa condition.

Correction. Chacune entre dans le relevé de `unsupportedProperties.ts` comme perte, à défaut d'un champ.

### Ce qui tient

- La source de propriétaire en propriétaire résout A01 à trois niveaux, et A16 quand l'entrée porte la source.
- La source vers une dépendance (A02) rend le ton d'`Icon` réglé sur l'hôte.
- La perte ciblée d'une sélection absente (A18) ou répétée aux rendus différents (A19) est écrite, sans choix.
- Une adresse de surcharge absente de V′ (A06, A08) a sa perte E3.
- Une boucle indirecte (A05) est refusée par Figma comme par la forme.
- Un composant préfixé qui a des règles (A10) devient une pièce, selon E1. Son contrat propre est ignoré dans l'hôte, ce qui décrit le set deux fois sans perte.

## Optimisations chiffrées

Les mesures prennent `Buffer.byteLength(JSON.stringify(x), "utf8")`. Les tirages sont 1 000 contrats du laboratoire, catalogués par égalité stricte.

| # | Donnée recopiée ou forme plus courte | Octets | Absence à un seul sens | Recommandation |
|---|---|---|---|---|
| O1 | renvoi en écarts : `slotPath`, `nodeId`, `variant`, `values` hors valeur posée de la variante, `overrides` (peintures par adresse, calques masqués, champs de boîte et de style, renvois imbriqués en écarts) | renvois de 3 243 à 920 octets par tirage (−71,6 %), contrat de 19 758 à 16 959 (−14,2 %) ; sur Groupe, la forme mesure déjà 2 523 octets de feuilles recopiées sur 3 945 | oui : un renvoi sans `overrides` dit que l'hôte ne change rien, une peinture retirée s'écrit `null` | retenir ; corrige E01 et E02 |
| O2 | `composes` de la racine, union des `viewComposes` | 534 sur StressTest (1,2 %), 220 sur Groupe 14.0, 82 sur `.Segment` seul | non : son absence dit « aucune dépendance » | garder |
| O3 | `figmaLayer` égal au nom du slot | 612 sur StressTest, 325 sur Groupe 14.0, 0 sur Button | non sans règle de défaut nouvelle | écarter |
| O4 | `source.prop` égal à la clé | 37 par tirage, 111 sur Button (§5.3 de la forme) | non | écarter, comme la forme |
| O5 | type et valeurs recopiés dans la prop sourcée | 90 par tirage, 275 sur Button | non | écarter, comme la forme |
| O6 | `structure.variantAxes`, clés de `variants[].values` | 42 sur Button, 26 sur StressTest | oui | écarter, gain négligeable |
| O7 | perte E3 de la vue différente (ligne 2 du §2.11) | une perte par renvoi exposé dont la vue change | sans objet | retirer avec O1 |
| O8 | `renvoi.values` d'un `INSTANCE_SWAP` vers une pièce, que le slot `piece` et le renvoi imbriqué disent déjà | une clé par échange | oui | garder pour une dépendance, retirer pour une pièce |

Tous les champs 14.0 ont au moins un lecteur dans `packages/kit/src/lecteurs/`, `packages/cli/src/` ou `packages/adapter-typescript/src/`. `samples` pèse 9 828 octets sur StressTest (22 %), 1 413 sur Button et 738 sur Groupe 14.0. E07 y montre une valeur normative qui ne doit pas y vivre seule.

## Question 4

La proposition retient le bon principe : le contrat décrit les parties, la pièce avec toutes ses variantes et chaque renvoi avec ce que l'hôte change, et une règle de lecture donne l'état. Le produit des états et des occurrences n'est pas précalculé. A07 le confirme : la règle rend juste la couleur de l'hôte au survol, le fond hover et le `Halo` de la variante hover. Sur 5 200 tirages, le lecteur à règle passe de 1 302 à 29 tirages avec écart.

Trois faits empêchent de la prendre à la lettre.

1. Le renvoi complet de D4 ne sépare pas ce que l'hôte change de ce que la variante donne. La règle ne s'applique qu'en calculant cet écart, ou avec O1. Le lecteur du laboratoire le calcule, et l'applique aussi aux valeurs des booléens et aux renvois imbriqués. Sa première version, qui transférait les renvois imbriqués entiers, se trompait sur les graines 4 et 5.
2. L'adresse de slot n'est pas l'identité de Figma (E08, A13). Figma ne garantit pas son heuristique de conservation, donc la règle doit fixer la sienne, par chemin de calques.
3. Une couleur d'aperçu atteinte par un état n'est pas publiée (E05, A21), et aucune règle de lecture ne la retrouve.

La vérification que Codex gardait ne peut pas confronter le contrat à Figma. L'Exporter n'a qu'une variante posée par occurrence, et il ne modifie pas le document (`loiDuDocumentIntact.test.ts`). Une vérification utile est donc statique et ciblée. Elle cherche dans les variantes atteignables un appariement ambigu par le nom : deux calques de même nom sous un parent, ou un slot à rôle dont le calque change de nom. Elle publie alors une perte sur le renvoi, et elle se tait ailleurs.

Le verdict est donc celui-ci. La règle s'écrit, par chemin de `figmaLayer`, et vaut pour l'état comme pour la bascule exposée, qui est le même mécanisme de Figma. Le renvoi porte ses écarts. Une perte ciblée accompagne l'appariement ambigu, sans vérification générale du transfert. Les 29 tirages qui restent faux sont décrits sous « Limites ».

## Ce que StressTest devrait recevoir dans Figma

StressTest (UCM-Playground, contrat 13.0, 44 313 octets) ne pose aucune pièce. Il exerce les grilles, le placement absolu, la rotation, le retour à la ligne, `structuralSize` et onze dépendances (Alert, trois Button, sept TileLink), que la 15.0 ne change pas. Pour qu'une capture réelle ancre les erreurs, il lui faut ces constructions :

- une pièce `.Tuile` exposée, à axe `selected` et fonds réels différents (A15, E01) ;
- une pièce à axe `State` non exposée, dont la variante hover ajoute un calque, avec une couleur de cadre surchargée par l'hôte (A07, A21) et deux textes dont l'un manque au survol (A13) ;
- deux instances exposées de `.Tuile` (A12), et un axe `Size` sur l'hôte et sur une pièce exposée (A11) ;
- une pièce de pièce exposée à travers une pièce non exposée (A16) et une exposition à trois niveaux (A01) ;
- un mode forcé sur une occurrence (A20), une matrice clairsemée atteinte par une prop exposée (A18) ;
- une pièce dans le `SLOT` d'une pièce (A03), un `INSTANCE_SWAP` exposé vers une pièce (A04) et deux `.Item` dans deux dossiers (A09).

## Limites

Le modèle de Figma du laboratoire n'imite pas tout.

- Il conserve une surcharge selon le nom et le rang du calque. Figma garde son heuristique pour lui. Un vrai fichier peut donc donner raison à une autre règle.
- Il enregistre un changement de variante imbriquée comme l'écart des axes. Figma peut l'enregistrer comme un échange du composant principal.
- Il ne sait pas si Figma garde une surcharge égale à la valeur du maître, ni une surcharge sur un calque absent de la variante posée. Les 29 et 48 tirages qui restent faux avec la règle viennent de ces cas ou d'une exposition partielle d'une pièce de pièce, sans preuve qu'ils viennent de la forme.
- Il réduit la boîte et le placement à des étiquettes. Il ne calcule ni auto layout, ni pixels, ni contraste.
- Il ne compare ni les textes ni les valeurs des dépendances, qui vivent dans `samples`, et il ne règle ni `TEXT`, ni `INSTANCE_SWAP`, ni `SLOT` depuis l'hôte.
- Ses clés de couleur suivent une version courte de `colorKeys.ts`.
- Il n'a tourné ni dans Figma, ni sur le moteur 15.0, qui n'existe pas encore. Les captures servent aux comptes de l'épreuve 1.

## Questions au mainteneur

| # | Question | Recommandation |
|---|---|---|
| 1 | Le renvoi porte-t-il ce que l'hôte change (`overrides` par adresse, `values` hors valeur posée), plutôt que la feuille complète de D4 ? | Oui. Le renvoi perd 71,6 % de ses octets, E01 et E02 disparaissent, et l'absence garde un seul sens. |
| 2 | La question 4 se tranche-t-elle par la règle, appariée par chemin de `figmaLayer`, pour l'état comme pour la bascule exposée, avec une perte ciblée seulement quand l'appariement est ambigu ? | Oui. La règle seule laisse A13 faux en silence, et une vérification générale ne peut pas observer Figma. |
| 3 | Deux sources de même clé reçoivent-elles l'identifiant de leur slot en tête (`segment2Selected`) au lieu du diagnostic de collision ? | Oui. Figma montre les deux propriétés, et 1 826 tirages sur 5 200 en ont besoin. |
| 4 | Un mode de variable forcé sur un calque ou une occurrence se publie-t-il dans un champ `modes` ? | Oui, avec l'axe de `tokens.json` et le mode. Une perte écrite est le minimum. |
| 5 | La valeur posée d'une prop exposée entre-t-elle dans `renvoi.values` ? | Oui. Elle ne vit aujourd'hui que dans `samples`, qui n'est pas normatif. |
