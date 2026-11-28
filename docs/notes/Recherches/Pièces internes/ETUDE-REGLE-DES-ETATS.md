# Règle des surcharges au changement d'état

Cette étude compare deux règles pour le contrat 15.0 de P22 : `R-Figma`, qui recopie la règle de conservation de Figma et écrit une perte quand elle ne peut pas la prouver, et `R-UCM`, une convention écrite par UCM. Elle suit la [confrontation](./CONFRONTATION-15.md) (décision 1, paire `BXID`) et l'[étude des surcharges du marché](./ETUDE-SURCHARGES-MARCHE.md).

## Recommandation

Retenir `R-UCM` comme convention : une valeur que l'hôte impose à une occurrence de pièce (couleur, texte, visibilité, échange d'icône) vaut dans tous les états et toutes les variantes que l'occurrence peut prendre. Le contrat ne lit pas la règle de Figma, et aucun plugin ne contrôle l'écart. Un designer qui veut un autre résultat dessine une variante de la pièce que l'hôte pose.

La preuve tient en quatre mesures.

- Sur Button et Groupe, la convention et la règle documentée de Figma ne divergent sur aucune couleur : 800 transitions de couleur sur Button, aucune couleur imposée sur Groupe. Les deux règles donnent le même contrat sur les deux composants.
- Dans le laboratoire (5 200 composants tirés, 58 364 bascules), `R-UCM` diverge de Figma dans 3 041 bascules (5,2 %) sous la règle documentée, et dans 0 sous la règle de valeur libre. `R-Figma` laisse 0 bascule fausse sous ces deux règles et en décrit 10 192, contre 12 819 pour `R-UCM`.
- Sous une règle de Figma plus stricte que la documentation, `R-Figma` devient faux dans 64 bascules (34 tirages), parce que ses preuves ne tiennent plus. `R-UCM` ne change pas de contrat : seul le nombre d'écarts visibles dans Figma monte de 3 041 à 3 579.
- La sortie « relier la couleur de la pièce au même token » change les autres occurrences dans 82 % des cas : elle ne convient pas comme sortie locale.

Rien de cela ne vient d'un rejeu dans Figma. L'essai du dernier chapitre tranche le comportement réel, et son résultat peut changer la recommandation (tableau « Ce que chaque résultat change »).

## Méthode

Le laboratoire est celui de la confrontation (`lab-b.cjs` avant intégration, générateur `gen.cjs`, 5 200 graines, réglage complet). Une copie vit dans `_local/p22/regles/lab/`. Quatre ajouts :

- le modèle de vérité de Figma gagne deux règles : `stricte` (toute surcharge directe tombe au changement de variante) et `imbriquee` (la valeur initiale décide pour les surcharges directes, et celles qui traversent une instance imbriquée tombent), en plus de `identite` (la surcharge suit le nom du calque) et `valeurInitiale` (la règle de l'aide de Figma) ;
- le constructeur reçoit l'option `regle: 'ucm'`, qui supprime la perte de transfert d'une valeur et garde les pertes de sélection et d'exposition ;
- la perte de transfert est séparée en deux (`P-transfert` pour la valeur, `P-exposition` pour l'instance exposée) ;
- une paire `UCM3` lit la convention sans appliquer les dimensions, styles et effets imposés.

Une bascule est une configuration de genre `bascule` ou `etat` dont le rendu de vérité change réellement de variante : 58 364 bascules, sur 32 742 couples (variant de l'hôte, pièce). Chaque bascule est rendue sous les quatre règles de Figma, puis lue par la paire de R-Figma et par la paire de R-UCM. Les écarts déjà présents sans bascule sont retirés du compte.

Une bascule tombe dans une classe :

- juste, aucun écart ;
- en perte, des écarts que le contrat a déclarés (sélection ambiguë, exposition, ou perte de valeur pour `R-Figma`) ;
- sans variante unique, Figma lui-même ne choisit pas : 4 812 bascules, communes aux deux règles ;
- fausse pour `R-Figma`, ou divergente pour `R-UCM` : le contrat dit autre chose que Figma, sans perte.

Sur les composants réels, la mesure lit les captures de Figma (`button-capture-2026-11-26.json` et le rapport d'analyse de Groupe) et applique la règle documentée aux champs que `overrides` liste. Le contrat de Groupe est la version anonymisée.

## Mesures du laboratoire

| Règle de Figma | Paire | Juste | En perte | Sans variante unique | Fausse ou divergente |
|---|---|---|---|---|---|
| `identite` | `R-Figma` | 10 192 | 43 360 | 4 812 | 0 |
| `identite` | `R-UCM` | 16 551 | 37 001 | 4 812 | 0 |
| `valeurInitiale` | `R-Figma` | 10 192 | 43 360 | 4 812 | 0 |
| `valeurInitiale` | `R-UCM` | 12 819 | 37 692 | 4 812 | 3 041 |
| `stricte` | `R-Figma` | 10 114 | 43 374 | 4 812 | 64 |
| `stricte` | `R-UCM` | 12 152 | 37 821 | 4 812 | 3 579 |
| `imbriquee` | `R-Figma` | 10 192 | 43 360 | 4 812 | 0 |
| `imbriquee` | `R-UCM` | 12 819 | 37 692 | 4 812 | 3 041 |

Lecture.

- `R-Figma` donne le même résultat sous `identite` et `valeurInitiale`, parce que sa preuve n'écrit un transfert que si les deux règles s'accordent. Elle paie ce choix en pertes : 6 359 bascules (10,9 %) où `R-UCM` décrit juste sous `identite`, et 2 627 (4,5 %) sous `valeurInitiale`.
- La plupart des pertes ne viennent pas de la règle des états. Sur 82 408 renvois, 20 191 portent une perte de sélection et 38 500 une perte d'exposition, identiques pour les deux règles. La perte de valeur ne touche que `R-Figma` : 19 101 renvois (23,2 %). Les renvois sans aucune perte passent de 31 892 (38,7 %) à 36 100 (43,8 %).
- Sous `valeurInitiale`, les 3 041 bascules divergentes de `R-UCM` sont toutes des bascules où `R-Figma` écrit une perte. La divergence touche 1 757 couples de 32 742 (5,4 %) et 1 054 composants de 5 200 (20,3 %), soit 1,7 couple par composant touché. Elle porte sur la couleur dans 2 833 bascules, sur la boîte dans 209 et sur le style de texte dans 82.
- Sur les 16 551 bascules que `R-UCM` décrit sans autre perte, 3 041 divergent sous la règle documentée (18 %). Ce taux vaut pour un générateur qui pose 0 à 3 surcharges au hasard sur chaque occurrence. Il surestime les fichiers réels, comme le montre le chapitre suivant.
- Sous `stricte`, 64 bascules deviennent fausses pour `R-Figma` : une preuve que la règle documentée valide ne tient plus. `R-UCM` passe à 3 579 écarts visibles dans Figma, 1 972 couples touchés (6,0 %).
- `imbriquee` ne change aucun chiffre : le générateur ne pose pas de surcharge traversant une instance imbriquée qui change de variante. Le bogue reconnu des icônes (`ETUDE-SURCHARGES-MARCHE.md`) reste donc hors de la mesure.

## Mesures sur Button et Groupe

### Button

Les 90 variants de Button posent chacun une instance de `.sizeWrapperButton` en taille Medium. La taille est exposée : le designer la change par une propriété de l'instance, ce qui échange la variante du wrapper vers Small ou Large. Cela donne 90 occurrences et 180 transitions. Le script `mesure-button.cjs` compare, pour chaque champ que `overrides` liste, la valeur d'origine du calque dans la variante posée et dans la variante cible.

| Champ surchargé par l'hôte | Surcharges × transitions | Conservées par la règle documentée | Tombent |
|---|---|---|---|
| remplissage du cadre racine | 180 | 180 | 0 |
| remplissage du texte et des icônes | 540 | 540 | 0 |
| contour du cadre racine (variants à contour) | 80 | 80 | 0 |
| épaisseur de chaque côté du contour | 240 | 240 | 0 |
| largeur et hauteur du cadre racine | 360 | 0 | 360 |
| liaisons de variables du cadre racine | 60 | 0 | 60 |

Toutes les couleurs imposées (800 sur 800) ont la même valeur d'origine dans les trois tailles : même couleur, même variable. La convention et Figma s'accordent. Aucune occurrence ne diverge sur une couleur, et `R-Figma` écrit 0 perte de valeur pour ces renvois.

Les deux lignes qui tombent ne sont pas des choix du designer. Le cadre racine est en `HUG` : sa largeur et sa hauteur se calculent depuis le contenu, et Figma les liste comme surchargées sans que le contrat les publie (la vue du renvoi a la même structure que celle de la variante, seul le placement des couleurs s'ajoute). Les liaisons de variables du cadre racine, listées sur les 30 variants à contour, regroupent espacements, rayons et épaisseurs de contour dans un seul champ. Les espacements et les rayons changent avec la taille, donc ce champ tombe. Les épaisseurs et la couleur du contour passent par leurs propres champs, conservés. Le rendu au repos ne change pas ; une liaison qui disparaît ne se verrait qu'au changement de mode.

La convention doit donc se limiter à ce que le designer choisit. Une dimension que l'auto layout calcule n'est pas une valeur imposée. La question 1 reprend ce point.

### Groupe

La capture de Groupe compte 15 instances de `.Segment`. Neuf sont posées dans les trois variants de Groupe (trois segments par variant). Les six autres sont posées dans d'autres composants de la capture et n'entrent pas dans la mesure.

- Les neuf occurrences portent 1 à 3 surcharges de hauteur, de largeur et de mode de dimensionnement. Aucune ne porte une couleur.
- Pour l'état seul (36 transitions) et pour tous les axes (801 transitions), ces champs ont la même valeur d'origine dans toutes les variantes : 84 surcharges conservées sur 84, puis 1 869 sur 1 869.
- Dans `Groupe.anonyme.15.json`, les neuf renvois ont la vue, les couleurs et les contours de la variante qu'ils citent. L'hôte n'impose donc rien que le contrat porte.
- Les valeurs de `BordGauche`, `BordDroit` et `AvecMilieu` sont des propriétés de composant, pas des surcharges de calque : `setProperties` garde les propriétés qu'on ne nomme pas (documentation de `InstanceNode`).

Aucune occurrence de Groupe ne diverge, et `R-Figma` n'écrit aucune perte de valeur pour Groupe.

### Combien de fois le cas se présente

| Composant | Occurrences | Couleurs imposées | Divergences de couleur avec la convention | Pertes de valeur avec `R-Figma` |
|---|---|---|---|---|
| Button | 90 | 800 transitions | 0 | 0 |
| Groupe | 9 | 0 | 0 | 0 |
| Composant tiré (laboratoire) | 6,3 par composant en moyenne | selon le tirage | 1,7 couple touché sur 20,3 % des composants | 23,2 % des renvois |

Dans les fichiers réels mesurés, la différence entre les deux règles n'apparaît pas. Le cas existe quand un hôte repeint une pièce dont l'état change la couleur d'origine, ce que le laboratoire force et que ni Button ni Groupe ne font.

## La sortie « relier au même token »

Cette sortie ne touche pas seulement l'occurrence. Relier la couleur de la pièce au même token dans les deux états rend égales les valeurs d'origine, donc Figma garde la surcharge. Elle modifie le maître de la pièce, donc toutes ses occurrences dans l'état concerné.

Preuve dans `sortie-token.cjs`, sur 5 200 composants. Pour chaque surcharge d'hôte que la règle documentée abandonnerait au changement d'état (26 238 couples surcharge et état cible), le script applique la sortie (la variante cible reprend la valeur d'origine de la variante posée), puis rend toutes les autres instances de la même pièce dans l'état cible.

- La surcharge est retrouvée à l'occurrence dans 26 238 cas sur 26 238 (24 590 lus, 1 648 sur un calque masqué).
- La sortie change le rendu d'au moins une autre occurrence dans 21 584 cas (82,3 %). Sur 63 152 autres occurrences candidates, 59 309 (93,9 %) changent de couleur.
- Les 4 654 autres cas (17,7 %) n'ont aucune autre occurrence dans l'état cible : la sortie y est locale par hasard.

L'exemple du mainteneur se vérifie : un segment que l'hôte ne repeint pas perd la couleur propre du survol, remplacée par celle de l'état de départ.

## Sorties qui ne touchent que l'occurrence

| Sortie | Ce que Figma permet | Touche | Réserve |
|---|---|---|---|
| Variante de la pièce posée par l'hôte (axe de variante supplémentaire, par exemple `Role`) | Oui, sans surcharge : la variante porte ses couleurs dans chaque état | l'occurrence que l'hôte pose | multiplie les variantes de la pièce par le nombre de rôles ; cas `S1` |
| Propriété booléenne ou d'échange de la pièce, réglée par l'hôte | Oui pour une visibilité ou un échange d'instance ; Figma n'a pas de propriété de couleur | l'instance | la valeur d'une propriété suit l'instance au changement de variante d'après la documentation ; cas `S2` le confirme |
| Axe de variante exposé | Oui, c'est une variante choisie à l'hôte | l'instance | demande que la pièce ait la variante pour chaque état |
| Mode de variable forcé sur l'occurrence | L'API le permet (`setExplicitVariableModeForCollection` sur une instance) | l'instance et ses descendants | la pièce doit lier ses couleurs à une collection à modes ; le contrat 15.0 déclare aujourd'hui une perte pour un mode forcé ; la documentation ne dit pas que le mode survit à l'échange ; cas `S3` |
| Calque de l'hôte placé derrière la pièce | Oui | l'hôte | ne porte que des fonds, pas le texte ni les icônes |
| `SLOT` de la pièce rempli par l'hôte | `setProperties` refuse les propriétés `SLOT` | l'instance | D6 le traite comme une perte d'abord |
| Détacher l'instance | Oui | l'instance | rompt le lien avec la pièce ; aucune mise à jour ne lui arrive |

Les trois sorties que le contrat décrit déjà sont la variante posée, l'axe exposé et la propriété exposée. Le mode forcé demande un travail de contrat, qui sort du périmètre de la convention.

## Comparaison des règles

| Critère | `R-Figma` | `R-UCM` |
|---|---|---|
| Un contrat qui dit une chose fausse | 0 bascule sous `identite` et `valeurInitiale`, 64 sous `stricte` | ne décrit que l'intention de l'hôte : la question ne se pose pas pour le contrat ; 3 041 écarts avec Figma sous la règle documentée, visibles dans Figma |
| Dépendance à l'heuristique de Figma | forte : la preuve lit les valeurs d'origine, y compris des couleurs d'aperçu que le contrat ne publie pas | aucune pour le contrat |
| Ce que voit le développeur | des pertes (23,2 % des renvois en portent une pour la valeur) et des coordonnées non résolues | un contrat complet : la valeur de l'hôte, dans tous les états |
| Ce que fait le designer | rien de plus, mais voit ses états partir en perte | lit une convention ; dessine une variante pour un autre résultat |
| Ce que fait le code | attend la résolution de coordonnées que le contrat laisse ouvertes | passe la valeur du parent à l'enfant, comme en CSS ou par une variable |
| Robustesse à un changement de l'heuristique ou à ses bogues | les preuves se périment sans signal (64 bascules fausses sous `stricte`) | le contrat reste vrai ; le nombre d'écarts visibles dans Figma varie (3 041 à 3 579) |
| Agnostique (sans sceau, sans blocage) | l'Exporter écrit des pertes | l'écart reste dans Figma, aucun plugin ne le rapporte |
| Coût dans l'Exporter | moteur de preuve : lecture des valeurs d'origine, appariement par identité, pertes de transfert regroupées | retire l'étape 6 de §2.12 et les cas `P-transfert` de §2.11 ; le lecteur garde l'étape 5 (écarts entre renvoi et variante) |
| Coût dans Architect | aucun | aucun |

Le point faible de `R-UCM` est le dernier de la colonne agnostique : un écart reste dans le fichier sans que personne ne le signale. Le mainteneur accepte ce coût : une couleur imposée qui tomberait au changement d'état est une erreur de dessin que le designer voit dans Figma.

## Une troisième règle

Trois candidates ont été examinées.

- `R3a`, la convention limitée aux couleurs, textes, visibilités et échanges, sans les dimensions, styles et effets imposés. La mesure (paire `UCM3`) ne gagne rien dans le laboratoire : 3 150 bascules divergentes sous la règle documentée (contre 3 041) et 772 sous `identite` (contre 0). Le générateur modélise les dimensions comme des choix du designer, alors que les captures réelles montrent des artefacts d'auto layout. Cette mesure ne départage donc pas les deux, et la limite se décide sur Button, où 360 transitions de dimensions tombent sans être publiées. La convention garde ce périmètre dans son texte, pas dans le lecteur.
- `R3d`, la convention accompagnée d'une perte écrite dans `meta.diagnostics` quand la règle documentée dirait que Figma abandonne la valeur. Son compte égale celui des divergences : 3 041 bascules (5,2 %), contre 19 101 renvois en perte de valeur avec `R-Figma`. Elle garde l'intention dans le contrat et signale l'écart au développeur. Elle recrée une dépendance à l'heuristique, pour un avertissement et non pour le contenu, et elle contredit le choix de ne rien contrôler. À reprendre seulement si l'essai montre que la règle documentée est exacte et que le mainteneur veut une trace.
- `R3m`, `R-UCM` avec une mesure dans Figma par Architect. Le mainteneur l'a écartée.

Aucune troisième règle ne fait mieux que `R-UCM` sous la contrainte « aucun contrôle ».

## Texte de la convention pour le guide du designer

À placer dans `docs/guides/POUR-LES-DESIGNERS.md`, au chapitre « Préparer un composant ».

> **Une couleur posée sur une pièce vaut pour tous ses états.** Quand vous peignez, dans un composant, une pièce posée à l'intérieur, la couleur reste la même dans le code, quel que soit l'état de la pièce : repos, survol, clic, désactivé.
>
> Figma ne fait pas toujours pareil. Si l'état d'arrivée a une autre couleur de départ que l'état où vous avez peint, Figma efface votre couleur et remet celle de l'état. Dans Figma, la pièce change alors de couleur au survol, alors que le code garde la vôtre. Dans ce cas, Figma montre autre chose que le code : c'est une erreur de dessin, et UCM ne la signale pas.
>
> Pour une couleur différente selon l'état, ne repeignez pas la pièce dans le composant. Dessinez une variante de la pièce avec les couleurs voulues pour chaque état, puis posez cette variante dans le composant.
>
> Changer la couleur de la pièce elle-même règle le problème, mais elle change alors dans tous les composants qui l'emploient.

Phrase de référence pour `FORMAT.md` : une valeur que l'hôte impose à une occurrence de pièce (couleur, texte, visibilité, échange d'icône) vaut dans toutes les variantes que l'occurrence peut prendre ; les dimensions que l'auto layout calcule ne sont pas des valeurs imposées ; le contrat ne lit pas la règle de conservation de Figma.

## Essai dans Figma

Le plugin d'essai est dans `_local/p22/regles/essai-figma/` (`manifest.json`, `code.js`, `ui.html`). Il n'a pas été exécuté. Le mainteneur l'importe depuis le menu des plugins de développement, sur une copie du fichier.

Il fabrique ses propres composants sur une page « Essai règle des états » : une pièce à deux états (`Default`, `Hover`) avec un fond, un texte, un glyphe échangeable et un calque d'accent, plus deux collections de variables. Chaque cas est joué dans deux situations et par deux gestes :

- `direct` : la surcharge est posée sur une instance, puis son état change ;
- `hote` : la surcharge est posée dans le maître d'un composant hôte, puis l'état change sur l'instance imbriquée d'une instance de l'hôte, comme dans P22 ;
- `setProperties` : le changement passe par la propriété de variante ;
- `swapComponent` : le changement passe par l'échange de composant, qui applique l'heuristique du panneau (`InstanceNode`, documentation de l'API).

Pour chaque combinaison, le plugin lit avant et après le changement les `fills`, `characters`, `visible`, le rayon, le composant principal des instances imbriquées, `overrides`, `componentProperties` et `explicitVariableModes`, et rend un verdict : surcharge conservée, valeur de l'état cible, ou autre.

| Cas | Ce qu'il pose | Ce qu'il lit |
|---|---|---|
| `K1` | même couleur d'origine dans les deux états | la couleur du fond |
| `K2` | couleur d'origine différente | la couleur du fond |
| `K3a`, `K3b`, `K3c`, `K3d` | couleur liée : même token, deux tokens de même valeur, deux tokens de valeurs différentes, valeur brute puis token | la variable liée et la couleur résolue |
| `K4` | calque renommé dans l'état cible | où la couleur imposée se retrouve |
| `K6`, `K6b` | échange d'icône, avec la couleur du glyphe échangé | le composant principal du glyphe, sa couleur |
| `K7` | texte saisi | `characters` |
| `K8a`, `K8b` | calque masqué, visible ou déjà masqué dans l'état cible | `visible` |
| `K9a`, `K9b` | rayon, même valeur d'origine ou non | `cornerRadius` |
| `S1` | variante de la pièce posée par l'hôte, avec une instance témoin non surchargée | la couleur de l'occurrence et celle du témoin |
| `S2` | propriété booléenne réglée par l'hôte | la visibilité du calque d'accent |
| `S3` | mode de variable forcé sur l'instance | la couleur résolue et `explicitVariableModes` |

La seconde commande du plugin, « Lire la sélection », lit une instance déjà posée. Elle sert à deux cas que l'API ne produit pas, à jouer à la main : l'état piloté par une variable de prototype (bogue reconnu des icônes) et le changement d'état par le panneau de propriétés, à comparer à `swapComponent`. Protocole manuel : poser l'instance, surcharger un calque, lancer « Lire la sélection », changer l'état dans le panneau, relancer, comparer. Un contenu de `SLOT` rempli à la main se traite de même.

`createSlot` n'est pas appelé : l'en-tête du résultat note seulement s'il existe (`typeof figma.createSlot`).

### Ce que chaque résultat change

| Résultat | Changement de la recommandation |
|---|---|
| `K1` : la surcharge tombe malgré une valeur d'origine identique | La règle de Figma est plus stricte que sa documentation. `R-Figma` écrirait des preuves fausses ; la convention diverge de Figma dès qu'un hôte repeint une pièce. Garder `R-UCM`, et le texte du guide dit que toute couleur posée sur une pièce risque de tomber. |
| `K2` : la surcharge reste malgré une valeur d'origine différente | Figma suit `identite`. La convention est exacte, 6 359 pertes de `R-Figma` n'étaient pas nécessaires, et le texte du guide peut retirer sa réserve. |
| `K2` : la surcharge tombe | La règle documentée est exacte. La divergence mesurée (5,2 % dans le laboratoire, 0 sur Button et Groupe) est celle que le texte du guide décrit. |
| `K3a` conservée et `K3b` tombe | Figma compare l'identifiant de la variable, pas la valeur résolue. La sortie « relier » demande le même token, pas la même couleur. |
| `K3b` conservée | Figma compare la valeur résolue. Deux tokens de même valeur suffisent. |
| `K4` : la couleur reste sur un calque de nom différent | Figma apparie par position et non par nom. La clé d'identité de `BXID` perd son fondement. |
| `K6`, `K6b` : la couleur ou l'échange tombe | Le bogue reconnu touche les instances imbriquées à l'état piloté ou non. La convention est fausse pour les icônes : le texte du guide les cite, ou la convention les exclut. |
| `K7`, `K8` : texte ou visibilité tombe | Le périmètre de la convention perd cette ligne. |
| `hote` diffère de `direct` | Le laboratoire ne modélise pas la situation de P22 : refaire la mesure avec la règle de `hote`. |
| `setProperties` diffère de `swapComponent` | Seul le geste du panneau compte pour le designer : suivre le résultat qui correspond au panneau. |
| `S1` : l'occurrence garde ses couleurs, le témoin garde les siennes | La variante posée est la sortie recommandée, confirmée. |
| `S2` : la propriété reste réglée après l'état | La sortie par propriété exposée vaut pour la visibilité et les échanges. |
| `S3` : le mode reste forcé et la couleur se résout dans ce mode | Le mode forcé devient une sortie viable, à condition d'écrire une règle de contrat pour `explicitVariableModes`. |

## Questions au mainteneur

1. La convention couvre-t-elle seulement ce que le designer choisit (couleurs, textes, visibilités, échanges d'icône), sans les dimensions que l'auto layout calcule ? Recommandation : oui. Les largeurs, les hauteurs et les liaisons de variables du cadre racine de `.sizeWrapperButton` tombent au changement de taille (420 des 1 460 surcharges de Button) et ne sont pas des choix.
2. Faut-il écrire dans `meta.diagnostics` une perte quand la règle documentée dirait que Figma abandonne la valeur (`R3d`) ? Recommandation : non tant que l'essai n'a pas confirmé la règle, et non ensuite sans demande, pour tenir « aucun contrôle ». Le coût serait de 3 041 bascules (5,2 %) dans le laboratoire et de 0 sur Button et Groupe.
3. Faut-il lancer l'essai avant d'écrire la convention dans `FORMAT.md` et dans `POUR-LES-DESIGNERS.md` ? Recommandation : écrire la convention maintenant, parce qu'aucun résultat ne la rend fausse pour le code, et réserver l'essai au texte des sorties et à la réserve sur Figma. Le cas `K1` est le seul qui oblige à reformuler.

## Fichiers

Tout est dans `_local/p22/regles/` : `JOURNAL.txt`, `lab/` (`lab-b.cjs`, `mesurer.cjs`, `sortie-token.cjs`, `comptes-pertes.cjs`), `mesure-button.cjs`, `mesure-groupe.cjs`, `sorties/` (`complet-total.json`, `r3-total.json`, `token-5200.json`, `comptes-pertes.json`, `button-mesure.json`, `groupe-mesure.json`) et `essai-figma/`.
