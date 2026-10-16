# Recette de la direction simple d'UCM Palettes

## Objet et lecteur

Ce document s'adresse au mainteneur. Il donne le parcours à faire dans Figma
pour recetter [la direction simple](./PLAN-DIRECTION-SIMPLE.md), écran par
écran, puis les dix essais R1 à R10 sur lesquels le code repose. Chaque case
dit le geste et ce que l'écran doit montrer. Une case qui ne tient pas se
note avec le numéro de son étape.

[Le plan d'implémentation](./PLAN-IMPLEMENTATION.md) dit ce qui est livré, et
sa section « Point de reprise » liste les écarts à la direction.

## Ce que la recette vérifie pour la première fois

Les tests Chromium sont suspendus depuis la phase 2. L'interface des phases 3
à 9 n'a tourné dans aucun navigateur : le typecheck, 352 tests unitaires et
le build la tiennent seuls. La recette est donc aussi le premier rendu de ces
écrans :

- Gestion entière : le bloc « Connexion à Figma », les deux vues, les lignes
  de sortie, les encarts, les cartes de la destination et de la page ;
- l'encart d'une palette reprise, dans Création ;
- la ligne sous l'encart d'un fichier sans palette.

Le sandbox, lui, est testé contre un double de Figma : écriture des
variables, page des planches, reprise, copie de bibliothèque. Les essais R1 à
R10 disent où le double suppose une réponse de Figma.

Une erreur d'affichage se signale par l'étape, une capture, et le texte de la
console du plugin (`Plugins > Development > Open console`).

## Avant de commencer

Depuis la racine du dépôt, avec Node 22 :

```sh
npm install
npm run build --workspace ucm-palettes-plugin
```

Dans Figma Desktop, `Plugins > Development > Import plugin from manifest`,
puis `packages/plugin-palettes/dist/manifest.json`. Le manifest déclare la
permission `teamlibrary` : Figma peut demander de réimporter le plugin.

**Le format de la recette est passé à 8.** Un fichier d'essai qui porte une
recette d'avant affiche « illisible » dans Création et dans Gestion. Dans
Gestion, la carte « Palettes et réglages » s'ouvre seule : « Repartir de la
recette par défaut » vide le fichier, ou « Exporter » garde la recette pour la
corriger à la main.

Préparer trois fichiers :

| Fichier | Contenu |
|---|---|
| A | Un fichier neuf, sans variable ni palette |
| B | Un fichier qui porte des variables de couleur : une rampe `slate/50` à `slate/950` dans une collection à un mode, une rampe dans une collection à deux modes Light et Dark |
| C | Un fichier où une bibliothèque de variables est activée, par exemple la bibliothèque Intencial |

Le plugin s'ouvre en anglais. Les libellés de ce document sont ceux du
français : engrenage, « Language », « Français ».

## Le parcours

### 1. Le fichier vide et Création (fichier A)

- [ ] 1.1 Ouvrir le plugin. L'onglet Création est actif. Un encart au fond
  bleuté montre une rampe d'exemple, « Créez votre première palette », une
  phrase et « Nouvelle palette ».
- [ ] 1.2 « Nouvelle palette » remplace l'encart par la carte de création ;
  « Annuler » y ramène.
- [ ] 1.3 Créer « Bleu », `#1E6FD9`, deux intensités. Création montre le
  titre « Palette Bleu », la configuration, l'aperçu, « Réglage global »,
  « Color shift », l'interface de test, puis le pied. Aucune carte
  « Garanties de contraste ».
- [ ] 1.4 Le pied dit le bilan et porte « Vérifier ». Aucun volet, aucun
  bouton « Détails ».
- [ ] 1.5 Créer « Jaune », `#FACC15`, deux intensités, et « Ardoise »,
  `#6B7280`, une intensité.

### 2. Vérification

- [ ] 2.1 « Vérifier » ouvre Vérification sur la palette ouverte. De haut en
  bas : la barre de Création, le titre, le verdict sur son fond de sévérité,
  les messages, la carte des garanties toujours ouverte, le pied.
- [ ] 2.2 La liste déroulante porte un signe par palette, ✓, ! ou ✗, à droite
  de chaque option et sur le bouton.
- [ ] 2.3 Un message ne montre plus de ligne « Écart le plus faible ». Son
  lien nomme le geste : « Ajuster la saturation », « Ajuster le Color
  shift ». Le lien ouvre Création sur la carte dépliée et la focalise.
- [ ] 2.4 Un lien vers les Réglages communs les ouvre ; le retour ramène à
  Vérification et rend le focus au lien.
- [ ] 2.5 Le pied dit « La palette tient ses garanties. » et « Passer à
  Gestion », ou propose « Retour à Création » quand une garantie manque.
- [ ] 2.6 Fermer puis rouvrir le plugin : il s'ouvre sur Gestion.

### 3. Gestion : la connexion et les deux vues

- [ ] 3.1 Le bloc « Connexion à Figma » est gris, sans fond. Son en-tête
  porte « Synchronisé à l'instant » et « Synchroniser », un texte gris à
  icône de deux flèches, sans contour.
- [ ] 3.2 La ligne « Tokens » dit `primitives`, `colors/…` et « Changer ».
  La ligne « Planches » dit `page`, `Palettes`, « créée à la première
  planche » et « Changer ».
- [ ] 3.3 Le bilan dit « 3 pas encore sur Figma » et « Tout mettre à jour
  (3) ».
- [ ] 3.4 20 px de plus que l'écart courant séparent le bloc de la barre
  « Palettes du plugin · 3 », qui porte « Vue complète · Vue condensée » puis
  Light et Dark.
- [ ] 3.5 Chaque fiche porte sa pastille « Pas encore sur Figma » et
  « Modifier » en tête, ses rampes, sa référence, le résultat de ses
  garanties, puis deux lignes : « Tokens Figma », « Pas encore écrits », « 44 variables à
  créer », « Écrire dans les tokens » ; « Planche », « Pas encore créée »,
  « Créer la planche ». Ardoise dit « 22 variables à créer ».
- [ ] 3.6 « Modifier » ouvre Création sur la palette. Le résultat des
  garanties ouvre Vérification sur elle.
- [ ] 3.7 « Vue condensée » montre un tableau : Palette, Nuances, Tokens
  Figma, Planche ; une ligne par palette, aucun geste, pas de « Tout mettre à
  jour », pas de bascule Light et Dark. Un clic sur une ligne revient à la
  vue complète et amène la fiche en vue.
- [ ] 3.8 Fermer puis rouvrir le plugin : la vue choisie est restée.
- [ ] 3.9 Après quelques minutes, un geste qui rend l'onglet écrit
  « Synchronisé il y a N min ». « Synchroniser » le remet à l'instant et
  n'ajoute aucun pas à l'historique de Figma.

### 4. Les planches et leur page

- [ ] 4.1 « Créer la planche » sur Bleu dessine le cadre sur une page
  « Palettes ». La ligne passe à « À jour », « page Palettes », « Afficher ».
  La pastille de la fiche reste « Pas encore sur Figma » : ses tokens ne sont
  pas écrits.
- [ ] 4.2 Changer la référence de Bleu dans Création, revenir à Gestion : la
  planche est « À actualiser », avec « Actualiser » et « Afficher ».
- [ ] 4.3 « Changer », sur la ligne « Planches », ouvre la carte « Page des
  planches » à la place du bloc. Elle est grise, sans fond ; la liste a un
  fond gris plus foncé. Elle liste chaque page avec son nombre de planches,
  puis « Nouvelle page » et son champ. Aucune simulation.
- [ ] 4.4 « Annuler » rend le bloc, focus sur « Changer ».
- [ ] 4.5 Choisir une autre page, « Enregistrer » : le bloc revient, la ligne
  nomme la page, et le cadre de Bleu y est, à la place d'un cadre neuf.
  Ctrl+Z dans Figma défait le tout en un pas.
- [ ] 4.6 « Nouvelle page », un nom déjà porté par une page : la carte reste
  ouverte et le dit.
- [ ] 4.7 Dupliquer le cadre de Bleu à la main, changer de page : la copie ne
  bouge pas.
- [ ] 4.8 Couper puis coller le cadre de Bleu sur une autre page : la ligne
  dit « Introuvable », « Synchronisez pour la chercher dans tout le
  fichier », sans geste. Après « Synchroniser », elle dit « Absente du
  fichier » et offre « Créer la planche ».

### 5. La destination des tokens

- [ ] 5.1 « Écrire dans les tokens » sur Ardoise ouvre d'abord la carte
  « Destination des tokens » : la destination n'est pas encore confirmée.
- [ ] 5.2 La carte est grise, sans fond. La liste des collections a un fond
  gris plus foncé : « Nouvelle collection » et son champ, `primitives`, puis
  chaque collection locale avec son nombre de variables. « Groupe » et
  « Thèmes Light et Dark » sont sur une rangée. Aucun texte d'aide.
- [ ] 5.3 La simulation dit « 44 variables · 1 mode ». Elle montre le nom de
  la collection, quatre groupes, le premier déplié sur trois nuances avec
  couleur et code, puis « 8 autres nuances ». Elle porte la première palette
  du plugin.
- [ ] 5.4 « En modes » : « 22 variables · 2 modes », deux colonnes Light et
  Dark, deux groupes. Changer le groupe ou le nom de la collection : la
  simulation suit, et rien ne s'écrit.
- [ ] 5.5 Groupe `colors.brand`, « Enregistrer » : la carte reste ouverte et
  nomme les caractères refusés.
- [ ] 5.6 Revenir à « Dans le chemin », groupe `colors`, « Enregistrer » : le
  bloc revient, et l'encart d'écriture d'Ardoise s'ouvre.

### 6. Écrire et mettre à jour

- [ ] 6.1 L'encart dit « Écrire Ardoise dans les tokens Figma ? », 22
  variables, la collection `primitives`, le premier et le dernier nom,
  « Aucune variable existante n'est modifiée. », puis « Annuler » et « Écrire
  22 variables ».
- [ ] 6.2 « Écrire 22 variables » : la collection `primitives` paraît dans le
  panneau des variables de Figma, avec `colors/ardoise/light/50` à
  `colors/ardoise/dark/950`. Les variables n'ont aucune portée : elles ne
  paraissent dans aucun sélecteur de calque. La ligne passe à « À jour »,
  « 22 variables ».
- [ ] 6.3 La ligne « Tokens » du bloc dit toujours `primitives`. Écrire Bleu :
  ses 44 variables rejoignent la même collection, sans seconde collection
  `primitives`.
- [ ] 6.4 Changer la référence d'Ardoise dans Création : la ligne dit « À
  mettre à jour », « N couleurs ont changé dans le plugin », « Mettre à
  jour ». Le geste écrit sans encart.
- [ ] 6.5 Supprimer une variable d'Ardoise dans Figma, « Synchroniser » :
  « Introuvables », « 1 variable a disparu du fichier ». « Mettre à jour »
  ouvre l'encart, qui compte 1 variable à créer, puis la recrée.
- [ ] 6.6 Créer à la main une variable `colors/jaune/soft/light/50` dans
  `primitives`, puis écrire Jaune : la fiche dit « Tokens non écrits :
  Jaune », nomme la variable, et rien n'est créé.
- [ ] 6.7 « Changer » la destination vers le groupe `palettes` : Bleu et
  Ardoise passent « À mettre à jour », « La destination a changé ». « Mettre
  à jour » crée les variables sous `palettes/…` ; les anciennes restent sous
  `colors/…`, et paraissent dans « Déjà dans le fichier ».

### 7. Des couleurs changées dans Figma

- [ ] 7.1 Changer à la main deux variables de Bleu dans Figma,
  « Synchroniser » : la fiche dit « Modifiée dans Figma », la ligne
  « Modifiés dans Figma », « 2 couleurs changées à la main ».
- [ ] 7.2 Un encart d'avertissement liste chaque couleur : le nom de la
  variable, la valeur dans Figma, la valeur dans le plugin.
- [ ] 7.3 « Laisser les couleurs de Figma » replie l'encart ; l'état reste
  « Modifiés dans Figma », et la ligne offre « Mettre à jour », qui le
  rouvre.
- [ ] 7.4 « Remettre les couleurs du plugin » réécrit les deux couleurs ; la
  ligne revient à « À jour ».

### 8. « Tout mettre à jour » et une palette supprimée

- [ ] 8.1 Avec une planche à actualiser et des tokens à écrire, « Tout mettre
  à jour (N) » ouvre une confirmation qui compte les variables à créer, les
  couleurs à écrire et les planches à dessiner. Une palette « Modifiés dans
  Figma » en est exclue, et la confirmation le dit.
- [ ] 8.2 « Confirmer » écrit les tokens, puis dessine les planches ; la
  progression se lit sous le bloc.
- [ ] 8.3 Supprimer Ardoise dans Création. Gestion montre une carte orange à
  son nom : sa phrase compte les variables restées, et offre « Afficher dans
  Figma », « Supprimer définitivement » et « Supprimer les variables… ».
- [ ] 8.4 « Supprimer les variables… » demande confirmation dans la carte,
  puis retire les seules variables d'Ardoise. Ctrl+Z dans Figma les rend.

### 9. Les palettes du fichier et « Modifier dans le plugin » (fichier B)

- [ ] 9.1 Dans un fichier sans palette du plugin, Création montre sous
  l'encart « Ce fichier porte déjà N palettes dans ses variables. » et « Les
  voir dans Gestion ».
- [ ] 9.2 Gestion, sous un filet, « Déjà dans le fichier · N » : une fiche en
  tirets, sans fond, par palette ; l'étiquette « Variables du fichier », la
  rampe du premier mode, la collection, le chemin, le nombre de couleurs et
  les modes ; « Modifier dans le plugin » au bord droit de l'en-tête.
- [ ] 9.3 En vue condensée, chaque palette du fichier est une ligne du
  tableau, avec l'étiquette à la place des états.
- [ ] 9.4 « Modifier dans le plugin » sur `slate` ouvre Création sur une
  palette « slate » à une intensité. Un encart, sous le titre, montre la
  rampe « Fichier » et la rampe « Plugin », la bascule « Recalculées ·
  Telles quelles », le nombre de couleurs qui changeront, et « Annuler la
  reprise ». Rien n'a changé dans les variables de Figma. Ctrl+Z dans Figma
  défait la reprise en un pas.
- [ ] 9.5 La référence est la couleur de la nuance 600 du fichier. Le plugin
  l'ancre à la nuance de sa luminosité, la 800 pour `slate` : presque toutes
  les couleurs changent en « Recalculées ». À dire si une autre référence
  est attendue.
- [ ] 9.6 « Telles quelles » : les deux rampes sont identiques, « Aucune
  couleur ne change. » La carte de configuration ne garde que le nom ;
  « Réglage global » et « Color shift » sont absents ; Vérification dit
  « Palette libre ».
- [ ] 9.7 Revenir à « Recalculées », puis Gestion : `slate` est parmi les
  palettes du plugin et a quitté « Déjà dans le fichier ». Sa ligne dit la
  collection et le chemin d'origine, « N couleurs sur 11 changent », « Mettre
  à jour ».
- [ ] 9.8 « Mettre à jour » ouvre l'encart de remplacement : les couleurs qui
  changent, six au plus puis « Et N autres », « Les variables gardent leur
  nom et leurs liaisons. », « Annuler » et « Remplacer N couleurs ».
- [ ] 9.9 « Remplacer N couleurs » : les variables d'origine gardent leur nom,
  leur collection et leurs liaisons ; un calque lié à `slate/700` change de
  couleur. Aucune variable n'est créée.
- [ ] 9.10 Reprendre la palette de la collection à deux modes : Light et Dark
  s'écrivent chacun dans son mode.
- [ ] 9.11 « Annuler la reprise » supprime la palette du plugin ; elle revient
  dans « Déjà dans le fichier », variables intactes.

### 10. Les bibliothèques (fichier C)

- [ ] 10.1 « Déjà dans le fichier » montre les palettes de la bibliothèque :
  étiquette « Bibliothèque », pastilles vides, le nom de la collection suivi
  de son nombre de variables, le chemin, « N couleurs · Couleurs lues à la
  copie », et « Copier dans le plugin ».
- [ ] 10.2 La carte de la destination liste ces collections après les
  locales, grisées, avec « Bibliothèque » et « N variables · lecture
  seule » ; elles ne se choisissent pas. Deux collections du même nom se
  distinguent par leur compte.
- [ ] 10.3 « Copier dans le plugin » demande confirmation dans la fiche :
  « N variables de la bibliothèque seront ajoutées au fichier. »
- [ ] 10.4 « Copier » ouvre Création sur une palette du plugin, sans encart
  de reprise. Dans Gestion, ses tokens sont « Pas encore écrits » : ils
  s'écriront dans la destination, jamais dans la bibliothèque.
- [ ] 10.5 Dans un fichier sans bibliothèque activée, Gestion fonctionne et
  ne montre aucune notice sur les bibliothèques.

### 11. La langue, le thème, les conflits

- [ ] 11.1 Passer en anglais dans les Réglages communs : chaque libellé de
  Gestion change sans recharger, et aucune écriture ne part.
- [ ] 11.2 Thème clair de Figma : les pastilles, les encarts et la liste des
  cartes ouvertes restent lisibles.
- [ ] 11.3 Fenêtre à sa taille minimale : les lignes de sortie tiennent, le
  détail se coupe par une ellipse.
- [ ] 11.4 Modifier la recette depuis une seconde fenêtre du même fichier,
  puis écrire des tokens dans la première : l'écriture est refusée, et rien
  n'est créé.

## Les essais R1 à R10

Chaque essai dit ce que le code suppose de Figma. Le fichier nommé est celui
qui change si Figma répond autrement.

| Essai | Geste | Ce que le code suppose | Si Figma répond autrement |
|---|---|---|---|
| R1 | Étape 6.6 : créer par le plugin une variable dont le nom existe dans la collection | Figma refuse ou double le nom ; le plugin cherche le nom avant de créer, et n'appelle jamais Figma dans ce cas | Rien : la recherche préalable couvre les deux réponses |
| R2 | Étape 6.2, puis Ctrl+Z | Un seul pas défait les 22 variables et le suivi | `src/ecriture/variables.ts` : la place du `commitUndo` |
| R3 | Publier le fichier en bibliothèque, puis le dupliquer ; rouvrir le plugin dans la copie | Le suivi désigne les variables par identifiant ; dans une copie, les identifiants restent | `src/variables/suivi.ts` : la donnée partagée `ucm_palettes/palette` de chaque variable servirait de repli |
| R4 | Ouvrir Gestion dans un fichier de 500 variables locales | La lecture se fait à chaque état, sans attente sensible | `src/code.ts` : ne lire les variables qu'à l'ouverture de Gestion et à « Synchroniser » |
| R5 | Étape 6.2, puis « Synchroniser » sans rien toucher | Une couleur relue égale la couleur écrite à l'octet : la ligne reste « À jour » | `src/variables/releve.ts` : `hexaDeFigma`, l'arrondi |
| R6 | Écrire une palette nommée « Bleu pétrole », puis « v1.2 » | Figma accepte `bleu-pétrole` et `v12` | `src/variables/noms.ts` : les caractères retirés |
| R7 | Étape 10.1, ou le fichier de la bibliothèque Intencial ouvert lui-même | La règle trouve chaque rampe : dernier segment numérique, cinq variables au moins | `src/variables/detection.ts` : le seuil et la forme du dernier segment |
| R8 | Choisir pour destination une collection à deux modes, thèmes « Dans le chemin », écrire | La même valeur s'écrit dans tous les modes | `src/ecriture/variables.ts` : la boucle sur les modes |
| R9 | Thèmes « En modes », dans un fichier dont l'offre Figma n'autorise qu'un mode | `addMode` lève ; la fiche dit « Figma a refusé d'ajouter un mode » avec le détail | Le texte `modesRefuses` de `src/i18n/` |
| R10 | Étapes 10.1 à 10.4 | `teamLibrary` liste les collections et leurs variables sans valeurs ; `importVariableByKeyAsync` rend une variable dont les couleurs se lisent | `src/lectureDesVariables.ts` et `copierLaPalette` : la phase 9 se retire, ou la fiche montre ses couleurs dès la liste |

Deux points de plus, que le double ne tient pas :

- **Une variable supprimée.** La lecture tient la liste des variables locales
  pour vraie : une variable suivie qui n'y est plus est « Introuvable ».
  L'étape 6.5 le vérifie.
- **Un document Display P3.** Les composantes écrites sont en P3, comme sur
  la planche. Écrire une palette dans un fichier P3, puis « Synchroniser » :
  la ligne reste « À jour ».

## Les écarts à la direction

| Écart | Raison |
|---|---|
| La carte des garanties de Vérification porte une bascule Light et Dark, que M8 ne montre pas | Vérification n'a pas l'aperçu qui choisit le thème |
| Une planche introuvable n'offre « Créer la planche » qu'après « Synchroniser » | Le plugin ne pose pas un second cadre à côté d'un cadre déplacé |
| « Mettre à jour » ouvre l'encart d'écriture quand il doit créer des variables | Après un changement de destination ou la disparition d'une variable, il crée : le designer voit le compte avant |
| « Tout mettre à jour » demande toujours confirmation | La direction le demande ; l'ancien seuil de six palettes ne sert plus |
| La liste « Déjà dans le fichier » ignore une variable qui ne porte que des alias | La lecture ne suit pas les alias : une rampe d'alias n'a aucune couleur à montrer |
| Une palette reprise dont les nuances ne font pas une liste libre valide suit la liste commune | Une liste libre accepte 4 à 13 multiples de 50 ; seules les nuances communes s'écrivent alors |
| L'encart de reprise reste pour une palette « Telles quelles » | C'est le seul endroit où revenir à « Recalculées » |
| Une palette renommée garde les noms de ses variables | Le plugin ne renomme aucune variable |
| La bascule Light et Dark se cache en vue condensée | Comme dans M10 |

## Ce qui reste ouvert

- **S14, lier la planche aux tokens.** Le plan retient « non » : aucune
  pastille de planche ne cite une variable.
- **Les tests d'interface.** La case P2.12 du plan regroupe les tests
  Chromium à réécrire et ceux que chaque phase nomme. Les scénarios des
  états de galerie de Gestion sont écrits sans avoir été joués.
- **Les captures et les mesures.** Les cases P10.4 et P10.5 demandent
  Chromium : les captures de la galerie en thème sombre, et le coût d'un
  glisser sur un fichier à douze palettes.
- **Le générateur des maquettes.** Il transformait l'ancien onglet Palettes
  et ne s'applique plus au DOM de Gestion. Les maquettes rendues restent la
  référence.
