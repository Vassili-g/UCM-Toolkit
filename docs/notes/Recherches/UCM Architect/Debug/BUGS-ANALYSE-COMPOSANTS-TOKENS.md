# Bugs de l'analyse des composants et des tokens

Les cas ci-dessous se déduisent du chemin de lecture et des contrôles appelés par UCM Architect. Ils restent à reproduire dans Figma ; l'agent ne peut pas y lancer le plugin.

## 1. Une variable illisible efface une liaison existante

**Reproduction.** Lier le `fills[0]` d'une icône à une variable, puis faire rendre `null` par `getVariableByIdAsync` pour cet identifiant pendant l'analyse.

**Résultat.** `Lecteur.variable` consigne la lecture manquée, mais `Lecteur.liaisons` retire cette liaison du relevé. Le contrôle C66 conclut « couleur sans variable ». La préparation peut également traiter la peinture comme une valeur sans token et proposer une variable de remplacement. La liaison reste pourtant présente dans Figma.

**Cause.** [releveDuComposant.ts](../../../../../packages/plugin-architect/src/releveDuComposant.ts) : `Lecteur.variable` (lignes 163 à 181), `Lecteur.liaisons` (lignes 184 à 190). [typographie.ts](../../../../../packages/kit/src/controles/typographie.ts) : `controlerLesIcones`. [preparation.ts](../../../../../packages/kit/src/controles/preparation.ts) : recherche des peintures non liées.

## 2. Les descendants d'un calque masqué passent les contrôles de visibilité

**Reproduction.** Dans un variant, masquer un groupe contenant un texte de 10 px et laisser `visible=true` sur le texte lui-même. Analyser le composant.

**Résultat.** Le relevé garde la visibilité propre de chaque calque. `layersVisibles` accepte le texte masqué par son parent ; C49 signale un texte sous 12 px. Les contrôles de typographie retiennent aussi ce texte. Le même chemin peut compter un anneau de focus caché dans un groupe masqué comme visible.

**Cause.** [releveDuComposant.ts](../../../../../packages/plugin-architect/src/releveDuComposant.ts) : `lireLeLayer` (ligne 265). [accessibilite.ts](../../../../../packages/kit/src/controles/accessibilite.ts) : `layersVisibles`, `controlerLeTexteMinimal` et `anneauxDuVariant`. [typographie.ts](../../../../../packages/kit/src/controles/typographie.ts) : `sources`.

## 3. Une boîte illisible devient une cible de taille nulle

**Reproduction.** Analyser un composant interactif dont la racine ne rend ni `absoluteBoundingBox` ni les quatre nombres `x`, `y`, `width`, `height`.

**Résultat.** La lecture note « boîte illisible », puis remplace les dimensions par `0 × 0`. Le contrôle C52 produit un constat « cible inférieure à 24 px » avec ces zéros. Le relevé ne permet pas de connaître la taille réelle.

**Cause.** [releveDuComposant.ts](../../../../../packages/plugin-architect/src/releveDuComposant.ts) : `dimensionsDe` (lignes 128 à 137). [accessibilite.ts](../../../../../packages/kit/src/controles/accessibilite.ts) : `controlerLesCibles`.

## 4. Une lecture manquée peut laisser l'analyse « complète »

**Reproduction.** Faire échouer la lecture d'une variable, d'un style ou d'une boîte sans interrompre le parcours des variants.

**Résultat.** `lecture.manquees` est non vide, mais le statut final ne regarde que les variants et les layers non lus. Le panneau peut donc annoncer une analyse complète, voire « Tenu », alors qu'un champ nécessaire à un contrôle manque. Les bugs 1 et 3 produisent des constats trompeurs dans ce même état.

**Cause.** [analyse.ts](../../../../../packages/plugin-architect/src/sandbox/analyse.ts) : calcul de `lectureComplete` (lignes 380 à 385). [releveDuComposant.ts](../../../../../packages/plugin-architect/src/releveDuComposant.ts) : `lecture.manquees` dans le résultat.

## 5. C21 ignore les alias des autres modes

**Reproduction.** Trois variants frères lient le même champ d'un layer homonyme à trois tokens `components`. En mode clair, les trois tokens visent le même rôle de `theme`. En mode sombre, deux visent encore ce rôle et le troisième vise un autre rôle. Ranger le mode clair en premier dans les valeurs des trois tokens.

**Résultat.** C21 donne aux trois tokens la même signature et ne relève aucun écart de fratrie en mode sombre. L'ordre des modes peut changer ce verdict.

**Cause.** [mapping.ts](../../../../../packages/kit/src/controles/mapping.ts) : `signature` retient le premier alias trouvé par `Object.values(...).find(...)` ; `ecartsDeFratrie` compare ensuite cette seule signature.

## 6. Ignorer un point du moteur peut masquer un autre point

**Reproduction.** Obtenir deux avertissements du moteur de même code, A puis B. Ignorer A. Modifier le composant de sorte que le moteur rende B avant A, puis relancer l'analyse.

**Résultat.** Les identifiants sont `moteur:<code>:0` et `moteur:<code>:1` selon l'ordre d'émission. La clé d'Ignorer rangée pour A désigne maintenant B. Le panneau cache B et réaffiche A.

**Cause.** [constatsDuMoteur.ts](../../../../../packages/plugin-architect/src/constatsDuMoteur.ts) : identifiant fondé sur `constats.length` (ligne 64). [ignores.ts](../../../../../packages/plugin-architect/src/ecriture/ignores.ts) : comparaison et rangement par identifiant dans `separerLesIgnores` et `ignorerUnConstat`.

## 7. L'analyse d'une instance cherche les règles du maître sur la page de l'instance

**Reproduction.** Placer un composant maître et ses règles d'usage sur une page, puis analyser une instance de ce composant depuis une autre page du même fichier.

**Résultat.** Architect donne le maître au moteur, mais lui passe `figma.currentPage`, qui est la page de l'instance. Le moteur appelle `extractRules` avec cette page et peut signaler des règles absentes alors qu'elles se trouvent sur la page du maître. La lecture distincte de C43/C45 prend, elle, la page du maître.

**Cause.** [analyse.ts](../../../../../packages/plugin-architect/src/sandbox/analyse.ts) : résolution du maître dans `sujetDeFigma` (lignes 213 à 232) et option `page` du moteur (lignes 289 à 295). [exportComponent.ts](../../../../../packages/plugin-socle/src/composant/contract/exportComponent.ts) : `extractRules(componentSet, page)`.

## 8. Le maître situé sur une autre page échappe à la péremption

**Reproduction.** Analyser depuis une instance le composant maître situé sur une autre page. Pendant que la page de l'instance reste ouverte, faire modifier le maître ou l'un de ses calques par un collaborateur.

**Résultat.** Architect surveille les changements de la page courante, celle de l'instance. Aucun événement `nodechange` de la page du maître n'atteint `surChangementDuDocument`. L'analyse et ses corrections restent proposées comme si le maître était inchangé.

**Cause.** [code.ts](../../../../../packages/plugin-architect/src/code.ts) : `suivreLaPage` n'abonne que `figma.currentPage` (lignes 34 à 50). [analyse.ts](../../../../../packages/plugin-architect/src/sandbox/analyse.ts) : le sujet de l'analyse est le maître, mais `surChangementDuDocument` ne voit que les événements transmis.

## 9. La sélection d'un composant imbriqué ne périme pas l'analyse du parent

**Reproduction.** Analyser un jeu de variants qui contient un composant imbriqué, puis sélectionner ce composant imbriqué dans Figma.

**Résultat.** Le nouveau sujet est le composant imbriqué. Son identifiant figure pourtant parmi les descendants du jeu analysé ; `surSelection` le traite comme une sélection du même sujet. Les constats du parent ne sont pas marqués périmés.

**Cause.** [analyse.ts](../../../../../packages/plugin-architect/src/sandbox/analyse.ts) : `sujetDeFigma` ajoute tous les descendants à `noeuds` (lignes 223 à 232), puis `surSelection` ne compare le nouveau sujet qu'à cet ensemble (lignes 182 à 185). [lectureDuComposant.ts](../../../../../packages/plugin-architect/src/lectureDuComposant.ts) : `sujetDe` choisit le composant imbriqué comme sujet.

## 10. La fin d'une analyse retire sa propre marque de péremption

**Reproduction.** Lancer une analyse assez longue pour modifier un calque du jeu avant sa fin. Laisser le calcul se terminer.

**Résultat.** `nodechange` émet `perime` pour l'analyse en cours. L'interface marque cette analyse comme périmée. À la réception du message `analyse` final de la même identité, elle remet `perimee` à `false`. Le panneau repropose les constats et leurs corrections ; le sandbox garde l'analyse périmée et refuse l'application.

**Cause.** [analyse.ts](../../../../../packages/plugin-architect/src/sandbox/analyse.ts) : `surChangementDuDocument` peut périmer l'opération avant l'envoi du résultat. [ui/composant/analyse.ts](../../../../../packages/plugin-architect/src/ui/composant/analyse.ts) : le cas `analyse` de `recevoirUneAnalyse` écrase `perimee` et `cause` avec `false` et `null`.

## 11. Le tableau des variants ne compte pas les constats du kit identifiés par variant

**Reproduction.** Analyser un jeu avec deux propriétés de variant et un constat C16 sur l'un des variants. Ouvrir le tableau croisé de la section Variants.

**Résultat.** La puce de la valeur compte C16, mais la cellule du variant ne montre aucun nombre. Le kit inscrit l'identifiant du variant dans `constat.variants` ; la cellule ne cherche les constats que sous le nom du variant.

**Cause.** [ui/composant/variants.ts](../../../../../packages/plugin-architect/src/ui/composant/variants.ts) : `proprietesDe` accepte identifiants et noms, tandis que `tableauDe` construit `constatsParVariant` avec les valeurs brutes puis consulte seulement `variant.nom`. [mapping.ts](../../../../../packages/kit/src/controles/mapping.ts) : C16 porte `variant.id`.

## 12. Une taille sans token exact bloque la préparation sur une question sans réponse possible

**Reproduction.** Analyser un composant qui porte une valeur de dimension de 13 px sans variable `layout` de la famille attendue valant exactement 13 px. Ouvrir « Préparer les tokens ».

**Résultat.** La ligne de taille annonce « aucun token ne vaut 13 px : une question ». Le plan contient une question `cible:` sans candidat. La feuille ne crée un choix que pour chaque candidat : elle ne propose donc aucune réponse, et le bouton Préparer reste désactivé. Le designer ne peut ni choisir un autre token ni terminer la préparation depuis cette feuille.

**Cause.** [preparation.ts](../../../../../packages/kit/src/controles/preparation.ts) : la recherche des dimensions exige la même famille et la même valeur, puis crée une question même quand la liste des candidats est vide. [ui/preparation/index.ts](../../../../../packages/plugin-architect/src/ui/preparation/index.ts) : les réponses sont des boutons radio construits à partir de cette liste ; `preparer.disabled` reste vrai tant qu'une question existe. Le test d'interface couvre le libellé « aucun token », mais pas la possibilité de résoudre la question.

## Cas à confirmer : plusieurs collections reconnues comme `theme`

**Reproduction proposée.** Fournir un catalogue avec deux collections distinctes reconnues comme `theme`. Placer les variables d'une palette dans la seconde, puis demander la préparation des tokens d'un composant qui utilise cette palette.

**Effet déduit du code.** `preparerLesTokens` prend seulement la première collection de rôle `theme`. La liste des palettes, les intensités et les cibles possibles excluent la seconde. Le même choix du premier rôle s'applique à `layout`.

**Point à trancher.** Vérifier si deux collections reconnues sous le même rôle constituent une entrée autorisée pour cette préparation. Si oui, ajouter ce cas à la liste numérotée et le reproduire dans un test.

**Cause.** [preparation.ts](../../../../../packages/kit/src/controles/preparation.ts) : `collectionDe` utilise `find`, puis les recherches de cibles filtrent par la seule clé retenue.
