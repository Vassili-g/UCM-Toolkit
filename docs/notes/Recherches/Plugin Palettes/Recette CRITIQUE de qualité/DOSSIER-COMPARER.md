# Comparer, harmoniser, différencier : dossier

**Statut : proposition à valider.** Ce dossier repense la comparaison de
palettes à partir des recherches d'interface antérieures, du marché et des
retours du mainteneur sur deux versions précédentes. Création reste consacrée à
une seule palette ; la comparaison vit dans un onglet dédié ; les écarts d'une
palette et les réglages communs deviennent lisibles. La
[maquette](./Maquettes/MAQUETTE-COMPARER.html) part des écrans réels de la
galerie, en thème sombre. Les décisions C1 à C9 sont en section 11.

## 1. Le besoin

| Tâche | Question du designer | Nature de l'écart |
|---|---|---|
| Comparer | Mes palettes vont-elles ensemble, cran par cran et sur des composants ? | Visuelle : elle se juge à l'œil, sur des composants |
| Harmoniser | Comment donner la même clarté et la même saturation à mes statuts ? | Une propriété des réglages : une palette s'écarte parce qu'un réglage propre l'en éloigne |
| Différencier | Deux statuts se ressemblent : laquelle déplacer, de combien, vers où ? | Une propriété d'une paire : leurs teintes, ou leurs chromas près du gris |

La recette critique a établi les causes chiffrées. Aux réglages communs, la
clarté des quatre utilitaires tient à 0,002 près hors références ; les écarts
de 0,016 à 0,047 viennent des luminosités propres. La saturation s'écarte de
×4,2 avec la part constante, de ×1,7 avec l'enveloppe. Orange et Poppy se
confondent sur le fond teinté en Dark, à une distance de 0,019.

Conséquence pour l'interface : harmoniser revient surtout à retirer ou
aligner des réglages propres, et différencier revient à tourner une teinte.
Seule la comparaison demande une vue nouvelle.

## 2. Ce que les recherches précédentes ont proposé

| Source | Proposition | Sort |
|---|---|---|
| [Proposition finale](../Intégration%20du%20marché/03%20Proposition%20finale/PROPOSITION-FINALE.md), piste 13 | « Comparer à » dans l'en-tête de l'aperçu : une seconde palette peinte sous la palette ouverte, ligne Δ par cran, pour la session. « Proches à dessein » range une paire voulue et tait l'alerte | Non implémentée ; la direction simple a retiré les marques qui portaient la portée de l'alerte |
| Même source, piste « Distinguer les statuts » | Une carte repliée : quatre spécimens de statut, choix d'une vision (Viénot 1999, Brettel 1997), paires sous le seuil dans cette vision, aucune alerte, car `[VER-08]` veut qu'une alerte mène au réglage qui la lève | Non implémentée ; l'onglet Système qui la portait a disparu |
| [Direction globale](../Intégration%20du%20marché/06%20Direction%20globale/DIRECTION-GLOBALE.md) | « Comparer à une autre palette » repliée dans l'onglet Vérifier | Abandonnée avec la direction globale, jugée trop complexe |
| [Plan d'harmonisation](../Harmonisation%20entre%20palettes/PLAN-RECHERCHE-HARMONISATION.md) | Quatre hypothèses : témoin dans Création (A), carte dans Vérification (B), vue de cohérence dans Gestion (C), réglage de groupe (D). Recommandait A, parce que l'écart naît pendant le réglage | Non tranchée |
| [Dossier d'harmonisation](../Harmonisation%20entre%20palettes/DOSSIER-HARMONISATION.md) | Comparer dans Vérification sans palette ouverte, groupe choisi à la volée, alignement de la luminosité seule par une modale | Décisions D1 à D7 en attente |
| Première version de ce dossier | Un onglet Comparer sur un groupe « Statuts » | Le groupe n'avait ni création ni règle : la maquette supposait un objet que le plugin ne connaît pas |
| Deuxième version de ce dossier | Ouvrir plusieurs palettes dans Création et les régler ensemble | Écartée par le mainteneur : Création doit rester à une palette ; le nuancier n'y paraît que sans palette ouverte ; vingt palettes en composants surchargent l'écran |

Cinq leçons :

1. **Chaque proposition a buté sur le groupe.** Un groupe nommé demande sa
   création, son renommage, sa survie à une suppression et une place dans la
   recette. Aucune n'a résolu ces règles à un coût acceptable.
2. **Une alerte mène au réglage qui la lève** (`[VER-08]`). Un écart qu'aucun
   geste ne corrige est une information, pas une alerte.
3. **Le mainteneur a écarté la complexité** : la direction globale a cédé la
   place à la direction simple, en trois onglets.
4. **L'écart naît pendant le réglage.** Le plan d'harmonisation le notait ; la
   recette critique le confirme : les écarts mesurés viennent tous de réglages
   faits dans Création. Les voir doit se faire dans Création, les corriger à
   plusieurs se fait ailleurs.
5. **Chaque espace garde un seul sujet.** Une palette dans Création, toutes les
   palettes dans Comparer, les valeurs partagées dans les réglages communs.

## 3. Ce que le plugin fait aujourd'hui

| Mécanisme | Où | Ce qu'il fait | Ce que la refonte en fait |
|---|---|---|---|
| Sélecteur | Barre de Création et de Vérification | Ouvre une palette ; porte la marque de verdict | Inchangé : une palette |
| Nuancier | Création et Vérification sans palette ouverte | Trois aplats par palette ; un clic ouvre la palette | Inchangé ; Comparer a sa propre liste |
| Aperçu | Création | Grille Soft et Vivid, cran par cran, sur le fond du thème | Sa grille sert la liste de Comparer, une ligne par palette |
| Réglage global | Création, carte repliée | « Régler » Soft, Vivid ou les deux ; repère « S » de l'autre profil ; zones hachurées des limites ; « Rétablir » ; résumé « Réglé » | Écarts lisibles (section 6) |
| Color shift | Création, carte repliée | Teinte, saturation et luminosité aux deux bouts ; « Tout rétablir » | Même résumé et mêmes marques |
| « Annuler les modifications » | Barre de la palette | Défait les changements de la palette ouverte depuis son ouverture | Défait aussi un geste de Comparer |
| Bilan | Vérification sans palette ouverte | Filtres À corriger, À vérifier, Conformes ; une ligne par message et son geste | Ses lignes servent « Points à regarder » ; une paire proche y renvoie vers Comparer |
| Alerte `palettes-proches` | Pied de Création, bilan de Vérification | ΔEok moyen des crans 500 à 700 en Light, Vivid contre Vivid ; geste : changer la référence | Mesurée sur le plein et le texte, dans les deux thèmes ; geste : écarter |
| Réglages communs | Engrenage, sans libellé | Fonds, intensités, luminosité des nuances, seuils, planches, et la langue | Clarifiés (section 7) |
| Compteur d'onglet | Onglet Vérification | Nombre de points à corriger, ou ✓ | Même compteur sur Comparer |

## 4. Ce que fait le marché

Outils lus dans leur code ou leur documentation publique. Atmos, Supa Palette
et l'aide de Coolors n'ont pas pu être vérifiés au-delà de leurs pages
commerciales.

| Outil | Vue | Harmoniser | Différencier |
|---|---|---|---|
| [Huetone](https://github.com/ardov/huetone) | Grille teintes × crans ; graphiques L, C, H du cran choisi pour toutes les teintes | « Apply current luminance to column » : une action par colonne de cran | Contraste de la couleur choisie ; pas de vision des couleurs |
| [Harmonizer](https://github.com/evilmartians/harmonizer), plugin Figma | Grille niveaux × teintes ; L, contraste, C, H sur chaque cellule | L'en-tête d'une colonne fixe un contraste cible et un plafond de chroma pour toutes les teintes ; « Even chroma » prend le plus petit des maximums | Aucun |
| [Leonardo](https://leonardocolor.io/theme.html) | Rampes sur un fond commun ; roue avec un point par rampe | Curseurs de clarté, contraste et saturation sur tout le thème | Protanopie, deutéranopie, tritanopie avec un ΔE minimum affiché |
| [Adobe Color](https://blog.adobe.com/en/publish/2020/05/21/celebrate-global-accessibility-awareness-day-with-adobe-color) | Roue à cinq pastilles | Non documenté | Une ligne de conflit relie deux pastilles indiscernables pour une vision ; badge sans conflit |
| [Material](https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/typescript/blend/blend.ts) | Rôles des couleurs étendues | `Blend.harmonize` tourne la teinte vers la couleur source, de la moitié de l'écart et de 15° au plus ; chroma et ton gardés | Aucun |
| [Radix](https://www.radix-ui.com/colors/custom), [uicolors.app](https://uicolors.app/create) | Rampes et composants d'exemple | Non documenté | Aucun |

Constats :

1. **Le cran est l'unité d'harmonisation** : une colonne de la grille porte
   l'action ou le réglage qui vaut pour toutes les teintes.
2. **Le réglage global sur un jeu existe chez Leonardo seul.** Les autres
   outils règlent une palette à la fois.
3. **Harmonizer aligne la chroma par un plafond commun**, le plus petit des
   maximums. C'est le principe de l'enveloppe de la recette critique.
4. **La rotation vers une source est bornée chez Material**, à 15°. UCM borne
   déjà sa rotation de teinte à 30°.
5. **La différenciation passe par la vision des couleurs** : lignes de conflit
   sur la roue (Adobe Color), ΔE minimum (Leonardo). Aucun outil ne signale
   deux teintes trop proches en vision normale.
6. **Aucun outil ne montre d'avant et d'après** : l'aperçu est l'édition en
   direct, et une annulation n'est documentée nulle part.
7. **Aucun outil ne pose plusieurs jeux rangés côte à côte** ; tous montrent
   un seul jeu, entier.

Ce que la refonte en retient : la grille alignée cran par cran pour la vue
d'ensemble, le plafond commun de chroma (l'enveloppe), les lignes de conflit
sur la roue, et une rotation bornée et nommée. L'avant et l'après des modales
sont propres à UCM : ils servent un geste qui modifie plusieurs palettes
rangées.

## 5. Les principes retenus

1. **Création règle une palette**, à une ou deux intensités. Aucune vue ni aucun
   geste de groupe n'y entre.
2. **Comparer est un onglet**, après Création. Il porte sur toutes les palettes
   du fichier, quelle que soit la palette ouverte dans Création.
3. **La vue d'ensemble d'abord, le détail à la demande.** Toutes les palettes en
   une ligne de nuances chacune ; les composants pour deux à quatre palettes
   cochées.
4. **Un écart s'affiche avec son geste.** Ce qu'aucun geste ne corrige est une
   information, sans alerte.
5. **Aucun objet nouveau.** Pas de groupe rangé : la sélection vit le temps de
   l'onglet.
6. **Les composants existants d'abord** : la grille de l'aperçu, les lignes du
   bilan de Vérification, la ligne fixe, le compteur d'onglet, la modale
   d'ajustement. La maquette les reprend depuis la galerie, en thème sombre.

## 6. Les écarts d'une palette, dans Création

### Aujourd'hui

La carte Réglage global porte trois réglettes, teinte, saturation et
luminosité, par profil. Cinq défauts :

| Défaut | Effet |
|---|---|
| Le résumé dit « Réglé » | Carte repliée, rien ne dit quoi, de combien, sur quel profil |
| Aucune réglette ne montre son point de départ | « Rétablir » restaure une valeur que l'écran ne dit pas |
| « Rétablir » a le même poids sur une valeur intacte | Rien ne distingue les réglettes modifiées |
| Le repère « S » | Il marque l'autre profil ; rien ne le dit |
| Aucun lien vers les réglages communs | La saturation part d'une valeur réglée ailleurs, invisible ici |

### Proposé

- **Le résumé chiffre les écarts**, par profil : « Vivid : luminosité −0,02 ·
  Soft : teinte +8° ». Une carte sans écart garde « Aucun réglage ».
- **Un trait vertical marque le départ** de chaque réglette ; un trait épais,
  sous la piste, souligne l'écart jusqu'au pouce.
- **« Rétablir » ne s'active que sur une valeur modifiée.**
- **Le repère dit « Soft »** (ou « Vivid »), et une légende d'une ligne explique
  les trois marques.
- **Un pied de carte** : la phrase des écarts, « Tout rétablir », et
  « Réglages communs › », qui ouvre le panneau sur la carte Intensités.

Le départ de chaque réglette :

| Réglette | Départ |
|---|---|
| Teinte | 0° : la teinte de la référence |
| Saturation | La part commune du profil ; pour le profil qui porte la référence, la part de la référence |
| Luminosité | 0 |

Le Color shift reçoit le même résumé chiffré et les mêmes marques sur ses
réglettes de nuances claires et sombres. Il a déjà « Tout rétablir » et un zéro
sur sa courbe.

## 7. Les réglages communs

### Ce qu'ils sont

Le panneau qui s'ouvre par l'engrenage, en haut à droite de chaque onglet, et
qui se ferme par « Retour aux palettes ». Il porte les valeurs que toutes les
palettes partagent : couleurs de fond et texte des boutons, intensités Soft et
Vivid, intensité des fonds du thème Dark, luminosité des nuances, contrastes
minimums, détection des couleurs proches, contenu des planches. Une palette
s'en écarte par son Réglage global ou son Color shift.

### Pourquoi ils ne se comprennent pas

- L'engrenage n'a pas de libellé ; son nom n'apparaît qu'au survol.
- Le panneau ne dit pas à quoi il sert.
- Il s'ouvre sur la langue, préférence de ce poste, au milieu de valeurs
  partagées par les palettes du fichier.
- « N palettes concernées » compte les palettes sans dire lesquelles s'écartent.

### Proposé

- **Le bouton porte son nom** : engrenage et « Réglages communs ».
- **Une phrase en tête** : « Ces réglages valent pour toutes les palettes du
  fichier. Chaque palette peut s'en écarter dans sa carte Réglage global ou
  Color shift ; l'onglet Comparer les montre côte à côte. »
- **Chaque carte nomme les palettes qui s'en écartent**, avec « Comparer › ».
- **La langue descend** en pied de panneau, sous « Préférences de ce poste ».

Une autre organisation a été écartée : verser les réglages communs dans
l'onglet Comparer. Le panneau sert aussi à régler courbes et seuils en
regardant la palette ouverte ; il reste où il est.

## 8. L'onglet Comparer

### De haut en bas

| Élément | Rang | Contenu |
|---|---|---|
| Onglet | 1 | « Comparer », avec le compteur des paires qui se confondent, de même facture que celui de Vérification |
| Ligne du titre | 1 | « Comparer », et la bascule « Aperçu » Light et Dark |
| Ligne fixe | 1 | Le verdict : « 1 paire se confond · 3 palettes s'écartent des valeurs communes », ou « Les palettes se distinguent toutes » |
| Carte « Toutes les palettes » | 2 | La grille de l'aperçu, une ligne par palette, pastilles de 18 px, choix Soft et Vivid ; une case par ligne ; un point ambre pour une palette en alerte, gris pour une palette écartée ; sous la grille, un point sous chaque cran dont la clarté s'écarte de 0,02 ou plus hors ◆ |
| Carte « En détail » | 2 | Paraît à deux palettes cochées : chaque palette sur un fond teinté, un plein et un contour, sur le fond du thème. Quatre au plus |
| Carte « Points à regarder » | 2 | Les lignes du bilan de Vérification : une paire en alerte et « Écarter » ; les palettes écartées et « Rétablir » |
| Carte « Teintes » | 3, repliée | La roue des pleins, un trait entre les palettes d'une paire en alerte, les paires les plus proches sans alerte, la vision des couleurs simulée |

### Ce qui compte comme alerte

Deux palettes colorées se confondent quand leur plein ou leur texte de fond
teinté passe sous le seuil des couleurs proches de la recette (0,05 de ΔEok),
en Light ou en Dark. Les neutres en sont exclus : un gris n'a pas de teinte à
confondre. Les fonds teintés en sont exclus aussi : clairs, ils sont peu
saturés par construction. Avec eux, les vingt palettes de la galerie donnaient
46 paires ; sans eux, 8, toutes réelles (Bleu et Azur, Vert et Feuille, Bleu et
Marine en Dark, Violet et Pourpre en Dark). Le fichier du mainteneur en donne
une : Terracota et Poppy, sur le texte du fond teinté en Dark (0,047).

### Les gestes

- **Rétablir les valeurs communes** : une modale coche les palettes écartées,
  montre leur rampe avant et après et leurs écarts en clair. Décocher garde une
  palette telle quelle. Teinte et référence ne changent pas. Un seul rangement,
  défait par « Annuler les modifications ».
- **Écarter deux teintes** : une modale propose, par palette et par sens, la plus
  petite rotation de teinte qui atteint la distance visée (0,10 sur le plein,
  0,06 sur le texte), avec l'aperçu des deux palettes en Light et en Dark, avant
  et après. Sans rotation dans la borne de ±30°, elle le dit : Bleu et Azur sont
  presque identiques, il faut supprimer l'une ou changer une référence.

### Les entrées

- Le compteur de l'onglet, visible depuis Création pendant un réglage.
- Dans Vérification, une paire trop proche du bilan porte « Comparer » au lieu
  de « Vérifier ».
- Dans les réglages communs, « Comparer › » sous les palettes qui s'écartent.

### Vingt palettes

La grille tient en 450 px à 18 px par ligne. Les noms de la roue s'effacent
au-delà de huit palettes ; le survol d'un point les donne. Le détail reste à
quatre palettes : au-delà, les composants ne se comparent plus d'un coup d'œil.

## 9. États et cas limites

| Cas | Comportement |
|---|---|
| Moins de deux palettes | L'onglet est désactivé |
| Aucune case cochée | Pas de carte « En détail » |
| Plus de quatre cases | La cinquième ne se coche pas ; la ligne du pied le dit |
| Palette à une intensité | Sa rampe unique dans Soft et dans Vivid |
| Palette figée | Comparée, cochable ; « Rétablir » et « Écarter » la nomment et la laissent |
| Palette libre | Alignée par numéro ; un numéro absent reste vide |
| Référence ancrée ◆ | Marquée dans la grille ; hors de la marque d'écart des crans |
| Après un geste | La ligne fixe le dit avec « Annuler » ; Gestion passe les palettes à « À mettre à jour » |

## 10. Ce que chaque proposition touche

| Proposition | Fichiers |
|---|---|
| Écarts lisibles dans Création | `ui/reglagesDeLaPalette.ts`, Color shift, textes du résumé dans `i18n/fr.ts` et `i18n/en.ts` |
| Réglages communs clarifiés | En-tête du socle, panneau des réglages communs, `configuration.ts` pour les palettes qui s'écartent |
| Alerte par rôle | `alertes.ts`, `analyse.ts`, `presentation.ts` ; le seuil reste `seuils.palettesProches` |
| Onglet Comparer | Nouveau module d'onglet, rotation minimale dans `packages/couleur`, simulation des visions, galerie et tests d'interface |
| Recette | Aucun changement de format |

## 11. Décisions

| # | Décision | Proposition |
|---|---|---|
| C1 | Où comparer | Un onglet Comparer après Création ; Création règle une seule palette |
| C2 | Choisir les palettes | Dans l'onglet, la liste de toutes les palettes, cases pour le détail ; aucun groupe rangé |
| C3 | Vingt palettes | Une ligne de nuances par palette pour toutes ; les composants pour 2 à 4 palettes cochées |
| C4 | Les écarts d'une palette | Résumé chiffré, départ et écart sur chaque réglette, « Rétablir » actif seulement sur une valeur modifiée, « Tout rétablir » |
| C5 | Les réglages communs | Bouton nommé, phrase d'introduction, palettes qui s'écartent dans chaque carte, langue en préférences du poste |
| C6 | L'alerte | Plein et texte, deux thèmes, seuil des couleurs proches de la recette ; compteur de l'onglet |
| C7 | Rétablir les valeurs communes | Modale qui coche les palettes écartées, avant et après |
| C8 | Écarter deux teintes | Plus petite rotation vers 0,10 sur le plein et 0,06 sur le texte ; sinon, le dire |
| C9 | Visions des couleurs | Dans la carte Teintes, à la demande, sans alerte |

## 12. Défaut relevé dans le plugin actuel

À 480 px de large, le bouton de chaque ligne du bilan de Vérification déborde de
la fenêtre : « Vérifier » s'affiche coupé (« Vérifi »). La galerie le montre
dans `verification-bilan-a-verifier`.

## 13. Limites

- Les écrans sont des états figés de la galerie, modifiés à la main : la
  maquette ne prouve ni le comportement au clavier ni les états de transition.
- La distance visée par « Écarter » est une valeur d'essai.
- La rotation passe par le réglage de teinte de la carte et déplace la
  référence ; une marque qui garde sa référence exacte n'a pas ce geste.
- La simulation des visions des couleurs suppose une dichromatie complète.
