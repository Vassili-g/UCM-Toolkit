# UCM Palettes : plan d’internationalisation de l’interface

## Résultat attendu

UCM Palettes s’ouvre en anglais par défaut. Le panneau de configuration propose
une liste déroulante pour choisir l’anglais ou le français. Le choix prend effet
immédiatement et se conserve aux ouvertures suivantes. Ajouter une langue demande
un catalogue de traductions et une entrée dans le registre des langues.

Ce plan décrit le travail à réaliser par un agent autonome. Les cases sont à
cocher après vérification du résultat indiqué. Il ne vaut pas constat
d’implémentation.

## Périmètre et décisions

| Sujet | Comportement à implémenter |
|---|---|
| Première ouverture | Anglais, même si Figma, le navigateur ou le système est en français |
| Choix proposé | `English` et `Français`, toujours écrits dans leur propre langue |
| Placement | Un champ de préférence du plugin en tête de configuration, avant les réglages de la recette ; accessible aussi sans recette exploitable |
| Persistance | Préférence personnelle dans `figma.clientStorage`, sous une clé propre à Palettes ; aucune écriture dans le document |
| Valeur absente ou inconnue | Repli sur `en` ; aucune détection automatique de langue |
| Changement | Traduction immédiate de tout le contenu affiché, y compris les erreurs et résultats déjà présents |
| Données | Recette, rapport JSON, identifiants, codes d’emploi, noms saisis et chemins de tokens inchangés |
| Planches Figma | Textes des cadres générés conservés dans leur langue actuelle ; leur traduction est hors de ce chantier d’interface |
| Autres produits | Interface d’UCM Exporter inchangée ; adaptations du socle limitées à l’injection de libellés |

L’interface comprend les infobulles, noms accessibles, annonces, options,
confirmations, messages de chargement, erreurs, exemples et spécimens de
l’interface de test. Les textes de l’onglet Planches sont inclus. Les textes
inscrits dans les cadres du document sont une sortie distincte.

La remise à zéro de la recette et l’import d’un fichier conservent la langue.
Un changement de langue ne lance aucun rangement de recette, dessin ou retrait
de cadre. Il ne modifie ni les couleurs calculées ni les empreintes.

## Lectures avant intervention

- [Guide agent](../../../../../AGENTS.md), groupes propres à Palettes et à son interface.
- [Contribution](../../../../../CONTRIBUTING.md), interface, rédaction et tests.
- [Spécification Palettes](../1 Recherche initiale/RECHERCHE-PLUGIN-PALETTES.md).
- [Décisions de rédaction](./DECISIONS-REDACTION-PALETTES.md) et
  [inventaire des textes](./INVENTAIRE-TEXTES-ET-PROPOSITIONS.md).
- [Plan d’ergonomie V5](../2 Ergonomie/PLAN-ERGONOMIE-PALETTES-V5.md), pour préserver les
  comportements des écrans concernés.
- Skills `rediger-sans-tics-ia` pour les documents et commentaires,
  `rediger-diagnostics-ucm` pour les textes destinés au designer.

Les formulations françaises validées restent la référence du catalogue
français. Les formulations anglaises doivent exprimer le même constat et le
même geste. La demande d’anglais par défaut remplace la consigne générale de
rédiger l’interface uniquement en français ; la documentation technique reste
en français. Ne pas modifier les exports historiques de validation éditoriale.

## Points de départ vérifiés dans le code

Les chemins ci-dessous sont relatifs à `packages/`, sauf indication contraire.

| Source | Travail à prévoir |
|---|---|
| `plugin-palettes/src/ui/textes.ts` | Séparer catalogues et fonctions de présentation ; ce module contient aussi les textes des planches |
| `plugin-palettes/src/ui/index.ts` | Initialisation, en-tête, onglets, configuration, résultats et téléchargements |
| `plugin-palettes/src/ui/configuration.ts` | Ajouter la préférence indépendamment des réglages de recette |
| `plugin-palettes/src/ui/index.html` | Remplacer le `lang="fr"` initial par `en`, puis synchroniser au choix actif |
| `plugin-palettes/src/code.ts`, `messages.ts`, `ui/pont.ts` | Transport typé de la lecture et du rangement de préférence |
| `plugin-palettes/src/ui/frontiere.ts` | Préserver la numérotation et les opérations de recette en cours |
| `plugin-palettes/src/planche/modele.ts` | Détacher les textes du document de la langue active de l’interface |
| `plugin-palettes/src/rapport.ts` | Préserver la forme et les valeurs du rapport |
| `couleur/src/contraste.ts` | Les fonctions d’écriture utilisent la virgule ; déplacer le choix de présentation dans la couche localisée sans changer les mesures |
| `plugin-socle/src/ui/` | Rechercher les libellés par défaut, notamment ceux de la poignée de redimensionnement |
| `plugin-palettes/tests/textes.test.ts` | Rendre la langue explicite dans les attentes françaises et ajouter les attentes anglaises |
| `plugin-palettes/galerie/`, `tests/interface/` | Exercer les états dans les deux langues et la bascule en cours d’usage |

## Architecture cible

Créer `packages/plugin-palettes/src/i18n/` avec les responsabilités suivantes.
Les modules sont utilisables sans DOM ; les catalogues sont inclus au build.

| Module proposé | Responsabilité |
|---|---|
| `langues.ts` | Registre des langues disponibles, code, nom natif, direction et langue par défaut |
| `catalogue.ts` | Contrat TypeScript des messages et de leurs paramètres |
| `en.ts`, `fr.ts` | Catalogues complets, organisés par domaine de l’interface |
| `index.ts` | Résolution d’une langue et création d’un traducteur explicite |
| `nombres.ts` | Affichage des nombres, pourcentages, ordinaux et pluriels selon la langue |

Créer `src/preferences.ts` pour valider et stocker la préférence avec des
dépendances injectables. Conserver l’état actif de langue dans l’interface.
Passer un contexte de traduction aux vues et aux fonctions de présentation.
Éviter une variable globale de langue partagée avec le modèle des planches.

Les clés de traduction sont stables et indépendantes des phrases. Le contrat
élargit les valeurs à `string` : un type inféré depuis les seuls littéraux
anglais ne doit pas imposer leur texte exact au catalogue français.
Les messages dynamiques acceptent des paramètres nommés et typés. Traduire des
phrases entières, sans assembler des fragments qui imposent l’ordre français.

Les catalogues livrés doivent être complets à la compilation et au test. Le
repli anglais protège une entrée de langue invalide ; il ne dispense pas de
traduire une clé. Une clé inexistante doit produire un échec de développement,
jamais une clé brute visible dans l’interface.

## Liste des tâches

### Lot 1 : inventorier les surfaces

- [x] Relever l’état Git et préserver les modifications présentes. Lire les
  instructions locales avant de modifier chaque dossier.
- [x] Inventorier tous les exports de `ui/textes.ts`, constantes et fonctions
  comprises. Associer chacun à ses consommateurs et à son domaine de catalogue.
- [x] Rechercher les chaînes hors de ce module : texte DOM, attributs `title`,
  `placeholder`, `aria-*`, SVG, HTML initial, erreurs, sélecteur de couleur,
  éditeur de dérive, données d’exemple et composants du socle.
- [x] Classer chaque chaîne : interface à traduire, donnée utilisateur,
  identifiant technique, texte de planche ou détail technique externe.
- [x] Ajouter au présent document une table de couverture par module avec les
  exceptions motivées. Une recherche des caractères accentués ne suffit pas.
- [x] Relever les tests qui comparent du français, les lois de centralisation
  des textes et les attentes du gabarit ou des messages de galerie.

**Validation :** chaque surface visible ou accessible a un propriétaire ;
les textes de planche partagés avec l’interface sont identifiés.

### Lot 2 : introduire les catalogues

Dépendance : lot 1.

- [x] Créer le registre, les types et le traducteur décrits ci-dessus sans
  dépendance réseau ni chargement de catalogue à distance.
- [x] Extraire les formulations françaises sans modifier leur sens. Isoler
  les textes de planche et leurs fonctions de présentation dans un module
  indépendant de la langue active.
- [x] Traduire toutes les entrées en anglais. Fixer un glossaire pour les
  termes récurrents : palette, nuance, planche, intensité, garantie, référence,
  dérive et réglages communs.
- [x] Conserver les noms propres, acronymes et codes techniques. Traduire les
  libellés de présentation sans renommer `soft`, `vivid`, `light` ou `dark`
  dans les données.
- [x] Couvrir les pluriels, ordinaux et interpolations, notamment les valeurs
  0, 1 et 2. Prévoir une règle de pluriel propre à chaque langue ajoutée.
- [x] Localiser les nombres d’affichage : point en anglais, virgule en
  français. Conserver la précision et les règles d’arrondi existantes.
- [x] Préserver les valeurs techniques des champs HTML et leur analyse ; un
  nombre traduit pour affichage ne doit pas être réinjecté comme valeur JSON.
- [x] Ajouter des tests de complétude, de paramètres et de messages dynamiques
  pour les deux catalogues. Vérifier l’absence de dépendance au DOM.

**Validation :** les mêmes données produisent deux présentations ; le calcul,
la recette sérialisée et le modèle des planches restent identiques.

### Lot 3 : enregistrer la préférence

Dépendance : lot 2.

- [x] Créer la lecture et le rangement sous une clé dédiée, par exemple
  `ucm-palettes.langue`. Valider toute valeur lue ou reçue à l’exécution.
- [x] Ajouter les demandes et réponses typées dans `messages.ts`, puis leur
  routage dans `code.ts`. Garder la préférence hors du cycle de rangement de
  recette et de son empreinte.
- [x] Prévoir un échange initial après installation de l’écouteur UI pour
  éviter un message perdu au démarrage. Attendre la préférence avant le premier
  rendu fonctionnel ; le gabarit d’attente initial est en anglais.
- [x] Traiter l’échec de lecture par le défaut anglais. En cas d’échec
  d’enregistrement, garder la langue choisie pour la session et afficher un
  message localisé avec possibilité de réessayer.
- [x] Sérialiser les enregistrements rapides : après `fr`, puis `en`, la
  dernière sélection doit être celle de la prochaine ouverture. Ignorer une
  réponse de lecture ancienne après un choix utilisateur plus récent.
- [x] Tester stockage absent, invalide, refusé et lecture tardive. Vérifier
  qu’aucune API d’écriture dans le document ni `commitUndo` n’est appelée.
- [x] Ajouter les états correspondants au banc de galerie et aux doubles de
  test, conformément à la couverture des membres de `PluginMessage`.

**Validation :** une nouvelle session récupère le dernier choix confirmé ; un
ancien utilisateur sans préférence démarre en anglais.

### Lot 4 : ajouter le choix et traduire les vues

Dépendances : lots 2 et 3.

- [x] Ajouter un `select` natif avec un libellé associé dans le panneau de
  configuration. Alimenter ses options depuis le registre des langues.
- [x] Rendre ce champ utilisable lorsque la recette est absente, illisible,
  future ou en conflit. Le séparer des gestes de remise à zéro de la recette.
- [x] Injecter le traducteur dans toutes les vues recensées au lot 1. Retirer
  les copies de libellés créées à l’import des modules.
- [x] Ajouter une mise à jour des textes sur les vues montées. Conserver les
  saisies intermédiaires, la sélection de palette, les cartes ouvertes, le
  thème, le focus, le défilement et les dialogues en cours.
- [x] Retraduire les résultats et erreurs à partir de leurs données ou codes.
  Ne pas mémoriser uniquement une phrase déjà rendue en français.
- [x] Maintenir les opérations asynchrones en vol, leurs identifiants et leurs
  confirmations. Le changement de langue ne relance aucune opération.
- [x] Injecter les libellés nécessaires aux composants du socle en conservant
  leur comportement et leurs valeurs par défaut pour UCM Exporter.
- [x] Mettre à jour `document.documentElement.lang`, la direction issue du
  registre, le titre, les infobulles et tous les noms accessibles.
- [x] Garder les erreurs externes brutes dans le détail technique ; leur
  résumé et l’action proposés par le plugin sont traduits.

**Validation :** la bascule traduit aussi les surfaces déjà ouvertes. Aucun
texte français applicatif ne subsiste en anglais hors exceptions inventoriées.

### Lot 5 : vérifier les parcours et les régressions

Dépendance : lot 4.

- [x] Exécuter les scénarios de galerie dans les deux langues, aux tailles
  minimale et par défaut, dans les thèmes clair et sombre.
- [x] Tester dans Chromium : première ouverture, choix du français, retour à
  l’anglais, fermeture simulée, puis récupération de la préférence.
- [x] Couvrir création, duplication, suppression, import, configuration,
  couleur, dérive, ajustement de référence, garanties, interface de test,
  fiches de planches, progression, confirmations et erreurs.
- [x] Basculer pendant une saisie incomplète et pendant un dessin simulé.
  Vérifier conservation des valeurs, focus, résultat et nombre de demandes.
- [ ] Vérifier clavier, nom accessible du menu, annonce de la sélection et
  absence de débordement ou de texte tronqué masquant une action.
- [ ] Comparer recette, rapport, empreintes et modèle des planches avant et
  après une bascule. Conserver les tests français avec une langue explicite.
- [ ] Tester une langue fictive dans le registre de test pour prouver que le
  menu et la résolution ne reposent pas sur une condition binaire `en/fr`.
  Utiliser des textes allongés pour éprouver les contraintes de largeur.
- [x] Ajouter un contrôle des chaînes applicatives hors catalogues avec une
  liste d’exceptions motivées. Ne pas prétendre détecter une langue par ses
  seuls accents.
- [ ] Effectuer la relecture visuelle prescrite par `CONTRIBUTING.md` et noter
  les états observés. Toute vérification Figma non exécutée reste décochée.

**Validation :** tous les parcours sont utilisables en anglais et en français ;
les opérations métier et les sorties du plugin sont inchangées.

### Lot 6 : documenter et terminer

Dépendance : lot 5.

- [x] Documenter le défaut anglais et la préférence personnelle dans le README
  du plugin et la spécification Palettes. Ajouter l’invariant correspondant
  dans `AGENTS.md` avec son module propriétaire.
- [x] Documenter l’ajout d’une langue : catalogue, paramètres, pluriels,
  formats numériques, nom natif, direction, inscription au registre et tests.
  Une direction déclarée ne vaut pas validation d’une interface de droite à
  gauche ; une telle langue demandera sa propre recette visuelle.
- [x] Adapter les règles éditoriales qui imposent le français à cette
  interface, en conservant leur portée pour les autres produits.
- [x] Exécuter les commandes ci-dessous. Consigner les échecs antérieurs ou
  étrangers au chantier séparément des régressions introduites.
- [x] Relire le diff, retirer les artefacts temporaires du chantier et cocher
  uniquement les tâches dont les preuves sont disponibles.

```sh
npm run test --workspace ucm-palettes-plugin
npm run test --workspace ucm-plugin-socle
npm run test:ui --workspace ucm-palettes-plugin
npm run test:ui --workspace ucm-exporter-plugin
npm test
npm run typecheck
npm run build
```

Le compte rendu final indique les fichiers modifiés, les commandes exécutées,
les parcours vérifiés et les limites restantes. Une revue éditoriale anglaise
peut être signalée comme restant à faire ; elle ne remplace pas la traduction
de toutes les entrées par l’agent.

## Constat d’implémentation

Les cases cochées ci-dessus ont leur preuve dans les tests nommés ici ; les
quatre cases ouvertes sont détaillées en fin de section.

### Dispositions retenues

- Le registre `src/i18n/langues.ts` ne charge aucun catalogue. Le sandbox le
  lit pour valider la préférence ; `src/i18n/index.ts` associe chaque code à son
  catalogue par un `Record<Langue, Catalogue>`, qui ne compile pas si une langue
  inscrite n’a pas de catalogue.
- Le contrat `Catalogue` est déduit du catalogue français, chaînes élargies à
  `string`. `tests/i18n.test.ts` compare la structure des deux catalogues, clé
  par clé et type par type.
- Chaque module de vue exporte une fabrique `creerVues…(i18n)`, mémorisée par
  contexte de langue. Un texte se pose par `i18n.lier(element, propriété,
  texte)` ; `i18n.changer(langue)` réapplique toutes les liaisons sans
  reconstruire un élément, ce qui garde saisies, focus, cartes ouvertes et
  défilement.
- Les planches importent `src/planche/textes.ts`, qui réexporte le catalogue
  français. Le modèle des planches ne dépend donc pas de la langue active.
- Le séparateur décimal est lu dans le registre (`decimale`). Le moteur écrit
  toujours à la française ; `src/i18n/nombres.ts` remplace la virgule.
- Pendant un dessin, l’engrenage reste actif pour la langue ; le reste des
  Réglages communs est inerte.

### Couverture par module

| Module | Domaines du catalogue |
|---|---|
| `ui/index.ts` | `TEXTES` : en-tête, onglets, langue, refus de la préférence |
| `ui/ongletPalettes.ts` | `TEXTES`, `TEXTES_DE_L_ONGLET`, `TEXTES_DE_LA_BASE`, `TEXTES_DE_LA_DERIVE`, `TEXTES_DE_L_AJUSTEMENT`, `TEXTES_DU_SELECTEUR` |
| `ui/ongletPlanche.ts`, `ui/dessin.ts` | `TEXTES`, `TEXTES_DU_DESSIN`, `TEXTES_DE_LA_PALETTE_SUPPRIMEE`, progression et résultats du dessin |
| `ui/configuration.ts` | `TEXTES_DE_CONFIGURATION`, `TEXTES_DES_INTENSITES`, `TEXTES_DU_CONTENU`, `TEXTES_DU_PREREGLAGE` |
| `ui/gestesDeLaRecette.ts` | `TEXTES_DE_LA_RECETTE`, `SEUILS_DE_L_IMPORT`, `NOMS_DES_PARAMETRES` |
| `ui/garanties.ts`, `ui/specimens.ts`, `ui/badge.ts` | `TEXTES_DES_GARANTIES`, `NOM_DU_ROLE`, `NOM_DE_L_ETAT`, niveaux WCAG |
| `ui/nuancier.ts`, `ui/apercuCompact.ts` | `TEXTES_DU_NUANCIER`, `TEXTES_DU_DETAIL`, `NOM_DU_PROFIL` |
| `ui/champs.ts`, `ui/creation.ts`, `ui/intensites.ts` | `TEXTES_DU_MODELE`, `TEXTES_DE_LA_BASE`, `TEXTES_DES_INTENSITES_DE_PALETTE`, `TEXTES_AVANCES` |
| `ui/ajustement.ts` | `TEXTES_DE_L_AJUSTEMENT` |
| `ui/interfaceDeTest.ts` | `TEXTES_DE_L_INTERFACE_DE_TEST` |
| `ui/couleur/`, `ui/derive/` | `TEXTES_DU_SELECTEUR`, `TEXTES_DE_LA_DERIVE` |
| `ui/constats.ts`, `ui/messagesDePalette.ts`, `ui/menuPalette.ts`, `ui/selecteur.ts` | `TEXTES`, `LIBELLES_DES_CIBLES` et les constats |
| Socle | `ui/socleLocalise.ts` lie le bouton, les onglets, l’interrupteur, l’engrenage et le retour ; le socle et UCM Exporter sont inchangés |

`tests/loiDesTextes.test.ts` refuse une lettre dans un littéral posé
directement comme texte, infobulle, nom accessible ou libellé dans
`src/ui/`. Deux exceptions y sont motivées : l’exemple `#1E6FD9` et le code
d’emploi `on-solid`. Restent hors catalogue, comme données : les noms de
palette, de fichier et de calque, les codes d’emploi, les noms des profils Soft
et Vivid, et le nom de personne du spécimen de l’interface de test.

Un relevé du DOM de chaque état de la galerie anglaise, texte et attributs
d’accessibilité compris, n’a trouvé aucune phrase française hors de ces
données.

### Glossaire

| Français | Anglais |
|---|---|
| palette | palette |
| nuance | shade |
| planche | board |
| cadre | frame |
| intensité | intensity |
| garantie de contraste | contrast guarantee |
| couleur de référence | reference colour |
| dérive de teinte | hue shift |
| Réglages communs | Shared settings |
| palettes et réglages (la recette) | palettes and settings |
| fond plein | solid fill |
| Générer sur Figma | Generate in Figma |
| Actualiser | Update |
| thème Light, thème Dark | Light theme, Dark theme |

L’anglais suit l’orthographe britannique (`colour`), comme le catalogue livré.
Une relecture éditoriale par un anglophone reste à faire.

### Cases ouvertes

- Clavier et annonces : le nom accessible du menu est vérifié par
  `getByLabel('Language')` ; le parcours au clavier et l’annonce de la
  sélection ne sont pas testés.
- Sorties avant et après bascule : le test de bascule vérifie qu’aucun
  rangement, dessin ni retrait ne part. Le rapport et les empreintes ne sont
  pas comparés.
- Langue fictive : la résolution et le séparateur décimal passent par le
  registre, et `tests/i18n.test.ts` résout une troisième langue. Le menu n’a
  pas été construit avec un registre de test, et aucun texte allongé n’a
  éprouvé les largeurs.
- Relecture visuelle : cinq états de la galerie anglaise ont été capturés à
  500 et 600 px, en clair et en sombre. Un débordement sous la rampe a été
  corrigé (« text on solid fill »). Le reste de la galerie et Figma n’ont pas
  été relus.

La galerie comporte un échec antérieur au chantier, dans les deux langues :
l’état `premier-lancement-palette-creee` cherche `.creation .btn-primary`, que
l’onglet Création ne pose pas dans `bdfc22c`, le commit de départ.
