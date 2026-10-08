# Recette v8 d'UCM Palettes

Dossier de la recette v8 faite dans Figma. Il relève les
constats du mainteneur, explique la perte de la palette Poppy, décrit la
réparation par le plugin et ordonne le travail qui suit. La priorité va à ce
qui répare Poppy.

## 1. Les constats

| N° | Onglet | Constat | Demande |
|---|---|---|---|
| R1 | Gestion | Poppy affiche « Palette supprimée du plugin. Ce cadre ne sera plus mis à jour. » Le mainteneur n'a supprimé aucune palette ; il avait changé la luminosité du Réglage global. | Trouver la cause, réparer Poppy |
| R2 | Gestion | Les variables de Poppy apparaissent comme quatre palettes « Déjà dans le fichier ». | Détecter Soft/Vivid et Light/Dark sous une même racine, et proposer une seule palette à importer |
| R3 | Toutes | Un réglage changé pour essayer ne s'annule pas. | Valider ou annuler les modifications d'une palette |
| R4 | Gestion | « Actualiser » sur une planche « À mettre à jour » affiche « Génération de « Nom »… » sous la ligne « Synchronisé à l'instant », et la page se décale de plusieurs pixels. | Retirer ce texte ; une progression éventuelle se montre à la place du bouton « À mettre à jour » |
| R5 | Gestion | Le bouton « Synchroniser » | Le renommer « Synchroniser avec les tokens Figma » |
| R6 | Création, Vérification | Avec des palettes mais aucune ouverte, l'onglet ne montre que « Choisissez une palette ». | Plusieurs propositions dans une maquette HTML simple |
| R7 | Création | À l'ouverture d'une palette, la configuration montre Modèle, Intensités et Référence exacte. | Masquer ces trois réglages avancés ; maquette |
| R8 | Création, aperçu | Les pastilles `solid`, `surface` et `page` touchent le texte placé dessous. | Ajouter de l'espace |

Le code cité est celui de `main` à `3015982`.

## 2. Ce qui est arrivé à Poppy

### 2.1 La cause

Poppy est une palette reprise des variables du fichier : « Modifier dans le
plugin » l'a créée avec une liaison `reprise` dans le suivi des variables
([VAR-13]). Pour une telle palette, l'onglet Création affiche en tête de la
configuration l'encart « Palette reprise des variables du fichier »
(`ui/ongletCreation.ts`, `rendreLaReprise`). L'encart est masqué tant que les
tokens de la palette sont « À jour ». Changer la luminosité du Réglage global
rend les tokens « À mettre à jour » : l'encart apparaît alors, avec son bouton
« Annuler la reprise ».

Ce bouton appelle `confirmerLaSuppression()`, qui retire la palette de la
recette et range aussitôt la recette (`supprimer` dans `edition.ts`). Aucune
confirmation ne précède le retrait. Le libellé ne dit pas que la palette
quitte le plugin. Un designer qui cherche à annuler le réglage qu'il vient de
faire lit « Annuler » sur le seul bouton qui en porte le mot.

Le mainteneur confirme avoir cliqué sur « Annuler la reprise » en
cherchant à annuler son réglage, sans s'attendre à perdre la palette. Le code
n'a pas d'autre chemin qui retire une palette sans confirmation : l'import
d'un fichier de recette, la réinitialisation et « Supprimer » du menu de la
palette en demandent chacun une.

### 2.2 Ce que le fichier porte aujourd'hui

| Élément | Où | État |
|---|---|---|
| Paramètres de Poppy : référence, Réglage global, Color shift | Recette, clé partagée `ucm_palettes/recette` de la racine | Perdus : la recette rangée ne porte plus Poppy |
| Cadre de la planche | Page des planches, données `cadre`, `proprietaire`, `empreinte` | Présent, possédé, rattaché à l'identifiant de Poppy ; orphelin car la recette ne porte plus cet identifiant (`fraicheurDeLaPlanche`) |
| Liaison des variables | Suivi `ucm_palettes/variables`, entrée à l'identifiant de Poppy, `liaison: 'reprise'` | Présente : aucune écriture ne retire l'entrée d'une palette supprimée |
| Variables | Collection de Poppy, renommées par la mise à jour sous `Poppy/<intensité>/<thème>/<nuance>` | Présentes. Comme la recette ne porte plus Poppy, `variablesSuivies` cesse de les compter au plugin, et `palettesDuFichier` les regroupe par chemin : quatre groupes, d'où les quatre lignes « Déjà dans le fichier » (R2) |

Les couleurs des variables sont celles de la dernière mise à jour des tokens.
Le changement de luminosité n'a été que rangé dans la recette ; il n'a pas
atteint les variables tant qu'aucune mise à jour n'a suivi.

### 2.3 Pourquoi une nouvelle reprise ne suffit pas

« Modifier dans le plugin » sur l'une des quatre lignes reprendrait une seule
rampe, à une intensité, sous un nouvel identifiant (`reprendreDuFichier`).
Le cadre de Poppy resterait orphelin, les trois autres groupes resteraient
« Déjà dans le fichier », et les réglages d'avant seraient remplacés par ceux
d'une palette neuve.

## 3. Réparer Poppy par le plugin

Le mainteneur veut que le plugin répare Poppy, sans passer par l'historique
de Figma. Ce que le fichier garde le permet en partie :

- le cadre et le suivi des variables portent encore l'identifiant de Poppy :
  une palette recréée sous cet identifiant les retrouve, sans nouvelle
  écriture ;
- les quatre groupes de variables portent les couleurs de la dernière mise à
  jour, donc le résultat des réglages perdus ;
- les réglages eux-mêmes ne sont nulle part : référence, Réglage global,
  Color shift, palette de base.

La réparation tient donc en un geste : sur la carte « Palette supprimée du
plugin », « Reprendre depuis les variables » recrée la palette sous
l'identifiant du cadre, à deux intensités, depuis les quatre groupes. Ses
couleurs dépendent de ce que la reprise sait retrouver des réglages. Trois
options ont été pesées ; le mainteneur a retenu la première, et la deuxième
quand la première n'est pas exacte (D3) :

- **Reconstruire les réglages.** Les rampes du fichier sont la sortie du
  moteur pour des réglages inconnus. Une recherche des réglages qui
  reproduisent ces rampes rendrait Poppy telle qu'elle était, si la
  reconstruction est exacte. Le lot 3a mesure si elle l'est, sur des
  palettes produites par le plugin.
- **Figer les couleurs.** La palette reprend les couleurs du fichier telles
  quelles, à deux intensités, sans rôles ni garanties ; le designer la
  recalcule ensuite quand il le décide. Le modèle actuel ne fige qu'une
  intensité : il faut étendre `figees` et changer le format de la recette.
- **Recalculer depuis la référence.** La palette repart de la nuance 600 avec
  les réglages par défaut. L'encart compare Fichier et Plugin, et la mise à
  jour change les couleurs qui diffèrent. Poppy ne revient pas telle qu'elle
  était.

Les voies qui passent par Figma restent possibles pour qui ne veut pas
attendre : un Ctrl+Z sur le canevas si le fichier est resté ouvert, ou un
duplicata d'une version antérieure, dont on exporte la recette pour
l'importer dans le fichier. Aucune source ne garantit que l'une ou l'autre
rende les données du plugin.

## 4. Plan d'action

Les lots sont ordonnés par priorité. Les lots 1 à 3 réparent Poppy et
empêchent que la perte se reproduise ; les suivants traitent le reste de la
recette. La section 5 consigne les décisions prises.

| Lot | Constat | Objet | Taille | Décision |
|---|---|---|---|---|
| 1 | R1 | « Annuler la reprise » quitte l'encart | Petite | D1 |
| 2 | R2 | La détection regroupe les rampes d'une même palette | Moyenne | D2 |
| 3 | R1, R2 | Mesure de la reconstruction, reprise groupée, reprise sous l'identifiant d'un cadre orphelin | Grande | D3 |
| 4 | R3 | Annuler les modifications d'une palette | Moyenne à grande | D4 |
| 5 | R4 | La progression de la génération ne décale plus la page | Petite | Aucune |
| 6 | R5 | « Synchroniser avec les tokens Figma » | Petite | D5 |
| 7 | R8 | L'espace sous les pastilles de l'aperçu | Petite | Aucune |
| 8 | R6 | Maquette : Création et Vérification sans palette ouverte | Maquette | À prendre sur la maquette |
| 9 | R7 | Maquette : la configuration avancée repliée | Maquette | À prendre sur la maquette |

### Lot 1. « Annuler la reprise » quitte l'encart

Fichiers : `ui/ongletCreation.ts` (encart de reprise), `i18n/fr.ts`,
`i18n/en.ts` (`TEXTES_DE_LA_REPRISE.annuler`), galerie et tests de l'onglet.

Le bouton de l'encart appelle aujourd'hui `confirmerLaSuppression()` sans
confirmation. Le lot retire le bouton, son texte et son écouteur (D1).
L'encart garde le titre, la comparaison Fichier / Plugin, le choix
« Recalculées · Telles quelles » et la phrase de ce que la mise à jour
changera. Retirer une palette reprise passe par « Supprimer » du menu de la
palette, qui demande déjà « Supprimer « Nom » du plugin ? Son cadre Figma
restera, sans mise à jour. »

Critère : aucun bouton de l'onglet Création ne retire une palette de la
recette sans confirmation ; la galerie de l'encart n'a plus de bouton ; les
textes retirés quittent les deux langues et l'inventaire des textes.

### Lot 2. Une palette du fichier rangée sur plusieurs groupes

Fichiers : `variables/detection.ts` et ses tests, `ui/ongletGestion.ts`
(liste « Déjà dans le fichier »), i18n.

`palettesDuFichier` rend un groupe par chemin. Le lot ajoute un regroupement
pur, après la détection : des groupes de la même collection, de mêmes
nuances, dont les chemins ne diffèrent que par un ou deux segments pris dans
{`soft`, `vivid`} et {`light`, `dark`}, sans casse, dans n'importe quel
ordre, forment une seule palette du fichier. Sa racine est le chemin commun.
Les formes reconnues :

| Groupes | Exemple | Ce que la palette porte |
|---|---|---|
| 4 | `Poppy/soft/light`, `Poppy/soft/dark`, `Poppy/vivid/light`, `Poppy/vivid/dark` | Deux intensités, thèmes dans le chemin |
| 2 | `Poppy/soft`, `Poppy/vivid` dans une collection à modes Light et Dark | Deux intensités, thèmes en modes |
| 2 | `Poppy/light`, `Poppy/dark` | Une intensité, thèmes dans le chemin |

La ligne de Gestion montre une palette, sa racine et ce qu'elle regroupe
(« Soft et Vivid, Light et Dark »). Seules les trois formes complètes se
regroupent (D2) : trois groupes sur quatre restent trois lignes, puisqu'un
groupe manquant peut être un choix du designer. Deux groupes de nuances
différentes ne se regroupent pas non plus.

Critère : sur les variables écrites par le plugin pour une palette à deux
intensités, thèmes dans le chemin, la détection rend une seule palette ;
`SEUIL_DE_PALETTE` s'applique à chaque groupe.

### Lot 3. La reprise groupée, et la reprise d'une palette supprimée

Fichiers : `edition.ts` (`reprendreDuFichier`), `variables/reprise.ts`
(`suiviDeLaReprise`, `origineDeLaReprise`), `ecriture/variables.ts`
(`reprendreLaPalette`), `messages.ts`, `ui/ongletGestion.ts`, tests.

**3a. Mesure : les réglages se reconstruisent-ils depuis les rampes ?** Un
script de mesure tire des palettes à deux intensités avec des réglages
variés (référence, Réglage global, Color shift, palette de base), calcule
leurs rampes avec le moteur, puis cherche les réglages qui reproduisent ces
rampes. Il rend, pour chaque palette, l'écart maximal en hexa entre les
rampes d'origine et les rampes reconstruites. La mesure ne touche pas au
plugin ; son script et ses résultats se rangent dans un dossier `Mesures`
de ce dossier. Elle décide de la suite (D3) : un écart nul sur toutes les
palettes fait reconstruire les réglages ; un écart non nul fait figer les
couleurs. La décision s'écrit ici avec ses chiffres avant 3b.

**Résultat de la mesure (2026-10-08).** Sur trente palettes tirées, la
reconstruction retrouve des réglages qui reproduisent les rampes, avec un
écart nul sur les trente ([Mesures/RESULTATS.md](./Mesures/RESULTATS.md)).
Elle demande de 2 à 40 secondes par palette. Elle n'est pas mesurée pour un
Color shift libre importé, une recette globale autre que celle par défaut,
ou une variable retouchée à la main : la reprise aurait besoin, dans ces
cas, des couleurs figées en secours. Le mainteneur a donc choisi de **figer
d'abord** : la reprise de Poppy fige les couleurs du fichier à deux
intensités, au format 10. La reconstruction des réglages devient un lot
suivant, qui s'appuie sur ce secours.

Si la reprise fige les couleurs, `figees` s'étend aux deux intensités :
`{ soft: CouleursFigees, vivid: CouleursFigees }` sur une palette sans
`intensites: 1`, la forme actuelle restant celle d'une intensité.
`FORMAT_RECETTE` passe de 9 à 10. Une recette au format 9 se lit telle
quelle, puisque rien n'y change de sens ; un plugin plus ancien lit une
recette 10 comme `future` et n'y écrit rien ([REC-03]). La spécification, section de la
recette et de sa lecture, consigne le format 10.

**3b. La reprise groupée.** « Modifier dans le plugin » sur une palette
groupée (lot 2) crée une palette à deux intensités quand la forme en porte
deux. Ses couleurs sont celles des réglages reconstruits, ou les couleurs
figées du fichier selon 3a. Le suivi range chaque variable sous sa clé du
plan (`soft/light/600`, `vivid/dark/600`…), pour qu'une mise à jour ne
renomme rien. La source envoyée au sandbox désigne la racine et la forme du
groupe ; le sandbox relit les groupes lui-même, comme aujourd'hui pour un
seul groupe ([VAR-13]).

**3c. La reprise d'une palette supprimée.** La carte d'un cadre orphelin
propose « Reprendre depuis les variables » quand le suivi porte une liaison
de reprise à l'identifiant de ce cadre et que ses variables sont encore dans
le fichier. Le geste fait la reprise groupée sous cet identifiant, et garde
le nom de la palette lu dans le chemin. Le cadre et les variables s'y
rattachent ; la carte « Palette supprimée du plugin » disparaît, et les
quatre lignes « Déjà dans le fichier » aussi.

Critère : sur un fichier de test qui reproduit l'état de Poppy (cadre
orphelin, suivi de reprise, quatre groupes), le geste rend une palette sous
l'identifiant du cadre, et la liste « Déjà dans le fichier » ne porte plus
ses groupes. Avec la reconstruction ou les couleurs figées, la palette est
« À jour » sans écriture ; un test le vérifie.

### Lot 4. Annuler les modifications d'une palette

Fichiers : `ui/ongletCreation.ts`, `ui/barreDePalette.ts`, `ui/frontiere.ts`,
i18n, galerie et tests ; aucun changement du format de la recette.

Aujourd'hui, chaque fin de geste range la recette ([REC-06]) : il n'existe
ni brouillon ni retour à l'état d'ouverture dans le plugin. Seul Ctrl+Z sur
le canevas défait un rangement, et le designer ne le sait pas.

Les outils comparés suivent deux modèles. Atmos et Figma écrivent à chaque
changement et gardent des versions restaurables. Tokens Studio, en stockage
distant, garde un travail local, montre l'écart, puis l'envoie par un geste
explicite ; son bouton Cancel de récupération est jugé destructeur par ses
utilisateurs. Aucun plugin de palettes lu ne propose « Annuler les
modifications ». NN/g, Apple et GOV.UK préfèrent l'annulation à la
confirmation pour une action courante, demandent une annulation sur
plusieurs pas, et écartent une action destructrice d'une action bénigne.

Le mainteneur a retenu le retour à l'ouverture, avec une annulation dans la
session (D4). Le brouillon suivi d'« Enregistrer » a été écarté : il obligeait
Gestion à refuser une palette non enregistrée, le plugin à garder le
brouillon à la fermeture, et il ouvrait un conflit avec le rangement d'un
autre designer.

Ce que le lot construit :

1. **L'état d'ouverture.** L'interface garde, pour chaque palette, la palette
   rangée au premier moment où elle s'ouvre dans la session. Passer d'une
   palette à l'autre ne le remplace pas ; fermer le plugin l'oublie.
2. **« Annuler les modifications ».** La barre de la palette le montre dès que
   la palette ouverte diffère de son état d'ouverture, loin de « Supprimer »,
   qui reste dans le menu. Le geste range la recette avec cette palette
   remise dans son état d'ouverture, par le même chemin qu'un réglage : un
   rangement refusé parce que la recette a changé ailleurs reste refusé
   ([REC-10]). Il ne touche ni les autres palettes ni les Réglages communs.
3. **« Rétablir ».** Après le geste, la barre propose « Rétablir » jusqu'au
   réglage suivant ; il range la palette d'avant l'annulation.
4. **Ctrl+Z et Ctrl+Maj+Z dans la fenêtre du plugin.** L'interface garde la
   pile des recettes qu'elle a rangées dans la session. Ctrl+Z, hors d'un
   champ de saisie, range la recette précédente ; Ctrl+Maj+Z la suivante.
   La pile couvre aussi la suppression d'une palette, qui devient
   réversible dans la session. Un rangement venu d'ailleurs, lu au retour du
   focus, vide la pile.

Ce que le lot ne défait pas : ce que Gestion a écrit dans Figma. Après une
annulation, une palette dont les tokens ou le cadre ont été mis à jour
redevient « À mettre à jour », et une nouvelle mise à jour rend les
couleurs d'avant.

Critère : après trois réglages, « Annuler les modifications » rend une
recette rangée égale à celle de l'ouverture ; « Rétablir » rend celle
d'avant l'annulation ; Ctrl+Z après « Supprimer » rend la palette sous son
identifiant ; des tests de la frontière et de l'onglet le vérifient.

### Lot 5. La progression à la place du bouton

Fichiers : `ui/ongletGestion.ts` (`afficherDessin`, `zoneDuResultat`),
`ui/styles.css`, galerie.

Aujourd'hui, `afficherDessin` ajoute un paragraphe `progressionDuDessin`
dans `zoneDuResultat`, sous la ligne de synchronisation : la zone passe de
masquée à visible, et la page descend. Le lot retire ce paragraphe. Pendant
le dessin, le bouton de la palette en cours (« À mettre à jour »,
« Actualiser ») montre la progression dans sa propre boîte, désactivé et de
même largeur. Pour « Tout mettre à jour », le bouton global porte
« Palette 2 sur 5 ». L'annonce aux lecteurs d'écran reste dans une région
`role="status"` masquée à l'œil, qui n'occupe aucune place.

Critère : `test:ui` mesure la position de la liste avant et pendant un
dessin, et ne relève aucun écart.

### Lot 6. Le libellé de synchronisation

Fichiers : `i18n/fr.ts` et `i18n/en.ts` (`synchroniser`), `ui/connexion.ts`
si la largeur l'exige.

Le libellé devient « Synchroniser avec les tokens Figma ». Il est plus long
de vingt-deux caractères : à vérifier à la largeur minimale de la fenêtre.
En anglais : « Sync with Figma tokens » (D5).

### Lot 7. L'espace sous les pastilles de l'aperçu

Fichiers : `ui/nuancier.ts`, `ui/styles.css`.

Les pastilles `solid`, `surface` et `page` de l'aperçu touchent la ligne de
texte placée dessous. Le lot ajoute un écart pris dans l'échelle d'espacement
de `styles.css`, et la galerie le montre.

### Lot 8. Maquette : aucune palette ouverte

Une page HTML simple, sans adaptation à la largeur, à côté de ce dossier,
comme le mainteneur l'a demandé. Elle reproduit d'abord l'écran actuel tel
que la galerie le rend, puis montre trois ou quatre propositions
pour Création et Vérification quand la recette porte des palettes et
qu'aucune n'est ouverte :

1. la liste des palettes en cartes, avec leur mini-rampe et l'état de leurs
   tokens et de leur cadre ; un clic ouvre la palette ;
2. la dernière palette ouverte, proposée en tête, puis les autres ;
3. dans Vérification, le bilan de toutes les palettes : celles qui portent un
   constat d'abord ;
4. l'invitation actuelle, complétée par « Nouvelle palette » et par les
   palettes « Déjà dans le fichier » à reprendre.

### Lot 9. Maquette : la configuration avancée repliée

Même forme. La carte de configuration montre à l'ouverture d'une palette le
nom et la référence ; Modèle, Intensités et Référence exacte passent sous un
dépliant « Réglages avancés », replié. La maquette montre aussi le cas d'une
palette dont un réglage avancé diffère de sa valeur par défaut : le dépliant
le résume (« Modèle libre, une intensité »).

## 5. Décisions

| N° | Question | Décision | Option écartée |
|---|---|---|---|
| D1 | Que devient « Annuler la reprise » ? | Le bouton quitte l'encart ; la suppression reste dans le menu de la palette, avec sa confirmation | Le renommer « Retirer du plugin… » avec confirmation |
| D2 | Une forme incomplète, trois groupes sur quatre, se regroupe-t-elle ? | Non : seules les formes complètes se regroupent | Regrouper, la mise à jour créant le groupe manquant |
| D3 | Que valent les couleurs de Poppy reprise, faute de réglages ? | Figer d'abord les couleurs du fichier à deux intensités ; la reconstruction, exacte sur la mesure 3a, vient ensuite ; aucune couleur du fichier ne change | Recalculer depuis la référence |
| D4 | Quel modèle d'annulation ? | Retour à l'ouverture, « Rétablir », et Ctrl+Z dans la fenêtre du plugin | Brouillon et « Enregistrer » |
| D5 | Quel libellé anglais pour la synchronisation ? | « Sync with Figma tokens », pour garder le mot du français | « Sync with Figma variables » |

## 6. Ordre de réalisation

1. Lot 1 : il empêche qu'une autre palette se perde comme Poppy.
2. Lot 3a : la mesure décide de la forme de 3b et du format de la recette.
3. Lots 2, 3b, puis 3c : Poppy revient sous son identifiant.
4. Lot 4 : l'annulation des modifications.
5. Lots 5, 6 et 7, indépendants entre eux .
6. Lots 8 et 9 : les maquettes, puis leurs décisions.

Ce que le plan ne couvre pas : une palette créée par le plugin, liaison
`destination`, puis supprimée garde ses variables dans le fichier ; le
lot 3c ne propose de la reprendre que pour une liaison `reprise`. Le cas
attend une recette qui le rencontre.

## Sources

Figma :

- [figma.commitUndo](https://developers.figma.com/docs/plugins/api/properties/figma-commitundo/) : un point d'annulation entre deux actions d'un plugin.
- [setSharedPluginData](https://developers.figma.com/docs/plugins/api/properties/nodes-setsharedplugindata/) : ne dit rien de l'annulation ni des versions.
- [View a file's version history](https://help.figma.com/hc/en-us/articles/360038006754-View-a-file-s-version-history) : un point toutes les trente minutes, conservation selon le plan, restauration non destructive, Duplicate.
- [Use plugins in files](https://help.figma.com/hc/en-us/articles/360042532714-Use-plugins-in-files) et [Plugin for viewers](https://forum.figma.com/t/plugin-for-viewers/4636/65) : pas de plugin en lecture seule.
- [Create and manage variables and collections](https://help.figma.com/hc/en-us/articles/15145852043927-Create-and-manage-variables-and-collections) : une collection supprimée revient par une annulation immédiate ou une version.
- [Undo improvements](https://forum.figma.com/t/undo-improvements/52618) : l'historique d'annulation se vide à la fermeture du fichier ; cité d'après un résultat de recherche.
- [figma.clientStorage](https://developers.figma.com/docs/plugins/api/figma-clientStorage) : stockage privé du poste, non partagé.

Outils comparés :

- [Tokens Studio, push et pull](https://docs.tokens.studio/token-storage/remote-push-pull-changes), [version 2.5.0](https://feedback.tokens.studio/changelog/v250-4), [modale de récupération](https://feedback.tokens.studio/p/sparkles-improve-ui-of-recover-local-changes-modal), [PR 3607](https://github.com/tokens-studio/figma-plugin/pull/3607).
- [Atmos, version history](https://atmos.style/support/project/version-history).
- [Figma, générateur de palettes](https://www.figma.com/color-palette-generator/) et [revue d'une branche](https://help.figma.com/hc/en-us/articles/5693123873687-Review-branch-changes).
- [Supa Palette](https://www.supa-palette.com/), [Leonardo](https://leonardocolor.io/theme.html), [Uicolors](https://uicolors.app/generate), [Radix Colors](https://www.radix-ui.com/colors/docs/overview/custom-palettes) : aucune annulation documentée.

Ergonomie :

- NN/g : [Confirmation dialogs](https://www.nngroup.com/articles/confirmation-dialog/), [User control and freedom](https://www.nngroup.com/articles/user-control-and-freedom/), [Cancel vs Close](https://www.nngroup.com/articles/cancel-vs-close/), [Top 10 application design mistakes](https://www.nngroup.com/articles/top-10-application-design-mistakes/), [Proximity of consequential options](https://www.nngroup.com/articles/proximity-consequential-options/).
- [Apple Human Interface Guidelines, Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts).
- [GOV.UK Design System, Button](https://design-system.service.gov.uk/components/button/).
