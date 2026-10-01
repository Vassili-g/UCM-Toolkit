# Plan d'implémentation de l'explorateur de tokens

Ce plan transforme la [recherche](./RECHERCHE-EXPLORATEUR-TOKENS.md) et la
[maquette](./MAQUETTE-EXPLORATEUR-TOKENS.html) en tâches exécutables. Le
[suivi](./SUIVI-IMPLEMENTATION.md) porte l’état de son exécution. Ce plan porte
les choix d'implémentation proposés pour un futur lancement. Sa rédaction
ne signifie pas que le plugin est développé ou que sa publication est autorisée.

## 1. Consigne à l'agent chargé de l'exécution

À réception d'une demande d'exécuter ce plan, avancer dans l'ordre des lots.
Les choix par défaut ci-dessous suffisent pour développer et vérifier le
plugin localement. Ne pas demander au mainteneur de choisir une bibliothèque,
un nom de module ou un agencement déjà défini ici.

Lire [AGENTS.md](../../../../AGENTS.md),
[CONCEPT.md](../../../../CONCEPT.md) et
[CONTRIBUTING.md](../../../../CONTRIBUTING.md). Charger les skills
[`rediger-sans-tics-ia`](../../../../.agents/skills/rediger-sans-tics-ia/SKILL.md)
et [`rediger-diagnostics-ucm`](../../../../.agents/skills/rediger-diagnostics-ucm/SKILL.md)
avant les textes concernés. Les règles de travail du dépôt s'appliquent.

La recherche recommande un essai du marché avant l'investissement. Une demande
explicite d'implémenter ce plan tranche ce choix pour le développement local :
l'essai concurrentiel ne devient pas une approbation supplémentaire à obtenir.
Conserver ses résultats éventuels comme éléments d'évaluation du produit.

### Reprise et preuves

- [x] Relever `git status --short`, les instructions locales et les paquets
  présents. Préserver les modifications existantes ; ne pas les remettre à zéro.
- [x] Créer `SUIVI-IMPLEMENTATION.md` dans ce dossier. Y tenir le lot courant,
  la prochaine tâche, les fichiers concernés, les commandes et leurs résultats.
- [x] Cocher une tâche seulement lorsque son résultat et sa preuve existent.
  Un test non exécuté reste non vérifié ; une indisponibilité n'est pas un succès.
- [x] Après chaque lot, mettre à jour les cases de ce plan et le suivi sur disque.
  Le suivi contient l'état nécessaire à la reprise, sans récit de session.
- [x] Avant une interruption, écrire la prochaine commande utile et les limites
  restantes. Reprendre depuis ces fichiers sans refaire les lots validés.
- [x] Si un accès Figma manque, terminer les tâches locales indépendantes,
  laisser la recette Figma non cochée et livrer les moyens de la rejouer.

L'autonomie ne donne pas accès à un compte, ne contourne pas les permissions
de l'environnement et ne permet pas de déclarer une recette réelle réussie
depuis des doubles de test. Ne pas publier sur Figma Community ou npm, pousser
une branche ou modifier un fichier Figma réel sans autorisation correspondante.

## 2. Périmètre et décisions par défaut

| Sujet | Choix d'exécution |
|---|---|
| Nom du produit | UCM Token Explorer, provisoire, choisi à la demande du mainteneur ; le nom ne requiert aucune donnée UCM dans le fichier |
| Paquet | `packages/plugin-explorateur`, privé, nommé `ucm-explorateur-plugin` |
| Socle | TypeScript strict, DOM natif, esbuild et `ucm-plugin-socle`, selon les plugins voisins |
| Architecture des tokens | Collections, groupes et modes découverts ; aucun nom ni nombre de couches réservé |
| Identité | Identifiants Figma pour la navigation ; noms exacts pour l'affichage ; chemins normalisés réservés aux imports UCM |
| Écriture Figma | Aucune mutation du document, aucune importation de variable distante, aucun calque temporaire |
| Navigation Figma | Sélectionner un calque existant et centrer le viewport est permis à la demande du designer |
| Interface | Français, exclusivement sombre ; modes Light et Dark des données indépendants du thème de l'interface |
| Fenêtre | 1200 × 800 par défaut, minimum 560 × 480 ; taille bornée et préférence rangée via le socle |
| Réseau | Aucun accès réseau pour le socle ; imports locaux explicites pour les fichiers complémentaires |
| Préférences | Taille et réglages UI dans `clientStorage` ; aucune recette ni contrat copié dans le document |
| Contrats et Palettes | Intégrations facultatives, activées explicitement ; leur absence ne produit aucun avertissement |
| Bibliothèques distantes | Lecture de ce qui est accessible ; frontière explicite pour le reste ; ne pas inventer de valeur |
| Tests | Logique pure avec ports injectés ; interface réelle dans la galerie ; recette Figma séparée |
| Dépendances | Réutiliser les versions du dépôt. Éviter une bibliothèque de graphe tant que le graphe local n'est pas livré |

### Livraisons à distinguer

| Livraison | Lots | Résultat |
|---|---|---|
| Socle autonome | 0 à 7 | Plugin générique utilisable sans contrat, sans recette et sans profil UCM |
| Analyses et intégrations | 8 à 10 | Consommateurs, imports et lectures UCM facultatives |
| Exploration étendue | 11 | Graphe local, comparaison de relevés et simulation en mémoire |
| Livraison vérifiée | 12 | Documentation, contrôles du dépôt et bilan de recette |

Exécuter les lots 0 à 12 si la demande vise tout le plan. Un résultat du seul
socle doit être annoncé comme tel. Une capacité dépendante d'un accès externe
peut rester non vérifiée ; son absence doit figurer dans le bilan final.

## 3. Organisation cible

Les chemins ci-dessous sont à créer. Leur découpage peut évoluer si les mêmes
responsabilités et frontières restent couvertes par les tests.

```text
packages/plugin-explorateur/
  src/
    code.ts                    commandes et événements Figma
    messages.ts                protocole sandbox ↔ UI, demandes et révisions
    lecture.ts                 accès asynchrones Figma, sans mutation
    modele.ts                  relevé sérialisable et capacités des données
    indexation.ts              index d'identité et références inverses
    groupes.ts                 arbre depuis les noms Figma, sans normalisation
    resolution.ts              chaîne explicative dans un contexte de modes
    comparaison.ts             valeurs et premières divergences
    diagnostics.ts             constats génériques et portée de l'analyse
    consommateurs.ts           liaisons des calques et styles, périmètre borné
    copie.ts                   formats de copie et précision
    releves.ts                 format interne, import et comparaison de relevés
    simulation.ts              substitutions dans une copie en mémoire
    integrations/
      contrats.ts              imports UCM validés et occurrences situées
      palettes.ts              recette reconnue et associations explicites
      profilUcm.ts             emplois et règles activés par le designer
    ui/
      index.ts                 montage et état de navigation
      styles.css               thème sombre et mise en page
      arbre.ts                 collection, groupes, repli et focus
      table.ts                 lignes, modes et virtualisation
      inspecteur.ts            chaîne, provenance, copie et dépendants
      contextes.ts             modes par collection et comparaison
      messages.ts              listes de diagnostics et accès à leur cible
  galerie/                     états issus de l'interface réelle
  tests/                       logique pure, lois et interface Chromium
  scripts/                     build, manifest, tests et mesures
  README.md
  SPEC.md
  manifest.json
```

Le noyau `modele`, `groupes`, `indexation`, `resolution` et `comparaison` ne
dépend ni du DOM, ni de Figma, ni d'UCM. Le sandbox adapte les données Figma.
L'UI reçoit des objets sérialisables et n'interroge pas directement Figma.

## 4. Lots d'implémentation

### Lot 0 : état des lieux et conventions

Prérequis : aucun. Sortie : périmètre écrit et commandes de validation connues.

- [x] Lire la recherche et ouvrir la maquette ; relever les comportements
  attendus, sans transformer son script de démonstration en moteur de production.
- [x] Examiner les builds, manifests, messages, galeries et lois du socle.
  Repérer les listes fermées aux deux plugins dans les tests, scripts et CI.
- [x] Lire les typings Figma installés puis la documentation officielle pour
  les méthodes utilisées. Relever les types réellement accessibles, les
  méthodes asynchrones, les événements et les restrictions de bibliothèques.
- [x] Créer `SPEC.md` dans le nouveau paquet : exigences génériques, lecture
  seule, portée des données, états de résolution et intégrations facultatives.
- [x] Préparer les fixtures en code : noms libres, collection unique, plusieurs
  axes, chaînes et booléens, nombre zéro, groupes profonds, homonymes, cycle,
  cible inaccessible et listes de grande taille.
- [x] Documenter les limites de l'API constatées dans le suivi, avec une source
  précise. Une limitation réduit la donnée inspectable, jamais le caractère
  générique de l'architecture acceptée.

Preuve : fixtures et spécification présentes ; chaque limite a un comportement
prévu ; aucune dépendance à une recette ou à un contrat dans le noyau.

### Lot 1 : paquet, build et fenêtre

Prérequis : lot 0. Sortie : plugin chargeable et galerie initiale.

- [x] Créer le workspace, sa configuration TypeScript et ses scripts sur le
  modèle des plugins existants. Déclarer les dépendances locales avec les
  conventions du monorepo, sans importer les sources d'un autre plugin.
- [x] Brancher les utilitaires `inline-ui`, manifest, fenêtre et tests du socle.
  Produire `dist/code.js`, `dist/ui.html` autonome et le manifest de distribution.
- [x] Préparer un manifest de développement avec `documentAccess: dynamic-page`
  et les permissions minimales compatibles avec les lectures retenues. Ne pas
  copier l'identifiant d'un plugin existant ni inventer un identifiant publié.
- [x] Si Figma exige un identifiant attribué pour l'import local, documenter
  l'étape de création et maintenir la distribution locale prête à le recevoir.
- [x] Étendre le build racine, les contrôles de séparation des plugins et la CI
  au troisième paquet. Conserver les contrôles des deux plugins existants.
- [x] Ajouter les scripts `test`, `typecheck`, `build`, `galerie`,
  `galerie:captures`, `test:ui` et `mesure` du nouveau workspace.
- [x] Monter une fenêtre sombre, redimensionnable, avec état initial sans
  données et lancement de lecture. Tester les bornes 560 × 480 et 1200 × 800.
- [x] Définir les rôles de couleur sombres au niveau du plugin, même si Figma
  ou le système fournit un thème clair. Réutiliser les composants du socle.

Preuve : build et typecheck du paquet verts ; galerie ouvrable ; aucune requête
réseau nécessaire ; les styles ne dépendent pas du thème clair de l'hôte.

### Lot 2 : relevé Figma et frontière de messages

Prérequis : lot 1. Sortie : données lisibles et identité stable.

- [x] Définir le relevé avec révision, source, périmètre, collections, modes,
  défauts, variables, valeurs typées, provenance, capacités et erreurs de lecture.
- [x] Conserver séparément identifiant, clé publiée si accessible, nom Figma,
  description, portée, syntaxe de code et statut local ou distant.
- [x] Charger collections et variables locales par les API asynchrones.
  Mémoriser les lectures par identifiant pendant une analyse et limiter la
  concurrence des lectures distantes à huit demandes.
- [x] Résoudre à la demande les identifiants référencés disponibles. Conserver
  une cible inaccessible comme telle, avec l'erreur de lecture située.
- [x] Ajouter un identifiant de demande et une révision à chaque réponse.
  Ignorer les résultats d'une ancienne demande après changement de sujet.
- [x] Prévoir progression, annulation logique et bouton Actualiser. Une
  annulation ne doit pas publier de résultat partiel comme analyse terminée.
- [x] Invalider les données concernées sur les événements réellement exposés
  par Figma. Pour les changements non signalés, garder l'actualisation explicite.
- [x] Afficher le périmètre et la fraîcheur du relevé. Après erreur, distinguer
  une donnée précédente encore affichée d'une lecture actuelle réussie.
- [x] Ajouter une loi de non-mutation : ports en lecture seule et doubles Figma
  qui échouent à tout setter, création, import de variable ou écriture de données.

Preuve : cible distante indisponible, annulation et réponses désordonnées
testées ; aucun appel de mutation ; aucune dépendance au nom des collections.

### Lot 3 : arbre des collections et navigation

Prérequis : lot 2. Sortie : navigation native par groupes arbitraires.

- [x] Construire les groupes uniquement depuis les segments `/` du nom Figma.
  Conserver accents, points, espaces et casse. Définir les cas de segment vide
  sans collision de clés, en gardant le nom source inspectable.
- [x] Identifier un groupe par la collection et la liste de ses segments,
  jamais par une concaténation ambiguë. Les homonymes restent distincts.
- [x] Afficher le compteur récursif de chaque groupe. Le clic sur une collection
  montre toutes ses variables ; le clic sur un groupe inclut ses descendants.
- [x] Séparer le bouton de repli du bouton de sélection. Replier un parent
  conserve le filtre actif et le chemin visible au-dessus de la table.
- [x] Prévoir navigation clavier, focus visible, état développé et sélection
  annoncée. Employer une navigation à boutons accessibles ou implémenter tous
  les raccourcis attendus si `role="tree"` est choisi.
- [x] Suivre un alias en ouvrant sa collection et ses ancêtres, puis centrer
  sa ligne. Retour restaure groupe, sélection, recherche et position de table.
- [x] Ajouter recherche globale et filtres de type, valeur, provenance et nature
  directe ou référencée. Annoncer la portée globale quand elle dépasse le groupe.
- [x] Prévoir états vide, résultat absent, nom long et collection sans groupe.

Preuve : parent, enfant, repli, retour et homonymes contrôlés dans Chromium ;
un point dans un nom ne crée pas de groupe ; aucun filtre ne dépend d'UCM.

### Lot 4 : résolution et contextes de modes

Prérequis : lot 2. Sortie : chaîne explicative fiable pour chaque contexte.

- [x] Définir un résultat discriminé : résolu, cible inaccessible, mode absent,
  cycle, type incompatible, valeur non prise en charge ou analyse interrompue.
  Chaque échec porte le préfixe connu de la chaîne et l'étape concernée.
- [x] Conserver à chaque étape variable, collection, mode retenu, provenance
  du choix de mode et valeur source. La valeur terminale reste typée.
- [x] Construire le contexte comme une table collection–mode. Employer le
  `defaultModeId` déclaré lorsque le contexte simulé ne choisit rien ; ne pas
  prendre arbitrairement la première colonne et ne pas rapprocher les modes
  de collections différentes par leur nom.
- [x] Pour un calque réel, lire les modes effectifs et distinguer un choix
  explicite d'un héritage lorsque l'API le permet. Comparer le résultat avec
  `resolveForConsumer` sur ce calque, sans créer de consommateur temporaire.
- [x] Résoudre les alias par parcours itératif. Détecter les cycles sur les
  couples variable–mode du chemin courant. Une cible partagée par plusieurs
  branches ne constitue pas un cycle.
- [x] Préserver zéro, `false`, chaîne vide, alpha et précision des composantes.
  Refuser les coercitions entre types ; distinguer un champ absent d'une valeur
  valide considérée à tort comme vide.
- [x] Décrire les valeurs composées et les alias avec opacité effectivement
  exposés par les typings. Pour un cas non implémenté, garder la source
  inspectable et rendre un statut explicite, sans valeur terminale inventée.
- [x] Lire les collections étendues et leurs surcharges si l'API les expose.
  Sinon, signaler la résolution incomplète ; ne pas les aplatir silencieusement.
- [x] Mémoriser les résolutions par révision et contexte pertinent. Invalider
  les dépendants lorsqu'une cible change. Éviter le produit de tous les modes.
- [x] Ajouter une borne de 10 000 étapes par résolution et un résultat
  interrompu explicite au-delà. Cette borne protège le parcours sans qualifier
  de cyclique une chaîne simplement longue.

Preuve : chaîne traversant cinq collections, défaut hors première colonne,
deux axes indépendants, cycle actif dans un seul mode, références partagées,
alpha et valeurs vides testés. Comparaison à Figma réservée à la recette réelle.

### Lot 5 : table, inspecteur, survol et copie

Prérequis : lots 3 et 4. Sortie : parcours quotidien sans UCM.

- [x] Afficher nom source, type, alias direct ou valeur enregistrée et résultat
  résolu. Le nom ouvre l'inspecteur ; la référence suit uniquement l'alias direct.
- [x] Afficher les modes de la collection en colonnes, avec un contexte choisi
  pour les autres collections traversées. Pour de nombreux modes, garder un
  défilement horizontal local et les noms de ligne lisibles.
- [x] Offrir une vue compacte du seul contexte actif. Ne pas confondre une
  colonne de mode locale avec un contexte global de toutes les collections.
- [x] Au survol et au focus clavier, afficher toute la chaîne connue ; prévoir
  un délai de 250 ms, fermeture par Échap et panneau épinglé accessible au clic.
- [x] Afficher provenance, modes et limites dans l'inspecteur. Conserver le
  token inspecté lors d'un changement de contexte ; invalider son ancien résultat.
- [x] Séparer copie du nom source, valeur terminale, chaîne, donnée source et
  référence publiée lorsqu'un mapping vérifié existe. Un projet générique ne
  reçoit pas une référence DTCG inventée depuis son nom Figma.
- [x] Copier les nombres sans unité supposée, les booléens textuels et la chaîne
  vide sans les transformer. Pour les couleurs, proposer source précise et
  représentation hexadécimale ; annoncer conversion ou arrondi éventuel.
- [x] Désactiver seulement les copies impossibles. Une chaîne interrompue peut
  être copiée comme constat, sans être présentée comme valeur résolue.
- [x] Gérer un refus du presse-papiers avec une zone de texte sélectionnable.
  Annoncer un succès uniquement après réussite effective de la copie.
- [x] Utiliser `textContent` pour les noms et descriptions externes ; valider
  les valeurs avant de les employer dans une propriété CSS.

Preuve : parcours au clavier et pointeur, chaîne épinglée, copie exacte de
`0`, `false` et chaîne vide, échec du presse-papiers et nom contenant du HTML.

### Lot 6 : comparaison et diagnostics génériques

Prérequis : lots 4 et 5. Sortie : explication des écarts et des échecs.

- [x] Construire deux contextes indépendants à partir des collections découvertes.
  Comparer le même token, sans modifier ses valeurs ni le mode des calques.
- [x] Distinguer première cible différente, même cible dans un autre mode et
  valeur terminale différente sans changement de chaîne. Signaler aussi des
  chaînes différentes qui aboutissent à la même valeur.
- [x] Indexer les références inverses par mode. Distinguer les dépendants du
  contexte courant de ceux trouvés dans l'ensemble des modes chargés.
- [x] Regrouper les cycles par ensemble concerné pour éviter un message par
  point de départ. Conserver l'accès à chaque chemin utile au diagnostic.
- [x] Produire des constats situés pour cible inaccessible, type incompatible,
  mode absent et valeur non prise en charge. Une restriction d'accès ne prouve
  ni suppression ni rupture dans tous les contextes.
- [x] Relier chaque constat à sa variable, son groupe et son contexte. Donner
  une action réalisable : inspecter la cible, vérifier l'accès ou corriger dans
  Figma. Aucune réparation automatique.
- [x] Ajouter un filtre des seules variables concernées. Afficher séparément
  problèmes établis, analyse partielle et limites du périmètre.
- [x] Exporter un rapport texte et JSON versionné : contexte, révision, portée,
  chaîne et constat. Le rapport n'est ni un contrat UCM ni un export de tokens
  aplatis destiné à remplacer les références originales.

Preuve : comparer deux densités d'une même valeur directe montre l'écart ; un
cycle produit un constat groupé ; tous les liens rejoignent la bonne cible.

### Lot 7 : galerie, volume et première recette autonome

Prérequis : lots 1 à 6. Sortie : socle local vérifié.

- [x] Construire la galerie avec les outils du socle et l'interface compilée.
  Chaque état de message a une entrée atteignable, sans reproduction HTML séparée.
- [x] Ajouter les états : chargement, vide, lecture refusée, arbre profond,
  recherche vide, chaîne longue, cycle, cible distante, comparaison partielle,
  annulation, relevé périmé et types autres que couleur.
- [x] Vérifier les états aux deux tailles de fenêtre, sous hôte clair et sombre.
  Capturer et relire les écrans ; aucune commande hors d'accès,
  aucun panneau fixé ne masque un champ ou une fin de liste.
- [x] Virtualiser les grandes listes et les branches volumineuses de l'arbre.
  Conserver focus, position et accès à une cible hors de la portion rendue.
- [x] Générer 10 000 variables réparties sur 20 collections et quatre modes,
  avec groupes profonds et chaînes partagées. Mesurer sur dix répétitions après
  échauffement : indexation, recherche, résolution, rendu et mémoire disponible.
- [x] Viser 200 ms pour une recherche et 100 ms pour une résolution mémorisée,
  hors transport Figma. Ce sont des budgets de travail à mesurer, pas des
  promesses de performance universelles ni des seuils chronométrés de CI.
- [x] Tester de façon déterministe que l'UI ne monte pas toutes les lignes,
  que les lectures par identifiant sont mutualisées et que l'annulation rend
  le contrôle avant la fin d'un grand parcours.
- [x] Exécuter les commandes du paquet et les contrôles racine après intégration.
  Rédiger un premier bilan séparant preuves locales et recette Figma restante.

Preuve : aucun scénario du socle ne charge un contrat, une recette ou un profil
UCM ; les captures et mesures sont accessibles depuis le suivi.

### Lot 8 : consommateurs dans Figma et contrastes

Prérequis : lot 7. Sortie : usages réels sans contrat requis.

- [x] Proposer trois périmètres explicites : sélection, page courante et document.
  Commencer par la sélection ; charger les autres pages seulement à la demande.
- [x] Lire les liaisons accessibles des propriétés, peintures, effets, styles
  et segments de texte. Déclarer les propriétés non inspectées ; ne pas prétendre
  couvrir tout Figma à partir du seul `boundVariables` d'un calque.
- [x] Enregistrer chaque occurrence avec page, calque ou style, propriété,
  variable directe, contexte effectif et dépendances transitives pertinentes.
- [x] Distinguer nombre de consommateurs et nombre d'occurrences de propriété.
  Ne pas compter plusieurs fois une instance par plusieurs chemins de parcours.
- [x] Ajouter « Afficher dans Figma » pour une occurrence de calque accessible.
  Vérifier son existence avant navigation et gérer sa suppression depuis l'analyse.
- [x] Gérer sélection multiple, modes hérités et valeurs mixtes sans produire
  un contexte unique fictif. L'inspecteur précise le consommateur choisi.
- [x] Afficher « Aucun trouvé dans le périmètre analysé » avec le périmètre.
  Ne jamais proposer de suppression sur la seule absence de consommateurs.
- [x] Ajouter la comparaison de contraste d'une paire explicitement choisie,
  avec fond connu, contexte et seuil. Réutiliser le calcul du kit ; l'emploi de
  cette fonction pure ne rend pas le projet dépendant d'un profil UCM.
- [x] Limiter le premier calcul aux couleurs opaques sRGB. Transparence, fond
  indéterminé et gamut non pris en charge restent non jugés avec leur raison.
- [x] Annuler les scans longs, afficher leur avancement et invalider le résultat
  quand le périmètre ou ses liaisons changent.

Preuve : occurrences directes et transitives, texte mixte, style partagé,
calque supprimé, contraste connu et scan annulé testés ; aucune mutation.

### Lot 9 : imports de contrats et tokens facultatifs

Prérequis : lot 7. Sortie : lien vérifié entre données publiées et variables.

- [x] Lire [FORMAT.md](../../../format/FORMAT.md),
  [CHANGELOG-FORMAT.md](../../../format/CHANGELOG-FORMAT.md) et les lecteurs
  concernés avant toute adaptation. Ne pas modifier le format publié pour
  ajouter des identifiants Figma utiles uniquement à cet explorateur.
- [x] Ajouter l'import explicite de contrats et de `tokens.json`. Garder les
  données en mémoire, avec nom de fichier, version et état de validation.
  L'absence d'import ne modifie pas l'état du socle.
- [x] Appliquer une borne initiale de 20 Mo par fichier et 50 Mo par ensemble,
  avec refus lisible. Valider la structure avant le parcours ; les dépassements
  ou erreurs ne doivent pas effacer l'ensemble précédent encore valide.
- [ ] Réutiliser validation de version, schéma et sémantique des lecteurs.
  Extraire si nécessaire leurs fonctions pures dans une porte du kit utilisable
  en navigateur, avec injection du schéma ; conserver les exports Node existants.
- [x] Vérifier le bundle pour exclure `node:fs` et toute dépendance Node de
  l'UI ou du sandbox. Ne pas importer globalement `@ucm-kit/core/lecteurs`.
- [x] Générer les fixtures de contrats en code selon les règles du dépôt.
  Couvrir les versions encore lues et refuser celles hors plage.
- [x] Relever les références normatives avec leur adresse, composant, variant,
  vue exacte et propriété. Exclure `samples` et `meta` ; un simple ensemble de
  références uniques ne suffit pas pour situer une occurrence.
- [x] Réutiliser les projections de nom du kit et la construction du chemin
  de l'exporteur. Si une extraction commune est nécessaire, tester l'identité
  des résultats avant et après ; aucun import direct entre plugins.
- [x] Classer chaque rapprochement comme unique, absent ou ambigu. Ne pas
  relier un contrat à une variable sur la seule égalité d'une couleur.
- [x] Comparer Figma à l'import : présence, nom, alias, type, mode et valeur.
  Distinguer correspondance structurelle des contextes et valeurs résolues.
  Ne pas attribuer la divergence à Figma sans connaître la fraîcheur de l'import.
- [x] Afficher les occurrences de contrat séparément des calques Figma. Un
  composant déclaré n'est pas une preuve qu'un calque est présent dans ce fichier.

Preuve : import valide, rejet atomique, version refusée, collision de chemins,
référence dans un échantillon et comparaison par mode couverts par les tests.

### Lot 10 : Palettes et profil d'architecture UCM facultatifs

Prérequis : lots 8 et 9. Sortie : fonctions UCM activables indépendamment.

- [x] Réexaminer les modules du kit et de `ucm-couleur` ; les lots multimarques
  peuvent avoir évolué depuis la recherche. Réutiliser l'état présent du code,
  sans présumer qu'une case d'un ancien plan correspond à une fonction livrée.
- [x] Ajouter des activations distinctes pour la lecture Palettes et le profil
  d'architecture UCM. Aucun nom de collection ne déclenche ces lectures seul.
- [x] Pour Palettes, lire uniquement les clés partagées reconnues et valider la
  recette avec son moteur. Refuser les versions non prises en charge sans les
  migrer ni réécrire le document.
- [x] Extraire les constantes de protocole partagées dans un module commun
  adapté si elles doivent être consommées par deux plugins. Ne pas importer
  `plugin-palettes/src/lecture.ts` depuis le nouveau paquet.
- [x] Présenter palette, intensité, thème et cran lorsque la correspondance est
  établie. Si la recette ne porte pas l'affectation aux variables, proposer une
  association explicite en mémoire avec validation des types et du périmètre.
- [x] Distinguer rôle affecté, emploi et propriété réellement peinte. Afficher
  la source de chaque information ; aucune déduction depuis une teinte ou
  l'égalité fortuite de deux couleurs.
- [x] Lire emplois, rangs, supports et paires dans `@ucm-kit/core/emplois`.
  Couvrir quatre rangs, focus et usages propres au neutre, sans recopier les tables.
- [x] Définir le profil UCM par une association explicite des collections et
  des couches. Le designer peut conserver des noms différents des exemples.
- [x] Ajouter les contrôles dont les données prouvent le fait : cible attendue,
  saut de couche, portée et emploi. Pour le fond d'un premier plan, réutiliser
  une règle d'autorité existante ; à défaut, demander une paire explicite dans
  l'interface et ne pas inventer un fond depuis le nom du calque.
- [x] Relier les constats à leur référence, leur contexte et leur règle.
  Prévoir des exceptions explicites au profil dans le réglage local ; ne pas
  considérer une autre architecture comme fautive.
- [x] Vérifier que désactiver une intégration supprime ses constats sans vider
  les variables ni changer la navigation générique.

Preuve : recette absente, illisible et incompatible ; profil désactivé ; noms
personnalisés ; association ambiguë ; rang `active-hover` ; propriété hors
support et paire non jugée. Les fonctions génériques restent accessibles.

### Lot 11 : graphe local, relevés et simulation

Prérequis : lots 6 à 10. Sortie : exploration étendue en lecture seule.

- [x] Créer un graphe SVG centré sur le token choisi, avec ancêtres et dépendants.
  Le moteur est celui de la table ; aucun second résolveur dans la vue graphique.
- [x] Déployer les branches à la demande, limiter le premier affichage à
  200 nœuds et annoncer ce qui reste masqué. Prévoir zoom, recentrage et une
  liste textuelle navigable équivalente pour l'accès au clavier.
- [x] Exporter puis importer le relevé interne versionné. Conserver références,
  contextes, provenance et couverture ; valider l'import comme au lot 9.
- [x] Comparer deux relevés par identités compatibles. En absence d'identité
  commune, proposer une correspondance explicite ou afficher « non rapproché ».
  Un renommage ne doit pas devenir artificiellement suppression et création.
- [x] Simuler une substitution de valeur ou de cible sur une copie du graphe.
  Refuser type incompatible et cycle introduit ; montrer valeurs et dépendants
  potentiellement touchés dans le périmètre chargé.
- [x] Marquer visiblement l'état simulé. Réinitialiser la simulation sans modifier
  le relevé original, Figma, les fichiers importés ou le presse-papiers.
- [x] Ajouter les écrans, la couverture des messages et les tests de chaque geste.

Preuve : graphe et table donnent le même résultat ; import–export conserve les
références ; simulation annulée restitue exactement le relevé original.

### Lot 12 : livraison et recette Figma

Prérequis : lots livrés. Sortie : paquet local, documentation et bilan exact.

- [x] Mettre à jour la carte du code et les invariants d'AGENTS.md pour le
  troisième plugin. Préserver la distinction entre règles produit et règles
  de travail ; adapter la loi de séparation à toutes les paires de plugins.
- [x] Compléter README du paquet, sommaire documentaire et roadmap : installation
  locale, navigation, imports, lecture seule et limites réellement présentes.
- [x] Documenter les commandes disponibles et les reprises après un échec.
  Ajouter le lien vers le bilan dans `SUIVI-IMPLEMENTATION.md`.
- [x] Exécuter les vérifications du tableau ci-dessous, avec résultat explicite
  pour chaque commande. Corriger les régressions causées par le développement.
- [ ] Importer le manifest de distribution dans Figma lorsque l'accès le permet.
  Employer un fichier de recette dédié déjà autorisé ; aucune modification
  d'un fichier métier pour préparer les cas de test.
- [ ] Rejouer les cas réels : chaîne locale, modes hérités, changement de
  sélection, référence distante accessible puis inaccessible, groupe profond,
  collection étendue si disponible et navigation vers un calque existant.
- [ ] Comparer les résultats du résolveur avec `resolveForConsumer` pour les
  calques de recette. Consigner chaque divergence avec contexte et source.
- [ ] Vérifier l'absence de mutation du document pendant lecture, navigation,
  comparaison, copie et simulation. Distinguer les changements de sélection
  ou viewport des changements de contenu.
- [x] Rendre le bilan : livré, vérifié automatiquement, vérifié dans Figma,
  non vérifié, limites et tâches restantes. Ne pas cocher la recette réelle
  si seul le double Figma a été exécuté.

Preuve : chaque fonction annoncée est rattachée à un test ou à un résultat de
recette. Aucune publication externe ne fait partie de la fin automatique du plan.

## 5. Matrice de validation obligatoire

Les suites du paquet doivent couvrir ces cas. Les cases concernent la
vérification de l'implémentation, pas l'existence de cette matrice.

| Fait à prouver | Jeu ou geste | Preuve attendue |
|---|---|---|
| Architecture libre | Une collection nommée librement, valeurs directes et alias internes | Navigation, copie et résolution accessibles |
| Plusieurs axes | Apparence, densité et langue dans trois collections | Chaque résolution conserve le bon mode par collection |
| Aucun UCM | Fichier sans recette, sans contrat et avec un groupe nommé `usage` | Aucun contrôle UCM activé, aucune alerte d'absence |
| Groupe parent | `card`, `card/header` et un voisin `cardinal` | Le parent contient ses descendants et exclut le voisin |
| Identités distinctes | Deux collections homonymes, deux groupes homonymes | Sélection et résultats séparés par identifiant |
| Retour | Filtre enfant, défilement, navigation d'alias, retour | Filtre et position restaurés |
| Modes locaux | Colonnes de modes avec cible dans une autre collection | Valeurs accompagnées du contexte externe utilisé |
| Valeurs particulières | Zéro, booléen faux, chaîne vide, alpha non opaque | Copie et affichage exacts, aucune valeur omise |
| Cycle contextualisé | Même variable cyclique dans un mode et résolue dans un autre | Diagnostic limité au contexte concerné |
| Chaîne partagée | Deux alias atteignent la même primitive | Aucun faux cycle, lectures mutualisées |
| Distante inaccessible | Lecture refusée ou identifiant non retourné | Préfixe connu visible, aucune suppression affirmée |
| Comparaison | Même chaîne, valeurs différentes ; chaînes différentes, même valeur | Les deux formes d'écart sont distinguées |
| Réponse périmée | Changer de sélection avant la fin du chargement | L'ancienne réponse ne remplace pas le nouveau sujet |
| Grand relevé | 10 000 variables et groupe à forte cardinalité | Rendu borné, annulation effective, mesures consignées |
| Thème fixe | Hôte clair, puis sombre ; tokens Jour, puis Nuit | Surfaces de l'UI sombres dans tous les cas |
| Entrées externes | Nom contenant balises, JSON malformé, import trop grand | Texte inerte, refus situé et données précédentes conservées |
| Contrat facultatif | Même fichier avant import puis après retrait | Le socle reste identique et les occurrences contractuelles disparaissent |
| Mutation | Espions sur setters, imports, créations et données partagées | Aucun appel pendant tous les gestes de lecture |
| Simulation | Remplacement valide, cycle proposé, annulation | Original inchangé, cycle refusé, état simulé annoncé |

- [x] Rattacher chaque ligne à un test nommé dans le suivi.
- [x] Séparer les fixtures artificielles des captures d'un fichier Figma réel.
- [x] Relire manuellement les captures du plugin compilé à la taille minimale.
- [x] Vérifier l'accès au clavier à la recherche, à l'arbre, à la table, à la
  comparaison, au panneau épinglé et aux actions de copie.

## 6. Commandes et preuves à conserver

Exécuter depuis la racine du dépôt. Les scripts du nouveau workspace sont à
créer au lot 1 ; ne pas annoncer leur disponibilité avant ce lot.

```sh
npm run test --workspace ucm-explorateur-plugin
npm run typecheck --workspace ucm-explorateur-plugin
npm run build --workspace ucm-explorateur-plugin
npm run test:ui --workspace ucm-explorateur-plugin
npm run galerie:captures --workspace ucm-explorateur-plugin
npm run mesure --workspace ucm-explorateur-plugin
```

Après intégration, appliquer les contrôles du dépôt et ceux des interfaces
existantes quand le socle partagé a changé :

```sh
npm test
npm run typecheck
npm run build
npm run test:ui --workspace ucm-exporter-plugin
npm run test:ui --workspace ucm-palettes-plugin
npx tsx --test tests/docLinks.test.ts
git diff --check
```

Pour chaque document modifié, lancer le contrôle de style sur son chemin.
Exemple pour ce plan :

```sh
node scripts/controle-style.mjs "docs/notes/Recherches/Plugin Explorateur Tokens/PLAN-IMPLEMENTATION.md"
```

Le suivi nomme les commandes exécutées, leur résultat et les fichiers de
captures ou mesures. Un échec déjà présent dans le workspace doit être établi
avant d'être qualifié de préexistant ; ne pas le masquer par une suppression
de test. Une erreur de permission se traite selon les règles de l'environnement.

## 7. Réponses prévues aux difficultés

| Situation | Action autonome |
|---|---|
| API absente des typings installés | Vérifier la documentation officielle et l'usage réel ; mettre à jour la dépendance seulement si nécessaire, puis contrôler les autres plugins |
| Valeur ou bibliothèque impossible à lire | Afficher la limite sur la cible concernée et continuer sur les données accessibles |
| Accès à Figma indisponible | Terminer build, tests, galerie et documentation ; laisser les cases de recette réelle ouvertes |
| Identifiant de plugin non attribué | Préparer la distribution et la procédure d'attribution ; ne pas réutiliser celui d'un autre plugin |
| Association palette–variable absente | Fournir l'association explicite prévue au lot 10 ; conserver le socle utilisable |
| Lecteur UCM dépendant de Node | Extraire et tester la fonction pure avec injection des ressources ; conserver l'API Node existante |
| Échec de lecture pendant un scan | Rendre le périmètre partiel et les éléments non lus ; ne pas conclure à l'absence de consommateurs |
| Performance insuffisante | Mesurer la phase responsable, corriger et rejouer les mêmes données ; conserver les objectifs et le résultat réel dans le suivi |
| Contradiction entre maquette et ce plan | Appliquer ce plan ; corriger la maquette et la documentation concernées |
| Contradiction avec une instruction ultérieure du mainteneur | Appliquer l'instruction la plus récente et actualiser le plan avant de poursuivre le lot concerné |

Les choix ergonomiques non spécifiés se résolvent à partir de la maquette et
des règles d'interface du dépôt. Les questions d'accès, de permissions ou de
publication restent des limites réelles de l'autonomie.

## 8. Sources de travail

| Source | Usage |
|---|---|
| [Recherche](./RECHERCHE-EXPLORATEUR-TOKENS.md) | Besoin, concurrence et état des intégrations |
| [Maquette](./MAQUETTE-EXPLORATEUR-TOKENS.html) | Parcours et hiérarchie visuelle, données fictives |
| [Socle des plugins](../../../../packages/plugin-socle/README.md) | Composants, build et galerie |
| [Séparation des plugins](../../../../tests/pluginsSepares.test.ts) | Loi à étendre au troisième plugin |
| [Variables Figma](https://developers.figma.com/docs/plugins/api/figma-variables/) | Lectures asynchrones, identifiants et collections |
| [Résolution pour un consommateur](https://developers.figma.com/docs/plugins/api/properties/Variable-resolveforconsumer/) | Valeur effective d'un calque selon les modes traversés |
| [Bibliothèques Figma](https://developers.figma.com/docs/plugins/api/figma-teamlibrary/) | Métadonnées de bibliothèques accessibles, sans garantie de toutes les valeurs |
| [Format UCM](../../../format/FORMAT.md) | Contrats, tokens et projections publiées |
| [Historique du format](../../../format/CHANGELOG-FORMAT.md) | Compatibilité à préserver pendant l'extraction des lecteurs |

## 9. Conditions de fin

- [x] Les lots demandés sont implémentés ; les fonctions absentes sont nommées
  explicitement et leurs cases restent ouvertes.
- [x] Le socle fonctionne seul sur plusieurs architectures sans données UCM.
- [x] L'arbre, la chaîne au survol, l'alias direct, la copie, les contextes et
  l'interface sombre sont vérifiés sur le plugin compilé.
- [x] Les intégrations sont désactivables sans perturber le socle.
- [x] Les tests de lecture seule couvrent tous les gestes, simulation comprise.
- [x] Les contrôles locaux requis passent ; les limites externes sont séparées
  des échecs de code et de la recette Figma réellement exécutée.
- [x] Le README indique comment charger la distribution et reproduire les essais.
- [x] Le suivi permet à un autre agent de retrouver les preuves et les tâches
  restantes sans dépendre de l'historique de conversation.
