# Lot 4 : supprimer les coûts algorithmiques du kit

[Sommaire des lots](./README.md).

## Tâches à committer

### Correctif ciblé, avant la suite du lot 2

Décision du mainteneur, d'après la trace Figma du Button (voir « Constat de la trace du 2026-10-26 » plus bas).
Ces cases passent avant 2.11 et exigent 2.1 à 2.10 committées.
Chaque case est un commit. Une case qui modifie `packages/kit/src/` porte sa propre montée de version (kit, CLI et adaptateur, README, verrou, pins), faite par le script de l'orchestrateur comme pour `b0e847e7`.
Aucune case ne change le format publié. Seule 4.0e touche une signature exportée du kit, par un paramètre optionnel.
4.0a ne dépend d'aucune autre. 4.0b à 4.0e se commitent sans attendre la mesure Figma de 4.0a.

- [x] **4.0a | gpt-6-luna | medium** | **Claude Sonnet | low** : mesurer chaque contrôle du kit et la lecture des tokens dans la trace, sans toucher au kit.
  `controlesDuKit` (`packages/plugin-architect/src/sandbox/analyse.ts`) ouvre `etape('controle-<nom>')` avant chaque contrôle, dans l'ordre du produit : `controle-nommage`, `controle-mapping`, `controle-couches`, `controle-oublis`, `controle-accessibilite`, `controle-typographie`, puis `controle-theme` et `controle-structure` en architecture UCM.
  Une étape `controle-fusion`, ouverte après le dernier contrôle, porte la réunion de `brut`.
  `phases` ne change pas : `mesurerLeCalcul(..., 'controles', true)` cumule toujours dans l'unique entrée `controles`, et le test qui attend `['sujet', 'releve', 'catalogue', 'moteur', 'regles', 'controles', 'corrections', 'projection', 'projection']` passe sans modification.
  Les étapes vont dans `etapes`, avec les compteurs gagnés pendant chacune (`tranchesSynchronesArchitect`, `cessionsArchitect`, `msEnCessionArchitect`). La durée synchrone d'un contrôle se lit `ms` moins `msEnCessionArchitect`. Une étape absente des étapes prévues laisse l'avancement où il est (`etape` dans `packages/plugin-socle/src/composant/contract/mesure.ts`).
  Trois compteurs s'ajoutent au type `Compteur` : `variablesDuCatalogue` (nombre N de variables, compté une fois après `lecteurs.catalogue`), `tokensDuComposant` (nombre M de tokens, compté une fois dans la mesure `sansTokens` de la projection, qui range `tokens.length` avant de le comparer à 0) et `msTokensDeTailleCatalogue` (durée de l'appel à `clesDesTokensDeTailleAttendus` dans `catalogueDeFigma`). Ce dernier passe par un nouvel utilitaire de `mesure.ts`, `mesurerSousCompteur(compteur, calcul)`, qui ajoute la durée au compteur sans ouvrir de phase.
  Parité : `sansTokens`, les constats et les corrections restent identiques avec et sans mesure (test existant de la trace, étendu à une analyse en architecture UCM).
  Preuve de mesure sans seuil : avec l'horloge simulée du test, chaque étape `controle-<nom>` porte l'avance simulée de son contrôle, `variablesDuCatalogue` vaut la taille de la fixture, `tokensDuComposant` vaut le nombre de tokens du composant et `msTokensDeTailleCatalogue` vaut l'avance simulée de l'appel.
  Pas de montée de version : le kit n'est pas modifié. Chemins : `packages/plugin-socle/src/composant/contract/mesure.ts`, `packages/plugin-architect/src/sandbox/analyse.ts`, `packages/plugin-architect/tests/analyse.test.ts`, `packages/plugin-exporter/tests/mesure.test.ts`. **Build Architect.**
  `analyse.ts` porte aussi du travail local du lot 2 : appliquer cette case sur l'arbre committé et isoler ses hunks comme le prescrit le sommaire.
- [x] **4.0b | gpt-6.1-sol | high** | **Claude Sonnet | high** : calculer `tokensDuComposant` et `axesDuReleve` une fois par couple relevé et catalogue, au lieu d'une fois par appel.
  Dans `packages/kit/src/controles/nommage.ts`, `axesDuReleve` mémorise son résultat dans un `WeakMap` dont la clé est le tableau `releve.proprietes`.
  `tokensDuComposant` mémorise le sien dans un `WeakMap` dont la clé est le catalogue. La valeur garde les tableaux `catalogue.variables` et `catalogue.collections` avec leurs longueurs, et un second `WeakMap` par `releve.proprietes`, lui-même indexé par `releve.jeu.nom`.
  Un appel rend le résultat mémorisé seulement si `variables` et `collections` sont les mêmes tableaux avec les mêmes longueurs ; sinon il recalcule et remplace l'entrée.
  Cette clé couvre toutes les entrées du calcul : noms et collections des variables, rôles des collections, nom du jeu, propriétés de variante. Elle tient aussi quand le relevé est copié avec `{ ...releve }` (`packages/plugin-architect/src/ecriture/regles.ts:63`), parce que la copie garde le même tableau `proprietes`.
  Durée de vie : celle du catalogue. Une analyse relit son catalogue (`lecteurs.catalogue`) et obtient une entrée neuve. La propagation qui suit une analyse retrouve l'entrée tant que le catalogue vit, puisque `retenirLesCorrections` le retient.
  Le tableau rendu et le tableau `segments` de chaque token sont gelés (`Object.freeze`). Les appelants lisent, ou écrivent dans leur propre copie (`corrections.ts:244`, `propagation.ts:46`, `structure.ts:248`) ; une écriture future échoue au lieu de corrompre les autres lecteurs.
  La voie par étapes de 2.12 consulte cette mémoire avant de calculer et n'y range un résultat qu'à la fin d'un calcul complet : une annulation ne laisse aucune entrée partielle.
  Les appelants ne changent pas. Les index locaux de `corrections.ts` (`axes()` et `tokens()`) restent et deviennent des lectures de la mémoire partagée.
  Parité : le test garde une copie de l'implémentation actuelle (`tokensDeReference`) et compare l'égalité profonde ordonnée, à froid puis à chaud, sur les fixtures de `controles-composant`, `corrections`, `corrections-index`, `controles-c29-perimetre`, `propagation` et `structure`. Un second test gèle en profondeur le relevé et le catalogue, puis lance Nommage, Mapping, Oublis, Couches, Accessibilité, Typographie, Thème, Structure, les corrections et la propagation : aucune écriture ne doit lever. Des tests d'invalidation couvrent un tableau `variables` remplacé, une variable ajoutée, un autre `jeu.nom`, un autre tableau `proprietes` et deux catalogues indépendants.
  Preuve de gain sans seuil : sur un catalogue dont les variables comptent leurs lectures de `nom` par un accesseur, cinq appels successifs de `tokensDuComposant` (les cinq sites de contrôle de la trace) lisent N noms au lieu de 5 N, et `releve.proprietes` n'est itéré qu'une fois pour les axes.
  Le catalogue de la phase `catalogue` n'est pas partagé : `chargerLesValeurs` rend un autre objet (`packages/plugin-architect/src/catalogue.ts:158`). 4.0e traite cet appel.
  Montée : kit d'un patch, avec CLI et adaptateur. Contrôles : kit, tests racine, Architect, exporteur. **Build Architect avec kit reconstruit.**
- [x] **4.0c | gpt-6-luna | medium** | **Claude Sonnet | medium** : réduire le coût par variable de `tokensDuComposant`, sans changer sa sortie ni son ordre.
  Dans la seule fonction `tokensDuComposant` (`nommage.ts`), quatre gestes sur la boucle des variables.
  `formeReconnue(releve.jeu.nom)` se calcule une fois avant la boucle ; elle se recalcule aujourd'hui à chaque variable.
  Le rôle de chaque collection vient d'une table `Map` construite une fois par appel, qui garde la première collection de chaque clé comme le fait `find` (même règle que `roles` dans `corrections.ts`), à la place de `catalogue.collections.find` par variable.
  Le premier segment se lit par `nom.slice(0, nom.indexOf('/'))` (le nom entier sans `/`), et sa forme se calcule une fois par premier segment distinct dans une table locale à l'appel. Le `split('/')` complet, la copie `pourLaGrammaire` et la lecture de grammaire ne s'exécutent que pour les variables retenues, après les deux filtres, dans l'ordre actuel : rôle `components`, puis forme du premier segment.
  Les valeurs d'axes (`Object.entries(axes).map(...)`) se construisent une fois avant la boucle ; `lire` les recopie dans un objet neuf à chaque lecture, comme aujourd'hui.
  Parité : même test d'équivalence que 4.0b contre `tokensDeReference`, plus des fixtures de bord : clé de collection en double (la première gagne), collection sans rôle, nom sans `/`, nom qui commence par `/`, nom vide, `jeu.nom` vide, premiers segments qui ne diffèrent que par la casse ou le séparateur (`Button`, `button`, `BUTTON`, `Icon-Button`).
  Preuve de gain sans seuil : sur 2 000 variables réparties sur 20 composants, `releve.jeu.nom` est lu une fois (2 000 fois avant), `catalogue.collections.find` n'est plus appelé (2 000 appels avant, comptés par un `Proxy` sur le tableau des collections) et `variable.nom` n'est lu que deux fois au plus par variable.
  Montée : kit d'un patch, avec CLI et adaptateur. Contrôles : kit et tests racine. **Build Architect avec kit reconstruit.**
- [x] **4.0d | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : mémoriser `formeReconnue` et indexer `termeReconnu` par registre.
  Dans `packages/kit/src/referentiel/reconnaissance.ts`, `formeReconnue(texte)` range son résultat dans une `Map` du module, plafonnée à 20 000 entrées et vidée en entier au dépassement. La valeur ne dépend que de constantes du module (`decompositions`, `termesDePlusieursMots`, `termes-connus`), qu'aucun code n'écrit après le chargement ; les seules écritures de `termes-connus.ts` sont des mémos déterministes (lignes 62, 73 et 131).
  `termeReconnu(registre, segment)` s'appuie sur un index par registre, `WeakMap<Registre, { nombreDeTermes, parForme }>`, construit au premier appel. Il parcourt `registre.termes` dans l'ordre, puis `[terme.id, ...terme.toleres]` pour chaque terme, et n'écrit une forme que si elle manque : il rend le premier terme de l'ordre du registre dont une écriture a cette forme, comme `find` aujourd'hui. L'index se reconstruit si `registre.termes.length` change. Une forme vide rend `undefined` comme avant.
  Motif : `termeReconnu` recalcule `formeReconnue` sur chaque écriture de chaque terme à chaque appel, et `segmentALaPosition` (`grammaire.ts`) l'appelle pour chaque position de chaque forme de chemin, pour chaque candidat de chaque variable lue. Que cette répétition domine le coût des M variables retenues reste à confirmer dans Figma (voir plus bas).
  Parité : un test garde l'ancienne implémentation (`termeReconnuDeReference`, le `find` actuel) et la compare, sur chaque registre de `REGISTRES` et `REGISTRES_ARCHITECTURE`, à chaque écriture de chaque terme, à ses variantes de casse et de séparateur, à des chaînes hors vocabulaire et à la chaîne vide. `formeReconnue` se compare à froid et à chaud, mémoire vidée entre les deux. Suites à relancer : `grammaireDesChemins`, `lexiqueReferentiel`, `normalisationReferentiel`, `nommageCalcul` et le reste du kit. `invariants/referentiel.md` demande `npm run vues` après une modification du référentiel : elle ne doit rien écrire.
  Preuve de gain sans seuil : un accesseur de test, `statistiquesDeReconnaissance()` (non réexporté par `index.ts`), rend `{ appels, calculs }`. La lecture de 600 tokens fabriqués par `tokensDuComposant` compte moins de `calculs` que d'`appels`, et une seconde lecture des mêmes chaînes ne compte aucun `calcul` de plus.
  Montée : kit d'un patch, avec CLI et adaptateur. Contrôles : kit, tests racine, vues. **Build Architect avec kit reconstruit.**
- [x] **4.0e | gpt-6-luna | medium** | **Claude Sonnet | medium** : dans `clesDesTokensDeTailleAttendus`, ne lire que les tokens FLOAT, et aucun quand le relevé n'a pas de valeur en dur.
  `clesDesTokensDeTailleAttendus` (`packages/kit/src/controles/corrections.ts`) rend `[]` avant tout appel à `tokensDuComposant` quand l'ensemble `proprietes` est vide : le filtre qui suit rendrait `[]` quel que soit le catalogue.
  Sinon elle appelle `tokensDuComposant(releve, catalogue, { types: ['FLOAT'] })`. Le paramètre optionnel écarte une variable dont le type n'est pas dans la liste avant tout calcul sur son nom. Un appel qui l'emploie ne passe pas par la mémoire de 4.0b, parce que son résultat est un sous-ensemble.
  Le résultat est le sous-ensemble FLOAT de l'appel sans filtre, dans le même ordre : chaque variable se lit indépendamment des autres, avec les mêmes axes.
  Cet appel se fait dans la phase `catalogue`, sur un catalogue d'avant chargement des valeurs (`analyse.ts`, `catalogueDeFigma`), que 4.0b ne peut pas partager avec les contrôles.
  Parité : la sortie ordonnée de `clesDesTokensDeTailleAttendus` égale celle de l'implémentation actuelle (copiée dans le test) sur les fixtures de `controles-c29-perimetre`, avec un mélange de variables COLOR, FLOAT et STRING, des variables `non-chargee`, un relevé sans valeur en dur et un relevé avec plusieurs propriétés.
  Preuve de gain sans seuil : un accesseur sur `type` et `nom` montre que `nom` n'est lu pour aucune variable COLOR ni STRING, et pour aucune variable quand le relevé n'a pas de valeur en dur (une lecture par variable avant).
  Cette case recoupe la lecture des tokens de 2.15 sans la remplacer : 2.15 borne chaque avancée de C29 dans les corrections, 4.0e allège la lecture faite avant les contrôles.
  Montée : kit d'un patch, avec CLI et adaptateur. Contrôles : kit, tests racine, Architect. **Build Architect avec kit reconstruit.**

#### Constat de la trace du 2026-10-26

Trace du Button (90 variants), build `01291be7`, mesurée par le mainteneur dans Figma desktop : 405,6 s au total, dont `controles` 298,9 s (46 tranches synchrones, 12 cessions), `catalogue` 45,9 s (417 appels API, 60,6 s d'attente cumulée), `moteur` 12,9 s et `projection` 43,3 s.
La seconde mesure `projection` n'enveloppe que la construction de la sortie, dont le seul calcul coûteux est `tokensDuComposant(releve, catalogueLu)` (`analyse.ts:431`) : un appel coûte environ 43 s dans ce sandbox.
La plus longue tranche synchrone dure 86,5 s, soit deux fois 43,3 s. `controlerLaStructure`, lancé en une tranche, appelle `tokensDuComposant` deux fois (`structure.ts:133` et `:203`). La coïncidence est cohérente avec l'hypothèse, sans la prouver avant 4.0a.
Appels pendant une analyse : Nommage (`nommage.ts:74`), Mapping (`mapping.ts:103`), Oublis (`oublis.ts:58`, seulement si la lecture est complète), Structure (deux appels, architecture UCM), projection (`analyse.ts:431`), et la phase `catalogue` (`clesDesTokensDeTailleAttendus`, `analyse.ts:274`) quand la library est lue. Les corrections ne l'appellent que pour certains constats (`corrections.ts:103`) ; leur phase dure 251 ms, donc elles ne l'ont pas appelé. Cela fait 5 à 6 appels hors catalogue en architecture UCM, 3 à 4 sinon.
Estimation défendable pour 4.0b seule, si chaque appel coûte 43 s et que la lecture est complète : elle retire 4 appels des contrôles et l'appel de projection, soit environ 216 s sur 405 s (53 %) en architecture UCM. Sans cette architecture, elle retire 2 appels de contrôle et la projection, soit environ 130 s (32 %). Le temps attendu sur ce Button passe alors de 405 s à 190-275 s.
4.0c, 4.0d et 4.0e réduisent le coût du calcul restant. La trace ne permet pas de chiffrer leur part, parce qu'elle ne sépare ni la passe sur les N variables du catalogue ni la lecture de grammaire des M variables retenues. La passe sur N fait deux appels à `formeReconnue` et une recherche de collection par variable. La lecture de grammaire répète `formeReconnue` sur le vocabulaire pour chaque position de chaque forme, et elle est relancée pour chaque segment d'un token non conforme. Le poids relatif de N et de M décide laquelle de 4.0c ou 4.0d rapporte le plus.
Limites : 43 s est une mesure unique sur un seul catalogue. Les 82 s restants des contrôles (299 moins 5 fois 43) ne sont pas attribués. `catalogue` et `moteur` ne bougent pas. L'écart avec les 142 s de la revue critique pour le même Button n'est pas expliqué ; un catalogue plus petit à l'époque rendrait la mesure actuelle propre à ce fichier.
La mesure Figma qui suit 4.0a doit trancher quatre points : la durée de chaque étape `controle-<nom>` (Structure près de 86 s, Nommage, Mapping et Oublis chacun d'au moins 43 s), N et M, `msTokensDeTailleCatalogue` (proche de 0 ou de 43 s), et le contrôle qui porte les 82 s restants. S'ils sont dans Accessibilité, Couches, Typographie ou Thème, la case 4.1 (index de `variableDuCatalogue`, appelé à chaque liaison) passe devant 2.11, sur décision du mainteneur. Après 4.0b, la durée de `controle-nommage` mesure le calcul unique ; comparée après 4.0c puis après 4.0d, elle donne la part de chacun.

#### Découpage du travail local de Codex

Le commit de référence `f0859af4` découpe `axesDuReleve` et `tokensDuComposant` en générateurs (`axesDuReleveParEtapes`, `tokensDuComposantParEtapes`) que Nommage, Mapping, Oublis, Structure et les corrections consomment.
Le correctif reprend ce découpage : la voie synchrone reste l'épuisement du générateur, et la mémoire de 4.0b se place dans la fonction que les deux voies partagent.
Il s'en écarte sur deux points. `f0859af4` ne partage aucune lecture entre contrôles : chacun relance son propre calcul, ce que 4.0b supprime. Son générateur cède avant chaque variable du catalogue, soit N cessions possibles pour un filtre qui ne coûte presque plus rien après 4.0c. 2.12 doit céder par variable retenue et toutes les 256 variables parcourues, pour que `calculerParEtapes` ne découpe pas en N / 32 tranches un parcours devenu bref.

### Cases du lot

- [ ] **4.1 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : indexer les variables du catalogue par clé puis nom, avec priorité et doublons inchangés ; test de collisions. Recoupe 4.0c, qui remplace seulement la recherche de collection de `tokensDuComposant` ; 4.1 indexe `variableDuCatalogue` pour les autres contrôles.
- [ ] **4.2 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : indexer collections et segments une seule fois par contenu immuable ; vérifier ordre et coût en opérations. Recoupe 4.0b et 4.0c, qui mémorisent les tokens du composant et construisent une table des rôles de collection dans `tokensDuComposant` ; 4.2 réemploie cette table au lieu d'en construire une seconde.
- [ ] **4.3 | gpt-6.1-sol | medium** | **Claude Sonnet | high** : remplacer les recherches typographiques par fréquences de groupe et champ hors contribution courante ; test absence, null et exclusions.
- [ ] **4.4 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : produire seulement le préfixe de 5 000 combinaisons de modes, dans l'ordre global ; test de croissance en espace.
- [ ] **4.5 | gpt-6.1-sol | high** | **Claude Sonnet | high** : établir la cardinalité au-delà des entiers exacts et sa représentation ; isoler toute correction visible avec test rouge. Si la représentation change une sortie publiée, s'arrêter et rendre la question au mainteneur : le format publié ne change pas.
- [ ] **4.6 | gpt-6.1-sol | medium** | **Claude Sonnet | high** : mémoriser la résolution d'alias par variable, contexte et profondeur restante ; comparer cycles, refus et diagnostics.
- [ ] **4.7 | gpt-6.1-sol | medium** | **Claude Sonnet | high** : mutualiser les faits de fond et visibilité dont les modes, ancêtres et opacités sont explicites ; tester deux contextes différents.
- [ ] **4.8 | gpt-6-luna | low** | **Claude Haiku | low** : vérifier les versions, changelogs et pins de 4.1 à 4.7 ; corriger un écart isolé et relancer le contrôle de version, sans publication.

Prérequis : 0 et 2. Nature : transformations à sortie identique.
Chemins : `packages/kit/src/controles/catalogue.ts`, `typographie.ts`,
`accessibilite.ts`, leur résolution d'alias et tests voisins.
Chaque commit qui touche le kit porte sa propre montée de version.

## Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : construire les index du catalogue une fois par
  contenu immuable. Respecter la priorité clé puis nom des variables et la
  première occurrence clé-ou-nom des collections. Préserver doublons, ordre et
  portée de recherche. Découper les segments une fois sans modifier les types
  publiés du catalogue ni conserver un index sur des tableaux modifiés.
- **Portée initiale répartie dans les cases ci-dessus** : remplacer les recherches d'autres sources par des
  fréquences par groupe et champ, contribution courante retirée. Garder
  `AUTRES_MINIMUM`, exclusions, identité des sources et distinction entre
  absence, `null` et valeur. Réutiliser le même calcul pour la future mise à jour
  par contribution.
- **Portée initiale répartie dans les cases ci-dessus** : produire paresseusement le préfixe des combinaisons
  de modes ; conserver la borne globale de 5 000 et son ordre entre variants.
  Calculer le reste sans produit cartésien matérialisé. Établir une cardinalité
  exacte au-delà de `Number.MAX_SAFE_INTEGER` et sa représentation de sortie
  avant modification ; préserver la sortie actuelle sur tout compte exact.
  Si un nouveau comportement visible est nécessaire au-delà, l'isoler comme
  correction documentée avec un test rouge, sans arrondi prétendu exact.
- **Portée initiale répartie dans les cases ci-dessus** : partager les résolutions par variable, contexte
  pertinent et profondeur restante. Garder cycles, refus et ordre de diagnostic.
  Mutualiser les faits de fond/visibilité dans l'accessibilité, en incluant
  modes, ancêtres et opacités dans le contexte. Différer une mutualisation dont
  les entrées ne sont pas encore explicitables.
- **Portée initiale répartie dans les cases ci-dessus** : après relecture des transformations, charger
  `publier-paquets` et appliquer la montée minimale du kit, son changelog et les
  pins exigés par `versionSuitLeContenu`. Exécuter les contrôles de version.
  La publication npm attend la clôture des lots.

Sortie : égalité profonde avec la référence, tests de croissance du nombre
d'opérations, espace proportionnel au préfixe retenu pour les modes.
Contrôles : kit, tests racine requis par ce paquet, puis Architect/exporteur.
**Build Architect avec kit reconstruit.** Aucun changement de format n'est prévu.
