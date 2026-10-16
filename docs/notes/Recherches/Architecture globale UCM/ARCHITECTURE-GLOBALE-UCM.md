# Architecture globale UCM : le rôle de chaque produit et le propriétaire de chaque information

> Pistes pour plus tard. La direction retenue est la [version minimale](./VERSION-MINIMALE.md) ;
> ce document n'y revient qu'en cas de manque constaté à l'usage.

**Statut :** proposition. Une décision est prise : le retrait de l'onglet
Intégrations (section 6.3). Une [revue](./REVUE-CONCEPTUELLE-ET-FONCTIONNELLE.md) a relu le dossier ; ses
corrections sont appliquées, ses arbitrages restent ouverts (question 16). La section 10 liste les questions à trancher, et
[PLAN-DE-RECHERCHE.md](./PLAN-DE-RECHERCHE.md) les recherches qui les
préparent.

Lecteur : le mainteneur, pour décider où ranger le contrôle des noms, ce que
devient l'onglet Intégrations de l'explorateur, et quel produit porte les
définitions propres à UCM.

Ce document prolonge [RECHERCHE-NOMENCLATURE.md](./Recherches/Nomenclature%20initiale/RECHERCHE-NOMENCLATURE.md),
qui étudie le contrôle des noms seul et le range provisoirement dans
l'explorateur. Il part du code et des documents d'autorité listés dans
[docs/README.md](../../../README.md#quel-document-porte-quelle-règle).

## Principe directeur : deux périmètres dans chaque outil

**Orientation du mainteneur.** UCM offre à la fois des outils utiles à toute
équipe, sur n'importe quelle structure, et un mode « full UCM » pour l'équipe
qui part de zéro et suit toute l'architecture et les recommandations. Chaque
outil distingue clairement ces deux périmètres : l'outil agnostique simple,
ou le passage en full UCM. Cette distinction précède les autres décisions ;
la section 13 de [PISTES-DE-REFLEXION.md](./PISTES-DE-REFLEXION.md) en tire
les conséquences et les questions.

## 1. Ce que chaque produit fait aujourd'hui

| Produit | Écrit dans Figma | Lit | Publie | Contrôle |
|---|---|---|---|---|
| UCM Palettes | Les variables primitives de couleur, à la destination de sa configuration (`primitives` / `colors` par défaut) ; la recette et le suivi dans l'espace partagé `ucm_palettes` ; les planches | Variables locales et collections des bibliothèques activées | Recette et rapport, en fichiers téléchargés | Les sept garanties G1 à G7 par palette, les alertes de conception |
| UCM Token Explorer | Rien : `loiDeLectureSeule.test.ts` refuse tout appel d'écriture | Variables locales, cibles d'alias, calques d'un composant, recette de Palettes, fichiers importés | Relevé et rapport, en fichiers téléchargés | Les chaînes d'alias qui n'aboutissent pas ; le profil d'architecture, à la demande |
| UCM Contract Exporter | Une instance de `.componentRules`, par le seul geste « Créer les règles d'usage » | Un composant et ses règles, les variables locales, le `ucm.config.json` du dépôt | Un contrat ou `tokens.json`, par une demande de fusion | Les préconditions de l'export, bloquantes ; une propriété sans variable, en avertissement |
| `@ucm-kit/core` | Sans objet | Contrats et `tokens.json` | Le format, les lecteurs, la table des dossiers (`@ucm-kit/core/emplois`) | Fournit aux autres produits les règles qu'ils appliquent |
| `@ucm-kit/cli` | Sans objet | Le dépôt consommateur | Rapport de CI, feuille CSS des tokens, guide d'implémentation pour un agent | Forme, version, composition, références de tokens, parité avec un adaptateur, contrastes en information |

Les trois plugins ne s'importent pas entre eux (`tests/pluginsSepares.test.ts`).
Ils partagent le kit, le moteur de couleur `ucm-couleur` et le socle
d'interface.

### 1.1 L'onglet « UCM » de l'explorateur

Le code courant n'a aucun onglet intitulé « UCM ». La barre affiche le logo
`UCM` (`TEXTES.marque`), et l'onglet **Intégrations** regroupe les trois
fonctions qui connaissent UCM. Si l'explorateur ouvert dans Figma montre un
onglet « UCM », il vient d'un build antérieur : le reconstruire avec
`npm run build --workspace ucm-explorateur-plugin`.

| Intégration | Ce qu'elle fait | Sa limite | Ce qui la recoupe |
|---|---|---|---|
| Contrats et tokens UCM | Le designer importe des `*.contract.json` et un `tokens.json`. Pour une variable, l'onglet montre son chemin publié, ses emplacements dans les contrats et ses écarts avec l'export | Import manuel, gardé en mémoire ; un écart peut venir d'un export périmé, et le texte de l'onglet le dit | L'exporteur lit déjà le dépôt configuré ; il pourrait comparer Figma au `tokens.json` déposé avant d'exporter les tokens |
| Recette UCM Palettes | Le designer associe à la main une variable à une palette, une intensité, un thème et un cran ; l'onglet liste les variables de `theme` que ce cran porte | L'association disparaît à la fermeture du plugin | Palettes marque chaque variable qu'il écrit avec sa palette et sa clé (`setSharedPluginData` dans `ecriture/variables.ts`) : l'association peut se lire sans geste. L'aperçu de Palettes montre déjà les variables de chaque cran |
| Profil d'architecture UCM | Le designer associe chaque collection à l'une des cinq couches ; quatre règles relèvent les alias entre couches non permises, les valeurs directes, les portées et la nuance visée par une variable de `theme` | Seules règles d'opinion de l'explorateur. `variableDuNom` reconnaît une variable de `theme` par la fin de son nom : le profil dépend donc du nommage | Le contrôle des noms étudié dans RECHERCHE-NOMENCLATURE.md |

Le [README de l'explorateur](../../../../packages/plugin-explorateur/README.md)
annonce un plugin qui fonctionne sur toute architecture. Les trois
intégrations sont facultatives et tiennent cette promesse. Elles placent
pourtant dans l'outil de lecture la seule partie de la suite qui juge une
architecture de collections.

## 2. Ce qui manque

### 2.1 Les définitions d'UCM sont dispersées

Un designer qui rejoint un projet UCM ne trouve aucune page qui réunisse le
vocabulaire. Chaque définition est écrite là où un produit en a eu besoin.

| Définition | Où elle s'écrit | Où un designer la lit |
|---|---|---|
| Dossiers `solid`, `surface`, `page`, états `default`, `hover`, `pressed`, variables de `theme` et leur cran | [dossiers.ts](../../../../packages/kit/src/emplois/dossiers.ts) | Aperçu de Palettes, spécification Palettes |
| Les sept garanties de contraste | [garanties.ts](../../../../packages/kit/src/emplois/garanties.ts) | Carte des garanties de Palettes |
| États reconnus et leurs variantes (`hover`/`hovered`, `press`/`pressed`) | `STATE_SELECTORS`, [semantics.ts](../../../../packages/plugin-exporter/src/contract/semantics.ts) | Nulle part |
| Tailles reconnues (`small` lu comme `sm`) | `SIZE_VALUES`, même fichier | Nulle part |
| Les cinq couches et les alias permis entre elles | `COUCHES` et `CIBLES_DES_COUCHES`, [profilUcm.ts](../../../../packages/plugin-explorateur/src/integrations/profilUcm.ts) | Onglet Intégrations |
| Architecture des collections | [ARCHITECTURE-FINALE-MULTIMARQUES.md](../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md), dans les recherches | Document de recherche |
| Une variable par propriété de composant | [SPEC de l'exporteur](../../../../packages/plugin-exporter/SPEC.md), section 8 | [Guide designer](../../../guides/POUR-LES-DESIGNERS.md), section 2 |
| Tags des règles d'usage | [README de l'exporteur](../../../../packages/plugin-exporter/README.md#documenter-les-règles-dusage) | Même document |
| Sens de chaque caractéristique pour l'implémentation | [packages/cli/aides/](../../../../packages/cli/aides/) | Un agent, par `ucm guide` |
| Structure de la collection `components` (`{composant}/colors/...`, `{composant}/sizes/...`) | Nulle part | Nulle part |
| Nomenclature des noms de tokens | Nulle part | Nulle part |

Deux sources se contredisent déjà. La table du kit écrit `pressed` ;
l'exporteur accepte `press` et `pressed` comme le même état, et les tokens du
Playground écrivent `press` et `disable`. Le designer qui lit l'une apprend un
terme que l'autre tolère sans le recommander.

### 2.2 Aucun produit ne possède les collections au-dessus des primitives

Palettes écrit les primitives et rien d'autre ; ce périmètre est décidé.
L'explorateur lit sans écrire. L'exporteur publie toute architecture sans en
imposer aucune. `color-brands`, `color-utilities`, `theme` et `components` se
posent donc à la main. [CHANGEMENTS-DU-MOTEUR.md](https://github.com/Vassili-g/UCM-Toolkit/blob/5fc8c75/docs/notes/Recherches/Archi%20Tokens%20Multi-marques/Collection%20usage/CHANGEMENTS-DU-MOTEUR.md#hors-ducm-palettes)
prévoit déjà qu'un autre plugin, lecteur de la table du kit, puisse un jour
les poser.

Ces collections portent les écarts de nommage relevés. Sur le `tokens.json`
du Playground, 369 des 760 feuilles sont dans `components`, et chaque paire
de synonymes de la section 3.2 de RECHERCHE-NOMENCLATURE.md y figure.

### 2.3 Les contrôles se répartissent selon l'histoire des produits

| Lieu | Ce qu'il contrôle | Moment |
|---|---|---|
| Palettes, onglet Vérification | Garanties et alertes d'une palette | Pendant la création |
| Explorateur, onglet Diagnostics | Chaînes d'alias qui n'aboutissent pas | Quand le designer l'ouvre |
| Explorateur, profil UCM | Couches, valeurs directes, portées, nuances | Quand le designer l'active |
| Exporteur, analyse | Le composant sélectionné : propriétés sans variable, règles d'usage, préconditions | Avant la publication d'un composant |
| `ucm check` | Contrats, références, parité, contrastes | À chaque demande de fusion |

Les règles communes viennent déjà du kit : le contraste de `contraste.ts`, la
table de `dossiers.ts`. Ce partage fonctionne. Le contrôle des noms n'a
aucune place dans cette répartition, et aucun lieu ne donne au designer un
bilan du fichier entier.

## 3. Le principe proposé

Chaque règle d'UCM pose quatre questions distinctes. Les séparer permet de
construire le moteur avant de choisir l'interface.

| Question | Réponse proposée | Précédent dans le dépôt |
|---|---|---|
| Où la règle s'écrit-elle ? | Dans le kit, en module pur, sans Figma ni DOM | `@ucm-kit/core/emplois`, lu par Palettes, l'explorateur et `ucm check` |
| Où la déclaration propre à un design system se range-t-elle ? | Dans le document Figma de la bibliothèque, puis dans le dépôt par l'exporteur | La recette de Palettes dans l'espace partagé `ucm_palettes` ; `tokens.json` publié par l'exporteur |
| Où le designer voit-il un écart et le corrige-t-il ? | Dans le plugin qui possède la collection concernée | L'onglet Vérification de Palettes pour les primitives |
| Où le dépôt applique-t-il la règle ? | Dans `ucm check`, en information sauf variable manquante | Le diagnostic des contrastes |

Deux règles complètent ce découpage.

**Chaque outil entretient ce qu'il a produit, et ne remplace pas en silence
le travail d'un autre.** La responsabilité porte sur un ensemble de données et
une opération, pas sur une collection entière : `primitives` porte aussi des
espacements, des durées et la typographie, que Palettes ne produit pas.

| Données | Outil qui les entretient | Opération |
|---|---|---|
| Les variables des palettes, reconnues par leur identifiant | UCM Palettes | Écrire, mettre à jour, reprendre |
| Les liaisons générées par l'Architecte, et la déclaration | UCM Architecte | Générer, régénérer |
| L'instance de `.componentRules` | UCM Contract Exporter | Créer les règles d'usage |
| Toute autre variable | Le designer, à la main | Toute modification |
| Aucune | UCM Token Explorer | Lire |

Une migration de noms est un geste distinct : elle touche tous les usages,
dans Figma et dans le code. Une donnée générée puis modifiée à la main admet
trois suites, que le designer doit connaître avant une régénération : la
conserver, la remettre en conformité, ou la retirer du périmètre généré.

**Le socle agnostique et le profil UCM.** Le socle fonctionne sur toute
architecture : exporter, relever une propriété sans variable, résoudre un
alias, mesurer un contraste. Le profil UCM ajoute l'opinion : cinq couches,
table en dossiers, nomenclature. Il s'active collection par collection, et ses
constats restent en information. Cette frontière reprend la règle d'`ucm
check` : aucune collection n'est exigée sous un nom donné.

## 4. Le référentiel UCM

Le référentiel réunit ce qu'un designer ou un agent doit savoir pour
construire un design system selon UCM. Il remplace les définitions dispersées
de la section 2.1 par une source unique.

### 4.1 Son contenu

| Domaine | Contenu |
|---|---|
| Couleurs du thème | Dossiers, états, variables de `theme`, cran de chaque variable dans les deux sens du thème, sept garanties |
| Architecture des collections | Les cinq couches, les alias permis entre elles, les portées attendues par couche |
| Composants | Une variable par propriété, la collection `components` et sa grammaire (`{composant}/colors/{palette}/{variante}/{état}/{rôle}`, `{composant}/sizes/{taille}/{mesure}`), les états reconnus |
| Nomenclature par défaut | Casse, termes retenus et termes qu'ils remplacent, en partant des termes que le kit fixe déjà (`pressed`, `disabled`, `foreground`, `border`, `focus`) |
| Règles d'usage | Les tags et ce que chacun publie |
| Implémentation | Les aides de `packages/cli/aides/`, inchangées |

Chaque entrée porte un identifiant stable, un libellé court en français et en
anglais, une définition d'une phrase et les liens vers sa règle. Les
catalogues de langue de Palettes servent de modèle pour les deux langues.

### 4.2 Sa forme

| Couche | Forme | Lecteur |
|---|---|---|
| Données | Un sous-chemin pur de `@ucm-kit/core`, par exemple `@ucm-kit/core/referentiel`, qui reprend `emplois` et y ajoute couches, états, tailles et nomenclature par défaut | Les plugins, `ucm check`, `ucm guide` |
| Page lisible | Un document généré depuis ces données, comme le schéma JSON l'est depuis `types.ts` ; une modification passe par les données, jamais par la page | Le designer qui arrive sur le projet |
| Déclaration du design system | La nomenclature et l'association des collections aux couches, propres à un fichier ; elles étendent ou remplacent le défaut | Le plugin de la section 5, `ucm check` |

Le module `STATE_SELECTORS` de l'exporteur et `COUCHES` de l'explorateur
lisent alors le référentiel au lieu de porter leur propre table. L'exporteur
garde sa tolérance aux variantes d'états pour les fichiers qui n'adoptent pas
la nomenclature.

### 4.3 La définition des crans

La question posée : faut-il que la définition de chaque cran rejoigne le
dépôt, et sous quelle forme ? Un cran primitif n'a pas de rôle en soi.
`primitives.colors.poppy.700` devient « fond plein au repos » parce que
`theme.primary.solid.default` le vise, et seulement dans le sens normal du
thème : le sens inversé vise d'autres crans pour `solid/hover` et
`solid/pressed`. Le rôle appartient donc à la variable de `theme`, et la table
du kit le donne pour toutes les palettes.

| Forme | Ce qu'elle apporte | Ce qu'elle coûte | Proposition |
|---|---|---|---|
| Description Figma de chaque primitive, écrite par Palettes | Visible dans le panneau des variables | Le rôle dépend du mode, une description non ; Palettes sortirait de son périmètre de valeurs | Écarter |
| Description Figma de chaque variable de `theme`, écrite à la demande par le plugin de la section 5 depuis le référentiel | Visible dans Figma et en Dev Mode, publiée dans `tokens.json` | Écrit dans un champ que le designer peut remplir : une description déjà saisie doit être conservée | Retenir, en geste explicite |
| `$description` dans `tokens.json` | Lu par un agent avec le token | L'exporteur ne publie aujourd'hui aucune description : `exportTokens.ts` ne lit pas `Variable.description` | Retenir : publier la description Figma telle quelle |
| Dictionnaire dans le paquet npm | Une source versionnée, sans dépendre de Figma | Ne dit rien d'une variable propre au design system | Retenir : c'est la couche données du référentiel |
| Sens des tokens cités, dans `ucm guide` | L'agent qui implémente un contrat lit le rôle de chaque token qu'il cite | Une section de plus dans le guide | Retenir |

## 5. Le rôle de chaque produit

### 5.1 Un plugin pour l'architecture des tokens

Le document propose un quatrième plugin, au nom provisoire **UCM
Architecte**. Il possède les collections au-dessus des primitives et leur
nommage.

| Version | Ce qu'il fait | Ce qu'il écrit |
|---|---|---|
| Lecture | Le bilan du fichier contre le référentiel et la déclaration : profil d'architecture, nomenclature, complétude de `theme`, modes écrits dans les noms, colonnes de modes identiques, valeurs nulles, collisions de `normalizeName`, `codeSyntax.WEB` différent de `tokenCssVariable`, et le résumé des garanties de chaque palette lu dans la recette | La déclaration du design system, dans son espace partagé du document |
| Écriture | Renommer un terme dans toutes les variables qui le portent, en gardant la table de l'ancien nom vers le nouveau ; remplir la description des variables de `theme` ; poser les alias de `theme` vers les palettes | Les variables de `color-brands`, `color-utilities`, `theme` et la structure de `components` |

La boucle de nomenclature tient dans ce plugin. Il relève les termes, propose
des paires candidates, et le designer juge chaque paire : même concept et
terme retenu, ou concepts distincts. Chaque jugement devient une ligne de la
nomenclature, et un refus mémorisé ne revient pas.

La pose des alias de `theme` demande le rôle de chaque palette : primaire,
secondaire, neutre, statut. La recette ne le porte pas
([CHANGEMENTS-DU-MOTEUR.md](https://github.com/Vassili-g/UCM-Toolkit/blob/5fc8c75/docs/notes/Recherches/Archi%20Tokens%20Multi-marques/Collection%20usage/CHANGEMENTS-DU-MOTEUR.md),
P8). Ce rôle se déclarerait dans l'Architecte, qui lit la recette sans
l'écrire.

L'audit des composants du fichier entier demande de charger chaque page. La
[mesure de performance](https://github.com/Vassili-g/UCM-Toolkit/blob/5d7435d/docs/notes/Recherches/Performance%20de%20l'analyse/PLAN-IMPLEMENTATION-PERFORMANCE-ANALYSE.md)
de l'exporteur en montre le coût. Cet audit se ferait donc page par page, à la
demande, et après le bilan des variables.

### 5.2 Les cinq produits

| Produit | Geste du designer | Information possédée |
|---|---|---|
| UCM Palettes | Créer les palettes primitives | La recette, les crans, les garanties de chaque palette |
| UCM Architecte | Déclarer et vérifier l'architecture et les noms | La nomenclature, l'association des collections aux couches, les alias de `theme` et des couches de marque |
| UCM Token Explorer | Comprendre une chaîne d'alias ou les tokens d'un composant | Aucune : il lit toute architecture, sans opinion |
| UCM Contract Exporter | Vérifier un composant et publier | Le contrat et sa publication ; le seul pont entre Figma et le dépôt |
| `@ucm-kit/core` et `@ucm-kit/cli` | Sans geste dans Figma | Le référentiel et son application dans le dépôt |

```text
                     @ucm-kit/core/referentiel
          vocabulaire, couches, garanties, nomenclature par défaut
                                │ lu par tous
     ┌──────────────┬───────────┴────────────┬──────────────────────┐
     ▼              ▼                        ▼                      ▼
UCM Palettes   UCM Architecte          UCM Contract Exporter    ucm check
crée les       déclare les noms,       vérifie un composant,    applique au dépôt
primitives     vérifie le fichier,     publie contrats, tokens  ce qui est publié
               pose theme et marques   et déclaration
     │ écrit        │ écrit                  │ publie               ▲
     ▼              ▼                        ▼                      │
 primitives    color-brands,           dépôt consommateur ──────────┘
               color-utilities,        tokens.json, *.contract.json,
               theme, components,      déclaration UCM
               déclaration (document)

UCM Token Explorer lit tout le document et n'écrit rien.
```

### 5.3 Le propriétaire de chaque information

Ce tableau étend celui de la section 3 de [CONCEPT.md](../../../../CONCEPT.md).

| Information | Décidée par | Rangée dans | Publiée par | Contrôlée par |
|---|---|---|---|---|
| Vocabulaire UCM : dossiers, états, couches, garanties | Contributeurs d'UCM | `@ucm-kit/core` | npm | Tous les lecteurs |
| Recette et crans des palettes | Designer, dans Palettes | Espace partagé `ucm_palettes` | Non publiée | Palettes |
| Valeurs primitives de couleur | Calcul de Palettes | Variables de la destination | Exporteur, dans `tokens.json` | Palettes ; `ucm check` pour les références |
| Alias de `theme`, `color-brands`, `color-utilities` | Designer, dans l'Architecte ou à la main | Variables | Exporteur, dans `tokens.json` | Architecte ; contrastes de `ucm check` |
| Nomenclature du design system | Designer, dans l'Architecte | Espace partagé de l'Architecte | Exporteur, à côté de `tokens.json` | Architecte ; `ucm check` en information |
| Association des collections aux couches | Designer, dans l'Architecte | Même espace | Exporteur, dans la même déclaration | Architecte ; `ucm check` sur option |
| Visuel d'un composant et règles d'usage | Designer | Composant et `.componentRules` | Exporteur, dans le contrat | Analyse de l'exporteur ; `ucm check` |
| Comportement et accessibilité | Développeur | Code | Sans objet | Adaptateur de parité |
| Glyphe d'un nom d'icône | Développeur | Code | Sans objet | `ucm icons`, voir section 7 |

La nomenclature se range dans Figma parce que CONCEPT.md y place déjà les noms
de l'API visuelle, « accord designer–développeur, enregistré dans Figma ». Le
dépôt en reçoit une copie générée, comme `tokens.json` : un développeur qui la
modifie à la main voit sa modification écrasée au prochain export.

## 6. Réponses aux questions posées

### 6.1 Où intégrer la nomenclature et son contrôle

Le moteur de la nomenclature se range dans le kit. Le designer la déclare et
la vérifie dans l'Architecte. L'exporteur la publie avec les tokens. `ucm
check` relève les écarts de `tokens.json` en information.

Trois faits écartent l'explorateur comme domicile définitif :

- déclarer une nomenclature écrit dans le document, et un renommage écrit dans
  les variables ; la loi de lecture seule de l'explorateur l'interdit ;
- les signaux de synonymie ne deviennent précis qu'avec l'association des
  collections aux couches (section 6.2), que l'explorateur ne porte qu'au
  titre d'une intégration facultative ;
- l'explorateur n'a aucun accès au dépôt, et ne peut publier la nomenclature
  pour la CI.

L'exporteur est écarté pour une autre raison. Son analyse porte sur un
composant sélectionné, au moment de publier ; le bilan des noms porte sur
toutes les variables du fichier, au moment de les créer.

### 6.2 Ce que la détection automatique trouve sur un fichier réel

[rapprocher-termes.mjs](./Mesures/rapprocher-termes.mjs)
a tourné sur le fichier multimarque d'un client, 2 415 feuilles. Le fichier
n'est pas commité ; les termes métier et les noms de marques sont omis
ci-dessous.

| Relevé | Candidats | Précision observée |
|---|---|---|
| Traduction par alias | 100 | Faible comme détecteur de synonymes. La tête de liste (`spacing`, `radius`, `shadow`, `cards` vers `sizing` ; `tertiary` vers `greyscale`) décrit le passage voulu d'une couche à la suivante |
| Valeur commune entre termes jamais frères | 666 paires | Faible : `button`/`secondary`, `chip`/`text` en tête |
| Mots soudés | 59 | Presque tous justes : `contrasttext`, `backgroundhovered`, `vspacingsmall`, `radiusmedium` |
| Fautes de frappe | 20 | Mêlée : `contrashovered`/`contrasthovered` est une faute ; 14 paires opposent `v` et `h` (`vspacing`/`hspacing`), voulues ; `container`/`contained` est sans rapport |
| Séparateurs | 36 formes | Observations exactes : `800-[light]`, `actions-(button---chip)`, des soulignés |
| Modes écrits dans les noms | 1 299 segments `light` ou `dark`, 139 segments égaux à une marque | Observations exactes ; elles ne sont pas un défaut en soi : les primitives de l'architecture UCM portent elles-mêmes `light` et `dark` dans leur chemin |

Les relevés de forme décrivent des observations exactes sans nomenclature.
Ils ne deviennent des écarts que contre une convention que l'équipe a
adoptée. Les relevés de synonymie produisent des hypothèses à faire juger. Le
relevé par alias deviendrait précis s'il ne comparait que deux termes d'une
même couche : il faut pour cela l'association des collections aux couches.
Nomenclature et profil d'architecture ont donc intérêt à vivre dans le même
produit.

### 6.3 L'onglet Intégrations de l'explorateur

**Décision du mainteneur : l'onglet Intégrations est retiré de
l'explorateur.** Chaque intégration rejoint la destination ci-dessous ; le
moment du retrait de chacune reste à fixer, avant ou après l'arrivée de son
remplaçant.

| Intégration | Destination | Raison |
|---|---|---|
| Profil d'architecture UCM | L'Architecte | Seule règle d'opinion de l'explorateur ; liée au nommage |
| Recette UCM Palettes | L'Architecte, sans association manuelle | Le suivi de Palettes identifie chaque primitive ; la règle `nuance` du profil en a besoin |
| Contrats et tokens UCM | L'exporteur, en aperçu de ce que l'export des tokens va changer dans le dépôt | L'exporteur lit déjà le dépôt ; la comparaison porte alors sur le fichier déposé, jamais sur un import périmé |

L'explorateur garde Variables, Comparer, Dépendants, Diagnostics, Relevés et
la vue composant. Son README dit alors exactement ce qu'il fait : comprendre
une architecture de tokens, quelle qu'elle soit.

### 6.4 Un plugin de vérification UCM global

L'Architecte porte ce bilan pour le document. Il ne recopie pas les
vérifications spécialisées. Il résume les garanties de chaque palette et
renvoie à Palettes pour les corriger ; il résume les composants sans
variable et renvoie à l'exporteur pour le détail d'un composant. Les règles
viennent du kit dans les trois plugins : un écart vu dans Figma est le même
que celui que `ucm check` relève sur la partie publiée.

Un plugin de vérification séparé de l'Architecte, en lecture seule, est
l'alternative B de la section 8. Il oblige le designer à ouvrir un second
plugin pour corriger ce que le premier relève.

### 6.5 Où vivent les définitions propres à UCM

Dans le référentiel de la section 4 : ses données dans `@ucm-kit/core`, sa
page générée pour le designer, et la déclaration du design system dans le
document puis dans le dépôt. Les plugins affichent la définition d'un terme
là où il paraît, comme l'aperçu de Palettes nomme déjà chaque variable de
`theme` avec un libellé français.

## 7. Icônes

Le contrat publie `icons.<clé>.figmaName`, le nom du calque d'icône, et ne
nomme aucun jeu ([FORMAT.md](../../../format/FORMAT.md#ce-que-le-contrat-ne-dit-pas-dune-icône)).
`ucm icons` liste les noms que les contrats réclament, sans juger s'ils sont
couverts. Le Playground les rend par un Kit Font Awesome (`src/Icone.tsx`,
classes `fa-kit` et `fa-regular`).

### 7.1 Ce que Font Awesome fournit

Sources consultées : la documentation Font Awesome et l'API Plugin Figma.

| Besoin | Outil | Limite |
|---|---|---|
| Insérer une icône du Kit dans Figma | Plugin officiel « Font Awesome Icons (Official) », avec un jeton d'API ([documentation](https://docs.fontawesome.com/desktop/add-icons/figma-plugin)) | Il insère un SVG dans un cadre au nom de l'icône, pas un composant ; une icône posée ne se met pas à jour ; les icônes d'un Kit demandent Pro |
| Lister le contenu d'un Kit | API GraphQL `api.fontawesome.com` : `version`, `kitRevision` incrémenté à chaque changement, icônes déposées ([objets](https://docs.fontawesome.com/apis/graphql/objects)) ; CLI `fa kit icons`, `fa kit show` ([fa-cli](https://docs.fontawesome.com/web/use-with/fa-cli)) | Lecture seule ; la CLI se déclare à ses débuts |
| Refuser une icône absente du Kit dans le code | Types TypeScript du paquet npm du Kit ([kit-package-api](https://docs.fontawesome.com/web/dig-deeper/kit-package-api)) | Une classe `fa-*` écrite dans du balisage échappe aux types |
| Vérifier des noms d'icônes dans le code | Aucune règle ESLint trouvée ; `eslint-plugin-fontawesome` ne contrôle que la forme des imports et son dépôt est archivé | Une règle locale reste à écrire |
| Lire les composants d'une bibliothèque Figma depuis un plugin | Aucun : `figma.teamLibrary` ne couvre que les variables ; l'API REST liste les composants avec un jeton | Hors du plugin |

Primer et Carbon gardent un dossier de SVG dans un dépôt comme source unique
et en génèrent le reste. Font Awesome joue ce rôle pour une équipe qui
emploie un Kit : le Kit est la source, Figma et le code en sont deux copies.

### 7.2 Ce qu'UCM peut contrôler

UCM ne synchronise pas le jeu : le Kit et le plugin officiel le font. UCM
peut relever les écarts entre trois listes.

| Contrôle | Lieu | Lecture |
|---|---|---|
| Chaque `figmaName` des contrats existe dans le jeu | `ucm icons`, étendu à une liste du jeu générée dans le dépôt (par exemple depuis `fa kit icons`) | La liste décrit le jeu du dépôt ; elle n'associe aucun nom à un glyphe, ce qui respecte la décision de FORMAT.md |
| Chaque calque d'icône des composants du fichier porte un nom du jeu | L'Architecte, avec la même liste reçue du dépôt ou de l'API Font Awesome | L'appel direct à l'API depuis un plugin dépend de son CORS, que la documentation ne précise pas |
| Le code n'emploie que des icônes du jeu | Les types du paquet du Kit pour les imports ; une règle de lint locale pour les classes | Propre à la stack : un adaptateur ou les conventions du dépôt, jamais `ucm check` seul |

À essayer avant de concevoir : un `fetch` vers `api.fontawesome.com` depuis
un plugin, le nom des calques que le plugin officiel produit pour une icône
déposée dans le Kit, et la sortie de `fa kit show` comme liste d'autorisation.

## 8. Les domiciles possibles du rôle d'architecture

| Critère | A. Explorateur étendu | B. Plugin de contrôle en lecture seule | C. UCM Architecte | D. Exporteur étendu |
|---|---|---|---|---|
| Bilan du fichier entier | Oui | Oui | Oui | Non : l'analyse porte sur un composant |
| Déclarer la nomenclature dans le document | Non : lecture seule | Non | Oui | Oui |
| Renommer, poser les alias de `theme` | Non | Non | Oui | Possible, mais un second geste d'écriture dans un plugin de publication |
| Publier vers le dépôt | Non | Non | Par l'exporteur | Oui |
| L'explorateur reste agnostique | Non | Oui | Oui | Oui |
| Plugins à installer | Trois | Quatre | Quatre | Trois |
| Coût de construction | Faible : le profil existe | Moyen | Élevé : un plugin neuf | Moyen, dans un moteur déjà dense |

La proposition retient C. Elle coûte un plugin de plus à construire et à
publier. A est le chemin le moins cher pour un premier essai, et le moteur du
kit de la phase 1 ne dépend pas de ce choix : l'essai peut commencer dans
l'explorateur puis migrer.

## 9. Ordre de construction

| Phase | Contenu | Interface touchée |
|---|---|---|
| 0 | Le référentiel dans le kit : reprendre `emplois`, y ranger `STATE_SELECTORS`, `SIZE_VALUES`, `COUCHES`, `CIBLES_DES_COUCHES`, les libellés et les définitions ; générer la page lisible | Aucune |
| 1 | Le moteur de nomenclature dans le kit (forme, termes, grammaire) et un lecteur dans `ucm check`, sur option, qui lit une déclaration écrite à la main dans le dépôt ; mesure sur le Playground et le fichier client | Aucune |
| 2 | L'Architecte en lecture : bilan, profil repris de l'explorateur, boucle de nomenclature, déclaration rangée dans le document | Nouveau plugin |
| 3 | L'exporteur publie la déclaration et `$description`, et montre ce que l'export des tokens change dans le dépôt ; l'onglet Intégrations se vide | Exporteur, explorateur |
| 4 | L'Architecte écrit : renommage avec table, descriptions de `theme`, alias de `theme` | Architecte |
| Ensuite | Icônes, typographie | À décider |

La table de renommage de la phase 4 rejoint la piste du [diff sémantique](../Diff%20S%C3%A9mantique/PLAN-DIFF-SEMANTIQUE.md) :
un renommage change le chemin publié, donc les références des contrats et les
variables CSS du consommateur.

### Typographie

L'exporteur publie les styles de texte et les variables typographiques ;
`ucm check` bloque un token typographique d'un type inattendu. Le référentiel
pourrait ajouter une grammaire d'échelle (`display`, `headline`, `title`,
`body`, `label` et leurs tailles, celle du Playground) et l'Architecte trois
constats : un style de texte dont une propriété n'est liée à aucune variable,
un calque de texte de composant sans style, un nom hors de l'échelle. Un
générateur d'échelle à la manière de Palettes reste une idée sans recherche.

## 9 bis. Ce que les recherches R2 à R6 changent

Les résultats sont dans [R2-REFERENTIEL.md](./Recherches/R2-REFERENTIEL.md),
[R3-NOMENCLATURE.md](./Recherches/R3-NOMENCLATURE.md) et
[R4-R6-DECLARATION-ET-BILAN.md](./Recherches/R4-R6-DECLARATION-ET-BILAN.md). Ils
précisent la proposition sur quatre points.

| Point | Proposition initiale | Proposition après recherche |
|---|---|---|
| Forme du référentiel | Un sous-chemin du kit, des entrées par concept | Le découpage d'Adobe Spectrum : des positions, un vocabulaire fermé par position, un catalogue de règles, une entrée par terme (`id`, `libelle`, `definition`, `refuses`, `statut`, `remplacant`). Une seule donnée sert au contrôle et à la page générée |
| Ordre de la nomenclature | Forme, termes, grammaire | Forme, puis grammaire par collection, puis termes par position. Sans grammaire déclarée, la détection de synonymes ne trouve presque rien de juste sur les deux corpus |
| Publication de la déclaration | Un fichier à côté de `tokens.json` | `$extensions["com.ucm.declaration"]` à la racine de `tokens.json` : l'exporteur garde un fichier par demande de fusion, et la CI lit noms et déclaration au même commit |
| Phase 0 | Réunir les définitions dans le kit | Résoudre d'abord les cinq contradictions relevées, dont le message de l'exporteur qui recommande `press` et `disable` contre `pressed` et `disabled` du kit |

Le catalogue du bilan est dans la section 2.2 de R4-R6.
[LECTURE-DES-DOCUMENTS.md](./Recherches/LECTURE-DES-DOCUMENTS.md) ajoute
deux règles de composants déjà écrites, quatre contrôles que l'architecture
multimarque demande, et la contrainte du format : aucune nomenclature ne
devient obligatoire. Les sujets R1 et R5
demandent des gestes du mainteneur dans Figma avant de conclure ; la
concordance des termes du marché (R3, section 3) reste à relancer.

## 10. Questions pour le mainteneur

1. Le principe « chaque outil entretient ce qu'il a produit » et un rôle
   d'architecture conviennent-ils ? Son installation en plugin séparé attend
   la comparaison des parcours ([revue](./REVUE-CONCEPTUELLE-ET-FONCTIONNELLE.md), section 6).
2. La nomenclature se range-t-elle dans le document Figma, publiée par
   l'exporteur, ou s'écrit-elle dans le dépôt, que les plugins liraient ?
3. L'onglet Intégrations disparaît-il avant que l'Architecte et l'aperçu de
   l'exporteur existent, ou après ?
4. Le référentiel est-il bilingue dès la phase 0 ?
5. L'Architecte peut-il écrire la description des variables de `theme`, en
   conservant une description saisie par le designer ?
6. La construction commence-t-elle par les phases 0 et 1, sans interface ?
7. Quel nom pour le plugin ?
8. Le jeu d'icônes se déclare-t-il par une liste générée dans le dépôt depuis
   le Kit Font Awesome, que `ucm icons` et l'Architecte comparent aux noms des
   calques ?
9. Le terme de l'erreur : `error` ou `danger` ? Le marché se partage, le
   Playground emploie les deux ([R3](./Recherches/R3-NOMENCLATURE.md#4-ce-que-ces-résultats-permettent-de-trancher)).
10. Les groupes au singulier (`color`), comme tous les systèmes lus, ou au
    pluriel (`colors`), comme les deux corpus ?
11. Les tailles en forme longue (`small`, `medium`, `large`), majoritaire,
    ou courte (`sm`, `md`, `lg`) ?
12. L'ordre des segments typographiques : rôle, taille, propriété (Material 3)
    ou rôle, propriété, taille (Primer) ?
13. Les deux corrections de l'exporteur (reconnaître `selected`, retirer
    `press` et `disable` de son message) se font-elles avant la phase 0 ?

14. UCM se présente-t-il comme une méthode à architecture recommandée, ou
    comme une boîte à outils qui s'adapte à toute structure ? Quatre pistes
    dans la section 12 de [PISTES-DE-REFLEXION.md](./PISTES-DE-REFLEXION.md).

15. Le cycle d'un changement : quelle version fait foi entre le travail
    dans Figma, le changement proposé, la version acceptée par un dépôt et la
    version adoptée par une application ? Pistes, section 15.
16. Les arbitrages que la [revue](./REVUE-CONCEPTUELLE-ET-FONCTIONNELLE.md) propose dans sa section 12 :
    promesse centrale, premier public, place de la méthode, propriétaire
    d'une donnée, version qui fait foi, périmètre du bilan, rôle de
    l'Architecte, nombre de plugins, premier investissement dans les noms,
    moment des renommages, ce qui se reporte.

Les questions de termes, de langue et de nom (4, 7, 9 à 12) suivent les
arbitrages de public, d'autorité et de parcours : leurs conséquences sont
moindres.

Le mainteneur ne tranche aucune de ces questions pour l'instant : elles
restent consignées ici jusqu'à sa décision.

## Fichiers liés

| Fichier | Rôle |
|---|---|
| [RECHERCHE-NOMENCLATURE.md](./Recherches/Nomenclature%20initiale/RECHERCHE-NOMENCLATURE.md) | Inventaire des noms du Playground, nomenclatures et outils du marché |
| [rapprocher-termes.mjs](./Mesures/rapprocher-termes.mjs) | Les six relevés de la section 6.2 |
