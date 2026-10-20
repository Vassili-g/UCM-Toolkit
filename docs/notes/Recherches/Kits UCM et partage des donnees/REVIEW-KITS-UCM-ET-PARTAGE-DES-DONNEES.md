# Revue des kits UCM et du partage des données entre plugins

## Verdict

**L'objectif est partiellement atteint.** `@ucm-kit/core` porte le format des composants, les emplois de couleur et une grande partie du vocabulaire du design system. Les quatre plugins importent ces définitions. Les contrôles de résolution du monorepo et les tests d'aller-retour entre Palettes et Nomenclature sont présents et passent.

Des références structurantes restent toutefois hors du kit publié : la construction du chemin d'un token, le vocabulaire de rendu produit par l'exporteur, la grammaire des maîtres de règles et les contrats de données partagées. Certaines règles du kit sont aussi appliquées partiellement par l'explorateur. Quatre sondes reproduisent ces écarts, alors que les tests existants concernés passent.

La centralisation doit porter sur les **définitions communes et leur interprétation**. Les valeurs propres à un design system restent dans Figma, puis dans les contrats et `tokens.json`. Le kit fournit leur modèle et leurs lecteurs. Cette répartition suit [CONCEPT.md][concept].

## Périmètre et méthode

La revue porte sur les neuf paquets de `packages/` : le kit, le CLI, l'adaptateur TypeScript, le moteur de couleur, le socle et les quatre plugins. Le kit, le moteur et le socle constituent les trois ensembles de code partagé examinés en détail. Le kit de règles Figma est examiné à travers sa grammaire locale et son [guide de publication][kit-regles].

L'analyse des imports couvre les sources TypeScript et JavaScript des paquets. La lecture détaillée porte sur les référentiels, les portes publiques, les échanges Figma, les consommateurs de ces échanges et leurs tests. Les spécifications servent à vérifier le sens attendu des règles ; les plans de recherche ne servent pas de preuve d'implémentation.

La revue utilise la copie de travail, avec les modifications présentes pendant les contrôles. D'autres travaux ont modifié le dépôt pendant l'analyse. Les constats ci-dessous sont rattachés à des fonctions et à des fichiers précis. Aucun code produit n'est modifié par cette revue.

Les limites de preuve sont les suivantes :

- Les sondes emploient des objets fabriqués et les fonctions de production. Elles ne constituent pas une recette dans Figma.
- Le fichier Community du kit de règles et les distributions installées chez les designers ne sont pas inspectés. Leur conformité n'est donc pas affirmée.
- Les dépôts consommateurs voisins ne sont pas audités. Le CLI et l'adaptateur sont examinés comme consommateurs du kit dans ce monorepo.
- Les interfaces ne font pas l'objet d'une relecture visuelle. Les messages cités ci-dessous sont vérifiés dans leur branche de rendu.

## Ce qui doit être centralisé

| Nature de l'information | Propriétaire attendu | Distribution attendue |
|---|---|---|
| Collections UCM, formes des chemins, rôles, états, profils, termes retenus et formes tolérées | Référentiel du kit | Imports depuis une porte publique pure |
| Forme des composants, composition, variantes, slots, contraintes et références de tokens | Format du kit | Types, schéma et lecteurs partagés |
| Règles communes de projection et d'interprétation | Fonctions pures du kit | Même fonction appelée par le producteur et ses lecteurs |
| Valeurs, alias, variantes et règles d'usage d'un design system particulier | Document Figma | Contrats et tokens exportés ; lectures directes pour les plugins |
| Identité des palettes et variables suivies, conventions choisies dans un fichier | Données du fichier, selon un protocole défini dans le kit | Lecteurs versionnés communs ; adaptateurs Figma locaux |
| Calcul des rampes, recherche d'une référence et optimisation de la chroma | Moteur `ucm-couleur` | API du moteur, dépendante du référentiel |
| Fenêtre, composants d'interface, styles et assemblage des plugins | `ucm-plugin-socle` | Sources communes aux plugins |
| Parcours de Figma, accès disque ou réseau, mutations et présentation | Plugin, CLI ou adaptateur concerné | Adaptation aux modèles communs |

Cette organisation conserve le fonctionnement agnostique. Les règles d'architecture full UCM s'activent sur demande. Un référentiel central ne doit pas transformer une collection libre ou un nom propre de composant en erreur de conformité.

## Cartographie actuelle

### Les portes du kit

| Porte | Contenu observé | Évaluation |
|---|---|---|
| `@ucm-kit/core/format` | Types des composants et tokens, versions, références, noms, identité, configuration du repository, typographie | Modèle central utilisé par le producteur et les consommateurs |
| `@ucm-kit/core/emplois` | Dossiers du thème, crans visés, supports de peinture, portées, garanties et contraste | Règles communes importées par le moteur et l'explorateur |
| `@ucm-kit/core/referentiel` | Vocabulaire, architecture, conventions, lexique, normalisation, nature des noms, questions, produits et recommandations | Référentiel central présent ; plusieurs représentations internes restent à dériver |
| `@ucm-kit/core/lecteurs` | Validation, vues exactes, références, modes, diagnostics et contrôle du repository | Porte Node séparée des plugins |
| `@ucm-kit/core/lecteurs/navigateur` | Réexport des lecteurs accessibles sans Node ni Ajv | Utilisée par l'explorateur ; identité des fonctions vérifiée par les tests |
| `@ucm-kit/core/schema` | Schéma JSON dérivé des types | Publication prévue pour les outils qui lisent un schéma |

Sources : [manifeste du kit][kit-package], [format][format-index], [emplois][emplois-index], [référentiel][referentiel-index], [porte navigateur][navigateur]. La version examinée du kit est `0.9.9`, le contrat courant `14.0` et le format de tokens `2`. La recette de palettes suit son propre format, `12`, dans `ucm-couleur`.

### Les consommateurs

| Consommateur | Données communes effectivement utilisées | Dépendance complémentaire |
|---|---|---|
| Exporter | Format, identité, configuration, vocabulaire des états et tailles, tags des règles | Socle pour les chemins de tokens et l'interface |
| Palettes | Référentiel, destination par défaut, seuil de détection, adresses des données partagées ; emplois via le moteur | `ucm-couleur` pour la recette et les calculs ; socle pour le nommage |
| Token Explorer | Format et lecteurs navigateur, couches, cibles, supports et emplois de couleur | `ucm-couleur` pour lire la recette ; socle pour recalculer les chemins publiés |
| Nomenclature | Registres, lexique, conventions, normalisation, questions et nature des noms | Socle pour lire les règles du fichier, protéger les variables et contrôler les chemins publiés |
| CLI | Configuration, noms, références et lecteurs du kit | Adaptateur de stack découvert dans le repository |
| Adaptateur TypeScript | Types du format et lecteurs | TypeScript pour analyser les implémentations |

L'inspection des imports ne relève pas de dépendance directe d'un plugin vers les sources d'un autre plugin. `ucm-couleur` et le socle dépendent du kit ; le kit n'importe aucun de ces paquets privés.

### Les échanges de données

| Flux | Producteur | Lecteur | Adresse ou artefact | Autorité actuelle de la forme |
|---|---|---|---|---|
| Contrat de composant | Exporter | Kit, CLI, adaptateur, Explorer après import | `*.contract.json` | Kit : `format/types.ts` et lecteurs |
| Tokens | Exporter | Kit, CLI, Explorer après import | `tokens.json` | Kit pour la forme ; exporteur pour la conversion de Figma |
| Recette | Palettes | Palettes et Explorer | Racine : `ucm_palettes/recette` | Adresse dans le kit ; modèle et classement dans `couleur/src/recette.ts` |
| Suivi des variables | Palettes | Palettes et Nomenclature | Racine : `ucm_palettes/variables` | Modèle complet dans Palettes ; lecture partielle dans le socle |
| Marque de nommage | Palettes | Nomenclature et nommeur partagé | Racine : `ucm_palettes/nommage` | Clé dans le kit ; écriture dans Palettes ; lecture dans le socle |
| Identité d'une variable de palette | Palettes | Palettes et Nomenclature | Variable : `ucm_palettes/palette` et `cle` | Clés dans le kit ; sens de la clé dans Palettes |
| Règles de nommage | Nomenclature | Nomenclature et Palettes | Racine : `ucm_architect`, entrées `ecriture`, `terme:`, `ecart:`, `ordinaire:`, `exclues` | Espace dans le kit ; lecteur commun dans le socle ; sérialisation dans Nomenclature |
| Suivi des planches | Palettes | Palettes | Racine : `ucm_palettes/planche`, marqueurs sur les cadres | Palettes ; usage interne actuel |
| Maîtres de règles | Kit Figma installé dans le document | Exporter | `.componentRules`, `.rulesSection`, `.ruleItem` | Tags dans le kit ; noms et structure attendue dans l'exporteur et le guide |

Le partage se fait par imports au build, par données persistées dans Figma et par fichiers exportés. Les plugins ne s'échangent pas directement leurs états en mémoire.

## Constats et recommandations

Les priorités ont le sens suivant : **P1** corrige une conclusion erronée visible ; **P2** complète l'autorité commune ou sa couverture ; **P3** remet les descriptions et les points d'entrée au niveau du code.

### C01. P1 : le profil autorise des couleurs de composant hors de `theme`

**Fait reproduit.** Le kit distingue `CIBLES_DES_COLLECTIONS.components`, qui contient `theme`, `layouts` et `typography`, de `CIBLES_DES_COULEURS_DE_COMPOSANT`, qui contient seulement `theme`. Le profil de l'explorateur ne contrôle que les variables `COLOR`, mais emploie la table générale.

Un alias couleur `components/button/background` vers une variable de `layouts`, elle-même aliasée vers une primitive, ne produit aucun constat de couche. La sonde rend `[]`. La [spécification de l'explorateur][explorateur-spec] décrit pourtant `components` vers `theme` pour ce contrôle.

**Sources :** [architecture du kit][architecture], `CIBLES_DES_COULEURS_DE_COMPOSANT` ; [profil UCM][profil], `controlerLeProfil`.

**Recommandation.** Ajouter dans le kit une fonction de sélection des cibles par collection et nature de donnée. Le profil doit demander les cibles des couleurs de composant. Préserver les cibles `layouts` et `typography` pour les autres natures.

**Preuve attendue.** Accepter la couleur de composant vers `theme` ; signaler les cibles `layouts`, `typography` et `primitives`. Vérifier séparément les chemins autorisés des dimensions et de la typographie lorsqu'un lecteur les contrôle.

### C02. P1 : une comparaison non effectuée devient une égalité annoncée

**Fait reproduit.** La conversion locale `valeurDtcg` de l'explorateur ne traite pas une courbe DTCG sous forme de tableau. `memeValeur` rend alors `null`. `ecartsAvecLExport` ne retient que `false` et rend une liste vide.

La sonde passe une valeur `CUSTOM_CUBIC_BEZIER` à `convertirValeur`, avec les points `x1: 0.1`, `y1: 0.2`, `x2: 0.3`, `y2: 0.4`. Le relevé conserve cet objet en JSON sous la nature `courbe`. Un token `cubicBezier` portant `[0.9,0.8,0.7,0.6]` rend pourtant `[]`. L'interface interprète cette liste comme « L’export porte la même chose que Figma pour ce token. »

**Sources :** [comparaison des imports][imports], `valeurDtcg`, `memeValeur`, `ecartsAvecLExport` ; [conversion du relevé][lecture-explorateur], `convertirValeur` ; [rendu de l'intégration][vue-integrations], `sectionContratsDeLInspecteur` ; [texte de résultat][textes-explorateur], `aucunEcartExport`.

**Recommandation.** Donner au résultat un état explicite : égal, différent ou non comparable. Placer dans les lecteurs purs du kit les règles de comparaison des valeurs DTCG que plusieurs produits interprètent. L'adaptateur de l'explorateur doit convertir son relevé vers cette entrée portable. Une comparaison partielle doit annoncer sa limite.

**Preuve attendue.** Couvrir les courbes différentes et identiques, les durées, les graisses converties en nombres, les espaces colorimétriques et les formes non prises en charge. Une forme inconnue ne doit jamais produire une annonce d'égalité.

### C03. P2 : le profil du thème ignore des noms que Nomenclature peut produire

**Fait reproduit.** `variableDuNom('primary/solid/default')` retrouve `solid/default`. `variableDuNom('Primary/Solid/Default')` rend `null`. Le profil compare les suffixes bruts à une liste en minuscules. Les conventions partagées autorisent notamment PascalCase et la majuscule initiale.

Un thème renommé peut donc perdre ses contrôles de portée et de nuance. Les contrôles de couche et de valeur directe continuent à fonctionner. L'échec concerne la reconnaissance de son rôle.

**Sources :** [profil UCM][profil], `variableDuNom` ; [conventions][conventions] ; [vocabulaire du fichier][vocabulaire-fichier].

**Recommandation.** Fournir un lecteur de chemin sémantique dans le kit. Il doit reconnaître au minimum les variations de casse et les formes d'écriture des termes UCM, avec une règle explicite pour les termes personnalisés. Conserver le nom brut pour l'affichage. Une association persistée par identifiant peut couvrir les noms qui ne se déduisent plus du vocabulaire.

**Preuve attendue.** Renommer un thème selon chaque convention proposée, puis rejouer les contrôles de portée et de nuance. Pour une substitution personnalisée non résoluble, rendre la limite observable au lieu de supprimer implicitement le contrôle.

### C04. P2 : la grammaire centrale ne décrit pas toute la sortie de Palettes

**Fait reproduit.** `PREREGLAGES[13]` ajoute les nuances `1000` et `1050`. `REGISTRE_CRANS` vient des onze valeurs de `CRANS`. Les formes de chemin de `primitives` emploient ce registre fermé.

Pour une palette à treize nuances, les deux chemins `color/ocean/soft/light/1000` et `color/ocean/soft/light/1050` sont refusés par `cheminConforme`. Cette divergence ne bloque pas aujourd'hui l'écriture de Palettes : son plan n'appelle pas ce validateur. Elle empêche d'employer la grammaire centrale comme description exhaustive de cette sortie.

**Sources :** [préréglages du moteur][nuances] ; [registre des crans][vocabulaire] ; [formes de chemins][architecture] ; [plan des variables][plan-variables].

**Recommandation.** Distinguer dans le kit les crans de référence des emplois, les préréglages de nuances et les numéros admis par une palette. Choisir explicitement si treize nuances relèvent du profil full UCM ou d'une extension reconnue. Les palettes libres et figées exigent aussi une politique, car leurs numéros peuvent sortir de `CRANS`.

**Preuve attendue.** Comparer les chemins produits par `planDesVariables` à la grammaire du profil annoncé : onze nuances, treize nuances, une ou deux intensités, thèmes en chemin ou en modes. Pour chaque forme hors profil, documenter la frontière et tester le classement correspondant.

### C05. P2 : une règle du format publié dépend du socle privé

**Fait observé.** `normalizeName`, `toRef` et `tokenCssVariable` appartiennent au kit. L'assemblage collection-variable, l'élimination des caractères non citables et le traitement du préfixe répété appartiennent à `plugin-socle/src/cheminsDeTokens.ts`.

L'exporteur, l'explorateur et les contrôles de renommage utilisent bien la même fonction. Il n'y a donc pas trois implémentations concurrentes. En revanche, un consommateur du kit publié ne peut pas importer cette règle depuis `@ucm-kit/core`.

**Sources :** [chemins des tokens][chemins-tokens], `cheminCitable`, `prefixeDeCollection`, `joinTokenPath` ; [noms du format][noms-format] ; [spécification du format][format-spec].

**Recommandation.** Déplacer ces fonctions pures vers `core/format`, puis conserver provisoirement les réexports du socle. Déplacer également la décision pure sur les collisions de chemins et d'axes vers une porte adaptée du kit. L'inventaire des objets Figma reste dans l'adaptateur ou le socle.

**Preuve attendue.** Conserver les résultats sur les préfixes répétés, accents, accolades, `$`, chemins vides, collisions token-groupe et axes étendus. Les [tests d'accord des axes][tests-axes] sont une base de non-régression à garder.

### C06. P2 : les rôles de rendu communs sont définis dans l'exporteur

**Fait observé.** Le kit publie `RenderingRole` et `RenderingSemantics`. La table concrète des cinq rôles, leurs propriétés CSS et le repli de `ring` sont construits dans `defaultRenderingSemantics` de l'exporteur. Les lecteurs possèdent aussi des listes locales de rôles de peinture et de contour.

Le contrat exporté reste autosuffisant : il embarque sa table de rendu. Le défaut porte sur l'autorité du vocabulaire commun, qui reste attachée à son producteur.

**Sources :** [sémantique de l'exporteur][semantics], `defaultRenderingSemantics`, `renderableRoles`, `roleKind` ; [diagnostic des contrastes][diagnostic-contrastes], `ROLES_DE_PEINTURE`, `ROLES_DE_CONTOUR` ; [format du rendu][format-spec].

**Recommandation.** Définir dans le kit les descriptions communes des rôles, leur nature et les projections nécessaires aux lecteurs. L'exporteur doit les utiliser pour écrire le contrat. L'élection d'un rôle à partir d'un calque Figma reste dans l'extracteur. Le lecteur d'un contrat ancien doit continuer à interpréter la table publiée par ce contrat.

**Preuve attendue.** Comparer les sorties sérialisées avant et après déplacement. Dériver les ensembles de rôles du même modèle. Vérifier que l'ajout d'un rôle exige sa prise en charge par les lecteurs concernés.

### C07. P2 : les adresses partagées sont centrales, leurs contrats restent répartis

**Fait observé.** `produits.ts` porte les espaces et plusieurs clés. Les types, versions et règles de lecture de leurs contenus sont répartis entre le moteur, le socle et Palettes. La recette partagée par deux plugins est définie et classée dans le paquet privé `ucm-couleur`.

Pour le suivi des variables, `lireLeSuivi` dans Palettes refuse de lire le contenu d'une version future. `variablesSuiviesParPalettes` dans le socle relève des identifiants sans contrôler la version racine. Cette lecture conservatrice protège davantage de variables ; elle n'est pas assimilée ici à une perte de données. Les deux lecteurs expriment toutefois deux politiques sans contrat commun qui les distingue.

**Sources :** [adresses des produits][produits] ; [recette][recette] ; [suivi des variables][suivi] ; [inventaire partagé][inventaire], `variablesSuiviesParPalettes` ; [lecture des règles de nommage][regles-nommage].

**Recommandation.** Créer des portes pures du kit pour les protocoles inter-plugins. Y placer les adresses, formes, versions reconnues et résultats de classement. Séparer explicitement la lecture complète d'un suivi de son relevé conservateur d'identifiants protégés. Extraire du moteur le contrat de recette et son classement ; conserver les calculs de couleurs dans `ucm-couleur`.

Une forme possible est `core/protocoles`, avec des modules `palettes`, `nommage` et `regles-usage`. Ce nom est une proposition d'organisation. Les domaines ne doivent pas être ajoutés à un fichier `produits.ts` unique qui cumulerait toutes les formes d'échange.

L'extraction de la recette exige de séparer ses dépendances : le lecteur actuel importe les courbes par défaut, les bornes du moteur et le relevé Tailwind. Extraire d'abord le modèle d'échange et les validations de forme. Les migrations qui calculent des valeurs doivent recevoir leurs paramètres ou rester dans une couche dépendante du moteur. Le kit ne doit jamais importer `ucm-couleur`.

**Preuve attendue.** Faire lire les octets écrits par chaque producteur à tous ses lecteurs. Couvrir l'absence, le JSON invalide, les versions anciennes, courantes et futures. Une simple lecture ne doit jamais migrer ni réécrire le document.

### C08. P2 : le nommage commun reste réparti entre kit et socle

**Fait observé.** Le kit contient le lexique et la normalisation. Le socle contient la lecture de `ecriture`, `terme:`, `ecart:`, `ordinaire:` et `exclues`, puis l'orchestration `nomsSelonLesRegles`. Nomenclature sérialise ces règles et conserve des constructeurs de clés locaux. Palettes emploie le lecteur partagé.

Les tests d'aller-retour prouvent déjà que les deux plugins produisent les mêmes noms dans les cas couverts. Le problème est l'emplacement de l'API métier, accessible seulement aux clients du socle privé.

**Sources :** [lecteur des règles][regles-nommage] ; [calcul commun du nommage][calcul-nommage] ; [sérialisation de Nomenclature][regles-plugin] ; [tests entre plugins][tests-noms].

**Recommandation.** Placer dans le kit le protocole des seules règles qui changent un nom, leurs constructeurs de clés et le calcul sur un inventaire portable. Garder dans Nomenclature les réponses d'écran, le journal d'annulation et les règles qui ne servent qu'à son parcours. Garder dans le socle l'acquisition de l'inventaire Figma et les composants d'interface.

**Preuve attendue.** Rejouer les tests d'idempotence, de remplacements personnalisés, d'exclusions et de collisions. Les deux plugins doivent continuer à consommer une même fonction, avec tous les noms locaux du fichier.

### C09. P2 : la grammaire du kit de règles Figma reste locale à l'exporteur

**Fait observé.** Les tags sont dans le kit, mais `.componentRules`, `.ruleItem`, `component-name`, les noms compactés et le marqueur d'aide sont dans `extractRules.ts`. Le guide décrit d'autres calques attendus et les trois maîtres. Le modèle pur `template/modele.ts` dépend aussi de modules du producteur.

Le guide demande une publication manuelle du fichier Figma et une description indiquant la version du plugin attendue. Le contrôle local vérifie des préconditions sur les maîtres trouvés ; il ne prouve pas que le fichier Community correspond au modèle du kit.

**Sources :** [lecture des règles][extract-rules] ; [modèle des règles][modele-regles] ; [guide du kit Figma][kit-regles].

**Recommandation.** Définir dans le référentiel la grammaire des maîtres : noms, champs, tags requis et marqueur. Dériver les formes compactées. Exposer un validateur pur de relevé des maîtres, que l'exporteur peut appeler. Produire depuis cette grammaire la liste de vérification du mainteneur.

**Preuve attendue.** Vérifier chaque tag requis, les calques attendus et le caractère vierge du modèle. Lors de la publication Community, comparer un relevé réel du kit à cette grammaire. Un numéro de compatibilité doit classifier le modèle sans modifier automatiquement les instances déjà remplies.

### C10. P2 : le contrôle d'unicité couvre seulement certaines formes de copie

**Fait observé.** `referentielUnique.test.ts` cherche des tableaux de littéraux pour six familles : crans, modes, profils, états, collections et tags. Il exclut les deux répertoires d'autorité. Il ne détecte pas les unions de types, les objets indexés, les expressions conditionnelles ni une règle laissée dans un seul plugin.

Des représentations parallèles existent aussi dans l'autorité centrale : `MODES` et `REGISTRE_MODES`, `PROFILS` et `REGISTRE_PROFILS`, les sélecteurs d'états et leurs termes tolérés, plusieurs listes de tailles. `SIZE_VALUES` accepte notamment `tiny` et `huge`, que `REGISTRE_TAILLES` ne reconnaît pas. Cela peut correspondre à une compatibilité voulue de l'exporteur ; cette différence mérite une catégorie explicite.

Le contrôle ne relève pas non plus `SEUILS = [3, 4.5, 7]` dans l'explorateur. Les seuils de texte et d'éléments graphiques sont déjà dans le référentiel, tandis que le seuil AAA est écrit dans `niveauxWcag`.

**Sources :** [contrôle d'unicité][test-unicite] ; [vocabulaire][vocabulaire] ; [seuils du kit][seuils] ; [contraste de l'explorateur][contraste-explorateur].

**Recommandation.** Dériver les listes simples de registres structurés. Nommer les différences de compatibilité au lieu de les effacer. Ajouter des tests d'accord entre registres, sélecteurs et classifications. Compléter le contrôle par une analyse de syntaxe des objets et unions, puis par des lois de comportement entre produits. L'absence de tableau recopié ne suffit pas à prouver la centralisation.

**Preuve attendue.** Ajouter un mode, un profil ou un rôle dans son autorité doit modifier les projections prévues. Un client qui maintient une copie doit faire échouer un contrôle. Une différence autorisée doit être décrite et testée.

### C11. P2 : la résolution locale ne garantit pas la fraîcheur du kit compilé

**Fait observé.** Les portes du kit pointent vers `dist`. Le script racine `build` reconstruit le kit avant les plugins ; `npm test` le reconstruit aussi. `prepare` le construit à l'installation. Les scripts `build` et `test` lancés directement dans un plugin ne reconstruisent pas le kit.

Après une modification de `kit/src`, un build isolé de plugin peut donc embarquer un ancien `kit/dist`. Le test `monorepoCoherent` vérifie le dossier du paquet résolu et les pins des paquets publiés. Il ne compare pas le contenu compilé au source. Aucun décalage effectif de distribution n'a été établi pendant cette revue ; le kit a été reconstruit avant les sondes.

**Sources :** [scripts racine][racine-package] ; [exports du kit][kit-package] ; [scripts de Palettes][palettes-package] ; [cohérence du monorepo][test-monorepo].

**Recommandation.** Fournir une commande commune de build et de tests ciblés qui respecte l'ordre des dépendances. Les commandes de galerie doivent suivre la même règle si elles embarquent un référentiel modifié. Un contrôle de fraîcheur peut comparer une empreinte des sources à celle du build, sans dépendre seulement des dates de fichiers.

**Preuve attendue.** Dans un répertoire temporaire, modifier une valeur du référentiel puis lancer la commande documentée de build ciblé. Le bundle doit contenir la nouvelle valeur. Conserver le test de résolution locale et les pins exacts des paquets publiés.

### C12. P3 : les descriptions du partage ne couvrent plus tous les consommateurs

**Faits observés.** Le README du kit présente cinq portes fonctionnelles et omet `referentiel`. Celui du socle décrit trois plugins et omet les modules de nommage. La spécification du profil de l'explorateur décrit cinq couches, alors que `COLLECTIONS` en contient sept.

Le registre `PRODUITS` n'indique pas que Palettes lit les règles de nommage ni qu'il lit et écrit les métadonnées de suivi. La description du socle se limite à l'interface et au build malgré son rôle métier actuel. `RECOMMANDATIONS` est défini dans le kit, mais aucun consommateur de production de ce registre n'a été relevé dans les sources des paquets ; ses conseils ne constituent donc pas une règle distribuée aux plugins.

**Sources :** [README du kit][kit-readme], [README du socle][socle-readme], [spécification du profil][explorateur-spec], [produits][produits], [recommandations][recommandations].

**Recommandation.** Actualiser les portes et responsabilités une fois leur répartition décidée. Pour chaque registre structurant, indiquer ses consommateurs effectifs et le test qui prouve son emploi. Classer les recommandations comme conseils ; si un produit doit les proposer, le brancher sur le registre et vérifier cette liaison.

**Preuve attendue.** Un contrôle doit refuser un sous-chemin public absent de la documentation du kit. Les responsabilités déclarées doivent distinguer les sorties documentaires, les données partagées et les mutations Figma.

## Ce qui est déjà vérifié et à conserver

| Dispositif | Preuve apportée | Borne |
|---|---|---|
| `monorepoCoherent.test.mjs` | Les dépendances déclarées résolvent le kit local ; CLI et adaptateur épinglent sa version | Ne vérifie pas la fraîcheur de `dist` |
| `referentielUnique.test.ts` | Refuse les tableaux recopiés des six familles contrôlées et les exceptions périmées | Ne couvre pas toutes les représentations d'une règle |
| `porteNavigateur.test.mjs` | Les lecteurs purs sont réexportés avec les mêmes noms et fonctions ; la porte n'atteint ni Node ni Ajv | Ne teste pas l'exhaustivité de chaque appel effectué par un plugin |
| `paquetPublie.test.mjs` | Les cinq portes JavaScript testées s'importent dans Node sans `tsx` | Ne réalise pas une installation du tarball dans un consommateur externe |
| `plugin-explorateur/tests/bundle.test.ts` | Construit en mémoire les deux bundles et vérifie les dépendances interdites | Ne remplace pas une ouverture réelle dans Figma |
| `tests/nomsDePalettes.test.ts` | Aller-retour Palettes et Nomenclature, marque présente ou absente, reprise et destination, termes personnalisés | Jeux fabriqués ; ne simule pas toutes les anciennes distributions |
| `tests/axesDeModes.test.ts` | Accord entre le socle et l'exporteur sur les axes et les renommages qui les affectent | La décision reste implémentée dans deux endroits |
| Types, schéma et lecteurs du kit | Le format des composants est commun au producteur et aux consommateurs | L'interprétation commune doit rester accessible dans le kit |

## Architecture recommandée

Le kit doit rester indépendant des plugins. La séparation suivante reprend les domaines existants et rend publics les contrats qui manquent.

| Domaine | Contenu à y maintenir ou ajouter | Clients |
|---|---|---|
| `core/format` | Contrats, tokens, versions, références, identité, projections de noms, table portable de rendu | Producteur, lecteurs, CLI, adaptateurs |
| `core/referentiel` | Registres UCM, architecture, variantes de profils, grammaire des maîtres et fonctions de reconnaissance | Plugins et outils du repository |
| `core/emplois` | Emplois de couleur, supports, garanties et mesures | Moteur, Explorer, lecteurs |
| Portes pures de protocoles, à créer | Recette partagée, suivi inter-plugins, capacités, règles de nommage ; lecture et sérialisation | Producteurs et lecteurs des données Figma |
| `core/lecteurs/navigateur` | Lecture des artefacts, vues exactes, comparaisons portables, résultats avec limites explicites | Plugins et pages |
| `ucm-couleur` | Calcul des rampes, réglages, reconstruction et jugements calculés | Palettes ; Explorer si un calcul lui est utile |
| `ucm-plugin-socle` | Lecture d'objets Figma vers les modèles communs, interface, fenêtre, styles et build | Quatre plugins |
| Chaque plugin | Commandes, mutations autorisées, états d'écran et messages | Son propre parcours |

La création d'une porte de protocoles ne demande pas de déplacer les suivis purement internes, tels que le dessin des planches, tant qu'aucun autre produit ne les interprète. Le kit doit en revanche définir tout fragment qu'un second produit lit, même si ce fragment reste stocké sous un espace historique tel que `ucm_architect`.

La marque de nommage mérite une borne supplémentaire. Elle persiste dans le fichier après l'ouverture d'un Palettes compatible. Elle ne prouve pas la capacité de toute ancienne distribution qui rouvrira ensuite ce fichier. Ce scénario est un **risque de compatibilité déduit du protocole**, sans essai d'une ancienne distribution pendant cette revue. Définir des capacités de lecture et d'écriture par protocole, puis éprouver leur coexistence avant d'assouplir les protections.

## Ordre de mise en œuvre proposé

| Lot | Travail précis | Critère de fin |
|---|---|---|
| 1 | Corriger C01 et C02 ; rendre les comparaisons non effectuées visibles | Les sondes d'alias et de courbe deviennent des tests de non-régression ; aucune égalité implicite |
| 2 | Définir le lecteur de chemin sémantique et les profils de nuances de C03 et C04 | Accord entre noms produits, noms renommés et contrôles du profil |
| 3 | Publier les chemins de tokens et les descriptions de rendu de C05 et C06 | Clients migrés ; sorties sérialisées identiques ; anciens réexports maintenus pendant la transition |
| 4 | Extraire les protocoles et le calcul métier de nommage de C07 et C08 | Tests producteur-lecteurs sur les mêmes octets ; versions futures classées explicitement |
| 5 | Centraliser la grammaire des maîtres et valider un relevé du kit Figma | Relevé réel conforme ; instance remplie préservée |
| 6 | Dériver les projections, couvrir les dépendances de build et actualiser les documents | C10 à C12 couverts par des contrôles et des commandes documentées |

Un déplacement à sortie identique exige la version adaptée du paquet publié et la mise à jour des pins internes publiés. Il ne justifie pas à lui seul une nouvelle version du JSON des contrats. Un changement de forme ou de sens d'un artefact suit sa politique de compatibilité propre. Conserver les espaces et clés déjà écrits dans Figma ; ajouter des lecteurs de transition si leur contenu évolue.

Après chaque lot qui change le référentiel, régénérer sa vue illustrée et les artefacts concernés selon [AGENTS.md][agents]. Les modifications de crans ou du moteur demandent aussi la planche du moteur. Les migrations doivent conserver le fonctionnement agnostique et les frontières de mutation propres à chaque plugin.

## Vérifications exécutées

| Vérification | Résultat |
|---|---|
| `npm run build --workspace @ucm-kit/core` | Réussi avant les sondes et les tests ciblés |
| `npm run typecheck` | Réussi sur les workspaces et les tests racine |
| Tests ciblés de référentiel, architecture, imports Node, porte navigateur, règles communes, intégrations et accords entre produits | 137 tests réussis, aucun échec |
| Quatre sondes fonctionnelles supplémentaires | Écarts C01 à C04 reproduits ; détail ci-dessous |
| Suite générale `npm test` | 3 578 tests réussis, un échec sur 3 579 tests ; détail ci-dessous |
| Contrôles documentaires après rédaction | Style conforme ; huit tests de liens et de rédaction réussis ; 45 références locales vérifiées |

L'unique échec de la suite générale concerne `tests/versionSuitLeContenu.test.mjs`. Le contrôle signale une modification de `packages/kit/src/referentiel/natures.ts` depuis l'adoption du numéro `0.9.9`. Ce fichier était déjà modifié au début de la revue. Le mainteneur doit ajuster la version du kit et les pins des paquets publiés avec cette évolution ; la revue documentaire ne le fait pas.

Les neuf suites de paquets passent. L'échec appartient aux contrôles racine. La suite générale ne remplace pas les commandes séparées de tests d'interface ni une recette Figma, qui ne sont pas exécutées ici.

La commande ciblée est reproductible depuis la racine :

```sh
npx tsx --test tests/referentielUnique.test.ts tests/monorepoCoherent.test.mjs tests/nomsDePalettes.test.ts tests/axesDeModes.test.ts packages/kit/tests/referentiel.test.ts packages/kit/tests/referentiel-definitions.test.ts packages/kit/tests/architectureReferentiel.test.ts packages/kit/tests/porteNavigateur.test.mjs packages/kit/tests/paquetPublie.test.mjs packages/plugin-socle/tests/reglesDeNommage.test.ts packages/plugin-nomenclature/tests/nomsDePalettes.test.ts packages/plugin-explorateur/tests/integrationsUcm.test.ts packages/plugin-explorateur/tests/bundle.test.ts
```

| Sonde | Entrée | Résultat observé |
|---|---|---|
| C01 | Couleur de `components` aliasée vers `layouts`, puis primitive ; couches associées | `controlerLeProfil` rend `[]` |
| C02 | Courbe Figma `[0.1,0.2,0.3,0.4]` ; token `cubicBezier` `[0.9,0.8,0.7,0.6]` | `ecartsAvecLExport` rend `[]` ; branche d'affichage d'égalité |
| C03 | `primary/solid/default`, puis `Primary/Solid/Default` | `solid/default`, puis `null` |
| C04 | Numéros de `PREREGLAGES[13]` injectés dans `color/ocean/soft/light/{numéro}` | `cheminConforme('primitives', ...)` refuse `1000` et `1050` |

Les sondes ont été exécutées sans ajouter de tests au produit. Les recommandations ci-dessus décrivent les tests à intégrer avec chaque correction.

## Sources locales

Les liens pointent vers les fichiers de production et les contrôles qui étayent la revue. Les recommandations d'organisation sont proposées par cette revue ; elles ne remplacent pas les spécifications du produit.

[concept]: ../../../../CONCEPT.md
[agents]: ../../../../AGENTS.md
[racine-package]: ../../../../package.json
[kit-package]: ../../../../packages/kit/package.json
[kit-readme]: ../../../../packages/kit/README.md
[format-index]: ../../../../packages/kit/src/format/index.ts
[format-spec]: ../../../format/FORMAT.md
[emplois-index]: ../../../../packages/kit/src/emplois/index.ts
[referentiel-index]: ../../../../packages/kit/src/referentiel/index.ts
[navigateur]: ../../../../packages/kit/src/lecteurs/navigateur.mjs
[architecture]: ../../../../packages/kit/src/referentiel/architecture.ts
[vocabulaire]: ../../../../packages/kit/src/referentiel/vocabulaire.ts
[conventions]: ../../../../packages/kit/src/referentiel/conventions.ts
[vocabulaire-fichier]: ../../../../packages/kit/src/referentiel/vocabulaire-du-fichier.ts
[produits]: ../../../../packages/kit/src/referentiel/produits.ts
[seuils]: ../../../../packages/kit/src/referentiel/contraste.ts
[recommandations]: ../../../../packages/kit/src/referentiel/recommandations.ts
[noms-format]: ../../../../packages/kit/src/format/names.ts
[diagnostic-contrastes]: ../../../../packages/kit/src/lecteurs/diagnostic-contrastes.mjs
[profil]: ../../../../packages/plugin-explorateur/src/integrations/profilUcm.ts
[imports]: ../../../../packages/plugin-explorateur/src/integrations/contrats.ts
[lecture-explorateur]: ../../../../packages/plugin-explorateur/src/lecture.ts
[vue-integrations]: ../../../../packages/plugin-explorateur/src/ui/vues/integrations.ts
[textes-explorateur]: ../../../../packages/plugin-explorateur/src/ui/textes.ts
[contraste-explorateur]: ../../../../packages/plugin-explorateur/src/contraste.ts
[explorateur-spec]: ../../../../packages/plugin-explorateur/SPEC.md
[nuances]: ../../../../packages/couleur/src/nuances.ts
[recette]: ../../../../packages/couleur/src/recette.ts
[plan-variables]: ../../../../packages/plugin-palettes/src/variables/plan.ts
[suivi]: ../../../../packages/plugin-palettes/src/variables/suivi.ts
[palettes-package]: ../../../../packages/plugin-palettes/package.json
[chemins-tokens]: ../../../../packages/kit/src/format/chemins-de-tokens.ts
[inventaire]: ../../../../packages/plugin-socle/src/inventaireDeNoms.ts
[regles-nommage]: ../../../../packages/kit/src/protocoles/nommage.ts
[calcul-nommage]: ../../../../packages/kit/src/nommage/calcul.ts
[socle-readme]: ../../../../packages/plugin-socle/README.md
[regles-plugin]: ../../../../packages/plugin-nomenclature/src/regles.ts
[semantics]: ../../../../packages/plugin-exporter/src/contract/semantics.ts
[extract-rules]: ../../../../packages/plugin-exporter/src/contract/extractRules.ts
[modele-regles]: ../../../../packages/plugin-exporter/src/template/modele.ts
[kit-regles]: ../../../guides/KIT-DE-REGLES.md
[test-unicite]: ../../../../tests/referentielUnique.test.ts
[test-monorepo]: ../../../../tests/monorepoCoherent.test.mjs
[tests-noms]: ../../../../tests/nomsDePalettes.test.ts
[tests-axes]: ../../../../tests/axesDeModes.test.ts
