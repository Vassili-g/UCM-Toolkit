# Recette v2 d'Architect : analyse et propositions

Ce document part de la recette Figma du mode Composant du 28 octobre, sur
Button, Alert et Stresstest. Chaque point de la recette y reçoit sa cause,
lue dans le code, et une proposition. Rien n'est implémenté.

La maquette [MAQUETTE-RECETTE-V2.html](./MAQUETTE-RECETTE-V2.html) montre les
propositions d'interface sur les écrans réels figés de la galerie d'Architect.
Les questions au mainteneur sont numérotées à la suite de la recette v1, de
R-11 à R-29, et réunies en section 10.

## 1. Fenêtre, barre et panneau

| Point de la recette | Ce que fait le code | Proposition |
|---|---|---|
| La fenêtre s'ouvre trop large en mode Composant | Panneau fermé, la fenêtre prend 520 px (`TAILLE_ETROITE`, `src/fenetre.ts:25`), ou la dernière taille rangée sous `ucm-explorateur/tailleFenetreEtroite`. Panneau ouvert : 1040 px. Aucune largeur de 300 px n'existe | Panneau fermé : 300 px. Panneau ouvert : la vue garde 300 px et le panneau s'ajoute à droite, 560 px. La fenêtre passe à 864 px (R-11) |
| Analyser ouvre aussi le panneau des constats | Le clic n'envoie que `analyser` (`src/ui/application.ts:226`). Seuls le bouton Constats et le collage d'une préparation ouvrent le panneau. La lecture du code n'explique pas ce que la recette a vu | Reproduire dans Figma avec le build courant. Un test d'interface vérifie que le panneau reste fermé après Analyser |
| La frontière entre la vue et le panneau lâche la souris | Le geste repose sur `setPointerCapture` et écoute la poignée seule (`src/ui/composant/corps.ts:47`). Dans Figma, Chromium retire la capture en cours de geste : le suivi s'arrête dès que la souris quitte la poignée | Reprendre le geste de la poignée des colonnes (`src/ui/poignee.ts`) : suivi sur `window` en phase de capture, fin au relâchement ou quand la souris sort de la fenêtre |
| Configuration change la largeur de la fenêtre | En mode Composant, `ouvrirLaConfiguration` passe d'abord en mode Tokens, qui redimensionne à 1360 px (`src/ui/application.ts:187`) | La Configuration s'ouvre à la place du contenu de la fenêtre, à sa largeur |
| Configuration fait quitter le mode Composant | Même cause : le passage en mode Tokens vient du commit `cc678b6d` | Le mode reste celui de départ. La bascule Tokens / Composant ne change pas |
| Un second clic sur Configuration ne la ferme pas | Le bouton renvoie le même événement d'ouverture. Seul le bouton Retour de la Configuration la ferme | Le bouton devient une bascule (`aria-pressed`). Le second clic ferme la Configuration et rend l'écran précédent : panneau, section ouverte, défilement |
| Actualiser reste actif sans composant sélectionné | `selectionSurLAnalyse` rend vrai quand la sélection est vide (`src/ui/composant/analyse.ts:78`) | Analyser et Actualiser sont désactivés tant qu'aucun composant n'est sélectionné. La bulle dit « Sélectionnez un composant dans Figma » |

### La barre à 300 px

À 300 px, la barre actuelle déborde : Actualiser est coupé, Constats et
Configuration sortent de la fenêtre. La liste des tokens déborde aussi : la
marque `×2` sort à droite. Le cadre 1a de la maquette le montre.

Proposition, cadre 1b :

- le logo et le nom « UCM Architect » disparaissent : la bascule vient en tête ;
- Actualiser devient un bouton à icône, avec sa bulle ;
- Constats garde son icône et sa pastille, sans son mot ;
- Configuration reste un bouton à icône.

Les bornes minimales de la vue et du panneau passent de 320 à 300 px
(`src/fenetre.ts:31`, `src/ui/composant/corps.ts:19`). Une taille rangée plus
grande que 300 px garde la priorité à l'ouverture : le designer qui a agrandi
sa fenêtre la retrouve.

### La Configuration à 300 px

Les formulaires de la Configuration ont été validés à 640 px. À 300 px, ils
doivent passer sur une colonne. R-12 demande si cette largeur leur convient,
ou si la Configuration peut seule élargir la fenêtre.

## 2. Changer de variant sans que l'écran saute

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

Le défilement n'est pas gardé. Seuls le dépliage des properties et le tableau
survivent.

### Proposition

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

Le cadre 2 de la maquette montre ce qui reste fixe et ce qui change. Ce
travail touche la fonction de rendu de la vue entière : il revient à un lot
`implementeur-exigeant`, avec un test d'interface qui compare la position des
éléments avant et après un changement de variant.

## 3. Le langage visuel des variants

### Aujourd'hui

Un variant s'écrit partout comme Figma le nomme :
`Color=Primary, Variant=Contained, State=Default`. CONTRIBUTING.md en fait une
règle (« Messages destinés au designer »). Il apparaît :

- sous la section Variants, après « Affiché » (`src/ui/composant/variants.ts:296`) ;
- dans la phrase des constats et dans leur ligne de lieu (`src/ui/ignores/modele.ts:101`) ;
- dans les cartes de corrections et de questions.

Trois défauts :

- Le nom complet est long. Sur Button, trois paires remplissent une ligne de 300 px.
- La valeur utile se perd. Dans un constat, une seule property explique souvent le point, comme `State=Focus`.
- Le lieu d'un constat mélange deux formes : un nom de variant ou une phrase comme « Tous les variants désactivés », qui ne reprend pas `State=Disabled`.

### Propositions

La maquette montre quatre formes, sur la section Variants de Button (cadres
3a à 3c) et sur deux de ses constats (cadres 3d à 3g).

| Forme | Où | Ce qui change |
|---|---|---|
| A. Une puce par paire | Section Variants et constats | Chaque paire devient une puce : property et signe égal en gris, valeur en clair. Dans un constat, les puces restent dans la phrase |
| B. La section suffit | Section Variants | La ligne « Affiché » disparaît : la valeur choisie de chaque ligne de property dit déjà le variant |
| C. La ligne de lieu porte les variants | Constats | La phrase ne nomme plus le variant. La ligne de lieu donne le nombre de variants, puis les puces des seules paires qu'ils partagent : 36 variants, `State=Focus` |
| D. Deux colonnes | Constats | Les paires en deux colonnes sous la phrase, une ligne par property |

Recommandation : B pour la section Variants, C pour les constats, avec les
puces de A. Une puce garde le texte exact de Figma, `State=Disabled`,
pour que le designer puisse le chercher. La property est grise, la valeur
claire. La puce ne prend pas de couleur : la couleur reste aux alertes. La
ligne de lieu suit la même règle :

| Aujourd'hui | Proposé |
|---|---|
| Tous les variants désactivés | 18 variants, puis la puce `State=Disabled` |
| Tous les variants | Tous les variants |
| Layer container | Layer `container`, puis le bouton Sélectionner |

« Tous les variants désactivés » est aussi faux sur le fond. Le texte est fixe
(`src/ui/textes/ignores.ts:93`) : il dit « tous » quelle que soit la part des
variants exclus.

La règle de CONTRIBUTING.md change : un variant garde les noms et les valeurs
de Figma, en puces d'une paire chacune. R-13 tranche la forme.

## 4. Le bouton « Copier ses liaisons aux autres variants »

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

Rien n'est écrit dans Figma. Les propositions arrivent dans le panneau des
constats, que le designer applique ensuite.

### Pourquoi on ne le comprend pas

- « ses » ne dit pas à qui sont les liaisons.
- « copier » fait croire que les autres variants prendront le même token. Le bouton substitue les valeurs de property.
- Après le clic, le bouton ne montre rien. Si le panneau est fermé, rien ne change à l'écran.

### Proposition

Cadre 4 de la maquette :

- libellé : « Lier les autres variants sur ce modèle » ;
- sous le bouton, une phrase et l'exemple tiré du variant affiché : « Chaque autre variant reçoit le token de même nom, avec ses propres valeurs. » puis `Primary` → `Info` sur le token d'un layer ;
- après le clic, le panneau s'ouvre sur les liaisons proposées, sous un titre qui nomme le modèle ;
- le bouton dit le résultat : « 128 liaisons proposées », ou « Aucune liaison à proposer ».

## 5. Le bouton « Tableau »

### Aujourd'hui

« Tableau » alterne deux affichages de la section Variants : une ligne par
property, ou un tableau qui croise les deux premières properties
(`src/ui/composant/variants.ts:278`). C'est un bouton simple avec
`aria-pressed`. Aucune règle de style ne vise `.variants-tableau` ni
`.variants-copier` : les deux boutons ont l'apparence native du navigateur.

### Proposition

Le choix change l'affichage d'une même vue. Il prend donc un choix segmenté,
celui de la bascule Tokens / Composant (`bascule-choix` du socle). Les deux
options nomment ce qu'elles montrent :

- « Par property » : une ligne par property ;
- « Color × Variant » : le tableau, avec le nom des deux properties croisées.

Sur un jeu de trois properties, comme Button, le tableau croise les deux
premières. La troisième reste en ligne sous le tableau. R-15 demande si le
designer doit pouvoir choisir les deux properties croisées.

« Lier les autres variants sur ce modèle » prend le style `btn btn-secondary
btn-compact` du socle.

## 6. Sélectionner le layer d'un constat

Aujourd'hui, ouvrir une carte de correction ou de constat sélectionne ses
layers dans Figma. La carte écrit ensuite « Sélectionnés dans Figma ». Rien ne
l'annonce avant l'ouverture. Les cartes de questions et la section Ignorés ne
sélectionnent rien.

Proposition, cadre 6 : un bouton « Sélectionner » dans l'en-tête de chaque
carte qui vise des layers, questions comprises. Il porte le signe de la
sélection de Figma. Après le clic, il devient « Sélectionnés ». Une carte sans
layer, comme une règle d'utilisation, n'en a pas.

R-16 : ouvrir une carte doit-il encore sélectionner ? Proposition : non. La
sélection devient un geste explicite, et le designer peut lire une carte sans
perdre sa sélection dans Figma.

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

Proposition : C21 compare les signatures après avoir remplacé ces segments par
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

Le défaut est donc dans C10, pas dans le registre. Proposition : C10 prend
l'écriture attendue par `termePourCategorie(terme, categorieDuSegment(nom,
rang))`. `Size/Large/radius` est tenu. Une variable nommée `Size/radius/Large`
recevrait encore C10, avec `lg`.

Les deux contrôles de nommage, C10 et celui de Nomenclature, liraient alors la
même règle. R-17 confirme que la règle vaut pour toutes les collections.

### 7.3 Le radius du layer `.Ring`, lié à un token de layout

Constat C80, À corriger (`packages/kit/src/controles/couche.ts:60`). La règle
vient de R-2 : un layer de composant ne se lie qu'aux tokens de son composant.

**Le contrat dit à qui appartient `.Ring`.** FORMAT.md, « Composition et
dépendances » : un set imbriqué sans instance de `.componentRules` « reste
parcouru comme wrapper ou détail d'implémentation du parent ». `.Ring` n'a pas
de règles d'utilisation. Ses layers appartiennent donc au contrat de Button,
qui publie l'anneau dans ses propres `strokes.ring`.

**Une collection par composant n'est pas requise.** CONCEPT.md, « La
composition ne duplique pas », vise les composants unifiés : ceux qui ont leur
propre contrat. `.Ring` n'est pas fait pour servir seul. Il n'a ni contrat ni
collection, et ce choix est juste. Seul un composant unifié a sa collection
dans `components`.

**Le constat est juste sur le fond.** Le radius de `.Ring` est un radius de
Button. Il passe par un token de Button, qui renvoie à `Radius/lg`. Le kit
traite déjà ainsi les layers d'une instance imbriquée : une liaison de
`.Ring` est rattachée à Button (`surcharge`, `packages/kit/src/controles/releve.ts:18`).

Le geste dépend de l'endroit où vit la liaison :

- dans l'instance `.Ring` de chaque variant de Button : lier le radius au
  token de Button, en surcharge d'instance ;
- dans le composant principal `.Ring` : le lier à un token de Button attache
  `.Ring` à Button. Cela ne vaut que si `.Ring` ne sert qu'à Button.

Si `.Ring` sert aussi à Input ou Checkbox, deux voies existent :

1. chaque composant lie l'instance à ses propres tokens d'anneau ;
2. `.Ring` devient un composant unifié, avec ses règles, son contrat et sa
   collection. Button le déclare dans `composes`, et Architect ne juge plus
   ses layers dans Button.

Recommandation : garder `.Ring` comme détail d'implémentation, sans
collection. Button reçoit ses tokens d'anneau, comme `Size/Large/ring-radius`,
liés en surcharge sur l'instance. R-18 demande si `.Ring` sert à d'autres
composants.

Le texte du constat doit nommer l'instance. Proposition :

> **À corriger** Le top left radius du layer `.Ring` est lié à `Radius/lg`,
> un token de layout. `.Ring` est un composant imbriqué dans Button. Liez ce
> radius à un token de Button, sur l'instance `.Ring`.

### 7.4 « Les 18 variants State=Disabled ne sont pas mesurés »

Constat C53, Information (`packages/kit/src/controles/accessibilite.ts:133`).

CONTRIBUTING.md, « Avertissements de l'export » : « Il n'existe aucun canal
pour un constat sans geste. » Ce constat ne demande rien au designer. Il
l'habitue à survoler les cartes Information.

Proposition : supprimer la carte. L'exclusion des variants désactivés devient
une ligne grise sous le titre de la section Accessibilité, avec la puce de la
forme retenue en R-13 : « Contraste non mesuré sur `State=Disabled`, que WCAG
exempte. » R-19 tranche entre cette ligne et rien du tout.

### 7.5 Le stroke de `Variant=Outlined` sur un fond indéterminé

Constat de contraste non mesuré, cause `fond-indetermine`
(`packages/kit/src/controles/accessibilite.ts:474`).

Le kit compose les fills des ancêtres du layer, dans le variant seulement. Il
s'arrête au premier fill opaque. Un variant Outlined n'a pas de fill opaque :
le fond reste inconnu. Aucun code ne lit le fond de la page de Figma ni le
mode du thème pour ce calcul.

Le raisonnement de la recette est juste. Un composant sans fond se pose sur
le fond de la page. UCM nomme ce fond : `elevation/page` dans le thème
(`packages/kit/src/referentiel/theme.ts:33`), qui vaut une couleur par mode.

Proposition :

1. sans fill opaque dans le variant, le fond devient `elevation/page` du
   thème, résolu dans le mode de la mesure ;
2. le contraste se mesure dans chaque mode du thème, Light et Dark, comme les
   autres mesures par combinaison de modes ;
3. sans `elevation/page` au catalogue, le fond devient celui de la page Figma
   (`figma.currentPage.backgrounds`), en un seul mode ;
4. le constat dit le fond retenu : « sur le fond de la page, `elevation/page`,
   en Dark ».

Une valeur fixe, `#FFFFFF` en Light, serait fausse dès qu'UCM Palettes pose un
autre fond de page. Le fond de page prévu est `#f8fafc`. Le token suit ce
changement. R-20 valide l'ordre des sources.

### 7.6 « La règle de label vise une property que le composant n'a pas »

Constat C45, écart `sans-propriete` (`src/regles.ts:80`).

Le contrôle compare les règles `@prop` et `@boolean` de l'instance de règles
aux props du contrat. La règle `label` ne trouve aucune prop de ce nom. La
cause n'est pas établie : Button n'a peut-être pas de propriété `label`, ou sa
propriété de texte n'entre pas dans les props du contrat. Le rapport
téléchargeable de Button la tranchera (R-21).

Texte proposé :

> **À corriger** La règle `label` ne correspond à aucune propriété de Button.
> Donnez-lui le nom exact de la propriété, ou supprimez-la.

« Property » devient « propriété » dans les phrases. Cela contredit deux
règles écrites :

- la table des termes de CONTRIBUTING.md écrit « component property » et « variant property » ;
- `tests/loiDuVocabulaire.test.ts` exige les termes de Figma en anglais.

Figma en français écrit « propriété ». La question M-17 des maquettes
d'Architect, sur les libellés de Figma en français, est ouverte. R-22 la
tranche : « propriété » dans les phrases, et les noms de types de Figma
gardés tels quels, comme `Instance swap`. Les autres phrases concernées :
`src/ui/textes/ignores.ts`, lignes 141, 144 et 159 ; « Croiser deux
properties » disparaît avec le bouton Tableau.

## 8. Le constat d'Alert : un stroke lié à `foreground`

Constat C17, À corriger (`packages/kit/src/controles/mapping.ts:47`).

La table des rôles admis donne `border` au stroke, ou `ring` sur un layer
d'anneau. Le registre des rôles définit pourtant `foreground` comme la
« couleur commune au texte, à l'icône et à la bordure posés sur un fond »
(`packages/kit/src/referentiel/vocabulaire.ts:159`). Le contrôle contredit le
registre.

Le constat est faux. Proposition : un stroke admet `border` et `foreground`.
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

Les deux constats sont faux. Proposition : le relevé et la vue sautent
`itemSpacing` quand le gap est Auto, avec la fonction du socle. Le même test
couvre les deux lectures. C'est la même famille de défaut que le stroke weight
d'un layer sans contour, corrigé en R-1.

## 10. Questions au mainteneur

| N° | Question | Proposition |
|---|---|---|
| R-11 | Largeurs de la fenêtre en mode Composant | 300 px panneau fermé ; 864 px ouvert, la vue gardant 300 px |
| R-12 | La Configuration à 300 px | Une colonne à cette largeur, sans élargir la fenêtre |
| R-13 | Forme d'un variant | B dans la section Variants, C dans les constats, en puces de A |
| R-14 | Libellé du bouton de modèle | « Lier les autres variants sur ce modèle », avec la phrase et l'exemple |
| R-15 | Choix des properties du tableau | Les deux premières, sans choix, dans un premier temps |
| R-16 | Ouvrir une carte sélectionne-t-il encore ? | Non : un bouton Sélectionner seulement |
| R-17 | Mots entiers dans les dossiers, abréviations dans les variables, dans toutes les collections | Oui, comme le plan de Nomenclature |
| R-18 | `.Ring` sert-il à d'autres composants que Button ? | Sinon : tokens d'anneau de Button, liés sur l'instance |
| R-19 | Variants désactivés : une ligne sous Accessibilité, ou rien | Une ligne grise |
| R-20 | Fond d'un variant sans fill | `elevation/page` du thème dans chaque mode, puis la page Figma |
| R-21 | Envoyer le rapport téléchargeable de Button | Pour établir la cause de C45 |
| R-22 | « propriété » dans les phrases | Oui ; les types de Figma restent en anglais |

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
| A3 | Fenêtre à 300 px et barre compacte (1) | R-11 |
| A4 | Changement de variant sans saut (2) | — |
| A5 | Variants, bouton de modèle, choix segmenté (3 à 5) | R-13 à R-15 |
| A6 | Textes des constats, bouton Sélectionner, C53 retiré (6, 7.3, 7.4, 7.6) | R-16, R-18, R-19, R-22 |

Le plan d'implémentation s'écrira après les réponses, dans ce dossier.
