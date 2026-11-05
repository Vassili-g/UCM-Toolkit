# Réduire l’attente avant les constats d’Architect

Le calcul des noms constitue une cible d’accélération que les optimisations de structure du plan ne couvrent pas.
Le mode Tokens peut aussi afficher ses constats de structure avant le bilan des noms.
Un banc local reproduit 30 secondes d’attente avec des lectures simulées immédiates.

Le mainteneur observe environ 30 secondes entre le lancement de l’analyse et l’affichage des constats.
Cette durée provient de son observation dans Figma. Elle n’est pas encore décomposée par phase.

## Ce que le plan établit

Le [plan de fiabilisation](./Plan/README.md) coche les optimisations D1 à D4 et la virtualisation D6.
Il laisse ouvertes D5b (comparaison de la prélecture dans Figma) et D7 (mesure finale locale et dans Figma).
Ces cases ne prouvent donc pas une réduction de l’attente observée.

Le [lot D5a](./Plan/lots/D5a.md) construit un candidat de prélecture Tokens inactif.
`packages/plugin-architect/src/sandbox/prelecture.ts` refuse sa reprise au clic sans preuve de fraîcheur.
Une activation seule ne suffit donc pas à supprimer la lecture au lancement.

## Le mode Tokens attend le bilan des noms

`packages/plugin-architect/src/ui/nomenclature/etat.ts` choisit l’écran `lecture` dès que `analyse` existe.
`packages/plugin-architect/src/ui/nomenclature/coquille.ts` masque alors `ecranDesOnglets`.
Les cartes de structure peuvent donc être reçues et préparées sans devenir visibles avant le `bilan` des noms.

`packages/plugin-architect/src/nomenclature/session.ts` enchaîne la lecture de l’inventaire, les renommages et la détection des questions.
Le `bilan` arrive après ces calculs.
Les événements `lecture` comptent seulement les variables acquises par `packages/plugin-socle/src/inventaireDeNoms.ts`.
Le dernier compte peut donc rester à N sur N pendant la recherche des renommages et des questions.
`packages/plugin-architect/src/ui/nomenclature/panneaux.ts` conserve le titre « Lecture des variables » pendant cette attente.

Une autre dépendance retarde la structure.
`packages/plugin-architect/src/ui/index.ts` reçoit le `releve`, rend l’explorateur, puis demande `lire-structure`.
Le lecteur attend donc aussi les cibles d’alias, les membres des collections rencontrées et les bases d’extension avant de demander les contrôles.

## Ce que fait déjà le mode Composant

`packages/plugin-architect/src/sandbox/analyse.ts` lance les lectures du catalogue et des dépendances avec recouvrement.
Il exécute les contrôles du kit dès que le relevé et le catalogue sont disponibles.
Il envoie ensuite `analyse-provisoire` avant d’attendre la fin du moteur des composants imbriqués.
Ce message porte les constats et les ignorés, sans les corrections applicables du résultat final.

Cette stratégie réduit l’attente avant les premiers constats.
Elle ne supprime pas le temps de lecture du relevé et du catalogue qui les précède.
Le mode Tokens peut reprendre cette séparation entre résultats disponibles et analyse encore en cours.

## Une attente de 30 secondes se reproduit sans attente de l’API

Le banc `_local/recherche-attente/mesurer.mjs` appelle la vraie session de Nomenclature sur deux exports DTCG disponibles.
Il construit un bundle avec les sources courantes du kit, sans utiliser `packages/kit/dist`.
Il exécute le même calcul sous Node et dans `quickjs-emscripten` 0.15.0, déjà utilisé par le test de compatibilité du sandbox.

Les ports de lecture rendent immédiatement des objets ordinaires.
Le banc fixe une convention en minuscules avec tirets et traite toutes les variables comme non protégées.
Il ne reproduit ni les données partagées de Palettes, ni les alias de l’inventaire, ni les règles personnalisées du fichier ouvert.
Les pauses résolvent immédiatement leur promesse.
Le coût mesuré provient donc du calcul et de son exécution dans ces deux moteurs.
Node conserve le même module entre les sources.
QuickJS utilise une machine virtuelle neuve pour chaque source.
Le banc ne mesure pas le chargement initial du bundle dans le temps du bilan.

Première exécution, sans échauffement dédié de la session complète.
Les temps sont arrondis à la milliseconde.

| Source | Variables | Lecture terminée, QuickJS | Bilan, Node | Bilan, QuickJS | Lexique, QuickJS | Questions, QuickJS |
|---|---:|---:|---:|---:|---:|---:|
| Source 1 | 2 415 | 72 ms | 802 ms | 30 384 ms | 20 003 ms | 7 883 ms |
| Source 2 | 755 | 14 ms | 164 ms | 7 790 ms | 4 839 ms | 1 855 ms |

Les deux moteurs rendent des bilans identiques après sérialisation, dans leur ordre complet.
Les deux sources produisent respectivement 15 et 11 groupes, puis 10 et 3 questions.
Le banc ne publie aucun nom issu des fichiers clients.
Ses résultats détaillés restent dans `_local/recherche-attente/mesures.json`.

Cette expérience reproduit l’ordre de grandeur signalé par le mainteneur.
Elle démontre un coût de calcul possible sans lenteur de l’API Figma.
Elle ne mesure pas la durée du plugin dans Figma.
Le moteur QuickJS en WebAssembly du banc et le moteur embarqué par Figma peuvent avoir des performances différentes.
Le facteur entre Node et ce banc ne constitue donc pas une promesse d’accélération dans Figma.

La phrase de `MESURE-DES-FAILLES.md` attribuant l’attente d’Actualiser aux lectures Figma dépasse sa preuve.
Les mesures citées couvrent les contrôles du catalogue et de l’intégrité.
Elles ne couvrent pas le lexique et les questions qui retardent le bilan des noms.

## Les optimisations cochées ne traitent pas toutes cette attente

| Travail du plan | Effet établi par le code et les tests | Limite pour l’attente initiale |
|---|---|---|
| D1, acquisition commune | Le relevé fournit les variables à la structure. Nomenclature reprend les objets locaux quand sa demande recouvre la lecture du relevé. | Le lexique, les renommages et les questions restent calculés. Une demande Nomenclature arrivée après le relevé relit les locales. |
| D2, lectures groupées | Les deux listes locales partent ensemble. Les lectures de cibles sont limitées à huit requêtes en vol. | Cette concurrence ne parallélise pas les calculs JavaScript. |
| D3, index du kit | Le contrôle des alias manquants évite des recherches répétées. | Ce contrôle ne construit ni le lexique ni les questions de Nomenclature. |
| D4a, Ignorer | La structure refiltre les constats gardés. | Le premier lancement doit encore les calculer. |
| D4b, Appliquer | La structure relit complètement les données après écriture. | Cette règle protège les voisins et les candidats. Elle ne réduit pas le coût du premier bilan. |
| D5a, prélecture | Le candidat Tokens existe avec un budget de 50 ms. | Aucun appel ne lance ce candidat. Sa reprise au clic rend toujours `null`. |
| D6, virtualisation | Les longues listes gardent un nombre limité de cartes dans le DOM. | La virtualisation intervient après le calcul des résultats. |

L’acquisition D1 a déjà supprimé des milliers d’appels par identifiant dans les tests du rejeu.
Le [lot D1](./Plan/lots/D1.md) documente cette preuve.
Augmenter encore le nombre d’appels simultanés ne répond pas au coût de calcul reproduit ici.

## Réduire le travail de découpage

`packages/kit/src/referentiel/lexique.ts` garde déjà les découpes de segments dans `mots` et les plages dans `plagesParSegment`.
`packages/kit/src/referentiel/questions.ts` garde aussi des remplacements par segment et catégorie.
Ajouter une mémoire sans repérer les appels restants risquerait de doubler ces tables.

Le banc propose une variante `--memo`.
Elle mémorise les entrées exactes de `decouperSegment` et de `decouperPourQuestions` dans le bundle d’expérience.
Elle rend une copie des tableaux retenus pour conserver leur comportement mutable.
Les sources du produit restent intactes.

Cette variante teste une réduction du travail répété, sans sauter de contrôle.
Les empreintes des bilans sérialisés sont égales à celles du bundle de référence sur les deux sources.
Chaque variante rend aussi le même bilan sous Node et QuickJS.

| Source | Référence QuickJS, troisième exécution | Variante avec mémorisation | Questions seules, référence | Questions seules, variante |
|---|---:|---:|---:|---:|
| Source 1 | 32 282 ms | 27 721 ms | 7 731 ms | 2 792 ms |
| Source 2 | 8 214 ms | 10 647 ms | 1 775 ms | 1 147 ms |

Le découpage mémorisé réduit ici la durée des questions.
Le lexique reste à 21 634 ms pour la source 1 avec la variante.
La charge varie entre les exécutions et les durées globales ne s’améliorent pas sur les deux sources.
Cette expérience ne démontre donc pas un gain global stable ni une accélération drastique.
Elle ne justifie pas l’ajout immédiat de ces tables au kit.

Les commandes suivantes reproduisent le banc local tant que ses deux exports d’entrée sont disponibles.

```sh
node _local/recherche-attente/mesurer.mjs
node _local/recherche-attente/mesurer.mjs --memo
```

Le fichier `_local/recherche-attente/mesures-memo.json` garde les résultats de la variante.
Les fichiers locaux ne sont pas suivis par Git.

## Le budget de huit millisecondes ne borne pas chaque blocage

`packages/plugin-architect/src/nomenclature/tranches.ts` regarde l’horloge après chaque `calcul.next()`.
Il ne peut céder pendant cet appel.
`packages/kit/src/referentiel/lexique.ts` cède notamment après 200 noms.
Il appelle aussi `naturesDesNoms` dans un seul pas.

La deuxième exécution du banc mesure un pas du lexique de 4 109 ms sur la source 1 dans QuickJS.
Un pas de la détection des questions atteint 990 ms.
Le budget annoncé de 8 ms ne suffit donc pas à garantir des boutons réactifs dans ce banc.
Les durées totales varient sous la charge de la machine, de 30,4 à 45,5 s pour la source 1 entre les deux premières exécutions.

Découpez les boucles internes qui dépassent le budget mesuré.
Ce travail réduit les blocages et facilite l’annulation.
Il peut allonger le temps total si les cessions deviennent trop fréquentes.
La [documentation Figma sur les plugins bloqués](https://developers.figma.com/docs/plugins/frozen-plugins/) recommande ce découpage.

## Déplacer les calculs de noms dans un Worker de l’interface

Cette piste vise le temps total.
Figma sépare le sandbox qui accède au document de l’interface qui dispose des API du navigateur.
La [documentation de l’environnement](https://developers.figma.com/docs/plugins/how-plugins-run/) décrit cette séparation.
La [documentation des tâches longues](https://developers.figma.com/docs/plugins/frozen-plugins/) recommande un Worker pour un calcul à entrée et sortie explicites.
Le Worker ne peut pas accéder à `figma`.

Le lexique, le vocabulaire, les renommages, les collisions et les questions sont des calculs purs.
Leur déplacement peut donc se tester sans déplacer les écritures.
L’écart mesuré entre Node et QuickJS justifie ce prototype.
La vitesse réelle du Worker dans Figma reste à mesurer.

Le sandbox construirait un inventaire sérialisable à partir d’une acquisition fraîche.
Il y ajouterait les protections, les refus et les règles du fichier.
Le Worker appellerait les mêmes fonctions du kit.
Le sandbox retiendrait le résultat de la génération courante et continuerait à relire les objets avant toute écriture.

Le prototype doit couvrir aussi les recalculs après réponse, les simulations et les projections de Nomenclature.
Déplacer seulement les questions laisserait le lexique, majoritaire dans le banc, sur le chemin d’attente.
Les résultats détaillés resteraient paginés pour limiter les messages.
Chaque réponse porterait la demande, la génération et la révision de l’acquisition.
Une nouvelle analyse invaliderait les réponses précédentes.

Mesurez le transfert de l’inventaire, le démarrage du Worker, le calcul et le retour du résultat.
Vérifiez son chargement dans Figma et dans la galerie avec la politique de contenu du plugin.
Comparez les bilans, les pages et les corrections dans leur ordre complet.
Gardez une voie de calcul dans le sandbox si le Worker ne démarre pas.

## Afficher la structure sans attendre les noms

Cette piste vise le délai avant les premiers constats.
Elle reprend le principe du mode Composant, avec un état d’avancement propre à chaque famille.
La structure et les noms peuvent finir à des moments différents.

Gardez le panneau des constats visible pendant l’analyse.
Affichez les nouvelles cartes de structure dès leur réception.
Laissez Noms dans son état en cours jusqu’au bilan.
Conservez l’ordre final des catégories et l’état de leurs cartes.
Ne déclarez jamais une catégorie sans constat avant la fin de ses contrôles.

Pendant une actualisation, identifiez les résultats précédents et désactivez leurs corrections.
Une nouvelle révision ne doit pas rendre applicables les corrections de la précédente.
Pour une première version, gardez Appliquer désactivé jusqu’à la fin de l’analyse complète.
Cette règle reprend la prudence du provisoire du mode Composant.

La structure dépend encore du relevé complet dans le parcours courant.
Si la mesure attribue une part importante aux cibles distantes, séparez ensuite l’acquisition locale de son enrichissement.
Une absence locale, un alias illisible et une cible encore à lire doivent garder des états distincts.
Les contrôles qui cherchent un candidat dans tout le catalogue attendent la fin de cet enrichissement.
Une collection seule ne suffit pas à prouver une absence dans tout le fichier.

Les changements d’interface présents dans l’arbre de travail ajoutent `packages/plugin-architect/src/ui/tokens/actualisation.ts`.
Ce module attend le relevé, la structure et les noms avant de retirer le chargement.
Il ajoute une durée finale, mais conserve donc une attente commune aux trois résultats.
Son texte revient à « Lecture des variables… » quand le relevé est terminé et qu’une autre part manque.
Ces changements appartiennent à une autre modification en cours et ne sont pas modifiés par cette recherche.

## Rendre les messages fidèles au travail exécuté

Les propositions ci-dessous sont des textes à valider avant implantation.
Les changements de message doivent suivre un événement du calcul.
Une minuterie ne prouve pas le passage à l’étape suivante.

| État prouvé | Texte proposé | Compte affiché |
|---|---|---|
| Les listes locales sont demandées | « Lecture des variables… » | Aucun total avant la réponse de Figma. |
| L’inventaire local est construit | « Lecture des variables, 500 sur 2 415 » | Seulement le nombre de variables acquises. |
| Le lexique et les renommages sont calculés | « Vérification des noms… » | Aucun pourcentage global déduit du compte de lecture. |
| La détection des questions commence | « Recherche des termes à harmoniser… » | Aucun total de questions annoncé à l’avance. |
| Les cibles d’alias sont lues | « Lecture des cibles des alias… » | Un nombre lu. Le total peut augmenter avec les nouvelles cibles. |
| Les contrôles de structure s’exécutent | « Vérification des variables et des alias… » | Un avancement de phase si le calcul le fournit. |
| La structure est affichée et les noms restent en cours | « Les constats de structure sont affichés. La vérification des noms continue. » | Le nombre de constats déjà affichés, séparé de l’avancement. |
| Les résultats sont reçus et le panneau est rendu | « Analyse terminée en 4,2 s » | La durée depuis le lancement de cette demande. |

Après N variables sur N, retirez la barre de lecture ou passez-la dans un état indéterminé pour la phase suivante.
La lecture terminée ne vaut pas analyse terminée.
Affichez éventuellement le temps écoulé, sans l’utiliser comme estimation du temps restant.
Évitez « presque terminé » et une barre globale à 100 % avant le résultat final.

## Ce que la mesure finale doit ajouter

Le journal `mesurerUnePhaseDeTokens` garde une durée et un compte d’appels par phase.
Il ne garde ni début, ni fin, ni identifiant d’actualisation.
`rafraichir` réunit acquisition, calcul et projection de Nomenclature.
`lire-structure` englobe ses sous-phases.
Additionner ces durées compterait plusieurs fois une partie du travail.

Le rapport du panneau mesure le rendu de `structure` et la taille sérialisée de deux messages.
Il ne mesure pas tout le délai du clic au premier constat visible.
Son compteur appelé `octets` utilise `JSON.stringify(message).length`, donc un nombre d’unités de chaîne JavaScript.
Cette valeur n’est pas une mesure du temps de transport.

`packages/plugin-architect/src/ui/index.ts` retrouve aussi certaines clés et certains noms par une recherche dans toutes les variables.
`Noms.cle` reconstruit un tableau et appelle `find` à chaque recherche.
Indexez les noms entiers et les clés si le rendu ressort coûteux dans la trace.
Le banc de Nomenclature ne mesure pas cette partie de l’interface.

Ajoutez les mesures suivantes à une même demande.

- Début et fin des appels locaux, des cibles et des imports.
- Construction de l’inventaire, du lexique, des renommages, des questions et du bilan.
- Nombre de cessions, temps passé à attendre et plus long pas synchrone.
- Réception puis premier affichage des constats de structure et des noms.
- Fin du rendu complet et temps total depuis le lancement.
- Taille des messages et nombre de lectures répétées.

Comparez le lancement à froid, une seconde analyse inchangée, Actualiser, Ignorer et Appliquer sur le même fichier.
Gardez les mêmes règles, protections et sorties complètes.
Rejouez aussi une modification manuelle, Ctrl+Z, un changement de règles et une lecture refusée.
La [documentation des événements Figma](https://developers.figma.com/docs/plugins/api/properties/figma-on/#documentchange) décrit des changements de nœuds et de styles.
Elle ne fournit pas de notification de variables qui justifierait une mémoire interdemande fraîche.

## Ordre proposé

1. Décomposez `rafraichir` et mesurez le premier affichage dans Figma. La durée des contrôles de structure seule ne suffit pas.
2. Prototypez le calcul de Nomenclature dans un Worker avec les mêmes entrées et sorties. Le lexique constitue la première cible du banc.
3. Affichez la structure dès qu’elle est prête. Gardez une progression et une révision propres à chaque famille.
4. Branchez les messages sur les étapes réelles. Retirez le compte N sur N dès que la lecture est finie.
5. Découpez les pas synchrones trop longs et mesurez leur coût. La réactivité et le temps total demandent deux relevés distincts.

## Périmètre

Cette recherche porte sur le code courant, les tests et les mesures disponibles.
Elle ne lance pas d’analyse dans Figma et ne modifie pas le plugin.
Le banc est un instrument d’exploration local, sans seuil de performance imposé au produit.
Les règles du fichier ouvert et ses durées dans Figma restent à mesurer.

Le contrôle de style du document passe.
Le test `tests/registreDesDocuments.test.ts` passe avec ce nouveau chemin.
La comparaison locale vérifie les deux bilans entre la référence, la variante et les deux moteurs.
`npm run agents:diff` ne trouve aucun chemin supprimé ou renommé.
Ses demandes de vérification des paquets portent sur les modifications de code déjà présentes dans l’arbre partagé.
