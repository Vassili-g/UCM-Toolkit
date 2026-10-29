# Intégrité de la structure des tokens

Ce document étudie comment UCM Architect pourrait vérifier la structure des tokens d'un fichier contre ce qu'UCM prévoit. Il propose des contrôles et des corrections. Rien n'est construit. Les décisions attendues sont au §6.

## Le point de départ

Le kit ajoute les variables de thème `surface/subtle` et `surface/divider` (`VARIABLES_DE_PALETTE`, `packages/kit/src/emplois/dossiers.ts`). Le fichier de tokens du mainteneur ne les a pas. Architect ne signale rien.

Les deux contrôles de structure du thème partent des variables qui existent. `controlerLesScopes` (`packages/kit/src/controles/structure.ts`) et `controlerLesModes` (`packages/kit/src/controles/theme.ts`) filtrent `catalogue.variables` sur `etat === 'presente'`. Aucun ne parcourt `VARIABLES_DU_THEME` ni `TABLE_DES_DOSSIERS` pour chercher ce qui manque. Une variable absente ne peut donc produire aucun constat.

Ce contrôle relève du périmètre « UCM complet ». Il suppose que le fichier suit l'architecture UCM : les sept couches de `COLLECTIONS` (`packages/kit/src/referentiel/architecture.ts`) et la table du thème. Un fichier d'une autre architecture n'a pas de variable « attendue ».

## 1. Ce qu'Architect contrôle déjà

### Où et quand

Le mode Tokens lit la structure par `lire-structure` (`packages/plugin-architect/src/sandbox/structure.ts`). Le sandbox relit les variables du fichier, bâtit un catalogue (`catalogueDuFichier`) et appelle `controlerLeCatalogue` du kit. La demande part à chaque message `releve` (`structure.demander()` dans `packages/plugin-architect/src/ui/index.ts`), c'est-à-dire à l'ouverture, à Actualiser et après chaque application.

Un fichier non déclaré UCM reçoit des listes vides, et la Configuration porte la déclaration (« Ce fichier suit l'architecture UCM »). Les rôles des collections (`theme`, `brands`…) ne se déduisent du nom que dans un fichier déclaré (`collectionsDeReference`, `packages/kit/src/controles/catalogue.ts`). Les contrôles ci-dessous, même ceux qui n'ont rien d'UCM, tournent donc tous derrière cette déclaration.

### Le panneau de structure

Le mode Tokens a une disposition large (1360 × 800) avec une barre latérale de 640 px. Elle porte quatre onglets : Corrections, Questions, À faire dans Figma, Règles.

- **Corrections** montre les renommages de Nomenclature, puis les cartes de structure sous les intertitres Modes et Scopes (`packages/plugin-architect/src/ui/structure/corrections.ts`). Chaque ligne se coche. Le pied écrit « Appliquer écrit N corrections de modes et de scopes ».
- **À faire dans Figma** montre les constats sans correction, en cartes sous les intertitres Alias, Modes, Valeurs et Couches (`packages/plugin-architect/src/ui/structure/aFaire.ts`). Le nom de l'onglet porte le nombre de constats. Chaque carte dit le problème, cite les variables et dit où le régler.
- **Questions** porte les questions de Nomenclature. Une question de structure n'y entre pas : un constat de structure avec question reste une carte de À faire, sans bouton de réponse.
- L'écriture passe par `appliquer-structure` (`packages/plugin-architect/src/ecriture/structure.ts`). Elle relit chaque variable, range un journal de structure avant d'écrire et pose un seul point d'annulation. L'Historique défait le dernier lot.

### Inventaire des contrôles

| Contrôle | Code | Fichier du kit | Règle lue | Correction |
|---|---|---|---|---|
| Scopes d'une variable de `theme` | C63, id `C63:<clé>:scopes` | `controles/structure.ts` `controlerLesScopes` | `SUPPORT_DES_VARIABLES[…].portees` | `scope`, toujours (un seul ensemble attendu) |
| Branche de mode d'un alias de `theme` | C60 | `controles/theme.ts` `controlerLesModes` | `TABLE_DES_DOSSIERS` et le mode de la collection | `alias-de-mode` quand un seul candidat existe, sinon question |
| Texte `surface/foreground` sans fond de surface | C59 | `controles/theme.ts` `controlerLeThemeParEtapes` | `page/foreground` comme jumelle | `liaison` quand un seul candidat existe |
| Alias vers une variable supprimée | C63, genre `alias-supprime` | `controles/structure.ts` | l'alias lu | aucune |
| Cible dans une library non activée | C63, genre `library-inactive` | idem | l'état de la cible | aucune |
| Variable sans valeur dans un mode | C63, genre `sans-valeur-en-mode` | idem | les modes de la collection | aucune |
| Couleur de `components` sans alias | C63, genre `couleur-sans-alias` | idem | la valeur lue | aucune |
| Valeur vide parmi des sœurs | C63 avec question | idem | les valeurs des sœurs | question sans réponse possible |
| Doublon dans l'échelle `sizing` | C63 avec question | idem | les valeurs de `layout` | aucune |
| Composant qui vise `brands` au lieu de `theme` | C63 | idem `controlerLesContournements` | `CIBLES_DES_COULEURS_DE_COMPOSANT` | `alias-de-mode` quand un seul candidat existe |

Le profil d'architecture (`packages/plugin-architect/src/integrations/profilUcm.ts`) porte quatre règles de plus : `couche`, `valeur-directe`, `portee` et `nuance`, avec quatre causes de limite. Il reste sans écran (`SPEC.md`, « Modules sans écran »). Il s'active par une association de chaque collection à une couche.

### Ce qu'Architect ne contrôle pas

| Écart | État |
|---|---|
| Une variable attendue qui n'existe pas | aucun contrôle ; c'est le cas déclencheur |
| Le cran que vise l'alias d'une variable de `theme` | seul le profil sans écran (`nuance`) le juge, et il demande la recette de Palettes pour le sens |
| La couche que vise un alias (`CIBLES_DES_COLLECTIONS`) | seul le profil sans écran (`couche`) le juge, sur les couleurs |
| Une couleur qui n'est pas un alias hors de `primitives` | C63 ne juge que `components` ; le profil sans écran (`valeur-directe`) juge le reste |
| Les scopes de `primitives`, `brands`, `utility` (`COLLECTIONS_SANS_PORTEE`) | seul le profil sans écran (`portee`) les juge |
| Les modes attendus de `theme` | aucun contrôle |
| Le type d'une variable de `theme` | aucun contrôle |
| Une variable de `theme` dont le rôle n'est pas reconnu, ou une variable de dossier rangée hors de `theme` | le profil sans écran signale `role-inconnu` en limite ; Nomenclature juge les noms contre la grammaire |

Le kit change ses tables (crans, scopes) à chaque évolution du thème. Un fichier créé avant le changement reste à l'ancienne table. Seuls les scopes se redressent aujourd'hui. Un cran qui a changé dans `TABLE_DES_DOSSIERS` ne produit aucun constat.

## 2. Ce que l'intégrité de la structure peut couvrir

### Le périmètre UCM complet et ses conséquences

- Le contrôle s'exécute seulement dans un fichier déclaré UCM. C'est déjà la condition de tout le panneau de structure.
- Les attentes viennent de la version du kit embarquée dans le plugin. Un fichier en retard sur le kit reçoit des constats à chaque évolution de la table. Il faut donc un moyen d'accepter un écart (question Q6).
- Les registres de palettes, de marques et de modes sont extensibles (`REGISTRE_PALETTES`, `REGISTRE_MARQUES`, `REGISTRE_MODES`). Le contrôle ne juge que les noms qu'il reconnaît. Pour le reste, il dit ce qu'il n'a pas pu contrôler, comme les limites du profil, et ne condamne rien.
- Les nouveaux contrôles forment une fonction à part du kit, par exemple `controlerLIntegriteUcm(catalogue)`. `controlerLeCatalogue` mélange aujourd'hui des contrôles agnostiques (alias supprimé, mode sans valeur) et des contrôles UCM (scopes, modes). Séparer les deux permet un jour d'ouvrir les premiers hors déclaration. Ce déplacement n'est pas proposé ici.

### Ce qu'on peut affirmer

Une affirmation de ce document tient en deux faits : une règle écrite dans le kit (une constante) et un fait lu dans le fichier. Sans l'un des deux, le contrôle ne conclut pas. Il rend alors un constat « À vérifier » sans correction, ou il se tait quand aucun geste n'est demandé (`.agents/skills/rediger-diagnostics-ucm/SKILL.md`).

| Verdict | Type du constat | Quand |
|---|---|---|
| Écart établi, correction exacte | `corriger`, avec `correction` | la règle donne un seul résultat et le fichier porte tout ce qu'il faut |
| Écart établi, pas de correction exacte | `corriger` sans correction, ou `verifier` | la règle dit qu'il y a un écart, le fichier ne dit pas comment le fermer |
| Fait insuffisant | `verifier`, ou silence | la règle ne s'applique qu'à un nom que le contrôle ne reconnaît pas |

### Contrôle par contrôle

**A. Variable attendue absente (`theme`).** Le kit prévoit trois ensembles.

| Ensemble | Constante | Attendu dans |
|---|---|---|
| Variables d'une palette | `VARIABLES_DE_PALETTE` (15) | chaque groupe de palette : une marque, `neutral`, ou un statut avec son profil (`palettesDuTheme` dans `architecture.ts`) |
| Variables du neutre | `VARIABLES_DU_NEUTRE` (4) | le groupe `neutral` |
| Variables globales et élévations | `VARIABLES_GLOBALES` (3), `NIVEAUX_D_ELEVATION_DU_THEME` (2) | une fois dans `theme`, sans groupe |

Un groupe de palette est un préfixe de nom sous lequel au moins une variable de `VARIABLES_DE_PALETTE` existe, reconnue par `variableDuThemeReconnue`. Ce critère ne suppose aucun nom de palette. Le groupe `theme/success/soft` est un groupe, `theme/primary` aussi.

Une variable est attendue dans un groupe quand son cran existe dans la rampe visée (`variablePresente`, `dossiers.ts`). Le kit tient ce principe pour les palettes de Palettes : une rampe sans le cran 50 n'a pas `surface/subtle`. La rampe d'un groupe se lit par les alias de ses variables existantes. Quand le cran manque à la rampe, le manque appartient à la rampe, pas à `theme` (voir C ci-dessous).

On n'affirme pas qu'une palette doit exister. Une marque présente dans `brands` sans groupe dans `theme`, ou un statut avec un seul profil, sont des choix possibles (`REGISTRE_INTENSITES` admet une intensité unique). Le contrôle se tait.

**B. Cran visé.** `TABLE_DES_DOSSIERS` donne le cran de chaque variable, par mode et par sens (`normal` ou `inverse`). On affirme qu'un alias qui vise un cran absent des deux sens est un écart. On affirme le cran exact seulement si le sens est connu ou sans effet. Pour les variables suivantes, le cran est le même dans les deux sens :

- en Light : `solid/default`, `surface/default`, `surface/hover`, `surface/pressed`, `surface/subtle`, `surface/divider`, `page/divider` ;
- en Dark : les mêmes, plus `surface/foreground` et `surface/border`.

Pour les autres, le sens vient d'une jumelle de la même palette dont le cran distingue les sens (`solid/hover` par exemple : 800 contre 600). C'est la méthode de C60 (`formesDeCiblesAttendues`). Quand les jumelles ne tranchent pas, le contrôle pose une question. `solid/foreground` ne vise pas un cran (`'texteDesBoutons'`) : son choix dépend de la recette de Palettes et reste une question.

**C. Couche cible de l'alias.** `CIBLES_DES_COLLECTIONS` et `ciblesAdmises` donnent les couches qu'un alias peut viser : `components` vise `theme` pour une couleur, `theme` vise `brands` ou `utility`, les autres visent `primitives`, `primitives` ne vise rien. On affirme l'écart pour les couleurs. Pour une taille ou une typographie, la table est plus large et le profil ne les juge pas : pas de contrôle. Une couleur qui n'est pas un alias, hors de `primitives`, est un écart (`valeur-directe`). La correction exacte n'existe que dans le cas déjà couvert par C63 (composant qui vise `brands`, une sœur donne la cible).

Un cran manquant à une rampe de `brands` ou `utility` est un écart de rampe. Il se signale avec le nom de la rampe, et Palettes le corrige.

**D. Scopes.** `SUPPORT_DES_VARIABLES` couvre `theme` : le contrôle existe. `COLLECTIONS_SANS_PORTEE` ajoute `primitives`, `brands` et `utility` : on affirme qu'aucun scope n'y est posé. La correction est exacte (un seul ensemble, vide), comme la correction `scope` d'aujourd'hui. Les variables `scale/<cran>` n'imposent aucun scope (`REGLE_SCALE`) et ne se jugent pas.

**E. Modes.** `AXES_DES_COLLECTIONS.theme` rattache `theme` au registre des modes (`light`, `dark`). On affirme qu'une collection `theme` qui n'a aucun mode reconnu comme `light`, ou aucun reconnu comme `dark`, ne sert pas l'axe `data-theme`. Un mode que le contrôle ne reconnaît pas (le registre est extensible) n'est jamais une erreur : il devient une limite. Les modes de `brands` sont des marques (`REGISTRE_MARQUES` est vide) et ceux de `primitives` dépendent de `PLACES_DES_THEMES` : aucune attente affirmable. Il n'y a pas de correction : ajouter un mode demande de donner une valeur à chaque variable.

**F. Type.** Toute variable de `theme` est une couleur (`SUPPORT_DES_VARIABLES` ne décrit que des peintures). Une variable de dossier de type nombre est un écart. Figma ne change pas le type d'une variable : pas de correction.

**G. Variable en trop ou mal rangée.** Une variable de `theme` dont le rôle n'est pas reconnu sort de la grammaire (`FORMES_DES_CHEMINS.theme`). Nomenclature juge déjà les noms. Le contrôle d'intégrité n'ajoute que le cas d'une variable de dossier à deux segments au moins (`surface/default`) trouvée dans `brands`, `utility`, `primitives`, `layout` ou `typography`. Un dossier à un seul segment (`ring`) se retrouve dans les composants (`components/Button/color/focus/ring`) : il est exclu. Aucune correction : déplacer une variable casse ses liaisons.

### Collection par collection

| Collection | Ce que le kit prévoit | Contrôles affirmables | À demander |
|---|---|---|---|
| `primitives` | `DESTINATION_DES_PALETTES`, `FORMES_DES_CHEMINS.primitives`, cibles vides, sans scope | D (scopes vides), C (un alias est un écart) | la place des thèmes (chemin ou modes) : le fichier la porte, le kit non |
| `brands` | cible `primitives`, sans scope | C, D, valeur directe | les modes sont des marques : rien d'attendu |
| `utility` | cible `primitives`, sans scope ; `neutral`, statuts, `elevation` | C, D, valeur directe | idem |
| `theme` | la table en entier | A, B, C, D, E, F, G | variables sans cran du neutre (A) ; groupe entier absent |
| `layout` | cible `primitives`, aucun ensemble requis | aucun contrôle de présence | si les tailles de `layout` doivent être des alias (le kit ne le dit pas) |
| `typography` | cible `primitives`, aucun ensemble requis | aucun contrôle de présence | idem |
| `components` | cibles `theme` (couleurs), `layout`, `typography` | C pour les couleurs, valeur directe (déjà en C63) | le jeu de variables dépend du composant : la préparation le dresse |

## 3. Les corrections et la préparation des tokens

### Ce que la préparation fait déjà

`creerLesVariables` (`packages/plugin-architect/src/ecriture/variables.ts`) crée les variables manquantes d'une préparation dans la collection `components`, avec un alias par mode. Elle porte déjà ce dont une correction de structure a besoin :

- l'état lu dans le fichier à chaque passage (`existe-identique`, `existe-divergente`, `a-creer`), donc une reprise sans doublon ;
- un alias par mode, par nom de mode (`ciblesParMode`) ;
- le journal de structure (ligne `creation`) et un point d'annulation, avec la garde qui refuse de supprimer une variable devenue utilisée ;
- les refus sans écriture (`hors-ucm`, `sans-cibles`, `mode-sans-cible`, `cible-introuvable`, `type-incompatible`).

`Correction.sorte` du kit (`packages/kit/src/controles/constat.ts`) prévoit déjà la valeur `variable`, que rien n'utilise.

### Ce qui ne se réutilise pas

- Le texte échangé `ucm-preparation` et le rangement dans `clientStorage` servent à passer d'un fichier à l'autre. Une correction de structure se lit et s'écrit dans le même fichier.
- `preparerLesTokens` (`packages/kit/src/controles/preparation.ts`) part d'un composant. La structure part du catalogue.
- La destination et les cibles sont fixées à `components` et à `theme` ou `layout` (`COUCHE_DES_COMPOSANTS`, `COUCHE_DES_COULEURS`, `COUCHE_DES_TAILLES`, `packages/plugin-architect/src/preparations.ts`). Une variable de `theme` a pour destination `theme` et pour cibles `brands` et `utility`.
- La préparation ne pose pas de scope. Une variable que Figma crée porte tous les scopes. Une variable de `theme` créée sans scope serait signalée par `controlerLesScopes` à l'analyse suivante.

La création de structure garderait donc le cœur de `creerLesVariables` (états, alias par mode, journal, annulation) avec une destination et un jeu de cibles passés en paramètres, et une liste de scopes posée à la création. L'invariant « Une préparation ne crée que les variables manquantes de `components` » (`packages/plugin-architect/invariants/explorateur.md`) et la ligne « Créer » de la `SPEC.md` demandent alors une phrase de plus (question Q3).

### Ce qu'une création peut affirmer

Une variable `theme/<groupe>/<dossier>/<rôle>` manquante se crée avec un alias par mode quand toutes les conditions suivantes tiennent.

| Condition | Pourquoi elle tient sans supposition |
|---|---|
| Le groupe a au moins une variable avec un alias dans ce mode vers `brands` ou `utility` | le préfixe de cible vient du fichier, pas d'un nom de palette deviné |
| Toutes les jumelles de ce mode partagent le même préfixe de cible | un seul candidat |
| Le cran de la table existe dans cette rampe sous ce préfixe | une seule variable cible |
| Le cran est le même dans les deux sens, ou le sens se déduit d'une jumelle (B) | la table donne un seul résultat |
| Chaque mode de `theme` a une cible | `ciblesParMode` refuse sinon (`mode-sans-cible`) |

Le nom de la cible se forme en gardant le préfixe de la jumelle et en remplaçant son dernier segment par le cran de la table. La jumelle d'un mode `light` qui vise `brands/primary/light/100` donne `brands/primary/light/50` pour `surface/subtle`. Le segment de mode vient de la jumelle : le contrôle ne le recompose pas.

Les scopes viennent de `SUPPORT_DES_VARIABLES`. Le type est `COLOR`.

Deux ensembles se créent sans jumelle, parce que la règle donne la cible. `disabled/*` vise `utility/neutral/<mode>/<cran>` : `cranDeLaVariable` donne 200, 500 et 500. `elevation/*` vise la variable de `utility` de forme `elevation/<mode>/<niveau>` (`FORMES_DES_CHEMINS.utility`). Dans les deux cas, la création est exacte quand une seule variable de `utility` répond à la forme. Sinon, c'est une question.

### Ce qui ne s'affirme pas

| Cas | Pourquoi | Que faire |
|---|---|---|
| Quelle palette viser pour un groupe sans jumelle aliasée | associer `theme/primary` à `brands/primary` par le nom est une supposition de mapping | constat sans correction ; la liste des rampes candidates peut s'afficher sans rien cocher |
| Un groupe sans rampe (aucune jumelle n'a d'alias) | même raison | idem |
| Un cran absent de la rampe | `brands` et `utility` relèvent de Palettes et du designer, pas d'Architect | constat de rampe, sans création |
| Le sens d'une variable qui en dépend, quand les jumelles ne le donnent pas | `texteDesBoutons` vient de la recette de Palettes, que le fichier ne porte pas | question |
| `solid/foreground` | le kit donne `'texteDesBoutons'`, pas une variable | question |
| `page/foreground-main`, `scale/0`, `scale/1000` | `cranDeLaVariable` rend `undefined` ; seule la définition en texte (`theme.ts`) dit « blanc en Light, noir en Dark » | constat sans correction, tant que le kit ne porte pas la cible |
| Le nom écrit (casse, séparateur) | Nomenclature fixe une convention par fichier | voir Q5 |
| La publication | une variable créée dans une library n'est visible des fichiers de composants qu'après publication | voir Q10 |

## 4. Le cas à traiter d'abord : `surface/subtle` et `surface/divider`

### Le constat

Pour chaque groupe de palette de `theme`, deux variables manquent. Le kit prévoit :

| Variable | Light | Dark | Scopes | Sens |
|---|---|---|---|---|
| `surface/subtle` | 50 | 100 | Frame fill, Shape fill | sans effet |
| `surface/divider` | 300 | 500 | Frame fill, Shape fill, Stroke | sans effet |

Les deux crans sont identiques dans les deux sens (`TABLE_DES_DOSSIERS`). Le sens ne bloque donc pas.

Pour un fichier à `primary`, `secondary`, `neutral` et quatre statuts en `soft` et `vivid`, il y a 11 groupes, 22 variables et 44 alias.

Le contrôle fait, pour chaque groupe :

1. Il liste les variables de dossier du groupe (15 attendues).
2. Il relève `surface/subtle` et `surface/divider` absentes.
3. Dans chaque mode, il prend une jumelle aliasée, par exemple `surface/default`, et lit le préfixe de sa cible (`brands/primary/light/`).
4. Il cherche `…/light/50` et `…/dark/100` dans la collection cible. Si les deux existent, la correction est exacte. Si l'un manque, le constat reste sans correction et dit quel cran manque à quelle rampe.

Le constat porte le code d'un contrôle nouveau (le suivant libre est C82), avec un `genre` `variable-absente` comme les genres de C63. Ses faits : la variable attendue, le groupe, le cran de chaque mode, la cible de chaque mode.

### La carte de correction

La maquette ci-dessous suit les cartes de modes et de scopes de l'onglet Corrections (`packages/plugin-architect/src/ui/structure/corrections.ts`) : une phrase, une ligne grise, un corps qui se déplie avec les colonnes « Aujourd'hui » et « Après l'application ». Elle est un texte. La mise en page viendra d'une maquette sur la galerie réelle, en sombre.

```text
Variables manquantes                                       (intertitre)

[ ] Créer surface/subtle dans 11 palettes de theme         (case de carte) v
    UCM prévoit cette variable dans chaque palette.
    En Light elle vise le cran 50, en Dark le cran 100.

    Aujourd'hui                     Après l'application
    [x] theme/primary/surface/subtle
        absente                     theme/primary/surface/subtle
                                    Light : brands/primary/light/50
                                    Dark : brands/primary/dark/100
                                    Scopes : Frame fill, Shape fill
    [x] theme/secondary/surface/subtle
        absente                     …
    [x] theme/neutral/surface/subtle
        absente                     Light : utility/neutral/light/50
                                    Dark : utility/neutral/dark/100
    [x] theme/success/soft/surface/subtle
    …

[ ] Créer surface/divider dans 11 palettes de theme        v
    UCM prévoit cette variable dans chaque palette.
    En Light elle vise le cran 300, en Dark le cran 500.
    …

Pied : Appliquer écrit 22 corrections de structure.        [Appliquer]
```

Une carte regroupe les lignes d'un même rôle, comme la carte de scopes regroupe les variables d'un même dossier. Le designer coche la carte ou une ligne. Les cases sont cochées par défaut, comme celles des scopes : la correction est exacte, donc rien n'est à choisir.

Une palette que la règle ne permet pas de corriger paraît dans À faire dans Figma, sous un intertitre « Variables manquantes » :

```text
Variables manquantes

[À corriger] Cette palette n'a pas surface/subtle.
             theme/tertiary
             Aucune variable de cette palette n'a d'alias vers brands.
             Créez surface/subtle dans la fenêtre Variables.
```

Ces textes suivent `.agents/skills/rediger-diagnostics-ucm/SKILL.md`. Ils gardent « theme », « brands », « Light », « Dark », « Frame fill » tels que Figma et UCM les écrivent. Ils disent « scope », jamais « portée ».

### La correction

L'application écrit, pour chaque ligne cochée : la variable dans la collection `theme`, son alias dans chaque mode, ses scopes. Elle relit avant d'écrire (la variable n'existe toujours pas, la cible existe encore), range une ligne `creation` au journal de structure et pose un seul point d'annulation. L'Historique défait le lot. La ligne de réussite dit « 22 corrections écrites ». Le pied d'aujourd'hui dit « de modes et de scopes » : il devient « de structure ».

Si une variable de même nom existe déjà dans `theme` avec un autre type ou un autre alias, la ligne est sautée avec un motif, comme `existe-divergente` aujourd'hui.

## 5. Ce que le contrôle coûte, et quand il tourne

### Coût

Le calcul est linéaire dans le nombre de variables. Il construit un index des variables par collection et par préfixe, puis parcourt les groupes de palettes. Une mesure de `controlerLeCatalogue` tel qu'il est, faite pour ce document sur un catalogue fabriqué de `theme` et de `brands`, donne 12 ms pour 370 variables, 41 ms pour 1 480 et 85 ms pour 3 700 (Node, hors Figma). Le nouveau contrôle ajoute une durée du même ordre.

Le coût qui compte est la lecture du fichier. `lire-structure` relit toutes les variables par `lireLesVariables`, alors que le mode Tokens vient de les lire pour son relevé. Ce second passage dépasse le calcul. Il est déjà payé aujourd'hui, à chaque `releve`. Réutiliser le relevé est une piste d'optimisation à examiner, hors de ce document. Le coût d'un fichier réel n'a pas été chronométré dans Figma.

### Quand il tourne

| Option | Pour | Contre |
|---|---|---|
| **À chaque analyse de composant** | le designer voit le manque quand il en a besoin | le catalogue du mode Composant ne lit que `theme`, `layout` et `components` (`COUCHES_LUES`, `packages/plugin-architect/src/catalogue.ts`), sans `brands`, `utility` ni `primitives`, et ses valeurs restent à importer. Le contrôle ne peut ni lire la rampe ni corriger. L'analyse de Button a mis 5 s à froid et 2 s après la prélecture : ce coût ne doit pas croître |
| **Dans la lecture de structure du mode Tokens** | le catalogue du fichier est complet ; la correction s'écrit dans le fichier qui porte `theme` ; l'onglet Corrections et le journal existent | le manque se voit en ouvrant le mode Tokens, pas pendant l'analyse du composant |
| **Dans une vue « Structure » séparée** | une vue dédiée à la santé du fichier | une vue de plus, alors que Corrections et À faire dans Figma jouent déjà ce rôle, avec leurs comptes sur les onglets |

La recommandation est la deuxième option. Le mode Composant garde un seul lien : la préparation des tokens.

### Le lien avec la préparation d'un composant

`preparerLesTokens` calcule la cible attendue d'une couleur (`theme/<palette>/…/<variable>`). Si cette variable manque dans `theme`, `themeAvec` rend `undefined` et la couleur rejoint `couleursSansCible`, « laissée en dur » (`packages/kit/src/controles/preparation.ts`). Le designer lit alors qu'aucun token ne convient. La phrase est fausse quand la règle d'UCM prévoit bien une cible et que seul le fichier ne l'a pas.

Le contrôle d'intégrité fait la distinction. Une couleur sans cible UCM reste « en dur ». Une couleur dont la cible est prévue par la table mais absente du thème reçoit une raison propre : « `theme/primary/surface/subtle` manque dans le thème. » Aucune lecture de plus n'est nécessaire, car `cible` et `variable` sont déjà calculées à cet endroit (question Q9).

## 6. Les questions à trancher

| N° | Question | Options | Recommandation |
|---|---|---|---|
| Q1 | Qu'est-ce qui active le contrôle ? | (a) la déclaration UCM du fichier, comme tout le panneau de structure ; (b) la déclaration plus un réglage par famille de contrôle | (a). Les exceptions (Q6) couvrent un fichier en retard sur le kit |
| Q2 | Où le contrôle tourne-t-il ? | (a) à chaque analyse de composant ; (b) dans la lecture de structure du mode Tokens ; (c) dans une vue « Structure » séparée | (b). Le catalogue du mode Composant n'a pas `brands`, `utility` ni `primitives` |
| Q3 | Architect peut-il créer des variables dans `theme` ? Le seul périmètre d'écriture aujourd'hui est `components` | (a) oui, en corrections cochables, avec journal et annulation ; (b) non, constat seul dans À faire dans Figma | (a). Palettes refuse déjà d'écrire dans `theme` en UCM complet (`COUCHES_SANS_PALETTES`) et aucun plugin UCM n'y crée de variable aujourd'hui |
| Q4 | Le sens (`normal` ou `inverse`) se déduit-il d'une jumelle ? | (a) oui quand une seule jumelle le tranche, sinon question ; (b) toujours une question ; (c) le premier temps ne traite que les variables sans effet du sens | (c) puis (a). `surface/subtle` et `surface/divider` n'en dépendent pas |
| Q5 | Comment s'écrit le nom d'une variable créée ? | (a) la casse et le séparateur de la jumelle, segment par segment ; (b) la forme du kit (`subtle`, `divider`) ; (c) la convention de variables que Nomenclature a retenue pour le fichier | (a) quand la casse de la jumelle est sans ambiguïté, sinon (c) ; sans convention, refuser la création |
| Q6 | Comment accepter l'absence voulue d'une variable ? | (a) aucun moyen ; (b) ignorer une variable pour un groupe ; (c) ignorer un rôle pour tout le fichier (« je n'utilise pas `surface/divider` ») | (b) et (c), rangés comme les Ignorer actuels (`CLES_D_ARCHITECT.ignorer`). Les constats de structure n'ont pas d'Ignorer aujourd'hui |
| Q7 | Que faire des variables du neutre sans cran (`page/foreground-main`, `scale/0`, `scale/1000`) et de `solid/foreground` ? | (a) constat sans correction ; (b) ajouter au kit une cible machine-lisible pour chacune, puis créer | (a) maintenant. Le mainteneur dit, pour (b), vers quelle variable de `utility` chacune pointe |
| Q8 | Le cran visé (B) entre-t-il dans le même premier temps ? Chaque évolution de la table produit alors une carte par rôle | (a) oui ; (b) après les variables manquantes ; (c) non | (b). Le mécanisme est celui de C60, mais il touche des variables déjà bonnes à l'ancienne table |
| Q9 | La préparation d'un composant dit-elle qu'une cible prévue par UCM manque dans `theme` ? | (a) oui, raison propre dans la feuille ; (b) non, « en dur » comme aujourd'hui | (a). La phrase actuelle est fausse dans ce cas |
| Q10 | Après une création dans une library, que dit la ligne de réussite de la publication ? Le plugin ne publie pas | (a) une phrase « Publiez la library pour voir ces variables dans les fichiers de composants » ; (b) rien | (a). Le geste existe déjà entre Préparer et Lier ; il ne s'invente pas ici |
| Q11 | Un mode attendu qui manque dans `theme` (E) se signale-t-il ? Le plugin ne l'ajoute pas | (a) constat « À faire dans Figma » ; (b) silence | (a), seulement quand `theme` n'a ni `light` ni `dark` reconnu |
| Q12 | Que fait-on du profil sans écran (`profilUcm.ts`) ? Ses règles `couche`, `valeur-directe` et `portee` recoupent C et D | (a) laisser tel quel ; (b) porter ces trois règles dans la fonction du kit et retirer les doublons du plugin | (b), dans un second temps. `nuance` reste l'objet de Q8 |
| Q13 | Quel code porte le nouveau contrôle ? | (a) un code neuf (C82) avec des genres ; (b) des genres de plus sous C63 | (a). C63 mélange déjà neuf cas |

### Décisions

| N° | Décision |
|---|---|
| Q1 | (a) : la déclaration UCM du fichier suffit |
| Q2 | (b) : dans la lecture de structure du mode Tokens |
| Q3 | (a) : Architect crée des variables dans `theme`, en corrections cochables, avec journal et annulation |
| Q4 | (a) : le sens se déduit d'une jumelle quand une seule jumelle le tranche ; sinon, une question |
| Q5 | (c) : le nom suit la convention de variables de Nomenclature |
| Q6 | (b) et (c) : ignorer une variable pour un groupe, ou un rôle pour tout le fichier |
| Q7 | (b) : le kit porte une cible pour chacune. `scale/0` : blanc en Light, noir en Dark. `scale/1000` et `page/foreground-main` : noir en Light, blanc en Dark. `solid/foreground` : blanc en Light et noir en Dark dans le sens `normal`, l'inverse dans le sens `inverse` |
| Q8 | (a) : le cran visé entre dans le contrôle. Correction quand le cran est exact (sens sans effet ou déduit par Q4), sinon une question |
| Q9 | (a) : raison propre dans la feuille de préparation |
| Q10 | (a) : la ligne de réussite demande de publier la library |
| Q11 | (a) : constat « À faire dans Figma » quand `theme` n'a ni `light` ni `dark` reconnu, et quand l'un des deux manque |
| Q12 | (b) : `couche`, `valeur-directe` et `portee` passent dans la fonction du kit ; les doublons du plugin sont retirés |
| Q13 | (a) : un code neuf, C82 |
