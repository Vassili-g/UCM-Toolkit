# Lot 0 : référence et banc de comparaison

[Sommaire des lots](./README.md).

## Tâches à committer

- [x] **0.1 | gpt-6-luna | low** : étendre le comparateur exporteur aux parties, localisations et diagnostics imbriqués, dans leur ordre ; test sensible à une permutation.
- [x] **0.2 | gpt-6.1-sol | medium** : établir les deux fabriques Architect indépendantes et comparer messages, constats, corrections, modèles et catalogue ; test de divergence volontaire.
- [ ] **0.3 | gpt-6-luna | low** : ajouter les fixtures de texte à plages, surcharge d'instance et lectures manquées ; deux acquisitions fraîches donnent la même sortie.
- [ ] **0.4 | gpt-6-luna | low** : ajouter les fixtures de budget, retrait et ajout de variant ; comparer préfixe admis, couverture et nombre non lu.
- [ ] **0.5 | gpt-6-luna | low** : compter listes locales, lectures par identifiant, descendants et maîtres dans les doubles ; vérifier les compteurs sans seuil temporel.
- [ ] **0.6 | gpt-6.1-sol | medium** : couvrir questions, réponses, ignorés, corrections et échec de ressource suivi d'une réussite ; comparer les sorties complètes.

Prérequis : aucun. Nature : caractérisation à sortie identique.
Chemins : `packages/plugin-architect/tests/analyse.test.ts`,
`releveDuComposant.test.ts`, `identitesEtPage.test.ts`,
`packages/plugin-exporter/tests/aides/parite.ts`, `paritePerformance.test.ts`,
et doubles voisins. Les noms de fichiers sans préfixe reprennent le paquet
du dernier chemin complet.

## Portée et preuves conservées

- **Acquis localement, non commité** : étendre le banc actuel pour capturer toutes les
  sorties du contrat de parité, notamment `parties`, localisations et modèles
  de règles. Produire deux exécutions indépendantes sur les mêmes doubles ;
  garder la voie actuelle comme oracle pendant la migration.
  Preuves : `aides/parite.ts` compare tout `ComponentExport`, dont les trois
  index de diagnostics dans leur ordre et les imbriqués. Architect dispose de
  `tests/parite.ts` : deux fabriques indépendantes, messages complets, constats
  retenus, corrections, modèles, relevé et catalogue. Seule la génération des
  messages est ramenée à une origine commune ; les identifiants des constats
  restent exacts. `analyse.test.ts` exerce C43, C44 localisé, correction retenue,
  modèle et ignoré. Contrôles : Architect 1 067 tests, exporteur 1 081 tests,
  typecheck des deux paquets ; extraction du helper revérifiée sur les 19 tests
  d'analyse. Aucun écran changé.
- **Acquis localement, non commité** : compléter le corpus avec les cas du tableau qui
  manquent, selon les constructeurs et attentes relus en 0.1 et 0.2.
  Ajouter les compteurs de lectures et de requêtes aux doubles, sans assertion
  sur un gain encore inconnu.
  Avancées ciblées : `releveDuComposant.test.ts` compare deux acquisitions
  fraîches du cas texte à plages et instance surchargée, puis retire et ajoute
  un variant avant une lecture au budget ; `analyse.test.ts` compare deux
  lectures partielles avec manque localisé et deux variants non lus.
  `releveDuComposant.test.ts` refuse aussi un identifiant à la première
  acquisition, puis le relit avec succès dans une seconde acquisition ; les
  doubles comptent les deux appels.
  `figmaDeTest.ts` compte désormais les appels aux listes locales en plus des
  lectures par identifiant. `analyse.test.ts` compare aussi une question C29
  avec deux candidats, puis la réponse et son `aRelire`. `paritePerformance.test.ts`
  compte séparément les recherches de descendants de chaque variant et les
  lectures de maître de chaque instance, avec et sans portée. Contrôle final :
  40 tests ciblés passent. Les compteurs décrivent les appels ; ils ne promettent
  aucun gain de durée.

Cas à raccorder au banc en 0.3 à 0.6, avec les constructeurs
existants :

- `releveDuComposant.test.ts`, `jeuFactice()` : comparer deux relevés frais du
  texte à plages adjacentes et de l'instance surchargée ; reprendre les budgets
  existants de 10 et 1 layers sans dupliquer leurs attentes de forme. Ajouter
  un retrait puis un ajout de variant qui change le préfixe admis.
- `analyse.test.ts`, `lecteurs()` et `tests/parite.ts` : passer une lecture
  partielle avec `manquees` localisé et deux variants non lus ; comparer aussi
  un cas avec question et candidats, d'après les fixtures de corrections
  existantes, puis sa correction et son `aRelire` après réponse.
- `figmaDeTest.ts`, `portDeTest()` compte déjà les appels par identifiant et
  les imports ; compléter seulement les lectures locales et les propriétés
  effectivement absentes de ses compteurs. Ajouter le refus puis la réussite
  du même identifiant entre deux acquisitions indépendantes.
- `paritePerformance.test.ts`, `monterLeSet()` : réutiliser les variants et les
  instances existants pour compter les lectures supplémentaires ; le compteur
  des maîtres est déjà présent. Les comparaisons d'export avec et sans portée
  couvrent désormais aussi les parties et localisations de tout le corpus.

Couverture existante à conserver : `constatsDuMoteur.test.ts` exerce la table
et le repli C42 ; `regles.test.ts` exerce C43/C45 et le modèle exact ;
`analyse.test.ts` exerce AA/AAA, le refus de configuration, les ignorés et les
fins. Les combinaisons au-delà des entiers exacts attendent la décision du lot 4.

Sortie : chaque comparaison échoue si l'on retire une localisation, permute
deux modes ou altère une correction. Contrôle : tests Architect et exporteur.
Ne pas construire un deuxième oracle qui appelle déjà le nouveau calcul.
