# Accélérer l'analyse d'un composant et montrer sa progression

Demande du mainteneur : sur un Button de 90 variants, le bouton
Analyser est très lent et gèle le plugin et Figma. Il faut accélérer
l'analyse de façon drastique et montrer sa progression dans le panneau.

Ce document complète [OPTIMISATION-ANALYSE-90-VARIANTS.md](../Debug/OPTIMISATION-ANALYSE-90-VARIANTS.md).
Ses lots 2 à 4 sont faits par F7 (`307c39e7`) : index des corrections, une
lecture par variable, un seul inventaire des libraries. Le gel persiste
après F7. Ce qui suit cherche la cause restante.

## 1. Ce qui est mesuré

| Mesure | Chiffre | Source |
|---|---:|---|
| Moteur de l'exporteur, set de 140 variants, dans Figma | 20,0 s et 19,3 s | trace L9.8, 2026-09-26, `PLAN-IMPLEMENTATION-PERFORMANCE-ANALYSE.md`, retiré par `ce2623b9` |
| Dont `structure.vues` | 8,6 s | même trace |
| Dont `structure.typographie-exacte` et `echantillons` | 2,6 s chacune | même trace |
| Dont parcours `getAllNodes` (`msGetAllNodes`) | 4,6 s, 24 % du total | même trace |
| Plus long intervalle sans contact avec l'interface | 0,84 s | même trace |
| `proposerLesCorrections` sur 90 variants, sous Node | 1 s avant F7, 40 ms après | message de `307c39e7` |

L'analyse d'Architect n'a jamais été chronométrée dans Figma. La trace L9.8
porte sur un autre composant ; à 90 variants, une règle de trois donne
environ 13 s de moteur. Ce chiffre est une estimation, pas une mesure.

## 2. Où passe le temps dans Architect

[analyse.ts](../../../../../packages/plugin-architect/src/sandbox/analyse.ts) enchaîne six phases, toutes dans le code principal du plugin.

1. **Sujet.** `findAll(() => true)` sur le jeu, pour la liste des nœuds qui périment l'analyse.
2. **Relevé.** [releveDuComposant.ts](../../../../../packages/plugin-architect/src/releveDuComposant.ts) lit chaque calque de chaque variant.
3. **Catalogue.** Library choisie, ou variables locales.
4. **Moteur de l'exporteur.** `analyserLeComposant` produit le contrat entier : composition, structure, typographie, échantillons, compaction, sérialisation.
5. **Règles d'usage.** Elles lisent le contrat du moteur.
6. **Contrôles du kit** puis `proposerLesCorrections`, en un seul bloc synchrone.

Constats tirés du code :

- **Le moteur fait le gros du travail, et Architect n'en garde qu'une petite part.** Il tire du moteur six codes (C30, C34, C35, C41, C42, C44 dans [constatsDuMoteur.ts](../../../../../packages/plugin-architect/src/constatsDuMoteur.ts)) et le contrat pour les règles d'usage. Il paie les échantillons, la compaction et la sérialisation, qui font environ 15 % des poids de `ETAPES_DE_L_ANALYSE`.
- **Les variants sont lus deux fois.** Le relevé, puis le moteur, qui les relit lui-même par cinq passes au moins (couleurs, élection, icônes, vue exacte, typographie deux fois ; note de L9.8).
- **Un calque texte appelle `getStyledTextSegments` deux fois.** Une fois dans `liaisonsDuNoeud`, une fois dans `texteDe`. `fills` et `strokes` se relisent aussi dans `peinturesDe`, `liaisonsDuNoeud` et `valeursEnDur`.
- **Le relevé ne rend la main qu'à chaque lot de 400 calques** (`LOT`), quelle que soit la durée écoulée. Le moteur, lui, la rend toutes les 200 ms (`BUDGET_DE_CALCUL_MS`).
- **Les contrôles du kit et les corrections ne rendent jamais la main.** Le calcul dure 40 ms sous Node ; le temps dans le code principal de Figma n'est pas connu (point 3.1).
- **La progression est perdue.** Architect passe `async () => {}` comme `annoncer` au moteur et n'ouvre pas la trace : `avancementCourant` ne rend rien. Le seul message `analyse-en-cours` part après le relevé, avec `variantsLus` égal au total. Le panneau affiche « analyse en cours, 90 variants sur 90 » pendant toute la phase la plus longue.
- **Le panneau n'a pas de bouton Annuler.** Le sandbox traite `annuler-analyse`, mais l'interface ne l'envoie jamais.

## 3. Ce que disent les recherches

Niveaux : **doc** = documentation officielle ou article lu ; **commu** = forum ou dépôt ; **déduit** = raisonnement, non vérifié.

### 3.1 Le code principal d'un plugin Figma

**Le fait qui pèse le plus : le code principal est interprété, sans compilation à la volée.**

- Le code principal tourne sur le fil principal de Figma. L'iframe d'interface est séparée. **doc** ([How plugins run](https://developers.figma.com/docs/plugins/how-plugins-run/))
- Depuis 2019, ce code tourne dans QuickJS compilé en WebAssembly. Figma le dit « un peu plus lent pour certains plugins » que Realms, qui profitait de la compilation à la volée du navigateur. **doc** ([An update on plugin security](https://www.figma.com/blog/an-update-on-plugin-security/), [How we built the Figma plugin system](https://www.figma.com/blog/how-we-built-the-figma-plugin-system/))
- Un commentaire attribué à l'auteur de quickjs-emscripten dit QuickJS « des ordres de grandeur » plus lent que V8 compilé à la volée. **commu**, vu en extrait seulement.
- Conséquence **déduite** : les 40 ms de `proposerLesCorrections` sous Node ne disent rien de sa durée dans Figma. Un facteur 10 à 50 donnerait 0,4 à 2 s de calcul pur, sans rendre la main.
- Dans la machine virtuelle, les nœuds sont des poignées opaques ; seuls nombres et chaînes sont copiés. Un aller-retour par message coûte environ 0,1 ms. **doc** (même billet)
- Un `await` d'API dans une boucle coûte un aller-retour par appel. Le guide de Figma pour son serveur MCP conseille `Promise.all` pour les `getVariableByIdAsync`, sans mesure. **doc** ([gotchas.md](https://github.com/figma/mcp-server-guide/blob/main/skills/figma-use/references/gotchas.md))
- `getLocalVariablesAsync()` rend toutes les variables locales en un appel. Une `Map` par identifiant éviterait les appels un par un. **doc** ([Variables](https://developers.figma.com/docs/plugins/api/figma-variables/)), usage **déduit**.
- `figma.skipInvisibleInstanceChildren = true` accélère `findAll` de plusieurs fois et `findAllWithCriteria` jusqu'à des centaines de fois. Il est désactivé par défaut hors Dev Mode. **doc** ([page du drapeau](https://developers.figma.com/docs/plugins/api/properties/figma-skipinvisibleinstancechildren))
- Sur le forum, un membre de l'équipe Figma recommande ce drapeau pour les sous-arbres à instances imbriquées. Dans ce fil, la lecture prend 180 ms par composant avec `find`, et 318 ms en parcourant `children` : lire les enfants d'un nœud est lent. **commu** ([forum](https://forum.figma.com/ask-the-community-7/getting-information-from-componentnodes-is-being-really-slow-33626))
- Aucun chiffre trouvé pour le coût d'une propriété, de `getStyledTextSegments` ou de `getMainComponentAsync`.

**Céder la main et parler à l'interface.**

- Figma recommande des tranches, un nombre fixe de nœuds ou quelques millisecondes, puis `setTimeout(…, 1)`. Un indicateur animé en CSS pur continue de tourner pendant un gel. **doc** ([Frozen plugins](https://developers.figma.com/docs/plugins/frozen-plugins))
- Un `figma.ui.postMessage` ne part qu'à la prochaine cession. Sans cession, toute la progression arrive d'un bloc à la fin. **commu** ([issue #149 de cursor-talk-to-figma-mcp](https://github.com/grab/cursor-talk-to-figma-mcp/issues/149)) ; le commentaire de `signalerAvancement` dans l'exporteur dit la même chose.
- Design Lint parcourt les nœuds avec un générateur asynchrone : pause de 5 ms tous les 1 000 nœuds, `skipInvisibleInstanceChildren` actif, `findAllWithCriteria` pour les styles. Il rend ses résultats en un seul message final. **commu** ([controller.ts](https://github.com/destefanis/design-lint/blob/master/src/plugin/controller.ts))
- Evil Martians cèdent par `setTimeout(0)`. Leur gain vient surtout de l'élagage de l'arbre parcouru. **commu** ([article](https://evilmartians.com/chronicles/figma-plugin-api-dive-into-advanced-algorithms-and-data-structures))

**L'iframe et les Web Workers.**

- Figma recommande un Web Worker, créé dans l'iframe, pour un calcul qui prend une entrée et rend une sortie sans toucher à `figma`. Le code principal ne peut pas en créer. **doc** ([Frozen plugins](https://developers.figma.com/docs/plugins/frozen-plugins), [forum](https://forum.figma.com/ask-the-community-7/optimizing-asynchronous-node-processing-in-a-figma-plugin-19769))
- Les messages entre le code principal et l'iframe sont copiés ; seul `Uint8Array` passe en binaire. **doc** ([Creating a UI](https://developers.figma.com/docs/plugins/creating-ui))
- Figma a abandonné une première architecture tout en iframe : sérialiser un gros document prenait 14 s. **doc** ([How we built the Figma plugin system](https://www.figma.com/blog/how-we-built-the-figma-plugin-system/)). Un relevé de composant est bien plus petit, mais son coût de copie n'est pas mesuré.

### 3.2 Littérature

- **Tâches longues.** Une tâche de plus de 50 ms est longue ; il faut rendre la main environ toutes les 50 ms, mesurées par l'horloge, pas par un compte d'éléments. `scheduler.yield()` existe dans Chrome 129 et Firefox 142, pas dans Safari ; sa présence dans le sandbox de Figma n'est pas connue. **doc** ([web.dev, Optimize long tasks](https://web.dev/articles/optimize-long-tasks))
- **Calcul incrémental.** Salsa garde un numéro de révision et les dépendances de chaque résultat ; un résultat recalculé identique ne fait pas recalculer ce qui en dépend (« backdating »). **doc** ([Salsa](https://salsa-rs.github.io/salsa/reference/algorithm.html)). Adapton, calcul incrémental à la demande, Hammer et al., 2014 ([ACM](https://dl.acm.org/doi/10.1145/2594291.2594324)), résumé seulement.
- **Analyse par famille.** Thüm, Apel, Kästner, Schaefer, Saake, *A Classification and Survey of Analysis Strategies for Software Product Lines*, ACM Computing Surveys 47(1), 2014, distingue l'analyse produit par produit et l'analyse de toute la famille en une passe ([ACM](https://dl.acm.org/doi/10.1145/2580950)). SPLlift (Bodden et al., 2013) annonce un gain de plusieurs ordres de grandeur pour l'analyse par famille ([Lancaster](https://eprints.lancs.ac.uk/id/eprint/66522/)). Rien de publié sur les variants d'un composant de design. La transposition est **déduite** : analyser une fois ce que les variants partagent, puis seulement leurs différences.
- **Partage de sous-arbres.** Le hash-consing partage les valeurs structurellement égales (Filliâtre et Conchon, 2006, [page](http://gallium.inria.fr/ml2006/accepted/5.html)). Limite : un contrôle ne se mémorise par empreinte que s'il ne dépend que de son sous-arbre ; sinon le contexte entre dans la clé. **déduit**.

### 3.3 Progression

- Nielsen : seuils de 0,1 s, 1 s et 10 s. Entre 2 et 10 s, un indicateur discret ; au-delà de 10 s, un pourcentage et un moyen d'annuler. Quand le total est inconnu, dire ce qui est fait. **doc** ([NN/g](https://www.nngroup.com/articles/response-times-3-important-limits/))
- Myers, 1985 : un indicateur de pourcentage réduit l'anxiété de l'attente ([ACM](https://dl.acm.org/doi/pdf/10.1145/317456.317459)), source secondaire.
- Harrison et al., 2007 : la durée perçue dépend du comportement de la barre ; une barre qui accélère en fin de course paraît plus rapide ([page de l'auteur](https://www.chrisharrison.net/index.php/Research/ProgressBars)).
- Design Lint analyse la sélection et se rafraîchit en continu, sans indicateur de progression documenté ([GitHub](https://github.com/destefanis/design-lint)).

## 4. Leviers, classés par gain attendu

Aucun gain n'est mesuré dans Figma. L'ordre suit la part du temps que chaque
levier peut retirer, d'après la trace L9.8 et le code.

| # | Levier | Gain attendu | Risque | Condition |
|---|---|---|---|---|
| V1 | **Montrer les constats du kit avant le moteur.** Contrôles et corrections ne dépendent que du relevé et du catalogue. Les rendre dès qu'ils sont prêts, puis ajouter ceux du moteur et des règles. | Les premiers constats en quelques secondes au lieu de la fin du moteur ; durée totale inchangée. | Le panneau change deux fois ; un constat du moteur peut s'ajouter sous un élément déjà « tenu ». | Décision du mainteneur sur l'affichage provisoire (Q1). |
| V2 | **Un moteur réduit pour Architect.** Une option du moteur qui s'arrête après `structure` : sans échantillons, compaction ni sérialisation. | Jusqu'à 15 % du moteur, d'après les poids. | Les règles d'usage lisent `content` : il faut un contrat sans échantillons, ou que les règles lisent la structure. | Comparer les constats C30 à C45 avec et sans l'option, sur les fixtures. |
| V3 | **Mémoire des parcours par racine (L9.8 proposé).** Garder, le temps d'une analyse, `getAllNodes` et `textSlots` par racine. | 3 à 5 s sur 20 s, estimé en L9.8. | Contrat identique exigé ; l'avertissement du calque masqué doit encore sortir. | Banc de parité existant de l'exporteur. |
| V4 | **Une seule lecture par calque.** Le relevé lit chaque propriété une fois (`fills`, `strokes`, `getStyledTextSegments`), puis le moteur reçoit ce relevé brut au lieu de relire Figma. C'est l'analyse par famille de 3.2, appliquée aux lectures. | Supprime la seconde lecture des variants ; la part réelle est à lire dans la trace. | Élevé : le moteur lit des champs que le relevé ne porte pas (frontières, modes, plages de texte). | Après V5, si les lectures dominent encore. |
| V5 | **Mesurer l'analyse d'Architect.** Ouvrir la trace de `mesure.ts` autour des six phases, avec les compteurs existants, et l'imprimer dans la console. | Aucun en soi ; il dit lequel de V2 à V4 vaut le coût. | Nul : la trace n'entre pas dans les constats. | À faire en premier. |
| V6 | **Rendre la main à l'horloge partout.** Le relevé respire sur `respirerSiBesoin` (200 ms) plutôt que tous les 400 calques ; contrôles et corrections passent par tranches entre deux contrôles. | Pas de gain de durée ; le gel de Figma disparaît. | Faible ; 200 ms reste au-dessus des 50 ms recommandés. | Mesurer `plusLongSilenceMs` avant et après. |
| V7 | **Reprendre l'analyse précédente.** Garder le résultat du moteur par jeu de variants tant qu'aucun `nodechange` ne touche ses nœuds, comme la révision de Salsa. | Une seconde analyse sans changement devient immédiate. | Un changement hors des nœuds suivis (variable, library, règles sur la page) ne périme rien. | Liste exacte de ce qui invalide, à écrire avant. |
| V8 | **Déporter les contrôles du kit dans un Web Worker de l'iframe**, comme le recommande Figma. Le relevé et le catalogue y partent par message ; les constats reviennent au sandbox, qui garde l'identité et les corrections. Le worker exécute le kit compilé à la volée par le navigateur, au lieu de QuickJS. | Le calcul pur sort du fil de Figma, et s'exécute sans doute 10 fois plus vite ou davantage (3.1, **déduit**). | Le relevé copié peut peser plusieurs Mo, dans les deux sens. Deux copies du kit dans le build. | V5 dit le temps du calcul dans Figma et celui de la copie. Au-delà d'une seconde de calcul, V8 passe devant V6. |
| V9 | **`skipInvisibleInstanceChildren`** pour les lectures qui ne regardent pas les calques masqués d'instance. | Plusieurs fois sur `findAll`, d'après la doc. | Élevé : l'audit de l'exporteur l'écarte autour de `extractRules` (règles d'icône) et le relevé lit la visibilité. | Seulement sur le `findAll` du sujet, qui ne sert qu'à la péremption. |

Écarté : baisser le budget de 2 000 calques, lire moins de variants,
retirer des contrôles. La vitesse ne justifie pas une analyse incomplète.

## 5. Progression dans le panneau

Architect a déjà le mécanisme de l'exporteur dans le socle : étapes pesées,
`avancer`, `avancementCourant`, temps restant mesuré depuis `wrapper`. Il ne
l'utilise pas. Proposition :

1. Ouvrir la trace avec des étapes propres à Architect : sujet, relevé (compte des variants lus), catalogue, puis les étapes du moteur, puis contrôles. Les poids viennent de la première trace de V5.
2. Envoyer l'avancement comme l'exporteur : au plus un message par point de pourcentage, pendant la respiration qui suit.
3. Dans le panneau, à la place de la note « Les constats s'afficheront à la fin de l'analyse » : une barre déterminée, le nom de la phase en mots simples (« Lecture des variants : 34 sur 90 », « Lecture des composants imbriqués », « Vérification des règles »), et le temps restant au-delà de 10 s, comme le recommande Nielsen.
4. Un bouton Annuler sous la barre, qui envoie `annuler-analyse` ; l'écran « annulée » existe déjà.
5. Avec V1, les sections du panneau se remplissent pendant que la barre continue sur le moteur.

Les textes et la maquette passent par le mainteneur avant le code.

## 6. Mesures à faire dans Figma

Sur le Button de 90 variants, même poste, même library :

1. Trace de V5 : dix analyses à l'ouverture du plugin, dix sans le fermer. Temps par phase, `msGetAllNodes`, `plusLongSilenceMs`, nombre de calques lus.
2. Dans la console du plugin : `typeof scheduler`, `typeof requestIdleCallback`, `typeof setTimeout`.
3. 90 parcours `findAll` du jeu, avec puis sans `skipInvisibleInstanceChildren`.
4. Temps d'un `postMessage` du relevé sérialisé, et sa taille.

## 7. Décisions du mainteneur

- **Q1, oui.** Les constats du kit s'affichent avant ceux du moteur, avec une mention « analyse des composants imbriqués en cours » (V1).
- **Q2, oui.** Ordre retenu : V5 et la progression d'abord, puis V6 et V1, puis V2 et V3 selon la trace.
- **Q3, oui.** La mémoire de V7 est retenue, alors qu'un changement de library ne la périme pas.

Reste avant le code : la maquette et les textes de la progression (section 5), puis le plan des lots.
