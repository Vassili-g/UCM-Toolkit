# Revue du plan de fiabilité UCM

## 1. Verdict sur le plan

**Le plan traite des défauts présents, mais demande des corrections avant
exécution.** Les quatre écarts C01 à C04 sont reproduits. Le lot 5 contient
une généralisation fausse sur le renommage. Le lot 7 ne garantit pas la
détection de la régression de 170a6d79. Le report collectif de C05 à C09 repose
sur une unicité que le code ne tient pas pour toutes les règles concernées.

La copie examinée a pour `HEAD` `cc9c78feda85642eb1e98acb36b3c9bf6d8b65db`.
Le kit porte `0.9.10`. Les deux fichiers suivis déjà modifiés au départ sont
le plan Recette v10 et le sommaire des recherches. Le dossier du présent
audit était déjà non suivi. Aucun code produit, plan existant ou fichier de
configuration n'est modifié par cet audit. Aucun commit n'est créé.

Les sondes sont dans `%TEMP%/ucm-fiabilite-audit-20261020/sondes.mts`.
Elles importent les fonctions de production depuis la racine courante.
Les données fabriquées n'utilisent aucun fichier client ni export du
Playground. La référence multimarque est la [vue illustrée][vue].

Commande PowerShell, depuis la racine, pour rejouer les sondes conservées :

```powershell
npx.cmd tsx (Join-Path $env:TEMP 'ucm-fiabilite-audit-20261020/sondes.mts')
```

Le fichier `sondes.log`, dans le même dossier temporaire, contient les
résultats JSON identifiés par les noms employés ci-dessous. Ces fichiers
temporaires restent nécessaires pour rejouer la commande. Ils ne sont pas
versionnés. Une sonde sur un double prouve le chemin de code exercé ; elle
ne remplace pas une exécution dans Figma.

### Le tableau « L'état actuel », rejoué ligne par ligne

| Ligne du plan | Sonde | Résultat | Verdict |
|---|---|---|---|
| Projection des noms | `T1-noms` | Les deux écritures de `color/ocean/soft/light/500` donnent `color.ocean.soft.light.500` et `--color-ocean-soft-light-500` | Exact pour cette entrée ; ne prouve pas tous les séparateurs |
| Valeurs de variantes | `T2-etat` | `normalizePropValue('Hover')` donne `hover`, puis `buildStateModel` publie `:hover` | Exact |
| Détection de palettes | `T3-detection` | Quatre groupes `Soft/Light`, `Soft/Dark`, `Vivid/Light`, `Vivid/Dark` forment `intensites-themes-chemin` | Exact ; la sonde passe par `regrouperLesPalettes`, car les deux aides citées sont locales |
| Couches de l'explorateur | `T4-couches` | `Color-Brands`, `Color Brands`, `ColorBrands`, `colorbrands` donnent `color-brands` | Exact |
| Rôles du thème | `T5-role` | `primary/solid/default` donne `solid/default` ; `Primary/Solid/default` donne `null` | Défaut confirmé |
| Grammaire du kit | `T6-grammaire` | La forme en minuscules est acceptée ; la forme `Color/Ocean/Soft/Light/500` est refusée | Défaut latent confirmé |

Sources : [noms du format][names], [parsers][parsers],
[détection][detection], [normalisation][normalisation],
[profil de l'explorateur][profil], [architecture][architecture].
Les recherches des appels de production de `cheminConforme` ne relèvent
aucun consommateur Figma actuel.

### Lot 1. Reconnaître l'écriture du thème

| Point | Évaluation et preuve |
|---|---|
| Verdict | **À compléter.** Le défaut est reproduit par `T5-role`. Les modules et fonctions cités existent, hormis `termeReconnu`, qui est bien une création proposée |
| Changement | La reconnaissance commune corrige la casse des suffixes. Conserver les segments `/` pour les adresses. Traiter les substitutions personnalisées comme une limite explicite lorsque leurs règles ne sont pas disponibles |
| Lecteurs et tests | Couvrir `nuanceAttendue`, les portées et les suffixes composés, par exemple `foreground-main`, sous chaque convention. `decouperSegment` reconnaît déjà `foregroundmain` : la sonde `flatcase` le confirme. Tester aussi deux termes dont une convention efface la distinction |
| Dépendances | Le lot 2 doit afficher les limites restantes. Le rôle des deux niveaux `elevation/*` est déjà défini dans le kit ; dériver leur liste plutôt que réécrire leurs valeurs. Sources : [profil][profil], [architecture][architecture], [écriture des mots][mots] |

### Lot 2. Dire qu'une comparaison n'a pas eu lieu

| Point | Évaluation et preuve |
|---|---|
| Verdict | **À compléter.** `C02-courbe` rend `[]` pour deux courbes différentes. La branche de `sectionContratsDeLInspecteur` transforme cette liste en texte d'égalité |
| Changement | Les trois états sont nécessaires. Ils doivent couvrir aussi une source absente, un mode non interprété et les conversions qui perdent une unité ou un espace colorimétrique. Ajouter seulement une branche « forme inconnue » laisserait F01 à F03 |
| Lecteurs et tests | `valeurDtcg` reçoit la valeur seule, sans son `$type`. Lui fournir le type et le contexte nécessaires. Vérifier le rendu réel de l'inspecteur, en plus du modèle pur. Sources : [comparaison][imports], [vue][vue-integrations], [lecture][lecture-explorateur] |
| Dépendances | Le constat « rôle inconnu » dépend du lot 1. Ne pas le produire pour les rôles volontairement non jugés, tels que `identity`. Une liste vide de différences ne constitue pas une preuve de couverture |

### Lot 3. Contrôler la cible d'une couleur de composant

| Point | Évaluation et preuve |
|---|---|
| Verdict | **Exact sur le défaut ; à compléter sur les tests.** `C01` confirme qu'une couleur de `components` vers `layouts`, puis une primitive, ne donne aucun constat |
| Changement | La sélection des cibles par nature appartient au kit. `controlerLeProfil` ne parcourt actuellement que les `COLOR` ; la dimension du test proposé serait simplement ignorée par ce lecteur |
| Tests et fin | Tester les cibles de dimensions et de typographie directement sur la nouvelle fonction du kit. Tester les couleurs dans l'explorateur. Couvrir aussi une cible inaccessible ou sans couche associée : annoncer la limite, sans déclarer une collection libre fautive. Sources : [architecture][architecture], [profil][profil] |
| Dépendances | Le lot ne dépend pas techniquement du lot 2. Il peut partager la publication des lots 1 et 6 |

### Lot 4. Expliquer la protection des variables

| Point | Évaluation et preuve |
|---|---|
| Verdict | **À compléter.** Les deux conditions de libération existent. `suivi-futur` confirme la différence entre lecture complète et relevé conservateur |
| Changement | Les deux politiques doivent rester distinctes et nommées. Ajouter un état de lecture refusée : `lecteurDeVariablesFigma` remplace actuellement un échec de lecture du suivi par un ensemble vide, voir F07 |
| Tests et interface | Couvrir marque absente, courante, invalide et future ; règles absentes, enregistrées et illisibles ; suivi futur et lecture refusée. Les comptes et les explications doivent désigner la même cause. Sources : [inventaire][inventaire], [lecteur Nomenclature][lecture-nomenclature], [suivi][suivi] |
| Dépendances | Le lot 5 n'est pas un préalable au texte de protection. Le protocole de capacité persistée demande en revanche la décision Q2. La galerie devra être relue lors de l'implémentation ; cet audit n'en produit aucune capture |

### Lot 5. Annoncer les écritures de Palettes

| Point | Évaluation et preuve |
|---|---|
| Verdict | **À corriger.** La reprise renomme une variable suivie. Une destination conservée ne renomme pas cette variable pendant sa mise à jour. La sonde `destination-casse` conserve `.../Light/50`, face à un plan `.../light/50` |
| Changement | Décrire séparément les noms du plan, les renommages réellement exécutés et les écarts laissés à Nomenclature. Généraliser `aRenommer` aux deux liaisons annoncerait une mutation inexistante, sauf changement de politique explicite |
| Soupçon de collision | **Reproduit.** `lot5-collision` annonce les mêmes 44 noms à deux palettes. La seconde échoue dans le double. Le contrôle des occupants ne voit pas les variables créées par la première palette : F05 |
| Tests et fichiers | `texteDeLEcriture` existe dans les catalogues, et `ongletGestion.ts` l'appelle déjà avec un compte de renommages. Vérifier les appels existants avant d'ajouter du texte. La preuve doit comparer les mutations au modèle annoncé, sur un lot entier. Sources : [écriture][ecriture-variables], [état][etat], [gestion][gestion], [catalogue][catalogue], [onglet Gestion][onglet-gestion] |

### Lot 6. Décrire les treize nuances

| Point | Évaluation et preuve |
|---|---|
| Verdict | **À compléter.** La décision D1 est explicite ; `13-refuses` confirme le refus de `1000` et `1050`. Leur ajout corrige ce refus, sans suffire à décrire les thèmes en modes |
| Changement | Conserver les crans des emplois. Ajouter les formes de chemins qui omettent le thème quand la collection le porte en modes. À deux intensités, la validation actuelle accepte accidentellement `soft` à la position d'un mode extensible : F08 |
| Tests et fin | Croiser onze et treize nuances, une et deux intensités, thèmes en chemin et en modes. Ajouter des assertions sur la forme reconnue, pas seulement un booléen. La planche et la vue doivent suivre les définitions modifiées. Sources : [nuances][nuances], [architecture][architecture], [plan][plan] |
| Concept | Réserver cette loi à la destination de référence. Une destination libre, un groupe personnalisé ou une reprise libre doit conserver son classement agnostique |

### Lot 7. Vérifier des lois entre produits

| Point | Évaluation et preuve |
|---|---|
| Verdict | **À corriger.** La matrice couvre des formes, mais les cinq lois ne décrivent pas toutes les transitions qui ont provoqué les régressions |
| Loi 1 | La limiter aux règles enregistrées, collections non exclues et marque compatible. Ajouter le cas où une convention change après une première écriture. La destination conserve alors certains noms jusqu'au passage de Nomenclature |
| Loi 3 | La limiter au profil de référence. Un groupe libre accepté par Palettes n'est pas tenu d'appartenir à `FORMES_DES_CHEMINS`. Ajouter une loi qui interdit de bloquer cette sortie agnostique |
| Lois 2, 4 et 5 | La loi 2 doit exercer les vrais appels d'écran ; la loi 4 doit fabriquer des variables du thème, car Palettes écrit des primitives ; la loi 5 doit comparer aussi le refus et les mutations, avec un occupant ne différant que par la casse |
| Dépendances | Le lot utilise les lots 1, 2, 4, 5 et 6. Ajouter les lots 3 et la couverture de lecture si la loi 4 vérifie les constats du profil. Sources : [lois existantes sur les noms][tests-noms], [accord des axes][tests-axes], [annonce de conversion][onglet-creation] |

La suffisance des lois face aux trois corrections est la suivante. Aucun
retrait de correction n'a été effectué dans la copie de travail.

| Correction retirée | Les lois écrites suffisent-elles ? | Preuve à ajouter |
|---|---|---|
| `170a6d79` | **Non garanti.** La régression concerne l'état avant écriture : une reprise demande une mise à jour pour une différence due aux règles. Les noms finaux peuvent rester corrects après écriture, donc satisfaire les cinq lois | À couleurs identiques, changer seulement les conventions ; destination et reprise gardent l'état attendu et la reprise ne demande pas une mise à jour pour ce seul motif. Vérifier ensuite qu'une écriture modifiant réellement la forme reste signalée |
| `c93bff20` | **Oui, si la loi 2 passe par l'écran.** Un test qui appelle directement `conversionDeLaReprise` avec le bon nommeur ne détecte pas sa suppression dans `ongletCreation.ts` | Monter l'annonce de Création, relever les noms transmis au catalogue, puis exécuter la conversion. Une extraction du calcul d'annonce dans une fonction pure réellement appelée par l'écran rendrait cette preuve plus simple |
| `7c673dac` | **Oui, avec un occupant préparé avant le geste.** Une matrice de noms sans occupant ne révèle rien | Une variable non suivie porte le nom final dans une autre casse. Vérifier destination, reprise, conversion et remplacement, puis l'absence de doublon et de mutation d'un tiers |

Le compte rendu du futur lot doit citer le test rouge pour chaque mutant.
Une suite de modèles purs ne prouve pas l'argument passé par un écran.

### Lot 8. Construire et vérifier

| Point | Évaluation et preuve |
|---|---|
| Verdict | **Exact pour la dépendance au build ; à corriger sur AAA.** Les exports du kit visent `dist`. Les builds isolés de plugins ne reconstruisent pas le kit. Aucun `dist` périmé n'a été fabriqué dans cet audit |
| Erreur factuelle | `niveauxWcag` se trouve déjà dans `kit/src/referentiel/contraste.ts`. Le moteur le réexporte. La copie locale restante est `SEUILS = [3, 4.5, 7]` dans l'explorateur. Nommer le seuil AAA et dériver cette projection suffit ; aucun déplacement de `niveauxWcag` n'est requis |
| Couverture | L'empreinte doit inclure les entrées réellement compilées et la configuration du build. Couvrir aussi tests ciblés et galeries. Une analyse des objets et unions ne détectera pas une règle écrite dans une condition ; conserver les lois de comportement |
| Documents et fin | Les omissions C12 sont présentes dans les README, la SPEC et `PRODUITS`. `RECOMMANDATIONS` n'a pas de consommateur de production relevé. Définir le test des portes documentées. Sources : [scripts racine][package-racine], [exports][package-kit], [scripts Palettes][package-palettes], [seuils][seuils], [contraste Explorer][contraste], [unicité][unicite], [produits][produits] |

La fabrication doit être utilisable avant les autres lots. Déplacer la
commande de build ciblé et les vérifications racine en tête du plan. Il
n'existe aucune dépendance technique qui impose d'attendre le lot 7.

### Réévaluer le report de C05 à C09

| Constat | Unicité constatée | Décision proposée |
|---|---|---|
| C05 | `joinTokenPath` est commun. En revanche, la sélection des axes et leurs collisions sont calculées dans `axesDesCollections` et `axesPrevus`/`axesDeLExport`. `tests/axesDeModes.test.ts` compare explicitement ces deux implémentations | Reporter éventuellement le déplacement de `joinTokenPath`. Traiter la décision des axes comme une règle déjà dupliquée ; la centraliser ou renforcer immédiatement ses lois |
| C06 | La table productrice est unique, mais `ROLES_DE_PEINTURE` et `ROLES_DE_CONTOUR` redéfinissent dans les lecteurs la classification d'une partie de ses rôles | Retirer du report l'autorité sur la classification. Préserver la lecture de la table embarquée dans chaque contrat ancien ; ne pas lui substituer automatiquement la table courante |
| C07 | Le classement complet de recette est commun au moteur et à l'explorateur. Le suivi de variables possède déjà un lecteur complet et un lecteur partiel. La marque possède un producteur et un lecteur distincts | Le lot 4 couvre seulement une partie de C07. Un contrat commun et ses deux politiques explicites sont justifiés maintenant. L'extraction physique de la recette peut attendre si le kit reste indépendant du moteur |
| C08 | Les deux plugins appellent le même calcul et le même analyseur de nommage. La sérialisation construit encore localement `terme:`, `ecart:`, `ordinaire:` face aux préfixes interprétés par le socle | Report du déplacement possible. Conserver des tests sur les octets sérialisés et tous les lecteurs. L'unicité du calcul ne signifie pas que la grammaire est définie une seule fois |
| C09 | Les consommateurs de l'exporteur importent les constantes. Dans `extractRules.ts`, les formes `.componentRules`/`.componentrules` et `.ruleItem`/`.ruleitem` sont néanmoins écrites séparément. Le guide de publication décrit la structure hors du code | Dériver dès maintenant les formes compactées et tester la grammaire locale. Le déplacement public peut attendre ; le contrôle d'un relevé Community reste nécessaire avant d'affirmer sa conformité |

Sources : [chemins][chemins], [axes du socle][axes-socle],
[axes de l'exporteur][export-tokens], [sémantique][semantics],
[rôles du lecteur][diagnostic-contrastes], [règles partagées][regles-partagees],
[sérialisation][regles-nomenclature], [grammaire des règles][extract-rules],
[guide du kit Figma][guide-regles]. Le coût d'une publication ne s'impose pas
par déplacement : plusieurs changements compatibles peuvent partager une
version du kit, comme le plan le prévoit déjà pour les lots 1, 3 et 6.

### Accords et conflits avec le concept

La reconnaissance des noms, les cibles selon leur nature et les résultats
non comparables respectent le concept. Les valeurs du design system restent
dans Figma. Le kit n'a aucune raison d'importer le moteur privé pour ces règles.

Deux clauses demandent une réserve explicite :

- La loi « chaque nom écrit est accepté par `cheminConforme` » contredit le
  périmètre agnostique si elle inclut une destination libre. La limiter au
  profil demandé.
- Le renommage de toutes les variables suivies pendant une mise à jour de
  destination changerait la frontière actuelle avec Nomenclature. Le lot 5
  ne peut pas introduire ce comportement comme une simple annonce.

L'audit ne propose aucune migration de fichier Figma, de composant ou du
Playground. Une évolution du modèle du kit ne justifie pas de modifier les
instances de règles déjà remplies.

## 2. Erreurs factuelles du plan

| Affirmation | Correction et preuve |
|---|---|
| Une mise à jour renomme les variables des deux liaisons | Seule la branche reprise renomme ses variables suivies. La destination renomme les variables remplacées, pas les variables déjà suivies conservées. Sonde `destination-casse` et [écriture][ecriture-variables] |
| L'ajout de `1000` et `1050` suffit à décrire les sorties prévues au lot 6 | La sortie à une intensité avec thèmes en modes est refusée dès onze nuances. Sonde `matrice-grammaire`, F08 |
| Les cinq lois attraperaient nécessairement les trois défauts | Elles ne demandent aucun verdict avant écriture pour `170a6d79`. Lecture du diff et de [l'état des tokens][etat] |
| C05 à C09 ne concernent que des règles présentes en un exemplaire | Les axes, la classification des rôles et les lectures du suivi fournissent des contre-exemples. Tableau de report ci-dessus |
| Le seuil AAA de `niveauxWcag` est dans l'explorateur | Cette fonction est déjà dans le [kit][seuils]. L'explorateur recopie une liste de seuils |
| Un test de dimension dans le profil prouverait sa cible autorisée | Le profil saute toute variable non `COLOR`. Tester la nouvelle fonction du kit, sans prendre cette absence de constat pour une validation |
| La publication exige une version distincte par déplacement | Les changements peuvent être groupés dans une même publication. Le plan envisage lui-même ce regroupement à sa fin |

L'échec historique `versionSuitLeContenu` cité par la revue ne se reproduit
pas sur cette copie. Le passage du kit à `0.9.10` est déjà dans `HEAD`.
Le rapport ancien reste un relevé de sa propre copie de travail.

## 3. Nouveaux constats

Les familles A à H gardent le sens du prompt. **Sûr** signifie reproduit
avec une fonction de production. **Probable** signifie établi par lecture,
sans exécution du scénario final. **À vérifier** désigne une hypothèse.
Les priorités suivent le prompt ; un résultat observé sur un double ne
prouve pas le comportement exact du service Figma.

### F01. La comparaison efface l'espace colorimétrique

**Familles A, C et D ; P1 ; sûr pour la comparaison, probable pour les
conséquences sur un fichier P3 réel.**

Dans [les imports][imports], `valeurDtcg` lit trois composantes sans lire
`colorSpace`. `memeValeur` compare alors leurs nombres. La sonde
`espace-ignore` fournit les mêmes composantes avec `display-p3` et obtient
`[]`. La [vue][vue-integrations] affiche son texte d'égalité.

La portée dépasse cet import : `Releve` et `PortDeLecture` de l'explorateur
ne portent pas le profil du document. `hexaDeCouleur`, les copies CSS et
`jugerContraste` interprètent les canaux sans ce contexte. Palettes conserve
ce contexte dans `hexaLu`, et l'exporteur dans `couleurDtcg`.

**Correction proposée.** Le plugin doit acquérir le profil et le conserver
dans son relevé. Les lecteurs purs comparent des couleurs avec leur espace
explicite, ou rendent une comparaison non effectuée. **Propriétaire :**
plugin pour la lecture, kit pour la comparaison portable, moteur pour les
conversions existantes. **Test :** aller-retour des mêmes couleurs en sRGB
et P3, espaces inconnus, contraste et copie. **Coût :** version du kit si
l'API commune évolue ; examiner la version des relevés exportés ; texte de
limite d'écran. Aucune migration Figma.

### F02. La comparaison efface les unités

**Familles A, C et D ; P1 ; sûr.**

`valeurDtcg` transforme tout objet portant un `value` numérique en nombre.
La sonde `unite-ignoree` compare `1` à une dimension `{value: 1, unit: 'rem'}`
et obtient `[]`. `duree-unite-ignoree` compare une seconde à
`{value: 1, unit: 'ms'}` et obtient aussi `[]`.

Le développeur peut donc importer une autre durée et lire une égalité.
Le lot 2 prévoit les durées, mais ne précise pas les unités.

**Correction proposée.** Comparer selon `$type` et unité ; convertir les
durées compatibles ; rendre une dimension relative non comparable sans
contexte. **Propriétaire :** lecteurs purs du kit. **Test :** `1 s` égale
`1000 ms`, diffère de `1 ms` ; `1 px` ne vaut pas `1 rem` sans contexte.
**Coût :** version du kit, adaptation de l'appel de l'explorateur et texte
de limite. Sources : [comparaison][imports], [durées produites][mouvement].

### F03. Une donnée absente ou un mode inconnu supprime le contrôle

**Familles C et D ; P1 ; sûr.**

`ecartsAvecLExport` saute un mode dont `trouvee.valeurs[mode.id]` manque.
La sonde `mode-non-lu` déclare deux modes, fournit une seule valeur et reçoit
`[]`. Dans le profil, un rôle reconnu n'est contrôlé pour sa nuance que si
le nom de mode vaut `light` ou `dark`. `theme-mode-inconnu` fournit `Jour`
et une cible de nuance incorrecte ; le profil ne relève aucun constat.

Le lot 2 couvre le rôle inconnu, mais laisse ces deux causes de contrôle
absent. Le nom libre d'un mode ne devient pas une erreur d'architecture.

**Correction proposée.** Relever séparément contrôles effectués, différences
et causes de contrôle impossible. Un mode libre exige une association
explicite pour le jugement de nuance. **Propriétaire :** plugin ; modèle
portable dans le kit si partagé. **Test :** valeur absente dans chaque mode,
aucune valeur, mode libre, rôle connu et rôle volontairement non jugé.
**Coût :** API et texte d'écran ; version du kit seulement si cette API est
publiée. Sources : [imports][imports], [profil][profil], [vue][vue-integrations].

### F04. Une prop numérique satisfait un enum textuel

**Famille C ; P1 ; sûr.**

La sonde `enum-nombre` crée hors du dépôt un `Button.ts` dont `tone` vaut
`number` et est consommée. Le contrat attend `primary | danger`.
`lireApiPublique` relève `typescript: 'number'`, `valeurs: null`.
`ecartsDeParite` ne produit aucun écart : les types incorrects ne sont
comparés que pour les booléens, et les valeurs seulement pour une union
de littéraux reconnue.

**Correction proposée.** Distinguer un type incompatible d'un type dont les
valeurs ne peuvent pas être énumérées. Conserver l'acceptation d'une union
plus large et de `string` si c'est la politique retenue. Signaler une
analyse indécidable comme telle. **Propriétaire :** adaptateur TypeScript,
kit pour la forme publique du diagnostic si elle change. **Test :** enum
contre `number`, booléen, `string`, union plus large et alias non résolu.
**Coût :** version publiée de l'adaptateur ; kit et CLI si leur protocole
évolue ; texte du rapport CI. Source : [parité TypeScript][parite].

### F05. Deux palettes d'un même lot échappent au contrôle d'occupation

**Familles A, D et F ; P1 ; sûr sur les deux doubles.**

Deux palettes `Ocean-Blue` et `OceanBlue` reçoivent, avec les groupes en
PascalCase, le même premier nom `Color/OceanBlue/Soft/Light/50`.
`tokensDeLaPalette` annonce 44 créations pour chacune.

`ecrireLesVariables` ajoute les créations à `toutesLesVariables`, que le
nommeur relit. En revanche, `variablesLocales`, `locales` et `lues` restent
les instantanés initiaux. Le contrôle `dansLaCollection` parcourt
`variablesLocales`, donc ne voit pas les créations précédentes.

La sonde `lot5-collision` finit pour la seconde palette par
`duplicate variable name : Color/OceanBlue/Soft/Light/50`. La variante
`collision-double-permissif` accepte les créations homonymes : les deux
palettes sont déclarées écrites, avec 88 variables pour 44 noms uniques.
Le résultat réel dans Figma dépend de son comportement face aux doublons ;
le défaut du contrôle préalable est reproduit dans les deux cas.

**Correction proposée.** Planifier le lot entier avec ses réservations de
noms et ses refus, puis faire consommer cette décision par l'annonce et
l'écriture. Revalider l'inventaire avant mutation. **Propriétaire :** modèle
pur de Palettes, nommage commun du socle. **Test :** deux palettes, les deux
ordres, destinations et reprises, noms convergents après règles et noms
occupés par un tiers. Refus avant création du lot concerné. **Coût :**
modèle et annonce d'écran ; aucune migration ni version JSON requise.
Sources : [écriture][ecriture-variables], [nommeur][nommeur], [gestion][gestion].

### F06. Le refus final du suivi laisse des variables sans suivi

**Famille F ; P1 ; sûr sur erreur injectée.**

La sonde `suivi-refuse` autorise la création des variables, puis fait lever
le rangement racine de `variables`. Le résultat vaut
`{issue: 'interrompue', message: 'sonde: suivi refuse'}`. Les 44 variables
restent présentes. Le suivi reste vide et aucun `commitUndo` n'est appelé.
Le prochain geste ne dispose donc pas de leurs identifiants suivis.

Le traitement par palette retire certaines créations après une erreur de
valeur, mais le `catch` extérieur ne traite pas le refus du rangement final.

**Correction proposée.** Définir une récupération explicite des mutations
déjà effectuées lorsque le suivi ne peut pas être écrit. Préparer les
restaurations nécessaires avant mutation ; clore toute mutation conservée
par un point d'annulation, avec un résultat qui la décrit. Un `finally`
appelant seulement `commitUndo` ne restaure pas la propriété des variables.
**Propriétaire :** écriture de Palettes. **Test :** refus du suivi après
création, remplacement et reprise ; refus du marqueur d'une variable ;
refus d'une restauration. **Coût :** gestion d'erreur et texte d'écran,
sans migration automatique. Source : [écriture][ecriture-variables].

### F07. Une lecture refusée supprime la protection d'une reprise

**Familles C et E ; P1 ; sûr pour le classement.**

Dans `lecteurDeVariablesFigma`, une exception à la lecture du suivi donne
`suivies = new Set()`. Une variable reprise n'a pas nécessairement le
marqueur individuel `palette` des variables créées par Palettes.
La sonde `protection-lecture-refusee` obtient `protegee: false` et
`marque: false` pour cette variable, après un refus de lecture racine.

Le chemin de renommage peut alors traiter comme ordinaire une variable
dont la protection n'a pas pu être vérifiée.

**Correction proposée.** Rendre l'échec de lecture distinct de l'absence.
Suspendre le renommage concerné tant que la protection reste indécidable.
**Propriétaire :** adaptateur de lecture de Nomenclature et résultat de
lecture partagé du socle. **Test :** reprise sans marque individuelle,
lecture racine refusée, puis lecture rétablie ; vérifier le refus au moment
d'écrire. **Coût :** modèle de lecture et texte d'écran ; aucune évolution
des données Figma. Sources : [lecteur][lecture-nomenclature], [inventaire][inventaire].

### F08. Le booléen de grammaire masque une mauvaise interprétation

**Familles A et D ; P2 ; sûr.**

La sonde `matrice-grammaire` mesure les refus suivants, sur les chemins
réellement produits par `planDesVariables` :

| Intensités | Nuances | Thèmes en chemin | Thèmes en modes |
|---|---|---|---|
| Une | Onze | 0 sur 22 | 22 sur 22 |
| Une | Treize | 4 sur 26 | 26 sur 26 |
| Deux | Onze | 0 sur 44 | 0 sur 44 |
| Deux | Treize | 8 sur 52 | 8 sur 52 |

À deux intensités en modes, `color/Ocean/soft/50` passe la forme
`color/palette/mode/cran`, car le registre des modes est extensible.
Le profil est accepté à la place du mode. Un test qui n'attend que `true`
ne prouve donc pas la reconnaissance de la forme voulue.

**Correction proposée.** Décrire les formes avec le contexte des modes de
collection. Publier ou tester une reconnaissance structurée avant son
verdict booléen. **Propriétaire :** référentiel du kit. **Test :** matrice
ci-dessus, identité des positions reconnues et contre-exemples ambigus.
**Coût :** version du kit et vues dérivées, sans changement des noms déjà
écrits. Sources : [architecture][architecture], [plan][plan], [registres][vocabulaire].

### F09. Le double impose une exception d'unicité non établie

**Famille H ; P2 ; probable pour l'écart avec Figma.**

`FausseVariable.name` et `FauxFigma.variables.createVariable` refusent un
nom exactement identique. Cette restriction change l'issue de F05 : arrêt
sur le double strict, deux écritures réussies sur sa variante permissive.

La documentation officielle de [`createVariable`][api-create-variable]
décrit la création, sans garantir une exception d'unicité. Le
[guide du serveur MCP publié par Figma][guide-variables-figma] indique que
l'API peut créer des doublons. Ce point appelle une vérification réelle
de la version de Figma visée ; aucun document Figma n'a été modifié ici.

**Correction proposée.** Distinguer les refus de l'API des exigences UCM sur
les chemins publiés. Conserver un double permissif pour prouver que le
plugin détecte lui-même les collisions. **Propriétaire :** tests des plugins
et tests racine. **Test :** création et renommage homonymes, modes distincts,
noms de casse différente ; refuser le conflit dans le modèle avant toute
mutation. **Coût :** tests et éventuelle correction produit ; aucune
migration. Source locale : [double Palettes][faux-figma].

### F10. Une erreur de Git devient une modification des tokens

**Famille C ; P2 ; sûr.**

`releveDuDiff` protège le premier appel à Git. Le second appel,
`git diff --quiet`, transforme toute exception en `tokensModifies: true`.
La sonde `diff-echec128` injecte un statut 128 après une liste ne contenant
que `README.md`. Le résultat ne contient aucune erreur et déclare les
tokens modifiés. Le rapport peut ainsi être annoncé pertinent pour une
demande sans changement de tokens.

**Correction proposée.** Interpréter uniquement le statut 1 comme une
différence. Les autres statuts rendent un échec de relevé. **Propriétaire :**
CLI. **Test :** statuts 0, 1, 128 et erreur de lancement, sur chacun des
deux appels. **Coût :** version publiée de la CLI ; message terminal
existant à réutiliser. Source : [commande check][check].

### F11. L'ouverture de Palettes écrit une capacité persistée

**Familles E et F ; P2 ; sûr pour l'écriture, à vérifier pour une ancienne
distribution réelle.**

`code.ts` appelle `rangerLaMarqueDeNommage(figma)` au démarrage.
`marque-ouverture` confirme une écriture de `{"version":1}` sans action
du designer. Le module n'appelle pas `commitUndo`. La marque demeure après
la fermeture et ne décrit pas la capacité d'une distribution antérieure
qui ouvrira le fichier ensuite.

Ce mécanisme est décrit par le plan, mais son coût doit être décidé : il
s'agit d'une mutation à l'ouverture et d'un assouplissement durable de la
protection. Ce constat n'affirme aucune perte observée dans une ancienne
distribution.

**Correction proposée.** Choisir un geste explicite de déclaration ou
documenter cette exception, son annulation et sa politique de coexistence.
Une marque persistée seule ne prouve pas les capacités du prochain
exécutable. **Propriétaire :** protocole commun et plugin Palettes.
**Test :** ouverture seule, marque courante et future, fermeture,
réouverture par un lecteur ancien isolé ; absence de réécriture à la simple
lecture du protocole. **Coût :** choix d'interface et éventuellement version
du protocole ; aucune migration proposée. Sources : [marque][marque],
[démarrage][code-palettes], [inventaire][inventaire].

### F12. La destination ne porte aucune frontière de couche

**Famille F ; P1 ; sûr pour l'écriture autorisée, choix de concept à trancher.**

La sonde `destination-theme` crée une collection nommée `theme`, choisit
son identifiant comme destination, puis écrit une palette. Le rangement
est accepté et 44 variables de couleur y sont créées.
`validerLaDestination` valide une adresse ; `rangerLaDestination` vérifie
que la collection est locale. Aucune de ces fonctions ne vérifie une couche
d'architecture.

Si la collection joue le rôle de `theme` dans le profil de référence, cette
écriture contredit la frontière demandée par le prompt. Un nom de collection
seul ne prouve cependant pas son rôle dans un fichier agnostique. Interdire
partout les noms `theme`, `color-brands` et `color-utilities` contredirait
à son tour ce périmètre libre.

**Correction proposée.** Faire préciser la portée de la frontière. Sous un
profil UCM explicitement déclaré, borner la destination à la couche de
primitives et vérifier cette condition avant mutation. Garder les
destinations libres hors de ce profil. **Propriétaire :** référentiel pour
la règle, plugin pour l'association et l'écriture. **Test :** collection
associée à chaque couche, collection libre homonyme et absence de profil.
**Coût :** choix produit, modèle d'association et interface ; version du
kit si une définition commune change. Aucune migration automatique.
Sources : [écriture][ecriture-variables], [destination][destination].

### Couverture des familles et des neuf paquets

| Famille | Parcours examiné | Résultat et limite |
|---|---|---|
| A. Décision répétée | Kit, moteur, socle, exporteur, explorateur, Palettes ; annonces et écriture | C05/C06 réévalués ; F01, F02, F05 et F08. Une fonction commune ne suffit pas si ses appelants lui donnent des contextes différents |
| B. Écriture exacte | Référentiel, détection, profil, parsers et règles de noms | C03 confirmé ; découpage des formes soudées déjà présent. Les mots personnalisés exigent leur règle ou un résultat non reconnu |
| C. Silence et succès | Imports et profil Explorer, lecteurs du kit, CLI et adaptateur TS | F01 à F04, F07 et F10. Les absences attendues du mode agnostique ne sont pas classées comme erreurs |
| D. Formes et liaisons | Destination, reprise, conversion, thèmes en chemins et modes | Différence de renommage confirmée ; F05 et F08. Les deux cas de treize nuances ne résument pas cette matrice |
| E. Données partagées | Recette, suivi, marque, métadonnées individuelles et règles Nomenclature | Tableau ci-dessous ; F07 et F11. Anciennes distributions non exécutées |
| F. Mutations | Portes d'écriture de l'exporteur, Palettes et Nomenclature ; loi de lecture seule de l'explorateur | Les frontières de fichiers sont testées et passent. F05/F06 concernent des écritures à l'intérieur de la frontière de fichiers autorisée ; F12 concerne la destination fonctionnelle |
| G. Fabrication | Scripts de chaque paquet, portes `dist`, pins et suites racine | Lot 8 confirmé par lecture ; suite racine verte. Aucun artefact périmé volontairement injecté |
| H. Qualité des preuves | Doubles, lois des contrats, aller-retour des noms, parité TS, schéma et imports navigateur | F09 ; manque de transition pour 170a6d79 ; défauts reproduits malgré les 3 579 tests verts |

Cette couverture est une recherche transversale des familles demandées.
Elle ne constitue pas une preuve d'absence de défaut dans chaque branche.
Les frontières d'export sont également portées par les lois du producteur ;
aucune nouvelle violation de mutation de l'exporteur ou de l'explorateur
n'est établie par cet audit.

### Les données partagées, par adresse

| Adresse ou fragment | Absence, forme invalide, versions | Politique constatée et complément nécessaire |
|---|---|---|
| `ucm_palettes/recette` | `classerRecette` distingue absence, illisibilité et version future ; formats 8 à 11 convertis en mémoire vers 12 si la forme est valide | Lecteur commun au moteur et à Explorer. Les tests de recette passent. La conversion de lecture n'écrit pas ; le rangement appartient au geste du plugin |
| `ucm_palettes/variables` | Absence ou JSON invalide donnent un suivi vide ; sans version, lecture en 1 ; une version numérique supérieure à 1 arrête les mutations | Le relevé conservateur extrait encore les identifiants d'une version future. Les deux politiques sont reproduites par `suivi-futur`. Ne pas les fusionner en une lecture qui effacerait la protection |
| `ucm_palettes/nommage` | Le lecteur accepte un objet de version 1 ; absence, JSON invalide et version future donnent `false` | L'écrivain ne remplace aucune valeur non vide, même invalide. F11 traite l'écriture d'ouverture et la coexistence ; un futur contenu reste conservé |
| Variable : `ucm_palettes/palette` et `cle` | `palette` est un identifiant textuel non versionné ; Nomenclature le traite comme une preuve de protection dès qu'il est non vide ; `cle` décrit l'entrée du plan | L'absence du marqueur individuel est normale pour une reprise. Elle exige le suivi racine : F07. Un format futur de ces fragments exige une politique avant changement de leur sens |
| `ucm_architect/ecriture`, `terme:`, `ecart:`, `ordinaire:`, `exclues` | Le lecteur commun accepte les entrées de version 1 ; les formes invalides et futures sont ignorées. La convention v1 fournit un repli lorsque l'écriture récente manque | La lecture n'écrit pas. L'ignorance d'une exclusion future peut modifier le périmètre d'un ancien écrivain : risque à éprouver, sans affirmer de perte reproduite. Classer la version avant un prochain changement de protocole |
| Autres entrées `ucm_architect` | Réponses, import et journal emploient le lecteur versionné de Nomenclature ; le journal existe aussi sous une ancienne forme | Ces entrées internes ne demandent pas toutes une porte publique. Les tests de journal et d'annulation passent. Éprouver le refus d'une écriture lorsqu'une donnée future gouverne le périmètre |
| `ucm_palettes/planche` et marqueurs de cadres | Protocole interne distinct : suivi courant 2, anciens suivis lus ; refus d'écriture d'un suivi futur dans les portes concernées | La frontière de propriété compare l'identifiant du cadre au propriétaire. Conserver ces contrôles ; F06 justifie aussi d'injecter les refus du rangement final des planches |

La sonde `protocoles-matrice` exerce l'absence, le JSON invalide et les
versions 0, 1 et 2 du suivi, de la marque et des entrées de règles.
Elle n'utilise pas ces objets comme des recettes valides : la recette
possède `formatVersion` et une autre fenêtre de lecture. Les recettes
historiques valides sont couvertes par les tests du moteur exécutés.
Les comportements d'une ancienne distribution sur les octets actuels
restent à vérifier dans un environnement isolé ; aucune distribution
installée ni donnée du designer n'a été modifiée.

## 4. Lots proposés pour compléter le plan

### Lot A. Comparer avec le type, l'unité et la couverture

**Ce que voit le designer.** L'explorateur réserve son annonce d'égalité
aux valeurs effectivement comparées. Il précise les contrôles incomplets.

**Changement.** Étendre le lot 2 avec F01 à F03. Conserver le profil du
document ; comparer selon le type DTCG et l'unité ; rendre la couverture
des modes et du profil. Garder l'architecture libre par défaut.

**Fichiers.** [Lecture][lecture-explorateur], [modèle][modele-explorateur],
[comparaison][imports], [profil][profil], [vue][vue-integrations],
[contraste][contraste] et nouvelles fonctions pures des lecteurs du kit.

**Tests.** Sondes C02, `espace-ignore`, `unite-ignoree`,
`duree-unite-ignoree`, `mode-non-lu`, `theme-mode-inconnu` ; branches réelles
de rendu ; imports de relevés antérieurs si leur forme change.

**Fini quand.** Chaque égalité affichée possède des comparaisons réalisées
pour tous les modes annoncés. Les limites restent visibles. Publication du
kit si son API change, puis tests racine verts. Aucune migration Figma.

### Lot B. Préparer une écriture complète et récupérer un échec

**Ce que voit le designer.** Les noms annoncés correspondent aux mutations
du lot. Une palette n'échoue plus tardivement sur un nom créé quelques
instants auparavant par le même geste.

**Changement.** Compléter le lot 5 avec F05/F06. Calculer les réservations
de noms et les opérations des deux liaisons. Distinguer un renommage
réel d'un écart laissé à Nomenclature. Traiter le refus du rangement final.

**Fichiers.** [Plan][plan], [nommeur][nommeur], [état][etat],
[gestion][gestion], [écriture][ecriture-variables], [onglet Gestion][onglet-gestion],
catalogues et [double][faux-figma].

**Tests.** Deux palettes dont les noms convergent, les deux ordres,
occupant tiers, reprise et destination, erreurs à chaque étape de mutation
et au suivi final. Les assertions portent sur les identifiants conservés,
les mutations effectuées et le suivi réellement rangé.

**Fini quand.** Annonce, décision de refus et mutations concordent sur un
lot entier. Toute mutation conservée reste suivie ou possède une
récupération explicite. Tests racine verts ; états de galerie actualisés.
Le lot n'introduit aucun renommage automatique de destination. Le traitement
de F12 attend la décision Q6 ; le refus doit porter sur une couche déclarée,
sans interdire une collection libre à cause de son nom.

### Lot C. Conserver les protections quand la lecture échoue

**Ce que voit le designer.** Nomenclature explique les protections et
suspend le geste lorsque leur lecture a échoué.

**Changement.** Compléter le lot 4 avec F07 et la décision Q2 sur F11.
Définir les fragments communs du suivi et les deux politiques de lecture.
Classer les capacités futures avant d'autoriser une écriture.

**Fichiers.** [Inventaire du socle][inventaire], [lecteur Figma][lecture-nomenclature],
[écriture Nomenclature][ecriture-nomenclature], [suivi][suivi],
[marque][marque], protocole pur du kit et interfaces des deux plugins.

**Tests.** Les mêmes octets passent chez producteur et lecteurs ; absence,
corruption et futur ; reprise sans marque individuelle ; refus de lecture ;
anciennes versions isolées. Une simple lecture ne range rien.

**Fini quand.** Une lecture impossible n'autorise aucun renommage concerné.
La marque et les règles ont une politique de coexistence explicite.
Les états d'écran correspondent à la cause réelle. Version du kit si une
porte est publiée ; aucune migration de fichier demandée.

### Lot D. Refuser les conclusions que le contrôle ne prouve pas

**Ce que voit le développeur.** Un enum incompatible est signalé. Une
erreur de Git ne produit plus un périmètre de rapport inventé.

**Changement.** Corriger F04 et F10 ; compléter les lois du lot 7 par les
transitions avant écriture ; traiter F08/F09 dans les lois de grammaire et
de collision. Dériver la classification des rôles et partager la décision
des axes mentionnées dans le report.

**Fichiers.** [Parité][parite], [commande check][check],
[architecture][architecture], [axes du socle][axes-socle],
[axes de l'exporteur][export-tokens], [rôles du lecteur][diagnostic-contrastes],
[sémantique][semantics], tests de paquets et tests racine.

**Tests.** Enum numérique, alias inconnu, statuts Git, forme reconnue des
chemins, doubles permissifs et mutants isolés des trois corrections.
Conserver une distinction entre compatibilité connue et analyse impossible.

**Fini quand.** Chaque mutant visé fait échouer un test nommé ; les erreurs
d'exécution restent distinctes des écarts. Versions publiées des paquets
touchés et pins internes cohérents. Les valeurs propres au fichier restent
hors du kit.

Ordre recommandé : installer d'abord les commandes fiables du lot 8 ;
traiter A et B en priorité ; mener C avec la décision de capacité ; compléter
6 et D avant de déclarer 7 fini. Les déplacements publics sans doublon
avéré peuvent rester reportés. Les mises à jour des autorités existantes
font partie de leurs futurs lots, sans modifier ces documents dans l'audit.

## 5. Questions au mainteneur

| Choix | Recommandation et coût |
|---|---|
| Q1. Les destinations suivies doivent-elles commencer à renommer lors d'une mise à jour de couleurs ? | Conserver la politique actuelle. Annoncer les renommages seulement lorsqu'ils sont exécutés. Un changement de politique demanderait une décision d'interface et une révision des garanties ; il n'est pas requis pour corriger l'annonce de reprise |
| Q2. La marque peut-elle continuer à être posée à l'ouverture ? | Préférer un geste explicite si la règle générale reste « lecture sans écriture ». Sinon documenter l'exception, son annulation et la coexistence avec les distributions antérieures. La marque actuelle ne suffit pas à prouver la capacité du prochain exécutable |
| Q3. Comment reconnaître un mode ou un rôle entièrement renommé par une règle personnelle ? | Lire les règles disponibles ou proposer une association explicite. À défaut, annoncer le contrôle non effectué. Conserver le nom Figma d'origine ; aucune règle de nommage supplémentaire ne doit être imposée au fichier |
| Q4. La grammaire valide-t-elle une référence UCM ou toute sortie de Palettes ? | Valider le profil demandé avec le contexte des modes. Conserver les sorties libres et les reprises dans le périmètre agnostique. Cela corrige la loi 3 sans restreindre la destination |
| Q5. Faut-il déplacer maintenant tous les modules C05 à C09 ? | Traiter les décisions déjà dupliquées et les protocoles partagés. Reporter les seuls déplacements dont l'implémentation est déjà commune. Regrouper les modifications compatibles dans une publication du kit |
| Q6. La restriction de Palettes à `primitives` concerne-t-elle le profil UCM déclaré ? | L'appliquer à une couche explicitement associée, puis la vérifier dans le sandbox. Conserver les destinations libres en mode agnostique. F12 prouve que le code actuel ne possède pas cette frontière ; sa portée doit être décidée avant d'introduire un refus |

## Vérifications

| Commande ou ensemble | Résultat |
|---|---|
| `npm run typecheck` depuis la racine | Code de sortie 0 ; paquets et tests racine compilés |
| `npm test` depuis la racine | Code de sortie 0 ; 3 579 tests réussis, aucun échec, aucun test sauté |
| Détail des neuf paquets | Adaptateur 23 ; CLI 170 ; couleur 378 ; kit 598 ; explorateur 141 ; exporteur 1 063 ; Nomenclature 496 ; Palettes 570 ; socle 47 |
| Tests racine | 93 réussis, dont `versionSuitLeContenu`, pins, unicité, axes et noms entre produits |
| Sondes | Script terminé avec code 0 ; résultats dans le dossier temporaire indiqué en tête |
| Contrôle de style du document | Conforme, code de sortie 0 ; liens locaux vérifiés |

Les journaux `typecheck.log` et `tests.log` sont conservés dans le même
dossier temporaire. Le message PowerShell `NativeCommandError` qui emballe
les notices npm ne correspond pas à un échec des commandes : les deux
codes de sortie valent 0. Aucun échec préexistant n'a été reproduit.

`test:ui`, les boucles d'attente, les publications et les mutations Figma
ne sont pas exécutés. Les tests passent avant la rédaction de ce document ;
le contrôle de style final et le contrôle des liens portent sur sa forme
finale.

## Sources

[vue]: ../Archi%20Tokens%20Multi-marques/VUE-ILLUSTREE-MULTIMARQUES.html
[names]: ../../../../packages/kit/src/format/names.ts
[parsers]: ../../../../packages/plugin-socle/src/composant/contract/parsers.ts
[detection]: ../../../../packages/plugin-palettes/src/variables/detection.ts
[normalisation]: ../../../../packages/kit/src/referentiel/normalisation.ts
[profil]: ../../../../packages/plugin-explorateur/src/integrations/profilUcm.ts
[architecture]: ../../../../packages/kit/src/referentiel/architecture.ts
[mots]: ../../../../packages/kit/src/referentiel/ecriture-des-mots.ts
[imports]: ../../../../packages/plugin-explorateur/src/integrations/contrats.ts
[vue-integrations]: ../../../../packages/plugin-explorateur/src/ui/vues/integrations.ts
[lecture-explorateur]: ../../../../packages/plugin-explorateur/src/lecture.ts
[inventaire]: ../../../../packages/plugin-socle/src/inventaireDeNoms.ts
[lecture-nomenclature]: ../../../../packages/plugin-nomenclature/src/lectureFigma.ts
[suivi]: ../../../../packages/plugin-palettes/src/variables/suivi.ts
[ecriture-variables]: ../../../../packages/plugin-palettes/src/ecriture/variables.ts
[etat]: ../../../../packages/plugin-palettes/src/variables/etat.ts
[gestion]: ../../../../packages/plugin-palettes/src/variables/gestion.ts
[catalogue]: ../../../../packages/plugin-palettes/src/i18n/fr.ts
[onglet-gestion]: ../../../../packages/plugin-palettes/src/ui/ongletGestion.ts
[nuances]: ../../../../packages/couleur/src/nuances.ts
[plan]: ../../../../packages/plugin-palettes/src/variables/plan.ts
[tests-noms]: ../../../../tests/nomsDePalettes.test.ts
[tests-axes]: ../../../../tests/axesDeModes.test.ts
[onglet-creation]: ../../../../packages/plugin-palettes/src/ui/ongletCreation.ts
[package-racine]: ../../../../package.json
[package-kit]: ../../../../packages/kit/package.json
[package-palettes]: ../../../../packages/plugin-palettes/package.json
[seuils]: ../../../../packages/kit/src/referentiel/contraste.ts
[contraste]: ../../../../packages/plugin-explorateur/src/contraste.ts
[unicite]: ../../../../tests/referentielUnique.test.ts
[produits]: ../../../../packages/kit/src/referentiel/produits.ts
[chemins]: ../../../../packages/kit/src/format/chemins-de-tokens.ts
[axes-socle]: ../../../../packages/kit/src/nommage/chemins-publies.ts
[export-tokens]: ../../../../packages/plugin-exporter/src/tokens/exportTokens.ts
[semantics]: ../../../../packages/plugin-socle/src/composant/contract/semantics.ts
[diagnostic-contrastes]: ../../../../packages/kit/src/lecteurs/diagnostic-contrastes.mjs
[regles-partagees]: ../../../../packages/kit/src/protocoles/nommage.ts
[regles-nomenclature]: ../../../../packages/plugin-nomenclature/src/regles.ts
[extract-rules]: ../../../../packages/plugin-socle/src/composant/contract/extractRules.ts
[guide-regles]: ../../../guides/KIT-DE-REGLES.md
[mouvement]: ../../../../packages/plugin-exporter/src/tokens/mouvement.ts
[parite]: ../../../../packages/adapter-typescript/src/parite.mjs
[nommeur]: ../../../../packages/plugin-palettes/src/variables/nommeur.ts
[vocabulaire]: ../../../../packages/kit/src/referentiel/vocabulaire.ts
[faux-figma]: ../../../../packages/plugin-palettes/tests/figmaDeTest.ts
[check]: ../../../../packages/cli/src/check.mjs
[marque]: ../../../../packages/plugin-palettes/src/ecriture/marque.ts
[code-palettes]: ../../../../packages/plugin-palettes/src/code.ts
[modele-explorateur]: ../../../../packages/plugin-explorateur/src/modele.ts
[ecriture-nomenclature]: ../../../../packages/plugin-nomenclature/src/ecriture.ts
[destination]: ../../../../packages/plugin-palettes/src/variables/destination.ts
[api-create-variable]: https://developers.figma.com/docs/plugins/api/properties/figma-variables-createvariable/
[guide-variables-figma]: https://github.com/figma/mcp-server-guide/blob/main/skills-figquery/figma-use/references/working-with-design-systems/wwds-variables.md
