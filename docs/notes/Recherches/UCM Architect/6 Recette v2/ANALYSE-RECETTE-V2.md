# Recette v2 d'Architect : analyse et propositions

Ce document part de la recette Figma du mode Composant du 28 octobre, sur
Button, Alert et Stresstest. Chaque point de la recette y reçoit sa cause,
lue dans le code, et une proposition. Rien n'est implémenté.

La maquette [MAQUETTE-RECETTE-V2.html](./MAQUETTE-RECETTE-V2.html) montre les
propositions d'interface sur les écrans réels figés de la galerie d'Architect.
Les questions au mainteneur sont numérotées à la suite de la recette v1, de
R-11 à R-24. La section 10 les réunit avec leur état ; la maquette les reprend
en section 8.

Le mainteneur a relu une première version de la maquette. Ses réponses sont
reportées dans chaque section. Trois sujets restent en discussion : le bouton
de modèle (section 4), le radius de `.Ring` (7.3) et l'accessibilité des
variants désactivés et sans fond (7.4 et 7.5).

## 1. Fenêtre, barre et panneau

| Point de la recette | Ce que fait le code | Décision |
|---|---|---|
| La fenêtre s'ouvre trop large en mode Composant | Panneau fermé, la fenêtre prend 520 px (`TAILLE_ETROITE`, `src/fenetre.ts:25`), ou la dernière taille rangée sous `ucm-explorateur/tailleFenetreEtroite`. Panneau ouvert : 1040 px | Panneau fermé : 500 px, qui est aussi la largeur minimale. Panneau ouvert : la vue garde sa largeur et le panneau s'ajoute à droite, 560 px. La fenêtre passe à 1060 px (R-11) |
| Analyser ouvre aussi le panneau des constats | Le clic n'envoie que `analyser` (`src/ui/application.ts:226`). Seuls le bouton Constats et le collage d'une préparation ouvrent le panneau. La lecture du code n'explique pas ce que la recette a vu | Reproduire dans Figma avec le build courant. Un test d'interface vérifie que le panneau reste fermé après Analyser |
| La frontière entre la vue et le panneau lâche la souris | Le geste repose sur `setPointerCapture` et écoute la poignée seule (`src/ui/composant/corps.ts:47`). Dans Figma, Chromium retire la capture en cours de geste : le suivi s'arrête dès que la souris quitte la poignée | Reprendre le geste de la poignée des colonnes (`src/ui/poignee.ts`) : suivi sur `window` en phase de capture, fin au relâchement ou quand la souris sort de la fenêtre |
| Configuration change la largeur de la fenêtre | En mode Composant, `ouvrirLaConfiguration` passe d'abord en mode Tokens, qui redimensionne à 1360 px (`src/ui/application.ts:187`) | La Configuration s'ouvre à la place du contenu de la fenêtre, à sa largeur |
| Configuration fait quitter le mode Composant | Même cause : le passage en mode Tokens vient du commit `cc678b6d` | Le mode reste celui de départ. La bascule Tokens / Composant ne change pas |
| Un second clic sur Configuration ne la ferme pas | Le bouton renvoie le même événement d'ouverture. Seul le bouton Retour de la Configuration la ferme | Le bouton devient une bascule (`aria-pressed`). Le second clic ferme la Configuration et rend l'écran précédent : panneau, section ouverte, défilement |
| Actualiser reste actif sans composant sélectionné | `selectionSurLAnalyse` rend vrai quand la sélection est vide (`src/ui/composant/analyse.ts:78`) | Analyser et Actualiser sont désactivés tant qu'aucun composant n'est sélectionné. La bulle dit « Sélectionnez un composant dans Figma » |

### La barre compacte

La barre compacte vaut à toutes les largeurs du mode Composant (cadre 1b) :

- le logo et le nom « UCM Architect » disparaissent : la bascule vient en tête ;
- Actualiser devient un bouton à icône, avec sa bulle ;
- Constats garde son icône et sa pastille, sans son mot ;
- Configuration reste un bouton à icône.

Les bornes minimales passent à 500 px pour la fenêtre (`src/fenetre.ts:31`)
et pour la vue (`src/ui/composant/corps.ts:19`). Une taille rangée plus grande
garde la priorité à l'ouverture : le designer qui a agrandi sa fenêtre la
retrouve. Une taille rangée plus petite que 500 px remonte à 500 px.

### La Configuration à 500 px

Les formulaires de la Configuration ont été validés à 640 px. À 500 px, une
ligne à deux colonnes peut ne plus tenir. R-12 demande si ces formulaires
passent sur une colonne à cette largeur.

## 2. Changer de variant sans que l'écran saute

Décidé : la proposition est retenue.

### Ce qui se passe

Un clic sur une valeur de la section Variants rend l'écran trois fois
(`src/ui/vues/composant.ts`).

1. `demander` passe la lecture à « en cours ». `rendre()` vide le corps et
   affiche « Lecture du composant… » : l'en-tête, l'aperçu, la section Variants
   et la liste disparaissent. La hauteur de la page change.
2. La lecture arrive. `recevoirLecture` efface l'aperçu, oublie les choix
   (lignes et sections ouvertes, filtre) et reconstruit tout le corps.
3. L'aperçu arrive. `recevoirApercu` crée une nouvelle image et reconstruit
   encore tout le corps.

Le défilement n'est pas gardé. Seul le dépliage des properties survit.

### Ce qui change

Pour un autre variant du même jeu, l'écran reste en place et seules les
valeurs changent.

- L'ancienne lecture reste affichée pendant la lecture. Une barre fine sous
  l'en-tête dit que la lecture est en cours. L'écran « Lecture du composant… »
  reste pour un nouveau composant.
- La vue met à jour ses éléments par clé au lieu de les recréer. Une ligne de
  token garde sa place quand son token existe dans les deux variants.
- L'aperçu garde la hauteur de son cadre. La nouvelle image remplace
  l'ancienne une fois chargée.
- Les sections ouvertes, le filtre et le défilement sont gardés.
- Une valeur qui change est surlignée pendant 600 ms, sans mouvement.

Ce travail touche la fonction de rendu de la vue entière : il revient à un lot
`implementeur-exigeant`, avec un test d'interface qui compare la position des
éléments avant et après un changement de variant.

## 3. Le langage visuel des variants

Décidé (R-13) : la forme B dans la section Variants, la forme C dans les
constats, avec les puces de la forme A.

### Aujourd'hui

Un variant s'écrit partout comme Figma le nomme :
`Color=Primary, Variant=Contained, State=Default`. CONTRIBUTING.md en fait une
règle (« Messages destinés au designer »). Il apparaît :

- sous la section Variants, après « Affiché » (`src/ui/composant/variants.ts:296`) ;
- dans la phrase des constats et dans leur ligne de lieu (`src/ui/ignores/modele.ts:101`) ;
- dans les cartes de corrections et de questions.

Le nom complet est long, la valeur utile se perd, et le lieu d'un constat
mélange un nom de variant et une phrase comme « Tous les variants
désactivés ». Ce texte est fixe (`src/ui/textes/ignores.ts:93`) : il dit
« tous » quelle que soit la part des variants exclus.

### Les formes

| Forme | Où | Ce qui change |
|---|---|---|
| A. Une puce par paire | Section Variants et constats | Chaque paire devient une puce : property et signe égal en gris, valeur en clair |
| B. La section suffit | Section Variants | La ligne « Affiché » disparaît : la valeur choisie de chaque ligne de property dit déjà le variant |
| C. La ligne de lieu porte les variants | Constats | La phrase ne nomme plus le variant. La ligne de lieu donne le nombre de variants, puis les puces des seules paires qu'ils partagent : 36 variants, `State=Focus` |
| D. Deux colonnes | Constats | Écartée |

Une puce garde le texte exact de Figma, `State=Disabled`, pour que le designer
puisse le chercher. Elle ne prend pas de couleur : la couleur reste aux
alertes.

| Ligne de lieu aujourd'hui | Ligne de lieu retenue |
|---|---|
| Tous les variants désactivés | 18 variants, puis la puce `State=Disabled` |
| Tous les variants | Tous les variants |
| Layer container | Layer `container`, puis le bouton Sélectionner |

La règle de CONTRIBUTING.md change : un variant garde les noms et les valeurs
de Figma, en puces d'une paire chacune.

## 4. Le bouton « Copier ses liaisons aux autres variants »

En discussion (R-14). Le mainteneur a jugé le libellé, la phrase et l'exemple
plus clairs, mais ne voit pas l'intérêt de la fonction. Il trouve aussi que
cela fait trop d'information sous la section Variants.

### Ce qu'il fait

Le bouton prend le variant affiché comme modèle (`proposerLaPropagation`,
`packages/kit/src/controles/propagation.ts`). Pour chaque liaison du modèle et
chaque autre variant :

1. il cherche le layer au même chemin dans l'autre variant ;
2. il prend le token du modèle et remplace les segments de property par les
   valeurs de l'autre variant ;
3. si ce token existe et n'a qu'un candidat, il propose la liaison. Sinon, il
   pose une question.

Exemple sur Button. Le modèle `Color=Primary, Variant=Contained, State=Default`
lie le fill de `container` à `Color/Primary/Contained/Default/background`. Pour
`Color=Info, Variant=Outlined, State=Hover`, le bouton propose
`Color/Info/Outlined/Hover/background`.

Rien n'est écrit dans Figma avant Appliquer.

### Son intérêt

Sans ce bouton, l'analyse ne propose aucune liaison pour une couleur en dur.
Seul le fill d'un texte nommé `title` reçoit une proposition (C25,
`packages/kit/src/controles/corrections.ts`). Les tailles en dur reçoivent
C29, qui cherche un token du composant de même valeur.

Le cas qu'il sert : les tokens de Button existent, et les layers de ses 216
variants ne sont pas liés. Le designer lie un seul variant à la main, une
dizaine de liaisons. Le bouton propose les liaisons des 215 autres, soit plus
de deux mille gestes épargnés. C'est la « correspondance fastidieuse » que le
mode Composant devait prendre en charge.

La préparation des tokens couvre un autre cas : elle crée les tokens qui
manquent, puis lie les layers à ces tokens. Le bouton sert quand les tokens
existent déjà, créés à la main ou après un renommage.

### Où le mettre

Le bouton est mal placé. La section Variants sert à choisir le variant
affiché. Le bouton y apparaît sur tous les composants, même entièrement liés,
où il ne propose rien.

| Option | Ce que voit le designer |
|---|---|
| a. Une carte dans le panneau des constats | Une carte dans Couleurs ou Tailles et forme, seulement quand des layers sont liés dans un variant et en dur dans d'autres. Le plugin prend comme modèle le variant qui porte le plus de liaisons et le nomme. Un bouton « Proposer les liaisons » ajoute les corrections, à appliquer ensuite |
| b. Un menu discret dans la section Variants | Un bouton « … » à côté du titre Variants, avec « Lier les autres variants sur ce modèle ». La phrase et l'exemple vont dans le résultat |
| c. Retirer la fonction | Le designer lie chaque variant dans Figma, ou passe par la préparation des tokens |

Recommandation : a. La fonction apparaît là où le problème est signalé, et
seulement quand elle propose quelque chose. Le designer n'a pas à choisir le
modèle. Le cadre 4d de la maquette la montre.

## 5. Le tableau des variants

Décidé (R-15) : le tableau disparaît. La section Variants garde une ligne par
property. Le bouton « Tableau », `basculerLeTableau`
(`src/ui/vues/composant.ts:423`), le rendu croisé (`src/ui/composant/variants.ts:213`)
et le texte « Croiser deux properties » partent avec lui, ainsi que les états
de galerie qui le montrent.

## 6. Sélectionner le layer d'un constat

Décidé (R-16) : un bouton « Sélectionner » dans l'en-tête de chaque carte qui
vise des layers, questions comprises. Il porte le signe de la sélection de
Figma. Une carte sans layer, comme une règle d'utilisation, n'en a pas.

Après le clic, le bouton devient « Sélectionnés » et se désactive. Il
redevient actif quand la sélection de Figma change. Ouvrir une carte ne
sélectionne plus rien : aujourd'hui, l'ouverture d'une carte de correction ou
de constat sélectionne ses layers sans l'annoncer.

## 7. Les constats de Button

### 7.1 L'anneau de focus « lié autrement dans 12 autres variants »

Constat C21, À vérifier (`ecartsDeFratrie`, `packages/kit/src/controles/mapping.ts:87`).

Le contrôle range les liaisons de tous les variants par layer et par champ. Il
donne à chacune une signature tirée du nom de son token. Quand une signature
domine le groupe, les autres liaisons reçoivent C21. La clé du groupe ignore
les properties du variant. `Color/Primary/Contained/Focus/ring` et
`Color/Info/Contained/Focus/ring` ont donc deux signatures, alors que leur
seul écart est la valeur de `Color`.

Le constat est faux. Les contrôles C15 et C16 du même fichier savent déjà
reconnaître un segment qui reprend la valeur d'une property du variant.

Correction : C21 compare les signatures après avoir remplacé ces segments par
le nom de leur property. Un token qui suit les valeurs du variant ne reçoit
plus de constat. Un vrai écart reste signalé, par exemple un variant
`Color=Primary` lié à `Color/Info/…`.

### 7.2 « 4 tokens écrivent Large. UCM écrit lg »

Constat C10 (`packages/kit/src/controles/nommage.ts:225`).

La décision existe. Le plan de Nomenclature l'écrit
(`docs/notes/Recherches/Plugin Architect/4 Nomenclature/PLAN-IMPLEMENTATION.md`,
ligne 58) : « dans le nom final des variables, `large` devient `lg`. Dans les
dossiers, `lg` devient `large` ». Le registre des tailles la porte aussi
(`packages/kit/src/referentiel/vocabulaire.ts:123`) : chaque cran a son mot de
dossier, comme `large` pour `lg`.

C10 ne lit pas cette distinction. Il compare chaque segment au seul
identifiant du terme, `lg`, sans regarder si le segment est un dossier ou le
nom de la variable. Seul l'outil Nomenclature appelle `termePourCategorie`.

Le défaut est dans C10, pas dans le registre. Correction : C10 prend
l'écriture attendue par `termePourCategorie(terme, categorieDuSegment(nom,
rang))`. `Size/Large/radius` est tenu. Une variable nommée `Size/radius/Large`
recevrait encore C10, avec `lg`. R-17 confirme que la règle vaut pour toutes
les collections.

### 7.3 Le radius du layer `.Ring`, lié à un token de layout

En discussion (R-18). Constat C80, À corriger
(`packages/kit/src/controles/couche.ts:60`). La règle vient de R-2 : un layer
de composant ne se lie qu'aux tokens de son composant.

#### Les deux questions de la recette

**`.Ring` sans collection, est-ce une erreur ?** Non. FORMAT.md, « Composition
et dépendances » : un set imbriqué sans instance de `.componentRules` « reste
parcouru comme wrapper ou détail d'implémentation du parent ». `.Ring` est donc
une pièce de Button. Le contrat de Button publie l'anneau dans ses propres
`strokes.ring`.

**Faut-il tous les composants dans la collection des tokens ?** Non. CONCEPT.md,
« La composition ne duplique pas », vise les composants unifiés : ceux qui ont
leur propre contrat, parce qu'ils servent seuls. Un composant fait pour servir
seul a sa collection. Une pièce interne comme `.Ring` n'en a pas besoin.

#### La question qui reste

Le radius de `.Ring` appartient donc à Button. La règle R-2 demande qu'il passe
par un token de Button. Le kit le traite déjà ainsi : une liaison posée dans
l'instance `.Ring` est rattachée à Button (`surcharge`,
`packages/kit/src/controles/releve.ts:18`). Le constat suit la règle ; la règle
est-elle la bonne pour une pièce interne ?

| Option | Ce que fait le designer | Ce qu'on gagne | Ce qu'on perd |
|---|---|---|---|
| 1. Tokens d'anneau dans Button | Crée `ring-radius` dans les tokens de Button, qui renvoie à `Radius/lg`, puis le lie sur l'instance `.Ring` de chaque variant | R-2 reste sans exception. Button règle son anneau par taille sans toucher `.Ring` | Une liaison par instance. Le bouton de modèle (section 4) les propose depuis un variant lié |
| 2. Exception pour une pièce interne | Rien : `.Ring` garde `Radius/lg` dans son composant principal | Aucun geste dans Figma | Le contrat de Button cite un token de layout en direct. Changer l'anneau de Button oblige à modifier `.Ring`, et donc tous les composants qui l'emploient |
| 3. `.Ring` devient un composant unifié | Ajoute une instance de règles, une collection `ring` et un contrat | `.Ring` se partage proprement entre composants | Un contrat et des tokens pour une pièce qui ne sert jamais seule |

Avis : l'option 1 si l'anneau de Button doit pouvoir différer de celui d'un
autre composant, ou suivre la taille du bouton. L'option 2 si l'anneau est le
même partout et ne doit jamais varier. Dans ce cas, l'exception vise les
layers d'un composant imbriqué dont le nom commence par `.` ou `_`, que Figma
ne publie pas.

Deux faits décident :

- `.Ring` sert-il à d'autres composants que Button ?
- Le radius de l'anneau doit-il suivre la taille du bouton ?

Quelle que soit l'option, le constat doit nommer l'instance : « `.Ring` est un
composant imbriqué dans Button ».

### 7.4 « Les 18 variants State=Disabled ne sont pas mesurés »

En discussion (R-19). Constat C53, Information
(`packages/kit/src/controles/accessibilite.ts:133`).

WCAG 2.2, critères 1.4.3 et 1.4.11 : un composant inactif n'a pas d'exigence
de contraste. Architect ne mesure donc pas les variants `State=Disabled`, et
le dit dans une carte.

CONTRIBUTING.md, « Avertissements de l'export » : « Il n'existe aucun canal
pour un constat sans geste. » Cette carte ne demande rien au designer.

| Option | Ce que voit le designer | Pour | Contre |
|---|---|---|---|
| a. La carte d'aujourd'hui | Une carte Information | Le designer sait pourquoi ces variants n'ont aucun point | Une carte sans geste, à chaque analyse. Le designer apprend à survoler les cartes Information |
| b. Une ligne grise sous Accessibilité | « Contraste non mesuré sur `State=Disabled`, que WCAG exempte. » | L'information reste, au rang 3, sans carte | Une ligne de plus sous la bande |
| c. Rien | Aucune mention | Suit la règle des messages à la lettre | Un designer peut croire que les variants désactivés ont passé le contrôle |
| d. Un seuil propre aux désactivés | Une mesure à un seuil plus bas, par exemple 2:1, en À vérifier | Un texte désactivé illisible reste signalé | Un seuil que WCAG ne donne pas : UCM devrait le décider et l'écrire dans le kit |

Avis : b. L'option d serait un choix de produit, à décider à part.

### 7.5 Le stroke de `Variant=Outlined` sur un fond indéterminé

En discussion (R-20). Constat de contraste non mesuré, cause
`fond-indetermine` (`packages/kit/src/controles/accessibilite.ts:474`).

#### Ce que fait le kit

Le kit compose les fills des ancêtres du layer, dans le variant seulement. Il
s'arrête au premier fill opaque. Un variant Outlined n'a pas de fill opaque :
le fond reste inconnu. Aucun code ne lit le fond de la page de Figma ni le
mode du thème pour ce calcul. Les autres mesures de contraste se font déjà
par combinaison de modes.

#### Le raisonnement de la recette

Il est juste. Un composant sans fond se pose, en pratique, sur le fond de la
page. Ce fond change avec le mode. UCM le nomme : `elevation/page` dans le
thème (`packages/kit/src/referentiel/theme.ts:33`).

#### D'où prendre le fond

| Source | Pour | Contre |
|---|---|---|
| A. `elevation/page` du thème | Le fond réel du produit, une valeur par mode. Suit UCM Palettes : le fond de page prévu est `#f8fafc`, pas `#FFFFFF` | Demande un thème UCM au catalogue |
| B. Le fond de la page Figma (`figma.currentPage.backgrounds`) | Toujours disponible | Le fond du canvas, choisi pour travailler, pas celui du produit. Une seule valeur, sans mode |
| C. Une valeur fixe : `#FFFFFF` en Light, une autre en Dark | Simple | Fausse dès que Palettes change le fond de page |

#### Dans quel mode mesurer

| Mode | Pour | Contre |
|---|---|---|
| Le mode affiché | La mesure correspond à ce que le designer voit dans Figma | Un défaut en Dark passe inaperçu tant que le designer travaille en Light |
| Chaque mode du thème | Le composant sert dans les deux modes. La carte dit lequel échoue | Deux mesures par paire |

Avis : la source A, mesurée dans chaque mode du thème, avec B en repli quand le
catalogue n'a pas de thème UCM. La carte nomme le fond et le mode : « sur le
fond de la page, `elevation/page`, en Dark ».

Une question de plus : un bouton Outlined se pose aussi sur une carte,
`elevation/raised`. Faut-il mesurer aussi sur ce fond ?

### 7.6 « La règle de label vise une property que le composant n'a pas »

Décidé (R-22) : la phrase simple et « propriété ». Constat C45, écart
`sans-propriete` (`src/regles.ts:80`).

Le contrôle compare les règles `@prop` et `@boolean` de l'instance de règles
aux props du contrat. La règle `label` ne trouve aucune prop de ce nom. La
cause n'est pas établie : Button n'a peut-être pas de propriété `label`, ou sa
propriété de texte n'entre pas dans les props du contrat. Le rapport
téléchargeable de Button la tranchera (R-21).

Texte retenu :

> **À corriger** La règle `label` ne correspond à aucune propriété de Button.
> Donnez-lui le nom exact de la propriété, ou supprimez-la.

« Property » devient « propriété » dans les phrases. Deux règles écrites
changent avec ce choix :

- la table des termes de CONTRIBUTING.md, qui écrit « component property » et « variant property » ;
- `tests/loiDuVocabulaire.test.ts`, qui exige les termes de Figma en anglais.

Les noms de types de Figma restent tels quels, comme `Instance swap`. Les
phrases concernées : `src/ui/textes/ignores.ts`, lignes 141, 144 et 159.

## 8. Le constat d'Alert : un stroke lié à `foreground`

Constat C17, À corriger (`packages/kit/src/controles/mapping.ts:47`).

La table des rôles admis donne `border` au stroke, ou `ring` sur un layer
d'anneau. Le registre des rôles définit pourtant `foreground` comme la
« couleur commune au texte, à l'icône et à la bordure posés sur un fond »
(`packages/kit/src/referentiel/vocabulaire.ts:159`). Le contrôle contredit le
registre.

Le constat est faux. Correction : un stroke admet `border` et `foreground`.
`border` reste le rôle qu'une correction pose quand aucun token n'est lié.
Le cas d'Alert entre dans les tests de C17.

## 9. Les constats de Stresstest : un gap Auto lu comme une valeur

Constat C29, À corriger. Le gap d'un auto layout en Auto (`SPACE_BETWEEN`)
garde dans Figma une valeur `itemSpacing` que Figma n'applique pas. Le relevé
la lit (`src/releveDuComposant.ts:159`), et la vue aussi
(`src/lectureDuComposant.ts:198`). Ni l'un ni l'autre ne regarde
`primaryAxisAlignItems`.

Le socle sait déjà écarter ce cas pour l'exporteur : `distributesBySpaceBetween`
(`packages/plugin-socle/src/composant/contract/nodeBindings.ts:211`).

Les deux constats sont faux. Correction : le relevé et la vue sautent
`itemSpacing` quand le gap est Auto, avec la fonction du socle. Le même test
couvre les deux lectures. C'est la même famille de défaut que le stroke weight
d'un layer sans contour, corrigé en R-1.

## 10. Questions au mainteneur

| N° | Question | Proposition | État |
|---|---|---|---|
| R-11 | Largeurs de la fenêtre en mode Composant | | Décidé : 500 px minimum et à l'ouverture, barre compacte ; 1060 px panneau ouvert |
| R-12 | Les formulaires de la Configuration à 500 px | Une colonne sous 640 px, sans élargir la fenêtre | Ouvert |
| R-13 | Forme d'un variant | | Décidé : B dans la section Variants, C dans les constats |
| R-14 | Le bouton de modèle : où le mettre, ou le retirer | a. Une carte dans le panneau, seulement quand elle propose quelque chose | En discussion |
| R-15 | Le tableau des variants | | Décidé : retiré |
| R-16 | Le bouton Sélectionner | | Décidé : désactivé une fois les layers sélectionnés ; ouvrir une carte ne sélectionne plus |
| R-17 | Mots entiers dans les dossiers, abréviations dans les variables, dans toutes les collections | Oui, comme le plan de Nomenclature | Ouvert |
| R-18 | Le radius de `.Ring` : option 1, 2 ou 3 | Selon deux faits : `.Ring` sert-il ailleurs, l'anneau suit-il la taille ? | En discussion |
| R-19 | Les variants désactivés : carte, ligne grise, rien, ou seuil propre | b. Une ligne grise | En discussion |
| R-20 | Le fond d'un variant sans fill, et les modes mesurés | `elevation/page` dans chaque mode, la page Figma en repli | En discussion |
| R-21 | Envoyer le rapport téléchargeable de Button | Pour établir la cause de C45 | Ouvert |
| R-22 | « propriété » dans les phrases | | Décidé : oui ; les types de Figma restent en anglais |
| R-23 | Mesurer aussi le contraste sur `elevation/raised` | Non dans un premier temps | Ouvert |
| R-24 | Un seuil de contraste propre aux variants désactivés | Non : à décider hors de cette recette | Ouvert |

## 11. Ordre de travail proposé

Les corrections du kit ne dépendent pas de la maquette. Elles peuvent passer
en premier, dans une seule version du kit :

| Lot | Contenu | Dépend de |
|---|---|---|
| K1 | C21 ignore un écart qui suit les properties du variant (7.1) | — |
| K2 | C10 lit l'écriture des dossiers (7.2) | R-17 |
| K3 | C17 admet `foreground` sur un stroke (8) | — |
| K4 | Fond de page pour le contraste (7.5) | R-20 |
| A1 | Gap Auto sauté par le relevé et la vue (9) | — |
| A2 | Frontière, Configuration en bascule, Actualiser désactivé (1) | R-12 |
| A3 | Fenêtre à 500 px et barre compacte (1) | — |
| A4 | Changement de variant sans saut (2) | — |
| A5 | Variants en puces, tableau retiré, bouton de modèle (3 à 5) | R-14 |
| A6 | Textes des constats, bouton Sélectionner, C53 (6, 7.3, 7.4, 7.6) | R-18, R-19 |

Le plan d'implémentation s'écrira après les réponses, dans ce dossier.
