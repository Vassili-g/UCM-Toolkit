# Accélérer l'analyse d'un composant de 90 variants

## Mesure disponible et cible

L'analyse réelle du Button de 90 variants n'a pas encore été chronométrée dans Figma. L'agent ne peut pas exécuter le plugin dans Figma. Les temps ci-dessous viennent d'une fixture locale ; ils ne constituent pas une mesure du Button de production.

La fixture contient 90 variants, 12 calques par variant, soit 1 080 calques. Chaque variant a un texte et 11 peintures liées à 36 variables distinctes. Les contrôles ont été exécutés depuis les sources du kit, sous Node sur Windows, cinq fois dans des processus distincts. Le port de test attend `setTimeout(0)` pour chaque variable ou collection demandée. Cette attente simule une frontière asynchrone ; sa durée dépend de l'ordonnanceur Windows et ne représente pas la latence de Figma.

| Partie mesurée | Médiane locale | Portée |
|---|---:|---|
| Relevé des 90 variants | 505 ms | 36 variables et une collection lues en série ; les cinq mesures vont de 105 à 527 ms |
| Huit contrôles du kit | environ 60 ms | Données de la fixture, 992 constats avant propositions |
| `proposerLesCorrections` | 111 ms | La fixture produit 3 152 constats après propositions, dont 2 160 valeurs de taille en dur |
| Recherche de calque répétée sur 3 150 constats | 137 ms | Mesure isolée, trois essais ; un index construit une fois ramène cette recherche à 0,6 ms |

Le chronométrage de recherche est distinct de celui de `proposerLesCorrections` : il compare deux algorithmes sur les mêmes constats et ne s'ajoute pas au total. La fixture surcharge volontairement les propositions de dimensions ; le Button réel peut avoir moins de constats. Aucun temps du moteur d'export, de la library, du transfert à l'interface ou de Figma n'est inclus dans ces chiffres.

**Cible de recette à proposer :** analyse complète des 90 variants en moins de 2 s au 50e percentile et de 4 s au 95e percentile, sur un fichier déjà ouvert ; aucun intervalle sans progrès visible supérieur à 250 ms. Ces seuils sont des objectifs, pas des performances observées. Les fixer définitivement après dix analyses dans Figma sur le Button, avec la même library et le même poste, puis dix analyses après chaque lot.

## Où passe le temps

Dans [analyse.ts](../../../../../packages/plugin-architect/src/sandbox/analyse.ts), le relevé, le catalogue, le moteur, les règles, les contrôles et les corrections s'enchaînent. Le relevé lit chaque calque de chaque variant dans [releveDuComposant.ts](../../../../../packages/plugin-architect/src/releveDuComposant.ts). Une variable inconnue déclenche `getVariableByIdAsync`, puis éventuellement `getVariableCollectionByIdAsync`, avant le calque suivant. Le moteur [exportComponent.ts](../../../../../packages/plugin-socle/src/composant/contract/exportComponent.ts) reparcourt ensuite les mêmes variants pour leur composition, leurs liaisons et leur structure. `lireLeCatalogueDeLibrary` relance `lireLesLibraries` après le premier appel du sandbox. Enfin, [corrections.ts](../../../../../packages/kit/src/controles/corrections.ts) reconstruit et filtre la liste de tous les calques pour chaque constat qui appelle `layerDuConstat`.

Le parcours répété est certain d'après le code. Son coût dans Figma, ainsi que la part du catalogue et du moteur, reste à mesurer. Le benchmark existant `npm run mesure --workspace ucm-architect-plugin` mesure l'explorateur de tokens, pas cette analyse de composant.

## Lots proposés

| Lot | Changement concret | Gain chiffré à vérifier | Condition de qualité |
|---|---|---|---|
| 1. Tracer l'analyse entière | Chronométrer séparément sujet, relevé, catalogue, moteur, règles, chaque contrôle, corrections et transfert UI. Compter variants, calques, variables distinctes, appels Figma et constats. Rattacher la trace existante du moteur au temps total. | Pas de gain direct ; localise les phases qui dépassent 10 % du temps total. | La mesure ne modifie ni les données analysées ni les diagnostics. |
| 2. Indexer les corrections | Construire une fois `Map<layer.id, LayerLu>`, `Map<variant.id, VariantLu>` et les index des variables candidates pour l'appel à `proposerLesCorrections`. Remplacer `flatMap(...).filter(...)` dans `layerDuConstat` et les balayages répétés du catalogue. | Sur la fixture : recherche de calque de 137 ms à 0,6 ms, soit environ 136 ms économisables dans ce cas isolé. Viser moins de 30 ms pour toutes les corrections au lieu de 111 ms ; ce dernier gain reste à mesurer après modification. | Même liste ordonnée de constats, mêmes corrections et mêmes questions, comparée par égalité profonde. Garder le refus si plusieurs calques portent le même identifiant. |
| 3. Mutualiser les lectures de variables | Prélever les identifiants liés dans tous les variants, puis charger les variables distinctes par lots bornés à huit appels en vol. Mémoriser la promesse en cours par identifiant pour éviter deux lectures simultanées du même token. Charger les collections distinctes de la même façon. | 36 variables de la fixture : 36 tours séquentiels deviennent au plus 5 tours de huit. Avec 10 ms **hypothétiques** par appel, 360 ms de latence pure deviendraient environ 50 ms, soit 310 ms gagnées ; hors calcul et lectures de collections. | Garder une entrée `lecture.manquees` par liaison illisible, l'annulation entre les lots et le plafond de huit lectures en vol. Aucun constat ne doit être déduit d'une liaison devenue illisible. |
| 4. Éviter le second inventaire de library | Faire recevoir à `lireLeCatalogueDeLibrary` le résultat déjà obtenu par `lireLesLibraries`, au lieu de rappeler cette fonction. | Économie d'un inventaire complet de library par analyse ; durée inconnue avant la trace du lot 1. | Même choix de library, mêmes collections inaccessibles, mêmes valeurs importées. |
| 5. Partager les faits avec le moteur | Définir un relevé commun des variants utilisable par Architect et l'exporteur, ou faire produire au moteur les faits nécessaires aux contrôles pendant son parcours. Conserver les détails que l'export exige et que le relevé actuel ne porte pas. | Viser un seul parcours des 90 variants au lieu de deux. Le gain réel est au plus la durée du parcours supprimé, à lire dans la trace ; aucune accélération globale n'est chiffrable avant cette mesure. | Comparer bit à bit le contrat exporté et les constats du kit sur les fixtures existantes ; conserver frontières d'instances, modes, plages de texte, budget et annulation. |

Le lot 2 est le premier changement à faible risque. Le lot 3 agit sur l'attente asynchrone sans supprimer de lecture. Le lot 5 dépend du profil Figma : le mener seulement si les deux parcours dominent encore le temps après les lots 2 à 4. Une mise en parallèle générale des 90 variants risquerait d'émettre trop d'appels et de rompre l'ordre des erreurs ; les lots bornés concernent d'abord les lectures indépendantes par identifiant.

## Protocole Figma et critère d'arrêt

1. Sur le Button de 90 variants, relever dix exécutions à froid et dix à chaud : temps total, temps par phase, nombre de calques et de variables distinctes, nombre d'appels `getVariableByIdAsync`, `getVariableCollectionByIdAsync`, `getMainComponentAsync`, `getLocalVariablesAsync` et `lireLesLibraries`. Conserver aussi la taille du message envoyé à l'UI et le temps entre son envoi et son affichage.
2. Faire une copie de référence du contrat, des constats, de leurs identifiants, des questions, des corrections et de `lecture.manquees`. Rejouer les mêmes variantes après chaque lot et comparer ces sorties. Tester une variable inaccessible, une annulation, un composant imbriqué et un budget qui coupe un variant.
3. Accepter un lot si ses sorties restent identiques ou si une différence correspond à un bug documenté et corrigé par un test dédié. Mesurer la médiane et le 95e percentile sur le même fichier. Garder le lot si le gain dépasse la dispersion de la mesure ; sinon passer au poste dominant suivant.

La vitesse ne justifie pas de baisser le budget de calques, de réduire les 90 variants lus, de supprimer des contrôles ou de réutiliser un relevé après un changement du document. Le cache de promesses du lot 3 vit pendant une seule analyse ; un nouveau lancement relit Figma.
