# Recette v8 d'UCM Palettes

Dossier de la recette v8 faite dans Figma. Il relève les
constats du mainteneur, explique la perte de la palette Poppy, donne la
procédure qui la répare et ordonne le travail qui suit. La priorité va à ce
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

Le code n'a pas d'autre chemin qui retire une palette de la recette sans
geste de suppression : l'import d'un fichier de recette, le départ à zéro et
« Supprimer » du menu de la palette demandent chacun une confirmation, et un
rangement refusé ne modifie rien ([REC-04], [REC-10]). Un Ctrl+Z fait dans
Figma peut aussi défaire un rangement (E13), mais il rendrait la recette
d'avant la luminosité, avec Poppy.

La cause la plus probable est donc un clic sur « Annuler la reprise ». Le
plugin ne journalise pas ses gestes : le dossier ne peut pas le prouver.

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

## 3. Réparer Poppy

Deux voies rendent Poppy telle qu'elle était, avec son identifiant : le
cadre et les variables s'y rattachent alors d'eux-mêmes, puisque le suivi et
le cadre n'ont pas bougé. Elles ne demandent aucune nouvelle version du
plugin. La troisième voie demande du code.

Tant que Poppy n'est pas réparée, rien ne doit écrire dans le fichier depuis
le plugin : une mise à jour des tokens ou de la planche, une reprise et
« Supprimer définitivement » sur le cadre de Poppy compliquent chacune la
réparation.

### 3.1 Voie A : Ctrl+Z, si le fichier est resté ouvert

Chaque rangement de la recette est un pas d'annulation de Figma : `rangerRecette`
appelle `figma.commitUndo()` après l'écriture ([REC-06]). Le dernier pas est
le retrait de Poppy, si rien n'a été fait depuis.

1. Cliquer sur le canevas, puis faire Ctrl+Z une seule fois.
2. Revenir dans le plugin : la recette se relit au retour du focus (E13).
   Poppy doit revenir, avec la luminosité changée.
3. Pour revenir aussi sur la luminosité, continuer Ctrl+Z pas à pas. Chaque
   fin de geste sur un curseur a fait un rangement, donc un pas.

Limites. L'historique d'annulation de Figma se vide à la fermeture du fichier
ou au rechargement de l'onglet ; la communauté le constate, l'aide de Figma
ne l'écrit pas. Aucune source ne documente qu'un Ctrl+Z défait un
`setSharedPluginData`. Un Ctrl+Z de trop défait une autre action du fichier ;
Ctrl+Maj+Z la refait.

### 3.2 Voie B : une version antérieure du fichier

Figma pose un point de version toutes les trente minutes d'activité, et
garde tout l'historique en plan Professional ou Organization, trente jours en
Starter. Une version ouverte se lit seulement, et un plugin ne s'y lance pas :
il faut la dupliquer.

1. Dans le fichier, ouvrir File > Show version history et choisir une
   version antérieure au retrait de Poppy.
2. Choisir Duplicate sur cette version, puis ouvrir le nouveau fichier. Le
   fichier d'origine n'est pas touché.
3. Dans le duplicata, lancer UCM Palettes, vérifier que Poppy y figure, puis
   ouvrir la section « Importer, exporter, rapport » de Gestion et choisir
   « Exporter les palettes et les réglages ».
4. Revenir au fichier d'origine. Dans la même section, choisir « Importer
   les palettes et les réglages » et donner ce fichier. L'écart affiché doit
   nommer Poppy dans « Palette à ajouter ». Confirmer « Remplacer par cette
   sauvegarde ».
5. Le cadre de Poppy redevient le sien, et les quatre lignes « Déjà dans le
   fichier » disparaissent : l'import garde les identifiants de palette
   ([REC-08]), et le suivi rattache de nouveau les variables.

L'import remplace toute la recette. Si d'autres palettes ou les Réglages
communs ont changé depuis la version choisie, l'écart les nomme aussi dans
« Palettes à modifier », « Palettes à retirer » ou « Réglages communs à modifier ». Dans ce cas, exporter aussi la
recette actuelle, copier l'objet de Poppy du fichier ancien dans le tableau
`palettes` du fichier actuel, et importer ce fichier fusionné.

Limite. Aucune source ne documente qu'un duplicata de version garde les
données partagées de la racine ; le stockage dans le document le rend
probable. L'étape 3 le vérifie : si Poppy n'y figure pas, la voie B échoue
sans rien avoir écrit dans le fichier d'origine.

Restaurer la version dans le fichier d'origine marcherait aussi, mais
défairait tout ce qui a été fait depuis dans le fichier.

### 3.3 Voie C : reprendre Poppy depuis ses variables, sous son identifiant

Si les voies A et B échouent, seule une nouvelle version du plugin répare
Poppy : une reprise qui lit les quatre groupes comme une seule palette à deux
intensités et deux thèmes (R2), sous l'identifiant que le cadre orphelin et le
suivi portent encore. Le cadre et les variables s'y rattachent. Les
paramètres d'avant restent perdus : la reprise reconstruit la palette depuis
la référence lue à la nuance 600, et les couleurs recalculées peuvent
différer de celles du fichier. Les lots 2 et 3 du plan la construisent.

## 4. Plan d'action

Les lots sont ordonnés par priorité. Les lots 1 à 3 touchent Poppy ; les
suivants traitent le reste de la recette. Un lot qui dépend d'une décision de
la section 5 la nomme.

| Lot | Constat | Objet | Taille | Décision |
|---|---|---|---|---|
| 0 | R1 | Réparer Poppy par la voie A ou B, dans Figma | Aucun code | Aucune |
| 1 | R1 | « Annuler la reprise » ne retire plus la palette en un clic | Petite | D1 |
| 2 | R2 | La détection regroupe les rampes d'une même palette | Moyenne | D2 |
| 3 | R1, R2 | La reprise groupée, et la reprise sous l'identifiant d'un cadre orphelin | Grande | D3 |
| 4 | R3 | Annuler les modifications d'une palette | Moyenne à grande | D4 |
| 5 | R4 | La progression de la génération ne décale plus la page | Petite | Aucune |
| 6 | R5 | « Synchroniser avec les tokens Figma » | Petite | D5 |
| 7 | R8 | L'espace sous les pastilles de l'aperçu | Petite | Aucune |
| 8 | R6 | Maquette : Création et Vérification sans palette ouverte | Maquette | Après la maquette |
| 9 | R7 | Maquette : la configuration avancée repliée | Maquette | Après la maquette |

### Lot 0. Réparer Poppy

Le mainteneur suit la section 3 : voie A si le fichier est resté ouvert,
voie B sinon. Il consigne ici la voie qui a marché, pour savoir si la voie C
reste à construire pour Poppy ou seulement pour R2.

### Lot 1. « Annuler la reprise » ne supprime plus en un clic

Fichiers : `ui/ongletCreation.ts` (encart de reprise), `i18n/fr.ts`,
`i18n/en.ts`, galerie et tests de l'onglet.

Le bouton de l'encart appelle aujourd'hui `confirmerLaSuppression()` sans
confirmation. Deux formes possibles, selon D1 :

- retirer le bouton de l'encart : la suppression reste dans le menu de la
  palette, qui demande déjà « Supprimer « Nom » du plugin ? Son cadre Figma
  restera, sans mise à jour. » ;
- le garder sous le libellé « Retirer du plugin… », avec la même
  confirmation que le menu, et une phrase qui dit que les variables restent
  dans le fichier.

Critère : aucun bouton de l'onglet Création ne retire une palette de la
recette sans confirmation ; un test de l'onglet clique le bouton de l'encart
et vérifie que la recette rangée porte encore la palette.

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
(« Soft et Vivid, Light et Dark »). Une forme incomplète, trois groupes sur
quatre par exemple, se traite selon D2.

Critère : sur les variables écrites par le plugin pour une palette à deux
intensités, thèmes dans le chemin, la détection rend une seule palette ;
`SEUIL_DE_PALETTE` s'applique à chaque groupe.

### Lot 3. La reprise groupée, et la reprise d'une palette supprimée

Fichiers : `edition.ts` (`reprendreDuFichier`), `variables/reprise.ts`
(`suiviDeLaReprise`, `origineDeLaReprise`), `ecriture/variables.ts`
(`reprendreLaPalette`), `messages.ts`, `ui/ongletGestion.ts`, tests.

1. « Modifier dans le plugin » sur une palette groupée crée une palette à
   deux intensités quand la forme en porte deux. Sa référence est la nuance
   la plus proche de 600 dans la rampe Light de l'intensité porteuse. Le
   suivi range chaque variable sous sa clé du plan (`soft/light/600`,
   `vivid/dark/600`…), pour qu'une mise à jour ne renomme rien.
2. La source envoyée au sandbox désigne la racine et la forme du groupe ; le
   sandbox relit les groupes lui-même, comme aujourd'hui pour un seul groupe
   ([VAR-13]).
3. Sur la carte d'un cadre orphelin, quand le suivi porte une liaison de
   reprise à l'identifiant de ce cadre et que ses variables sont encore dans
   le fichier, un geste « Reprendre depuis les variables » fait la même
   reprise sous cet identifiant. Le cadre et les variables s'y rattachent ;
   la carte « Palette supprimée du plugin » disparaît.

« Telles quelles » fige les couleurs d'une palette à une intensité
seulement : la validation refuse `figees` quand `intensites` ne vaut pas 1.
Une reprise groupée à deux intensités est donc « Recalculées » seulement,
sauf décision D3.

Critère : sur un fichier de test qui reproduit l'état de Poppy (cadre
orphelin, suivi de reprise, quatre groupes), le geste rend une palette dont
le cadre est « À mettre à jour » ou « À jour », et la liste « Déjà dans le
fichier » ne porte plus ses groupes.

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

Deux formes, selon D4 :

- **Retour à l'ouverture et annulation dans la session.** Le rangement à
  chaque geste reste. L'interface garde la palette telle qu'elle était à son
  ouverture, et la pile des rangements de la session. La barre de la palette
  montre « Annuler les modifications » dès que la palette diffère de son état
  d'ouverture ; le geste range cet état, et « Rétablir » le défait. Ctrl+Z
  dans la fenêtre du plugin défait le dernier réglage. Rien ne change pour
  Gestion, Vérification ni les autres designers.
- **Brouillon et « Enregistrer ».** Les réglages restent dans l'interface
  jusqu'à « Enregistrer la palette » ; « Annuler » rend la palette rangée.
  Gestion doit alors refuser de générer une palette non enregistrée, la
  fermeture du plugin doit garder ou signaler le brouillon (Tokens Studio le
  range dans le stockage privé du poste), et un rangement d'un autre
  designer peut entrer en conflit avec le brouillon.

La première forme est recommandée : elle répond à la demande sans changer ce
que Gestion et les autres designers lisent. La seconde touche le parcours
entier.

Critère de la première forme : après trois réglages, « Annuler les
modifications » rend une recette rangée égale à celle de l'ouverture ;
« Rétablir » rend celle d'avant l'annulation ; un test le vérifie.

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
Le texte anglais dépend de D5.

### Lot 7. L'espace sous les pastilles de l'aperçu

Fichiers : `ui/nuancier.ts`, `ui/styles.css`.

Les pastilles `solid`, `surface` et `page` de l'aperçu touchent la ligne de
texte placée dessous. Le lot ajoute un écart pris dans l'échelle d'espacement
de `styles.css`, et la galerie le montre.

### Lot 8. Maquette : aucune palette ouverte

Une page HTML simple, sans adaptation à la largeur, à côté de ce dossier. Elle
reproduit d'abord l'écran actuel, puis montre trois ou quatre propositions
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

## 5. Décisions attendues du mainteneur

| N° | Question | Options | Recommandation |
|---|---|---|---|
| D1 | Que devient « Annuler la reprise » ? | Retirer le bouton de l'encart ; le renommer « Retirer du plugin… » avec confirmation | Le retirer : le menu de la palette porte déjà la suppression confirmée |
| D2 | Une forme incomplète, trois groupes sur quatre, se regroupe-t-elle ? | Regrouper, la mise à jour créant le groupe manquant ; laisser les groupes séparés | Laisser séparés : un groupe manquant peut être un choix du designer |
| D3 | Une reprise groupée à deux intensités peut-elle garder les couleurs telles quelles ? | « Recalculées » seulement ; étendre `figees` aux deux intensités, ce qui change le format de la recette | « Recalculées » seulement, et la comparaison Fichier / Plugin de l'encart montre l'écart |
| D4 | Quel modèle d'annulation ? | Retour à l'ouverture et annulation dans la session ; brouillon et « Enregistrer » | Le retour à l'ouverture |
| D5 | Quel libellé anglais pour la synchronisation ? | « Sync with Figma tokens » ; « Sync with Figma variables » | « Sync with Figma tokens », pour garder le mot du français |

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
